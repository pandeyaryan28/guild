import * as React from 'react';
import { X, Plus, Calendar, Users, SlidersHorizontal, Layers, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getAvatarColor = (userId: string) => {
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-indigo-500/10 border-indigo-500/25 text-indigo-650 dark:text-indigo-400',
      'bg-cyan-500/10 border-cyan-500/25 text-cyan-600 dark:text-cyan-400',
      'bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-400',
      'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
      'bg-pink-500/10 border-pink-500/25 text-pink-600 dark:text-pink-400',
    ];
    return colors[hash % colors.length];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-lg bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border-default/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-default/45 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <h2 className="text-xs font-black uppercase tracking-wider text-foreground">Create Task</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-border-default/60 flex items-center justify-center hover:bg-bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-90 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 overflow-y-auto aether-scroll">
          <div className="p-5 space-y-5">
            {/* Title & Description Document Card */}
            <div className="bg-bg-primary/45 dark:bg-black/15 border border-border-default/40 rounded-2xl p-4.5 space-y-4 shadow-xs">
              {/* Title */}
              <div className="space-y-1">
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  required
                  className="w-full bg-transparent border-none text-base font-bold text-foreground placeholder:text-muted-foreground/45 outline-none focus:ring-0 p-0"
                />
              </div>

              {/* Description */}
              <div className="space-y-1 border-t border-border-default/20 pt-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add description or execution steps..."
                  rows={3}
                  className="w-full bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground/45 outline-none resize-none focus:ring-0 p-0"
                />
              </div>
            </div>

            {/* Meta Rows */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Status */}
                <div className="space-y-2">
                  <p className="text-[9px] uppercase tracking-widest font-extrabold text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <span>Status</span>
                  </p>
                  <div className="flex gap-1 bg-bg-secondary/40 dark:bg-black/10 p-1 rounded-xl border border-border-default/40">
                    {STATUSES.map((s) => {
                      const isSelected = status === s;
                      const config = STATUS_CONFIG[s];
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatus(s)}
                          className={cn(
                            'flex-1 py-1.5 text-[9px] font-bold rounded-lg border border-transparent transition-all cursor-pointer text-center capitalize active:scale-95',
                            isSelected
                              ? 'shadow-xs'
                              : 'text-muted-foreground hover:text-foreground hover:bg-bg-secondary/30 bg-transparent',
                          )}
                          style={isSelected ? { backgroundColor: `${config.dot}15`, borderColor: `${config.dot}35`, color: config.dot } : {}}
                        >
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <p className="text-[9px] uppercase tracking-widest font-extrabold text-muted-foreground flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Priority</span>
                  </p>
                  <div className="flex gap-1 bg-bg-secondary/40 dark:bg-black/10 p-1 rounded-xl border border-border-default/40">
                    {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => {
                      const isSelected = priority === p;
                      const config = PRIORITY_CONFIG[p];
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={cn(
                            'flex-1 py-1.5 text-[9px] font-bold rounded-lg border border-transparent transition-all cursor-pointer text-center capitalize active:scale-95',
                            isSelected
                              ? 'shadow-xs'
                              : 'text-muted-foreground hover:text-foreground hover:bg-bg-secondary/30 bg-transparent',
                          )}
                          style={isSelected ? { backgroundColor: `${config.color}15`, borderColor: `${config.color}35`, color: config.color } : {}}
                        >
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Due Date & Assignees */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Due Date */}
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-extrabold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Due Date</span>
                  </p>
                  <div className="relative w-full flex items-center bg-surface border border-border-default rounded-xl px-3.5 py-2.5 text-xs text-foreground hover:border-accent/30 focus-within:border-accent/40 font-semibold transition-all shadow-xs">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-xs text-foreground cursor-pointer font-semibold [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Assignees */}
                {members.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] uppercase tracking-widest font-extrabold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>Assignees</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface border border-border-default rounded-xl min-h-[38px] px-2 shadow-xs">
                      {assigneeIds.map((uid) => {
                        const m = members.find((mem) => mem.uid === uid);
                        if (!m) return null;
                        return (
                          <div
                            key={uid}
                            className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary"
                          >
                            {m.photoURL ? (
                              <img src={m.photoURL} alt={m.fullName || m.username} className="w-4 h-4 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center font-bold text-[7px] shrink-0", getAvatarColor(m.uid))}>
                                {getInitials(m.fullName || m.username)}
                              </div>
                            )}
                            <span className="truncate max-w-[80px]">{m.fullName || m.username}</span>
                            <button
                              type="button"
                              onClick={() => toggleAssignee(uid)}
                              className="text-primary hover:text-primary-dark transition-colors font-bold ml-0.5 text-[8px] hover:scale-115 active:scale-90"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] text-muted-foreground border border-dashed border-border-default hover:text-foreground hover:border-border-default transition-colors cursor-pointer"
                          >
                            <Plus className="h-3 w-3" /> Add
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 max-h-60 overflow-y-auto aether-scroll bg-surface/95 dark:bg-neutral-900 border border-border-default/80 dark:border-neutral-800 rounded-2xl shadow-xl backdrop-blur-xl py-1.5">
                          {members.filter(m => m.uid !== actor.uid).map((m) => {
                            const isChecked = assigneeIds.includes(m.uid);
                            return (
                              <DropdownMenuItem
                                key={m.uid}
                                onSelect={(e) => {
                                  e.preventDefault();
                                  toggleAssignee(m.uid);
                                }}
                                className="flex items-center justify-between px-3 py-2 text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800/80 cursor-pointer"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {m.photoURL ? (
                                    <img src={m.photoURL} alt={m.fullName || m.username} className="w-5 h-5 rounded-full object-cover shrink-0" />
                                  ) : (
                                    <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[8px] shrink-0", getAvatarColor(m.uid))}>
                                      {getInitials(m.fullName || m.username)}
                                    </div>
                                  )}
                                  <span className="truncate">{m.fullName || m.username}</span>
                                </div>
                                {isChecked && <Check className="w-3.5 h-3.5 text-primary stroke-[2.5] shrink-0" />}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-1.5">
              <p className="text-[9px] uppercase tracking-widest font-extrabold text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Labels</span>
              </p>
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-surface border border-border-default rounded-xl shadow-xs">
                {labels.map((l) => {
                  const isChecked = labelIds.includes(l.id);
                  return (
                    <button key={l.id} type="button" onClick={() => toggleLabel(l.id)} className="cursor-pointer active:scale-95 transition-all">
                      <LabelBadge label={l} className={cn(!isChecked && 'opacity-40 hover:opacity-75')} />
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowNewLabel(!showNewLabel)}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-muted-foreground border border-dashed border-border-default hover:text-foreground hover:border-border-default transition-colors cursor-pointer"
                >
                  <Plus className="h-2.5 w-2.5" /> New Label
                </button>
              </div>
              {showNewLabel && (
                <div className="mt-2.5 flex items-center gap-2 p-2.5 bg-bg-secondary/40 dark:bg-black/10 border border-border-default/40 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
                  <input
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="Label name"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateLabel(); } }}
                    className="flex-1 rounded-lg aether-glass-input px-2.5 py-1.5 text-xs text-foreground outline-none border border-border-default/50"
                  />
                  <div className="flex gap-1 shrink-0">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c} type="button"
                        onClick={() => setNewLabelColor(c)}
                        className="h-4 w-4 rounded-full transition-transform hover:scale-110 cursor-pointer"
                        style={{ backgroundColor: c, outline: newLabelColor === c ? `2px solid ${c}` : 'none', outlineOffset: '1px' }}
                      />
                    ))}
                  </div>
                  <Button type="button" size="sm" onClick={handleCreateLabel} className="h-7 px-2.5 text-xs font-bold rounded-lg cursor-pointer">Add</Button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-border-default/45 shrink-0 bg-bg-secondary/15">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border-default/60 hover:bg-bg-secondary text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="px-4 py-2 bg-accent hover:opacity-95 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-accent/10 active:scale-98"
              style={{ background: 'var(--accent)' }}
            >
              {saving ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
