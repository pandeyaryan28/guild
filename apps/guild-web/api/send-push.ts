import webpush from 'web-push';

/**
 * POST /api/send-push
 *
 * Accepts push subscription objects from an authenticated workspace client.
 * Requires Authorization: Bearer <firebaseIdToken> (or body.idToken).
 *
 * Body: { subscriptions: PushSubscriptionJSON[], title: string, body?: string, url?: string }
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = req.headers?.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : req.body?.idToken;

  if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
    return res.status(401).json({ error: 'Unauthorized: Valid authentication token is required' });
  }

  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
  const SENDER_EMAIL = process.env.SENDER_EMAIL || 'mailto:support@guildhq.com';

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('[send-push] Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY environment variables.');
    return res.status(500).json({ error: 'Web push is not configured on server' });
  }

  try {
    webpush.setVapidDetails(SENDER_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err: any) {
    console.error('[send-push] Failed to initialize VAPID credentials:', err);
    return res.status(500).json({ error: 'Invalid VAPID credentials' });
  }

  const reqBody = req.body || {};
  const { subscriptions, title, body, url } = reqBody;

  if (!subscriptions || !Array.isArray(subscriptions) || subscriptions.length === 0 || !title) {
    return res.status(400).json({ error: 'Missing required fields: subscriptions[] and title' });
  }

  // Cap batch size to prevent abuse
  const boundedSubscriptions = subscriptions.slice(0, 50);

  const payload = JSON.stringify({
    title: String(title).slice(0, 200),
    body: body ? String(body).slice(0, 500) : '',
    url: url && typeof url === 'string' && url.startsWith('/') ? url : '/',
  });

  const results = await Promise.all(
    boundedSubscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification(sub, payload);
        return { status: 'success', endpoint: sub.endpoint };
      } catch (err: any) {
        console.error(`[send-push] Failed for endpoint ${sub.endpoint}:`, err.statusCode, err.message);
        return { status: 'failed', endpoint: sub.endpoint, error: err.message, statusCode: err.statusCode };
      }
    })
  );

  const successCount = results.filter((r) => r.status === 'success').length;

  return res.status(200).json({
    success: true,
    sent: successCount,
    total: boundedSubscriptions.length,
    results,
  });
}
