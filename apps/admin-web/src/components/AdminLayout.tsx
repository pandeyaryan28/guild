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
        <header className="flex h-14 w-full items-center justify-between gap-4 mb-4 z-30 shrink-0 px-6 aether-glass shadow-xl border border-white/10 dark:border-white/5 bg-white/5 dark:bg-white/[0.03]" style={{ borderRadius: '24px' }}>
          <div className="flex items-center gap-4">
            <span 
              className="text-lg font-black tracking-wider text-gradient uppercase bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400"
              style={{ letterSpacing: '0.12em' }}
            >
              Guild HQ
            </span>
            <div className="h-4 w-[1px] bg-white/10 shrink-0" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">
              Administrative Control Centre
            </span>
          </div>
        </header>

        {/* 4. Elegant macOS Floating scroll canvas with subtle glass borders */}
        <div className="flex-1 overflow-hidden relative border border-white/10 dark:border-white/5 bg-white/[0.02] dark:bg-white/[0.05] backdrop-blur-xl rounded-3xl shadow-2xl">
          <main className="absolute inset-0 overflow-y-auto aether-scroll p-6">
            {children(activeSection)}
          </main>
        </div>
      </div>
    </div>
  );
}
