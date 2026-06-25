import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2, ShieldX } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, onboarding, loading, isBanned } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading Guild...</p>
        </div>
      </div>
    );
  }

  // User was banned (removed by admin). useAuth already signs them out,
  // but we surface a clear message before the redirect to /login completes.
  if (isBanned) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
            <ShieldX className="h-7 w-7 text-rose-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Account Removed</h1>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-medium">
              Your account has been removed from this workspace by an administrator. Please contact your workspace owner if you believe this is a mistake.
            </p>
          </div>
          <Navigate to="/login" replace />
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

  if (!onboarding?.completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
