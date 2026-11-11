import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  BarChart3,
  Calendar,
  Settings,
  Shield,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';

export interface MoreMenuPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

interface DecimalItem {
  id: string;
  code: string;
  label: string;
  description: string;
  path: string;
  icon: React.ElementType;
}

const DECIMAL_ITEMS: DecimalItem[] = [
  {
    id: 'people',
    code: '40',
    label: 'Directory & People',
    description: 'Team members, roles, contacts & organizational structure',
    path: '/people',
    icon: Users,
  },
  {
    id: 'reports',
    code: '50',
    label: 'Reports & Telemetry',
    description: 'KPI analytics, velocity metrics, time tracking & performance',
    path: '/reports',
    icon: BarChart3,
  },
  {
    id: 'calendar',
    code: '60',
    label: 'Calendar & Schedule',
    description: 'Milestones, team schedules, cycle deadlines & events',
    path: '/calendar',
    icon: Calendar,
  },
  {
    id: 'settings',
    code: '90',
    label: 'Workspace Settings',
    description: 'Workspace preferences, billing, permissions & integrations',
    path: '/settings',
    icon: Settings,
  },
];

export function MoreMenuPopover({ isOpen, onClose }: MoreMenuPopoverProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useAuth();
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  const isAdminOrOwner = userProfile?.role === 'owner' || userProfile?.role === 'admin';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className={cn(
            'absolute top-full mt-2.5 w-80 rounded-2xl p-2.5 z-50 select-none shadow-2xl',
            'bg-surface/95 dark:bg-surface/85 backdrop-blur-2xl',
            'border border-border/80 dark:border-border-strong',
            'shadow-[0_16px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.55)]',
            'focus:outline-hidden',
          )}
          style={{
            // Center the popover relative to its parent container
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header Eyebrow */}
          <div className="flex items-center justify-between px-2.5 pt-1.5 pb-2 border-b border-border/50">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                J.Decimal Areas
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground/75 font-mono">
              Categories 40–90
            </span>
          </div>

          {/* Menu Items */}
          <div className="pt-1.5 space-y-1">
            {DECIMAL_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.path)}
                  className={cn(
                    'group relative flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-all duration-150 active:scale-[0.98] cursor-pointer',
                    isActive
                      ? 'bg-secondary text-foreground'
                      : 'text-foreground hover:bg-secondary/70 hover:text-foreground',
                  )}
                  role="menuitem"
                >
                  {/* Decimal Numeric Tag */}
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
                    )}
                  >
                    {item.code}
                  </div>

                  {/* Item Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold truncate leading-tight">
                        {item.label}
                      </span>
                      <ArrowRight
                        className={cn(
                          'h-3 w-3 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground',
                          isActive && 'text-primary',
                        )}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 leading-snug mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Admin Console shortcut for owners/admins */}
          {isAdminOrOwner && (
            <div className="mt-1.5 pt-1.5 border-t border-border/50">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.open('https://admin.guildorbit.com', '_blank', 'noopener,noreferrer');
                }}
                className="group flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors active:scale-[0.98] cursor-pointer"
                role="menuitem"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-amber-500" />
                  <span>Admin Console</span>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground/60 group-hover:text-foreground" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
