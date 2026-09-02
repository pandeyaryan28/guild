import { createHmac, timingSafeEqual } from 'crypto';

const JWT_SECRET = process.env.SUPERADMIN_JWT_SECRET || 'guild-superadmin-secret-key-2809-alpha';

function verifySessionToken(token: string): { valid: boolean; email?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false };
    const [base64Payload, signature] = parts;
    const expectedSig = createHmac('sha256', JWT_SECRET).update(base64Payload).digest('base64url');

    if (signature.length !== expectedSig.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false };
    }

    return { valid: true, email: payload.email };
  } catch {
    return { valid: false };
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.setHeader('Cache-Control', 'no-store, no-cache');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : (req.body?.token || '');

  if (!token) {
    return res.status(401).json({ success: false, error: 'No authorization token provided' });
  }

  const { valid, email } = verifySessionToken(token);
  if (!valid || !email) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid' });
  }

  return res.status(200).json({
    success: true,
    adminProfile: {
      uid: 'superadmin_aryan',
      email,
      name: 'Aryan Pandey',
      role: 'superadmin',
      isSuperAdmin: true,
      permissions: [
        'all',
        'view_metrics',
        'manage_workspaces',
        'manage_users',
        'manage_subscriptions',
        'override_quotas',
        'view_audit_logs',
        'export_data',
        'manage_platform_admins',
      ],
      active: true,
    },
  });
}
