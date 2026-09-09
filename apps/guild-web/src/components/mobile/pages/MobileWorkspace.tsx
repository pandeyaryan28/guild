import * as React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Loader2, 
  Check, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Play, 
  RotateCcw, 
  Target, 
  Lock, 
  Users, 
  FolderGit, 
  LayoutGrid, 
  List as ListIcon, 
  Search, 
  X, 
  ChevronRight, 
  ArrowRight, 
  SlidersHorizontal, 
  Folder,
  Layers,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from '../../../hooks/useAuth';
import { useTasks } from '../../../hooks/useTasks';
import { useGoals } from '../../../hooks/useGoals';
import { useProjects } from '../../../hooks/useProjects';
import { useTeams } from '../../../hooks/useTeams';
import { useOrgMembers } from '../../../hooks/useChat';
import { createTask, moveTask, addComment, type Task, type TaskStatus, type TaskPriority } from '../../../lib/tasks';
import { createGoal, type Goal } from '../../../lib/goals';
import { createProject, type Project } from '../../../lib/projects';
import { TaskDetailDrawer } from '../../tasks/TaskDetailDrawer';
import { GoalDetailDrawer } from '../../tasks/GoalDetailDrawer';
import { cn } from '@/lib/utils';
import { avatarHue } from '../../MemberProfileDrawer';

