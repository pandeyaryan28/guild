import * as React from 'react';
import { CheckCircle2, Circle, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleMilestone, deleteMilestone, createMilestone } from '../../lib/projects';
import type { Milestone } from '../../lib/projects';

interface MilestoneRailProps {
  projectId: string;
  orgId: string;
  milestones: Milestone[];
}

export function MilestoneRail({ projectId, orgId, milestones }: MilestoneRailProps) {
  const [adding, setAdding] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      await createMilestone({ projectId, orgId, title: newTitle.trim() });
      setNewTitle('');
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (m: Milestone) => {
    await toggleMilestone(projectId, m.id, !m.completed);
  };

  const handleDelete = async (m: Milestone) => {
    await deleteMilestone(projectId, m.id);
  };

  const completedCount = milestones.filter((m) => m.completed).length;
  const progress = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

  return (
    <div className="rounded-xl border border-border-default bg-bg-primary p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Milestones
          </span>
          {milestones.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {completedCount}/{milestones.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setAdding(true)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-accent/30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      {milestones.length > 0 && (
        <div className="h-1 rounded-full bg-border/30 mb-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Milestone chips — horizontal scrollable rail */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-wrap">
        {milestones.map((m) => (
          <div
            key={m.id}
            className={cn(
              'group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium border transition-all flex-shrink-0',
              m.completed
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-border-default bg-bg-primary text-muted-foreground hover:text-foreground',
            )}
          >
            <button onClick={() => handleToggle(m)} className="flex-shrink-0">
              {m.completed
                ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                : <Circle className="h-3 w-3" />
              }
            </button>
            <span className={cn(m.completed && 'line-through opacity-70')}>{m.title}</span>
            {m.dueDate && (
              <span className="text-[9px] text-text-muted ml-1">
                {m.dueDate.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            <button
              onClick={() => handleDelete(m)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all ml-0.5"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}

        {/* Inline add input */}
        {adding && (
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border border-primary/40 bg-primary/5 flex-shrink-0">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
                if (e.key === 'Escape') { setAdding(false); setNewTitle(''); }
              }}
              placeholder="Milestone name…"
              className="bg-transparent text-[11px] text-foreground placeholder:text-text-muted outline-none w-36"
            />
            <button
              onClick={handleAdd}
              disabled={saving}
              className="text-primary hover:text-primary/80 transition-colors text-[10px] font-semibold"
            >
              {saving ? '…' : 'Add'}
            </button>
            <button
              onClick={() => { setAdding(false); setNewTitle(''); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        )}

        {/* Empty state inside rail */}
        {milestones.length === 0 && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] text-text-muted border border-dashed border-border-default hover:border-border-default hover:text-muted-foreground transition-all"
          >
            <Plus className="h-3 w-3" />
            Add first milestone
          </button>
        )}
      </div>
    </div>
  );
}
