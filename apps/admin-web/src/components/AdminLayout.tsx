import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import type { UserProfile } from '@guild/types';

interface AdminLayoutProps {
  profile: UserProfile;
  children: (activeSection: string) => React.ReactNode;
}

const SECTIONS = ['overview', 'organizations', 'members', 'tasks', 'channels'];

export function AdminLayout({ profile, children }: AdminLayoutProps) {
  const [activeSection, setActiveSection] = useState('overview');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Scroll to section when nav item clicked
  function handleNavigate(section: string) {
    setActiveSection(section);
    const el = sectionRefs.current[section];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Intersection observer — update active section as user scrolls
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { threshold: 0.3, rootMargin: '-60px 0px -60% 0px' },
    );

    for (const id of SECTIONS) {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[--background]">
      <Sidebar profile={profile} activeSection={activeSection} onNavigate={handleNavigate} />

      {/* Main scroll area */}
      <main className="flex-1 overflow-y-auto scrollbar-thin bg-dot-grid">
        {children(activeSection)}
      </main>
    </div>
  );
}

// Utility to register section refs — passed as a prop to each section component
export function useSectionRef(sectionRefs: React.MutableRefObject<Record<string, HTMLElement | null>>, id: string) {
  return (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };
}
