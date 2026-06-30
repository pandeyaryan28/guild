import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  FileCheck, 
  Users, 
  Settings, 
  Calendar, 
  BarChart3, 
  Palette, 
  LogOut,
  Trello
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useUnreadChatCount } from '../../hooks/useChat';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';

export function NavDock() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, logout } = useAuth();
  const { themeId, setTheme, themes } = useTheme();
  const unreadChatCount = useUnreadChatCount(userProfile?.organizationId);
  const [showThemePicker, setShowThemePicker] = React.useState(false);
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
    { path: '/chat', label: 'Chat', icon: MessageSquare, badge: unreadChatCount > 0 ? unreadChatCount : undefined },
    { path: '/workspace', label: 'Workspace', icon: Trello },
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
      <div className="aether-dock aether-glass flex flex-col items-center gap-3 border border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/25 shadow-2xl" style={{ borderRadius: '32px' }}>
        {/* User Profile Bubble */}
        <div className="relative group cursor-pointer mb-2">
          <div 
            onClick={() => navigate('/settings')}
            className="w-11 h-11 rounded-full border-2 border-white/20 dark:border-white/10 flex items-center justify-center font-bold text-xs text-white hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg"
            style={!userProfile?.photoURL ? {
              background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
            } : undefined}
          >
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt={userProfile.fullName || 'User'} className="h-full w-full object-cover rounded-full" />
            ) : (
              userProfile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'
            )}
          </div>
          <div className="aether-dock-item-tooltip font-bold tracking-tight">
            {userProfile?.fullName || 'Your Profile'}
          </div>
        </div>

        <div className="w-8 h-[1px] bg-white/10 mb-2" />

        {/* Core Nav Items */}
        <div className="flex flex-col gap-2 relative">
          {navItems.map((item) => {
            const ActiveIcon = item.icon;
            const isActive = isPathActive(item.path);

            return (
              <div
                key={item.path}
                id={`tour-nav-${item.label.toLowerCase()}`}
                onClick={() => navigate(item.path)}
                className={cn(
                  "aether-dock-item relative cursor-pointer",
                  isActive ? "" : "text-foreground/75 hover:text-foreground"
                )}
                style={isActive ? { color: 'var(--accent-foreground)' } : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-dock-indicator"
                    className="absolute inset-0 rounded-2xl shadow-[0_4px_16px_oklch(from_var(--accent)_l_c_h_/_25%)] z-0"
                    style={{ backgroundColor: 'var(--accent)' }}
                    transition={{ type: "spring", stiffness: 130, damping: 15 }}
                  />
                )}
                
                <span className="relative z-10 flex items-center justify-center">
                  <ActiveIcon className="w-5 h-5" />
                </span>
                
                {/* Floating Badge (e.g. Chat alerts) */}
                {item.badge !== undefined && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 z-20">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                  </span>
                )}

                <div className="aether-dock-item-tooltip font-bold tracking-tight">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="w-8 h-[1px] bg-white/10 my-2" />

        {/* Theme Toggler Palette Icon */}
        <div ref={themePickerRef} className="aether-dock-item-wrapper">
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            className={`aether-dock-item hover:scale-110 active:scale-95 transition-all duration-300 relative ${showThemePicker ? 'text-primary' : ''}`}
          >
            <Palette className="w-5 h-5 relative z-10" />
            <div className="aether-dock-item-tooltip font-bold tracking-tight">Canvas Themes</div>
          </button>

          {/* Frosted Glass Theme Selection Popover */}
          <AnimatePresence>
            {showThemePicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                className="aether-dock-popover aether-glass p-4 shadow-2xl flex flex-col gap-3.5 border border-white/10 dark:border-white/5 bg-surface/90 dark:bg-surface/85"
                style={{ borderRadius: '20px' }}
              >
                <div className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase pb-1 border-b border-white/10">
                  Canvas Themes
                </div>
                <div className="grid grid-cols-4 gap-2.5 pt-1">
                  {themes.filter(t => t.id !== 'light').map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      title={t.name}
                      className={`h-8 w-8 rounded-xl border-2 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 relative ${
                        themeId === t.id ? 'border-primary shadow-lg shadow-primary/25' : 'border-white/10 hover:border-white/30'
                      }`}
                      style={{ background: t.swatch }}
                    >
                      {themeId === t.id && (
                        <div className="h-2 w-2 rounded-full bg-white shadow-md animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Exit/Logout Action */}
        <div 
          onClick={logout}
          className="aether-dock-item text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-all duration-300"
        >
          <LogOut className="w-5 h-5" />
          <div className="aether-dock-item-tooltip font-bold tracking-tight">Log Out</div>
        </div>
      </div>
    </div>
  );
}
