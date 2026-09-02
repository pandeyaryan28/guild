import { createHmac, timingSafeEqual } from 'crypto';

const MASTER_CODE = process.env.SUPERADMIN_MASTER_CODE || process.env.ADMIN_CODE || '2809';
const JWT_SECRET = process.env.SUPERADMIN_JWT_SECRET || 'guild-superadmin-secret-key-2809-alpha';

function generateSessionToken(email: string): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days valid
  const payload = JSON.stringify({ email, role: 'superadmin', exp: expiresAt });
  const base64Payload = Buffer.from(payload).toString('base64url');
  const signature = createHmac('sha256', JWT_SECRET).update(base64Payload).digest('base64url');
  return {
    token: `${base64Payload}.${signature}`,
    expiresAt,
  };
}

export default async function handler(req: any, res: any) {
  // Security & Stealth Headers
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { code } = req.body || {};

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'Authorization code required' });
  }

  const cleanInput = code.trim();
  const cleanTarget = MASTER_CODE.trim();

  let isValid = false;
  try {
    if (cleanInput.length === cleanTarget.length) {
      isValid = timingSafeEqual(Buffer.from(cleanInput), Buffer.from(cleanTarget));
    }
  } catch {
    isValid = false;
  }

  if (!isValid) {
    // Artificial small delay to mitigate brute-force
    await new Promise((resolve) => setTimeout(resolve, 300));
    return res.status(401).json({ success: false, error: 'Invalid master authorization code.' });
  }

  const email = 'pandeyaryan28@gmail.com';
  const { token, expiresAt } = generateSessionToken(email);

  return res.status(200).json({
    success: true,
    token,
    expiresAt,
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
