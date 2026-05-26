import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  CheckSquare, 
  FileCheck, 
  Users, 
  Settings, 
  Calendar, 
  BarChart3, 
  Palette, 
  LogOut,
  Trello,
  Menu,
  ChevronRight,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';

export function NavDock() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, logout } = useAuth();
  const { themeId, setTheme, themes } = useTheme();
  const { unreadCount } = useNotifications(userProfile?.organizationId);
  const [showThemePicker, setShowThemePicker] = React.useState(false);
  const [showMobileMore, setShowMobileMore] = React.useState(false);
  const themePickerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themePickerRef.current && !themePickerRef.current.contains(event.target as Node)) {
        setShowThemePicker(false);
      }
    }
    if (showThemePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showThemePicker]);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/chat', label: 'Chat', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : undefined },
    { path: '/workspace', label: 'Workspace', icon: Trello },
    { path: '/tasks', label: 'Tasks & Goals', icon: CheckSquare },
    { path: '/requests', label: 'Requests', icon: FileCheck, className: 'hidden md:flex' },
    { path: '/people', label: 'People', icon: Users, className: 'hidden md:flex' },
    { path: '/calendar', label: 'Calendar', icon: Calendar, className: 'hidden md:flex' },
    { path: '/reports', label: 'Reports', icon: BarChart3, className: 'hidden md:flex' },
    { path: '/settings', label: 'Settings', icon: Settings, className: 'hidden md:flex' },
  ];

  const secondaryLinks = [
    { path: '/requests', label: 'Requests', icon: FileCheck },
    { path: '/people', label: 'People', icon: Users },
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const currentPath = location.pathname;
  const isPathActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <div className="aether-dock-wrapper select-none">
      <div className="aether-dock aether-glass flex flex-row md:flex-col items-center gap-2 md:gap-3">
        {/* User Profile Bubble - Hidden on mobile bottom tab bar */}
        <div className="relative group cursor-pointer mb-2 hidden md:block">
          <div 
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-indigo-500/10 border-2 border-white/20 dark:border-white/5 flex items-center justify-center font-bold text-xs text-white hover:scale-105 active:scale-95 transition-all shadow-md"
            style={{
              background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
            }}
          >
            {userProfile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="aether-dock-item-tooltip">
            {userProfile?.fullName || 'Your Profile'}
          </div>
        </div>

        <div className="w-8 h-[1px] bg-white/10 mb-2 hidden md:block" />

        {/* Core Nav Items */}
        {navItems.map((item) => {
          const ActiveIcon = item.icon;
          const isActive = isPathActive(item.path);

          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(`aether-dock-item ${isActive ? 'active' : ''}`, item.className)}
            >
              <ActiveIcon className="w-5 h-5" />
              
              {/* Floating Badge (e.g. Chat alerts) */}
              {item.badge !== undefined && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              )}

              <div className="aether-dock-item-tooltip">
                {item.label}
              </div>
            </div>
          );
        })}

        {/* More Button (Mobile only) */}
        <div
          onClick={() => setShowMobileMore(true)}
          className="aether-dock-item aether-dock-item-menu flex md:hidden hover:scale-110 active:scale-95 transition-all text-text-secondary items-center justify-center relative cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
          )}
        </div>

        <div className="w-8 h-[1px] bg-white/10 my-2 hidden md:block" />

        {/* Theme Toggler Palette Icon - Hidden on mobile */}
        <div ref={themePickerRef} className="relative hidden md:block">
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            className={`aether-dock-item hover:scale-110 transition-all ${showThemePicker ? 'text-primary' : ''}`}
          >
            <Palette className="w-5 h-5" />
            <div className="aether-dock-item-tooltip">Canvas Themes</div>
          </button>

          {/* Frosted Glass Theme Selection Popover */}
          <AnimatePresence>
            {showThemePicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                className="absolute left-16 bottom-0 aether-glass p-3 shadow-2xl z-50 flex flex-col gap-2 min-w-[200px]"
              >
                <div className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase pb-1 border-b border-white/10">
                  Canvas Themes
                </div>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {themes.filter(t => t.id !== 'light').map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      title={t.name}
                      className={`h-7 w-7 rounded-lg border-2 flex items-center justify-center hover:scale-110 active:scale-95 transition-all relative ${
                        themeId === t.id ? 'border-primary shadow-lg shadow-primary/25' : 'border-white/10 hover:border-white/30'
                      }`}
                      style={{ background: t.swatch }}
                    >
                      {themeId === t.id && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Exit/Logout Action - Hidden on mobile */}
        <div 
          onClick={logout}
          className="aether-dock-item text-red-400/80 hover:text-red-400 hover:bg-red-500/10 cursor-pointer hidden md:block"
        >
          <LogOut className="w-5 h-5" />
          <div className="aether-dock-item-tooltip">Log Out</div>
        </div>
      </div>

      {/* Premium mobile drawer for extra links & user cockpit details */}
      <AnimatePresence>
        {showMobileMore && (
          <>
            {/* Dark glass backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMore(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[200] pointer-events-auto"
            />
            
            {/* Sliding frosted bottom sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] aether-glass rounded-t-[32px] border-x-0 border-b-0 border-t border-white/10 px-6 pb-8 pt-2 z-[210] shadow-2xl flex flex-col pointer-events-auto overflow-hidden bg-surface/95 dark:bg-surface/90 backdrop-blur-3xl"
            >
              {/* Drag Handle Indicator */}
              <div className="aether-mobile-handle shrink-0" />
              
              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto aether-scroll space-y-6 pb-6 pr-1">
                {/* User Profile Header Card */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-inner">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div 
                      className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-xs text-white border-2 border-white/20 dark:border-white/5 shadow-md shrink-0 select-none"
                      style={{
                        background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
                      }}
                    >
                      {userProfile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-foreground block truncate leading-none">
                        {userProfile?.fullName || 'Guild User'}
                      </span>
                      <span className="text-[9px] font-bold text-text-muted capitalize block mt-1 tracking-wider">
                        {userProfile?.role || 'member'} • Premium Status
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowMobileMore(false)}
                    className="h-8 w-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Secondary navigation items menu list */}
                <div className="space-y-1">
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 pb-1.5 select-none">
                    Navigate Directory
                  </div>
                  {secondaryLinks.map((item) => {
                    const Icon = item.icon;
                    const active = isPathActive(item.path);
                    return (
                      <div
                        key={item.path}
                        onClick={() => {
                          setShowMobileMore(false);
                          navigate(item.path);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3.5 rounded-xl px-4 py-3 text-xs font-bold transition-all border select-none cursor-pointer",
                          active
                            ? "bg-primary border-primary/20 text-white shadow-md shadow-primary/20"
                            : "bg-white/[0.02] border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                        )}
                      >
                        <Icon className="w-4.5 h-4.5 shrink-0" />
                        <span className="flex-1 tracking-wide">{item.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                      </div>
                    );
                  })}
                </div>
                
                {/* Responsive Theme selector swatch palette */}
                <div className="space-y-2.5">
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 select-none">
                    Cosmic Canvas Style
                  </div>
                  <div className="grid grid-cols-4 gap-2.5 px-1">
                    {themes.filter(t => t.id !== 'light').map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        title={t.name}
                        className={`h-9 rounded-xl border-2 flex items-center justify-center hover:scale-[1.02] active:scale-98 transition-all relative ${
                          themeId === t.id ? 'border-primary shadow-lg shadow-primary/25' : 'border-white/10 hover:border-white/30'
                        }`}
                        style={{ background: t.swatch }}
                      >
                        {themeId === t.id && (
                          <div className="h-1.5 w-1.5 rounded-full bg-white shadow-md animate-fluid-pop" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Crimson Glow active logout trigger */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowMobileMore(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/25 hover:border-red-500/40 text-red-400 py-3.5 text-xs font-black tracking-widest transition-all active:scale-98 cursor-pointer shadow-lg shadow-red-500/5 select-none"
                  >
                    <LogOut className="w-4.5 h-4.5 shrink-0" />
                    <span>LOG OUT SESSION</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
