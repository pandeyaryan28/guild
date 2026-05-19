import * as React from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import { createGoal } from '../../lib/goals';

interface CreateGoalModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
}

export function CreateGoalModal({ open, onClose, orgId }: CreateGoalModalProps) {
  const { user, userProfile } = useAuth();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [targetDate, setTargetDate] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) { setTitle(''); setDescription(''); setTargetDate(''); }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;
    setSaving(true);
    try {
      await createGoal({
        orgId,
        title: title.trim(),
        description,
        targetDate: targetDate ? new Date(targetDate) : null,
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl border border-border-default bg-card shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border-default">
          <h2 className="text-sm font-semibold text-foreground">New Goal</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Goal title…"
              className="w-full bg-transparent text-base font-medium text-foreground placeholder:text-text-muted outline-none"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What outcome does this goal represent?"
              rows={3}
              className="w-full resize-none rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-foreground placeholder:text-text-muted outline-none focus:border-violet-500/50 transition-colors"
            />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Target Date</p>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-1.5 text-sm text-foreground outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 p-4 border-t border-border-default">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || saving}
              className="bg-violet-600 hover:bg-violet-700 text-white border-0"
            >
              {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Creating…</> : 'Create Goal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
