import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { CommandSidebar } from './CommandSidebar';
import { CommandHeader } from './CommandHeader';
import { CommandPalette } from './CommandPalette';

export function CommandLayout() {
  const [searchOpen, setSearchOpen] = useState(false);

  // Global shortcut cmd+k / ctrl+k
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden">
      {/* 1. Sidebar Navigation */}
      <CommandSidebar />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Header Bar */}
        <CommandHeader onSearchOpen={() => setSearchOpen(true)} />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto scrollbar-thin p-6 bg-dot-grid relative">
          <Outlet />
        </main>
      </div>

      {/* 3. Global Command Palette */}
      <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
