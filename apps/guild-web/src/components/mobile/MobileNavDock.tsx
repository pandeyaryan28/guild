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
  Palette
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { useUnreadChatCount } from '../../hooks/useChat';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';

export function MobileNavDock() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, logout } = useAuth();
  const { themeId, setTheme, themes } = useTheme();
  const { unreadCount } = useNotifications(userProfile?.organizationId);
  const unreadChatCount = useUnreadChatCount(userProfile?.organizationId);
  const [showMobileMore, setShowMobileMore] = React.useState(false);

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
      <div className="fixed bottom-4 left-4 right-4 z-40 select-none pointer-events-none flex justify-center">
        {/* Floating Bottom sheet tab bar */}
        <div 
          className="aether-glass py-2.5 px-4 flex items-center justify-between w-full max-w-md shadow-2xl pointer-events-auto bg-surface/80 dark:bg-surface/75 backdrop-blur-2xl border border-white/10"
          style={{ borderRadius: '24px' }}
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
                  isActive ? "" : "text-muted-foreground/80 hover:text-foreground"
                )}
                style={isActive ? { color: 'var(--accent-foreground)' } : undefined}
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
              "relative flex items-center justify-center w-12 h-12 rounded-xl transition-all cursor-pointer text-muted-foreground/80 hover:text-foreground"
            )}
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
              className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[200] pointer-events-auto"
            />
            
            {/* Sliding frosted bottom sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md h-[70vh] min-h-[500px] max-h-[85vh] aether-glass rounded-t-[32px] border-x-0 border-b-0 border-t border-white/10 px-6 pb-8 pt-2 z-[210] shadow-2xl flex flex-col pointer-events-auto overflow-hidden bg-surface/95 dark:bg-surface/90 backdrop-blur-3xl"
            >
              {/* Drag Handle Indicator */}
              <div className="aether-mobile-handle shrink-0 bg-white/10 w-10 h-1.5 rounded-full mx-auto my-3" />
              
              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto aether-scroll space-y-6 pb-6 pr-1 animate-fluid-pop">
                {/* User Profile Header Card */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-inner">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div 
                      className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-xs text-white border-2 border-white/20 dark:border-white/5 shadow-md shrink-0 select-none"
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
                      <span className="text-[9px] font-bold text-text-muted capitalize block mt-1 tracking-wider">
                        {userProfile?.role || 'member'} • Active Session
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
                    Canvas Theme Customization
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
    </>
  );
}
