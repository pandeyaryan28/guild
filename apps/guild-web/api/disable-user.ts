/**
 * POST /api/disable-user
 *
 * Disables a Firebase Auth user account via the Admin SDK so they cannot log
 * in again after being removed from a Guild workspace or deleting their account.
 *
 * Body: { uid: string, orgId?: string }
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function ensureAdminApp() {
  if (!getApps().length) {
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountRaw) {
      throw new Error('[disable-user] FIREBASE_SERVICE_ACCOUNT_KEY env var is not set.');
    }
    const serviceAccount = JSON.parse(serviceAccountRaw);
    initializeApp({ credential: cert(serviceAccount) });
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = req.headers?.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : req.body?.idToken;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const body = req.body || {};
  const { uid, orgId } = body as { uid?: string; orgId?: string };

  if (!uid || typeof uid !== 'string' || uid.trim() === '') {
    return res.status(400).json({ error: 'uid is required' });
  }

  const targetUid = uid.trim();

  try {
    ensureAdminApp();
    const adminAuth = getAuth();
    const adminDb = getFirestore();
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!decodedToken?.uid) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const callerUid = decodedToken.uid;

    // Authorization check: caller must either be disabling their own account
    // OR be an owner/admin of the same organization as the target user.
    if (callerUid !== targetUid) {
      const callerSnap = await adminDb.collection('users').doc(callerUid).get();
      const callerData = callerSnap.data();
      const callerRole = callerData?.role;
      const callerOrgId = callerData?.organizationId;

      if (!callerSnap.exists || !callerOrgId || (callerRole !== 'owner' && callerRole !== 'admin')) {
        return res.status(403).json({ error: 'Forbidden: Only workspace owners and admins can disable other accounts.' });
      }

      if (orgId && orgId !== callerOrgId) {
        return res.status(403).json({ error: 'Forbidden: Cross-organization operation denied.' });
      }

      // Verify target belonged to caller's organization (check users, organizationMembers, or bannedUsers)
      const [targetUserSnap, memberSnap, bannedSnap] = await Promise.all([
        adminDb.collection('users').doc(targetUid).get(),
        adminDb.collection('organizationMembers').doc(`${callerOrgId}_${targetUid}`).get(),
        adminDb.collection('bannedUsers').doc(targetUid).get(),
      ]);

      const targetInCallerOrg =
        (targetUserSnap.exists && targetUserSnap.data()?.organizationId === callerOrgId) ||
        memberSnap.exists ||
        (bannedSnap.exists && (!bannedSnap.data()?.orgId || bannedSnap.data()?.orgId === callerOrgId));

      if (!targetInCallerOrg) {
        return res.status(403).json({ error: 'Forbidden: Target user does not belong to your organization.' });
      }
    }

    await adminAuth.updateUser(targetUid, { disabled: true });
    await adminAuth.revokeRefreshTokens(targetUid).catch(() => {});
    console.log(`[disable-user] Disabled Firebase Auth for uid: ${targetUid} (by ${callerUid})`);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    if (err?.code === 'auth/id-token-expired' || err?.code === 'auth/argument-error') {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
    if (err?.code === 'auth/user-not-found') {
      return res.status(200).json({ success: true, note: 'User not found in Auth — already removed.' });
    }
    console.error('[disable-user] Failed to disable user:', err);
    return res.status(500).json({ error: 'Failed to disable user', details: err?.message });
  }
}
