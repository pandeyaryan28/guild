import * as React from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import { useOrgMembers } from '../../hooks/useChat';
import { createProject } from '../../lib/projects';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
}

export function CreateProjectModal({ open, onClose, orgId }: CreateProjectModalProps) {
  const { user, userProfile } = useAuth();
  const members = useOrgMembers(orgId);

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<string[]>([]);
  const [startDate, setStartDate] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setSelectedMemberIds(user?.uid ? [user.uid] : []);
      setStartDate('');
      setDueDate('');
    }
  }, [open, user?.uid]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setSaving(true);
    try {
      await createProject({
        orgId,
        name: name.trim(),
        description,
        memberIds: selectedMemberIds,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        actor: {
          uid: user.uid,
          name: userProfile?.fullName || user.displayName || 'Unknown',
        },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const toggleMember = (uid: string) => {
    // Owner always stays in
    if (uid === user?.uid) return;
    setSelectedMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-border-default bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-default">
          <h2 className="text-sm font-semibold text-foreground">New Project</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            {/* Name */}
            <div>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name…"
                className="w-full bg-transparent text-base font-medium text-foreground placeholder:text-text-muted outline-none"
              />
            </div>

            {/* Description */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description…"
              rows={3}
              className="w-full resize-none rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-foreground placeholder:text-text-muted outline-none focus:border-primary/50 transition-colors"
            />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Start Date</p>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Due Date</p>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            {/* Members */}
            {members.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Members</p>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => {
                    const isOwner = m.uid === user?.uid;
                    const selected = selectedMemberIds.includes(m.uid);
                    return (
                      <button
                        key={m.uid}
                        type="button"
                        onClick={() => toggleMember(m.uid)}
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all ${
                          selected
                            ? 'bg-primary/20 border-primary/50 text-primary'
                            : 'border-border-default text-muted-foreground hover:text-foreground'
                        } ${isOwner ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <div className="h-4 w-4 rounded-full bg-primary/30 flex items-center justify-center text-[8px] font-bold text-primary">
                          {(m.fullName || m.username || '?')[0].toUpperCase()}
                        </div>
                        {m.fullName || m.username}
                        {isOwner && <span className="text-[9px] text-muted-foreground">(you)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-border-default">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!name.trim() || saving}>
              {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Creating…</> : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
