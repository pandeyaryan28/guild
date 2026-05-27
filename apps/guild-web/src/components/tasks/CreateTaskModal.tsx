import * as React from 'react';
import { X, Plus, Zap, Calendar, Tag, Users, AlignLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  defaultProjectId?: string;
  defaultGoalId?: string;
  defaultDueDate?: string;
}

const PRIORITY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  none:   { color: '#71717a', bg: 'rgba(113,113,122,0.08)', border: 'rgba(113,113,122,0.2)' },
  low:    { color: '#14b8a6', bg: 'rgba(20,184,166,0.08)',  border: 'rgba(20,184,166,0.25)' },
  medium: { color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.25)' },
  high:   { color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)' },
  urgent: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)' },
};

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

export function CreateTaskModal({
  open, onClose, orgId, defaultStatus = 'todo', actor,
  labels = [], defaultProjectId, defaultGoalId, defaultDueDate,
}: CreateTaskModalProps) {
  const members = useOrgMembers(orgId);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = React.useState<TaskPriority>('none');
  const [assigneeIds, setAssigneeIds] = React.useState<string[]>([]);
  const [labelIds, setLabelIds] = React.useState<string[]>([]);
  const [dueDate, setDueDate] = React.useState(defaultDueDate || '');
  const [saving, setSaving] = React.useState(false);
  const [newLabelName, setNewLabelName] = React.useState('');
  const [newLabelColor, setNewLabelColor] = React.useState(LABEL_COLORS[5]);
  const [showNewLabel, setShowNewLabel] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setStatus(defaultStatus); setTitle(''); setDescription('');
      setAssigneeIds([]); setLabelIds([]); setDueDate(defaultDueDate || ''); setPriority('none');
    }
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
        assigneeIds: assigneeIds.length > 0 ? assigneeIds : [actor.uid], labelIds,
        dueDate: dueDate ? new Date(dueDate) : null,
        actor,
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

  const toggleAssignee = (uid: string) =>
    setAssigneeIds((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);
  const toggleLabel = (id: string) =>
    setLabelIds((prev) => prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-[6px]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl shadow-2xl overflow-hidden"
          >
            {/* Top accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, var(--accent) 0%, oklch(from var(--accent) calc(l + 0.1) c h) 100%)' }}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center shadow-md"
                  style={{ background: 'oklch(from var(--accent) l c h / 15%)', border: '1px solid oklch(from var(--accent) l c h / 25%)' }}
                >
                  <Zap className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-foreground tracking-tight">New Task</h2>
                  <p className="text-[9px] font-bold text-muted-foreground">Add to your workspace</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-7 w-7 rounded-lg border border-white/5 bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto aether-scroll">

                {/* Title */}
                <div className="space-y-1.5">
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full bg-transparent text-base font-bold text-foreground placeholder:text-muted-foreground/40 outline-none tracking-tight"
                  />
                </div>

                {/* Description */}
                <div>
                  <SectionLabel icon={AlignLeft} label="Description" />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add more context or details…"
                    rows={2}
                    className="w-full resize-none rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-white/15 focus:bg-white/[0.05] transition-all leading-relaxed"
                  />
                </div>

                {/* Status + Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <SectionLabel icon={Check} label="Status" />
                    <div className="flex flex-wrap gap-1">
                      {STATUSES.map((s) => {
                        const active = status === s;
                        const cfg = STATUS_CONFIG[s];
                        return (
                          <button
                            key={s} type="button"
                            onClick={() => setStatus(s)}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer"
                            style={active
                              ? { color: cfg.dot, backgroundColor: `${cfg.dot}18`, borderColor: `${cfg.dot}40` }
                              : { color: 'var(--muted-foreground)', backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }
                            }
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <SectionLabel icon={Zap} label="Priority" />
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => {
                        const active = priority === p;
                        const style = PRIORITY_STYLES[p] || PRIORITY_STYLES.none;
                        return (
                          <button
                            key={p} type="button"
                            onClick={() => setPriority(p)}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer"
                            style={active
                              ? { color: style.color, backgroundColor: style.bg, borderColor: style.border }
                              : { color: 'var(--muted-foreground)', backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }
                            }
                          >
                            {PRIORITY_CONFIG[p].label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <SectionLabel icon={Calendar} label="Due Date" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-1.5 text-sm text-foreground outline-none focus:border-white/15 transition-all cursor-pointer"
                  />
                </div>

                {/* Assignees */}
                {members.length > 0 && (
                  <div>
                    <SectionLabel icon={Users} label="Assignees" />
                    <div className="flex flex-wrap gap-1.5">
                      {members.map((m) => {
                        const active = assigneeIds.includes(m.uid);
                        return (
                          <button
                            key={m.uid} type="button"
                            onClick={() => toggleAssignee(m.uid)}
                            className={cn(
                              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border transition-all cursor-pointer',
                              active
                                ? 'border-accent/40 text-foreground'
                                : 'border-white/8 bg-white/[0.03] text-muted-foreground hover:text-foreground hover:border-white/15'
                            )}
                            style={active ? { backgroundColor: 'oklch(from var(--accent) l c h / 12%)', borderColor: 'oklch(from var(--accent) l c h / 35%)' } : {}}
                          >
                            <div
                              className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white"
                              style={{ background: 'linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)' }}
                            >
                              {(m.fullName || m.username || '?')[0].toUpperCase()}
                            </div>
                            {m.fullName || m.username}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Labels */}
                {(labels.length > 0 || true) && (
                  <div>
                    <SectionLabel icon={Tag} label="Labels" />
                    <div className="flex flex-wrap gap-1.5">
                      {labels.map((l) => (
                        <button key={l.id} type="button" onClick={() => toggleLabel(l.id)} className="cursor-pointer">
                          <LabelBadge label={l} className={cn(!labelIds.includes(l.id) && 'opacity-35 hover:opacity-65 transition-opacity')} />
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowNewLabel(!showNewLabel)}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-muted-foreground border border-dashed border-white/10 hover:border-white/20 hover:text-foreground transition-all cursor-pointer"
                      >
                        <Plus className="h-2.5 w-2.5" /> New label
                      </button>
                    </div>

                    <AnimatePresence>
                      {showNewLabel && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl border border-white/8 bg-white/[0.02]">
                            <input
                              value={newLabelName}
                              onChange={(e) => setNewLabelName(e.target.value)}
                              placeholder="Label name…"
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateLabel(); } }}
                              className="flex-1 bg-transparent text-xs font-semibold text-foreground placeholder:text-muted-foreground/50 outline-none"
                            />
                            <div className="flex gap-1">
                              {LABEL_COLORS.map((c) => (
                                <button
                                  key={c} type="button"
                                  onClick={() => setNewLabelColor(c)}
                                  className="h-4 w-4 rounded-full transition-transform hover:scale-110 cursor-pointer"
                                  style={{ backgroundColor: c, outline: newLabelColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={handleCreateLabel}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white cursor-pointer transition-all hover:scale-105 active:scale-95"
                              style={{ background: 'linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)' }}
                            >
                              Add
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/5 bg-white/[0.01]">
                <span className="text-[10px] font-bold text-muted-foreground/50 select-none">Press Esc to cancel</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-white/8 bg-white/[0.03] text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim() || saving}
                    className="px-5 py-2 rounded-xl text-xs font-black text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.12) c h) 100%)', boxShadow: '0 4px 16px oklch(from var(--accent) l c h / 30%)' }}
                  >
                    {saving ? 'Creating…' : 'Create Task'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
