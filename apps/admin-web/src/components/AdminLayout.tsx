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
    <div className="aether-app-container flex min-h-screen w-full overflow-hidden select-none bg-background">
      {/* 1. Shifting Aurora Mesh Layer in the Background */}
      <div className="aether-aurora" />

      {/* 2. Floating macOS Navigation Sidebar Dock */}
      <Sidebar profile={profile} activeSection={activeSection} onNavigate={setActiveSection} />

      {/* 3. Main Workspace Container */}
      <div className="flex-1 flex flex-col min-w-0 pl-4 pr-4 pt-4 pb-24 md:pl-[120px] md:pr-6 md:py-5 z-10 overflow-hidden relative h-screen">
        
        {/* Top Spatial Control Nav Header */}
        <header className="flex h-10 w-full items-center justify-between gap-4 mb-4 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <span 
              className="text-lg font-black tracking-tight text-gradient uppercase bg-gradient-to-r from-violet-500 to-indigo-500"
              style={{ letterSpacing: '0.1em' }}
            >
              Guild HQ
            </span>
            <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
            <span className="text-xs font-bold text-[--text-secondary] uppercase tracking-wider hidden sm:inline">
              Administrative Control Centre
            </span>
          </div>
        </header>

        {/* 4. Elegant macOS Floating frosted-glass scroll canvas */}
        <div className="flex-1 overflow-hidden relative aether-glass shadow-2xl">
          <main className="absolute inset-0 overflow-y-auto aether-scroll p-4 md:p-6">
            {children(activeSection)}
          </main>
        </div>
      </div>
    </div>
  );
}
