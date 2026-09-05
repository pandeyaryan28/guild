import { createHmac, timingSafeEqual } from 'crypto';
import dns from 'dns';

if (typeof (dns as any).setDefaultResultOrder === 'function') {
  (dns as any).setDefaultResultOrder('ipv4first');
}

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
    console.error('[command-center-demo-request] Failed to refresh token:', e);
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
  if (typeof res.status !== 'function') {
    res.status = (c: number) => {
      res.statusCode = c;
      return res;
    };
  }
  if (typeof res.json !== 'function') {
    res.json = (data: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };
  }

  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.setHeader('Cache-Control', 'no-store, no-cache');

  const method = req.method?.toUpperCase();
  if (method !== 'POST' && method !== 'PATCH' && method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
    const nowIso = new Date().toISOString();

    // ── Handle DELETE ──────────────────────────────────────────────────────────
    if (method === 'DELETE') {
      const { id, adminEmail } = req.body || {};
      if (!id) {
        return res.status(400).json({ success: false, error: 'Demo request id is required' });
      }

      const deleteRes = await fetch(`${baseUrl}/demoRequests/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!deleteRes.ok && deleteRes.status !== 404) {
        const errText = await deleteRes.text();
        throw new Error(`Failed to delete demo request: ${errText}`);
      }

      // Log Audit Event
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await fetch(`${baseUrl}/commandCenterAuditLogs/${auditId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fields: {
            id: { stringValue: auditId },
            timestamp: { stringValue: nowIso },
            actorUid: { stringValue: 'usr_superadmin' },
            actorEmail: { stringValue: adminEmail || 'pandeyaryan28@gmail.com' },
            actorName: { stringValue: 'Platform SuperAdmin' },
            action: { stringValue: 'DEMO_REQUEST_DELETED' },
            targetType: { stringValue: 'demoRequest' },
            targetId: { stringValue: id },
            targetName: { stringValue: `Demo Request ${id}` },
            reason: { stringValue: 'Demo request archived/deleted from platform' },
          },
        }),
      }).catch((e) => console.warn('Failed to write audit log:', e));

      return res.status(200).json({ success: true, message: 'Demo request deleted' });
    }

    // ── Handle PATCH (Update Status, Notes, Priority, AssignedTo) ─────────────
    if (method === 'PATCH' || (method === 'POST' && req.body?.action === 'update')) {
      const { id, status, notes, priority, assignedTo, adminEmail, leadName } = req.body || {};
      if (!id) {
        return res.status(400).json({ success: false, error: 'Demo request id is required' });
      }

      const updateFields: Record<string, any> = {
        updatedAt: toFirestoreField(nowIso),
      };
      const fieldPaths: string[] = ['updatedAt'];

      if (status !== undefined) {
        updateFields.status = toFirestoreField(status);
        fieldPaths.push('status');
      }
      if (notes !== undefined) {
        updateFields.notes = toFirestoreField(notes);
        fieldPaths.push('notes');
      }
      if (priority !== undefined) {
        updateFields.priority = toFirestoreField(priority);
        fieldPaths.push('priority');
      }
      if (assignedTo !== undefined) {
        updateFields.assignedTo = toFirestoreField(assignedTo);
        fieldPaths.push('assignedTo');
      }

      const maskQuery = fieldPaths.map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
      const patchRes = await fetch(`${baseUrl}/demoRequests/${id}?${maskQuery}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: updateFields }),
      });

      if (!patchRes.ok) {
        const errText = await patchRes.text();
        throw new Error(`Failed to update demo request in Firestore: ${errText}`);
      }

      // Log Audit Event
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await fetch(`${baseUrl}/commandCenterAuditLogs/${auditId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fields: {
            id: { stringValue: auditId },
            timestamp: { stringValue: nowIso },
            actorUid: { stringValue: 'usr_superadmin' },
            actorEmail: { stringValue: adminEmail || 'pandeyaryan28@gmail.com' },
            actorName: { stringValue: 'Platform SuperAdmin' },
            action: { stringValue: 'DEMO_STATUS_UPDATED' },
            targetType: { stringValue: 'demoRequest' },
            targetId: { stringValue: id },
            targetName: { stringValue: leadName ? `Lead: ${leadName}` : `Demo Request ${id}` },
            reason: { stringValue: `Demo status updated to ${status || 'updated'}${notes ? ` - Notes: ${notes.slice(0, 60)}` : ''}` },
          },
        }),
      }).catch((e) => console.warn('Failed to write audit log:', e));

      return res.status(200).json({ success: true, message: 'Demo request updated successfully' });
    }

    // ── Handle POST (Create manual lead / demo request) ─────────────────────────
    if (method === 'POST') {
      const { name, email, company, teamSize, message, priority, source, adminEmail } = req.body || {};
      if (!name || !email) {
        return res.status(400).json({ success: false, error: 'Name and email are required' });
      }

      const id = `demo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const docFields: Record<string, any> = {
        id: toFirestoreField(id),
        name: toFirestoreField(name),
        email: toFirestoreField(email),
        company: toFirestoreField(company || email.split('@')[1]?.split('.')[0]?.toUpperCase() || 'Organization'),
        teamSize: toFirestoreField(teamSize || '5-20'),
        message: toFirestoreField(message || ''),
        source: toFirestoreField(source || 'command_center'),
        formType: toFirestoreField('demo'),
        status: toFirestoreField('pending'),
        priority: toFirestoreField(priority || 'medium'),
        notes: toFirestoreField(''),
        assignedTo: toFirestoreField(''),
        createdAt: toFirestoreField(nowIso),
        updatedAt: toFirestoreField(nowIso),
      };

      const createRes = await fetch(`${baseUrl}/demoRequests/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: docFields }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Failed to create demo request in Firestore: ${errText}`);
      }

      return res.status(200).json({ success: true, id, message: 'Demo request created successfully' });
    }
  } catch (error: any) {
    console.error('[command-center-demo-request] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
