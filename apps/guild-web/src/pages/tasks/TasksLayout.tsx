import * as React from 'react';
import { cn } from '@/lib/utils';

interface TasksLayoutProps {
  nav: React.ReactNode;
  main: React.ReactNode;
  panel?: React.ReactNode;
  panelOpen?: boolean;
  mobileNavOpen?: boolean;
  onMobileNavClose?: () => void;
}

/**
 * Full-page 3-panel shell for the Tasks experience.
 * Left nav (260px fixed) | Main content (flex-1) | Detail panel (400px, slides in)
 * No global Navbar or RightSidebar — self-contained like ChatLayout.
 */
export function TasksLayout({
  nav,
  main,
  panel,
  panelOpen,
  mobileNavOpen,
  onMobileNavClose,
}: TasksLayoutProps) {
  return (
    <div className="tasks-layout flex h-screen w-full overflow-hidden bg-background">
      {/* Mobile backdrop for nav drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={onMobileNavClose}
        />
      )}

      {/* Left nav - sliding drawer on mobile, relative on desktop */}
      <aside
        className={cn(
          "tasks-layout__nav flex-shrink-0 w-[260px] flex flex-col border-r border-border-default bg-sidebar overflow-hidden transition-transform duration-300 z-50",
          "fixed inset-y-0 left-0 md:relative md:translate-x-0 md:z-auto",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {nav}
      </aside>

      {/* Main content */}
      <div className="tasks-layout__main flex-1 min-w-0 flex flex-col overflow-hidden">
        {main}
      </div>

      {/* Detail panel — full screen slide-over on mobile, inline expander on desktop */}
      <div
        className={cn(
          'tasks-layout__panel border-border-default bg-card overflow-hidden transition-all duration-300 ease-in-out',
          'fixed inset-y-0 right-0 z-50 md:relative md:inset-auto md:border-l',
          panelOpen
            ? 'w-full translate-x-0 md:w-[420px]'
            : 'w-0 translate-x-full md:w-0 md:translate-x-0',
        )}
      >
        {panel}
      </div>
    </div>
  );
}
