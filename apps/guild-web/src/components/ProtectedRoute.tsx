import * as React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2, ShieldX, LogOut } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, userProfile, onboarding, loading, isBanned, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (isBanned) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-5 max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-lg">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
            <ShieldX className="h-6 w-6 text-rose-500" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-foreground">Workspace Access Revoked</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your account has been removed from this workspace by an administrator. Please contact your workspace owner if you believe this is an error.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-95 active:scale-[0.98] cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  const isSetupComplete = Boolean(onboarding?.completed || userProfile?.organizationId);
  if (!isSetupComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
