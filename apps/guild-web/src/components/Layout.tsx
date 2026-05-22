import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { RightSidebar, RightSidebarToggle } from './RightSidebar';
import { GlobalSearch } from './GlobalSearch';
import { useRightSidebar } from '../hooks/useRightSidebar';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const { collapsed } = useRightSidebar();
  const location = useLocation();

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Global Cmd+K / Ctrl+K shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans selection:bg-primary/30 selection:text-primary-foreground">
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar - responsive drawer on mobile, relative on desktop */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex-shrink-0 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:z-auto',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Glow Background Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/3 rounded-full blur-[100px] pointer-events-none" />

        <Navbar onSearchOpen={() => setSearchOpen(true)} onMobileMenuToggle={() => setMobileSidebarOpen((v) => !v)} />

        {/* Scrollable Dashboard Area */}
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto scrollbar-hide">
            {children}
          </main>

          {/* Right Sidebar — animated collapse, hidden on small screens */}
          <div
            className={cn(
              'hidden lg:flex flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out',
              collapsed ? 'w-0' : 'w-[300px]',
            )}
            style={{ minWidth: collapsed ? 0 : 300 }}
          >
            <RightSidebar />
          </div>
        </div>
      </div>

      {/* Global Search overlay */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Collapsed re-open handle */}
      <RightSidebarToggle />
    </div>
  );
}
