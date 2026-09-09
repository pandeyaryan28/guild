import * as React from 'react';
import { useNavigate } from 'react-router-dom';
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
  Lock,
  Users,
  FolderGit,
  LayoutGrid,
  List as ListIcon,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  SlidersHorizontal,
  Folder
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

  const getInitials = (uid: string) => {
    const m = memberMap.get(uid);
    if (!m) return 'U';
    return m.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
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

    return tasks;
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
      setToastMessage("Task sent back to assignee with feedback.");
      setSendBackTask(null);
      setSendBackComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingBack(false);
    }
  };

  const PRIORITY_BADGES: Record<string, string> = {
    urgent: 'border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400',
    high: 'border-orange-500/30 bg-orange-500/10 text-orange-500 dark:text-orange-400',
    medium: 'border-blue-500/30 bg-blue-500/10 text-blue-500 dark:text-blue-400',
    low: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400',
    none: 'border-transparent text-muted-foreground',
  };

  const STATUS_COLS: { id: TaskStatus; label: string; dotColor: string }[] = [
    { id: 'todo', label: 'To Do', dotColor: 'bg-zinc-400' },
    { id: 'in_progress', label: 'In Progress', dotColor: 'bg-amber-400' },
    { id: 'review', label: 'In Review', dotColor: 'bg-indigo-400' },
    { id: 'done', label: 'Done', dotColor: 'bg-emerald-400' },
  ];

  return (
    <div className="flex flex-col space-y-3.5 animate-fluid-pop pb-6">
      {/* Toast Notification Pill */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 aether-glass bg-surface/95 dark:bg-surface/90 border border-primary/40 px-4 py-2 rounded-full shadow-xl text-xs font-bold text-foreground flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-primary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── 1. Top Level Scope Switcher (My Space vs My Team vs Projects) ─── */}
      <div className="flex items-center justify-between gap-2">
        <div className="aether-glass p-1 flex-1 flex bg-secondary/50 border border-border shadow-xs rounded-2xl">
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
                  "relative flex-1 py-2 flex items-center justify-center gap-1.5 text-center text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer select-none",
                  isActive ? "text-primary-foreground font-black" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="workspaceScopeTab"
                    className="absolute inset-0 bg-primary rounded-xl shadow-md z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{scope.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Controls: Search & Filter toggle + Comprehensive Create + */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowFilterBar(!showFilterBar)}
            className={cn(
              "h-9 w-9 rounded-xl border border-border flex items-center justify-center transition-all cursor-pointer shadow-xs",
              showFilterBar || selectedProjectId !== 'all' || selectedPriority !== 'all' || searchQuery
                ? "bg-primary/15 text-primary border-primary/40"
                : "bg-surface/80 hover:bg-secondary text-muted-foreground hover:text-foreground"
            )}
            title="Toggle Filters"
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
            className="h-9 px-3 rounded-xl bg-primary text-white text-xs font-black flex items-center gap-1.5 shadow-md hover:bg-primary/95 active:scale-95 transition-all cursor-pointer"
            title="Create New"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>

      {/* ─── Team Picker (When in 'my-team' scope) ─── */}
      {activeScope === 'my-team' && visibleTeams.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Active Team</span>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="bg-surface/90 dark:bg-surface/60 border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50 cursor-pointer shadow-xs"
          >
            {visibleTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.memberIds.length + 1} members)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ─── Expandable Search & Filters Drawer ─── */}
      <AnimatePresence>
        {showFilterBar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-2.5 bg-surface/80 dark:bg-surface/40 p-3 rounded-2xl border border-border"
          >
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by keyword..."
                className="w-full pl-9 pr-8 py-2 bg-secondary/60 border border-border rounded-xl text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Project Filter */}
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-secondary/60 border border-border rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-foreground focus:outline-none"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="bg-secondary/60 border border-border rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-foreground focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(selectedProjectId !== 'all' || selectedPriority !== 'all' || searchQuery) && (
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
                  Reset Filters
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 2. Scope Views: Projects Scope vs Task/Goal Scopes ─── */}
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
              <span className="text-[10px] text-muted-foreground mt-1 block">Tap "New" to create your team's first project.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const prog = projectProgressMap.get(project.id) || { total: 0, done: 0, pct: 0 };
                const due = project.dueDate ? (typeof (project.dueDate as any).toDate === 'function' ? (project.dueDate as any).toDate() : new Date(project.dueDate as any)) : null;

                return (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="p-4 rounded-2xl bg-surface/90 dark:bg-surface/50 border border-border dark:border-border-strong hover:border-primary/30 active:scale-[0.99] transition-all cursor-pointer shadow-xs flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                          <Folder className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-foreground block truncate">{project.name}</span>
                          <span className="text-[9px] text-muted-foreground block truncate mt-0.5">{project.description || 'No description provided.'}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-1" />
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-muted-foreground">
                        <span>Work Completed</span>
                        <span>{prog.done} of {prog.total} tasks ({prog.pct}%)</span>
                      </div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="bg-primary h-full rounded-full transition-all duration-300" 
                          style={{ width: `${prog.pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-muted-foreground font-semibold pt-1 border-t border-border/70">
                      <span>{project.memberIds?.length || 1} team members</span>
                      {due && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-primary/70" />
                          <span>Due {due.toLocaleDateString()}</span>
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWorkspaceTab('tasks')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border",
                  workspaceTab === 'tasks'
                    ? "bg-surface dark:bg-surface-elevated text-foreground border-border shadow-xs"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Tasks</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-secondary text-muted-foreground font-black">
                  {scopedTasks.length}
                </span>
              </button>

              <button
                onClick={() => setWorkspaceTab('goals')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border",
                  workspaceTab === 'goals'
                    ? "bg-surface dark:bg-surface-elevated text-foreground border-border shadow-xs"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Goals</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-secondary text-muted-foreground font-black">
                  {scopedGoals.length}
                </span>
              </button>
            </div>

            {/* List vs Kanban Board Switcher (only for tasks) */}
            {workspaceTab === 'tasks' && (
              <div className="flex items-center p-0.5 rounded-xl bg-secondary border border-border">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all cursor-pointer",
                    viewMode === 'list' ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="List View"
                >
                  <ListIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all cursor-pointer",
                    viewMode === 'kanban' ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
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
                {/* Status Segmented Tabs */}
                <div className="aether-glass p-1 flex bg-secondary/50 border border-border shadow-xs rounded-2xl">
                  {STATUS_COLS.map((col) => {
                    const isActive = activeStatusTab === col.id;
                    const count = scopedTasks.filter(t => t.status === col.id).length;
                    return (
                      <button
                        key={col.id}
                        onClick={() => setActiveStatusTab(col.id)}
                        className={cn(
                          "relative flex-1 py-1.5 text-center text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer select-none",
                          isActive ? "text-primary-foreground font-black" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {isActive && (
                          <motion.div 
                            layoutId="workspaceStatusTab"
                            className="absolute inset-0 bg-primary rounded-xl shadow-md z-0"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center justify-center gap-1">
                          <span>{col.label}</span>
                          <span className={cn(
                            "px-1.5 py-0.2 rounded-md text-[8px] font-black",
                            isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground"
                          )}>
                            {count}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Add Bar */}
                <form onSubmit={handleQuickCreateTask} className="flex gap-2 bg-surface/85 dark:bg-surface/50 border border-border dark:border-border-strong p-2.5 rounded-2xl shadow-xs">
                  <input
                    type="text"
                    placeholder={`Add task to ${activeStatusTab.replace('_', ' ')}...`}
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    className="flex-1 bg-secondary/60 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 font-bold"
                  />
                  <button
                    type="submit"
                    disabled={!quickTitle.trim() || creatingQuick}
                    className="px-3.5 rounded-xl bg-primary text-white text-xs font-black hover:bg-primary/95 transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-md"
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
                  <div className="p-8 text-center bg-secondary/25 border border-dashed border-border rounded-2xl py-14">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <span className="text-xs font-black text-foreground block uppercase tracking-wider">Queue is Clear</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">No tasks currently pending in this queue.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <AnimatePresence mode="popLayout">
                      {listTasks.map((task) => {
                        const priorityClass = PRIORITY_BADGES[task.priority] || '';
                        const project = projects.find(p => p.id === task.projectId);
                        const due = task.dueDate ? (typeof (task.dueDate as any).toDate === 'function' ? (task.dueDate as any).toDate() : new Date(task.dueDate as any)) : null;

                        return (
                          <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            onClick={() => setSelectedTask(task)}
                            className="p-3.5 rounded-2xl bg-surface/90 dark:bg-surface/50 border border-border dark:border-border-strong hover:border-primary/30 active:scale-[0.99] transition-all cursor-pointer shadow-xs flex flex-col gap-2.5"
                          >
                            <div className="flex items-start justify-between gap-2.5">
                              <span className="text-xs font-black text-foreground leading-snug flex-1">
                                {task.title}
                              </span>
                              {task.priority !== 'none' && (
                                <span className={cn("text-[7px] px-1.5 py-0.2 rounded border font-black uppercase tracking-widest shrink-0", priorityClass)}>
                                  {task.priority}
                                </span>
                              )}
                            </div>

                            {/* Metadata row: Project tag & Due date & Assignee */}
                            <div className="flex items-center justify-between text-[9px] text-muted-foreground font-semibold">
                              <div className="flex items-center gap-2">
                                {project && (
                                  <span className="inline-flex items-center gap-1 text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/20">
                                    <Folder className="w-3 h-3" />
                                    <span className="truncate max-w-[120px]">{project.name}</span>
                                  </span>
                                )}
                                {due && (
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                    <span>{due.toLocaleDateString()}</span>
                                  </span>
                                )}
                              </div>

                              {task.assigneeIds.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[8px]">
                                    {getInitials(task.assigneeIds[0])}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Quick Action Footer */}
                            <div className="pt-2 border-t border-border flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              {activeStatusTab === 'todo' && (
                                <button
                                  onClick={() => handleMoveStatus(task, 'in_progress')}
                                  className="py-1 px-2.5 rounded-lg bg-primary text-white text-[9px] font-black flex items-center gap-1 cursor-pointer shadow-xs"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Start</span>
                                </button>
                              )}

                              {activeStatusTab === 'in_progress' && (
                                <button
                                  onClick={() => handleMoveStatus(task, 'review')}
                                  className="py-1 px-2.5 rounded-lg bg-amber-500 text-white text-[9px] font-black flex items-center gap-1 cursor-pointer shadow-xs"
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>Submit Review</span>
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
                                      className="py-1 px-2.5 rounded-lg bg-secondary border border-border text-foreground hover:bg-secondary/80 text-[9px] font-black flex items-center gap-1 cursor-pointer"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Send Back</span>
                                    </button>
                                    <button
                                      onClick={() => handleMoveStatus(task, 'done')}
                                      className="py-1 px-2.5 rounded-lg bg-emerald-500 text-white text-[9px] font-black flex items-center gap-1 cursor-pointer shadow-xs"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Approve</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    <span>Creator Review Required</span>
                                  </span>
                                )
                              )}

                              {activeStatusTab === 'done' && (
                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>Completed</span>
                                </span>
                              )}
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
                <div className="flex gap-3 overflow-x-auto pb-4 aether-scroll snap-x snap-mandatory">
                  {STATUS_COLS.map((col) => {
                    const colTasks = scopedTasks.filter(t => t.status === col.id);

                    return (
                      <div
                        key={col.id}
                        className="w-[82vw] max-w-[320px] shrink-0 snap-center flex flex-col rounded-2xl bg-surface/85 dark:bg-surface/40 border border-border dark:border-border-strong p-3.5 space-y-3"
                      >
                        {/* Column Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-border">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full", col.dotColor)} />
                            <span className="text-xs font-black text-foreground uppercase tracking-wider">
                              {col.label}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground text-[9px] font-black">
                            {colTasks.length}
                          </span>
                        </div>

                        {/* Column Tasks Scroll */}
                        <div className="space-y-2.5 max-h-[58vh] overflow-y-auto pr-1 aether-scroll">
                          {colTasks.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground text-[10px] italic">
                              No items in {col.label}
                            </div>
                          ) : (
                            colTasks.map((task) => {
                              const priorityClass = PRIORITY_BADGES[task.priority] || '';
                              const project = projects.find(p => p.id === task.projectId);

                              return (
                                <div
                                  key={task.id}
                                  onClick={() => setSelectedTask(task)}
                                  className="p-3 rounded-xl bg-surface dark:bg-surface-elevated border border-border hover:border-primary/40 active:scale-98 transition-all cursor-pointer shadow-xs space-y-2"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-xs font-bold text-foreground line-clamp-2">
                                      {task.title}
                                    </span>
                                    {task.priority !== 'none' && (
                                      <span className={cn("text-[7px] px-1.5 py-0.2 rounded border font-black uppercase shrink-0", priorityClass)}>
                                        {task.priority}
                                      </span>
                                    )}
                                  </div>

                                  {project && (
                                    <div className="text-[8px] font-semibold text-primary truncate">
                                      📁 {project.name}
                                    </div>
                                  )}

                                  {/* Action buttons inside card */}
                                  <div className="pt-2 border-t border-border flex items-center justify-between text-[9px]">
                                    <div className="flex items-center gap-1 text-muted-foreground font-bold">
                                      {getInitials(task.assigneeIds[0] || '')}
                                    </div>

                                    {col.id === 'todo' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveStatus(task, 'in_progress');
                                        }}
                                        className="text-primary font-black flex items-center gap-1 hover:underline cursor-pointer"
                                      >
                                        <span>Start</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    )}

                                    {col.id === 'in_progress' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveStatus(task, 'review');
                                        }}
                                        className="text-amber-500 font-black flex items-center gap-1 hover:underline cursor-pointer"
                                      >
                                        <span>Review</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    )}

                                    {col.id === 'review' && task.creatorId === userProfile?.uid && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveStatus(task, 'done');
                                        }}
                                        className="text-emerald-500 font-black flex items-center gap-1 hover:underline cursor-pointer"
                                      >
                                        <span>Approve</span>
                                        <Check className="w-3 h-3" />
                                      </button>
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
                <div className="p-8 text-center bg-secondary/25 border border-dashed border-border rounded-2xl py-14">
                  <Target className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <span className="text-xs font-black text-foreground block uppercase tracking-wider">No Goals Established</span>
                  <span className="text-[10px] text-muted-foreground mt-1 block">Tap "New" to define strategic horizon targets.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {scopedGoals.map((goal) => {
                    const progress = goal.progressRollup ?? 0;
                    const targetDate = goal.targetDate ? (typeof (goal.targetDate as any).toDate === 'function' ? (goal.targetDate as any).toDate() : new Date((goal.targetDate as any).seconds * 1000)) : null;

                    return (
                      <div
                        key={goal.id}
                        onClick={() => setSelectedGoal(goal)}
                        className="flex flex-col p-4 rounded-2xl bg-surface/90 dark:bg-surface/50 border border-border hover:border-primary/30 active:scale-[0.99] transition-all cursor-pointer shadow-xs gap-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs font-black text-foreground line-clamp-2 leading-tight flex-1">
                            {goal.title}
                          </span>
                          <span className={cn(
                            "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded border shrink-0",
                            goal.status === 'completed' 
                              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" 
                              : "border-primary/20 bg-primary/5 text-primary"
                          )}>
                            {goal.status}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[8px] text-muted-foreground font-semibold uppercase tracking-wider">
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

                        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
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
          )}
        </div>
      )}

      {/* ─── Slide-Up Comprehensive Creation Drawer ─── */}
      <AnimatePresence>
        {showCreateDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateDrawer(false)}
              className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs z-50 pointer-events-auto"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md max-h-[88vh] aether-glass rounded-t-[32px] border-x-0 border-b-0 border-t border-border px-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-3 z-[60] shadow-2xl flex flex-col bg-surface/98 dark:bg-surface/95 backdrop-blur-3xl overflow-hidden"
            >
              <div className="shrink-0 bg-muted-foreground/25 w-10 h-1.5 rounded-full mx-auto mb-3" />
              
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-xs font-black uppercase tracking-wider text-foreground">
                  Create New Item
                </span>
                <button
                  onClick={() => setShowCreateDrawer(false)}
                  className="h-7 w-7 rounded-full border border-border bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Type Switcher */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-secondary my-3">
                {[
                  { id: 'task', label: 'Task' },
                  { id: 'goal', label: 'Goal' },
                  { id: 'project', label: 'Project' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setCreateType(t.id as any)}
                    className={cn(
                      "py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      createType === t.id ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Form */}
              <form onSubmit={handleCreateSubmit} className="space-y-3.5 overflow-y-auto pr-1 flex-1 py-1 aether-scroll">
                {createType === 'task' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Title *</label>
                      <input
                        type="text"
                        required
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                        placeholder="What needs to be done?"
                        className="w-full bg-secondary/60 border border-border rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Description</label>
                      <textarea
                        rows={2}
                        value={taskForm.description}
                        onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                        placeholder="Add task context or acceptance criteria..."
                        className="w-full bg-secondary/60 border border-border rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Project</label>
                        <select
                          value={taskForm.projectId}
                          onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })}
                          className="w-full bg-secondary/60 border border-border rounded-xl px-2.5 py-2 text-xs font-bold text-foreground focus:outline-none"
                        >
                          <option value="">No Project</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Priority</label>
                        <select
                          value={taskForm.priority}
                          onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                          className="w-full bg-secondary/60 border border-border rounded-xl px-2.5 py-2 text-xs font-bold text-foreground focus:outline-none"
                        >
                          <option value="none">None</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Assignee</label>
                        <select
                          value={taskForm.assigneeId}
                          onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                          className="w-full bg-secondary/60 border border-border rounded-xl px-2.5 py-2 text-xs font-bold text-foreground focus:outline-none"
                        >
                          <option value={user?.uid || ''}>Assign to me</option>
                          {members.map((m) => (
                            <option key={m.uid} value={m.uid}>{m.fullName}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Due Date</label>
                        <input
                          type="date"
                          value={taskForm.dueDate}
                          onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                          className="w-full bg-secondary/60 border border-border rounded-xl px-2.5 py-2 text-xs font-bold text-foreground focus:outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                {createType === 'goal' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Goal Title *</label>
                      <input
                        type="text"
                        required
                        value={goalForm.title}
                        onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                        placeholder="e.g. Complete Q3 Product Sprint"
                        className="w-full bg-secondary/60 border border-border rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Description</label>
                      <textarea
                        rows={2}
                        value={goalForm.description}
                        onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                        placeholder="Strategic outcome and key deliverables..."
                        className="w-full bg-secondary/60 border border-border rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Horizon</label>
                        <select
                          value={goalForm.horizon}
                          onChange={(e) => setGoalForm({ ...goalForm, horizon: e.target.value as any })}
                          className="w-full bg-secondary/60 border border-border rounded-xl px-2.5 py-2 text-xs font-bold text-foreground focus:outline-none"
                        >
                          <option value="short_term">Short Term</option>
                          <option value="long_term">Long Term</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Target Date</label>
                        <input
                          type="date"
                          value={goalForm.targetDate}
                          onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                          className="w-full bg-secondary/60 border border-border rounded-xl px-2.5 py-2 text-xs font-bold text-foreground focus:outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                {createType === 'project' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Project Name *</label>
                      <input
                        type="text"
                        required
                        value={projectForm.name}
                        onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                        placeholder="e.g. Mobile App Redesign"
                        className="w-full bg-secondary/60 border border-border rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Description</label>
                      <textarea
                        rows={2}
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                        placeholder="Project overview and timeline objectives..."
                        className="w-full bg-secondary/60 border border-border rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Start Date</label>
                        <input
                          type="date"
                          value={projectForm.startDate}
                          onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                          className="w-full bg-secondary/60 border border-border rounded-xl px-2.5 py-2 text-xs font-bold text-foreground focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Due Date</label>
                        <input
                          type="date"
                          value={projectForm.dueDate}
                          onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })}
                          className="w-full bg-secondary/60 border border-border rounded-xl px-2.5 py-2 text-xs font-bold text-foreground focus:outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 rounded-xl bg-primary text-white text-xs font-black hover:bg-primary/95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>CREATE {createType.toUpperCase()}</span>
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Send Back Review Feedback Modal ─── */}
      <AnimatePresence>
        {sendBackTask && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSendBackTask(null)}
              className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs z-50 pointer-events-auto"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-x-4 top-1/3 z-50 aether-glass bg-surface/98 dark:bg-surface/95 border border-border p-5 rounded-3xl shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-black text-foreground uppercase tracking-wider">Send Back Task</span>
                <button 
                  onClick={() => setSendBackTask(null)}
                  className="h-6 w-6 rounded-full border border-border bg-secondary flex items-center justify-center text-muted-foreground cursor-pointer"
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
                className="w-full bg-secondary/60 border border-border rounded-xl p-3 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50"
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
                  className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-black hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isSendingBack ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>Confirm Send Back</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

