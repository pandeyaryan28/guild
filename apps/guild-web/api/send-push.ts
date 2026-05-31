import webpush from 'web-push';

// VAPID keys — must match the Firebase Console Web Push certificate
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BLrZp1urQa3pn0DUqt8AfPXOrLGHTUZ_gHhxZI7CjjyXQ3b5Xbx2qE2n7pdgE-cY98JIoeJn1Qq16OmgzckmWzw';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'M_n8jJxkZLdYFZNqb2WNDH3ZGeaczT8E72wI-3HuMKE';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'mailto:support@guildhq.com';

webpush.setVapidDetails(SENDER_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

/**
 * POST /api/send-push
 *
 * Accepts push subscription objects directly from the calling browser client
 * (which is already authenticated and has read access to Firestore).
 * This avoids needing the Firebase Admin SDK or unauthenticated Firestore reads
 * in the serverless environment.
 *
 * Body: { subscriptions: PushSubscriptionJSON[], title: string, body?: string, url?: string }
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { subscriptions, title, body, url } = req.body;

  if (!subscriptions || !Array.isArray(subscriptions) || subscriptions.length === 0 || !title) {
    return res.status(400).json({ error: 'Missing required fields: subscriptions[] and title' });
  }

  const payload = JSON.stringify({
    title,
    body: body || '',
    url: url || '/',
  });

  const results = await Promise.all(
    subscriptions.map(async (sub: any) => {
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
  console.log(`[send-push] Sent ${successCount}/${subscriptions.length} notifications for "${title}"`);

  return res.status(200).json({
    success: true,
    sent: successCount,
    total: subscriptions.length,
    results,
  });
}
