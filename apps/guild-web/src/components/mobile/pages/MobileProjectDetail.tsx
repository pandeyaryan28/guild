import * as React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import {
  ArrowLeft,
  Plus,
  Settings,
  Loader2,
  Trash2,
  Check,
  ChevronDown,
  FolderGit,
  Clock,
  X,
  MessageSquare,
  Paperclip,
  Send,
  Sparkles,
  Target,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../../hooks/useAuth';
import { useProject, useProjectComments, useProjects } from '../../../hooks/useProjects';
import { useTasks } from '../../../hooks/useTasks';
import { useGoals } from '../../../hooks/useGoals';
import { createGoal } from '../../../lib/goals';
import { TaskDetailDrawer } from '../../tasks/TaskDetailDrawer';
import { GoalDetailDrawer } from '../../tasks/GoalDetailDrawer';
import { CreateTaskModal } from '../../tasks/CreateTaskModal';
import { useOrgMembers } from '../../../hooks/useChat';
import { moveTask, deleteTask, type Task, type TaskStatus } from '../../../lib/tasks';
import { updateProject, addProjectComment, updateProjectAttachments } from '../../../lib/projects';
import { type MessageAttachment } from '@guild/types';

export function MobileProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const orgId = userProfile?.organizationId;
  const { project, loading: projectLoading } = useProject(projectId);
  const { projects } = useProjects(orgId);
  const { columns, loading: tasksLoading } = useTasks(orgId, projectId ? { projectId } : undefined);
  const members = useOrgMembers(orgId);
  const { goals } = useGoals(orgId);
  const comments = useProjectComments(projectId || null);

  const [activeTab, setActiveTab] = React.useState<'overview' | 'tasks' | 'goals'>('overview');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [showCompleted, setShowCompleted] = React.useState(false);
  
  // Comments feed states
  const [commentBody, setCommentBody] = React.useState('');
  const [uploading, setUploading] = React.useState(false);

  // Edit states
  const [showMemberPicker, setShowMemberPicker] = React.useState(false);

  // Drawers trigger
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [selectedGoal, setSelectedGoal] = React.useState<any>(null);

  // Create Goal states
  const [goalCreateOpen, setGoalCreateOpen] = React.useState(false);
  const [newGoalTitle, setNewGoalTitle] = React.useState('');
  const [newGoalDesc, setNewGoalDesc] = React.useState('');
  const [newGoalTargetDate, setNewGoalTargetDate] = React.useState('');

  const actor = React.useMemo(
    () => ({ uid: user?.uid ?? '', name: userProfile?.fullName || user?.displayName || 'Teammate' }),
    [user, userProfile]
  );

  const memberMap = React.useMemo(() => {
    const map = new Map<string, any>();
    members.forEach((m) => map.set(m.uid, m));
    return map;
  }, [members]);

  const getInitials = (userId: string) => {
    const m = memberMap.get(userId);
    if (!m) return '?';
    return m.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getMemberName = (userId: string) => {
    const m = memberMap.get(userId);
    return m?.fullName || m?.username || 'Teammate';
  };

  const getMemberPhotoURL = (userId: string) => {
    const m = memberMap.get(userId);
    return m?.photoURL || '';
  };

  const allTasks = React.useMemo(() => {
    const all: Task[] = [];
    for (const col of columns.values()) {
      all.push(...col);
    }
    return all.filter(t => !t.parentTaskId);
  }, [columns]);

  const activeTasks = React.useMemo(() => allTasks.filter(t => t.status !== 'done'), [allTasks]);
  const completedTasks = React.useMemo(() => allTasks.filter(t => t.status === 'done'), [allTasks]);
  const projectGoals = React.useMemo(() => goals.filter(g => g.projectId === projectId), [goals, projectId]);

  const handleToggleTaskStatus = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (!orgId) return;
    const oldStatus = task.status;
    const newStatus: TaskStatus = oldStatus === 'done' ? 'todo' : 'done';

    const STATUS_ORDER: Record<TaskStatus, number> = { todo: 0, in_progress: 1, review: 2, done: 3 };
    const oldStatusVal = STATUS_ORDER[oldStatus] ?? 0;
    const newStatusVal = STATUS_ORDER[newStatus] ?? 0;

    if (newStatusVal < oldStatusVal) {
      alert("Status cannot go backward once moved.");
      return;
    }

    try {
      await moveTask(task.id, orgId, newStatus, task.orderIndex || 1000, oldStatus, actor);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTaskItem = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (confirm('Delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim() || !project || uploading) return;
    setUploading(true);
    try {
      await addProjectComment({
        projectId: project.id,
        orgId,
        authorId: actor.uid,
        authorName: actor.name,
        authorUsername: actor.name.toLowerCase().replace(/\s+/g, ''),
        body: commentBody.trim(),
        mentions: [],
        files: []
      });
      setCommentBody('');
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleToggleProjectMember = async (userId: string) => {
    if (!project) return;
    const currentMembers = project.memberIds || [];
    const nextMembers = currentMembers.includes(userId)
      ? currentMembers.filter(uid => uid !== userId)
      : [...currentMembers, userId];
    try {
      await updateProject(project.id, { memberIds: nextMembers });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !orgId) return;
    try {
      await createGoal({
        orgId,
        title: newGoalTitle.trim(),
        description: newGoalDesc.trim() || undefined,
        targetDate: newGoalTargetDate ? new Date(newGoalTargetDate) : null,
        projectId: projectId ?? null,
        ownerId: actor.uid,
        actor
      });
      setNewGoalTitle('');
      setNewGoalDesc('');
      setNewGoalTargetDate('');
      setGoalCreateOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (projectLoading) {
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
        <span className="text-xs text-muted-foreground font-semibold">Initiative project not found.</span>
        <button onClick={() => navigate('/')} className="px-4 py-2 border border-white/10 bg-white/5 rounded-xl text-xs font-bold text-foreground">
          Go Home
        </button>
      </div>
    );
  }

  const progressRate = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

  return (
    <div className="flex flex-col space-y-5 animate-fluid-pop pb-6">
      
      {/* 1. Project Title & Safe Return Header Card */}
      <div className="aether-glass p-4 bg-white/2 border border-white/5 space-y-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-muted-foreground shrink-0 active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-black text-foreground truncate">{project.name}</h1>
            <span className="text-[8px] font-black uppercase text-primary tracking-widest mt-0.5 block">
              Active Project
            </span>
          </div>
        </div>

        {/* Progress horizontal status indicators */}
        <div className="pt-2 border-t border-white/5 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
            <span>Overall completion</span>
            <span className="font-mono text-foreground font-black">{progressRate}%</span>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/[0.02]">
            <div className="bg-primary h-full rounded-full transition-all duration-500 shadow-lg shadow-primary/20" style={{ width: `${progressRate}%` }} />
          </div>
        </div>

        {/* Active Member Row with dropdown trigger */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            {(project.memberIds || []).map((uid) => {
              const photoURL = getMemberPhotoURL(uid);
              const fullName = getMemberName(uid);
              return photoURL ? (
                <img
                  key={uid}
                  src={photoURL}
                  alt={fullName}
                  className="w-5.5 h-5.5 rounded-full object-cover shrink-0 ring-2 ring-surface border border-white/10"
                  title={fullName}
                />
              ) : (
                <div
                  key={uid}
                  className="w-5.5 h-5.5 rounded-full border border-indigo-500/20 bg-primary/10 flex items-center justify-center font-bold text-[8px] text-primary shrink-0 ring-2 ring-surface"
                  title={fullName}
                >
                  {getInitials(uid)}
                </div>
              );
            })}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMemberPicker(!showMemberPicker)}
              className="flex items-center justify-center h-6 px-2 rounded-lg border border-dashed border-white/10 bg-white/2 hover:bg-white/5 text-[9px] font-black text-primary cursor-pointer active:scale-95"
            >
              + ADD MEMBERS
            </button>

            <AnimatePresence>
              {showMemberPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMemberPicker(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-52 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-surface/98 p-1.5 shadow-2xl z-50 aether-scroll"
                  >
                    {members.map((member) => {
                      const isIncluded = (project.memberIds || []).includes(member.uid);
                      return (
                        <button
                          key={member.uid}
                          onClick={() => handleToggleProjectMember(member.uid)}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-left cursor-pointer hover:bg-white/5",
                            isIncluded ? "text-primary bg-primary/5" : "text-muted-foreground"
                          )}
                        >
                          <span className="truncate">{member.fullName}</span>
                          {isIncluded && <Check className="w-3.5 h-3.5 text-primary stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 2. Top Segmented Selector Drawer */}
      <div className="aether-glass p-1.5 flex bg-white/2 border border-white/5 shadow-inner" style={{ borderRadius: '18px' }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'tasks', label: `Tasks (${allTasks.length})` },
          { id: 'goals', label: `Goals (${projectGoals.length})` }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "relative flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer",
                isActive ? "text-white" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="projDetailActiveTab"
                  className="absolute inset-0 bg-primary rounded-xl shadow-lg z-0"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Section views */}
      <div className="space-y-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            
            {/* Project description card */}
            {project.description && (
              <div className="aether-glass p-4 bg-white/2 border border-white/5 space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
                  Project Scope
                </span>
                <p className="text-xs text-foreground/90 font-semibold leading-relaxed">
                  {project.description}
                </p>
              </div>
            )}

            {/* Conversation Feed */}
            <div className="aether-glass p-4 bg-white/2 border border-white/5 space-y-4">
              <div className="flex items-center gap-1.5 border-b border-white/5 pb-2.5">
                <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  Discussion feed
                </span>
              </div>

              {/* Scrolling comments */}
              <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1 aether-scroll">
                {comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-semibold italic text-center py-4">No comments posted yet.</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-white/[0.01] border border-white/5 p-3 rounded-xl space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black text-foreground">{comment.authorName}</span>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                          {new Date(comment.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                        {comment.body}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Compose bar */}
              <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-white/5">
                <input
                  type="text"
                  placeholder="Share a project status update..."
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 font-bold"
                />
                <button
                  type="submit"
                  disabled={!commentBody.trim() || uploading}
                  className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/95 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            
            {/* Task list deck */}
            {tasksLoading ? (
              <div className="flex py-10 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Active Tasks checklist
                  </span>
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 h-7 text-[9px] font-black uppercase tracking-widest rounded-xl border border-primary/20 bg-primary/10 text-primary cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>Create Task</span>
                  </button>
                </div>

                {activeTasks.length === 0 ? (
                  <div className="py-8 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-xl">
                    <span className="text-xs font-bold text-foreground block">Zero pending project tickets!</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 active:scale-98 transition-all cursor-pointer shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            onClick={(e) => handleToggleTaskStatus(e, task)}
                            className="h-4.5 w-4.5 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center shrink-0"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-transparent hover:bg-primary" />
                          </button>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-foreground block truncate">{task.title}</span>
                            {task.dueDate && (
                              <span className="text-[8px] font-bold text-muted-foreground uppercase mt-0.5 block">
                                Due: {new Date(task.dueDate instanceof Date ? task.dueDate : (task.dueDate as any).seconds * 1000).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          {task.assigneeIds.length > 0 && (
                            <div 
                              className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[8px] text-white shrink-0"
                              style={{ background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)` }}
                            >
                              {getInitials(task.assigneeIds[0])}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Completed Tasks Accordion */}
                {completedTasks.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => setShowCompleted(!showCompleted)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/2 text-[10px] font-black uppercase tracking-widest text-muted-foreground active:scale-99 transition-all cursor-pointer"
                    >
                      <span>Completed Tasks ({completedTasks.length})</span>
                      <ChevronDown className={cn("w-4 h-4 transition-transform", showCompleted ? "rotate-180" : "")} />
                    </button>

                    <AnimatePresence>
                      {showCompleted && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-2"
                        >
                          {completedTasks.map((task) => (
                            <div
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/5 opacity-55 cursor-pointer shadow-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <button
                                  onClick={(e) => handleToggleTaskStatus(e, task)}
                                  className="h-4.5 w-4.5 rounded-lg border border-emerald-500 bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                                <span className="text-xs font-semibold text-muted-foreground line-through truncate">{task.title}</span>
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
        )}

        {activeTab === 'goals' && (
          <div className="space-y-4">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Horizon Goals & Targets
              </span>
              <button
                onClick={() => setGoalCreateOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 h-7 text-[9px] font-black uppercase tracking-widest rounded-xl border border-primary/20 bg-primary/10 text-primary cursor-pointer active:scale-95"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Add Goal</span>
              </button>
            </div>

            {projectGoals.length === 0 ? (
              <div className="py-10 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-xl">
                <p className="text-xs font-semibold text-muted-foreground italic">No goals registered for this project.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projectGoals.map((goal) => (
                  <div
                    key={goal.id}
                    onClick={() => setSelectedGoal(goal)}
                    className="flex flex-col p-3.5 rounded-xl bg-white/[0.02] border border-white/5 active:scale-98 transition-all cursor-pointer shadow-xs gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-black text-foreground truncate flex-1">{goal.title}</span>
                      <span className={cn(
                        "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded border shrink-0",
                        goal.status === 'completed' ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-450" : "border-primary/20 bg-primary/5 text-primary"
                      )}>
                        {goal.status}
                      </span>
                    </div>
                    {goal.targetDate && (
                      <span className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary/70 shrink-0" />
                        <span>Target: {new Date(goal.targetDate instanceof Date ? goal.targetDate : (goal.targetDate as any).seconds * 1000).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Creation Modal */}
      {createOpen && orgId && (
        <CreateTaskModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          orgId={orgId}
          actor={actor}
          defaultProjectId={projectId}
        />
      )}

      {/* Task details drawers */}
      {selectedTask && orgId && (
        <TaskDetailDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          orgId={orgId}
          actor={actor}
          members={members}
          projects={projects}
          goals={goals}
        />
      )}

      {/* Goal details drawers */}
      {selectedGoal && orgId && (
        <GoalDetailDrawer
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          orgId={orgId}
          actor={actor}
          members={members}
          projects={projects}
          tasks={allTasks}
        />
      )}

      {/* Add Goal Dialog Bottom Sheet */}
      <AnimatePresence>
        {goalCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-h-[92vh] aether-glass rounded-t-[32px] border-x-0 border-b-0 border-t border-white/10 px-6 pb-6 pt-3 flex flex-col bg-surface/98 backdrop-blur-3xl overflow-hidden"
            >
              <div className="w-10 h-1.5 rounded-full bg-white/10 mx-auto mb-4 shrink-0" />
              <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
                <span className="text-xs font-black text-foreground flex items-center gap-2">
                  <Target className="w-4.5 h-4.5 text-primary" />
                  <span>ADD PROJECT HORIZON GOAL</span>
                </span>
                <button onClick={() => setGoalCreateOpen(false)} className="h-7 w-7 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground cursor-pointer active:scale-90">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateGoalSubmit} className="flex-1 overflow-y-auto aether-scroll py-4 space-y-4 pr-1">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">GOAL TARGET TITLE</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Launch beta releases"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/5 bg-white/2 text-xs text-foreground placeholder:text-muted-foreground outline-none font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">TARGET END DATE</span>
                  <input
                    type="date"
                    required
                    value={newGoalTargetDate}
                    onChange={(e) => setNewGoalTargetDate(e.target.value)}
                    className="w-full p-3 rounded-xl border border-white/5 bg-white/2 text-xs text-foreground outline-none [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">DESCRIPTION</span>
                  <textarea
                    rows={3}
                    placeholder="Write detailed criteria..."
                    value={newGoalDesc}
                    onChange={(e) => setNewGoalDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/5 bg-white/2 text-xs text-foreground placeholder:text-muted-foreground outline-none font-bold resize-none"
                  />
                </div>
              </form>

              <div className="pt-3 border-t border-white/5 flex gap-3 shrink-0">
                <button onClick={() => setGoalCreateOpen(false)} className="flex-1 py-3 text-xs font-black text-muted-foreground rounded-xl border border-white/5 cursor-pointer bg-white/2">
                  CANCEL
                </button>
                <button
                  onClick={handleCreateGoalSubmit}
                  className="flex-1 py-3 text-xs font-black text-white bg-primary rounded-xl active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center"
                >
                  ADD GOAL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
export default MobileProjectDetail;
