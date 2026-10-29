import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { NavDock } from './NavDock';
import { GlobalSearch } from '../GlobalSearch';
import { TourGuide } from '../TourGuide';
import { Search, Bell, Command } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { cn } from '@/lib/utils';
import { NotificationPanel } from '../NotificationPanel';
import { AetherToasts } from '../AetherToasts';
import { ThemeSlider } from '../ThemeSlider';
import { OfflineIndicator } from '../pwa/OfflineIndicator';
import { PwaInstallPrompt } from '../pwa/PwaInstallPrompt';
import { useWorkspaceData } from '../../context/WorkspaceDataContext';

interface RedesignLayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
  fullBleed?: boolean;
}

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Workspace Overview',
  '/chat': 'Team Chat',
  '/workspace': 'Execution Workspace',
  '/studio': 'Studio & Docs',
  '/requests': 'Operational Requests',
  '/people': 'People & Directory',
  '/calendar': 'Schedule & Calendar',
  '/reports': 'Analytics & Reports',
  '/settings': 'Workspace Settings',
};

export function RedesignLayout({
  children,
  hideHeader: propHideHeader,
  fullBleed: propFullBleed,
}: RedesignLayoutProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(() => {
    return localStorage.getItem('guild-sidebar-collapsed') === 'true';
  });

  const location = useLocation();
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const workspaceData = useWorkspaceData();
  const org = workspaceData?.org ?? null;
  const { projects } = useProjects(orgId);

  const handleToggleSidebar = React.useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('guild-sidebar-collapsed', String(next));
      return next;
    });
  }, []);

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
    } else if (unreadCount === 0) {
      setHasNewUnread(false);
    }
  }, [unreadCount, notifOpen]);

  React.useEffect(() => {
    if (notifOpen) {
      setHasNewUnread(false);
    }
  }, [notifOpen]);

  // Command + K Search Bind
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const sectionTitle = React.useMemo(() => {
    if (ROUTE_TITLES[location.pathname]) {
      return ROUTE_TITLES[location.pathname];
    }
    if (location.pathname.startsWith('/projects/')) {
      const projectId = location.pathname.split('/')[2];
      const matched = projects.find((p) => p.id === projectId);
      return matched ? matched.name : 'Project Detail';
    }
    if (location.pathname.startsWith('/chat')) {
      return 'Team Chat';
    }
    const firstSeg = location.pathname.split('/')[1] || 'Overview';
    return firstSeg.charAt(0).toUpperCase() + firstSeg.slice(1);
  }, [location.pathname, projects]);

  const isChatPage = location.pathname.startsWith('/chat');
  const hideHeader = propHideHeader ?? isChatPage;
  const fullBleed = propFullBleed ?? isChatPage;

  return (
    <div className="aether-app-container flex h-screen w-full overflow-hidden bg-background text-foreground print:min-h-0 print:h-auto print:overflow-visible">
      {/* PWA State Managers */}
      <div className="print:hidden">
        <OfflineIndicator />
        <PwaInstallPrompt />
      </div>

      {/* Primary Sidebar Navigation */}
      <div className="print:hidden">
        <NavDock
          org={org}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      </div>

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 z-10 overflow-hidden relative h-screen print:p-0 print:h-auto print:overflow-visible">
        {/* Top Workspace Header */}
        {!hideHeader && (
          <header className="flex h-14 w-full items-center justify-between gap-4 border-b border-border bg-surface/85 dark:bg-surface/75 backdrop-blur-xl px-6 z-30 shrink-0 print:hidden">
            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate">
                {sectionTitle}
              </h1>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2.5">
              {/* Command Palette / Search Button */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex h-9 w-[220px] items-center justify-between gap-2 rounded-xl border border-border bg-secondary/60 px-3 text-left text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-[0.98] cursor-pointer"
              >
                <span className="flex items-center gap-2 truncate">
                  <Search className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Search or jump to…</span>
                </span>
                <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shrink-0">
                  <Command className="h-2.5 w-2.5" />K
                </kbd>
              </button>

              {/* Notification Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen(!notifOpen)}
                  aria-label="Notifications"
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary/60 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-[0.98] relative cursor-pointer',
                    notifOpen && 'bg-secondary text-foreground border-border-strong',
                  )}
                >
                  <Bell className="h-4 w-4" />
                  {(hasNewUnread || unreadCount > 0) && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-surface" />
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

              {/* Theme Dimmer Slider */}
              <div className="flex items-center">
                <ThemeSlider />
              </div>
            </div>
          </header>
        )}

        {/* Scrollable Workspace Content */}
        <div className="flex-1 overflow-hidden relative w-full print:overflow-visible">
          <main
            className={cn(
              'absolute inset-0 overflow-y-auto aether-scroll print:relative print:overflow-visible print:p-0 print:h-auto',
              fullBleed ? 'p-0' : 'p-6',
            )}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Global Search / Command Palette & Tour Guide */}
      <div className="print:hidden">
        <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
        <TourGuide />
      </div>
    </div>
  );
}
