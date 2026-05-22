import * as React from 'react';
import { X, Calendar, AlignLeft, ChevronDown, Plus, Check, ListTodo, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  updateTask, updatePriority, updateAssignees, updateDueDate, updateLabels,
  createTask, createLabel, moveTask, addComment,
  STATUSES, STATUS_CONFIG, PRIORITY_CONFIG, LABEL_COLORS,
  type Task, type TaskStatus, type TaskPriority, type ActorInfo,
} from '../../lib/tasks';
import { useTaskActivities, useTaskLabels } from '../../hooks/useTasks';
import { useTasks } from '../../hooks/useTasks';
import { useOrgMembers } from '../../hooks/useChat';
import { LabelBadge } from '../../components/tasks/LabelBadge';
import { TaskComments } from './TaskComments';
import { TaskActivityFeed } from './TaskActivity';

interface Props {
  task: Task | null;
  onClose: () => void;
  orgId: string;
  actor: ActorInfo;
  authorUsername: string;
}

type PanelTab = 'comments' | 'activity';

// ── tiny hook: close a floating panel when clicking outside ──────────────────
function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void, enabled: boolean) {
  React.useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [ref, onClose, enabled]);
}

// ── reusable dropdown wrapper ────────────────────────────────────────────────
function Dropdown({ trigger, children, open, onClose }: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose, open);
  return (
    <div ref={ref} className="relative">
      {trigger}
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-30 rounded-xl border border-border-default bg-popover shadow-2xl overflow-hidden min-w-[160px] animate-in fade-in slide-in-from-top-1 duration-150">
          {children}
        </div>
      )}
    </div>
  );
}

