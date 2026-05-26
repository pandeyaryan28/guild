import * as React from 'react';
import { Timestamp } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Loader2,
  Trash2,
  Check,
  ChevronDown,
  Target,
  Clock,
  Sparkles,
  Settings,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import { useGoal } from '../../hooks/useGoals';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { TaskDetailPanel } from '../tasks/TaskDetailPanel';
import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { useOrgMembers } from '../../hooks/useChat';
import { moveTask, deleteTask, type Task, type TaskStatus } from '../../lib/tasks';
import { deleteGoal, updateGoal } from '../../lib/goals';

export function GoalDetailPage() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const orgId = userProfile?.organizationId;
  const { goal, loading: goalLoading } = useGoal(goalId);
  const { projects } = useProjects(orgId);
  const { columns, loading: tasksLoading } = useTasks(orgId, goalId ? { goalId } : undefined);
  const members = useOrgMembers(orgId);

  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [showCompleted, setShowCompleted] = React.useState(false);

  const [isEditing, setIsEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState('');
  const [editDesc, setEditDesc] = React.useState('');
  const [editProjId, setEditProjId] = React.useState('');
  const [editDate, setEditDate] = React.useState('');
  const [editRecurrence, setEditRecurrence] = React.useState<'none' | 'daily' | 'weekly' | 'monthly' | 'custom'>('none');
  const [editCustomDays, setEditCustomDays] = React.useState<number>(7);

  React.useEffect(() => {
    if (goal) {
      setEditTitle(goal.title);
      setEditDesc(goal.description || '');
      setEditProjId(goal.projectId || 'none');
      setEditDate(goal.targetDate ? new Date((goal.targetDate as any).seconds * 1000).toISOString().split('T')[0] : '');
      setEditRecurrence(goal.recurrence || 'none');
      setEditCustomDays(goal.customDays || 7);
    }
  }, [goal, isEditing]);

  const actor = React.useMemo(
    () => ({ uid: user?.uid ?? '', name: userProfile?.fullName || user?.displayName || 'Unknown' }),
    [user, userProfile],
  );

  // Member maps and helpers
  const memberMap = React.useMemo(() => {
    const map = new Map<string, any>();
    members.forEach((m) => map.set(m.uid, m));
    return map;
  }, [members]);

  const getInitials = (userId: string) => {
    const m = memberMap.get(userId);
    if (!m) return 'U';
    return m.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (userId: string) => {
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-indigo-500/10 border-indigo-500/25 text-indigo-650 dark:text-indigo-400',
      'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
      'bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-400',
      'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
      'bg-pink-500/10 border-pink-500/25 text-pink-600 dark:text-pink-400',
    ];
    return colors[hash % colors.length];
  };

  const allTasks = React.useMemo(() => {
    const all: Task[] = [];
    for (const col of columns.values()) {
      all.push(...col);
    }
    // Filter root level goal tasks only
    return all.filter(t => !t.parentTaskId);
  }, [columns]);

  const activeTasks = React.useMemo(() => allTasks.filter(t => t.status !== 'done'), [allTasks]);
  const completedTasks = React.useMemo(() => allTasks.filter(t => t.status === 'done'), [allTasks]);

  const linkedProject = React.useMemo(() => {
    if (!goal || !goal.projectId) return null;
    return projects.find(p => p.id === goal.projectId);
  }, [goal, projects]);

  const handleToggleTaskStatus = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (!orgId) return;
    const oldStatus = task.status;
    const newStatus: TaskStatus = oldStatus === 'done' ? 'todo' : 'done';
    try {
      await moveTask(task.id, orgId, newStatus, task.orderIndex || 1000, oldStatus, actor);
    } catch (err) {
      console.error('Failed to toggle task status:', err);
    }
  };

  const handleDeleteTaskItem = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (confirm('Delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };

  const handleDeleteGoalItem = async () => {
    if (confirm('Delete this goal? associated tasks will be unlinked.')) {
      try {
        await deleteGoal(goalId!);
        navigate('/workspace');
      } catch (err) {
        console.error('Failed to delete goal:', err);
      }
    }
  };

  const handleToggleGoalStatus = async () => {
    if (!goal) return;
    const nextStatus = goal.status === 'completed' ? 'active' : 'completed';
    try {
      await updateGoal(goal.id, { status: nextStatus });
    } catch (err) {
      console.error('Failed to toggle goal status:', err);
    }
  };

  const handleSaveGoal = async () => {
    if (!editTitle.trim()) return;
    try {
      await updateGoal(goalId!, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        projectId: editProjId === 'none' ? null : editProjId,
        targetDate: editDate ? Timestamp.fromDate(new Date(editDate)) : null,
        recurrence: editRecurrence,
        customDays: editRecurrence === 'custom' ? Number(editCustomDays) : null,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update goal:', err);
    }
  };

  if (!orgId) return null;

  if (goalLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-[11px] text-muted-foreground font-semibold tracking-wide animate-pulse">Loading goal data...</p>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 text-center">
        <p className="text-xs text-muted-foreground font-semibold">Goal focus not found.</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/workspace')} className="h-9 border border-border-default/60 rounded-xl px-4 font-bold text-xs">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Return to Workspace
        </Button>
      </div>
    );
  }

  const progressRate = goal.progressRollup ?? 0;

  return (
    <div className="h-full w-full bg-transparent p-1.5 flex flex-col min-h-0 overflow-hidden gap-5">
      
      {/* ─── Premium Glassmorphic Obsidian Card ─── */}
      <div className="flex-1 min-h-0 border border-border-default/80 bg-surface/50 dark:bg-surface/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col z-10 relative">
        
        {/* Header Section */}
        <div className="p-6 border-b border-border-default/45 flex items-center justify-between shrink-0 flex-wrap gap-4 bg-surface/10">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => navigate('/workspace')}
              className="w-9 h-9 rounded-xl border border-border-default/60 hover:bg-bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-all active:scale-90 shrink-0"
              title="Return to Workspace"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleGoalStatus}
                  className={cn(
                    "w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                    goal.status === 'completed'
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border-default bg-bg-primary/50 hover:border-emerald-500"
                  )}
                  title={goal.status === 'completed' ? "Mark Goal Active" : "Mark Goal Completed"}
                >
                  {goal.status === 'completed' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Target className="w-3.5 h-3.5 text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.2)]" />
                  )}
                </button>
                <h1 className={cn("text-sm font-black tracking-tight truncate", goal.status === 'completed' ? "text-muted-foreground line-through decoration-emerald-500/50" : "text-foreground")}>
                  {goal.title}
                </h1>
              </div>
              {goal.description && (
                <p className="text-[10px] text-muted-foreground mt-1 max-w-2xl font-medium leading-relaxed truncate">{goal.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-auto">
            {/* Owner Employee Avatar */}
            {goal.ownerId && (
              <div className="flex items-center gap-2">
                <div className={cn("w-7 h-7 rounded-full border flex items-center justify-center font-bold text-[9px] shrink-0", getAvatarColor(goal.ownerId))} title={`Assigned Employee: ${memberMap.get(goal.ownerId)?.fullName || 'Member'}`}>
                  {getInitials(goal.ownerId)}
                </div>
                <div className="flex flex-col text-left justify-center hidden sm:flex">
                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none">Assignee</span>
                  <span className="text-[10px] font-bold text-foreground mt-0.5 leading-none truncate max-w-24">
                    {memberMap.get(goal.ownerId)?.fullName || 'Employee'}
                  </span>
                </div>
              </div>
            )}

            <div className="h-6 w-[1px] bg-border-default/45 hidden sm:block" />

            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] hover:bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-450 px-4 py-2 text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-90 shrink-0 cursor-pointer",
                isEditing
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border-default/60 hover:bg-bg-secondary text-muted-foreground hover:text-foreground"
              )}
              title="Goal Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            <button
              onClick={handleDeleteGoalItem}
              className="w-9 h-9 rounded-xl border border-border-default/60 hover:bg-bg-secondary text-muted-foreground hover:text-red-400 flex items-center justify-center transition-all active:scale-90 shrink-0"
              title="Delete Goal Focus"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Spatial Canvas */}
        <div className="flex-1 overflow-y-auto aether-scroll p-6 space-y-6">
          
          {/* Metadata Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Real-time rollup progress */}
            <div className="md:col-span-2 p-4 rounded-xl border border-border-default/60 bg-bg-secondary/20 flex flex-col justify-between gap-3 shadow-sm">
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Goal Rollup Progress</span>
              <div className="space-y-1.5">
                <div className="flex items-end justify-between">
                  <span className="text-xl font-black font-mono text-foreground leading-none">{progressRate}%</span>
                  <span className="text-[9px] text-muted-foreground font-semibold">({completedTasks.length}/{allTasks.length} tasks completed)</span>
                </div>
                <div className="w-full bg-bg-secondary rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressRate}%` }} />
                </div>
              </div>
            </div>

            {/* Project Alignment */}
            <div className="p-4 rounded-xl border border-border-default/60 bg-bg-secondary/20 flex flex-col justify-between gap-3 shadow-sm">
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Initiative Link</span>
              <div className="flex flex-col gap-1">
                {linkedProject ? (
                  <>
                    <span 
                      onClick={() => navigate(`/projects/${linkedProject.id}`)}
                      className="text-xs font-black text-accent hover:underline cursor-pointer truncate"
                      style={{ color: 'var(--accent)' }}
                    >
                      #{linkedProject.name}
                    </span>
                    <span className="text-[8px] text-muted-foreground font-semibold leading-relaxed line-clamp-2">{linkedProject.description || 'No project details.'}</span>
                  </>
                ) : (
                  <span className="text-xs italic font-bold text-muted-foreground">Standalone Goal</span>
                )}
              </div>
            </div>

            {/* Target Date & Horizon */}
            <div className="p-4 rounded-xl border border-border-default/60 bg-bg-secondary/20 flex flex-col justify-between gap-3 shadow-sm">
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Horizon & Timeline</span>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-border-default text-emerald-600 dark:text-emerald-450 bg-emerald-500/[0.04] w-max">
                  {goal.horizon === 'short_term' ? 'Short Term' : 'Long Term'}
                </span>
                {goal.targetDate && (
                  <span className="text-[9px] text-muted-foreground font-mono font-semibold mt-1">
                    Target: {new Date(goal.targetDate instanceof Date ? goal.targetDate : (goal.targetDate as any).seconds * 1000).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            
          </div>

          {/* Nested Tasks list */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-650 dark:text-emerald-400 flex items-center gap-1.5 border-b border-border-default/45 pb-2">
              <Clock className="w-3.5 h-3.5 text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.2)]" />
              <span>Aligned Goal Tasks</span>
            </h3>

            {tasksLoading ? (
              <div className="flex py-12 justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Render active checklist */}
                {activeTasks.length > 0 ? (
                  activeTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-surface/50 hover:bg-surface border border-border-default hover:border-border-default/80 transition-all cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          onClick={(e) => handleToggleTaskStatus(e, task)}
                          className="h-4 w-4 rounded-full border border-border-default bg-bg-primary/50 flex items-center justify-center shrink-0 transition-all cursor-pointer hover:border-emerald-500/50"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-transparent group-hover:bg-emerald-500/50" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold block text-foreground truncate">{task.title}</span>
                          {task.dueDate && (
                            <span className="text-[8px] font-mono font-semibold text-muted-foreground mt-0.5 block">
                              Due: {new Date(task.dueDate instanceof Date ? task.dueDate : (task.dueDate as any).seconds * 1000).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        {task.assigneeIds.length > 0 && (
                          <div className="w-5.5 h-5.5 rounded-full bg-bg-secondary border border-border-default flex items-center justify-center font-bold text-[8px] text-muted-foreground" title={`Assigned to ${memberMap.get(task.assigneeIds[0])?.fullName || 'Member'}`}>
                            {getInitials(task.assigneeIds[0])}
                          </div>
                        )}
                        <button
                          onClick={(e) => handleDeleteTaskItem(e, task.id)}
                          className="text-muted-foreground hover:text-red-400 p-1 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 rounded-xl border border-dashed border-border-default bg-bg-secondary/10 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] text-muted-foreground italic">No active goal checklist items.</p>
                  </div>
                )}

                {/* Collapsible Completed Tasks */}
                {completedTasks.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCompleted(!showCompleted)}
                      className="w-full border border-border-default/45 bg-bg-secondary/20 rounded-xl p-2.5 cursor-pointer flex items-center justify-between text-[10px] text-muted-foreground hover:bg-bg-secondary/40 transition-colors font-bold tracking-wide"
                    >
                      <span>Completed Tasks ({completedTasks.length})</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showCompleted ? "rotate-180" : "")} />
                    </button>
                    <AnimatePresence>
                      {showCompleted && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-2"
                        >
                          {completedTasks.map(task => (
                            <div
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className="flex items-center justify-between p-3 rounded-xl bg-bg-primary/20 border border-border-subtle/50 transition-all cursor-pointer opacity-50 hover:opacity-85 shadow-sm"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  onClick={(e) => handleToggleTaskStatus(e, task)}
                                  className="h-4 w-4 rounded-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 transition-all cursor-pointer"
                                >
                                  <Check className="w-2.5 h-2.5" />
                                </div>
                                <span className="text-xs truncate font-normal text-muted-foreground line-through">
                                  {task.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 ml-2">
                                {task.assigneeIds.length > 0 && (
                                  <div className="w-5.5 h-5.5 rounded-full bg-bg-secondary border border-border-default flex items-center justify-center font-bold text-[8px] text-muted-foreground">
                                    {getInitials(task.assigneeIds[0])}
                                  </div>
                                )}
                                <button
                                  onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                  className="text-muted-foreground hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Shared Task Details Overlay Drawer */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          orgId={orgId}
          actor={actor}
          authorUsername={userProfile?.username || actor.name}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Create task modal */}
      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        orgId={orgId}
        actor={actor}
        defaultGoalId={goalId}
      />

      {/* ─── Premium Glassmorphic Edit Modal ─── */}
      <AnimatePresence>
        {isEditing && (
          <>
            {/* Dark glass backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="fixed inset-0 bg-background/80 dark:bg-black/60 backdrop-blur-sm z-[100]"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg p-6 rounded-2xl border border-border-default/85 bg-surface/95 dark:bg-surface/90 backdrop-blur-md shadow-2xl z-[101] flex flex-col gap-4 max-h-[90vh] overflow-y-auto aether-scroll"
            >
              <div className="flex items-center justify-between border-b border-border-default/45 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                    <Target className="w-4 h-4 text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.2)]" />
                  </div>
                  <h3 className="text-sm font-black text-foreground">Configure Goal Focus</h3>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="w-7 h-7 rounded-lg border border-border-default/60 hover:bg-bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Goal Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border-default bg-bg-primary/50 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-emerald-500/30"
                    placeholder="Enter goal title..."
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Goal Description</label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border-default bg-bg-primary/50 text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-emerald-500/30 h-20 resize-none leading-relaxed"
                    placeholder="Describe what this goal entails..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Linked Project */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Align Initiative</label>
                    <select
                      value={editProjId}
                      onChange={(e) => setEditProjId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border-default bg-bg-primary dark:bg-surface text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-emerald-500/30"
                    >
                      <option value="none">No Initiative Link</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>#{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Target Date */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Target Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-border-default bg-bg-primary/50 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>

                {/* Frequency Recurrence options */}
                <div className="p-3.5 rounded-xl border border-border-default/60 bg-bg-secondary/20 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Execution Frequency</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {[
                        { val: 'none', label: 'Once' },
                        { val: 'daily', label: 'Daily' },
                        { val: 'weekly', label: 'Weekly' },
                        { val: 'monthly', label: 'Monthly' },
                        { val: 'custom', label: 'Custom' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setEditRecurrence(item.val as any)}
                          className={cn(
                            "py-1.5 px-1 rounded-lg border text-[9px] font-black text-center transition-all cursor-pointer",
                            editRecurrence === item.val
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-sm"
                              : "border-border-default bg-bg-primary/50 hover:bg-bg-secondary text-muted-foreground"
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {editRecurrence === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2.5 pt-1.5 overflow-hidden"
                    >
                      <span className="text-[10px] text-muted-foreground font-semibold">Repeat goal cycles every</span>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={editCustomDays}
                        onChange={(e) => setEditCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 px-2.5 py-1 rounded-lg border border-border-default bg-bg-primary/50 text-xs font-mono font-semibold text-foreground text-center outline-none focus:ring-1 focus:ring-emerald-500/30"
                      />
                      <span className="text-[10px] text-muted-foreground font-semibold">days</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 border-t border-border-default/45 pt-4 mt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGoal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
