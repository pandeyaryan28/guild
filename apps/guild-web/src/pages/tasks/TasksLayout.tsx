import * as React from 'react';
import { cn } from '@/lib/utils';

interface TasksLayoutProps {
  nav: React.ReactNode;
  main: React.ReactNode;
  panel?: React.ReactNode;
  panelOpen?: boolean;
}

/**
 * Full-page 3-panel shell for the Tasks experience.
 * Left nav (260px fixed) | Main content (flex-1) | Detail panel (400px, slides in)
 * No global Navbar or RightSidebar — self-contained like ChatLayout.
 */
export function TasksLayout({ nav, main, panel, panelOpen }: TasksLayoutProps) {
  return (
    <div className="tasks-layout flex h-screen w-full overflow-hidden bg-background">
      {/* Left nav */}
      <aside className="tasks-layout__nav flex-shrink-0 w-[260px] flex flex-col border-r border-border/30 bg-sidebar overflow-hidden">
        {nav}
      </aside>

      {/* Main content */}
      <div className="tasks-layout__main flex-1 min-w-0 flex flex-col overflow-hidden">
        {main}
      </div>

      {/* Detail panel — slides in from the right without overlay */}
      <div
        className={cn(
          'tasks-layout__panel flex-shrink-0 border-l border-border/30 bg-card overflow-hidden transition-[width] duration-300 ease-in-out',
          panelOpen ? 'w-[420px]' : 'w-0',
        )}
        style={{ minWidth: panelOpen ? 420 : 0 }}
      >
        {panel}
      </div>
    </div>
  );
}
