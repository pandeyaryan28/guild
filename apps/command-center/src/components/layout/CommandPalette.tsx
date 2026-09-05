import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  ShieldCheck,
  CalendarClock,
  Moon,
  Sun,
  X,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { superAdminService, AdminOrganization, AdminUser } from '../../services/superAdminService';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { mode, toggleTheme } = useTheme();

  const [query, setQuery] = useState('');
  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    if (isOpen) {
      superAdminService.getAllOrganizations().then(setOrgs);
      superAdminService.getAllUsers().then(setUsers);
      setQuery('');
    }
  }, [isOpen]);

  // Global hotkey listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredOrgs = orgs
    .filter(
      (o) =>
        o.name.toLowerCase().includes(query.toLowerCase()) ||
        o.id.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 4);

  const filteredUsers = users
    .filter(
      (u) =>
        u.fullName.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 4);

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="cc-glass-elevated rounded-2xl w-full max-w-xl overflow-hidden border border-border shadow-2xl flex flex-col">
        {/* Search Input Bar */}
        <div className="px-4 py-3.5 border-b border-border flex items-center gap-3 bg-surface/60">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            autoFocus
            placeholder="Search commands, workspaces, users, or pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <kbd className="text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded border border-border">
              ESC
            </kbd>
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-3 space-y-3 scrollbar-thin text-xs">
          {/* Navigation Section */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase px-2">Navigation</span>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => handleSelect('/')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-secondary/70 text-foreground transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 text-primary" />
                  <span className="font-semibold">Platform Overview Dashboard</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={() => handleSelect('/workspaces')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-secondary/70 text-foreground transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-accent" />
                  <span className="font-semibold">Workspaces Directory</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={() => handleSelect('/users')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-secondary/70 text-foreground transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-success" />
                  <span className="font-semibold">Platform Users</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={() => handleSelect('/subscriptions')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-secondary/70 text-foreground transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-warning" />
                  <span className="font-semibold">Subscription & Entitlements</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={() => handleSelect('/demo-requests')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-secondary/70 text-foreground transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarClock className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold">Demo Requests & Inbound Leads</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={() => handleSelect('/audit-logs')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-secondary/70 text-foreground transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  <span className="font-semibold">Super-Admin Audit Trail</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Workspaces Matching */}
          {filteredOrgs.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase px-2">Workspaces</span>
              <div className="space-y-0.5">
                {filteredOrgs.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleSelect(`/workspaces?id=${org.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-secondary/70 text-foreground transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div className="truncate">
                        <span className="font-bold">{org.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground ml-2">
                          ({org.id})
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground shrink-0">
                      {org.plan}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Users Matching */}
          {filteredUsers.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase px-2">Users</span>
              <div className="space-y-0.5">
                {filteredUsers.map((u) => (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => handleSelect(`/users?id=${u.uid}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-secondary/70 text-foreground transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Users className="w-3.5 h-3.5 text-accent shrink-0" />
                      <div className="truncate">
                        <span className="font-bold">{u.fullName}</span>
                        <span className="font-mono text-[10px] text-muted-foreground ml-2">
                          {u.email}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground shrink-0">
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Theme Switch Action */}
          <div className="space-y-1 pt-1 border-t border-border">
            <span className="text-[10px] font-bold text-muted-foreground uppercase px-2">Actions</span>
            <button
              type="button"
              onClick={() => {
                toggleTheme();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-secondary/70 text-foreground transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {mode === 'dark' ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4 text-accent" />}
                <span className="font-semibold">Switch to {mode === 'dark' ? 'Light' : 'Dark'} Mode</span>
              </div>
              <kbd className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">
                THEME
              </kbd>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border bg-surface/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>Guild Quick Jump Command</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
