import * as React from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  createTask, createLabel,
  STATUS_CONFIG, PRIORITY_CONFIG, LABEL_COLORS, STATUSES,
  type TaskStatus, type TaskPriority, type TaskLabel, type ActorInfo,
} from '../../lib/tasks';
import { useOrgMembers } from '../../hooks/useChat';
import { LabelBadge } from './LabelBadge';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  defaultStatus?: TaskStatus;
  actor: ActorInfo;
  labels?: TaskLabel[];
  // Execution OS — optional scope defaults
  defaultProjectId?: string;
  defaultGoalId?: string;
}

export function CreateTaskModal({ open, onClose, orgId, defaultStatus = 'todo', actor, labels = [], defaultProjectId, defaultGoalId }: CreateTaskModalProps) {
  const members = useOrgMembers(orgId);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = React.useState<TaskPriority>('none');
  const [assigneeIds, setAssigneeIds] = React.useState<string[]>([]);
  const [labelIds, setLabelIds] = React.useState<string[]>([]);
  const [dueDate, setDueDate] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  // New label creation
  const [newLabelName, setNewLabelName] = React.useState('');
  const [newLabelColor, setNewLabelColor] = React.useState(LABEL_COLORS[5]);
  const [showNewLabel, setShowNewLabel] = React.useState(false);

  React.useEffect(() => {
    if (open) { setStatus(defaultStatus); setTitle(''); setDescription(''); setAssigneeIds([]); setLabelIds([]); setDueDate(''); setPriority('none'); }
  }, [open, defaultStatus]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createTask({
        orgId, title: title.trim(), description, status, priority,
        assigneeIds, labelIds,
        dueDate: dueDate ? new Date(dueDate) : null,
        actor,
        // Scope fields — null if not provided
        projectId: defaultProjectId ?? null,
        goalId: defaultGoalId ?? null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    const id = await createLabel(orgId, newLabelName.trim(), newLabelColor);
    setLabelIds((prev) => [...prev, id]);
    setNewLabelName('');
    setShowNewLabel(false);
  };

  const toggleAssignee = (uid: string) => setAssigneeIds((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);
  const toggleLabel = (id: string) => setLabelIds((prev) => prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-border/50 bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/30">
          <h2 className="text-sm font-semibold text-foreground">Create Task</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            {/* Title */}
            <div>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title…"
                className="w-full bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground/50 outline-none"
              />
            </div>

            {/* Description */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description…"
              rows={3}
              className="w-full resize-none rounded-lg border border-border/30 bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors"
            />

            {/* Meta row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Status */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Status</p>
                <div className="flex flex-wrap gap-1">
                  {STATUSES.map((s) => (
                    <button
                      key={s} type="button"
                      onClick={() => setStatus(s)}
                      className={cn(
                        'px-2 py-0.5 rounded text-[11px] font-medium border transition-all',
                        status === s
                          ? 'border-transparent text-foreground'
                          : 'border-border/30 text-muted-foreground hover:text-foreground',
                      )}
                      style={status === s ? { backgroundColor: `${STATUS_CONFIG[s].dot}25`, borderColor: `${STATUS_CONFIG[s].dot}60`, color: STATUS_CONFIG[s].dot } : {}}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Priority</p>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                    <button
                      key={p} type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        'px-2 py-0.5 rounded text-[11px] font-medium border transition-all',
                        priority === p ? 'border-transparent' : 'border-border/30 text-muted-foreground hover:text-foreground',
                      )}
                      style={priority === p ? { backgroundColor: `${PRIORITY_CONFIG[p].color}25`, borderColor: `${PRIORITY_CONFIG[p].color}60`, color: PRIORITY_CONFIG[p].color } : {}}
                    >
                      {PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Due Date</p>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-lg border border-border/30 bg-background/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Assignees */}
            {members.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Assignees</p>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => (
                    <button
                      key={m.uid} type="button"
                      onClick={() => toggleAssignee(m.uid)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all',
                        assigneeIds.includes(m.uid)
                          ? 'bg-primary/20 border-primary/50 text-primary'
                          : 'border-border/30 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <div className="h-4 w-4 rounded-full bg-primary/30 flex items-center justify-center text-[8px] font-bold text-primary">
                        {(m.fullName || m.username || '?')[0].toUpperCase()}
                      </div>
                      {m.fullName || m.username}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Labels */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Labels</p>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((l) => (
                  <button key={l.id} type="button" onClick={() => toggleLabel(l.id)}>
                    <LabelBadge label={l} className={cn(!labelIds.includes(l.id) && 'opacity-40 hover:opacity-70')} />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowNewLabel(!showNewLabel)}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-muted-foreground border border-dashed border-border/40 hover:text-foreground hover:border-border/70 transition-colors"
                >
                  <Plus className="h-2.5 w-2.5" /> New
                </button>
              </div>
              {showNewLabel && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="Label name"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateLabel(); } }}
                    className="flex-1 rounded border border-border/30 bg-background/50 px-2 py-1 text-xs text-foreground outline-none"
                  />
                  <div className="flex gap-1">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c} type="button"
                        onClick={() => setNewLabelColor(c)}
                        className="h-4 w-4 rounded-full transition-transform hover:scale-110"
                        style={{ backgroundColor: c, outline: newLabelColor === c ? `2px solid ${c}` : 'none', outlineOffset: '1px' }}
                      />
                    ))}
                  </div>
                  <Button type="button" size="sm" onClick={handleCreateLabel} className="h-6 px-2 text-xs">Add</Button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-border/30">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!title.trim() || saving}>
              {saving ? 'Creating…' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
