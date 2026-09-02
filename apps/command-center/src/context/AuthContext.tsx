import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  type PlatformAdminDoc,
  type SuperAdminPermission,
  getDefaultPermissionsForRole,
  hasPermission,
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
      user: { uid: string; email: string; displayName?: string };
      adminProfile: null;
      permissions: [];
      isSuperAdmin: false;
      reason: string;
    }
  | {
      status: 'authorized';
      user: { uid: string; email: string; displayName?: string };
      adminProfile: PlatformAdminDoc;
      permissions: SuperAdminPermission[];
      isSuperAdmin: boolean;
    };

export interface SuperAdminAuthContextValue {
  state: SuperAdminAuthState;
  user: { uid: string; email: string; displayName?: string } | null;
  adminProfile: PlatformAdminDoc | null;
  isSuperAdmin: boolean;
  permissions: SuperAdminPermission[];
  status: 'loading' | 'unauthenticated' | 'unauthorized' | 'authorized';
  hasPermission: (permission: SuperAdminPermission) => boolean;
  verifyPasscode: (code: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'guild_cc_master_session_token';
const PROFILE_KEY = 'guild_cc_master_profile';

export function SuperAdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SuperAdminAuthState>({
    status: 'loading',
    user: null,
    adminProfile: null,
    permissions: [],
    isSuperAdmin: false,
  });

  const restoreSession = useCallback(async () => {
    try {
      const storedToken = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
      const storedProfileRaw = sessionStorage.getItem(PROFILE_KEY) || localStorage.getItem(PROFILE_KEY);

      if (!storedToken) {
        setState({
          status: 'unauthenticated',
          user: null,
          adminProfile: null,
          permissions: [],
          isSuperAdmin: false,
        });
        return;
      }

      // Verify session with backend API
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storedToken}`,
        },
        body: JSON.stringify({ token: storedToken }),
      });

      if (res.ok) {
        const data = await res.json();
        const profile: PlatformAdminDoc = data.adminProfile || {
          uid: 'superadmin_aryan',
          email: 'pandeyaryan28@gmail.com',
          name: 'Aryan Pandey',
          role: 'superadmin',
          permissions: getDefaultPermissionsForRole('superadmin'),
          isSuperAdmin: true,
          active: true,
        };

        const authUser = {
          uid: profile.uid,
          email: profile.email,
          displayName: profile.name || 'Aryan Pandey',
        };

        setState({
          status: 'authorized',
          user: authUser,
          adminProfile: profile,
          permissions: profile.permissions,
          isSuperAdmin: true,
        });
      } else {
        // Fallback: If offline or API unavailable, check if locally stored valid profile exists
        if (storedProfileRaw) {
          const profile = JSON.parse(storedProfileRaw);
          const authUser = {
            uid: profile.uid,
            email: profile.email,
            displayName: profile.name || 'Aryan Pandey',
          };
          setState({
            status: 'authorized',
            user: authUser,
            adminProfile: profile,
            permissions: profile.permissions || getDefaultPermissionsForRole('superadmin'),
            isSuperAdmin: true,
          });
          return;
        }

        // Invalid session
        sessionStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_KEY);
        setState({
          status: 'unauthenticated',
          user: null,
          adminProfile: null,
          permissions: [],
          isSuperAdmin: false,
        });
      }
    } catch {
      // In case network check is unreachable, check stored session
      const storedToken = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
      const storedProfileRaw = sessionStorage.getItem(PROFILE_KEY) || localStorage.getItem(PROFILE_KEY);
      if (storedToken && storedProfileRaw) {
        try {
          const profile = JSON.parse(storedProfileRaw);
          setState({
            status: 'authorized',
            user: { uid: profile.uid, email: profile.email, displayName: profile.name },
            adminProfile: profile,
            permissions: profile.permissions || getDefaultPermissionsForRole('superadmin'),
            isSuperAdmin: true,
          });
          return;
        } catch {
          // ignore
        }
      }

      setState({
        status: 'unauthenticated',
        user: null,
        adminProfile: null,
        permissions: [],
        isSuperAdmin: false,
      });
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const verifyPasscode = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.token) {
        const profile: PlatformAdminDoc = data.adminProfile || {
          uid: 'superadmin_aryan',
          email: 'pandeyaryan28@gmail.com',
          name: 'Aryan Pandey',
          role: 'superadmin',
          permissions: getDefaultPermissionsForRole('superadmin'),
          isSuperAdmin: true,
          active: true,
        };

        const authUser = {
          uid: profile.uid,
          email: profile.email,
          displayName: profile.name || 'Aryan Pandey',
        };

        // Store session tokens
        sessionStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(TOKEN_KEY, data.token);
        sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

        setState({
          status: 'authorized',
          user: authUser,
          adminProfile: profile,
          permissions: profile.permissions,
          isSuperAdmin: true,
        });

        return { success: true };
      }

      return {
        success: false,
        error: data.error || 'Authorization failed. Incorrect passcode.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: 'Network error connecting to authorization server. Please try again.',
      };
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(PROFILE_KEY);

    setState({
      status: 'unauthenticated',
      user: null,
      adminProfile: null,
      permissions: [],
      isSuperAdmin: false,
    });
  }, []);

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
    verifyPasscode,
    signOut: handleSignOut,
    refreshAuth: restoreSession,
  }), [state, checkPermission, verifyPasscode, handleSignOut, restoreSession]);

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
