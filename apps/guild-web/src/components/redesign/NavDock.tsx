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
  Trello
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
    { path: '/requests', label: 'Requests', icon: FileCheck },
    { path: '/people', label: 'People', icon: Users },
    { path: '/calendar', label: 'Calendar', icon: Calendar, className: 'hidden md:flex' },
    { path: '/reports', label: 'Reports', icon: BarChart3, className: 'hidden md:flex' },
    { path: '/settings', label: 'Settings', icon: Settings, className: 'hidden md:flex' },
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
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}

              <div className="aether-dock-item-tooltip">
                {item.label}
              </div>
            </div>
          );
        })}

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
    </div>
  );
}
