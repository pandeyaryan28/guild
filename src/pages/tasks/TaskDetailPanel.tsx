import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, AlignLeft, Users, Tag, ChevronDown, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  updateTask, updatePriority, updateAssignees, updateDueDate, updateLabels,
  createLabel, moveTask, STATUSES, STATUS_CONFIG, PRIORITY_CONFIG, LABEL_COLORS,
  type Task, type TaskLabel, type TaskStatus, type TaskPriority, type ActorInfo,
} from '../../lib/tasks';
import { useTaskComments, useTaskActivities, useTaskLabels } from '../../hooks/useTasks';
import { useOrgMembers } from '../../hooks/useChat';
import { LabelBadge } from '../../components/tasks/LabelBadge';
import { TaskComments } from './TaskComments';
import { TaskActivityFeed } from './TaskActivity';

interface TaskDetailPanelProps {
  task: Task | null;
  onClose: () => void;
  orgId: string;
  actor: ActorInfo;
  authorUsername: string;
}

type PanelTab = 'comments' | 'activity';

export function TaskDetailPanel({ task, onClose, orgId, actor, authorUsername }: TaskDetailPanelProps) {
  const activities = useTaskActivities(task?.id ?? null);
  const labels = useTaskLabels(orgId);
  const members = useOrgMembers(orgId);
  const [tab, setTab] = React.useState<PanelTab>('comments');

  // Inline edit states
  const [editTitle, setEditTitle] = React.useState('');
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [editDesc, setEditDesc] = React.useState('');
  const [editingDesc, setEditingDesc] = React.useState(false);

  // Dropdown open states
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [priorityOpen, setPriorityOpen] = React.useState(false);
  const [assigneeOpen, setAssigneeOpen] = React.useState(false);
  const [labelOpen, setLabelOpen] = React.useState(false);

  // New label
  const [newLabelName, setNewLabelName] = React.useState('');
  const [newLabelColor, setNewLabelColor] = React.useState(LABEL_COLORS[5]);
  const [showNewLabel, setShowNewLabel] = React.useState(false);

  React.useEffect(() => {
    if (task) { setEditTitle(task.title); setEditDesc(task.description); }
  }, [task?.id]);

  React.useEffect(() => {
    if (!task) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [task, onClose]);

  if (!task) return null;

  const taskLabels = labels.filter((l) => task.labelIds.includes(l.id));

  const saveTitle = async () => {
    if (editTitle.trim() && editTitle !== task.title) {
      await updateTask(task.id, orgId, { title: editTitle.trim() }, actor);
    }
    setEditingTitle(false);
  };

  const saveDesc = async () => {
    if (editDesc !== task.description) {
      await updateTask(task.id, orgId, { description: editDesc }, actor);
    }
    setEditingDesc(false);
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setStatusOpen(false);
    if (newStatus === task.status) return;
    await moveTask(task.id, orgId, newStatus, task.orderIndex, task.status, actor);
  };

  const handlePriorityChange = async (p: TaskPriority) => {
    setPriorityOpen(false);
    if (p === task.priority) return;
    await updatePriority(task.id, orgId, p, task.priority, actor);
  };

  const toggleAssignee = async (uid: string) => {
    const newIds = task.assigneeIds.includes(uid)
      ? task.assigneeIds.filter((id) => id !== uid)
      : [...task.assigneeIds, uid];
    await updateAssignees(task.id, orgId, newIds, task.assigneeIds, actor, task.title);
  };

  const toggleLabel = async (labelId: string) => {
    const newIds = task.labelIds.includes(labelId)
      ? task.labelIds.filter((id) => id !== labelId)
      : [...task.labelIds, labelId];
    await updateLabels(task.id, orgId, newIds, task.labelIds, actor);
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

  const due = task.dueDate?.toDate?.();
  const dueDateInput = due ? due.toISOString().split('T')[0] : '';
  const isOverdue = due && due < new Date();

  const status = STATUS_CONFIG[task.status];
  const priority = PRIORITY_CONFIG[task.priority];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex">
        {/* Backdrop */}
        <div className="flex-1 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-[480px] max-w-full flex flex-col h-full border-l border-border/40 bg-card overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start gap-3 p-5 border-b border-border/30">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditTitle(task.title); setEditingTitle(false); } }}
                  className="w-full bg-transparent text-base font-semibold text-foreground outline-none border-b border-primary/50 pb-0.5"
                />
              ) : (
                <h2
                  onClick={() => setEditingTitle(true)}
                  className="text-base font-semibold text-foreground cursor-text hover:text-primary transition-colors leading-snug"
                  title="Click to edit"
                >
                  {task.title}
                </h2>
              )}
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Meta */}
          <div className="px-5 py-4 space-y-3 border-b border-border/20">
            {/* Status + Priority */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-14">Status</span>
                <div className="relative">
                  <button
                    onClick={() => setStatusOpen(!statusOpen)}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium border transition-all hover:bg-accent/20"
                    style={{ borderColor: `${status.dot}50`, color: status.dot, backgroundColor: `${status.dot}15` }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.dot }} />
                    {status.label}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>
                  {statusOpen && (
                    <div className="absolute top-full mt-1 left-0 z-10 rounded-lg border border-border/40 bg-popover/95 backdrop-blur shadow-xl overflow-hidden min-w-[140px]">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent/40 transition-colors"
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_CONFIG[s].dot }} />
                          <span style={{ color: STATUS_CONFIG[s].dot }}>{STATUS_CONFIG[s].label}</span>
                          {task.status === s && <Check className="h-3 w-3 ml-auto text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-14">Priority</span>
                <div className="relative">
                  <button
                    onClick={() => setPriorityOpen(!priorityOpen)}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium border border-border/30 transition-all hover:bg-accent/20"
                    style={{ color: priority.color }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: priority.color }} />
                    {priority.label}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>
                  {priorityOpen && (
                    <div className="absolute top-full mt-1 left-0 z-10 rounded-lg border border-border/40 bg-popover/95 backdrop-blur shadow-xl overflow-hidden min-w-[130px]">
                      {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG[TaskPriority]][]).map(([p, cfg]) => (
                        <button
                          key={p}
                          onClick={() => handlePriorityChange(p)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent/40 transition-colors"
                          style={{ color: cfg.color }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                          {cfg.label}
                          {task.priority === p && <Check className="h-3 w-3 ml-auto text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-14">Due</span>
              <div className="flex items-center gap-1.5">
                <Calendar className={cn('h-3 w-3', isOverdue ? 'text-red-400' : 'text-muted-foreground')} />
                <input
                  type="date"
                  defaultValue={dueDateInput}
                  onBlur={(e) => handleDueDateChange(e.target.value)}
                  className={cn(
                    'bg-transparent text-xs outline-none cursor-pointer',
                    isOverdue ? 'text-red-400' : 'text-foreground',
                  )}
                />
              </div>
            </div>

            {/* Assignees */}
            <div className="flex items-start gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-14 mt-1">Assignees</span>
              <div className="flex flex-wrap gap-1.5">
                {task.assigneeIds.map((uid) => {
                  const m = members.find((x) => x.uid === uid);
                  const label = m?.fullName || m?.username || uid;
                  return (
                    <button
                      key={uid}
                      onClick={() => toggleAssignee(uid)}
                      className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] bg-primary/15 border border-primary/30 text-primary font-medium hover:bg-red-500/15 hover:border-red-400/30 hover:text-red-400 transition-colors"
                      title="Click to remove"
                    >
                      <div className="h-3.5 w-3.5 rounded-full bg-primary/30 flex items-center justify-center text-[7px] font-bold">
                        {label[0].toUpperCase()}
                      </div>
                      {label}
                    </button>
                  );
                })}
                <div className="relative">
                  <button
                    onClick={() => setAssigneeOpen(!assigneeOpen)}
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] border border-dashed border-border/40 text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors"
                  >
                    <Plus className="h-2.5 w-2.5" /> Assign
                  </button>
                  {assigneeOpen && (
                    <div className="absolute top-full mt-1 left-0 z-10 rounded-lg border border-border/40 bg-popover/95 backdrop-blur shadow-xl overflow-hidden min-w-[180px] max-h-48 overflow-y-auto">
                      {members.map((m) => (
                        <button
                          key={m.uid}
                          onClick={() => toggleAssignee(m.uid)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent/40 transition-colors"
                        >
                          <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                            {(m.fullName || m.username || '?')[0].toUpperCase()}
                          </div>
                          <span className="font-medium">{m.fullName}</span>
                          {task.assigneeIds.includes(m.uid) && <Check className="h-3 w-3 ml-auto text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Labels */}
            <div className="flex items-start gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-14 mt-0.5">Labels</span>
              <div className="flex flex-wrap gap-1.5">
                {taskLabels.map((l) => (
                  <LabelBadge key={l.id} label={l} onRemove={() => toggleLabel(l.id)} />
                ))}
                <div className="relative">
                  <button
                    onClick={() => setLabelOpen(!labelOpen)}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] border border-dashed border-border/40 text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors"
                  >
                    <Plus className="h-2.5 w-2.5" /> Label
                  </button>
                  {labelOpen && (
                    <div className="absolute top-full mt-1 left-0 z-10 rounded-lg border border-border/40 bg-popover/95 backdrop-blur shadow-xl overflow-hidden min-w-[200px] max-h-64 overflow-y-auto">
                      {labels.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => toggleLabel(l.id)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent/40 transition-colors"
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                          <span style={{ color: l.color }}>{l.name}</span>
                          {task.labelIds.includes(l.id) && <Check className="h-3 w-3 ml-auto text-primary" />}
                        </button>
                      ))}
                      <div className="border-t border-border/30 p-2">
                        {showNewLabel ? (
                          <div className="space-y-1.5">
                            <input
                              value={newLabelName}
                              onChange={(e) => setNewLabelName(e.target.value)}
                              placeholder="Label name"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateLabel(); }}
                              className="w-full rounded border border-border/30 bg-background/50 px-2 py-1 text-xs text-foreground outline-none"
                            />
                            <div className="flex gap-1 flex-wrap">
                              {LABEL_COLORS.map((c) => (
                                <button key={c} type="button" onClick={() => setNewLabelColor(c)}
                                  className="h-4 w-4 rounded-full transition-transform hover:scale-110"
                                  style={{ backgroundColor: c, outline: newLabelColor === c ? `2px solid ${c}` : 'none', outlineOffset: '1px' }}
                                />
                              ))}
                            </div>
                            <button onClick={handleCreateLabel} className="w-full rounded bg-primary text-primary-foreground text-xs py-1 hover:bg-primary/90 transition-colors">
                              Create Label
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setShowNewLabel(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-full">
                            <Plus className="h-3 w-3" /> New label
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="px-5 py-4 border-b border-border/20">
            <div className="flex items-center gap-2 mb-2">
              <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Description</span>
            </div>
            {editingDesc ? (
              <textarea
                autoFocus
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                onBlur={saveDesc}
                rows={4}
                className="w-full resize-none rounded-lg border border-primary/30 bg-background/50 px-3 py-2 text-sm text-foreground outline-none"
              />
            ) : (
              <div
                onClick={() => setEditingDesc(true)}
                className={cn(
                  'min-h-[40px] rounded-lg px-3 py-2 text-sm cursor-text transition-colors hover:bg-accent/20',
                  task.description ? 'text-foreground/80' : 'text-muted-foreground/40 italic',
                )}
              >
                {task.description || 'Click to add a description…'}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border/20">
            {(['comments', 'activity'] as PanelTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-2.5 text-xs font-medium capitalize transition-colors',
                  tab === t ? 'text-foreground border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden px-5 pb-5 pt-3 flex flex-col">
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
              <div className="flex-1 overflow-y-auto">
                <TaskActivityFeed activities={activities} />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
