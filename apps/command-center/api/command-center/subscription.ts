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

  const { organizationId, plan, billingStatus, seats, maxSeats, storageLimitMb, customOverrides, reason, adminEmail } =
    req.body || {};

  if (!organizationId) {
    return res.status(400).json({ success: false, error: 'organizationId is required' });
  }

  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const docUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/organizations/${organizationId}`;

    const updateFields: Record<string, any> = {};
    const fieldPaths: string[] = [];

    if (plan !== undefined) {
      updateFields.plan = toFirestoreField(plan);
      fieldPaths.push('plan');
    }
    if (billingStatus !== undefined) {
      updateFields.billingStatus = toFirestoreField(billingStatus);
      fieldPaths.push('billingStatus');
    }
    if (maxSeats !== undefined || seats !== undefined) {
      const seatsVal = maxSeats ?? seats;
      updateFields.maxSeats = toFirestoreField(seatsVal);
      fieldPaths.push('maxSeats');
    }
    if (storageLimitMb !== undefined) {
      updateFields.storageLimitMb = toFirestoreField(storageLimitMb);
      fieldPaths.push('storageLimitMb');
    }
    if (customOverrides !== undefined) {
      updateFields.customOverrides = toFirestoreField(customOverrides);
      fieldPaths.push('customOverrides');
    }

    updateFields.updatedAt = { timestampValue: new Date().toISOString() };
    fieldPaths.push('updatedAt');

    const updateMask = fieldPaths.map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
    const patchUrl = `${docUrl}?${updateMask}`;

    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields: updateFields }),
    });

    if (!patchRes.ok) {
      const errData = await patchRes.json();
      console.error('[command-center-sub] Failed to patch Firestore:', errData);
      return res.status(patchRes.status).json({ success: false, error: 'Failed to update Firestore document', details: errData });
    }

    // Record audit log entry in Firestore /commandCenterAuditLogs
    const auditLogUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/commandCenterAuditLogs`;
    fetch(auditLogUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          timestamp: { timestampValue: new Date().toISOString() },
          action: { stringValue: 'PLAN_OVERRIDE' },
          targetType: { stringValue: 'organization' },
          targetId: { stringValue: organizationId },
          actorEmail: { stringValue: adminEmail || 'pandeyaryan28@gmail.com' },
          actorName: { stringValue: 'Aryan Pandey (Platform SuperAdmin)' },
          reason: { stringValue: reason || 'Manual platform plan modification' },
          newPlan: { stringValue: plan || 'free' },
        },
      }),
    }).catch(() => {});

    return res.status(200).json({ success: true, organizationId, plan, billingStatus });
  } catch (err: any) {
    console.error('[command-center-sub] Error updating subscription:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
