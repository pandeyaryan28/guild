import * as React from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
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
  const [horizon, setHorizon] = React.useState<'short_term' | 'long_term'>('short_term');
  const [recurrence, setRecurrence] = React.useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setTargetDate('');
      setHorizon('short_term');
      setRecurrence('none');
    }
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
        horizon,
        recurrence,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal Cockpit Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-surface/95 dark:bg-surface/90 backdrop-blur-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.01]">
          <h2 className="text-sm font-black uppercase tracking-wider text-foreground">New Goal Focus</h2>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            <div className="space-y-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/80 block">Goal Outcome Title</span>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Declare what you want to achieve…"
                className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-violet-500/50 hover:border-white/10 transition-all shadow-inner"
              />
            </div>
            
            <div className="space-y-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/80 block">Outcome Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What key results or targets does this goal represent?"
                rows={3}
                className="w-full resize-none rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-violet-500/50 hover:border-white/10 transition-all shadow-inner leading-relaxed"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/80">Horizon</p>
                <select
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value as any)}
                  className="w-full rounded-xl border border-white/5 bg-surface/95 px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-violet-500/50 hover:border-white/10 transition-all shadow-sm cursor-pointer"
                >
                  <option value="short_term">Milestone Focus</option>
                  <option value="long_term">Vision Horizon</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/80">Recurrence</p>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as any)}
                  className="w-full rounded-xl border border-white/5 bg-surface/95 px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-violet-500/50 hover:border-white/10 transition-all shadow-sm cursor-pointer"
                >
                  <option value="none">One-time Outcome</option>
                  <option value="daily">Daily Cycle</option>
                  <option value="weekly">Weekly Cycle</option>
                  <option value="monthly">Monthly Cycle</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/80">Target Milestone Date</p>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs font-bold text-foreground outline-none focus:border-violet-500/50 hover:border-white/10 transition-all shadow-inner font-mono cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 bg-white/[0.01]">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground font-black text-[10px] tracking-wider uppercase hover:bg-white/5 rounded-xl px-4 py-2 h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || saving}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-[10px] tracking-wider uppercase rounded-xl px-5 py-2.5 h-9 cursor-pointer border-0 shadow-lg hover:shadow-violet-500/20 active:scale-95 transition-all"
            >
              {saving ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Syncing…</span>
                </div>
              ) : (
                'Establish Goal'
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
