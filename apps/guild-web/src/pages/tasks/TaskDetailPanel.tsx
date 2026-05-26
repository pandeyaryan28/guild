import * as React from 'react';
import { 
  X, Calendar, AlignLeft, ChevronDown, Plus, Check, ListTodo, Clock, Trash2, 
  UserPlus, UserMinus, Tag, MessageSquare, History, CheckSquare, Square,
  Folder, Target, ChevronRight, Send, Loader2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  updateTask, updatePriority, updateAssignees, updateDueDate, updateLabels,
  createTask, createLabel, moveTask, addComment, deleteTask,
  STATUSES, STATUS_CONFIG, PRIORITY_CONFIG, LABEL_COLORS,
  type Task, type TaskStatus, type TaskPriority, type ActorInfo,
} from '../../lib/tasks';
import { useTaskActivities, useTaskLabels } from '../../hooks/useTasks';
import { useAuth } from '../../hooks/useAuth';
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
  layoutMode?: 'drawer' | 'inline';
}

type PanelTab = 'comments' | 'activity';

// ── click outside custom hook ──────────────────────────────────────────────
function useClickOutside(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void, enabled: boolean) {
  React.useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [ref, onClose, enabled]);
}

// ── reusable drop down with premium card style ──────────────────────────────
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
        <div className="absolute top-full mt-2 left-0 z-40 rounded-2xl border border-border-default bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl shadow-2xl overflow-hidden min-w-[200px] py-1.5 animate-in fade-in slide-in-from-top-1.5 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

// ── visually polished property row ──────────────────────────────────────────
function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-2 border-b border-border-default/40 last:border-0">
      <span className="w-24 flex-shrink-0 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
        {children}
      </div>
    </div>
  );
}

