import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { UserProfile } from '@guild/types';

interface SidebarProps {
  profile: UserProfile;
  activeSection: string;
  onNavigate: (section: string) => void;
}

const NAV = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    id: 'organizations',
    label: 'Organizations',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'members',
    label: 'Members',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    id: 'channels',
    label: 'Channels',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
] as const;

export function Sidebar({ profile, activeSection, onNavigate }: SidebarProps) {
  const initials = profile.fullName
    ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : profile.username.slice(0, 2).toUpperCase();

  return (
    <aside
      className="flex flex-col h-full w-56 shrink-0"
      style={{
        background: 'var(--sidebar)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[--sidebar-border]">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--primary)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[--foreground] leading-none">Guild</p>
          <p className="text-[10px] text-[--muted-foreground] mt-0.5 leading-none">Admin Console</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        {NAV.map(item => {
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium
                         transition-all duration-150 text-left group"
              style={{
                background: active ? 'oklch(from var(--primary) l c h / 12%)' : 'transparent',
                color: active ? 'var(--primary)' : 'var(--muted-foreground)',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'oklch(from var(--foreground) l c h / 5%)';
                (e.currentTarget as HTMLElement).style.color = active ? 'var(--primary)' : 'var(--foreground)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = active ? 'oklch(from var(--primary) l c h / 12%)' : 'transparent';
                (e.currentTarget as HTMLElement).style.color = active ? 'var(--primary)' : 'var(--muted-foreground)';
              }}
            >
              <span className="opacity-80">{item.icon}</span>
              {item.label}
              {active && (
                <span className="ml-auto w-1 h-1 rounded-full animate-pulse-dot" style={{ background: 'var(--primary)' }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-[--sidebar-border]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ background: 'oklch(from var(--primary) l c h / 20%)', color: 'var(--primary)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[--foreground] truncate">{profile.fullName || profile.username}</p>
            <p className="text-[10px] text-[--muted-foreground] truncate capitalize">{profile.role}</p>
          </div>
          <button
            onClick={() => signOut(auth)}
            title="Sign out"
            className="p-1 rounded-md text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
