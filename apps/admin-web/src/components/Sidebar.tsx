import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@guild/firebase';
import type { UserProfile } from '@guild/types';
import {
  LayoutDashboard,
  Users,
  Users2,
  ClipboardList,
  LogOut,
  Settings
} from 'lucide-react';

import { motion } from 'motion/react';

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
      <div className="aether-dock aether-glass flex flex-col items-center gap-3 border border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/25 shadow-2xl" style={{ borderRadius: '32px' }}>
        
        {/* User Profile Bubble (Avatar) */}
        <div className="relative group cursor-pointer mb-2">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs text-white border-2 border-white/20 dark:border-white/10 shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
            }}
          >
            {initials}
          </div>
          <div className="aether-dock-item-tooltip font-bold tracking-tight">
            {profile.fullName || profile.username}
          </div>
        </div>

        <div className="w-8 h-[1px] bg-white/10 mb-2" />

        {/* Core Nav Items */}
        <div className="flex flex-col gap-2 relative">
          {NAV.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`aether-dock-item relative cursor-pointer ${isActive ? 'text-white' : 'text-foreground/75 hover:text-foreground'}`}
                style={{
                  outline: 'none',
                  border: 'none',
                  background: 'transparent',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-admin-dock-indicator"
                    className="absolute inset-0 bg-indigo-600 dark:bg-indigo-500 rounded-2xl shadow-[0_4px_16px_oklch(from_var(--primary)_l_c_h_/_28%)] z-0"
                    transition={{ type: "spring", stiffness: 130, damping: 15 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                <div className="aether-dock-item-tooltip font-bold tracking-tight">{item.label}</div>
              </button>
            );
          })}
        </div>

        <div className="w-8 h-[1px] bg-white/10 my-2" />

        {/* Log Out Button */}
        <button
          onClick={handleLogout}
          className="aether-dock-item text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-all duration-300"
          style={{ outline: 'none', border: 'none', background: 'transparent' }}
        >
          <LogOut className="w-5 h-5" />
          <div className="aether-dock-item-tooltip font-bold tracking-tight">Log Out</div>
        </button>
      </div>
    </div>
  );
}
