import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  ShieldCheck,
  Terminal,
  LogOut,
} from 'lucide-react';
import { useSuperAdminAuth } from '../../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Overview',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    to: '/workspaces',
    label: 'Workspaces',
    icon: Building2,
  },
  {
    to: '/users',
    label: 'Users',
    icon: Users,
  },
  {
    to: '/subscriptions',
    label: 'Subscriptions',
    icon: CreditCard,
  },
  {
    to: '/audit-logs',
    label: 'Audit Trail',
    icon: ShieldCheck,
  },
];

export function CommandSidebar() {
  const { adminProfile, user, signOut } = useSuperAdminAuth();

  const userEmail = adminProfile?.email || user?.email || 'admin';
  const roleName = adminProfile?.role || 'superadmin';

  return (
    <aside className="w-64 shrink-0 h-screen flex flex-col justify-between border-r border-border bg-surface/80 backdrop-blur-xl z-20 select-none">
      {/* Top Section: App Branding & Status */}
      <div className="p-5 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black shadow-md shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground tracking-tight truncate">
                Guild Command
              </span>
              <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/25">
                ROOT
              </span>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground truncate">
              SUPERADMIN CONSOLE
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Connection & Profile Card */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Live Cluster Pill */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/60 border border-border text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-muted-foreground">CLUSTER:</span>
          </div>
          <span className="text-foreground font-semibold">PROD_FIRESTORE</span>
        </div>

        {/* User Identity Chip */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-secondary/40 border border-border">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{userEmail}</p>
            <p className="font-mono text-[10px] text-muted-foreground uppercase">{roleName}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            title="Sign out"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
