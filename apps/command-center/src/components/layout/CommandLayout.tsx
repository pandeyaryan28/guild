import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { CommandSidebar } from './CommandSidebar';
import { CommandHeader } from './CommandHeader';
import { CommandPalette } from './CommandPalette';
import { superAdminService, AdminDemoRequest } from '../../services/superAdminService';
import { CalendarClock, X, ArrowRight } from 'lucide-react';

export function CommandLayout() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [newLeadToast, setNewLeadToast] = useState<AdminDemoRequest | null>(null);
  const knownLeadIdsRef = useRef<Set<string> | null>(null);

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

  // Real-time listener for newly received inbound leads
  useEffect(() => {
    return superAdminService.subscribeToDemoRequests((requests) => {
      if (knownLeadIdsRef.current === null) {
        // Initial load: record existing IDs without firing alert
        knownLeadIdsRef.current = new Set(requests.map((r) => r.id));
        return;
      }

      // Check for freshly submitted demo requests
      for (const req of requests) {
        if (!knownLeadIdsRef.current.has(req.id) && req.status === 'pending') {
          knownLeadIdsRef.current.add(req.id);
          setNewLeadToast(req);
          setTimeout(() => {
            setNewLeadToast((prev) => (prev?.id === req.id ? null : prev));
          }, 8000);
          break;
        }
      }

      requests.forEach((r) => knownLeadIdsRef.current?.add(r.id));
    });
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

      {/* 4. Live Inbound Demo Alert Toast */}
      {newLeadToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-sm w-full">
          <div className="p-4 rounded-2xl bg-surface border border-primary/30 shadow-2xl space-y-2.5 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-600 dark:text-amber-400 block">
                    New Demo Request Received
                  </span>
                  <span className="text-xs font-bold text-foreground block truncate">
                    {newLeadToast.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewLeadToast(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground truncate">
              {newLeadToast.company || 'Enterprise'} • {newLeadToast.teamSize} seats ({newLeadToast.email})
            </p>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
              <button
                type="button"
                onClick={() => {
                  setNewLeadToast(null);
                  navigate('/demo-requests');
                }}
                className="px-3 py-1 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs hover:opacity-95"
              >
                <span>Inspect Lead</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
