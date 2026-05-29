import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@guild/firebase';
import type { UserProfile } from '@guild/types';
import {
  LayoutDashboard,
  Users,
  Users2,
  ClipboardList,
  Activity,
  LogOut,
  Settings
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
    icon: LayoutDashboard,
  },
  {
    id: 'people',
    label: 'People',
    icon: Users,
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: Users2,
  },
  {
    id: 'work',
    label: 'Work (Tasks + Goals)',
    icon: ClipboardList,
  },
  {
    id: 'activity',
    label: 'Activity Feed',
    icon: Activity,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
  },
] as const;

export function Sidebar({ profile, activeSection, onNavigate }: SidebarProps) {
  const initials = profile.fullName
    ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : profile.username.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="aether-dock-wrapper select-none">
      {/* macOS-Style Floating Dock */}
      <div className="aether-dock aether-glass flex flex-col items-center gap-3">
        
        {/* User Profile Bubble (Avatar) */}
        <div className="relative group cursor-pointer mb-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white border-2 border-white/20 dark:border-white/5 shadow-md hover:scale-105 active:scale-95 transition-all"
            style={{
              background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
            }}
          >
            {initials}
          </div>
          <div className="aether-dock-item-tooltip">
            {profile.fullName || profile.username}
          </div>
        </div>

        <div className="w-8 h-[1px] bg-white/10 mb-2" />

        {/* Core Nav Items */}
        {NAV.map(item => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`aether-dock-item ${isActive ? 'active' : ''}`}
              style={{
                outline: 'none',
                border: 'none',
                background: isActive ? 'var(--aether-primary)' : 'transparent',
              }}
            >
              <Icon className="w-5 h-5" />
              <div className="aether-dock-item-tooltip">{item.label}</div>
            </button>
          );
        })}

        <div className="w-8 h-[1px] bg-white/10 my-2" />

        {/* Log Out Button */}
        <button
          onClick={handleLogout}
          className="aether-dock-item text-red-400/80 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
          style={{ outline: 'none', border: 'none', background: 'transparent' }}
        >
          <LogOut className="w-5 h-5" />
          <div className="aether-dock-item-tooltip">Log Out</div>
        </button>
      </div>
    </div>
  );
}
