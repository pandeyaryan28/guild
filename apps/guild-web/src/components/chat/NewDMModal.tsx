import * as React from 'react';
import { X, Search, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { getOrCreateDM } from '../../lib/chat';
import { useAuth } from '../../hooks/useAuth';
import { type UserProfile } from '../../lib/firestore';
import { cn } from '@/lib/utils';
import { avatarHue } from '../MemberProfileDrawer';

interface NewDMModalProps {
  orgId: string;
  members: UserProfile[];
  onClose: () => void;
  onDMCreated: (dmId: string, otherUser: UserProfile) => void;
}

export function NewDMModal({ orgId, members, onClose, onDMCreated }: NewDMModalProps) {
  const { user } = useAuth();
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const filtered = members
    .filter((m) => m.uid !== user?.uid)
    .filter(
      (m) =>
        m.fullName.toLowerCase().includes(search.toLowerCase()) ||
        m.username.toLowerCase().includes(search.toLowerCase()),
    );

  const handleSelect = async (member: UserProfile) => {
    if (!user || loading) return;
    setLoading(member.uid);
    setError(null);
    try {
      const dmId = await getOrCreateDM(user.uid, member.uid, orgId);
      onDMCreated(dmId, member);
    } catch (err: any) {
      console.error('Failed to create or fetch DM:', err);
      setError(err?.message || 'Failed to start conversation. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Liquid Glass Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* SwiftUI Squircle Modal Window */}
      <div className="relative w-full max-w-sm rounded-3xl border border-border dark:border-border-strong bg-surface/95 dark:bg-surface/85 backdrop-blur-2xl shadow-2xl shadow-black/20 dark:shadow-black/70 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Specular Top Rim Lighting */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">New Direct Message</h2>
              <p className="text-[10px] text-muted-foreground font-medium">Start a 1-on-1 private discussion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="border-b border-border/80 px-4 py-3 bg-secondary/30 dark:bg-secondary/10">
          <div className="flex items-center gap-2.5 rounded-2xl bg-secondary/80 dark:bg-secondary/50 border border-border/60 dark:border-border-strong px-3 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or @username..."
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-[10px] text-muted-foreground hover:text-foreground p-0.5 rounded-md"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
            {error}
          </div>
        )}

        {/* Member Roster List */}
        <div className="max-h-72 overflow-y-auto aether-scroll p-2.5 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center space-y-1 select-none">
              <p className="text-xs font-semibold text-foreground/80">No members found</p>
              <p className="text-[11px] text-muted-foreground">Try searching with another name or username</p>
            </div>
          ) : (
            filtered.map((m) => {
              const initials = m.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
              const isLoading = loading === m.uid;
              const displayName = m.fullName || m.username || 'Team Member';

              return (
                <button
                  key={m.uid}
                  onClick={() => handleSelect(m)}
                  disabled={!!loading}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all cursor-pointer group",
                    isLoading
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-secondary/70 dark:hover:bg-secondary/40 active:scale-[0.98]"
                  )}
                >
                  {/* Avatar with Status Dot */}
                  <div className="relative h-8.5 w-8.5 shrink-0">
                    {m.photoURL ? (
                      <img src={m.photoURL} alt={displayName} className="h-full w-full object-cover rounded-full" />
                    ) : (
                      <div
                        className="h-full w-full flex items-center justify-center rounded-full text-xs font-bold text-white shadow-xs"
                        style={{ background: `hsl(${avatarHue(m.uid || displayName)} 55% 45%)` }}
                      >
                        {initials}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-surface flex items-center justify-center shadow-xs">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          m.availabilityStatus === 'focus'
                            ? "bg-red-500"
                            : m.availabilityStatus === 'away'
                            ? "bg-amber-500"
                            : m.availabilityStatus === 'active'
                            ? "bg-emerald-500"
                            : "bg-zinc-400"
                        )}
                      />
                    </span>
                  </div>

                  {/* Name and Handle */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {displayName}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate font-mono">@{m.username}</p>
                  </div>

                  {/* Action Icon */}
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 shrink-0 text-primary animate-spin" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
