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
    <div className="flex h-screen overflow-hidden bg-[--background]">
      <Sidebar profile={profile} activeSection={activeSection} onNavigate={setActiveSection} />

      {/* Main screen content area */}
      <main className="flex-1 overflow-y-auto scrollbar-thin bg-dot-grid">
        {children(activeSection)}
      </main>
    </div>
  );
}
