import * as React from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { RightSidebar } from './RightSidebar';
import { GlobalSearch } from './GlobalSearch';

interface LayoutProps {
  children: React.ReactNode;
  toggleTheme: () => void;
  currentTheme: 'dark' | 'light';
}

export function Layout({ children, toggleTheme, currentTheme }: LayoutProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);

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
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Glow Background Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

        <Navbar
          toggleTheme={toggleTheme}
          currentTheme={currentTheme}
          onSearchOpen={() => setSearchOpen(true)}
        />

        {/* Scrollable Dashboard Area */}
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto scrollbar-hide">
            {children}
          </main>

          {/* Right Sidebar - hidden on smaller screens */}
          <div className="hidden lg:block">
            <RightSidebar />
          </div>
        </div>
      </div>

      {/* Global Search overlay — rendered outside scroll containers */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
