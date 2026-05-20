import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { UserProfile } from '@guild/types';
import {
  LayoutDashboard,
  Users,
  Users2,
  ClipboardList,
  Activity,
  LogOut,
  Shield
} from 'lucide-react';

interface SidebarProps {
  profile: UserProfile;
  activeSection: string;
  onNavigate: (section: string) => void;
}

const NAV = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    id: 'people',
    label: 'People',
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: <Users2 className="w-4 h-4" />,
  },
  {
    id: 'work',
    label: 'Work (Tasks + Goals)',
    icon: <ClipboardList className="w-4 h-4" />,
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: <Activity className="w-4 h-4" />,
  },
] as const;

export function Sidebar({ profile, activeSection, onNavigate }: SidebarProps) {
  const initials = profile.fullName
    ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : profile.username.slice(0, 2).toUpperCase();

  return (
    <aside
      className="flex flex-col h-full w-60 shrink-0 select-none"
      style={{
        background: 'var(--sidebar)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[--sidebar-border]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 glow-primary"
          style={{ background: 'var(--primary)' }}
        >
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[--foreground] leading-none">Guild HQ</p>
          <p className="text-[10px] text-[--muted-foreground] mt-0.5 leading-none">Admin Control</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {NAV.map(item => {
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                         transition-all duration-150 text-left group"
              style={{
                background: active ? 'oklch(from var(--primary) l c h / 12%)' : 'transparent',
                color: active ? 'var(--primary)' : 'var(--muted-foreground)',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'oklch(from var(--foreground) l c h / 5%)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)';
                } else {
                  (e.currentTarget as HTMLElement).style.background = 'oklch(from var(--primary) l c h / 12%)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--primary)';
                }
              }}
            >
              <span className={`transition-transform duration-200 group-hover:scale-110 ${active ? 'opacity-100 text-[--primary]' : 'opacity-70 text-[--muted-foreground] group-hover:text-[--foreground]'}`}>
                {item.icon}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {active && (
                <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-[--primary]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-[--sidebar-border] bg-black/10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 shadow-inner"
            style={{ background: 'oklch(from var(--primary) l c h / 20%)', color: 'var(--primary)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[--foreground] truncate">{profile.fullName || profile.username}</p>
            <p className="text-[10px] text-[--muted-foreground] truncate capitalize font-medium">{profile.role}</p>
          </div>
          <button
            onClick={() => signOut(auth)}
            title="Sign out"
            className="p-1.5 rounded-lg text-[--muted-foreground] hover:text-[--destructive] hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
