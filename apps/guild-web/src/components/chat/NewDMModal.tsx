import * as React from 'react';
import { X, Search, MessageSquare } from 'lucide-react';
import { getOrCreateDM } from '../../lib/chat';
import { useAuth } from '../../hooks/useAuth';
import { type UserProfile } from '../../lib/firestore';
import { cn } from '@/lib/utils';

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
    const dmId = await getOrCreateDM(user.uid, member.uid, orgId);
    setLoading(null);
    onDMCreated(dmId, member);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
          <h2 className="text-sm font-bold text-foreground">New Direct Message</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/20 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border/20 px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl bg-muted/15 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground/50" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a member..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto scrollbar-hide p-2">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground/50">No members found</p>
          ) : (
            filtered.map((m) => {
              const initials = m.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
              const isLoading = loading === m.uid;
              return (
                <button
                  key={m.uid}
                  onClick={() => handleSelect(m)}
                  disabled={!!loading}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted/15 transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary border border-primary/15">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{m.fullName}</p>
                    <p className="text-[10px] text-muted-foreground/50">@{m.username}</p>
                  </div>
                  <MessageSquare className={cn('h-4 w-4 shrink-0 transition-colors', isLoading ? 'text-primary animate-pulse' : 'text-muted-foreground/20')} />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
