import * as React from 'react';
import { X, Search, UserPlus, Loader2 } from 'lucide-react';
import { useOrgMembers } from '../../hooks/useChat';
import { addChannelMembers } from '../../lib/chat';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cn } from '@/lib/utils';

interface InviteChannelMembersModalProps {
  channelId: string;
  orgId: string;
  currentUser: { uid: string; displayName: string } | null;
  onClose: () => void;
}

export function InviteChannelMembersModal({ channelId, orgId, currentUser, onClose }: InviteChannelMembersModalProps) {
  const members = useOrgMembers(orgId);
  const [existingMemberIds, setExistingMemberIds] = React.useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState('');
  const [loadingMembers, setLoadingMembers] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  // Fetch current channel members to filter them out
  React.useEffect(() => {
    const fetchExisting = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'channelMembers'), where('channelId', '==', channelId))
        );
        const ids = new Set(snap.docs.map((d) => d.data().userId as string));
        setExistingMemberIds(ids);
      } catch (err) {
        console.error('Failed to fetch existing channel members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchExisting();
  }, [channelId]);

  const availableMembers = React.useMemo(() => {
    return members.filter((m) => !existingMemberIds.has(m.uid));
  }, [members, existingMemberIds]);

  const filteredMembers = React.useMemo(() => {
    if (!search.trim()) return availableMembers;
    const lower = search.toLowerCase();
    return availableMembers.filter(
      (m) =>
        m.fullName.toLowerCase().includes(lower) ||
        m.username.toLowerCase().includes(lower)
    );
  }, [availableMembers, search]);

  const handleToggleSelect = (uid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  const handleInvite = async () => {
    if (selectedIds.size === 0 || !currentUser) return;
    setSaving(true);
    setError('');
    try {
      await addChannelMembers(
        channelId,
        orgId,
        Array.from(selectedIds),
        currentUser.uid,
        currentUser.displayName
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add members');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border-default bg-surface backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-6 py-4 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-foreground">Add members</h2>
            <p className="text-xs text-text-muted mt-0.5">Invite teammates to this channel</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-bg-tertiary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-border-default/50 shrink-0">
          <div className="flex items-center gap-2 rounded-xl border border-border-default bg-bg-tertiary px-3 py-2 focus-within:border-primary/40 transition-colors">
            <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or username..."
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-text-muted focus:outline-none"
            />
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto px-6 py-3 min-h-[200px]">
          {loadingMembers ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs">Loading workspace directory...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-text-muted">
              <p className="text-xs font-semibold">No members available to invite</p>
              <p className="text-[10px] mt-0.5">All workspace members are already in this channel or match no results</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredMembers.map((m) => {
                const isSelected = selectedIds.has(m.uid);
                const initials = m.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

                return (
                  <div
                    key={m.uid}
                    onClick={() => handleToggleSelect(m.uid)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer border transition-colors select-none',
                      isSelected
                        ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                        : 'border-transparent hover:bg-bg-tertiary/75'
                    )}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-[10px] font-bold text-primary border border-primary/15 shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">{m.fullName}</p>
                      <p className="text-[9px] text-text-muted truncate">@{m.username}</p>
                    </div>
                    <div className={cn(
                      'flex h-4 w-4 items-center justify-center rounded border transition-all shrink-0',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border-default bg-black/25'
                    )}>
                      {isSelected && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="h-2.5 w-2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-default px-6 py-4 shrink-0 bg-bg-tertiary/30">
          <p className="text-[10px] text-text-muted font-medium">
            {selectedIds.size} selected
          </p>
          <div className="flex gap-2.5">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-bg-tertiary transition-colors">
              Cancel
            </button>
            <button
              onClick={handleInvite}
              disabled={selectedIds.size === 0 || saving}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all',
                selectedIds.size > 0 && !saving
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90'
                  : 'bg-bg-tertiary text-muted-foreground cursor-not-allowed',
              )}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              Invite Members
            </button>
          </div>
        </div>
        {error && <p className="px-6 pb-4 text-xs text-destructive shrink-0">{error}</p>}
      </div>
    </div>
  );
}
