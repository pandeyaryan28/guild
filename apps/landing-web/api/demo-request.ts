import dns from 'dns';

if (typeof (dns as any).setDefaultResultOrder === 'function') {
  (dns as any).setDefaultResultOrder('ipv4first');
}

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'guild-app-f6c28';
const FIREBASE_REFRESH_TOKEN = process.env.FIREBASE_REFRESH_TOKEN || '';
const CLIENT_ID = process.env.FIREBASE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.FIREBASE_CLIENT_SECRET || '';

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
    console.error('[landing-demo-request] Token refresh error:', e);
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

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    const rawName = typeof body.name === 'string' ? body.name.trim() : '';
    const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const company = typeof body.company === 'string' ? body.company.trim().slice(0, 150) : '';
    const teamSize = typeof body.teamSize === 'string' ? body.teamSize.trim().slice(0, 50) : '';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';
    const source = typeof body.source === 'string' ? body.source.trim().slice(0, 50) : '';
    const formType = typeof body.formType === 'string' ? body.formType.trim().slice(0, 50) : '';

    const name = rawName.slice(0, 120);
    const email = rawEmail.slice(0, 180);

    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'A valid full name and email address are required.' });
    }

    const token = await getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
    const nowIso = new Date().toISOString();
    const id = `demo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const effectiveCompany =
      company || (email.includes('@') ? email.split('@')[1].split('.')[0].toUpperCase() : 'Organization');
    const effectiveTeamSize = teamSize || '5-20';
    const effectiveSource = source || 'demo_page';
    const effectiveFormType = formType || 'demo';

    // Calculate initial lead priority based on team size
    let priority = 'medium';
    if (effectiveTeamSize === '100+' || effectiveTeamSize === '200+' || effectiveTeamSize.includes('100')) {
      priority = 'high';
    } else if (effectiveTeamSize === '1-5' || effectiveTeamSize === 'individual') {
      priority = 'low';
    }

    // 1. Write Demo Request into Firestore
    const docFields: Record<string, any> = {
      id: toFirestoreField(id),
      name: toFirestoreField(name),
      email: toFirestoreField(email),
      company: toFirestoreField(effectiveCompany),
      teamSize: toFirestoreField(effectiveTeamSize),
      message: toFirestoreField(message || ''),
      source: toFirestoreField(effectiveSource),
      formType: toFirestoreField(effectiveFormType),
      status: toFirestoreField('pending'),
      priority: toFirestoreField(priority),
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
      console.error('[landing-demo-request] Firestore write error:', errText);
      throw new Error(`Failed to save demo request: ${errText}`);
    }

    // 2. Write Audit Log for Live Platform Activity Feed
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    fetch(`${baseUrl}/commandCenterAuditLogs/${auditId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          id: { stringValue: auditId },
          timestamp: { stringValue: nowIso },
          actorUid: { stringValue: 'website_lead' },
          actorEmail: { stringValue: email },
          actorName: { stringValue: name },
          action: { stringValue: 'DEMO_REQUEST_RECEIVED' },
          targetType: { stringValue: 'demoRequest' },
          targetId: { stringValue: id },
          targetName: { stringValue: `${name} (${effectiveCompany})` },
          reason: {
            stringValue: `Inbound demo request from ${effectiveSource} - Team: ${effectiveTeamSize}${message ? ` - "${message.slice(0, 50)}..."` : ''}`,
          },
        },
      }),
    }).catch((err) => console.warn('[landing-demo-request] Non-blocking audit log error:', err));

    // 3. Optional Web3Forms email notification if access key exists
    const web3Key = process.env.VITE_WEB3FORMS_ACCESS_KEY || process.env.WEB3FORMS_ACCESS_KEY;
    if (web3Key && web3Key !== 'your_web3forms_access_key_here') {
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: web3Key,
          subject: `New Demo Booking from ${name} (${effectiveCompany})`,
          from_name: 'Guild Orbit Marketing Website',
          name,
          email,
          company: effectiveCompany,
          teamSize: effectiveTeamSize,
          message: message || '',
          form_type: effectiveFormType,
          lead_id: id,
        }),
      }).catch((err) => console.warn('[landing-demo-request] Web3Forms dispatch warning:', err));
    }

    return res.status(200).json({
      success: true,
      id,
      message: 'Demo request received and synced to Guild Orbit Command Center in real time.',
    });
  } catch (error: any) {
    console.error('[landing-demo-request] Unexpected error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
