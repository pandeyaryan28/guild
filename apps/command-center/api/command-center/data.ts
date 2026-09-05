import { createHmac, timingSafeEqual } from 'crypto';
import dns from 'dns';

if (typeof (dns as any).setDefaultResultOrder === 'function') {
  (dns as any).setDefaultResultOrder('ipv4first');
}

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
  if (!doc || !doc.name) return null;
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

    // 1. Fetch core collections in parallel
    const [orgsRes, usersRes, projectsRes, bannedRes, auditRes, demoRes] = await Promise.all([
      fetch(`${baseUrl}/organizations`, { headers }),
      fetch(`${baseUrl}/users`, { headers }),
      fetch(`${baseUrl}/projects`, { headers }),
      fetch(`${baseUrl}/bannedUsers`, { headers }),
      fetch(`${baseUrl}/commandCenterAuditLogs`, { headers }),
      fetch(`${baseUrl}/demoRequests`, { headers }),
    ]);

    const [orgsData, usersData, projectsData, bannedData, auditData, demoData] = await Promise.all([
      orgsRes.json().catch(() => ({ documents: [] })),
      usersRes.json().catch(() => ({ documents: [] })),
      projectsRes.json().catch(() => ({ documents: [] })),
      bannedRes.json().catch(() => ({ documents: [] })),
      auditRes.json().catch(() => ({ documents: [] })),
      demoRes.json().catch(() => ({ documents: [] })),
    ]);

    const rawUsers = (usersData.documents || []).map(parseFirestoreDoc).filter(Boolean);
    const rawOrgs = (orgsData.documents || []).map(parseFirestoreDoc).filter(Boolean);
    const rawProjects = (projectsData.documents || []).map(parseFirestoreDoc).filter(Boolean);
    const rawBannedUsers = (bannedData.documents || []).map(parseFirestoreDoc).filter(Boolean);
    const rawAuditLogs = (auditData.documents || []).map(parseFirestoreDoc).filter(Boolean);
    const rawDemoRequests = (demoData.documents || []).map(parseFirestoreDoc).filter(Boolean);

    const bannedMap = new Map<string, any>();
    rawBannedUsers.forEach((b: any) => {
      if (b && b.id) bannedMap.set(b.id, b);
      if (b && b.uid) bannedMap.set(b.uid, b);
    });

    // 2. Fetch billing info subdocuments and transactions for all organizations in parallel
    const orgBillingMap = new Map<string, any>();
    const allTransactions: any[] = [];

    await Promise.all(
      rawOrgs.map(async (o: any) => {
        try {
          const [billingRes, txRes] = await Promise.all([
            fetch(`${baseUrl}/organizations/${o.id}/billing/info`, { headers }),
            fetch(`${baseUrl}/organizations/${o.id}/billingTransactions`, { headers }),
          ]);

          if (billingRes.ok) {
            const bDoc = await billingRes.json();
            const parsedBilling = parseFirestoreDoc(bDoc);
            if (parsedBilling) {
              orgBillingMap.set(o.id, parsedBilling);
            }
          }

          if (txRes.ok) {
            const txDoc = await txRes.json();
            const txList = (txDoc.documents || []).map(parseFirestoreDoc).filter(Boolean);
            txList.forEach((tx: any) => {
              allTransactions.push({
                ...tx,
                organizationId: o.id,
                organizationName: o.name || 'Workspace',
                timestamp: tx.createdAt || new Date().toISOString(),
              });
            });
          }
        } catch {
          // ignore individual org billing errors
        }
      })
    );

    // Format Users
    const users = rawUsers.map((u: any) => {
      const org = rawOrgs.find((o: any) => o.id === u.organizationId);
      const isBanned = !!u.isBanned || bannedMap.has(u.uid || u.id);
      const banInfo = bannedMap.get(u.uid || u.id);

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
        status: isBanned ? 'banned' : (u.status || 'active'),
        createdAt: u.createdAt || new Date().toISOString(),
        authProvider: u.email && u.email.endsWith('@gmail.com') ? 'google.com' : 'password',
        photoURL: u.photoURL,
        isBanned,
        banReason: u.banReason || banInfo?.reason,
        bannedAt: u.bannedAt || banInfo?.bannedAt,
        bannedBy: u.bannedBy || banInfo?.bannedBy,
      };
    });

    // Format Organizations
    const organizations = rawOrgs.map((o: any) => {
      const orgUsers = users.filter((u: any) => u.organizationId === o.id);
      const owner =
        users.find((u: any) => u.uid === o.ownerId || (u.organizationId === o.id && u.role === 'owner')) ||
        users.find((u: any) => u.organizationId === o.id);

      const billingInfo = orgBillingMap.get(o.id) || {};

      // Canonical Plan normalization
      const plan = billingInfo.plan || o.plan || 'free';
      const billingStatus = billingInfo.status || o.billingStatus || 'active';
      const seatsCount = billingInfo.seats || orgUsers.length || 1;
      const maxSeats =
        o.maxSeats ||
        billingInfo.seats ||
        (plan === 'enterprise' ? 100 : plan.startsWith('pro') ? 25 : 5);

      const creditBalance = billingInfo.creditBalance !== undefined ? billingInfo.creditBalance : (o.creditBalance || 0);

      return {
        id: o.id,
        name: o.name || 'Guild Workspace',
        ownerId: o.ownerId || (owner ? owner.uid : ''),
        ownerName: owner ? owner.fullName : (o.ownerId || 'Workspace Owner'),
        ownerEmail: owner ? owner.email : (o.emailDomain ? `owner@${o.emailDomain}` : 'admin@guildorbit.com'),
        industry: o.industry || 'Technology',
        companySize: o.companySize || '1–10',
        plan,
        billingStatus,
        seats: seatsCount,
        maxSeats,
        storageLimitMb: o.storageLimitMb || 500,
        currency: billingInfo.currency || o.currency || 'INR',
        creditBalance,
        memberCount: orgUsers.length || 1,
        domainAutoJoin: !!o.domainAutoJoin,
        emailDomain: o.emailDomain || (owner && owner.email ? owner.email.split('@')[1] : 'guildorbit.com'),
        createdAt: o.createdAt || new Date().toISOString(),
        updatedAt: o.updatedAt || billingInfo.updatedAt,
        lastActiveAt: o.updatedAt || billingInfo.updatedAt || o.createdAt || new Date().toISOString(),
        nextBillingDate: billingInfo.nextBillingDate || null,
        annualBonusActivated: !!billingInfo.annualBonusActivated,
        appliedCoupon: billingInfo.appliedCoupon || null,
        discountPercent: billingInfo.discountPercent || null,
        customOverrides: o.customOverrides || null,
        photoURL: o.photoURL,
      };
    });

    // Format Audit Logs
    const auditLogs = rawAuditLogs
      .map((log: any) => ({
        id: log.id,
        timestamp: log.timestamp || log.createdAt || new Date().toISOString(),
        actorUid: log.actorUid || 'usr_superadmin',
        actorEmail: log.actorEmail || 'pandeyaryan28@gmail.com',
        actorName: log.actorName || 'Aryan Pandey (Platform SuperAdmin)',
        action: log.action || 'PLAN_OVERRIDE',
        targetType: log.targetType || 'organization',
        targetId: log.targetId || '',
        targetName: log.targetName || log.targetId || 'Platform Resource',
        previousState: log.previousState || {},
        newState: log.newState || {},
        reason: log.reason || 'Administrative platform modification',
      }))
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Format Transactions
    const transactions = allTransactions.sort(
      (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Format Demo Requests
    const demoRequests = rawDemoRequests
      .map((d: any) => ({
        id: d.id,
        name: d.name || 'Inbound Lead',
        email: d.email || '',
        company: d.company || (d.email ? d.email.split('@')[1]?.split('.')[0]?.toUpperCase() : '') || 'Organization',
        teamSize: d.teamSize || '5-20',
        message: d.message || '',
        source: d.source || (d.form_type === 'demo_page_booking' ? 'demo_page' : 'contact_page'),
        formType: d.formType || d.form_type || 'demo',
        status: d.status || 'pending',
        priority: d.priority || (d.teamSize === '100+' || d.teamSize === '200+' ? 'high' : d.teamSize === '20-100' || d.teamSize === '50-200' ? 'medium' : 'low'),
        notes: d.notes || '',
        assignedTo: d.assignedTo || '',
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt || d.createdAt || new Date().toISOString(),
      }))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.status(200).json({
      success: true,
      organizations,
      users,
      projects: rawProjects,
      auditLogs,
      transactions,
      demoRequests,
    });
  } catch (error: any) {
    console.error('[command-center-data] Error fetching Firestore data:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
