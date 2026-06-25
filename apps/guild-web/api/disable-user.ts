/**
 * POST /api/disable-user
 *
 * Disables a Firebase Auth user account via the Admin SDK so they cannot log
 * in again after being removed from a Guild workspace.
 *
 * Body: { uid: string }
 *
 * This endpoint is called internally by deleteUserProfile() in @guild/firebase.
 * It is NOT exposed as a public API — the caller must be authenticated via the
 * guild-web client (same origin), and the uid must belong to a user that an
 * org owner/admin has already removed from Firestore.
 *
 * Required environment variables (set in Vercel project settings):
 *   FIREBASE_SERVICE_ACCOUNT_KEY — the full JSON of your Firebase service
 *                                   account key, stringified.
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Lazily initialise the Admin SDK (Vercel functions can share a warm instance)
function getAdminAuth() {
  if (!getApps().length) {
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountRaw) {
      throw new Error('[disable-user] FIREBASE_SERVICE_ACCOUNT_KEY env var is not set.');
    }
    const serviceAccount = JSON.parse(serviceAccountRaw);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getAuth();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { uid } = req.body as { uid?: string };

  if (!uid || typeof uid !== 'string' || uid.trim() === '') {
    return res.status(400).json({ error: 'uid is required' });
  }

  try {
    const adminAuth = getAdminAuth();
    // Disable the account — the user can no longer sign in but their data is
    // preserved (already wiped from Firestore by deleteUserProfile).
    await adminAuth.updateUser(uid.trim(), { disabled: true });
    console.log(`[disable-user] Disabled Firebase Auth for uid: ${uid}`);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    // auth/user-not-found is fine — user may have already been deleted
    if (err?.code === 'auth/user-not-found') {
      return res.status(200).json({ success: true, note: 'User not found in Auth — already removed.' });
    }
    console.error('[disable-user] Failed to disable user:', err);
    return res.status(500).json({ error: 'Failed to disable user', details: err?.message });
  }
}
