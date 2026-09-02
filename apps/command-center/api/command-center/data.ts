import { createHmac, timingSafeEqual } from 'crypto';

const JWT_SECRET = process.env.SUPERADMIN_JWT_SECRET || 'guild-superadmin-secret-key-2809-alpha';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'guild-app-f6c28';
const FIREBASE_REFRESH_TOKEN =
  process.env.FIREBASE_REFRESH_TOKEN ||
  '1//0gGK2a0tXktXECgYIARAAGBASNwF-L9IrXnAQrodw3eQ7yl4WvCCXqNoTJGmY0AQfdi6nIAZGa6FrwbEInGQbcrpRYk7RoYaVBw8';
const CLIENT_ID =
  process.env.FIREBASE_CLIENT_ID || '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.FIREBASE_CLIENT_SECRET || 'j9iVZfS8kkCEFUPaAeJV0sAi';

// In-memory token cache for serverless warm starts
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
    console.error('[command-center-data] Failed to refresh token:', e);
  }

  return cachedAccessToken || '';
}

function parseFirestoreValue(v: any): any {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return parseFloat(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) {
    const res: Record<string, any> = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) {
      res[k] = parseFirestoreValue(val);
    }
    return res;
  }
  if ('arrayValue' in v) {
    return (v.arrayValue.values || []).map(parseFirestoreValue);
  }
  return null;
}

function parseFirestoreDoc(doc: any): any {
  const id = doc.name.split('/').pop();
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields || {})) {
    fields[k] = parseFirestoreValue(v);
  }
  return { id, ...fields };
}

export default async function handler(req: any, res: any) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

    const [orgsRes, usersRes, projectsRes] = await Promise.all([
      fetch(`${baseUrl}/organizations`, { headers }),
      fetch(`${baseUrl}/users`, { headers }),
      fetch(`${baseUrl}/projects`, { headers }),
    ]);

    const [orgsData, usersData, projectsData] = await Promise.all([
      orgsRes.json() as Promise<any>,
      usersRes.json() as Promise<any>,
      projectsRes.json() as Promise<any>,
    ]);

    const rawUsers = (usersData.documents || []).map(parseFirestoreDoc);
    const rawOrgs = (orgsData.documents || []).map(parseFirestoreDoc);
    const rawProjects = (projectsData.documents || []).map(parseFirestoreDoc);

    // Format Users
    const users = rawUsers.map((u: any) => {
      const org = rawOrgs.find((o: any) => o.id === u.organizationId);
      return {
        uid: u.uid || u.id,
        email: u.email || 'no-email@guildorbit.com',
        fullName: u.fullName || u.username || 'Guild User',
        username: u.username || (u.email ? u.email.split('@')[0] : 'user'),
        designation: u.designation || (u.role === 'owner' ? 'Workspace Owner' : 'Team Member'),
        employeeId: u.employeeId || 'EMP-01',
        organizationId: u.organizationId || '',
        organizationName: org ? org.name : (u.organizationId ? 'Guild Workspace' : 'Unassigned'),
        role: u.role || 'member',
        status: 'active',
        createdAt: u.createdAt || new Date().toISOString(),
        authProvider: u.email && u.email.endsWith('@gmail.com') ? 'google.com' : 'password',
        photoURL: u.photoURL,
        isBanned: false,
      };
    });

    // Format Organizations
    const organizations = rawOrgs.map((o: any) => {
      const orgUsers = users.filter((u: any) => u.organizationId === o.id);
      const owner = users.find((u: any) => u.uid === o.ownerId || u.organizationId === o.id && u.role === 'owner') ||
                    users.find((u: any) => u.organizationId === o.id);

      return {
        id: o.id,
        name: o.name || 'Guild Workspace',
        ownerId: o.ownerId || (owner ? owner.uid : ''),
        ownerName: owner ? owner.fullName : (o.ownerId || 'Workspace Owner'),
        ownerEmail: owner ? owner.email : (o.emailDomain ? `owner@${o.emailDomain}` : 'admin@guildorbit.com'),
        industry: o.industry || 'Technology',
        companySize: o.companySize || '1–10',
        plan: o.plan || 'free',
        billingStatus: o.billingStatus || 'active',
        seats: orgUsers.length || 1,
        maxSeats: o.maxSeats || (o.plan === 'enterprise' ? 100 : o.plan === 'pro_monthly' || o.plan === 'pro_annual' ? 25 : 5),
        storageLimitMb: o.storageLimitMb || 500,
        currency: o.currency || 'INR',
        creditBalance: o.creditBalance || 0,
        memberCount: orgUsers.length || 1,
        domainAutoJoin: !!o.domainAutoJoin,
        emailDomain: o.emailDomain || (owner && owner.email ? owner.email.split('@')[1] : 'guildorbit.com'),
        createdAt: o.createdAt || new Date().toISOString(),
        updatedAt: o.updatedAt,
        lastActiveAt: o.updatedAt || o.createdAt || new Date().toISOString(),
        customOverrides: o.customOverrides || null,
        photoURL: o.photoURL,
      };
    });

    // Extract Audit Logs & Transactions
    const auditLogs: any[] = [];
    const transactions: any[] = [];

    return res.status(200).json({
      success: true,
      organizations,
      users,
      projects: rawProjects,
      auditLogs,
      transactions,
    });
  } catch (error: any) {
    console.error('[command-center-data] Error fetching Firestore data:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
