import { createHmac, timingSafeEqual } from 'crypto';

const JWT_SECRET = process.env.SUPERADMIN_JWT_SECRET || '';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'guild-app-f6c28';
const FIREBASE_REFRESH_TOKEN = process.env.FIREBASE_REFRESH_TOKEN || '';
const CLIENT_ID = process.env.FIREBASE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.FIREBASE_CLIENT_SECRET || '';

function verifySessionToken(req: any): { valid: boolean; email?: string } {
  if (!JWT_SECRET) return { valid: false };
  try {
    const authHeader = req.headers?.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : (req.body?.token || '');
    if (!token) return { valid: false };
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false };
    const [base64Payload, signature] = parts;
    const expectedSig = createHmac('sha256', JWT_SECRET).update(base64Payload).digest('base64url');
    if (signature.length !== expectedSig.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return { valid: false };
    }
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return { valid: false };
    return { valid: true, email: payload.email };
  } catch {
    return { valid: false };
  }
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (!FIREBASE_REFRESH_TOKEN || !CLIENT_ID || !CLIENT_SECRET) {
    return '';
  }
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
    console.error('[command-center-user] Failed to refresh token:', e);
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

  const session = verifySessionToken(req);
  if (!session.valid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Valid SuperAdmin session token required' });
  }

  const { uid, action, isBanned, reason, role, orgId, adminEmail, userName } = req.body || {};

  if (!uid) {
    return res.status(400).json({ success: false, error: 'uid is required' });
  }

  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
    const nowIso = new Date().toISOString();

    // Action 1: Ban / Unban
    if (action === 'ban' || isBanned !== undefined) {
      const banned = isBanned === true || action === 'ban';
      const userDocUrl = `${baseUrl}/users/${uid}`;
      const bannedDocUrl = `${baseUrl}/bannedUsers/${uid}`;

      // Update user doc
      const updateFields = {
        isBanned: toFirestoreField(banned),
        status: toFirestoreField(banned ? 'banned' : 'active'),
        banReason: toFirestoreField(banned ? (reason || 'Terms violation') : null),
        bannedAt: toFirestoreField(banned ? nowIso : null),
        bannedBy: toFirestoreField(banned ? (adminEmail || 'Platform SuperAdmin') : null),
        updatedAt: { timestampValue: nowIso },
      };

      await fetch(`${userDocUrl}?updateMask.fieldPaths=isBanned&updateMask.fieldPaths=status&updateMask.fieldPaths=banReason&updateMask.fieldPaths=bannedAt&updateMask.fieldPaths=bannedBy&updateMask.fieldPaths=updatedAt`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: updateFields }),
      });

      // Update bannedUsers collection
      if (banned) {
        await fetch(`${bannedDocUrl}?updateMask.fieldPaths=uid&updateMask.fieldPaths=reason&updateMask.fieldPaths=bannedBy&updateMask.fieldPaths=bannedAt`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            fields: {
              uid: { stringValue: uid },
              reason: { stringValue: reason || 'Terms violation' },
              bannedBy: { stringValue: adminEmail || 'Platform SuperAdmin' },
              bannedAt: { timestampValue: nowIso },
            },
          }),
        });
      } else {
        await fetch(bannedDocUrl, {
          method: 'DELETE',
          headers,
        });
      }

      // Record audit log
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
            action: { stringValue: 'USER_BAN_STATUS' },
            targetType: { stringValue: 'user' },
            targetId: { stringValue: uid },
            targetName: { stringValue: userName || uid },
            reason: { stringValue: reason || (banned ? 'Account suspended by superadmin' : 'Account reactivated') },
            previousState: toFirestoreField({ isBanned: !banned, status: !banned ? 'banned' : 'active' }),
            newState: toFirestoreField({ isBanned: banned, status: banned ? 'banned' : 'active', reason }),
          },
        }),
      }).catch(() => {});

      return res.status(200).json({ success: true, uid, isBanned: banned });
    }

    // Action 2: Update Role
    if (action === 'update_role' && role) {
      const userDocUrl = `${baseUrl}/users/${uid}`;
      await fetch(`${userDocUrl}?updateMask.fieldPaths=role&updateMask.fieldPaths=updatedAt`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fields: {
            role: toFirestoreField(role),
            updatedAt: { timestampValue: nowIso },
          },
        }),
      });

      if (orgId) {
        const memberDocUrl = `${baseUrl}/organizationMembers/${orgId}_${uid}`;
        await fetch(`${memberDocUrl}?updateMask.fieldPaths=role`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            fields: {
              role: toFirestoreField(role),
            },
          }),
        });
      }

      // Record audit log
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
            action: { stringValue: 'USER_ROLE_CHANGE' },
            targetType: { stringValue: 'user' },
            targetId: { stringValue: uid },
            targetName: { stringValue: userName || uid },
            reason: { stringValue: reason || `Role updated to ${role}` },
            newState: toFirestoreField({ role, orgId }),
          },
        }),
      }).catch(() => {});

      return res.status(200).json({ success: true, uid, role });
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (err: any) {
    console.error('[command-center-user] Error handling user action:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
