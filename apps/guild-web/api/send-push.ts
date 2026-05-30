import { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';

// 1. Read firebase environment variables to run client-sdk securely inside Vercel
const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             process.env.VITE_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. Configure VAPID signatures
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BO6D3MKcWyBQygcdqxwbp8b72UxFNODMTcKe2nk3Grz1928hhFhKQtXUb7NPKYZVj208MoVD4sClmQSFMuY0s7w';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'tjSqBeqLwDK8TVl8qGLjEhwvEu65YoOE5wxSOJynWvk';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'mailto:support@guildhq.com';

webpush.setVapidDetails(
  SENDER_EMAIL,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { recipientId, title, body, link } = req.body;

  if (!recipientId || !title) {
    return res.status(400).json({ error: 'Missing required parameters: recipientId and title' });
  }

  try {
    // 3. Fetch recipient's registered browser subscriptions from Firestore
    const userDocRef = doc(db, 'users', recipientId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return res.status(444).json({ error: 'User does not exist in Firestore' });
    }

    const userData = userSnap.data();
    const subscriptions = userData.pushSubscriptions || [];

    if (subscriptions.length === 0) {
      return res.status(200).json({ success: true, message: 'User has no active browser subscriptions registered' });
    }

    // 4. Dispatch encrypted payloads in parallel
    const payload = JSON.stringify({
      title,
      body: body || '',
      url: link || '/',
    });

    const pushPromises = subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification(sub, payload);
        return { status: 'success', sub };
      } catch (err: any) {
        console.error(`WebPush sending failed for endpoint ${sub.endpoint}`, err);
        // If the subscription is expired or blocked (HTTP 410 or 404), remove it from Firestore
        if (err.statusCode === 410 || err.statusCode === 404) {
          try {
            await updateDoc(userDocRef, {
              pushSubscriptions: arrayRemove(sub),
            });
            console.log(`Cleaned up expired subscription for user ${recipientId}`);
          } catch (cleanErr) {
            console.error('Failed to remove invalid subscription from Firestore', cleanErr);
          }
        }
        return { status: 'failed', sub, error: err.message };
      }
    });

    const results = await Promise.all(pushPromises);
    const successCount = results.filter(r => r.status === 'success').length;

    return res.status(200).json({
      success: true,
      sent: successCount,
      total: subscriptions.length,
      results: results.map(r => ({ status: r.status, endpoint: r.sub.endpoint }))
    });

  } catch (error: any) {
    console.error('Error executing send-push API', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
