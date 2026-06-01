import * as React from 'react';
import { 
  Plus, 
  Loader2, 
  Check, 
  Trello,
  Calendar,
  AlertCircle,
  Clock,
  Filter,
  CheckCircle,
  Play,
  RotateCcw,
  Target,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from '../../../hooks/useAuth';
import { useTasks } from '../../../hooks/useTasks';
import { useGoals } from '../../../hooks/useGoals';
import { useProjects } from '../../../hooks/useProjects';
import { useOrgMembers } from '../../../hooks/useChat';
import { createTask, moveTask, type Task } from '../../../lib/tasks';
import { createGoal } from '../../../lib/goals';
import { TaskDetailDrawer } from '../../tasks/TaskDetailDrawer';
import { GoalDetailDrawer } from '../../tasks/GoalDetailDrawer';
import { cn } from '@/lib/utils';

export function MobileWorkspace() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { tasks, loading } = useTasks(orgId);
  const { goals, loading: goalsLoading } = useGoals(orgId);
  const { projects } = useProjects(orgId);
  const members = useOrgMembers(orgId);

  const [workspaceTab, setWorkspaceTab] = React.useState<'tasks' | 'goals'>('tasks');
  const [activeTab, setActiveTab] = React.useState<'todo' | 'in_progress' | 'review' | 'done'>('todo');
  const [quickTitle, setQuickTitle] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [quickGoalTitle, setQuickGoalTitle] = React.useState('');
  const [creatingGoal, setCreatingGoal] = React.useState(false);

  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [selectedGoal, setSelectedGoal] = React.useState<any>(null);

  const actor = React.useMemo(() => ({
    uid: userProfile?.uid ?? '',
    name: userProfile?.fullName || 'Unknown',
  }), [userProfile]);

  const filteredTasks = React.useMemo(() => {
    return tasks.filter(t => t.status === activeTab);
  }, [tasks, activeTab]);

  const mySpaceGoals = React.useMemo(() => {
    return goals.filter(g => g.ownerId === userProfile?.uid);
  }, [goals, userProfile?.uid]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !orgId || creating) return;
    setCreating(true);
    try {
      await createTask({
        orgId,
        title: quickTitle.trim(),
        status: activeTab,
        actor,
      });
      setQuickTitle('');
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGoalTitle.trim() || !orgId || creatingGoal) return;
    setCreatingGoal(true);
    try {
      await createGoal({
        orgId,
        title: quickGoalTitle.trim(),
        description: 'Goal established via mobile workspace.',
        horizon: 'short_term',
        ownerId: userProfile?.uid || '',
        actor,
      });
      setQuickGoalTitle('');
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingGoal(false);
    }
  };

  const handleMoveStatus = async (task: Task, nextStatus: 'todo' | 'in_progress' | 'review' | 'done') => {
    if (!orgId) return;
    try {
      await moveTask(task.id, orgId, nextStatus, task.orderIndex, task.status, actor);
    } catch (err) {
      console.error(err);
    }
  };

  const PRIORITY_COLORS: Record<string, string> = {
    urgent: 'border-red-500/30 bg-red-500/10 text-red-400',
    high: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
    medium: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    low: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400',
  };

  return (
    <div className="flex flex-col space-y-4 animate-fluid-pop pb-6">
      
      {/* 0. Top Level Tab Switcher (Tasks vs Goals) */}
      <div className="aether-glass p-1.5 flex bg-white/2 border border-white/5 shadow-inner" style={{ borderRadius: '18px' }}>
        {[
          { id: 'tasks', label: 'Tasks Canvas' },
          { id: 'goals', label: 'Strategic Goals' }
        ].map((tab) => {
          const isActive = workspaceTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setWorkspaceTab(tab.id as any)}
              className={cn(
                "relative flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer",
                isActive ? "text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="workspaceModeTab"
                  className="absolute inset-0 bg-primary rounded-xl shadow-lg z-0"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {workspaceTab === 'tasks' ? (
        <>
          {/* 1. Task State Navigation Tabs */}
          <div className="aether-glass p-1.5 flex bg-white/2 border border-white/5 shadow-inner" style={{ borderRadius: '18px' }}>
            {[
              { id: 'todo', label: 'To Do' },
              { id: 'in_progress', label: 'Active' },
              { id: 'review', label: 'Review' },
              { id: 'done', label: 'Done' }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tasks.filter(t => t.status === tab.id).length;
              
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
                      layoutId="workspaceActiveTab"
                      className="absolute inset-0 bg-primary rounded-xl shadow-lg z-0"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    <span>{tab.label}</span>
                    <span className={cn(
                      "px-1.5 py-0.2 rounded-md text-[8px] font-black",
                      isActive ? "bg-white/20 text-white" : "bg-white/5 text-muted-foreground/60"
                    )}>
                      {count}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* 2. Quick task input */}
          <form onSubmit={handleCreateTask} className="aether-glass p-3 flex gap-2 bg-white/2 border border-white/5">
            <input
              type="text"
              placeholder={`Add task to ${activeTab.replace('_', ' ')}...`}
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all font-bold"
            />
            <button
              type="submit"
              disabled={!quickTitle.trim() || creating}
              className="px-4 rounded-xl bg-primary text-white text-xs font-black hover:bg-primary/95 transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-md"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </form>

          {/* 3. Task Deck Stream */}
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-bold">Assembling tasks...</span>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="aether-glass p-8 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-2xl py-16">
              <CheckCircle className="w-8 h-8 text-emerald-500/80 mx-auto mb-3" />
              <span className="text-xs font-black text-foreground block uppercase tracking-wider">Tab is Clear</span>
              <span className="text-[10px] text-muted-foreground mt-1 block">No tasks currently pending in this queue.</span>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredTasks.map((task) => {
                  const priorityClass = PRIORITY_COLORS[task.priority] || '';
                  
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      onClick={() => setSelectedTask(task)}
                      className="aether-glass p-4 bg-white/2 border border-white/5 flex flex-col gap-3 shadow-md active:scale-98 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-black text-foreground leading-snug flex-1">
                          {task.title}
                        </span>
                        {task.priority !== 'none' && (
                          <span className={cn("text-[8px] px-1.5 py-0.2 rounded border font-black uppercase tracking-widest shrink-0", priorityClass)}>
                            {task.priority}
                          </span>
                        )}
                      </div>

                      {/* Task details (due date if exists) */}
                      {task.dueDate && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-3 h-3 text-primary/70 shrink-0" />
                          <span className="text-[9px] font-semibold">
                            {typeof (task.dueDate as any).toDate === 'function'
                              ? (task.dueDate as any).toDate().toLocaleDateString()
                              : new Date(task.dueDate as any).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {/* Tactile state triggers */}
                      <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {activeTab !== 'todo' && (
                          <button
                            onClick={() => handleMoveStatus(task, 'todo')}
                            className="p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-muted-foreground text-[10px] font-black flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset</span>
                          </button>
                        )}

                        {activeTab === 'todo' && (
                          <button
                            onClick={() => handleMoveStatus(task, 'in_progress')}
                            className="py-1.5 px-3 rounded-lg bg-primary text-white text-[10px] font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Start</span>
                          </button>
                        )}

                        {activeTab === 'in_progress' && (
                          <button
                            onClick={() => handleMoveStatus(task, 'review')}
                            className="py-1.5 px-3 rounded-lg bg-amber-500 text-white text-[10px] font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Review</span>
                          </button>
                        )}

                        {activeTab === 'review' && (
                          task.creatorId === userProfile?.uid ? (
                            <button
                              onClick={() => handleMoveStatus(task, 'done')}
                              className="py-1.5 px-3 rounded-lg bg-emerald-500 text-white text-[10px] font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => alert("Only the creator of this task can approve it from In Review.")}
                              className="py-1.5 px-3 rounded-lg bg-emerald-500/10 text-emerald-400/50 border border-emerald-500/20 text-[10px] font-black flex items-center gap-1.5 cursor-not-allowed opacity-60"
                              title="Creator approval required"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Locked</span>
                            </button>
                          )
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Quick goal input */}
          <form onSubmit={handleCreateGoal} className="aether-glass p-3 flex gap-2 bg-white/2 border border-white/5">
            <input
              type="text"
              placeholder="Create new strategic goal..."
              value={quickGoalTitle}
              onChange={(e) => setQuickGoalTitle(e.target.value)}
              className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all font-bold"
            />
            <button
              type="submit"
              disabled={!quickGoalTitle.trim() || creatingGoal}
              className="px-4 rounded-xl bg-primary text-white text-xs font-black hover:bg-primary/95 transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-md"
            >
              {creatingGoal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </form>

          {/* Goals Workspace Panel */}
          <div className="aether-glass p-5 space-y-4 bg-white/2 border border-white/5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
              <Target className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Horizon Goals & Targets</span>
            </div>

            {goalsLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground font-bold">Synchronizing goals...</span>
              </div>
            ) : mySpaceGoals.length === 0 ? (
              <div className="py-12 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                <Target className="w-8 h-8 text-muted-foreground/35 mx-auto mb-2 animate-pulse" />
                <span className="text-xs font-black text-foreground block">No Goals Established</span>
                <span className="text-[10px] text-muted-foreground mt-1 block">Establish strategic horizon goals in your projects.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {mySpaceGoals.map((goal) => {
                  const progress = goal.progressRollup ?? 0;
                  const targetDate = goal.targetDate ? (typeof (goal.targetDate as any).toDate === 'function' ? (goal.targetDate as any).toDate() : new Date((goal.targetDate as any).seconds * 1000)) : null;

                  return (
                    <div
                      key={goal.id}
                      onClick={() => setSelectedGoal(goal)}
                      className="flex flex-col p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 hover:bg-white/[0.04] active:scale-98 transition-all cursor-pointer shadow-md gap-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-black text-foreground line-clamp-2 leading-tight flex-1">{goal.title}</span>
                        <span className={cn(
                          "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded border shrink-0",
                          goal.status === 'completed' ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-450" : "border-primary/20 bg-primary/5 text-primary"
                        )}>
                          {goal.status}
                        </span>
                      </div>

                      {/* Goal progress indicator */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[8px] text-muted-foreground font-semibold uppercase tracking-wider">
                          <span>Progress completion</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="bg-primary h-full rounded-full transition-all duration-300" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground/85 mt-1">
                        <span className="text-primary">{goal.horizon.replace('_', ' ')}</span>
                        {targetDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-primary/70 shrink-0" />
                            <span>Target: {targetDate.toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Task details drawer */}
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

      {/* Goal details drawer */}
      {selectedGoal && orgId && (
        <GoalDetailDrawer
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          orgId={orgId}
          actor={actor}
          members={members}
          projects={projects}
          tasks={tasks}
        />
      )}

    </div>
  );
}
