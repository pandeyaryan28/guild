import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { NavDock } from './NavDock';
import { GlobalSearch } from '../GlobalSearch';
import { Search, Bell, Command, Sun, Moon } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { NotificationPanel } from '../NotificationPanel';
import { cn } from '@/lib/utils';

interface RedesignLayoutProps {
  children: React.ReactNode;
}

export function RedesignLayout({ children }: RedesignLayoutProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const location = useLocation();
  const { userProfile } = useAuth();
  const { themeId, setTheme } = useTheme();
  
  const orgId = userProfile?.organizationId;
  const { notifications, unreadCount, markRead, markAllAsRead } = useNotifications(orgId);

  const isLight = themeId === 'light';
  const toggleTheme = () => setTheme(isLight ? 'midnight' : 'light');

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
    <div className="aether-app-container flex min-h-screen w-full overflow-hidden select-none bg-background">
      {/* 1. Shifting Aurora Mesh Layer in the Background */}
      <div className="aether-aurora" />

      {/* 2. Floating macOS Navigation Command Dock */}
      <NavDock />

      {/* 3. Main Workspace Container */}
      <div className="flex-1 flex flex-col min-w-0 pl-4 pr-4 pt-4 pb-24 md:pl-[96px] md:pr-6 md:py-5 z-10 overflow-hidden relative h-screen">
        
        {/* Top Spatial Control Nav */}
        <header className="flex h-10 w-full items-center justify-between gap-4 mb-4 z-30 shrink-0">
          {/* Logo & Section Title */}
          <div className="flex items-center gap-3">
            <span 
              className="text-lg font-black tracking-tight text-gradient uppercase bg-gradient-to-r from-violet-500 to-indigo-500"
              style={{ letterSpacing: '0.1em' }}
            >
              Guild
            </span>
            <div className="h-4 w-[1px] bg-white/10" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {location.pathname === '/' ? 'Workspace Control' : location.pathname.split('/')[1]}
            </span>
          </div>

          {/* Quick-Access Tools */}
          <div className="flex items-center gap-3">
            {/* Elegant Glass Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="aether-glass px-4 py-2 flex items-center gap-3 text-left transition-all hover:bg-white/10 hover:border-white/20 active:scale-98 shadow-sm"
              style={{ borderRadius: '14px', width: '220px' }}
            >
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground/80 flex-1 truncate">Search...</span>
              <span className="flex items-center gap-0.5 text-[9px] font-mono text-muted-foreground/60 border border-white/10 rounded px-1 py-0.2 shrink-0">
                <Command className="w-2.5 h-2.5" />K
              </span>
            </button>

            {/* Notification Trigger bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`aether-glass h-10 w-10 flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all shadow-sm ${
                  notifOpen ? 'bg-white/10 border-white/20' : ''
                }`}
                style={{ borderRadius: '14px' }}
              >
                <Bell className="w-4 h-4 text-foreground/80" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
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

            {/* Quick theme toggler for visual contrast */}
            <button
              onClick={toggleTheme}
              className="aether-glass h-10 w-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm"
              style={{ borderRadius: '14px' }}
              title={isLight ? 'Activate Cosmic Theme' : 'Activate Light Theme'}
            >
              {isLight ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>
          </div>
        </header>

        {/* Scrollable Spatial Canvas */}
        <div className="flex-1 overflow-hidden relative rounded-2xl w-full">
          <main className="absolute inset-0 overflow-y-auto aether-scroll pr-2 pb-6">
            {children}
          </main>
        </div>
      </div>

      {/* Search overlay component */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
