import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { RedesignTopHeader } from '../navigation/RedesignTopHeader';
import { GlobalSearch } from '../GlobalSearch';
import { TourGuide } from '../TourGuide';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '@/lib/utils';
import { AetherToasts } from '../AetherToasts';
import { OfflineIndicator } from '../pwa/OfflineIndicator';
import { PwaInstallPrompt } from '../pwa/PwaInstallPrompt';
import { useWorkspaceData } from '../../context/WorkspaceDataContext';
import { MemberProfileDrawer } from '../MemberProfileDrawer';
import { ThemePickerModal } from '../ThemePickerModal';

export interface RedesignLayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
  fullBleed?: boolean;
}

export function RedesignLayout({
  children,
  hideHeader: propHideHeader,
  fullBleed: propFullBleed,
}: RedesignLayoutProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = React.useState(false);
  const [themePickerOpen, setThemePickerOpen] = React.useState(false);

  const location = useLocation();
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const workspaceData = useWorkspaceData();
  const org = workspaceData?.org ?? null;
  const allTasks = workspaceData?.allTasks ?? [];
  const teams = workspaceData?.teams ?? [];
  const members = workspaceData?.members ?? [];

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

  // Command + K Search Keybind
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

  const isChatPage = location.pathname.startsWith('/chat');
  // RedesignTopHeader is the primary global navigation (replacing the legacy NavDock sidebar).
  // In legacy views, ChatLayout passed hideHeader={true} to hide the old duplicate title bar.
  // We keep RedesignTopHeader active on Chat so navigation remains seamlessly accessible.
  const hideTopHeader = propHideHeader === true && !isChatPage;
  const fullBleed = propFullBleed ?? isChatPage;

  return (
    <div className="aether-app-container flex flex-col h-screen w-full overflow-hidden bg-background text-foreground print:min-h-0 print:h-auto print:overflow-visible selection:bg-primary/20 selection:text-foreground">
      {/* PWA State Managers */}
      <div className="print:hidden">
        <OfflineIndicator />
        <PwaInstallPrompt />
      </div>

      {/* Global Apple SwiftUI Top Header */}
      {!hideTopHeader && (
        <RedesignTopHeader
          org={org}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenProfile={() => setProfileDrawerOpen(true)}
          onOpenThemePicker={() => setThemePickerOpen(true)}
          notifOpen={notifOpen}
          onToggleNotifications={() => setNotifOpen((v) => !v)}
          notifications={notifications}
          archivedNotifications={archivedNotifications}
          unreadCount={unreadCount}
          onMarkRead={markRead}
          onMarkUnread={markUnread}
          onArchive={archive}
          onArchiveAllRead={archiveAllRead}
          onArchiveAll={archiveAll}
          onMarkAllRead={markAllAsRead}
          onCloseNotifications={() => setNotifOpen(false)}
        />
      )}

      {/* Main Workspace Column — Full horizontal width, zero leftover sidebar margin */}
      <div className="flex-1 flex flex-col min-w-0 z-10 overflow-hidden relative w-full h-full print:p-0 print:h-auto print:overflow-visible">
        <main
          className={cn(
            'flex-1 w-full overflow-y-auto aether-scroll relative print:relative print:overflow-visible print:p-0 print:h-auto',
            fullBleed ? 'p-0' : 'p-4 sm:p-6',
          )}
        >
          {children}
        </main>
      </div>

      {/* Aether Toast Notifications */}
      <AetherToasts
        activeToasts={activeToasts}
        onDismiss={dismissToast}
        onMarkRead={markRead}
      />

      {/* Global Search / Command Palette & Tour Guide */}
      <div className="print:hidden">
        <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
        <TourGuide />
      </div>

      {/* User Profile Drawer */}
      {profileDrawerOpen && (
        <MemberProfileDrawer
          isOpen={profileDrawerOpen}
          member={userProfile}
          onClose={() => setProfileDrawerOpen(false)}
          tasks={allTasks}
          teams={teams}
          members={members}
        />
      )}

      {/* Theme Picker Modal */}
      {themePickerOpen && (
        <ThemePickerModal onClose={() => setThemePickerOpen(false)} />
      )}
    </div>
  );
}
