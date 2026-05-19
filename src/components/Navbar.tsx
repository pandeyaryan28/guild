import * as React from 'react';
import {
  Bell, HelpCircle, Command, Plus, Palette, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationPanel } from './NotificationPanel';
import { ThemePickerModal } from './ThemePickerModal';

interface NavbarProps {
  onSearchOpen: () => void;
}

export function Navbar({ onSearchOpen }: NavbarProps) {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const { notifications, unreadCount, markRead, markAllAsRead } = useNotifications(orgId);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [themeOpen, setThemeOpen] = React.useState(false);

  const displayName = userProfile?.fullName ?? 'User';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border/40 bg-background/20 px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          {/* Search trigger */}
          <button
            onClick={onSearchOpen}
            className="group relative flex h-9 w-64 md:w-96 items-center gap-3 rounded-full border border-border/40 bg-muted/30 px-4 text-left transition-all hover:bg-muted/50 hover:ring-1 hover:ring-primary/20"
          >
            <Search className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
            <span className="flex-1 truncate text-xs text-muted-foreground/60">
              Search tasks, chat, people…
            </span>
            <div className="flex items-center gap-0.5 pointer-events-none">
              <Command className="h-3 w-3 text-muted-foreground/40" />
              <span className="text-[10px] font-medium text-muted-foreground/40">K</span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border/40 mx-1" />

          {/* Notifications bell */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotifOpen((v) => !v)}
              className={cn(
                'relative h-9 w-9 rounded-full transition-colors',
                notifOpen
                  ? 'bg-accent/60 text-foreground'
                  : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground',
              )}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span
                  className={cn(
                    'absolute right-2 top-2 flex h-2 w-2 rounded-full bg-primary ring-2 ring-background',
                    unreadCount > 0 && 'animate-pulse',
                  )}
                />
              )}
            </Button>

            <NotificationPanel
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={markRead}
              onMarkAllRead={markAllAsRead}
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>

          {/* Theme Picker Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setThemeOpen(true)}
            title="Change theme"
            className="h-9 w-9 rounded-full text-muted-foreground hover:bg-accent/40 hover:text-primary transition-colors"
          >
            <Palette className="h-4 w-4" />
          </Button>

          {/* User avatar */}
          <div className="ml-2 flex items-center gap-2 pl-2 border-l border-border/40 cursor-pointer group">
            <div className="flex flex-col items-end mr-1">
              <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                {displayName}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {userProfile?.role ?? 'member'}
              </span>
            </div>
            <Avatar className="h-8 w-8 border border-border/40 shadow-sm transition-transform group-hover:scale-105 active:scale-95">
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {themeOpen && <ThemePickerModal onClose={() => setThemeOpen(false)} />}
    </>
  );
}
