import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, User, Palette } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { MobileNavDock } from './MobileNavDock';
import { GlobalSearch } from '../GlobalSearch';
import { NotificationPanel } from '../NotificationPanel';
import { ThemeSlider } from '../ThemeSlider';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';

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
  
  const orgId = userProfile?.organizationId;
  const { notifications, unreadCount, markRead, markAllAsRead } = useNotifications(orgId);

  // Set page headers
  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/chat')) return 'Chat Spaces';
    if (path === '/workspace') return 'Workspace';
    if (path === '/goals-board') return 'Goals & Vision';
    if (path === '/requests') return 'Approvals';
    if (path === '/settings') return 'Settings';
    if (path === '/people') return 'Team';
    if (path === '/calendar') return 'Calendar';
    if (path === '/reports') return 'Reports';
    return 'Guild';
  };

  return (
    <div className="aether-app-container flex flex-col h-[100dvh] w-full overflow-hidden select-none bg-background relative">
      {/* 1. Shifting Aurora Mesh Layer */}
      <div className="aether-aurora" />

      {/* 2. Top Spatial mobile control bar */}
      <header className="flex h-14 w-full items-center justify-between px-5 shrink-0 z-30 border-b border-white/5 bg-surface/40 backdrop-blur-md">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <span 
            className="text-sm font-black tracking-widest text-gradient uppercase bg-gradient-to-r from-violet-500 to-indigo-500"
          >
            Guild
          </span>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-80 border-l border-white/10 pl-2">
            {getHeaderTitle()}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-3.5">
          {/* Elegant search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="h-8 w-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-foreground/80 hover:text-foreground active:scale-90 transition-all cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className={cn(
                "h-8 w-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-foreground/80 hover:text-foreground active:scale-90 transition-all cursor-pointer",
                notifOpen ? "bg-white/10" : ""
              )}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              )}
            </button>

            <NotificationPanel
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={markRead}
              onMarkAllRead={markAllAsRead}
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
            />
          </div>

          {/* Avatar Profile Trigger */}
          <div 
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[10px] text-white border border-white/20 dark:border-white/10 shadow-md active:scale-90 transition-all cursor-pointer"
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
        "flex-1 overflow-y-auto aether-scroll relative px-4 pt-4 z-10 scrollbar-hide",
        hideDock ? "pb-4" : "pb-[88px]" // Ensure bottom tab dock does not block content
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