// Helper for compact dates (e.g. "Oct 14")
function formatShortDate(date: any) {
  if (!date) return null;
  try {
    const d = typeof date.toDate === 'function' ? date.toDate() : (date instanceof Date ? date : new Date(date));
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

export function MobileWorkspace() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  // Data subscriptions
  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { goals, loading: goalsLoading } = useGoals(orgId);
  const { projects, loading: projectsLoading } = useProjects(orgId);
  const { teams, loading: teamsLoading } = useTeams(orgId);
  const members = useOrgMembers(orgId);

  // 1. Navigation Scopes: 'my-space' (Personal), 'my-team' (Team Coordination), 'projects' (All Projects)
  const [activeScope, setActiveScope] = React.useState<'my-space' | 'my-team' | 'projects'>('my-space');
  
  // 2. Sub-tab (Tasks vs Strategic Goals)
  const [workspaceTab, setWorkspaceTab] = React.useState<'tasks' | 'goals'>('tasks');
  
  // 3. View mode: List vs Mobile Kanban Board
  const [viewMode, setViewMode] = React.useState<'list' | 'kanban'>('list');

  // 4. Status tab in List view
  const [activeStatusTab, setActiveStatusTab] = React.useState<TaskStatus>('todo');

  // 5. Teams management for 'my-team' scope
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>('');

  const visibleTeams = React.useMemo(() => {
    const isOrgAdmin = userProfile?.role === 'owner' || userProfile?.role === 'admin';
    if (isOrgAdmin) return teams;
    return teams.filter(t => t.managerId === user?.uid || t.memberIds.includes(user?.uid || ''));
  }, [teams, user?.uid, userProfile?.role]);

  const selectedTeam = React.useMemo(() => {
    return visibleTeams.find(t => t.id === selectedTeamId) || visibleTeams[0] || null;
  }, [visibleTeams, selectedTeamId]);

  React.useEffect(() => {
    if (visibleTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(visibleTeams[0].id);
    }
  }, [visibleTeams, selectedTeamId]);

  // 6. Search & Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedProjectId, setSelectedProjectId] = React.useState('all');
  const [selectedPriority, setSelectedPriority] = React.useState('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = React.useState('all');
  const [showFilterBar, setShowFilterBar] = React.useState(false);

  // 7. Quick task input in List view
  const [quickTitle, setQuickTitle] = React.useState('');
  const [creatingQuick, setCreatingQuick] = React.useState(false);

  // 8. Slide-up Comprehensive Creation Drawer
  const [showCreateDrawer, setShowCreateDrawer] = React.useState(false);
  const [createType, setCreateType] = React.useState<'task' | 'goal' | 'project'>('task');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Forms
  const [taskForm, setTaskForm] = React.useState({
    title: '',
    description: '',
    priority: 'none' as TaskPriority,
    projectId: '',
    goalId: '',
    assigneeId: user?.uid || '',
    dueDate: '',
  });

  const [goalForm, setGoalForm] = React.useState({
    title: '',
    description: '',
    projectId: '',
    ownerId: user?.uid || '',
    horizon: 'short_term' as 'short_term' | 'long_term',
    targetDate: '',
  });

  const [projectForm, setProjectForm] = React.useState({
    name: '',
    description: '',
    startDate: '',
    dueDate: '',
  });

  // 9. Send-Back Revision Modal
  const [sendBackTask, setSendBackTask] = React.useState<Task | null>(null);
  const [sendBackComment, setSendBackComment] = React.useState('');
  const [isSendingBack, setIsSendingBack] = React.useState(false);

  // 10. Drawers for detailed viewing
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [selectedGoal, setSelectedGoal] = React.useState<any>(null);

  // Toast message
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const actor = React.useMemo(() => ({
    uid: userProfile?.uid ?? '',
    name: userProfile?.fullName || 'Unknown',
  }), [userProfile]);

  // Member map
  const memberMap = React.useMemo(() => {
    const map = new Map<string, any>();
    members.forEach((m) => map.set(m.uid, m));
    return map;
  }, [members]);

  const getMemberInitials = (uid: string) => {
    const m = memberMap.get(uid);
    if (!m) return 'U';
    return m.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getMemberName = (uid: string) => {
    const m = memberMap.get(uid);
    return m ? m.fullName : 'Unassigned';
  };

  // ─── Scoped Tasks & Goals Filtering ───
  const scopedTasks = React.useMemo(() => {
    if (activeScope === 'my-space') {
      return tasks.filter(t => {
        if (!t.assigneeIds.includes(user?.uid || '')) return false;
        if (t.parentTaskId) return false;
        if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
        if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;
        return true;
      });
    }

    if (activeScope === 'my-team') {
      if (!selectedTeam) return [];
      const teamUids = Array.from(new Set([selectedTeam.managerId, ...selectedTeam.memberIds]));
      return tasks.filter(t => {
        if (t.parentTaskId) return false;
        if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
        if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;
        if (selectedAssigneeId !== 'all' && !t.assigneeIds.includes(selectedAssigneeId)) return false;

        const isAssignedByMe = t.creatorId === user?.uid;
        const isAssignedToTeam = t.assigneeIds.some(uid => teamUids.includes(uid));
        return isAssignedByMe || isAssignedToTeam;
      });
    }

    return tasks.filter(t => {
      if (t.parentTaskId) return false;
      if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;
      return true;
    });
  }, [tasks, activeScope, user?.uid, selectedTeam, searchQuery, selectedProjectId, selectedPriority, selectedAssigneeId]);

  const scopedGoals = React.useMemo(() => {
    if (activeScope === 'my-space') {
      return goals.filter(g => {
        if (g.ownerId !== user?.uid) return false;
        if (searchQuery.trim() && !g.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (selectedProjectId !== 'all' && g.projectId !== selectedProjectId) return false;
        return true;
      });
    }

    if (activeScope === 'my-team') {
      if (!selectedTeam) return [];
      const teamUids = Array.from(new Set([selectedTeam.managerId, ...selectedTeam.memberIds]));
      return goals.filter(g => {
        if (searchQuery.trim() && !g.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (selectedProjectId !== 'all' && g.projectId !== selectedProjectId) return false;
        return teamUids.includes(g.ownerId);
      });
    }

    return goals;
  }, [goals, activeScope, user?.uid, selectedTeam, searchQuery, selectedProjectId]);

  // Status-filtered tasks for list view
  const listTasks = React.useMemo(() => {
    return scopedTasks.filter(t => t.status === activeStatusTab);
  }, [scopedTasks, activeStatusTab]);

  // Project progress map
  const projectProgressMap = React.useMemo(() => {
    const map = new Map<string, { total: number; done: number; pct: number }>();
    projects.forEach(p => {
      const pTasks = tasks.filter(t => t.projectId === p.id);
      const doneTasks = pTasks.filter(t => t.status === 'done');
      const pct = pTasks.length > 0 ? Math.round((doneTasks.length / pTasks.length) * 100) : 0;
      map.set(p.id, { total: pTasks.length, done: doneTasks.length, pct });
    });
    return map;
  }, [projects, tasks]);

  // ─── Actions ───
  const handleQuickCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !orgId || creatingQuick) return;
    setCreatingQuick(true);
    try {
      await createTask({
        orgId,
        title: quickTitle.trim(),
        status: activeStatusTab,
        assigneeIds: [user?.uid || ''],
        actor,
      });
      setQuickTitle('');
      setToastMessage("Task added to queue.");
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingQuick(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setIsSubmitting(true);

    try {
      if (createType === 'task') {
        if (!taskForm.title.trim()) return;
        await createTask({
          orgId,
          title: taskForm.title.trim(),
          description: taskForm.description,
          priority: taskForm.priority,
          projectId: taskForm.projectId || null,
          goalId: taskForm.goalId || null,
          assigneeIds: taskForm.assigneeId ? [taskForm.assigneeId] : [user?.uid || ''],
          dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : null,
          actor,
        });
        setTaskForm({ title: '', description: '', priority: 'none', projectId: '', goalId: '', assigneeId: user?.uid || '', dueDate: '' });
        setToastMessage("Task created successfully.");
      } else if (createType === 'goal') {
        if (!goalForm.title.trim()) return;
        await createGoal({
          orgId,
          title: goalForm.title.trim(),
          description: goalForm.description || 'Goal established via mobile workspace.',
          horizon: goalForm.horizon,
          targetDate: goalForm.targetDate ? new Date(goalForm.targetDate) : null,
          projectId: goalForm.projectId || null,
          ownerId: goalForm.ownerId || user?.uid || '',
          actor,
        });
        setGoalForm({ title: '', description: '', projectId: '', ownerId: user?.uid || '', horizon: 'short_term', targetDate: '' });
        setToastMessage("Strategic goal created.");
      } else if (createType === 'project') {
        if (!projectForm.name.trim()) return;
        await createProject({
          orgId,
          name: projectForm.name.trim(),
          description: projectForm.description,
          startDate: projectForm.startDate ? new Date(projectForm.startDate) : null,
          dueDate: projectForm.dueDate ? new Date(projectForm.dueDate) : null,
          memberIds: [actor.uid],
          actor,
        });
        setProjectForm({ name: '', description: '', startDate: '', dueDate: '' });
        setToastMessage("Project created.");
      }
      setShowCreateDrawer(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveStatus = async (task: Task, nextStatus: TaskStatus) => {
    if (!orgId) return;
    try {
      await moveTask(task.id, orgId, nextStatus, task.orderIndex || 1000, task.status, actor);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendBackConfirm = async () => {
    if (!sendBackTask || !orgId || !sendBackComment.trim() || isSendingBack) return;
    setIsSendingBack(true);
    try {
      await moveTask(sendBackTask.id, orgId, 'in_progress', sendBackTask.orderIndex || 1000, sendBackTask.status, actor);
      await addComment({
        taskId: sendBackTask.id,
        orgId,
        authorId: actor.uid,
        authorName: actor.name,
        authorUsername: actor.name.toLowerCase().replace(/\s+/g, ''),
        body: `[Review Feedback] ${sendBackComment.trim()}`,
        mentions: sendBackTask.assigneeIds || [],
        taskTitle: sendBackTask.title,
      });
      setToastMessage("Task returned to assignee.");
      setSendBackTask(null);
      setSendBackComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingBack(false);
    }
  };

  const PRIORITY_BADGES: Record<string, { label: string; class: string }> = {
    urgent: { label: 'Urgent', class: 'border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400' },
    high: { label: 'High', class: 'border-orange-500/30 bg-orange-500/10 text-orange-500 dark:text-orange-400' },
    medium: { label: 'Med', class: 'border-blue-500/30 bg-blue-500/10 text-blue-500 dark:text-blue-400' },
    low: { label: 'Low', class: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400' },
    none: { label: '', class: 'hidden' },
  };

  const STATUS_COLS: { id: TaskStatus; label: string; dotColor: string }[] = [
    { id: 'todo', label: 'To Do', dotColor: 'bg-zinc-400' },
    { id: 'in_progress', label: 'In Progress', dotColor: 'bg-amber-400' },
    { id: 'review', label: 'Review', dotColor: 'bg-indigo-400' },
    { id: 'done', label: 'Done', dotColor: 'bg-emerald-400' },
  ];

  const hasActiveFilters = selectedProjectId !== 'all' || selectedPriority !== 'all' || (activeScope === 'my-team' && selectedAssigneeId !== 'all') || searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col space-y-3.5 animate-fluid-pop pb-8 max-w-2xl mx-auto w-full">
      {/* Toast Notification Pill */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 aether-glass bg-surface/98 dark:bg-surface/90 border border-primary/30 px-4 py-2 rounded-full shadow-2xl text-xs font-bold text-foreground flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── 1. Header with Page Title & Aligned Action Controls ─── */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight">Workspace</h1>
          <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
            {activeScope === 'my-space' ? 'Personal tasks & deliverables' : activeScope === 'my-team' ? (selectedTeam ? `${selectedTeam.name} coordination` : 'Team board') : 'Initiatives & project tracking'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowFilterBar(!showFilterBar)}
            className={cn(
              "h-9 w-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-xs",
              showFilterBar || hasActiveFilters
                ? "bg-primary/15 text-primary border-primary/40 shadow-xs"
                : "bg-surface/80 hover:bg-secondary text-muted-foreground hover:text-foreground border-border"
            )}
            title="Search & Filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (activeScope === 'projects') {
                setCreateType('project');
              } else {
                setCreateType(workspaceTab === 'goals' ? 'goal' : 'task');
              }
              setShowCreateDrawer(true);
            }}
            className="h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer border border-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* ─── 2. Scope Switcher: My Space vs My Team vs Projects ─── */}
      <div className="p-1 flex rounded-2xl bg-secondary/60 border border-border shadow-xs">
        {[
          { id: 'my-space', label: 'My Space', icon: Target },
          { id: 'my-team', label: 'My Team', icon: Users },
          { id: 'projects', label: 'Projects', icon: FolderGit },
        ].map((scope) => {
          const isActive = activeScope === scope.id;
          const Icon = scope.icon;
          return (
            <button
              key={scope.id}
              onClick={() => setActiveScope(scope.id as any)}
              className={cn(
                "relative flex-1 py-2 text-center text-xs font-black rounded-xl transition-all cursor-pointer select-none",
                isActive ? "text-primary-foreground font-black" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="workspaceScopeTab"
                  className="absolute inset-0 bg-primary rounded-xl shadow-sm z-0"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{scope.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Team Selector Pill (when in My Team scope) ─── */}
      {activeScope === 'my-team' && visibleTeams.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto aether-scroll pb-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0 pl-1">
            Team:
          </span>
          {visibleTeams.map((team) => {
            const isSelected = team.id === selectedTeam?.id;
            return (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={cn(
                  "px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer shrink-0",
                  isSelected
                    ? "bg-surface text-foreground border-primary/50 shadow-xs"
                    : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {team.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Expandable Search & Filters Drawer ─── */}
      <AnimatePresence>
        {showFilterBar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-2.5 bg-surface/95 dark:bg-surface/50 p-3.5 rounded-2xl border border-border shadow-xs"
          >
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, goals, or initiatives..."
                className="w-full pl-9 pr-8 py-2 bg-secondary/50 border border-border rounded-xl text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 shadow-xs"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-secondary/60 border border-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50 truncate cursor-pointer shadow-xs"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="bg-secondary/60 border border-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50 cursor-pointer shadow-xs"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent Priority</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setSelectedProjectId('all');
                    setSelectedPriority('all');
                    setSelectedAssigneeId('all');
                    setSearchQuery('');
                  }}
                  className="text-[10px] font-black text-primary hover:underline cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 3. Scope Content ─── */}
      {activeScope === 'projects' ? (
        /* Projects List View */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Strategic Initiatives ({projects.length})
            </span>
          </div>

          {projectsLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-bold">Loading initiatives...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-8 text-center bg-secondary/25 border border-dashed border-border rounded-2xl py-14">
              <FolderGit className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <span className="text-xs font-black text-foreground block uppercase tracking-wider">No Projects Established</span>
              <span className="text-[11px] text-muted-foreground mt-1 block font-semibold">Tap "New" to start your team's first initiative.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const prog = projectProgressMap.get(project.id) || { total: 0, done: 0, pct: 0 };
                const formattedDue = formatShortDate(project.dueDate);

                return (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="p-4 rounded-2xl bg-surface/95 dark:bg-surface/50 border border-border hover:border-primary/40 active:scale-[0.99] transition-all cursor-pointer shadow-xs flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                          <Folder className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-black text-foreground block truncate leading-snug">{project.name}</span>
                          <span className="text-[10px] text-muted-foreground block truncate mt-0.5 font-medium">{project.description || 'No description provided.'}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-1" />
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                        <span>Progress</span>
                        <span>{prog.done}/{prog.total} tasks · {prog.pct}%</span>
                      </div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="bg-primary h-full rounded-full transition-all duration-300" 
                          style={{ width: `${prog.pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold pt-1 border-t border-border/70">
                      <span>{project.memberIds?.length || 1} team members</span>
                      {formattedDue && (
                        <span className="flex items-center gap-1 font-bold text-foreground/80">
                          <Calendar className="w-3 h-3 text-primary" />
                          <span>Due {formattedDue}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Tasks & Strategic Goals Scope (My Space or My Team) */
        <div className="space-y-3.5">
          {/* Sub-header Controls: Tasks vs Goals toggle + List vs Kanban Mode Toggle */}
          <div className="flex items-center justify-between gap-2">
            {/* Tasks vs Goals Tab Switcher */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/60 border border-border">
              <button
                onClick={() => setWorkspaceTab('tasks')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5",
                  workspaceTab === 'tasks'
                    ? "bg-surface text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Tasks</span>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-md font-black",
                  workspaceTab === 'tasks' ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}>
                  {scopedTasks.length}
                </span>
              </button>

              <button
                onClick={() => setWorkspaceTab('goals')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5",
                  workspaceTab === 'goals'
                    ? "bg-surface text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Goals</span>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-md font-black",
                  workspaceTab === 'goals' ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}>
                  {scopedGoals.length}
                </span>
              </button>
            </div>

            {/* List vs Kanban Board Switcher (only for tasks) */}
            {workspaceTab === 'tasks' && (
              <div className="flex items-center p-1 rounded-xl bg-secondary/60 border border-border">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all cursor-pointer",
                    viewMode === 'list' ? "bg-surface text-foreground shadow-xs border border-border/80" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="List View"
                >
                  <ListIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all cursor-pointer",
                    viewMode === 'kanban' ? "bg-surface text-foreground shadow-xs border border-border/80" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Kanban Board View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* ─── Task Views (List vs Kanban) ─── */}
          {workspaceTab === 'tasks' ? (
            viewMode === 'list' ? (
              /* ─── List View ─── */
              <div className="space-y-3">
                {/* Horizontal Status Track */}
                <div className="flex items-center gap-1.5 overflow-x-auto aether-scroll pb-1">
                  {STATUS_COLS.map((col) => {
                    const isActive = activeStatusTab === col.id;
                    const count = scopedTasks.filter(t => t.status === col.id).length;
                    return (
                      <button
                        key={col.id}
                        onClick={() => setActiveStatusTab(col.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 border flex items-center gap-1.5 select-none",
                          isActive
                            ? "bg-surface text-foreground border-primary/50 shadow-xs"
                            : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground hover:bg-secondary/70"
                        )}
                      >
                        <span className={cn("w-2 h-2 rounded-full", col.dotColor)} />
                        <span>{col.label}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-md text-[9px] font-black",
                          isActive ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                        )}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Add Bar */}
                <form onSubmit={handleQuickCreateTask} className="flex gap-2 bg-surface/90 dark:bg-surface/50 border border-border p-2 rounded-2xl shadow-xs">
                  <input
                    type="text"
                    placeholder={`Quick add task to ${activeStatusTab.replace('_', ' ')}...`}
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    className="flex-1 bg-secondary/50 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 font-bold"
                  />
                  <button
                    type="submit"
                    disabled={!quickTitle.trim() || creatingQuick}
                    className="px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-primary/95 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {creatingQuick ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                </form>

                {/* Task Stream */}
                {tasksLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground font-bold">Synchronizing tasks...</span>
                  </div>
                ) : listTasks.length === 0 ? (
                  <div className="p-8 text-center bg-secondary/25 border border-dashed border-border rounded-2xl py-14 my-2">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <span className="text-xs font-black text-foreground block uppercase tracking-wider">Queue is Clear</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block font-semibold">No tasks currently pending in this queue.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <AnimatePresence mode="popLayout">
                      {listTasks.map((task) => {
                        const priorityInfo = PRIORITY_BADGES[task.priority] || { label: '', class: 'hidden' };
                        const project = projects.find(p => p.id === task.projectId);
                        const formattedDue = formatShortDate(task.dueDate);
                        const assigneeUid = task.assigneeIds[0] || '';
                        const assigneeName = getMemberName(assigneeUid);

                        return (
                          <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            onClick={() => setSelectedTask(task)}
                            className="p-3.5 rounded-2xl bg-surface/95 dark:bg-surface/50 border border-border hover:border-primary/40 active:scale-[0.99] transition-all cursor-pointer shadow-xs flex flex-col gap-2.5"
                          >
                            {/* Top row: Title + Priority Chip */}
                            <div className="flex items-start justify-between gap-2.5">
                              <span className="text-[13px] font-bold text-foreground leading-snug flex-1">
                                {task.title}
                              </span>
                              {task.priority !== 'none' && (
                                <span className={cn("text-[9px] px-2 py-0.5 rounded-md border font-black uppercase tracking-wider shrink-0 shadow-2xs", priorityInfo.class)}>
                                  {priorityInfo.label}
                                </span>
                              )}
                            </div>

                            {/* Metadata row: Project tag & Due date */}
                            {(project || formattedDue) && (
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold flex-wrap">
                                {project && (
                                  <span className="inline-flex items-center gap-1 text-primary bg-primary/8 px-2 py-0.5 rounded-md border border-primary/15 max-w-[150px] truncate">
                                    <Folder className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{project.name}</span>
                                  </span>
                                )}
                                {formattedDue && (
                                  <span className="inline-flex items-center gap-1 font-bold text-foreground/80">
                                    <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <span>{formattedDue}</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Footer row: Assignee info + Quick Action */}
                            <div className="pt-2 border-t border-border/70 flex items-center justify-between text-[10px]" onClick={(e) => e.stopPropagation()}>
                              {/* Assignee Avatar & Name */}
                              <div className="flex items-center gap-2 min-w-0">
                                {assigneeUid ? (
                                  <>
                                    <div 
                                      className="w-5 h-5 rounded-full flex items-center justify-center font-black text-[9px] text-white shadow-2xs shrink-0"
                                      style={{ background: `hsl(${avatarHue(assigneeUid)} 55% 45%)` }}
                                    >
                                      {getMemberInitials(assigneeUid)}
                                    </div>
                                    <span className="text-muted-foreground truncate max-w-[120px]">
                                      {assigneeName}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground italic">Unassigned</span>
                                )}
                              </div>

                              {/* Action Button */}
                              <div className="shrink-0">
                                {activeStatusTab === 'todo' && (
                                  <button
                                    onClick={() => handleMoveStatus(task, 'in_progress')}
                                    className="py-1 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-black flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>Start</span>
                                  </button>
                                )}

                                {activeStatusTab === 'in_progress' && (
                                  <button
                                    onClick={() => handleMoveStatus(task, 'review')}
                                    className="py-1 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                  >
                                    <Clock className="w-3 h-3" />
                                    <span>Review</span>
                                  </button>
                                )}

                                {activeStatusTab === 'review' && (
                                  task.creatorId === userProfile?.uid ? (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => {
                                          setSendBackTask(task);
                                          setSendBackComment('');
                                        }}
                                        className="py-1 px-2.5 rounded-xl bg-secondary border border-border text-foreground hover:bg-secondary/80 text-xs font-black flex items-center gap-1 cursor-pointer active:scale-95"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Send Back</span>
                                      </button>
                                      <button
                                        onClick={() => handleMoveStatus(task, 'done')}
                                        className="py-1 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                      >
                                        <Check className="w-3 h-3" />
                                        <span>Approve</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-1">
                                      <Lock className="w-3 h-3" />
                                      <span>In Review</span>
                                    </span>
                                  )
                                )}

                                {activeStatusTab === 'done' && (
                                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    <span>Completed</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ) : (
              /* ─── Mobile Kanban Board View ─── */
              <div className="space-y-3">
                {/* Horizontal Kanban Scroll Track */}
                <div className="flex gap-3 overflow-x-auto pb-4 aether-scroll snap-x snap-mandatory -mx-3.5 px-3.5 sm:-mx-4 sm:px-4">
                  {STATUS_COLS.map((col) => {
                    const colTasks = scopedTasks.filter(t => t.status === col.id);

                    return (
                      <div
                        key={col.id}
                        className="w-[84vw] max-w-[320px] shrink-0 snap-center flex flex-col rounded-2xl bg-surface/90 dark:bg-surface/40 border border-border p-3.5 space-y-3 shadow-xs"
                      >
                        {/* Column Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-border">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full", col.dotColor)} />
                            <span className="text-xs font-black text-foreground uppercase tracking-wider">
                              {col.label}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground text-[10px] font-black border border-border">
                            {colTasks.length}
                          </span>
                        </div>

                        {/* Column Tasks Scroll */}
                        <div className="space-y-2.5 max-h-[56dvh] overflow-y-auto pr-1 aether-scroll">
                          {colTasks.length === 0 ? (
                            <div className="py-10 text-center text-muted-foreground text-[11px] font-semibold italic">
                              No items in {col.label}
                            </div>
                          ) : (
                            colTasks.map((task) => {
                              const priorityInfo = PRIORITY_BADGES[task.priority] || { label: '', class: 'hidden' };
                              const project = projects.find(p => p.id === task.projectId);
                              const formattedDue = formatShortDate(task.dueDate);

                              return (
                                <div
                                  key={task.id}
                                  onClick={() => setSelectedTask(task)}
                                  className="p-3 rounded-xl bg-surface dark:bg-surface-elevated border border-border hover:border-primary/40 active:scale-[0.99] transition-all cursor-pointer shadow-xs space-y-2"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-xs font-bold text-foreground line-clamp-2 leading-snug">
                                      {task.title}
                                    </span>
                                    {task.priority !== 'none' && (
                                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-black uppercase shrink-0", priorityInfo.class)}>
                                        {priorityInfo.label}
                                      </span>
                                    )}
                                  </div>

                                  {(project || formattedDue) && (
                                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-semibold flex-wrap">
                                      {project && (
                                        <span className="text-primary truncate max-w-[140px] flex items-center gap-1">
                                          <Folder className="w-2.5 h-2.5 shrink-0" />
                                          <span className="truncate">{project.name}</span>
                                        </span>
                                      )}
                                      {formattedDue && (
                                        <span className="flex items-center gap-0.5">
                                          <Calendar className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                                          <span>{formattedDue}</span>
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Action buttons inside card */}
                                  <div className="pt-2 border-t border-border/70 flex items-center justify-between text-[10px]" onClick={(e) => e.stopPropagation()}>
                                    <div 
                                      className="w-5 h-5 rounded-full flex items-center justify-center font-black text-[9px] text-white shadow-2xs shrink-0"
                                      style={{ background: `hsl(${avatarHue(task.assigneeIds[0] || 'default')} 55% 45%)` }}
                                    >
                                      {getMemberInitials(task.assigneeIds[0] || '')}
                                    </div>

                                    {col.id === 'todo' && (
                                      <button
                                        onClick={() => handleMoveStatus(task, 'in_progress')}
                                        className="text-primary font-black flex items-center gap-1 hover:underline cursor-pointer text-xs"
                                      >
                                        <span>Start</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    )}

                                    {col.id === 'in_progress' && (
                                      <button
                                        onClick={() => handleMoveStatus(task, 'review')}
                                        className="text-amber-500 font-black flex items-center gap-1 hover:underline cursor-pointer text-xs"
                                      >
                                        <span>Review</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    )}

                                    {col.id === 'review' && task.creatorId === userProfile?.uid && (
                                      <button
                                        onClick={() => handleMoveStatus(task, 'done')}
                                        className="text-emerald-500 font-black flex items-center gap-1 hover:underline cursor-pointer text-xs"
                                      >
                                        <span>Approve</span>
                                        <Check className="w-3 h-3" />
                                      </button>
                                    )}

                                    {col.id === 'done' && (
                                      <span className="text-emerald-500 font-bold text-[10px] flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        <span>Done</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            /* ─── Strategic Goals View ─── */
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Strategic Horizon Goals ({scopedGoals.length})
                </span>
              </div>

              {goalsLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground font-bold">Synchronizing goals...</span>
                </div>
              ) : scopedGoals.length === 0 ? (
                <div className="p-8 text-center bg-secondary/25 border border-dashed border-border rounded-2xl py-14 my-2">
                  <Target className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <span className="text-xs font-black text-foreground block uppercase tracking-wider">No Goals Established</span>
                  <span className="text-[11px] text-muted-foreground mt-1 block font-semibold">Tap "New" to define strategic horizon targets.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {scopedGoals.map((goal) => {
                    const progress = goal.progressRollup ?? 0;
                    const formattedTarget = formatShortDate(goal.targetDate);

                    return (
                      <div
                        key={goal.id}
                        onClick={() => setSelectedGoal(goal)}
                        className="flex flex-col p-4 rounded-2xl bg-surface/95 dark:bg-surface/50 border border-border hover:border-primary/40 active:scale-[0.99] transition-all cursor-pointer shadow-xs gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs font-black text-foreground line-clamp-2 leading-snug flex-1">
                            {goal.title}
                          </span>
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0",
                            goal.status === 'completed' 
                              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                              : "border-primary/25 bg-primary/10 text-primary"
                          )}>
                            {goal.status}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground font-black uppercase tracking-wider">
                            <span>Goal progress</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden shadow-inner">
                            <div 
                              className="bg-primary h-full rounded-full transition-all duration-300" 
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground pt-1 border-t border-border/70">
                          <span className="text-primary font-black uppercase tracking-wider text-[9px]">{goal.horizon.replace('_', ' ')}</span>
                          {formattedTarget && (
                            <span className="flex items-center gap-1 font-bold text-foreground/80">
                              <Clock className="w-3 h-3 text-primary shrink-0" />
                              <span>Target: {formattedTarget}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Slide-Up Comprehensive Creation Drawer ─── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showCreateDrawer && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCreateDrawer(false)}
                className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs z-[65] pointer-events-auto"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-lg max-h-[92dvh] rounded-t-[32px] border-t border-border px-5 pt-3 z-[70] shadow-2xl flex flex-col bg-surface/98 dark:bg-surface/95 backdrop-blur-3xl overflow-hidden pointer-events-auto"
              >
                <div className="shrink-0 bg-muted-foreground/30 w-10 h-1 rounded-full mx-auto mb-3" />
                
                <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
                  <span className="text-xs font-black uppercase tracking-wider text-foreground">
                    Create New Item
                  </span>
                  <button
                    onClick={() => setShowCreateDrawer(false)}
                    className="h-7 w-7 rounded-full border border-border bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer active:scale-95 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Type Switcher */}
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-secondary/60 my-3 border border-border shrink-0">
                  {[
                    { id: 'task', label: 'Task' },
                    { id: 'goal', label: 'Goal' },
                    { id: 'project', label: 'Project' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setCreateType(t.id as any)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                        createType === t.id ? "bg-surface text-foreground shadow-xs border border-border/80" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Dynamic Form with generous bottom clearance allowing scrolling way above bottom dock */}
                <form onSubmit={handleCreateSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 py-2 aether-scroll overscroll-contain pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]">
                  {createType === 'task' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          Task Title <span className="text-primary">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={taskForm.title}
                          onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                          placeholder="What needs to be done?"
                          className="w-full bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border focus:border-primary/50 rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground placeholder:text-muted-foreground/60 outline-none transition-all shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Description & Details
                          </label>
                          <span className="text-[9px] font-bold text-muted-foreground/60">Optional</span>
                        </div>
                        <textarea
                          rows={3}
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                          placeholder="Add task context, checklist items, or acceptance criteria..."
                          className="w-full min-h-[84px] bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border focus:border-primary/50 rounded-xl px-3.5 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none transition-all shadow-xs resize-none leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Project</label>
                          <select
                            value={taskForm.projectId}
                            onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })}
                            className="w-full bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border rounded-xl px-2.5 py-2.5 text-xs font-bold text-foreground focus:outline-none cursor-pointer shadow-xs"
                          >
                            <option value="">No Project</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Priority</label>
                          <select
                            value={taskForm.priority}
                            onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                            className="w-full bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border rounded-xl px-2.5 py-2.5 text-xs font-bold text-foreground focus:outline-none cursor-pointer shadow-xs"
                          >
                            <option value="none">None</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Assignee</label>
                          <select
                            value={taskForm.assigneeId}
                            onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                            className="w-full bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border rounded-xl px-2.5 py-2.5 text-xs font-bold text-foreground focus:outline-none cursor-pointer shadow-xs"
                          >
                            <option value={user?.uid || ''}>Assign to me</option>
                            {members.map((m) => (
                              <option key={m.uid} value={m.uid}>{m.fullName}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Due Date</label>
                          <input
                            type="date"
                            value={taskForm.dueDate}
                            onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                            className="w-full bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border rounded-xl px-2.5 py-2 text-xs font-bold text-foreground focus:outline-none [color-scheme:light] dark:[color-scheme:dark] shadow-xs"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {createType === 'goal' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          Goal Title <span className="text-primary">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={goalForm.title}
                          onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                          placeholder="e.g. Complete Q3 Product Sprint"
                          className="w-full bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border focus:border-primary/50 rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground focus:outline-none shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Description</label>
                          <span className="text-[9px] font-bold text-muted-foreground/60">Optional</span>
                        </div>
                        <textarea
                          rows={3}
                          value={goalForm.description}
                          onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                          placeholder="Strategic outcome and key deliverables..."
                          className="w-full min-h-[84px] bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border focus:border-primary/50 rounded-xl px-3.5 py-2.5 text-xs font-medium text-foreground focus:outline-none shadow-xs resize-none leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Horizon</label>
                          <select
                            value={goalForm.horizon}
                            onChange={(e) => setGoalForm({ ...goalForm, horizon: e.target.value as any })}
                            className="w-full bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border rounded-xl px-2.5 py-2.5 text-xs font-bold text-foreground focus:outline-none cursor-pointer shadow-xs"
                          >
                            <option value="short_term">Short Term</option>
                            <option value="long_term">Long Term</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Target Date</label>
                          <input
                            type="date"
                            value={goalForm.targetDate}
                            onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                            className="w-full bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border rounded-xl px-2.5 py-2 text-xs font-bold text-foreground focus:outline-none [color-scheme:light] dark:[color-scheme:dark] shadow-xs"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {createType === 'project' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          Project Name <span className="text-primary">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={projectForm.name}
                          onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                          placeholder="e.g. Mobile App Redesign"
                          className="w-full bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border focus:border-primary/50 rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground focus:outline-none shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Description</label>
                          <span className="text-[9px] font-bold text-muted-foreground/60">Optional</span>
                        </div>
                        <textarea
                          rows={3}
                          value={projectForm.description}
                          onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                          placeholder="Project overview and timeline objectives..."
                          className="w-full min-h-[84px] bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border focus:border-primary/50 rounded-xl px-3.5 py-2.5 text-xs font-medium text-foreground focus:outline-none shadow-xs resize-none leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Start Date</label>
                          <input
                            type="date"
                            value={projectForm.startDate}
                            onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                            className="w-full bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border rounded-xl px-2.5 py-2 text-xs font-bold text-foreground focus:outline-none [color-scheme:light] dark:[color-scheme:dark] shadow-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Due Date</label>
                          <input
                            type="date"
                            value={projectForm.dueDate}
                            onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })}
                            className="w-full bg-secondary/50 hover:bg-secondary/70 focus:bg-surface border border-border rounded-xl px-2.5 py-2 text-xs font-bold text-foreground focus:outline-none [color-scheme:light] dark:[color-scheme:dark] shadow-xs"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-primary/95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 active:scale-[0.98]"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>CREATE {createType.toUpperCase()}</span>
                  </button>

                  <div className="h-6 shrink-0" />
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Send Back Review Feedback Modal ─── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {sendBackTask && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSendBackTask(null)}
                className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs z-[65] pointer-events-auto"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="fixed inset-x-4 top-1/3 z-[70] aether-glass bg-surface/98 dark:bg-surface/95 border border-border p-5 rounded-3xl shadow-2xl space-y-3 pointer-events-auto"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-black text-foreground uppercase tracking-wider">Send Back Task</span>
                  <button 
                    onClick={() => setSendBackTask(null)}
                    className="h-7 w-7 rounded-full border border-border bg-secondary flex items-center justify-center text-muted-foreground cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                  Provide feedback explaining why <b>"{sendBackTask.title}"</b> needs revisions before approval.
                </p>

                <textarea
                  rows={3}
                  required
                  value={sendBackComment}
                  onChange={(e) => setSendBackComment(e.target.value)}
                  placeholder="Detail the necessary revisions or missing deliverables..."
                  className="w-full bg-secondary/50 border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50 shadow-xs resize-none"
                />

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setSendBackTask(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendBackConfirm}
                    disabled={!sendBackComment.trim() || isSendingBack}
                    className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-black hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                  >
                    {isSendingBack ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    <span>Confirm Send Back</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Task Details Drawer ─── */}
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

      {/* ─── Goal Details Drawer ─── */}
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
