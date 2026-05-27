import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, collection, getDocs, query, where, limit,
} from 'firebase/firestore';
import { auth, db } from '@guild/firebase';
import type { UserProfile } from '@guild/types';

export type AdminAuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'unauthorized'; email: string }
  | { status: 'authorized'; user: User; profile: UserProfile };

/**
 * Watches Firebase auth and validates that the signed-in user has role 'owner'
 * or 'admin' in ANY organization — i.e. is an admin-level guild member.
 */
export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>({ status: 'loading' });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ status: 'unauthenticated' });
        return;
      }

      try {
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        if (!profileSnap.exists()) {
          setState({ status: 'unauthorized', email: user.email ?? '' });
          return;
        }

        const profile = profileSnap.data() as UserProfile;

        if (profile.role === 'owner' || profile.role === 'admin') {
          setState({ status: 'authorized', user, profile });
        } else {
          setState({ status: 'unauthorized', email: user.email ?? '' });
        }
      } catch {
        setState({ status: 'unauthorized', email: user.email ?? '' });
      }
    });

    return unsub;
  }, []);

  return state;
}
