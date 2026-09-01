import * as React from 'react';
import { BarChart3, Target, Clock, CheckCircle2, AlertCircle, Users, Layout, ShieldAlert, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../../hooks/useAuth';
import { useOrgMembers } from '../../../hooks/useChat';
import { useProjects } from '../../../hooks/useProjects';
import { useGoals } from '../../../hooks/useGoals';
import { useTasks } from '../../../hooks/useTasks';
import { TaskDetailDrawer } from '../../tasks/TaskDetailDrawer';
import { GoalDetailDrawer } from '../../tasks/GoalDetailDrawer';
import type { Task } from '../../../lib/tasks';
import type { Goal } from '../../../lib/goals';
import { cn } from '@/lib/utils';
import { avatarInitials, avatarHue } from '../../MemberProfileDrawer';

export function MobileReports() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const userId = userProfile?.uid;
  const isManager = userProfile?.isManager === true;

  const [activeScope, setActiveScope] = React.useState<'my' | 'team' | 'project'>('my');
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [selectedGoal, setSelectedGoal] = React.useState<Goal | null>(null);

  const members = useOrgMembers(orgId || '');
  const { projects } = useProjects(orgId || '');
  const { goals } = useGoals(orgId || '');
  const { tasks } = useTasks(orgId || '');

  const actor = React.useMemo(() => ({
    uid: userProfile?.uid || '',
    name: userProfile?.fullName || 'Anonymous',
  }), [userProfile]);

  const memberMap = React.useMemo(() => {
    const m = new Map<string, any>();
    members.forEach((mem) => m.set(mem.uid, mem));
    return m;
  }, [members]);

  const projectMap = React.useMemo(() => {
    const m = new Map<string, string>();
    projects.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [projects]);

  // Scope: MY stats
  const myTasks = React.useMemo(() => {
    if (!userId) return [];
    return tasks.filter(t => t.assigneeIds.includes(userId));
  }, [tasks, userId]);

  const myGoals = React.useMemo(() => {
    if (!userId) return [];
    return goals.filter(g => g.ownerId === userId);
  }, [goals, userId]);

  const myActiveTasks = myTasks.filter(t => t.status !== 'done');
  const myDoneTasks = myTasks.filter(t => t.status === 'done');
  const myProgress = myTasks.length > 0 ? Math.round((myDoneTasks.length / myTasks.length) * 100) : 0;

  // Scope: TEAM stats
  const teamTeammatesUids = React.useMemo(() => {
    if (!userId) return new Set<string>();
    // Get all teammates managed by this manager
    const ids = new Set<string>();
    members.forEach(m => {
      if (m.managerId === userId) ids.add(m.uid);
    });
    return ids;
  }, [members, userId]);

  const teamTasks = React.useMemo(() => {
    if (teamTeammatesUids.size === 0) return [];
    return tasks.filter(t => t.assigneeIds.some(id => teamTeammatesUids.has(id)));
  }, [tasks, teamTeammatesUids]);

  const teamActiveTasks = teamTasks.filter(t => t.status !== 'done');
  const teamDoneTasks = teamTasks.filter(t => t.status === 'done');
  const teamProgress = teamTasks.length > 0 ? Math.round((teamDoneTasks.length / teamTasks.length) * 100) : 0;

  const teamLoadDistribution = React.useMemo(() => {
    const distribution: { memberId: string; name: string; count: number }[] = [];
    teamTeammatesUids.forEach(uid => {
      const name = memberMap.get(uid)?.fullName || 'Teammate';
      const count = tasks.filter(t => t.assigneeIds.includes(uid) && t.status !== 'done').length;
      distribution.push({ memberId: uid, name, count });
    });
    return distribution.sort((a, b) => b.count - a.count);
  }, [tasks, teamTeammatesUids, memberMap]);

  if (!orgId || !userId) {
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-5 animate-fluid-pop pb-6">
      
      {/* 1. Scope switcher segmented banner */}
      <div className="aether-glass p-1.5 flex bg-secondary/50 border border-border shadow-xs" style={{ borderRadius: '18px' }}>
        {[
          { id: 'my', label: 'My analytics' },
          ...(isManager ? [{ id: 'team', label: 'Squad health' }] : []),
          { id: 'project', label: 'Initiatives' }
        ].map((tab) => {
          const isActive = activeScope === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveScope(tab.id as any)}
              className={cn(
                "relative flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer",
                isActive ? "text-primary-foreground font-black" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="reportsScopeActiveTab"
                  className="absolute inset-0 bg-primary rounded-xl shadow-md z-0"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Dynamic content views */}
      <div className="space-y-4">
        
        {/* MY ANALYTICS VIEW */}
        {activeScope === 'my' && (
          <div className="space-y-4">
            
            {/* KPI Metrics block */}
            <div className="grid grid-cols-2 gap-3">
              <div className="aether-glass p-4 bg-surface/85 dark:bg-surface/50 border border-border dark:border-border-strong flex flex-col justify-between h-24 shadow-xs">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">My completion rate</span>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-xl font-black text-foreground">{myProgress}%</span>
                  <span className="text-[9px] text-muted-foreground font-bold">of all tasks</span>
                </div>
                <div className="w-full bg-secondary h-1 rounded-full overflow-hidden mt-2">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${myProgress}%` }} />
                </div>
              </div>

              <div className="aether-glass p-4 bg-surface/85 dark:bg-surface/50 border border-border dark:border-border-strong flex flex-col justify-between h-24 shadow-xs">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Pending Tickets</span>
                <span className="text-xl font-black text-foreground block mt-1">{myActiveTasks.length}</span>
                <span className="text-[9px] text-muted-foreground font-bold leading-none block">Tasks left to complete</span>
              </div>
            </div>

            {/* List my active tickets */}
            <div className="aether-glass p-4 bg-surface/85 dark:bg-surface/50 border border-border dark:border-border-strong space-y-3 shadow-sm">
              <div className="flex items-center gap-1.5 border-b border-border pb-2">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Active Task Agenda</span>
              </div>

              {myActiveTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4 font-semibold">Your agenda is pristine!</p>
              ) : (
                <div className="space-y-2">
                  {myActiveTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="p-3.5 rounded-xl border border-border bg-surface/90 dark:bg-surface/50 hover:bg-secondary/40 flex items-center justify-between cursor-pointer active:scale-98 transition-all shadow-xs"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-black text-foreground block truncate">{task.title}</span>
                        {task.projectId && (
                          <span className="text-[8px] font-black uppercase tracking-widest text-primary mt-1 block">
                            {projectMap.get(task.projectId)}
                          </span>
                        )}
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground/40 shrink-0 ml-2" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Horizon Goals */}
            <div className="aether-glass p-4 bg-surface/85 dark:bg-surface/50 border border-border dark:border-border-strong space-y-3 shadow-sm">
              <div className="flex items-center gap-1.5 border-b border-border pb-2">
                <Target className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Target Horizon Goals</span>
              </div>

              {myGoals.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4 font-semibold">No goals assigned.</p>
              ) : (
                <div className="space-y-2">
                  {myGoals.slice(0, 4).map((goal) => (
                    <div
                      key={goal.id}
                      onClick={() => setSelectedGoal(goal)}
                      className="p-3.5 rounded-xl border border-border bg-surface/90 dark:bg-surface/50 hover:bg-secondary/40 flex items-center justify-between cursor-pointer active:scale-98 transition-all shadow-xs"
                    >
                      <span className="text-xs font-black text-foreground truncate flex-1">{goal.title}</span>
                      <span className={cn(
                        "text-[7px] font-black uppercase px-2 py-0.2 rounded border shrink-0 ml-2",
                        goal.status === 'completed' ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-primary/20 bg-primary/10 text-primary"
                      )}>
                        {goal.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SQUAD HEALTH VIEW */}
        {activeScope === 'team' && isManager && (
          <div className="space-y-4">
            
            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="aether-glass p-4 bg-surface/85 dark:bg-surface/50 border border-border dark:border-border-strong flex flex-col justify-between h-24 shadow-xs">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Squad completion rate</span>
                <span className="text-xl font-black text-foreground block mt-1">{teamProgress}%</span>
                <div className="w-full bg-secondary h-1 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${teamProgress}%` }} />
                </div>
              </div>

              <div className="aether-glass p-4 bg-surface/85 dark:bg-surface/50 border border-border dark:border-border-strong flex flex-col justify-between h-24 shadow-xs">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Active Squad Tickets</span>
                <span className="text-xl font-black text-foreground block mt-1">{teamActiveTasks.length}</span>
                <span className="text-[9px] text-muted-foreground font-bold leading-none block">Awaiting sign-off/review</span>
              </div>
            </div>

            {/* Load balancer */}
            <div className="aether-glass p-4 bg-surface/85 dark:bg-surface/50 border border-border dark:border-border-strong space-y-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 border-b border-border pb-2.5">
                <Users className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Squad Task load Balancer</span>
              </div>

              {teamLoadDistribution.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4 font-semibold">Your squad has no teammates.</p>
              ) : (
                <div className="space-y-3">
                  {teamLoadDistribution.map((item) => (
                    <div key={item.memberId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[7px]" style={{ background: `hsl(${avatarHue(item.memberId)} 55% 45%)` }}>
                            {avatarInitials(item.name)}
                          </div>
                          <span className="text-foreground">{item.name}</span>
                        </div>
                        <span className="text-muted-foreground">{item.count} tickets active</span>
                      </div>
                      <div className="w-full bg-secondary h-1 rounded-full overflow-hidden border border-border/40">
                        <div className={cn(
                          "h-full rounded-full",
                          item.count > 4 ? "bg-red-500" : item.count > 2 ? "bg-amber-500" : "bg-primary"
                        )} style={{ width: `${Math.min((item.count / 8) * 100, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* INITIATIVES VIEW */}
        {activeScope === 'project' && (
          <div className="space-y-3.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block px-1">
              Active Organization Projects ({projects.length})
            </span>

            {projects.length === 0 ? (
              <div className="aether-glass p-8 text-center bg-secondary/25 border border-dashed border-border rounded-xl">
                <span className="text-xs font-bold text-foreground">No projects configured</span>
              </div>
            ) : (
              projects.map((proj) => {
                const projTasks = tasks.filter(t => t.projectId === proj.id);
                const projDone = projTasks.filter(t => t.status === 'done');
                const rate = projTasks.length > 0 ? Math.round((projDone.length / projTasks.length) * 100) : 0;

                return (
                  <div key={proj.id} className="aether-glass p-4 bg-surface/90 dark:bg-surface/50 border border-border dark:border-border-strong space-y-3 shadow-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-black text-foreground truncate">{proj.name}</span>
                      <span className="font-mono text-[9px] font-bold text-primary">{rate}%</span>
                    </div>

                    <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${rate}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-muted-foreground font-bold">
                      <span>{projDone.length} of {projTasks.length} tasks completed</span>
                      <span>Target horizons: {goals.filter(g => g.projectId === proj.id).length}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* Task Details Drawer */}
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

      {/* Goal Details Drawer */}
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
export default MobileReports;
