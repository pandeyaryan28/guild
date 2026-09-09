import * as React from 'react';
import { createPortal } from 'react-dom';
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
  defaultDueDate?: string;
}

export function CreateTaskModal({ open, onClose, orgId, defaultStatus = 'todo', actor, labels = [], defaultProjectId, defaultGoalId, defaultDueDate }: CreateTaskModalProps) {
  const members = useOrgMembers(orgId);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = React.useState<TaskPriority>('none');
  const [assigneeIds, setAssigneeIds] = React.useState<string[]>([]);
  const [labelIds, setLabelIds] = React.useState<string[]>([]);
  const [dueDate, setDueDate] = React.useState(defaultDueDate || '');
  const [saving, setSaving] = React.useState(false);
  // New label creation
  const [newLabelName, setNewLabelName] = React.useState('');
  const [newLabelColor, setNewLabelColor] = React.useState(LABEL_COLORS[5]);
  const [showNewLabel, setShowNewLabel] = React.useState(false);

  React.useEffect(() => {
    if (open) { setStatus(defaultStatus); setTitle(''); setDescription(''); setAssigneeIds([]); setLabelIds([]); setDueDate(defaultDueDate || ''); setPriority('none'); }
  }, [open, defaultStatus, defaultDueDate]);

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

  const modalContent = (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs z-[65]" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative z-[70] w-full max-w-lg mx-auto sm:mx-4 max-h-[92dvh] sm:max-h-[86vh] rounded-t-[32px] sm:rounded-2xl border-t sm:border border-border bg-surface/98 dark:bg-surface/95 backdrop-blur-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Mobile Grab Pill */}
        <div className="sm:hidden w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mt-3 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
          <h2 className="text-xs font-black uppercase tracking-wider text-foreground">Create Task</h2>
          <button 
            onClick={onClose} 
            className="h-7 w-7 rounded-full border border-border bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer active:scale-95 transition-all"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Form Body with ample bottom clearance */}
          <div className="px-5 py-4 space-y-4 flex-1 overflow-y-auto aether-scroll overscroll-contain pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pb-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Task Title <span className="text-primary">*</span>
              </label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border focus:border-primary/50 rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground placeholder:text-muted-foreground/60 outline-none transition-all shadow-xs"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Description & Details
                </label>
                <span className="text-[9px] font-bold text-muted-foreground/60">Optional</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add task context, checklist items, or acceptance criteria…"
                rows={3}
                className="w-full min-h-[84px] bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border focus:border-primary/50 rounded-xl px-3.5 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none transition-all shadow-xs resize-none leading-relaxed"
              />
            </div>

            {/* Meta row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Status */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s} type="button"
                      onClick={() => setStatus(s)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer shadow-xs',
                        status === s
                          ? 'border-transparent text-foreground'
                          : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground',
                      )}
                      style={status === s ? { backgroundColor: `${STATUS_CONFIG[s].dot}25`, borderColor: `${STATUS_CONFIG[s].dot}60`, color: STATUS_CONFIG[s].dot } : {}}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Priority</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                    <button
                      key={p} type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer shadow-xs',
                        priority === p ? 'border-transparent' : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground',
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
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Due Date</p>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground outline-none transition-all shadow-xs [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            {/* Assignees */}
            {members.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Assignees</p>
                <div className="flex flex-wrap gap-1.5">
                  {members.filter(m => m.uid !== actor.uid).map((m) => (
                    <button
                      key={m.uid} type="button"
                      onClick={() => toggleAssignee(m.uid)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border transition-all cursor-pointer shadow-xs',
                        assigneeIds.includes(m.uid)
                          ? 'bg-primary/20 border-primary/50 text-primary'
                          : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground',
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
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Labels</p>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((l) => (
                  <button key={l.id} type="button" onClick={() => toggleLabel(l.id)} className="cursor-pointer">
                    <LabelBadge label={l} className={cn(!labelIds.includes(l.id) && 'opacity-40 hover:opacity-70')} />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowNewLabel(!showNewLabel)}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-muted-foreground border border-dashed border-border hover:text-foreground hover:border-border transition-colors cursor-pointer"
                >
                  <Plus className="h-2.5 w-2.5" /> New Label
                </button>
              </div>
              {showNewLabel && (
                <div className="mt-2.5 flex items-center gap-2 p-2 rounded-xl bg-secondary/40 border border-border">
                  <input
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="Label name"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateLabel(); } }}
                    className="flex-1 rounded-lg bg-surface border border-border px-2.5 py-1 text-xs text-foreground outline-none"
                  />
                  <div className="flex gap-1">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c} type="button"
                        onClick={() => setNewLabelColor(c)}
                        className="h-4 w-4 rounded-full transition-transform hover:scale-110 cursor-pointer"
                        style={{ backgroundColor: c, outline: newLabelColor === c ? `2px solid ${c}` : 'none', outlineOffset: '1px' }}
                      />
                    ))}
                  </div>
                  <Button type="button" size="sm" onClick={handleCreateLabel} className="h-6 px-2.5 text-xs font-bold">Add</Button>
                </div>
              )}
            </div>
          </div>

          {/* Footer with sticky action buttons */}
          <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border bg-surface/95 backdrop-blur-md shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-3.5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="rounded-xl font-bold cursor-pointer">Cancel</Button>
            <Button type="submit" size="sm" disabled={!title.trim() || saving} className="rounded-xl font-black shadow-md cursor-pointer">
              {saving ? 'Creating…' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
