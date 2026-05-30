import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import type { UserProfile } from '@guild/types';

interface AdminLayoutProps {
  profile: UserProfile;
  children: (activeSection: string) => React.ReactNode;
}

export function AdminLayout({ profile, children }: AdminLayoutProps) {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="aether-app-container flex min-h-screen w-full overflow-hidden select-none">
      {/* 1. Shifting Aurora Mesh Layer in the Background */}
      <div className="aether-aurora" />

      {/* 2. Floating macOS Navigation Sidebar Dock */}
      <Sidebar profile={profile} activeSection={activeSection} onNavigate={setActiveSection} />

      {/* 3. Main Workspace Container */}
      <div className="flex-1 flex flex-col min-w-0 pl-[120px] pr-6 py-5 z-10 overflow-hidden relative h-screen">
        
        {/* Top Spatial Control Nav Header - macOS Floating Window Titlebar Capsule */}
        <header className="flex h-14 w-full items-center justify-between gap-4 mb-4 z-30 shrink-0 px-6 aether-glass shadow-md" style={{ borderRadius: '18px' }}>
          <div className="flex items-center gap-4">
            {/* macOS Window Controls */}
            <div className="flex items-center gap-1.5 shrink-0 select-none">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] opacity-80" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] opacity-80" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] opacity-80" />
            </div>
            <div className="h-4 w-[1px] bg-white/10 mx-1 shrink-0" />
            <span 
              className="text-lg font-black tracking-tight text-gradient uppercase bg-gradient-to-r from-violet-500 to-indigo-500"
              style={{ letterSpacing: '0.1em' }}
            >
              Guild HQ
            </span>
            <div className="h-4 w-[1px] bg-white/10 shrink-0" />
            <span className="text-xs font-bold text-[--text-secondary] uppercase tracking-wider">
              Administrative Control Centre
            </span>
          </div>
        </header>

        {/* 4. Elegant macOS Floating scroll canvas with subtle glass borders */}
        <div className="flex-1 overflow-hidden relative border border-white/5 dark:border-white/5 bg-white/[0.01] dark:bg-black/[0.15] backdrop-blur-sm rounded-2xl shadow-xl">
          <main className="absolute inset-0 overflow-y-auto aether-scroll p-6">
            {children(activeSection)}
          </main>
        </div>
      </div>
    </div>
  );
}
