import React, { useState, useEffect } from 'react';
import { Sun, Moon, Search, ShieldCheck, Radio, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSuperAdminAuth } from '../../context/AuthContext';
import { superAdminService } from '../../services/superAdminService';

interface CommandHeaderProps {
  onSearchOpen?: () => void;
}

export function CommandHeader({ onSearchOpen }: CommandHeaderProps) {
  const { mode, toggleTheme } = useTheme();
  const { adminProfile } = useSuperAdminAuth();

  const [syncState, setSyncState] = useState<{ isSyncing: boolean; lastSyncedAt: Date }>({
    isSyncing: false,
    lastSyncedAt: new Date(),
  });

  useEffect(() => {
    return superAdminService.subscribeToSyncStatus(setSyncState);
  }, []);

  const handleForceSync = async () => {
    await superAdminService.refresh();
  };

  return (
    <header className="h-14 w-full px-6 flex items-center justify-between gap-4 border-b border-border bg-surface/70 backdrop-blur-xl z-10 shrink-0">
      {/* Left: Environment & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Radio className="w-3.5 h-3.5 text-success animate-pulse" />
          <span className="font-semibold text-foreground">GUILD_CORE</span>
          <span>/</span>
          <span className="text-muted-foreground">SUPERADMIN_CONTROL</span>
        </div>
        <div className="h-4 w-px bg-border shrink-0" />
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
          STEALTH: NOINDEX
        </span>
      </div>

      {/* Right: Quick Search + Live Sync Status + Theme Switcher + Status */}
      <div className="flex items-center gap-3">
        {/* Live Backend Sync Status Pill */}
        <button
          type="button"
          onClick={handleForceSync}
          title={`Last synchronized with Firestore: ${syncState.lastSyncedAt.toLocaleTimeString()}. Click to force sync.`}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-border bg-secondary/50 hover:bg-surface-hover text-xs font-mono transition-all cursor-pointer select-none"
        >
          {syncState.isSyncing ? (
            <>
              <RefreshCw className="w-3 h-3 text-primary animate-spin" />
              <span className="text-primary text-[10px] font-bold">SYNCING...</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-muted-foreground text-[10px] font-medium hidden sm:inline">SYNCED</span>
            </>
          )}
        </button>

        {/* Quick Search trigger */}
        <button
          type="button"
          onClick={onSearchOpen}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-border-strong text-xs transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Quick Jump...</span>
          <kbd className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border shadow-xs">
            ⌘K
          </kbd>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-2 rounded-xl border border-border bg-secondary/50 text-foreground hover:bg-surface-hover hover:border-border-strong transition-all cursor-pointer shadow-xs"
        >
          {mode === 'dark' ? (
            <Sun className="w-4 h-4 text-warning" />
          ) : (
            <Moon className="w-4 h-4 text-accent" />
          )}
        </button>

        {/* SuperAdmin Role Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-accent/10 border border-accent/20 text-accent font-mono text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="uppercase">{adminProfile?.role || 'SUPERADMIN'}</span>
        </div>
      </div>
    </header>
  );
}
