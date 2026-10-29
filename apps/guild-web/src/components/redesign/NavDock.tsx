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
  CheckSquare,
  Shield,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useUnreadChatCount } from '../../hooks/useChat';
import { useRequests } from '../../hooks/useRequests';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { type Organization } from '../../lib/firestore';

interface NavDockProps {
  org?: Organization | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function NavDock({ org, collapsed = false, onToggleCollapse }: NavDockProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, logout } = useAuth();
  const { themeId, setTheme, themes, mode, toggleMode } = useTheme();
  const unreadChatCount = useUnreadChatCount(userProfile?.organizationId);
  const { pendingCount: pendingRequestsCount } = useRequests(userProfile?.organizationId);
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
    { path: '/', id: 'tour-nav-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      path: '/chat',
      id: 'tour-nav-chat',
      label: 'Chat',
      icon: MessageSquare,
      badge: unreadChatCount > 0 ? unreadChatCount : undefined,
    },
    { path: '/workspace', id: 'tour-nav-workspace', label: 'Workspace', icon: CheckSquare },
    { path: '/studio', id: 'tour-nav-studio', label: 'Studio', icon: BookOpen },
    {
      path: '/requests',
      id: 'tour-nav-requests',
      label: 'Requests',
      icon: FileCheck,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
    },
    { path: '/calendar', id: 'tour-nav-calendar', label: 'Calendar', icon: Calendar },
    { path: '/people', id: 'tour-nav-people', label: 'People', icon: Users },
    { path: '/reports', id: 'tour-nav-reports', label: 'Reports', icon: BarChart3 },
    { path: '/settings', id: 'tour-nav-settings', label: 'Settings', icon: Settings },
  ];

  const currentPath = location.pathname;
  const isPathActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    if (path === '/workspace') return currentPath.startsWith('/workspace') || currentPath.startsWith('/projects');
    return currentPath.startsWith(path);
  };

  const orgInitials =
    org?.name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'G';

  const userInitials =
    userProfile?.fullName
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  return (
    <aside
      aria-label="Primary Workspace Navigation"
      className={cn(
        'flex h-screen flex-col border-r border-border bg-surface/95 dark:bg-surface/85 backdrop-blur-xl select-none shrink-0 z-40 transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
        collapsed ? 'w-[64px]' : 'w-[228px]',
      )}
    >
      {/* Top Organization Identity & Collapse Button */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-border px-3 shrink-0',
          collapsed ? 'justify-center' : 'justify-between gap-2.5',
        )}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className={cn(
            'flex items-center gap-2.5 min-w-0 rounded-xl p-1 text-left transition-colors hover:bg-secondary/70 cursor-pointer',
            collapsed && 'justify-center',
          )}
          title={org?.name || 'Guild Orbit'}
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-primary-foreground bg-primary overflow-hidden shadow-xs"
          >
            {org?.photoURL ? (
              <img src={org.photoURL} alt={org.name} className="h-full w-full object-cover" />
            ) : (
              orgInitials
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground leading-tight">
                {org?.name || 'Guild Orbit'}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground leading-tight capitalize">
                {userProfile?.role || 'Member'}
              </span>
            </div>
          )}
        </button>

        {!collapsed && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && onToggleCollapse && (
        <div className="flex justify-center pt-2 px-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Primary Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isPathActive(item.path);

          return (
            <button
              key={item.path}
              id={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground',
                )}
              />
              {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}

              {item.badge !== undefined && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center rounded-full text-[11px] font-semibold leading-none',
                    collapsed
                      ? 'absolute top-1.5 right-1.5 h-2 w-2 bg-primary ring-2 ring-surface'
                      : isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground px-1.5 py-0.5'
                        : 'bg-primary/15 text-primary px-1.5 py-0.5',
                  )}
                >
                  {!collapsed && (item.badge > 99 ? '99+' : item.badge)}
                </span>
              )}
            </button>
          );
        })}

        {(userProfile?.role === 'owner' || userProfile?.role === 'admin') && (
          <button
            type="button"
            onClick={() => window.open('https://admin.guildorbit.com', '_blank', 'noopener,noreferrer')}
            title={collapsed ? 'Admin Console' : undefined}
            className={cn(
              'group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 cursor-pointer',
              collapsed && 'justify-center px-0',
            )}
          >
            <Shield className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
            {!collapsed && <span className="flex-1 truncate text-left">Admin Console</span>}
          </button>
        )}
      </nav>

      {/* Bottom Appearance & User Account Footer */}
      <div className="border-t border-border p-2.5 space-y-1.5 shrink-0">
        {/* Theme & Appearance Row */}
        <div ref={themePickerRef} className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowThemePicker((v) => !v)}
            title="Appearance & Accent Theme"
            className={cn(
              'flex flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer',
              collapsed && 'justify-center px-0',
              showThemePicker && 'bg-secondary text-foreground',
            )}
          >
            <Palette className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="flex-1 truncate text-left">Appearance</span>}
          </button>

          {!collapsed && (
            <button
              type="button"
              onClick={toggleMode}
              title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          <AnimatePresence>
            {showThemePicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 6 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl border border-border bg-surface p-3.5 shadow-xl z-50"
              >
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border">
                  <span className="text-xs font-semibold text-foreground">Appearance</span>
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2 py-1 text-xs font-medium text-foreground hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    {mode === 'dark' ? (
                      <>
                        <Sun className="h-3.5 w-3.5 text-amber-500" />
                        Light
                      </>
                    ) : (
                      <>
                        <Moon className="h-3.5 w-3.5 text-primary" />
                        Dark
                      </>
                    )}
                  </button>
                </div>
                <div className="text-[11px] font-medium text-muted-foreground mb-2">Accent Palette</div>
                <div className="grid grid-cols-4 gap-2">
                  {themes
                    .filter((t) => t.id !== 'light')
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id)}
                        title={t.name}
                        className={cn(
                          'h-8 w-full rounded-xl border-2 flex items-center justify-center transition-transform active:scale-95 cursor-pointer',
                          themeId === t.id ? 'border-primary ring-2 ring-primary/20' : 'border-border',
                        )}
                        style={{ background: t.swatch }}
                      >
                        {themeId === t.id && <div className="h-2 w-2 rounded-full bg-white shadow-xs" />}
                      </button>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile & Sign Out */}
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl p-1.5',
            collapsed ? 'flex-col justify-center' : 'justify-between bg-secondary/50',
          )}
        >
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2.5 min-w-0 flex-1 rounded-lg p-1 text-left hover:bg-secondary transition-colors cursor-pointer"
            title={userProfile?.fullName || 'Account Settings'}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground overflow-hidden">
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.fullName || 'User'}
                  className="h-full w-full object-cover"
                />
              ) : (
                userInitials
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-foreground">
                  {userProfile?.fullName || 'User'}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {userProfile?.email || ''}
                </span>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            aria-label="Sign Out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
