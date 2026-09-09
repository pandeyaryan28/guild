import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Trello, 
  FileCheck, 
  Menu,
  X,
  Users,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Palette,
  Sun,
  Moon,
  Zap,
  ZapOff
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { useUnreadChatCount } from '../../hooks/useChat';
import { updateUserProfile } from '../../lib/firestore';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';

export function MobileNavDock() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, logout } = useAuth();
  const { themeId, setTheme, themes, mode, setMode, toggleMode } = useTheme();
  const { unreadCount } = useNotifications(userProfile?.organizationId);
  const unreadChatCount = useUnreadChatCount(userProfile?.organizationId);
  const [showMobileMore, setShowMobileMore] = React.useState(false);

  // Availability status (Focus / Flight mode toggle)
  const isFocusMode = userProfile?.availabilityStatus === 'focus';
  const handleToggleFocus = async () => {
    if (!userProfile?.uid) return;
    const nextStatus = isFocusMode ? 'active' : 'focus';
    try {
      await updateUserProfile(userProfile.uid, { availabilityStatus: nextStatus });
    } catch (err) {
      console.error('Failed to toggle focus mode:', err);
    }
  };

  const mainNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/chat', label: 'Chat', icon: MessageSquare, badge: unreadChatCount > 0 ? unreadChatCount : undefined },
    { path: '/workspace', label: 'Workspace', icon: Trello },
    { path: '/requests', label: 'Approvals', icon: FileCheck },
  ];

  const secondaryNavLinks = [
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

  const initials = userProfile?.fullName
    ? userProfile.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 select-none pointer-events-none flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
        {/* Floating Bottom sheet tab bar */}
        <div 
          className="aether-glass py-2 px-3 sm:px-4 flex items-center justify-between w-full max-w-md shadow-2xl pointer-events-auto bg-surface/92 dark:bg-surface/85 backdrop-blur-2xl border border-border/80 dark:border-border-strong rounded-3xl"
        >
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isPathActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all cursor-pointer",
                  isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
                style={isActive ? { color: 'var(--accent-foreground)' } : undefined}
                title={item.label}
              >
                {/* Highlight background blob */}
                {isActive && (
                  <motion.div 
                    layoutId="mobileActiveTab"
                    className="absolute inset-0 bg-primary rounded-xl shadow-lg shadow-primary/20 z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}

                <span className="relative z-10 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}

          {/* Menu More Drawer Switcher (Mobile Menu tab) */}
          <button
            onClick={() => setShowMobileMore(true)}
            className={cn(
              "relative flex items-center justify-center w-12 h-12 rounded-xl transition-all cursor-pointer text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
            title="More Options"
          >
            <Menu className="w-5 h-5" />
            {unreadCount > 0 && !mainNavItems.some(i => i.path === '/chat' && i.badge !== undefined) && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Premium responsive bottom sheet panel for extra links */}
      <AnimatePresence>
        {showMobileMore && (
          <>
            {/* Dark glass backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMore(false)}
              className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs z-[200] pointer-events-auto"
            />
            
            {/* Sliding frosted bottom sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md h-[72vh] min-h-[500px] max-h-[85vh] aether-glass rounded-t-[32px] border-x-0 border-b-0 border-t border-border/80 px-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-2 z-[210] shadow-2xl flex flex-col pointer-events-auto overflow-hidden bg-surface/98 dark:bg-surface/95 backdrop-blur-3xl"
            >
              {/* Drag Handle Indicator */}
              <div className="aether-mobile-handle shrink-0 bg-muted-foreground/25 w-10 h-1.5 rounded-full mx-auto my-3" />
              
              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto aether-scroll space-y-6 pb-6 pr-1 animate-fluid-pop">
                {/* User Profile Header Card */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/50 border border-border shadow-xs">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div 
                      className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-xs text-white border-2 border-border-default/40 shadow-sm shrink-0 select-none"
                      style={{
                        background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
                      }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-foreground block truncate leading-none">
                        {userProfile?.fullName || 'Guild User'}
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground capitalize block mt-1 tracking-wider">
                        {userProfile?.role || 'member'} • Active Session
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowMobileMore(false)}
                    className="h-8 w-8 rounded-full border border-border bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Secondary navigation items menu list */}
                <div className="space-y-1">
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 px-2 pb-1.5 select-none">
                    More Spaces & Pages
                  </div>
                  {secondaryNavLinks.map((item) => {
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
                            ? "bg-primary border-primary/30 text-white shadow-md shadow-primary/20"
                            : "bg-secondary/40 border-border text-foreground hover:bg-secondary/80"
                        )}
                      >
                        <Icon className="w-4.5 h-4.5 shrink-0" />
                        <span className="flex-1 tracking-wide">{item.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                      </div>
                    );
                  })}
                </div>
                
                {/* Flight / Focus Mode Direct Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/50 border border-border shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-all",
                      isFocusMode 
                        ? "bg-red-500/10 border-red-500/30 text-red-500 dark:text-red-400" 
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    )}>
                      {isFocusMode ? <ZapOff className="w-4.5 h-4.5" /> : <Zap className="w-4.5 h-4.5" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-foreground block">
                        Focus Mode (Flight Mode)
                      </span>
                      <span className="text-[9px] font-semibold text-muted-foreground block mt-0.5">
                        {isFocusMode ? 'Do Not Disturb · Notifications Silenced' : 'Normal Availability · Notifications Active'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleFocus}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer",
                      isFocusMode
                        ? "bg-red-500 text-white border-red-600 shadow-sm"
                        : "bg-secondary text-foreground border-border hover:bg-secondary/80"
                    )}
                  >
                    {isFocusMode ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Appearance & Atmosphere (Light / Dark Mode) */}
                <div className="space-y-2.5">
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 px-2 select-none">
                    Appearance & Themes
                  </div>

                  {/* Light vs Dark segmented buttons */}
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-secondary/60 border border-border">
                    <button
                      onClick={() => setMode('light')}
                      className={cn(
                        "flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer",
                        mode === 'light'
                          ? "bg-surface text-foreground shadow-sm border border-border/80"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Light Mode</span>
                    </button>
                    <button
                      onClick={() => setMode('dark')}
                      className={cn(
                        "flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer",
                        mode === 'dark'
                          ? "bg-surface text-foreground shadow-sm border border-border/80"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Moon className="w-4 h-4 text-indigo-400" />
                      <span>Dark Mode</span>
                    </button>
                  </div>

                  {/* Responsive Theme selector swatch palette */}
                  <div className="grid grid-cols-4 gap-2.5 px-1 pt-1">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        title={t.name}
                        className={`h-9 rounded-xl border-2 flex items-center justify-center hover:scale-[1.02] active:scale-98 transition-all relative ${
                          themeId === t.id ? 'border-primary shadow-lg shadow-primary/25' : 'border-border hover:border-primary/40'
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
                
                {/* Active logout trigger */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowMobileMore(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/30 text-red-500 dark:text-red-400 py-3.5 text-xs font-black tracking-widest transition-all active:scale-98 cursor-pointer shadow-lg shadow-red-500/5 select-none"
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
    </>
  );
}
