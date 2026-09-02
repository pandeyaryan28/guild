import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@guild/firebase';
import {
  type PlatformAdminDoc,
  type SuperAdminPermission,
  isSuperAdminEmail,
  getDefaultPermissionsForRole,
  hasPermission,
  PLATFORM_ADMINS_COLLECTION,
} from '../config/superadmin';

export type SuperAdminAuthState =
  | {
      status: 'loading';
      user: null;
      adminProfile: null;
      permissions: [];
      isSuperAdmin: false;
    }
  | {
      status: 'unauthenticated';
      user: null;
      adminProfile: null;
      permissions: [];
      isSuperAdmin: false;
    }
  | {
      status: 'unauthorized';
      email: string;
      user: User;
      adminProfile: null;
      permissions: [];
      isSuperAdmin: false;
      reason: string;
    }
  | {
      status: 'authorized';
      user: User;
      adminProfile: PlatformAdminDoc;
      permissions: SuperAdminPermission[];
      isSuperAdmin: boolean;
    };

export interface SuperAdminAuthContextValue {
  state: SuperAdminAuthState;
  user: User | null;
  adminProfile: PlatformAdminDoc | null;
  isSuperAdmin: boolean;
  permissions: SuperAdminPermission[];
  status: 'loading' | 'unauthenticated' | 'unauthorized' | 'authorized';
  hasPermission: (permission: SuperAdminPermission) => boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextValue | undefined>(undefined);

export function SuperAdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SuperAdminAuthState>({
    status: 'loading',
    user: null,
    adminProfile: null,
    permissions: [],
    isSuperAdmin: false,
  });

  const verifyUser = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setState({
        status: 'unauthenticated',
        user: null,
        adminProfile: null,
        permissions: [],
        isSuperAdmin: false,
      });
      return;
    }

    const email = (firebaseUser.email || '').trim().toLowerCase();
    const isWhitelisted = isSuperAdminEmail(email);

    try {
      // Check Firestore /platformAdmins/{uid}
      const adminDocRef = doc(db, PLATFORM_ADMINS_COLLECTION, firebaseUser.uid);
      const adminDocSnap = await getDoc(adminDocRef);

      if (adminDocSnap.exists()) {
        const data = adminDocSnap.data() as Partial<PlatformAdminDoc>;

        if (data.active === false) {
          setState({
            status: 'unauthorized',
            email,
            user: firebaseUser,
            adminProfile: null,
            permissions: [],
            isSuperAdmin: false,
            reason: 'ACCOUNT_DEACTIVATED',
          });
          return;
        }

        const role = data.role || 'superadmin';
        const permissions = data.permissions && data.permissions.length > 0
          ? data.permissions
          : getDefaultPermissionsForRole(role);

        const adminProfile: PlatformAdminDoc = {
          uid: firebaseUser.uid,
          email,
          name: data.name || firebaseUser.displayName || email.split('@')[0],
          role,
          permissions,
          isSuperAdmin: data.isSuperAdmin ?? (role === 'superadmin' || isWhitelisted),
          active: true,
          addedAt: data.addedAt,
          addedBy: data.addedBy,
          lastLoginAt: data.lastLoginAt,
        };

        // Update last login timestamp asynchronously
        updateDoc(adminDocRef, { lastLoginAt: serverTimestamp() }).catch(() => {});

        setState({
          status: 'authorized',
          user: firebaseUser,
          adminProfile,
          permissions: adminProfile.permissions,
          isSuperAdmin: adminProfile.isSuperAdmin,
        });
        return;
      }

      // Firestore document does not exist yet. Check if email is in SuperAdmin whitelist
      if (isWhitelisted) {
        // Bootstrap Root SuperAdmin profile
        const bootstrapProfile: PlatformAdminDoc = {
          uid: firebaseUser.uid,
          email,
          name: firebaseUser.displayName || email.split('@')[0],
          role: 'superadmin',
          permissions: getDefaultPermissionsForRole('superadmin'),
          isSuperAdmin: true,
          active: true,
        };

        setState({
          status: 'authorized',
          user: firebaseUser,
          adminProfile: bootstrapProfile,
          permissions: bootstrapProfile.permissions,
          isSuperAdmin: true,
        });
        return;
      }

      // Not in platformAdmins and not in whitelist -> Strict unauthorized with zero leakage
      setState({
        status: 'unauthorized',
        email,
        user: firebaseUser,
        adminProfile: null,
        permissions: [],
        isSuperAdmin: false,
        reason: 'NOT_AUTHORIZED_PLATFORM_ADMIN',
      });
    } catch (err: any) {
      // In case of Firestore permission or network error, fallback to email whitelist
      if (isWhitelisted) {
        const bootstrapProfile: PlatformAdminDoc = {
          uid: firebaseUser.uid,
          email,
          name: firebaseUser.displayName || email.split('@')[0],
          role: 'superadmin',
          permissions: getDefaultPermissionsForRole('superadmin'),
          isSuperAdmin: true,
          active: true,
        };

        setState({
          status: 'authorized',
          user: firebaseUser,
          adminProfile: bootstrapProfile,
          permissions: bootstrapProfile.permissions,
          isSuperAdmin: true,
        });
      } else {
        setState({
          status: 'unauthorized',
          email,
          user: firebaseUser,
          adminProfile: null,
          permissions: [],
          isSuperAdmin: false,
          reason: 'ACCESS_VALIDATION_ERROR',
        });
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      verifyUser(currentUser);
    });
    return () => unsubscribe();
  }, [verifyUser]);

  const handleSignInWithEmail = useCallback(async (email: string, pass: string) => {
    setState({
      status: 'loading',
      user: null,
      adminProfile: null,
      permissions: [],
      isSuperAdmin: false,
    });
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  }, []);

  const handleSignInWithGoogle = useCallback(async () => {
    setState({
      status: 'loading',
      user: null,
      adminProfile: null,
      permissions: [],
      isSuperAdmin: false,
    });
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  }, []);

  const handleSignOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setState({
      status: 'unauthenticated',
      user: null,
      adminProfile: null,
      permissions: [],
      isSuperAdmin: false,
    });
  }, []);

  const refreshAuth = useCallback(async () => {
    await verifyUser(auth.currentUser);
  }, [verifyUser]);

  const checkPermission = useCallback(
    (permission: SuperAdminPermission) => {
      if (state.status !== 'authorized') return false;
      return hasPermission(state.permissions, permission);
    },
    [state]
  );

  const contextValue = useMemo<SuperAdminAuthContextValue>(() => ({
    state,
    user: state.status === 'authorized' ? state.user : null,
    adminProfile: state.status === 'authorized' ? state.adminProfile : null,
    isSuperAdmin: state.status === 'authorized' ? state.isSuperAdmin : false,
    permissions: state.status === 'authorized' ? state.permissions : [],
    status: state.status,
    hasPermission: checkPermission,
    signInWithEmail: handleSignInWithEmail,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    refreshAuth,
  }), [state, checkPermission, handleSignInWithEmail, handleSignInWithGoogle, handleSignOut, refreshAuth]);

  return (
    <SuperAdminAuthContext.Provider value={contextValue}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
}

export function useSuperAdminAuth(): SuperAdminAuthContextValue {
  const context = useContext(SuperAdminAuthContext);
  if (!context) {
    throw new Error('useSuperAdminAuth must be used within a SuperAdminAuthProvider');
  }
  return context;
}
