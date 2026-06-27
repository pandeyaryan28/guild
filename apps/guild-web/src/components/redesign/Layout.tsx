import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { NavDock } from './NavDock';
import { GlobalSearch } from '../GlobalSearch';
import { Search, Bell, Command, Sun, Moon } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '@/lib/utils';
import { useTheme } from '../../hooks/useTheme';
import { NotificationPanel } from '../NotificationPanel';
import { AetherToasts } from '../AetherToasts';
import { ThemeSlider } from '../ThemeSlider';
import { OfflineIndicator } from '../pwa/OfflineIndicator';
import { PwaInstallPrompt } from '../pwa/PwaInstallPrompt';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { type Organization } from '../../lib/firestore';

interface RedesignLayoutProps {
  children: React.ReactNode;
}

export function RedesignLayout({ children }: RedesignLayoutProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const location = useLocation();
  const { userProfile } = useAuth();
  const { mode, toggleMode } = useTheme();
  
  const orgId = userProfile?.organizationId;
  const [org, setOrg] = React.useState<Organization | null>(null);

  React.useEffect(() => {
    if (!orgId) {
      setOrg(null);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'organizations', orgId),
      (snap) => {
        if (snap.exists()) {
          setOrg({ ...snap.data(), id: snap.id } as Organization);
        } else {
          setOrg(null);
        }
      },
      (err) => {
        console.error('Failed to load organization in Layout:', err);
        setOrg(null);
      }
    );
    return unsub;
  }, [orgId]);
  const {
    notifications,
    archivedNotifications,
    unreadCount,
    markRead,
    markUnread,
    archive,
    archiveAllRead,
    archiveAll,
    markAllAsRead,
    activeToasts,
    dismissToast,
  } = useNotifications(orgId);
  const [hasNewUnread, setHasNewUnread] = React.useState(false);

  React.useEffect(() => {
    if (unreadCount > 0 && !notifOpen) {
      setHasNewUnread(true);
    }
  }, [unreadCount]);

  React.useEffect(() => {
    if (notifOpen) {
      setHasNewUnread(false);
    }
  }, [notifOpen]);

  const isLight = mode === 'light';
  const toggleTheme = toggleMode;

  // Command + K Search Bind
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="aether-app-container flex min-h-screen w-full overflow-hidden select-none print:min-h-0 print:h-auto print:overflow-visible">
      {/* PWA State Managers */}
      <div className="print:hidden">
        <OfflineIndicator />
        <PwaInstallPrompt />
      </div>

      {/* 1. Shifting Aurora Mesh Layer in the Background */}
      <div className="aether-aurora print:hidden" />

      {/* 2. Floating macOS Navigation Command Dock */}
      <div className="print:hidden">
        <NavDock />
      </div>

      {/* 3. Main Workspace Container */}
      <div className="flex-1 flex flex-col min-w-0 pl-[120px] pr-6 py-5 z-10 overflow-hidden relative h-screen print:pl-0 print:pr-0 print:py-0 print:h-auto print:overflow-visible">
        
        {/* Top Spatial Control Nav - macOS Floating Window Titlebar Capsule */}
        <header className="flex h-14 w-full items-center justify-between gap-4 mb-4 z-30 shrink-0 px-6 aether-glass shadow-xl border border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/20 print:hidden" style={{ borderRadius: '24px' }}>
          {/* Organization Logo & Workspace Section Title */}
          <div className="flex items-center gap-3 min-w-0">
            {org ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-[10px] border border-white/10 relative overflow-hidden shrink-0 shadow-sm"
                  style={!org.photoURL ? {
                    background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
                  } : undefined}
                >
                  {org.photoURL ? (
                    <img src={org.photoURL} alt={org.name} className="h-full w-full object-cover" />
                  ) : (
                    org.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'O'
                  )}
                </div>
                <span className="text-sm font-black text-foreground truncate select-none">
                  {org.name}
                </span>
              </div>
            ) : (
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest animate-pulse">
                Loading...
              </span>
            )}
            <div className="h-4 w-[1px] bg-white/10 shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-none truncate capitalize">
              {location.pathname === '/' ? 'Workspace Control' : location.pathname.split('/')[2] || location.pathname.split('/')[1]}
            </span>
          </div>

          {/* Quick-Access Tools */}
          <div className="flex items-center gap-3">
            {/* Elegant Glass Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="aether-glass h-10 w-[220px] px-4 flex items-center justify-start gap-3 text-left transition-all duration-300 hover:bg-white/12 hover:border-white/20 active:scale-95 shadow-sm border border-white/5 bg-white/5 cursor-pointer"
              style={{ borderRadius: '16px' }}
            >
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground/80 flex-1 truncate">Search everything...</span>
              <span className="flex items-center gap-0.5 text-[9px] font-mono text-muted-foreground/60 border border-white/10 rounded px-1.5 py-0.5 bg-black/10 shrink-0">
                <Command className="w-2.5 h-2.5" />K
              </span>
            </button>

            {/* Notification Trigger bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`aether-glass h-10 w-10 flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all duration-300 shadow-md cursor-pointer border border-white/5 bg-white/5 ${
                  notifOpen ? 'bg-white/12 border-white/25 scale-105' : ''
                }`}
                style={{ borderRadius: '16px' }}
              >
                <Bell className="w-4 h-4 text-foreground/80" />
                {hasNewUnread && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                  </span>
                )}
              </button>

              <NotificationPanel
                notifications={notifications}
                archivedNotifications={archivedNotifications}
                unreadCount={unreadCount}
                onMarkRead={markRead}
                onMarkUnread={markUnread}
                onArchive={archive}
                onArchiveAllRead={archiveAllRead}
                onArchiveAll={archiveAll}
                onMarkAllRead={markAllAsRead}
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
              />

              <AetherToasts
                activeToasts={activeToasts}
                onDismiss={dismissToast}
                onMarkRead={markRead}
              />
            </div>

            {/* Theme Toggle Slider */}
            <div className="flex items-center">
              <ThemeSlider />
            </div>
          </div>
        </header>

        {/* Scrollable Spatial Canvas */}
        <div className="flex-1 overflow-hidden relative rounded-3xl w-full print:overflow-visible print:rounded-none">
          <main className="absolute inset-0 overflow-y-auto aether-scroll pr-2 pb-6 print:relative print:overflow-visible print:p-0 print:h-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Search overlay component */}
      <div className="print:hidden">
        <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </div>
  );
}
