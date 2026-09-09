import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, User, Palette, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { MobileNavDock } from './MobileNavDock';
import { GlobalSearch } from '../GlobalSearch';
import { NotificationPanel } from '../NotificationPanel';
import { AetherToasts } from '../AetherToasts';
import { ThemeSlider } from '../ThemeSlider';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { OfflineIndicator } from '../pwa/OfflineIndicator';
import { PwaInstallPrompt } from '../pwa/PwaInstallPrompt';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { type Organization } from '../../lib/firestore';

interface MobileLayoutProps {
  children: React.ReactNode;
  hideDock?: boolean; // Sometimes in chat detailed view we want full-screen screen real-estate
}

export function MobileLayout({ children, hideDock = false }: MobileLayoutProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
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
        console.error('Failed to load organization in MobileLayout:', err);
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

  // Set page headers
  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/chat')) return 'Chat Spaces';
    if (path === '/workspace') return 'Workspace';
    if (path === '/requests') return 'Approvals';
    if (path === '/settings') return 'Settings';
    if (path === '/people') return 'Team';
    if (path === '/calendar') return 'Calendar';
    if (path === '/reports') return 'Reports';
    return 'Guild';
  };

  return (
    <div className="aether-app-container flex flex-col h-[100dvh] max-h-[100dvh] h-[100svh] max-h-[100svh] w-full overflow-hidden bg-background relative">
      {/* PWA State Managers */}
      <OfflineIndicator />
      <PwaInstallPrompt />

      {/* 1. Shifting Aurora Mesh Layer */}
      <div className="aether-aurora" />

      {/* 2. Top Spatial mobile control bar */}
      <header className="flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] w-full items-center justify-between px-4 sm:px-5 shrink-0 z-30 border-b border-border/70 bg-surface/85 dark:bg-surface/60 backdrop-blur-xl">
        {/* Brand */}
        <div className="flex items-center gap-2 max-w-[55%] min-w-0">
          {org ? (
            <div className="flex items-center gap-2 min-w-0">
              <div 
                className="w-6 h-6 rounded-md flex items-center justify-center font-black text-white text-[9px] border border-border-default/40 relative overflow-hidden shrink-0 shadow-xs"
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
              <span className="text-xs font-black text-foreground truncate select-none">
                {org.name}
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest animate-pulse">
              Loading...
            </span>
          )}
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-70 border-l border-border/80 pl-2 shrink-0">
            {getHeaderTitle()}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleMode}
            className="h-8 w-8 rounded-full border border-border/80 bg-secondary/80 hover:bg-secondary flex items-center justify-center text-foreground/80 hover:text-foreground active:scale-90 transition-all cursor-pointer shadow-xs"
            title={`Switch to ${mode === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle Dark/Light Mode"
          >
            {mode === 'light' ? (
              <Moon className="w-4 h-4 text-indigo-500" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* Elegant search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="h-8 w-8 rounded-full border border-border/80 bg-secondary/80 hover:bg-secondary flex items-center justify-center text-foreground/80 hover:text-foreground active:scale-90 transition-all cursor-pointer shadow-xs"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className={cn(
                "h-8 w-8 rounded-full border border-border/80 bg-secondary/80 hover:bg-secondary flex items-center justify-center text-foreground/80 hover:text-foreground active:scale-90 transition-all cursor-pointer shadow-xs",
                notifOpen ? "bg-primary/15 text-primary border-primary/40" : ""
              )}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {hasNewUnread && (
                <span className="absolute top-0 right-0 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
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

          {/* Avatar Profile Trigger */}
          <div 
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[10px] text-white border border-border-default/40 shadow-sm active:scale-90 transition-all cursor-pointer"
            style={{
              background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
            }}
          >
            {userProfile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      {/* 3. Mobile Canvas View Area */}
      <main className={cn(
        "flex-1 overflow-y-auto aether-scroll relative px-3.5 sm:px-4 pt-3.5 sm:pt-4 z-10 scrollbar-hide",
        hideDock ? "pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]" : "pb-[calc(6rem+env(safe-area-inset-bottom,0px))]" // Ensure bottom tab dock does not block content
      )}>
        {children}
      </main>

      {/* 4. Sleek bottom menu bar dock */}
      {!hideDock && <MobileNavDock />}

      {/* Search overlay portal */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