// ── property row ─────────────────────────────────────────────────────────────
function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 group">
      <span className="w-20 flex-shrink-0 text-[11px] font-medium text-text-muted pt-0.5 uppercase tracking-wide">
        {label}
      </span>
      <div className="flex-1 min-w-0 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function TaskDetailPanel({ task, onClose, orgId, actor, authorUsername }: Props) {
  const activities = useTaskActivities(task?.id ?? null);
  const labels = useTaskLabels(orgId);
  const members = useOrgMembers(orgId);
  const { tasks: allTasks } = useTasks(orgId);
  const [tab, setTab] = React.useState<PanelTab>('comments');

  const subtasks = allTasks.filter((t) => t.parentTaskId === task?.id);
  const [newSubtaskTitle, setNewSubtaskTitle] = React.useState('');
  const [addingSubtask, setAddingSubtask] = React.useState(false);
  const subtaskInputRef = React.useRef<HTMLInputElement>(null);

  const [rejectComment, setRejectComment] = React.useState('');
  const [showRejectForm, setShowRejectForm] = React.useState(false);
  const [submittingReview, setSubmittingReview] = React.useState(false);

  const handleApprove = async () => {
    if (!task || submittingReview) return;
    setSubmittingReview(true);
    try {
      await moveTask(task.id, orgId, 'done', task.orderIndex, task.status, actor);
      await addComment({
        taskId: task.id,
        orgId,
        authorId: actor.uid,
        authorName: actor.name,
        authorUsername,
        body: 'Approved! Task is marked as Done.',
        mentions: [],
        notifyIds: task.assigneeIds.filter((id) => id !== actor.uid),
        taskTitle: task.title,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReject = async () => {
    if (!task || !rejectComment.trim() || submittingReview) return;
    setSubmittingReview(true);
    try {
      await addComment({
        taskId: task.id,
        orgId,
        authorId: actor.uid,
        authorName: actor.name,
        authorUsername,
        body: `Re-opened: ${rejectComment.trim()}`,
        mentions: [],
        notifyIds: task.assigneeIds.filter((id) => id !== actor.uid),
        taskTitle: task.title,
      });
      await moveTask(task.id, orgId, 'todo', task.orderIndex, task.status, actor);
      setRejectComment('');
      setShowRejectForm(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const [editTitle, setEditTitle] = React.useState('');
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [editDesc, setEditDesc] = React.useState('');
  const [editingDesc, setEditingDesc] = React.useState(false);

  const [statusOpen, setStatusOpen] = React.useState(false);
  const [priorityOpen, setPriorityOpen] = React.useState(false);
  const [assigneeOpen, setAssigneeOpen] = React.useState(false);
  const [labelOpen, setLabelOpen] = React.useState(false);

  const [newLabelName, setNewLabelName] = React.useState('');
  const [newLabelColor, setNewLabelColor] = React.useState(LABEL_COLORS[5]);
  const [showNewLabel, setShowNewLabel] = React.useState(false);

  React.useEffect(() => {
    if (task) { setEditTitle(task.title); setEditDesc(task.description ?? ''); }
  }, [task?.id]);

  React.useEffect(() => {
    if (addingSubtask) subtaskInputRef.current?.focus();
  }, [addingSubtask]);

  React.useEffect(() => {
    if (!task) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [task, onClose]);

  if (!task) return null;

  const taskLabels = labels.filter((l) => task.labelIds.includes(l.id));
  const due = task.dueDate?.toDate?.();
  const dueDateInput = due ? due.toISOString().split('T')[0] : '';
  const isOverdue = due && due < new Date() && task.status !== 'done';
  const status = STATUS_CONFIG[task.status];
  const priority = PRIORITY_CONFIG[task.priority];

  const saveTitle = async () => {
    if (editTitle.trim() && editTitle !== task.title)
      await updateTask(task.id, orgId, { title: editTitle.trim() }, actor);
    setEditingTitle(false);
  };

  const saveDesc = async () => {
    if (editDesc !== (task.description ?? ''))
      await updateTask(task.id, orgId, { description: editDesc }, actor);
    setEditingDesc(false);
  };

  const handleStatusChange = async (s: TaskStatus) => {
    setStatusOpen(false);
    if (s !== task.status) {
      let finalStatus = s;
      if (s === 'done' && task.creatorId !== actor.uid) {
        finalStatus = 'review';
      }
      await moveTask(task.id, orgId, finalStatus, task.orderIndex, task.status, actor);
    }
  };

  const handlePriorityChange = async (p: TaskPriority) => {
    setPriorityOpen(false);
    if (p !== task.priority) await updatePriority(task.id, orgId, p, task.priority, actor);
  };

  const toggleAssignee = async (uid: string) => {
    const next = task.assigneeIds.includes(uid)
      ? task.assigneeIds.filter((id) => id !== uid)
      : [...task.assigneeIds, uid];
    await updateAssignees(task.id, orgId, next, task.assigneeIds, actor, task.title);
  };

  const toggleLabel = async (labelId: string) => {
    const next = task.labelIds.includes(labelId)
      ? task.labelIds.filter((id) => id !== labelId)
      : [...task.labelIds, labelId];
    await updateLabels(task.id, orgId, next, task.labelIds, actor);
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    const id = await createLabel(orgId, newLabelName.trim(), newLabelColor);
    await updateLabels(task.id, orgId, [...task.labelIds, id], task.labelIds, actor);
    setNewLabelName(''); setShowNewLabel(false);
  };

  const handleDueDateChange = async (val: string) => {
    await updateDueDate(task.id, orgId, val ? new Date(val) : null, actor);
  };

  const handleCreateSubtask = async () => {
    const t = newSubtaskTitle.trim();
    if (!t) { setAddingSubtask(false); return; }
    await createTask({
      orgId, title: t, description: '', status: 'todo', priority: 'none',
      assigneeIds: [], labelIds: [], dueDate: null, actor,
      projectId: task.projectId ?? null, goalId: task.goalId ?? null,
      parentTaskId: task.id,
    });
    setNewSubtaskTitle('');
    subtaskInputRef.current?.focus();
  };

  const handleToggleSubtask = async (sub: Task) => {
    const s: TaskStatus = sub.status === 'done' ? 'todo' : 'done';
    await moveTask(sub.id, orgId, s, sub.orderIndex, sub.status, actor);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" onClick={() => { setStatusOpen(false); setPriorityOpen(false); setAssigneeOpen(false); setLabelOpen(false); }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border-default">
        {/* Status chip + close */}
        <div className="flex items-center justify-between mb-3">
          <Dropdown
            open={statusOpen}
            onClose={() => setStatusOpen(false)}
            trigger={
              <button
                onClick={(e) => { e.stopPropagation(); setStatusOpen(!statusOpen); }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-all hover:opacity-80"
                style={{ borderColor: `${status.dot}50`, color: status.dot, backgroundColor: `${status.dot}18` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.dot }} />
                {status.label}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            }
          >
            {STATUSES.map((s) => (
              <button key={s} onClick={(e) => { e.stopPropagation(); handleStatusChange(s); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent/40 transition-colors">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_CONFIG[s].dot }} />
                <span style={{ color: STATUS_CONFIG[s].dot }}>{STATUS_CONFIG[s].label}</span>
                {task.status === s && <Check className="h-3 w-3 ml-auto text-primary" />}
              </button>
            ))}
          </Dropdown>

          <button onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Title */}
        {editingTitle ? (
          <input autoFocus value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditTitle(task.title); setEditingTitle(false); } }}
            className="w-full bg-transparent text-[17px] font-semibold text-foreground outline-none border-b-2 border-primary/40 pb-0.5 leading-snug"
          />
        ) : (
          <h2 onClick={() => setEditingTitle(true)}
            className="text-[17px] font-semibold text-foreground cursor-text hover:text-primary/90 transition-colors leading-snug">
            {task.title}
          </h2>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* Review Banner */}
        {task.status === 'review' && task.creatorId === actor.uid && (
          <div className="mx-5 mt-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-amber-400">Task Pending Review</h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  The assignee has completed this task. Review their work and approve it or request changes.
                </p>
              </div>
            </div>

            {!showRejectForm ? (
              <div className="flex gap-2.5 mt-1">
                <button
                  onClick={handleApprove}
                  disabled={submittingReview}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold py-2 px-3 transition-colors shadow-sm"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve & Done
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={submittingReview}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 disabled:opacity-50 text-red-400 text-xs font-semibold py-2 px-3 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Request Changes
                </button>
              </div>
            ) : (
              <div className="space-y-2 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Explain what needs to be changed..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-primary/50"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowRejectForm(false); setRejectComment(''); }}
                    disabled={submittingReview}
                    className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[11px] font-semibold text-text-muted hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!rejectComment.trim() || submittingReview}
                    className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 text-[11px] font-semibold py-1.5 px-3 transition-colors"
                  >
                    Resend Task
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Properties block */}
        <div className="px-5 py-2 border-b border-border-default divide-y divide-border-default/50">

          {/* Priority */}
          <PropRow label="Priority">
            <Dropdown
              open={priorityOpen}
              onClose={() => setPriorityOpen(false)}
              trigger={
                <button
                  onClick={(e) => { e.stopPropagation(); setPriorityOpen(!priorityOpen); }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium border border-border-default hover:bg-accent/30 transition-colors"
                  style={{ color: priority.color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: priority.color }} />
                  {priority.label}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
              }
            >
              {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, (typeof PRIORITY_CONFIG)[TaskPriority]][]).map(([p, cfg]) => (
                <button key={p} onClick={(e) => { e.stopPropagation(); handlePriorityChange(p); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent/40 transition-colors"
                  style={{ color: cfg.color }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                  {cfg.label}
                  {task.priority === p && <Check className="h-3 w-3 ml-auto text-primary" />}
                </button>
              ))}
            </Dropdown>
          </PropRow>

          {/* Due date */}
          <PropRow label="Due date">
            <label className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium border cursor-pointer transition-colors hover:bg-accent/30',
              isOverdue ? 'border-red-400/40 text-red-400 bg-red-400/10' : 'border-border-default text-foreground/70',
            )}>
              <Calendar className="h-3 w-3" />
              {due
                ? due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: due.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })
                : <span className="text-text-muted">Add date</span>}
              <input type="date" defaultValue={dueDateInput}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="absolute opacity-0 w-0 h-0" />
            </label>
            {due && (
              <button onClick={() => handleDueDateChange('')}
                className="inline-flex items-center justify-center h-6 w-6 rounded-md text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors text-xs">
                ×
              </button>
            )}
          </PropRow>

          {/* Assignees */}
          <PropRow label="Assignees">
            {task.assigneeIds.map((uid) => {
              const m = members.find((x) => x.uid === uid);
              const name = m?.fullName || m?.username || uid;
              return (
                <button key={uid} onClick={() => toggleAssignee(uid)} title="Click to remove"
                  className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 text-[11px] font-medium bg-primary/12 border border-primary/25 text-primary hover:bg-red-500/12 hover:border-red-400/30 hover:text-red-400 transition-all">
                  <div className="h-4 w-4 rounded-full bg-primary/30 flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                    {name[0].toUpperCase()}
                  </div>
                  {name}
                </button>
              );
            })}
            <Dropdown
              open={assigneeOpen}
              onClose={() => setAssigneeOpen(false)}
              trigger={
                <button onClick={(e) => { e.stopPropagation(); setAssigneeOpen(!assigneeOpen); }}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border border-dashed border-border-default text-text-muted hover:border-primary/40 hover:text-primary transition-colors">
                  <Plus className="h-3 w-3" /> Assign
                </button>
              }
            >
              <div className="max-h-52 overflow-y-auto py-1">
                {members.length === 0 && (
                  <p className="px-3 py-2 text-xs text-text-muted">No members</p>
                )}
                {members.map((m) => {
                  const name = m.fullName || m.username || m.uid;
                  const selected = task.assigneeIds.includes(m.uid);
                  return (
                    <button key={m.uid} onClick={(e) => { e.stopPropagation(); toggleAssignee(m.uid); }}
                      className={cn('flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors text-left',
                        selected ? 'bg-primary/10 text-primary' : 'text-foreground/80 hover:bg-accent/40')}>
                      <div className={cn('h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0',
                        selected ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground')}>
                        {name[0].toUpperCase()}
                      </div>
                      <span className="flex-1 font-medium truncate">{name}</span>
                      {selected && <Check className="h-3 w-3 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </Dropdown>
          </PropRow>

          {/* Labels */}
          <PropRow label="Labels">
            {taskLabels.map((l) => (
              <LabelBadge key={l.id} label={l} onRemove={() => toggleLabel(l.id)} />
            ))}
            <Dropdown
              open={labelOpen}
              onClose={() => { setLabelOpen(false); setShowNewLabel(false); setNewLabelName(''); }}
              trigger={
                <button onClick={(e) => { e.stopPropagation(); setLabelOpen(!labelOpen); }}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border border-dashed border-border-default text-text-muted hover:border-primary/40 hover:text-primary transition-colors">
                  <Plus className="h-3 w-3" /> Label
                </button>
              }
            >
              <div className="max-h-56 overflow-y-auto py-1">
                {labels.map((l) => (
                  <button key={l.id} onClick={(e) => { e.stopPropagation(); toggleLabel(l.id); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent/40 transition-colors">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                    <span style={{ color: l.color }} className="flex-1 text-left">{l.name}</span>
                    {task.labelIds.includes(l.id) && <Check className="h-3 w-3 text-primary" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-border-default p-2">
                {showNewLabel ? (
                  <div className="space-y-2">
                    <input value={newLabelName} autoFocus
                      onChange={(e) => setNewLabelName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateLabel(); e.stopPropagation(); }}
                      placeholder="Label name"
                      className="w-full rounded-lg border border-border-default bg-bg-primary px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/50" />
                    <div className="flex gap-1 flex-wrap">
                      {LABEL_COLORS.map((c) => (
                        <button key={c} type="button" onClick={(e) => { e.stopPropagation(); setNewLabelColor(c); }}
                          className="h-4 w-4 rounded-full transition-transform hover:scale-110"
                          style={{ backgroundColor: c, outline: newLabelColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
                      ))}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleCreateLabel(); }}
                      className="w-full rounded-lg bg-primary text-primary-foreground text-xs py-1.5 hover:bg-primary/90 transition-colors font-medium">
                      Create
                    </button>
                  </div>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); setShowNewLabel(true); }}
                    className="flex items-center gap-1.5 text-xs text-text-muted hover:text-foreground w-full py-0.5">
                    <Plus className="h-3 w-3" /> New label
                  </button>
                )}
              </div>
            </Dropdown>
          </PropRow>
        </div>

        {/* Description */}
        <div className="px-5 py-4 border-b border-border-default">
          <div className="flex items-center gap-2 mb-2">
            <AlignLeft className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-xs font-medium text-text-muted">Description</span>
          </div>
          {editingDesc ? (
            <textarea autoFocus value={editDesc} rows={4}
              onChange={(e) => setEditDesc(e.target.value)}
              onBlur={saveDesc}
              className="w-full resize-none rounded-xl border border-primary/30 bg-accent/20 px-3 py-2 text-sm text-foreground outline-none leading-relaxed" />
          ) : (
            <div onClick={() => setEditingDesc(true)}
              className={cn('min-h-[36px] rounded-xl px-3 py-2 text-sm cursor-text transition-colors hover:bg-accent/20',
                task.description ? 'text-foreground/80' : 'text-text-muted italic')}>
              {task.description || 'Add a description…'}
            </div>
          )}
        </div>

        {/* Subtasks */}
        <div className="px-5 py-4 border-b border-border-default">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListTodo className="h-3.5 w-3.5 text-text-muted" />
              <span className="text-xs font-medium text-text-muted">Subtasks</span>
              {subtasks.length > 0 && (
                <span className="text-[10px] text-text-muted">
                  {subtasks.filter((s) => s.status === 'done').length}/{subtasks.length}
                </span>
              )}
            </div>
            <button onClick={() => setAddingSubtask(true)}
              className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-primary transition-colors">
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>

          <div className="space-y-1">
            {subtasks.map((sub) => {
              const done = sub.status === 'done';
              return (
                <div key={sub.id} className="flex items-center gap-2.5 py-1 group rounded-lg hover:bg-accent/20 px-1 transition-colors">
                  <button onClick={() => handleToggleSubtask(sub)}
                    className={cn('flex-shrink-0 h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all',
                      done ? 'bg-primary border-primary' : 'border-border-default hover:border-primary/60')}>
                    {done && (
                      <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span className={cn('flex-1 text-xs', done ? 'line-through text-text-muted' : 'text-foreground/80')}>
                    {sub.title}
                  </span>
                </div>
              );
            })}

            {addingSubtask && (
              <div className="flex items-center gap-2.5 py-1 px-1">
                <div className="flex-shrink-0 h-4 w-4 rounded-full border-2 border-dashed border-border-default" />
                <input ref={subtaskInputRef} value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Subtask title…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateSubtask();
                    if (e.key === 'Escape') { setNewSubtaskTitle(''); setAddingSubtask(false); }
                  }}
                  onBlur={() => { if (!newSubtaskTitle.trim()) setAddingSubtask(false); }}
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-text-muted outline-none border-b border-primary/30 pb-0.5" />
              </div>
            )}

            {subtasks.length === 0 && !addingSubtask && (
              <p className="text-xs text-text-muted italic px-1">No subtasks yet</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-5 border-b border-border-default">
          {(['comments', 'activity'] as PanelTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('py-3 px-1 mr-5 text-xs font-medium capitalize border-b-2 transition-colors',
                tab === t ? 'text-foreground border-primary' : 'text-text-muted border-transparent hover:text-foreground')}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-5 pb-5 pt-3">
          {tab === 'comments' ? (
            <TaskComments taskId={task.id} orgId={orgId} actor={actor}
              authorUsername={authorUsername}
              notifyIds={[task.creatorId, ...task.assigneeIds].filter(Boolean)}
              taskTitle={task.title} />
          ) : (
            <TaskActivityFeed activities={activities} />
          )}
        </div>
      </div>
    </div>
  );
}
