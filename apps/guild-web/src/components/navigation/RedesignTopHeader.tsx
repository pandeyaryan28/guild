import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Bell,
  Command,
  ChevronDown,
  CheckSquare,
  FileText,
  MessageSquare,
  MoreHorizontal,
  User,
  Palette,
  Settings,
  LogOut,
  Sun,
  Moon,
  ExternalLink,
  Shield,
  Circle,
  Building2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useUnreadChatCount } from '../../hooks/useChat';
import { updateUserProfile, type Organization, type UserProfile } from '../../lib/firestore';
import type { Notification } from '@guild/types';
import { MoreMenuPopover } from './MoreMenuPopover';
import { NotificationPanel } from '../NotificationPanel';
import { ThemeSlider } from '../ThemeSlider';

export interface RedesignTopHeaderProps {
  org: Organization | null;
  onOpenSearch: () => void;
  onOpenProfile?: () => void;
  onOpenThemePicker?: () => void;
  // Notifications
  notifOpen: boolean;
  onToggleNotifications: () => void;
  notifications: Notification[];
  archivedNotifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => Promise<void>;
  onMarkUnread: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onArchiveAllRead: () => Promise<void>;
  onArchiveAll: () => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onCloseNotifications: () => void;
}

type AvailabilityStatus = 'active' | 'focus' | 'away';

const STATUS_CONFIG: Record<
  AvailabilityStatus,
  { label: string; dotClass: string; desc: string }
> = {
  active: {
    label: 'Active',
    dotClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    desc: 'Available for tasks & chat',
  },
  focus: {
    label: 'Focus',
    dotClass: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse',
    desc: 'Deep work / Do not disturb',
  },
  away: {
    label: 'Away',
    dotClass: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    desc: 'Stepped away from desk',
  },
};

