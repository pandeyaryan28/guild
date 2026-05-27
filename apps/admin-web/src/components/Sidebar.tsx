import React, { useState } from 'react';
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
  Menu,
  X,
  ChevronRight,
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
    className: '',
  },
  {
    id: 'people',
    label: 'People',
    icon: Users,
    className: '',
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: Users2,
    className: '',
  },
  {
    id: 'work',
    label: 'Work (Tasks + Goals)',
    icon: ClipboardList,
    className: 'hidden md:flex',
  },
  {
    id: 'activity',
    label: 'Activity Feed',
    icon: Activity,
    className: 'hidden md:flex',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    className: 'hidden md:flex',
  },
] as const;

const MOBILE_MORE_NAV = [
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
  const [showMobileMore, setShowMobileMore] = useState(false);

  const initials = profile.fullName
    ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : profile.username.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="aether-dock-wrapper select-none">
      {/* macOS-Style Floating Dock */}
      <div className="aether-dock aether-glass flex flex-row md:flex-col items-center gap-2 md:gap-3">
        
        {/* User Profile Bubble (Avatar) - Hidden on mobile */}
        <div className="relative group cursor-pointer mb-2 hidden md:block">
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

        <div className="w-8 h-[1px] bg-white/10 mb-2 hidden md:block" />

        {/* Core Nav Items */}
        {NAV.map(item => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`aether-dock-item ${isActive ? 'active' : ''} ${item.className}`}
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

        {/* More Button (Mobile only, triggers bottom sheet drawer) */}
        <button
          onClick={() => setShowMobileMore(true)}
          className="aether-dock-item aether-dock-item-menu flex md:hidden hover:scale-110 active:scale-95 transition-all items-center justify-center relative cursor-pointer"
          style={{ outline: 'none', border: 'none', background: 'transparent' }}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="w-8 h-[1px] bg-white/10 my-2 hidden md:block" />

        {/* Log Out Button - Hidden on mobile */}
        <button
          onClick={handleLogout}
          className="aether-dock-item text-red-400/80 hover:text-red-400 hover:bg-red-500/10 cursor-pointer hidden md:block"
          style={{ outline: 'none', border: 'none', background: 'transparent' }}
        >
          <LogOut className="w-5 h-5" />
          <div className="aether-dock-item-tooltip">Log Out</div>
        </button>
      </div>

      {/* Lightweight Responsive Mobile Bottom Sheet Drawer */}
      {showMobileMore && (
        <div className="fixed inset-0 z-[200] pointer-events-auto">
          {/* Semi-transparent blur backdrop */}
          <div
            onClick={() => setShowMobileMore(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
          />

          {/* Bottom Sheet Modal */}
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[80vh] aether-glass rounded-t-[32px] border-x-0 border-b-0 border-t border-white/10 px-6 pb-8 pt-2 z-[210] shadow-2xl flex flex-col pointer-events-auto overflow-hidden animate-slide-up"
            style={{
              background: 'var(--aether-glass-bg)',
              animation: 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            {/* Drag Handle Indicator */}
            <div className="aether-mobile-handle shrink-0" />

            {/* Content list */}
            <div className="flex-1 overflow-y-auto aether-scroll space-y-6 pb-6 pr-1">
              
              {/* User Profile Cockpit Header */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-inner">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-xs text-white border-2 border-white/20 dark:border-white/5 shadow-md shrink-0 select-none"
                    style={{
                      background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
                    }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-[--foreground] block truncate leading-none">
                      {profile.fullName || profile.username}
                    </span>
                    <span className="text-[9px] font-bold text-[--muted-foreground] capitalize block mt-1 tracking-wider">
                      {profile.role} • Guild Admin Panel
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileMore(false)}
                  className="h-8 w-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-[--muted-foreground] hover:text-[--foreground] active:scale-95 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Extra nav links */}
              <div className="space-y-1">
                <div className="text-[9px] font-black uppercase tracking-widest text-[--muted-foreground]/60 px-2 pb-1.5 select-none">
                  Admin Navigation
                </div>
                {MOBILE_MORE_NAV.map(item => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setShowMobileMore(false);
                        onNavigate(item.id);
                      }}
                      className={`w-full flex items-center gap-3.5 rounded-xl px-4 py-3 text-xs font-bold transition-all border select-none cursor-pointer text-left`}
                      style={{
                        outline: 'none',
                        background: active ? 'var(--aether-primary)' : 'rgba(255, 255, 255, 0.02)',
                        borderColor: active ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: active ? 'white' : 'var(--text-secondary)'
                      }}
                    >
                      <Icon className="w-4.5 h-4.5 shrink-0" />
                      <span className="flex-1 tracking-wide">{item.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                    </button>
                  );
                })}
              </div>

              {/* Crimson Log Out Action */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowMobileMore(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/25 hover:border-red-500/40 text-red-400 py-3.5 text-xs font-black tracking-widest transition-all active:scale-98 cursor-pointer shadow-lg shadow-red-500/5 select-none"
                >
                  <LogOut className="w-4.5 h-4.5 shrink-0" />
                  <span>LOG OUT SESSION</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Embedded Animations CSS style block */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