export function TaskDetailPanel({ 
  task, 
  onClose, 
  orgId, 
  actor, 
  authorUsername, 
  layoutMode = 'drawer' 
}: Props) {
  const { userProfile } = useAuth();
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);
  const canDelete = userProfile?.role === 'owner' || userProfile?.role === 'admin';

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
        body: 'Approved! Task is marked as Completed.',
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
        body: `Requested Changes: ${rejectComment.trim()}`,
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
    if (task) {
      setEditTitle(task.title);
      setEditDesc(task.description ?? '');
      setShowConfirmDelete(false);
      setShowRejectForm(false);
      setRejectComment('');
    }
  }, [task?.id]);

  React.useEffect(() => {
    if (addingSubtask) {
      requestAnimationFrame(() => subtaskInputRef.current?.focus());
    }
  }, [addingSubtask]);

  React.useEffect(() => {
    if (!task) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !statusOpen && !priorityOpen && !assigneeOpen && !labelOpen && !showNewLabel) {
        onClose();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [task, onClose, statusOpen, priorityOpen, assigneeOpen, labelOpen, showNewLabel]);

  if (!task) return null;

  const taskLabels = labels.filter((l) => task.labelIds.includes(l.id));
  const due = task.dueDate?.toDate?.();
  const dueDateInput = due ? due.toISOString().split('T')[0] : '';
  const isOverdue = due && due < new Date() && task.status !== 'done';
  const status = STATUS_CONFIG[task.status];
  const priority = PRIORITY_CONFIG[task.priority];

  const completedSubtasksCount = subtasks.filter((s) => s.status === 'done').length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasksCount / subtasks.length) * 100) : 0;

  const saveTitle = async () => {
    if (editTitle.trim() && editTitle !== task.title) {
      await updateTask(task.id, orgId, { title: editTitle.trim() }, actor);
    }
    setEditingTitle(false);
  };

  const saveDesc = async () => {
    if (editDesc !== (task.description ?? '')) {
      await updateTask(task.id, orgId, { description: editDesc }, actor);
    }
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
    if (p !== task.priority) {
      await updatePriority(task.id, orgId, p, task.priority, actor);
    }
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
    setNewLabelName('');
    setShowNewLabel(false);
  };

  const handleDueDateChange = async (val: string) => {
    await updateDueDate(task.id, orgId, val ? new Date(val) : null, actor);
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    try {
      await deleteTask(task.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  const handleCreateSubtask = async () => {
    const t = newSubtaskTitle.trim();
    if (!t) {
      setAddingSubtask(false);
      return;
    }
    await createTask({
      orgId,
      title: t,
      description: '',
      status: 'todo',
      priority: 'none',
      assigneeIds: [],
      labelIds: [],
      dueDate: null,
      actor,
      projectId: task.projectId ?? null,
      goalId: task.goalId ?? null,
      parentTaskId: task.id,
    });
    setNewSubtaskTitle('');
    requestAnimationFrame(() => subtaskInputRef.current?.focus());
  };

  const handleToggleSubtask = async (sub: Task) => {
    const s: TaskStatus = sub.status === 'done' ? 'todo' : 'done';
    await moveTask(sub.id, orgId, s, sub.orderIndex, sub.status, actor);
  };

  const content = (
    <div 
      className="flex flex-col h-full bg-card text-foreground"
      onClick={() => {
        setStatusOpen(false);
        setPriorityOpen(false);
        setAssigneeOpen(false);
        setLabelOpen(false);
      }}
    >
      {/* ─── Top Bar / Header ─── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4.5 border-b border-border-default/80 bg-surface/50 backdrop-blur-md">
        
        {/* Left Side: Dynamic Selector Pills */}
        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <Dropdown
            open={statusOpen}
            onClose={() => setStatusOpen(false)}
            trigger={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusOpen(!statusOpen);
                }}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold border border-border-default/60 hover:bg-accent/40 hover:border-border-default transition-all shadow-sm"
                style={{ color: status.dot, borderColor: `${status.dot}40`, backgroundColor: `${status.dot}10` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.dot }} />
                <span>{status.label}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            }
          >
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange(s);
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-semibold hover:bg-accent/40 transition-colors text-left"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG[s].dot }} />
                <span style={{ color: STATUS_CONFIG[s].dot }}>{STATUS_CONFIG[s].label}</span>
                {task.status === s && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
              </button>
            ))}
          </Dropdown>

          {/* Priority Dropdown */}
          <Dropdown
            open={priorityOpen}
            onClose={() => setPriorityOpen(false)}
            trigger={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPriorityOpen(!priorityOpen);
                }}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold border border-border-default/60 hover:bg-accent/40 hover:border-border-default transition-all shadow-sm"
                style={{ color: priority.color, borderColor: `${priority.color}40`, backgroundColor: `${priority.color}10` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: priority.color }} />
                <span>{priority.label}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            }
          >
            {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, (typeof PRIORITY_CONFIG)[TaskPriority]][]).map(([p, cfg]) => (
              <button
                key={p}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePriorityChange(p);
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-semibold hover:bg-accent/40 transition-colors text-left"
                style={{ color: cfg.color }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span>{cfg.label}</span>
                {task.priority === p && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
              </button>
            ))}
          </Dropdown>
        </div>

        {/* Right Side: Global Utility Controls */}
        <div className="flex items-center gap-2.5">
          {/* Danger Zone: Trash Toggle */}
          {showConfirmDelete ? (
            <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Delete?</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTask();
                }}
                className="rounded-lg px-2.5 py-1 text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white transition-colors shadow-sm"
              >
                Confirm
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirmDelete(false);
                }}
                className="rounded-lg px-2.5 py-1 text-[10px] font-bold border border-border-default text-muted-foreground hover:bg-accent/40 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirmDelete(true);
                }}
                title="Delete Task"
                className="h-8 w-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )
          )}

          {/* Close Panel Button */}
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* ─── Main Scrollable Canvas ─── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 min-h-0">
        
        {/* Breadcrumbs & Task Pointer */}
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          <span>Workspace</span>
          <ChevronRight className="h-2.5 w-2.5" />
          <span>Task details</span>
          <ChevronRight className="h-2.5 w-2.5" />
          <span className="font-mono text-primary select-all">#{task.id.slice(-6)}</span>
        </div>

        {/* Task Title Editable Zone */}
        <div className="space-y-1">
          {editingTitle ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') {
                  setEditTitle(task.title);
                  setEditingTitle(false);
                }
              }}
              className="w-full bg-transparent text-xl font-bold tracking-tight text-foreground outline-none border-b-2 border-primary/50 pb-1 leading-snug"
            />
          ) : (
            <h2
              onClick={() => setEditingTitle(true)}
              className="text-xl font-bold tracking-tight text-foreground cursor-text hover:text-primary transition-colors leading-snug outline-none border-b border-transparent"
            >
              {task.title}
            </h2>
          )}
        </div>

        {/* Pending Review Approver Callout Panel */}
        {task.status === 'review' && task.creatorId === actor.uid && (
          <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-3 shadow-inner">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-amber-400">Milestone Review Pending</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  The assignees have submitted this task for review. Verify the completion and sign off or request changes.
                </p>
              </div>
            </div>

            {!showRejectForm ? (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleApprove}
                  disabled={submittingReview}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground hover:bg-foreground/90 disabled:opacity-50 text-background text-xs font-bold py-2 px-3 transition-all shadow-md cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve Completion
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={submittingReview}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border-default hover:bg-accent/40 disabled:opacity-50 text-foreground text-xs font-bold py-2 px-3 transition-all cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Request Changes
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Provide detailed feedback on requested modifications..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border-default bg-bg-primary px-3 py-2 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-primary/50 transition-colors shadow-inner"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectComment('');
                    }}
                    disabled={submittingReview}
                    className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!rejectComment.trim() || submittingReview}
                    className="inline-flex items-center justify-center rounded-xl bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 text-[11px] font-bold py-1.5 px-3 transition-colors cursor-pointer"
                  >
                    Send Back to Ongoing
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modular Properties Glass Card Container */}
        <div className="bg-surface/35 dark:bg-surface/10 border border-border-default/60 dark:border-border-strong rounded-2xl p-4 space-y-2 shadow-sm">
          
          {/* Assignees */}
          <PropRow label="Assignees">
            {task.assigneeIds.map((uid) => {
              const m = members.find((x) => x.uid === uid);
              const name = m?.fullName || m?.username || uid;
              return (
                <button
                  key={uid}
                  onClick={() => toggleAssignee(uid)}
                  title="Remove Assignee"
                  className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-0.5 text-[10px] font-semibold bg-primary/10 border border-primary/20 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-400 text-primary transition-all cursor-pointer"
                >
                  <div className="h-4.5 w-4.5 rounded-full bg-primary/30 flex items-center justify-center text-[8px] font-bold flex-shrink-0 text-primary">
                    {name[0].toUpperCase()}
                  </div>
                  <span className="truncate max-w-[100px]">{name}</span>
                </button>
              );
            })}
            
            <Dropdown
              open={assigneeOpen}
              onClose={() => setAssigneeOpen(false)}
              trigger={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAssigneeOpen(!assigneeOpen);
                  }}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border border-dashed border-border-default text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Assign</span>
                </button>
              }
            >
              <div className="max-h-52 overflow-y-auto py-1">
                {members.length === 0 && (
                  <p className="px-4 py-2 text-xs text-muted-foreground italic">No members found</p>
                )}
                {members.map((m) => {
                  const name = m.fullName || m.username || m.uid;
                  const selected = task.assigneeIds.includes(m.uid);
                  return (
                    <button
                      key={m.uid}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAssignee(m.uid);
                      }}
                      className={cn(
                        'flex items-center gap-2.5 w-full px-4 py-2.5 text-xs transition-colors text-left font-semibold',
                        selected ? 'bg-primary/10 text-primary' : 'text-foreground/80 hover:bg-accent/40'
                      )}
                    >
                      <div className={cn(
                        'h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0',
                        selected ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground'
                      )}>
                        {name[0].toUpperCase()}
                      </div>
                      <span className="flex-1 truncate">{name}</span>
                      {selected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </Dropdown>
          </PropRow>

          {/* Due date */}
          <PropRow label="Due Date">
            <label className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold border cursor-pointer transition-colors',
              isOverdue
                ? 'border-red-500/35 text-red-500 bg-red-500/10'
                : 'border-border-default text-muted-foreground hover:bg-accent/40'
            )}>
              <Calendar className="h-3.5 w-3.5" />
              {due ? (
                <span>
                  {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: due.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })}
                  {isOverdue && <span className="ml-1.5 text-[9px] font-extrabold uppercase tracking-wider text-red-500">Overdue</span>}
                </span>
              ) : (
                <span>Set due date</span>
              )}
              <input
                type="date"
                defaultValue={dueDateInput}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="absolute opacity-0 w-0 h-0"
              />
            </label>
            {due && (
              <button
                onClick={() => handleDueDateChange('')}
                className="inline-flex items-center justify-center h-5 w-5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs cursor-pointer font-extrabold"
              >
                ×
              </button>
            )}
          </PropRow>

          {/* Labels */}
          <PropRow label="Labels">
            {taskLabels.map((l) => (
              <LabelBadge key={l.id} label={l} onRemove={() => toggleLabel(l.id)} />
            ))}
            
            <Dropdown
              open={labelOpen}
              onClose={() => {
                setLabelOpen(false);
                setShowNewLabel(false);
                setNewLabelName('');
              }}
              trigger={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLabelOpen(!labelOpen);
                  }}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border border-dashed border-border-default text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Label</span>
                </button>
              }
            >
              <div className="max-h-56 overflow-y-auto py-1">
                {labels.map((l) => (
                  <button
                    key={l.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLabel(l.id);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-semibold hover:bg-accent/40 transition-colors text-left"
                  >
                    <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                    <span style={{ color: l.color }} className="flex-1 truncate">{l.name}</span>
                    {task.labelIds.includes(l.id) && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-border-default/60 p-2.5">
                {showNewLabel ? (
                  <div className="space-y-2">
                    <input
                      value={newLabelName}
                      autoFocus
                      onChange={(e) => setNewLabelName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateLabel();
                        e.stopPropagation();
                      }}
                      placeholder="Label name"
                      className="w-full rounded-lg border border-border-default bg-bg-primary px-2.5 py-1 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-primary/50 transition-colors shadow-inner"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {LABEL_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewLabelColor(c);
                          }}
                          className="h-4 w-4 rounded-full transition-transform hover:scale-110 cursor-pointer"
                          style={{ backgroundColor: c, outline: newLabelColor === c ? `2px solid ${c}` : 'none', outlineOffset: '1.5px' }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateLabel();
                      }}
                      className="w-full rounded-xl bg-foreground hover:bg-foreground/90 text-background text-[11px] font-bold py-1.5 transition-colors cursor-pointer"
                    >
                      Create Label
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNewLabel(true);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground w-full py-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Create new label</span>
                  </button>
                )}
              </div>
            </Dropdown>
          </PropRow>
        </div>

        {/* Task Description Canvas */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlignLeft className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Description</span>
          </div>
          {editingDesc ? (
            <textarea
              autoFocus
              value={editDesc}
              rows={4}
              onChange={(e) => setEditDesc(e.target.value)}
              onBlur={saveDesc}
              className="w-full resize-none rounded-2xl border border-primary/45 bg-accent/10 px-3.5 py-2.5 text-sm text-foreground outline-none leading-relaxed shadow-inner"
            />
          ) : (
            <div
              onClick={() => setEditingDesc(true)}
              className={cn(
                'min-h-[44px] rounded-2xl px-3.5 py-2.5 text-sm cursor-text transition-colors border border-border-default/20 bg-accent/5 hover:bg-accent/25 hover:border-border-default',
                task.description ? 'text-foreground/80 leading-relaxed' : 'text-muted-foreground italic'
              )}
            >
              {task.description || 'Add a detailed description for this task…'}
            </div>
          )}
        </div>

        {/* Subtask Milestones Tracker Checklist */}
        <div className="space-y-4 bg-surface/30 dark:bg-surface/5 border border-border-default/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ListTodo className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Subtask Milestones</span>
            </div>
            
            <button
              onClick={() => setAddingSubtask(true)}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:underline cursor-pointer"
            >
              <Plus className="h-3 w-3 animate-pulse" />
              <span>Add</span>
            </button>
          </div>

          {/* Micro-animated Progress Track */}
          {subtasks.length > 0 && (
            <div className="space-y-1.5">
              <div className="h-1.5 w-full bg-bg-tertiary/50 rounded-full overflow-hidden shadow-inner relative">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.3)] transition-all duration-500 ease-out"
                  style={{ width: `${subtaskProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[9px] font-mono text-muted-foreground/80 uppercase">
                <span>{completedSubtasksCount} of {subtasks.length} milestones complete</span>
                <span className="font-bold text-foreground">{subtaskProgress}%</span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {subtasks.map((sub) => {
              const done = sub.status === 'done';
              return (
                <div 
                  key={sub.id} 
                  className="flex items-center gap-3 py-2 px-2.5 rounded-xl hover:bg-accent/20 transition-colors group"
                >
                  <button
                    onClick={() => handleToggleSubtask(sub)}
                    className={cn(
                      'flex-shrink-0 h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer',
                      done ? 'bg-primary border-primary' : 'border-border-default hover:border-primary/60'
                    )}
                  >
                    {done && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                  </button>
                  <span className={cn(
                    'flex-1 text-xs font-semibold truncate',
                    done ? 'line-through text-muted-foreground' : 'text-foreground/80'
                  )}>
                    {sub.title}
                  </span>
                </div>
              );
            })}

            {addingSubtask && (
              <div className="flex items-center gap-3 py-2 px-2.5">
                <div className="flex-shrink-0 h-4.5 w-4.5 rounded-full border-2 border-dashed border-border-default" />
                <input
                  ref={subtaskInputRef}
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Write milestone title…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateSubtask();
                    if (e.key === 'Escape') {
                      setNewSubtaskTitle('');
                      setAddingSubtask(false);
                    }
                  }}
                  onBlur={() => {
                    if (!newSubtaskTitle.trim()) {
                      setAddingSubtask(false);
                    }
                  }}
                  className="flex-1 bg-transparent text-xs font-semibold text-foreground placeholder:text-text-muted outline-none border-b border-primary/50 pb-0.5"
                />
              </div>
            )}

            {subtasks.length === 0 && !addingSubtask && (
              <p className="text-xs text-muted-foreground italic py-2 text-center select-none">No active milestones defined.</p>
            )}
          </div>
        </div>

        {/* Tabbed Interactive Timeline Section */}
        <div className="space-y-4 pt-2">
          {/* Segmented slider pill container */}
          <div className="flex p-0.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60">
            {(['comments', 'activity'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer',
                  tab === t
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t === 'comments' ? 'Discussion' : 'Audit Trail'}
              </button>
            ))}
          </div>

          {/* Dynamic Tab Body */}
          <div className="min-h-[200px]">
            {tab === 'comments' ? (
              <TaskComments 
                taskId={task.id} 
                orgId={orgId} 
                actor={actor}
                authorUsername={authorUsername}
                notifyIds={[task.creatorId, ...task.assigneeIds].filter(Boolean)}
                taskTitle={task.title} 
              />
            ) : (
              <TaskActivityFeed activities={activities} />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (layoutMode === 'drawer') {
    return (
      <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
        {/* Darkened blur backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-[4px] pointer-events-auto"
          onClick={onClose}
        />
        {/* Smooth spring sliding sheet panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative z-10 w-full sm:w-[500px] h-full border-l border-border-default/80 bg-card shadow-2xl flex flex-col pointer-events-auto"
        >
          {content}
        </motion.div>
      </div>
    );
  }

  return content;
}
