import { createHmac, timingSafeEqual } from 'crypto';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'guild-app-f6c28';
const FIREBASE_REFRESH_TOKEN =
  process.env.FIREBASE_REFRESH_TOKEN ||
  '1//0gGK2a0tXktXECgYIARAAGBASNwF-L9IrXnAQrodw3eQ7yl4WvCCXqNoTJGmY0AQfdi6nIAZGa6FrwbEInGQbcrpRYk7RoYaVBw8';
const CLIENT_ID =
  process.env.FIREBASE_CLIENT_ID || '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.FIREBASE_CLIENT_SECRET || 'j9iVZfS8kkCEFUPaAeJV0sAi';

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: FIREBASE_REFRESH_TOKEN,
      }),
    });

    const data = (await res.json()) as any;
    if (data.access_token) {
      cachedAccessToken = data.access_token;
      tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
      return cachedAccessToken!;
    }
  } catch (e) {
    console.error('[command-center-sub] Failed to refresh token:', e);
  }

  return cachedAccessToken || '';
}

function toFirestoreField(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreField) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreField(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export default async function handler(req: any, res: any) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.setHeader('Cache-Control', 'no-store, no-cache');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const {
    organizationId,
    plan,
    billingStatus,
    seats,
    maxSeats,
    storageLimitMb,
    creditBalance,
    currency,
    customOverrides,
    reason,
    adminEmail,
    previousState,
  } = req.body || {};

  if (!organizationId) {
    return res.status(400).json({ success: false, error: 'organizationId is required' });
  }

  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
    const nowIso = new Date().toISOString();
    const seatsVal = maxSeats ?? seats ?? 5;

    // 1. Patch Root Organization Document
    const orgDocUrl = `${baseUrl}/organizations/${organizationId}`;
    const orgUpdateFields: Record<string, any> = {};
    const orgFieldPaths: string[] = [];

    if (plan !== undefined) {
      orgUpdateFields.plan = toFirestoreField(plan);
      orgFieldPaths.push('plan');
    }
    if (billingStatus !== undefined) {
      orgUpdateFields.billingStatus = toFirestoreField(billingStatus);
      orgFieldPaths.push('billingStatus');
    }
    if (maxSeats !== undefined || seats !== undefined) {
      orgUpdateFields.maxSeats = toFirestoreField(seatsVal);
      orgFieldPaths.push('maxSeats');
    }
    if (storageLimitMb !== undefined) {
      orgUpdateFields.storageLimitMb = toFirestoreField(storageLimitMb);
      orgFieldPaths.push('storageLimitMb');
    }
    if (creditBalance !== undefined) {
      orgUpdateFields.creditBalance = toFirestoreField(creditBalance);
      orgFieldPaths.push('creditBalance');
    }
    if (currency !== undefined) {
      orgUpdateFields.currency = toFirestoreField(currency);
      orgFieldPaths.push('currency');
    }
    if (customOverrides !== undefined) {
      orgUpdateFields.customOverrides = toFirestoreField(customOverrides);
      orgFieldPaths.push('customOverrides');
    }

    orgUpdateFields.updatedAt = { timestampValue: nowIso };
    orgFieldPaths.push('updatedAt');

    const orgUpdateMask = orgFieldPaths.map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
    const orgPatchRes = await fetch(`${orgDocUrl}?${orgUpdateMask}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields: orgUpdateFields }),
    });

    if (!orgPatchRes.ok) {
      const errData = await orgPatchRes.json();
      console.error('[command-center-sub] Failed to patch org document:', errData);
      return res.status(orgPatchRes.status).json({ success: false, error: 'Failed to update organization document', details: errData });
    }

    // 2. Patch Billing Subdocument /organizations/{orgId}/billing/info
    const billingDocUrl = `${baseUrl}/organizations/${organizationId}/billing/info`;
    const billingFields: Record<string, any> = {
      plan: toFirestoreField(plan || 'free'),
      status: toFirestoreField(billingStatus || 'active'),
      seats: toFirestoreField(seatsVal),
      currency: toFirestoreField(currency || 'INR'),
      annualBonusActivated: toFirestoreField(plan === 'pro_annual' || !!customOverrides?.annualBonusActivated),
      updatedAt: { timestampValue: nowIso },
    };
    const billingFieldPaths = ['plan', 'status', 'seats', 'currency', 'annualBonusActivated', 'updatedAt'];

    if (creditBalance !== undefined) {
      billingFields.creditBalance = toFirestoreField(creditBalance);
      billingFieldPaths.push('creditBalance');
    }

    if (plan === 'pro_monthly' || plan === 'pro_annual') {
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + (plan === 'pro_annual' ? 12 : 1));
      billingFields.nextBillingDate = { timestampValue: nextDate.toISOString() };
      billingFieldPaths.push('nextBillingDate');
    }

    const billingUpdateMask = billingFieldPaths.map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
    await fetch(`${billingDocUrl}?${billingUpdateMask}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields: billingFields }),
    });

    // 3. Record superadmin audit log in /commandCenterAuditLogs
    const auditLogUrl = `${baseUrl}/commandCenterAuditLogs`;
    await fetch(auditLogUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          timestamp: { timestampValue: nowIso },
          actorUid: { stringValue: 'usr_superadmin' },
          actorEmail: { stringValue: adminEmail || 'pandeyaryan28@gmail.com' },
          actorName: { stringValue: 'Aryan Pandey (Platform SuperAdmin)' },
          action: { stringValue: 'PLAN_OVERRIDE' },
          targetType: { stringValue: 'organization' },
          targetId: { stringValue: organizationId },
          targetName: { stringValue: req.body.organizationName || organizationId },
          reason: { stringValue: reason || 'Manual platform entitlement override' },
          previousState: toFirestoreField(previousState || {}),
          newState: toFirestoreField({
            plan: plan || 'free',
            billingStatus: billingStatus || 'active',
            maxSeats: seatsVal,
            storageLimitMb,
            customOverrides,
          }),
        },
      }),
    }).catch((err) => console.warn('[command-center-sub] Audit log write warning:', err));

    // 4. Record transaction in tenant's /organizations/{orgId}/billingTransactions
    if (plan !== 'free') {
      const txUrl = `${baseUrl}/organizations/${organizationId}/billingTransactions`;
      const isComped = !!customOverrides?.compedReason || plan === 'enterprise';
      const desc = isComped
        ? `Platform Grant: ${plan.toUpperCase()} (${seatsVal} seats) · Comped VIP Waiver`
        : `SuperAdmin Adjustment: Plan updated to ${plan.toUpperCase()} (${seatsVal} seats)`;

      await fetch(txUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fields: {
            id: { stringValue: `tx_admin_${Date.now()}` },
            orgId: { stringValue: organizationId },
            description: { stringValue: desc },
            amount: { integerValue: '0' },
            currency: { stringValue: currency || 'INR' },
            type: { stringValue: 'subscription' },
            status: { stringValue: 'success' },
            createdAt: { timestampValue: nowIso },
          },
        }),
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      organizationId,
      plan,
      billingStatus,
      seats: seatsVal,
      storageLimitMb,
    });
  } catch (err: any) {
    console.error('[command-center-sub] Error updating subscription:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

