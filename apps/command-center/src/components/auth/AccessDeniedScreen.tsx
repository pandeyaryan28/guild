import React from 'react';
import { ShieldAlert, LogOut, Lock } from 'lucide-react';
import { useSuperAdminAuth } from '../../context/AuthContext';

interface AccessDeniedScreenProps {
  email?: string;
  reason?: string;
}

export function AccessDeniedScreen({ email, reason }: AccessDeniedScreenProps) {
  const { signOut } = useSuperAdminAuth();

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 bg-dot-grid relative select-none">
      {/* Subtle ambient danger glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, oklch(0.60 0.22 25 / 15%) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-lg cc-glass-elevated rounded-2xl p-8 space-y-6">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danger" />
            <div className="w-3 h-3 rounded-full bg-warning opacity-70" />
            <div className="w-3 h-3 rounded-full bg-success opacity-40" />
            <span className="font-mono text-xs font-semibold text-muted-foreground ml-2">
              SEC_GATEWAY // 403_FORBIDDEN
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] text-danger font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>ACCESS RESTRICTED</span>
          </div>
        </div>

        {/* Security Warning Block */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center shrink-0 text-danger">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              Access Denied: Restricted Console
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Guild Super-Admin Command Center is accessible exclusively to authorized platform administrators.
            </p>
          </div>
        </div>

        {/* Security Audit Telemetry Block */}
        <div className="rounded-xl bg-secondary/80 border border-border p-4 font-mono text-xs space-y-2 text-foreground">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>[IDENTITY]</span>
            <span className="text-foreground font-semibold truncate max-w-[240px]">
              {email || 'UNKNOWN_SESSION'}
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>[STATUS]</span>
            <span className="text-danger font-semibold">NOT_IN_SUPERADMIN_WHITELIST</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>[REASON_CODE]</span>
            <span className="text-warning">{reason || 'INSUFFICIENT_PLATFORM_PRIVILEGES'}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>[DATA_LEAK_GUARD]</span>
            <span className="text-success font-semibold">0 RECORDS EXPOSED (AIR-TIGHT)</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          No platform telemetry, customer workspaces, or internal metrics have been decrypted or loaded into this session.
        </p>

        {/* Action Controls */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => signOut()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer shadow-md"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out & Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