export function RedesignTopHeader({
  org,
  onOpenSearch,
  onOpenProfile,
  onOpenThemePicker,
  notifOpen,
  onToggleNotifications,
  notifications,
  archivedNotifications,
  unreadCount,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onArchiveAllRead,
  onArchiveAll,
  onMarkAllRead,
  onCloseNotifications,
}: RedesignTopHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, logout } = useAuth();
  const { mode, toggleMode } = useTheme();
  const unreadChatCount = useUnreadChatCount(userProfile?.organizationId);

  // Popover States
  const [orgDropdownOpen, setOrgDropdownOpen] = React.useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = React.useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);

  // Refs for outside click handling
  const orgDropdownRef = React.useRef<HTMLDivElement>(null);
  const statusDropdownRef = React.useRef<HTMLDivElement>(null);
  const moreMenuRef = React.useRef<HTMLDivElement>(null);
  const userDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close menus on outside click or Escape
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(target)) {
        setOrgDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setStatusDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setMoreMenuOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOrgDropdownOpen(false);
        setStatusDropdownOpen(false);
        setMoreMenuOpen(false);
        setUserDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const currentStatus: AvailabilityStatus =
    (userProfile?.availabilityStatus as AvailabilityStatus) || 'active';

  const handleUpdateStatus = async (status: AvailabilityStatus) => {
    if (!userProfile?.uid) return;
    setStatusDropdownOpen(false);
    setUserDropdownOpen(false);
    try {
      await updateUserProfile(userProfile.uid, { availabilityStatus: status });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const orgInitials =
    org?.name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'GO';

  const userInitials =
    userProfile?.fullName
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    userProfile?.username?.slice(0, 2).toUpperCase() ||
    'U';

  // Navigation segment active calculation
  const isTasksActive =
    location.pathname === '/' ||
    location.pathname.startsWith('/tasks') ||
    location.pathname.startsWith('/requests');
  const isWorkspaceActive =
    location.pathname.startsWith('/workspace') ||
    location.pathname.startsWith('/studio') ||
    location.pathname.startsWith('/projects');
  const isChatActive = location.pathname.startsWith('/chat');
  const isMoreActive =
    moreMenuOpen ||
    location.pathname.startsWith('/people') ||
    location.pathname.startsWith('/reports') ||
    location.pathname.startsWith('/calendar') ||
    location.pathname.startsWith('/settings');

  const isAdminOrOwner = userProfile?.role === 'owner' || userProfile?.role === 'admin';

  return (
    <header className="flex h-14 w-full items-center justify-between gap-3 border-b border-border bg-surface/85 dark:bg-surface/75 backdrop-blur-xl px-4 sm:px-6 z-40 shrink-0 select-none print:hidden transition-colors">
      {/* ─── LEFT: Organization & User Status ───────────────────────────── */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Org Dropdown Container */}
        <div ref={orgDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setOrgDropdownOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl py-1 px-1.5 transition-colors hover:bg-secondary/70 active:scale-[0.98] cursor-pointer group"
            title={org?.name || 'Guild Orbit'}
            aria-expanded={orgDropdownOpen}
          >
            {/* Org Squircle Avatar */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground overflow-hidden shadow-xs border border-border/40">
              {org?.photoURL ? (
                <img
                  src={org.photoURL}
                  alt={org.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                orgInitials
              )}
            </div>

            {/* Org Name */}
            <span className="hidden sm:inline-block max-w-[140px] truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              {org?.name || 'Guild Orbit'}
            </span>

            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                orgDropdownOpen && 'rotate-180',
              )}
            />
          </button>

          {/* Org Dropdown Menu */}
          <AnimatePresence>
            {orgDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                className="absolute top-full left-0 mt-2 w-64 rounded-2xl p-2.5 z-50 select-none shadow-2xl bg-surface/95 dark:bg-surface/85 backdrop-blur-2xl border border-border/80 dark:border-border-strong"
              >
                {/* Org Summary Card */}
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-secondary/50 mb-1.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground overflow-hidden">
                    {org?.photoURL ? (
                      <img src={org.photoURL} alt={org.name} className="h-full w-full object-cover" />
                    ) : (
                      orgInitials
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {org?.name || 'Guild Orbit'}
                    </p>
                    <span className="inline-flex items-center text-[10px] text-muted-foreground capitalize">
                      {org?.billingPlan ? `${org.billingPlan.replace('_', ' ')} Plan` : 'Free Plan'}
                    </span>
                  </div>
                </div>

                {/* Quick Jumps */}
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setOrgDropdownOpen(false);
                      navigate('/people');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>People & Directory</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOrgDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Workspace Settings</span>
                  </button>

                  {isAdminOrOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrgDropdownOpen(false);
                        window.open('https://admin.guildorbit.com', '_blank', 'noopener,noreferrer');
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Shield className="h-3.5 w-3.5 text-amber-500" />
                        <span>Admin Console</span>
                      </div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground/60" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Separator */}
        <div className="h-3.5 w-px bg-border/60 shrink-0 hidden sm:block" />

        {/* User Status Dot Pill */}
        <div ref={statusDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setStatusDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full py-1 px-2.5 bg-secondary/50 dark:bg-secondary/40 border border-border/70 hover:bg-secondary transition-colors cursor-pointer text-xs"
            title={`Status: ${STATUS_CONFIG[currentStatus].label} — Click to change`}
            aria-expanded={statusDropdownOpen}
          >
            <span className={cn('h-2 w-2 rounded-full shrink-0', STATUS_CONFIG[currentStatus].dotClass)} />
            <span className="text-[11px] font-medium text-muted-foreground hidden md:inline-block">
              {STATUS_CONFIG[currentStatus].label}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground/70" />
          </button>

          {/* Status Selection Popover */}
          <AnimatePresence>
            {statusDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                className="absolute top-full left-0 mt-2 w-56 rounded-2xl p-2 z-50 select-none shadow-2xl bg-surface/95 dark:bg-surface/85 backdrop-blur-2xl border border-border/80 dark:border-border-strong"
              >
                <div className="px-2 py-1 mb-1 border-b border-border/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Set Your Status
                  </span>
                </div>
                {(Object.keys(STATUS_CONFIG) as AvailabilityStatus[]).map((st) => {
                  const cfg = STATUS_CONFIG[st];
                  const isCurrent = currentStatus === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleUpdateStatus(st)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer',
                        isCurrent
                          ? 'bg-secondary font-semibold text-foreground'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                      )}
                    >
                      <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', cfg.dotClass)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span>{cfg.label}</span>
                          {isCurrent && <span className="text-[10px] text-primary font-mono">Current</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{cfg.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── CENTER: Animated Pill Segmented Control ────────────────────── */}
      <nav
        aria-label="Workspace Sections"
        className="relative inline-flex items-center p-1 rounded-full bg-secondary/70 dark:bg-secondary/40 border border-border/80 dark:border-border backdrop-blur-xl shadow-xs"
      >
        {/* 1. Tasks & Feed */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className={cn(
            'relative px-3 sm:px-4 py-1.5 text-xs font-medium rounded-full transition-colors active:scale-[0.98] cursor-pointer',
            isTasksActive
              ? 'text-foreground font-semibold'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {isTasksActive && (
            <motion.div
              layoutId="top-nav-active-pill"
              className="absolute inset-0 rounded-full bg-surface dark:bg-card shadow-xs border border-border/60"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tasks & Feed</span>
            <span className="sm:hidden">Tasks</span>
          </span>
        </button>

        {/* 2. Workspace Canvas */}
        <button
          type="button"
          onClick={() => navigate('/workspace')}
          className={cn(
            'relative px-3 sm:px-4 py-1.5 text-xs font-medium rounded-full transition-colors active:scale-[0.98] cursor-pointer',
            isWorkspaceActive
              ? 'text-foreground font-semibold'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {isWorkspaceActive && (
            <motion.div
              layoutId="top-nav-active-pill"
              className="absolute inset-0 rounded-full bg-surface dark:bg-card shadow-xs border border-border/60"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Workspace Canvas</span>
            <span className="sm:hidden">Canvas</span>
          </span>
        </button>

        {/* 3. Chat */}
        <button
          type="button"
          onClick={() => navigate('/chat')}
          className={cn(
            'relative px-3 sm:px-4 py-1.5 text-xs font-medium rounded-full transition-colors active:scale-[0.98] cursor-pointer',
            isChatActive
              ? 'text-foreground font-semibold'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {isChatActive && (
            <motion.div
              layoutId="top-nav-active-pill"
              className="absolute inset-0 rounded-full bg-surface dark:bg-card shadow-xs border border-border/60"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Chat</span>
            {unreadChatCount > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none">
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </span>
        </button>

        {/* 4. More (Popover Trigger) */}
        <div ref={moreMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setMoreMenuOpen((v) => !v)}
            className={cn(
              'relative px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-full transition-colors active:scale-[0.98] cursor-pointer flex items-center gap-1',
              isMoreActive
                ? 'text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title="More workspace areas"
            aria-expanded={moreMenuOpen}
          >
            {isMoreActive && (
              <motion.div
                layoutId="top-nav-active-pill"
                className="absolute inset-0 rounded-full bg-surface dark:bg-card shadow-xs border border-border/60"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1">
              <span>More</span>
              <ChevronDown
                className={cn(
                  'h-3 w-3 transition-transform duration-200',
                  moreMenuOpen && 'rotate-180',
                )}
              />
            </span>
          </button>

          {/* Johnny.Decimal Popover */}
          <MoreMenuPopover isOpen={moreMenuOpen} onClose={() => setMoreMenuOpen(false)} />
        </div>
      </nav>

      {/* ─── RIGHT: Search, Notifications, Theme, User Avatar ─────────── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Command Palette / Search Shortcut Pill */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden md:flex h-8 w-[180px] lg:w-[210px] items-center justify-between gap-2 rounded-full border border-border bg-secondary/50 dark:bg-secondary/30 px-3 text-left text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-xs"
          title="Search or jump to... (Cmd+K)"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Search or jump to…</span>
          </span>
          <kbd className="inline-flex items-center gap-0.5 rounded border border-border/80 bg-surface/90 dark:bg-surface/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shrink-0 shadow-2xs">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        {/* Small Screen Search Icon Button */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          title="Search (Cmd+K)"
        >
          <Search className="h-3.5 w-3.5" />
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={onToggleNotifications}
            aria-label="Notifications"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary/50 dark:bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors active:scale-[0.98] relative cursor-pointer',
              notifOpen && 'bg-secondary text-foreground border-border-strong',
            )}
          >
            <Bell className="h-3.5 w-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-xs animate-in zoom-in-50">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Sheet / Panel */}
          <NotificationPanel
            notifications={notifications}
            archivedNotifications={archivedNotifications}
            unreadCount={unreadCount}
            onMarkRead={onMarkRead}
            onMarkUnread={onMarkUnread}
            onArchive={onArchive}
            onArchiveAllRead={onArchiveAllRead}
            onArchiveAll={onArchiveAll}
            onMarkAllRead={onMarkAllRead}
            open={notifOpen}
            onClose={onCloseNotifications}
          />
        </div>

        {/* Theme Dimmer Slider (Desktop) */}
        <div className="hidden lg:flex items-center">
          <ThemeSlider />
        </div>

        {/* User Avatar & Dropdown */}
        <div ref={userDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setUserDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full p-0.5 transition-transform active:scale-95 cursor-pointer focus:outline-hidden"
            title={userProfile?.fullName || 'User Profile'}
            aria-expanded={userDropdownOpen}
          >
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground overflow-hidden shadow-xs border border-border/50">
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
            {/* Status dot on avatar corner */}
            <span
              className={cn(
                'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-surface',
                STATUS_CONFIG[currentStatus].dotClass,
              )}
            />
          </button>

          {/* User Profile Popover */}
          <AnimatePresence>
            {userDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                className="absolute top-full right-0 mt-2 w-64 rounded-2xl p-2.5 z-50 select-none shadow-2xl bg-surface/95 dark:bg-surface/85 backdrop-blur-2xl border border-border/80 dark:border-border-strong"
              >
                {/* User Summary Card */}
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-secondary/50 mb-1.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground overflow-hidden">
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
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {userProfile?.fullName || 'User'}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {userProfile?.email || ''}
                    </p>
                    <span className="inline-block mt-0.5 rounded-sm bg-primary/10 text-primary px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider">
                      {userProfile?.role || 'Member'}
                    </span>
                  </div>
                </div>

                {/* Status Switcher Row */}
                <div className="mb-2 px-1 pt-1">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Status
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(Object.keys(STATUS_CONFIG) as AvailabilityStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateStatus(st)}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer',
                          currentStatus === st
                            ? 'bg-secondary font-semibold text-foreground border border-border'
                            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_CONFIG[st].dotClass)} />
                        <span>{STATUS_CONFIG[st].label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border/50 pt-1 space-y-0.5">
                  {/* View Profile */}
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenProfile?.();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>View Profile Drawer</span>
                  </button>

                  {/* Theme & Appearance */}
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenThemePicker?.();
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Theme & Colors</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/80 font-mono">Customize</span>
                  </button>

                  {/* Light / Dark Mode Toggle */}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {mode === 'dark' ? (
                        <Sun className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <Moon className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span>Theme Mode</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/80 capitalize font-mono">
                      {mode}
                    </span>
                  </button>

                  {/* Workspace Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Workspace Settings</span>
                  </button>
                </div>

                {/* Sign Out */}
                <div className="border-t border-border/50 pt-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
