import * as React from 'react';
import { Timestamp } from 'firebase/firestore';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  Lock,
  MessageSquare,
  Paperclip,
  Send,
  HelpCircle,
  Target,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import { useProject, useProjectComments } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';
import { useGoals } from '../../hooks/useGoals';
import { useTeams } from '../../hooks/useTeams';
import { createGoal } from '../../lib/goals';
import { SearchableSelect } from '../../components/SearchableSelect';
import { TaskDetailDrawer } from '../../components/tasks/TaskDetailDrawer';
import { GoalDetailDrawer } from '../../components/tasks/GoalDetailDrawer';

import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { useOrgMembers } from '../../hooks/useChat';
import { moveTask, deleteTask, type Task, type TaskStatus } from '../../lib/tasks';
import { updateProject, deleteProject, addProjectComment, updateProjectAttachments } from '../../lib/projects';
import { AttachmentSection } from '../../components/tasks/AttachmentSection';
import { AttachmentInput } from '../../components/tasks/AttachmentInput';
import { uploadEntityAttachment } from '../../lib/storage';
import { type MessageAttachment } from '@guild/types';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const orgId = userProfile?.organizationId;
  const { project, loading: projectLoading } = useProject(projectId);
  const { columns, loading: tasksLoading } = useTasks(orgId, projectId ? { projectId } : undefined);
  const members = useOrgMembers(orgId);
  const { goals } = useGoals(orgId);
  const { teams } = useTeams(orgId);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [showCompleted, setShowCompleted] = React.useState(false);

  const [showComments, setShowComments] = React.useState(false);
  const [commentBody, setCommentBody] = React.useState('');
  const [commentFiles, setCommentFiles] = React.useState<File[]>([]);
  const [uploadingCommentFiles, setUploadingCommentFiles] = React.useState(false);

  const comments = useProjectComments(projectId || null);

  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editDesc, setEditDesc] = React.useState('');
  const [editStartDate, setEditStartDate] = React.useState('');
  const [editDueDate, setEditDueDate] = React.useState('');
  const [showManageModal, setShowManageModal] = React.useState(false);
  const [pickerSearchQuery, setPickerSearchQuery] = React.useState('');

  React.useEffect(() => {
    if (project) {
      setEditName(project.name);
      setEditDesc(project.description || '');
      setEditStartDate(project.startDate ? new Date((project.startDate as any).seconds * 1000).toISOString().split('T')[0] : '');
      setEditDueDate(project.dueDate ? new Date((project.dueDate as any).seconds * 1000).toISOString().split('T')[0] : '');
    }
  }, [project, isEditing]);

  const actor = React.useMemo(
    () => ({ uid: user?.uid ?? '', name: userProfile?.fullName || user?.displayName || 'Teammate' }),
    [user, userProfile],
  );

  const [activeTab, setActiveTab] = React.useState<'overview' | 'tasks' | 'goals'>('overview');
  const [goalCreateOpen, setGoalCreateOpen] = React.useState(false);
  const [newGoalTitle, setNewGoalTitle] = React.useState('');
  const [newGoalDesc, setNewGoalDesc] = React.useState('');
  const [newGoalTargetDate, setNewGoalTargetDate] = React.useState('');
  const [newGoalOwnerId, setNewGoalOwnerId] = React.useState('');

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
        ownerId: newGoalOwnerId || actor.uid,
        actor
      });
      setNewGoalTitle('');
      setNewGoalDesc('');
      setNewGoalTargetDate('');
      setNewGoalOwnerId('');
      setGoalCreateOpen(false);
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
  };

  // Member maps and helpers
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

  const getMemberInitials = (userId: string) => {
    return getInitials(userId);
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
    // Filter root level project tasks only
    return all.filter(t => !t.parentTaskId);
  }, [columns]);

  const activeTasks = React.useMemo(() => allTasks.filter(t => t.status !== 'done'), [allTasks]);
  const completedTasks = React.useMemo(() => allTasks.filter(t => t.status === 'done'), [allTasks]);

  // Synchronize dynamic active task detail from search param URL queries
  const openTaskId = searchParams.get('task');
  const activeTask = React.useMemo(() => {
    if (!openTaskId) return null;
    return allTasks.find(t => t.id === openTaskId) ?? null;
  }, [allTasks, openTaskId]);

  // Filter goals for the current project and parse active goal details
  const projectGoals = React.useMemo(() => {
    return goals.filter(g => g.projectId === projectId);
  }, [goals, projectId]);

  const openGoalId = searchParams.get('goal');
  const activeGoal = React.useMemo(() => {
    if (!openGoalId) return null;
    return goals.find(g => g.id === openGoalId) ?? null;
  }, [goals, openGoalId]);

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

  const handleToggleProjectStatus = async () => {
    if (!project) return;
    const nextStatus = project.status === 'completed' ? 'active' : 'completed';
    try {
      await updateProject(project.id, { status: nextStatus });
    } catch (err) {
      console.error('Failed to toggle project status:', err);
    }
  };

  const handleSaveProject = async () => {
    if (!editName.trim()) return;
    try {
      await updateProject(project!.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        startDate: editStartDate ? Timestamp.fromDate(new Date(editStartDate)) : null,
        dueDate: editDueDate ? Timestamp.fromDate(new Date(editDueDate)) : null,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update project:', err);
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
      console.error('Failed to update project members:', err);
      alert('Failed to update project members: ' + (err as Error).message);
    }
  };

  const handleToggleProjectTeam = async (teamId: string) => {
    if (!project || !teams) return;
    const currentTeams = project.teamIds || [];
    const isAlreadyAdded = currentTeams.includes(teamId);
    
    const nextTeams = isAlreadyAdded
      ? currentTeams.filter(id => id !== teamId)
      : [...currentTeams, teamId];

    const targetTeam = teams.find(t => t.id === teamId);
    if (!targetTeam) return;

    let nextMembers = [...(project.memberIds || [])];
    const teamUserIds = Array.from(new Set([targetTeam.managerId, ...(targetTeam.memberIds || [])]));

    if (isAlreadyAdded) {
      const remainingTeamIds = nextTeams;
      const remainingTeams = teams.filter(t => remainingTeamIds.includes(t.id));
      const usersInOtherTeams = new Set<string>();
      remainingTeams.forEach(t => {
        usersInOtherTeams.add(t.managerId);
        (t.memberIds || []).forEach(uid => usersInOtherTeams.add(uid));
      });

      nextMembers = nextMembers.filter(uid => {
        if (uid === project.ownerId) return true;
        if (usersInOtherTeams.has(uid)) return true;
        return !teamUserIds.includes(uid);
      });
    } else {
      teamUserIds.forEach(uid => {
        if (!nextMembers.includes(uid)) {
          nextMembers.push(uid);
        }
      });
    }

    try {
      await updateProject(project.id, { 
        teamIds: nextTeams,
        memberIds: nextMembers
      });
    } catch (err) {
      console.error('Failed to update project teams:', err);
      alert('Failed to update project teams: ' + (err as Error).message);
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '';
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts.seconds * 1000);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim() && commentFiles.length === 0) return;
    if (!project) return;
    setUploadingCommentFiles(true);
    try {
      let uploaded: MessageAttachment[] = [];
      if (commentFiles.length > 0) {
        uploaded = await Promise.all(
          commentFiles.map(file => uploadEntityAttachment('comments', project.id, file))
        );
      }
      
      await addProjectComment({
        projectId: project.id,
        orgId,
        authorId: actor.uid,
        authorName: actor.name,
        authorUsername: actor.name.toLowerCase().replace(/\s+/g, ''),
        body: commentBody.trim(),
        mentions: [],
        files: uploaded
      });
      setCommentBody('');
      setCommentFiles([]);
    } catch (err) {
      console.error('Failed to add project comment:', err);
    } finally {
      setUploadingCommentFiles(false);
    }
  };

  if (!orgId) return null;

  if (projectLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-[11px] text-muted-foreground font-semibold tracking-wide animate-pulse">Loading project data...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 text-center">
        <p className="text-xs text-muted-foreground font-semibold">Initiative project not found.</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/workspace')} className="h-9 border border-border-default/60 rounded-xl px-4 font-bold text-xs">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Return to Workspace
        </Button>
      </div>
    );
  }

  const progressRate = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

  return (
    <div className="h-full w-full bg-transparent flex flex-col min-h-0 overflow-hidden">
      
      {/* Main Plane Workspace Content */}
      <div className="flex-1 min-h-0 flex flex-col z-10 relative overflow-hidden">
        
        {/* Streamlined Workspace Header */}
        <div className="px-5 py-3 border-b border-border/50 flex flex-col gap-2.5 shrink-0 bg-surface/50 dark:bg-card/40 backdrop-blur-md">
          <div className="flex items-center justify-between shrink-0 flex-wrap gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => navigate('/workspace')}
                className="w-8 h-8 rounded-xl border border-border/60 bg-surface/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0 shadow-2xs cursor-pointer"
                title="Return to Workspace"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleProjectStatus}
                    className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer hover:scale-105 active:scale-95",
                      project.status === 'completed'
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border bg-surface/60 hover:border-primary text-primary"
                    )}
                    title={project.status === 'completed' ? "Mark Project Active" : "Mark Project Completed"}
                  >
                    {project.status === 'completed' ? (
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      <FolderGit className="w-3 h-3" />
                    )}
                  </button>
                  <h1 className={cn("text-base font-bold tracking-tight truncate flex items-center gap-1.5", project.status === 'completed' ? "text-muted-foreground line-through decoration-primary/50" : "text-foreground")}>
                    <span>{project.name}</span>
                  </h1>
                </div>
                {project.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 max-w-2xl font-medium leading-relaxed truncate">{project.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {/* Chronological start and due parameters */}
              <div className="flex flex-col gap-0.5 text-right font-mono text-[9px] text-muted-foreground hidden sm:flex font-semibold">
                {project.startDate && (
                  <span>Start: {new Date(project.startDate instanceof Date ? project.startDate : (project.startDate as any).seconds * 1000).toLocaleDateString()}</span>
                )}
                {project.dueDate && (
                  <span>Due: {new Date(project.dueDate instanceof Date ? project.dueDate : (project.dueDate as any).seconds * 1000).toLocaleDateString()}</span>
                )}
              </div>

              <button
                onClick={() => setShowComments(!showComments)}
                className={cn(
                  "flex items-center justify-center gap-1.5 h-8 rounded-xl border px-3 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer text-xs font-semibold shadow-2xs",
                  showComments
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-surface/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
                title="Project Discussion"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Discussion ({comments.length})</span>
              </button>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  "w-8 h-8 rounded-xl border flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer shadow-2xs",
                  isEditing
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-surface/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
                title="Project Settings"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Project Members Strip */}
          <div className="flex items-center gap-2.5 pt-1.5 border-t border-border/30 relative">
            <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Members</span>
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {(project.memberIds || []).map((uid) => {
                const photoURL = getMemberPhotoURL(uid);
                const fullName = getMemberName(uid);
                return photoURL ? (
                  <img
                    key={uid}
                    src={photoURL}
                    alt={fullName}
                    className="w-5.5 h-5.5 rounded-full object-cover shrink-0 ring-2 ring-background border border-border hover:scale-110 transition-transform"
                    title={fullName}
                  />
                ) : (
                  <div
                    key={uid}
                    className="w-5.5 h-5.5 rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center font-bold text-[8px] text-primary shrink-0 ring-2 ring-background hover:scale-110 transition-transform"
                    title={fullName}
                  >
                    {getInitials(uid)}
                  </div>
                );
              })}
            </div>
            
            <div>
              <button
                onClick={() => setShowManageModal(true)}
                className="w-5.5 h-5.5 rounded-full border border-dashed border-border hover:border-primary hover:text-primary bg-transparent text-muted-foreground flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Manage Members & Teams"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Spatial project canvas block */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          
          {/* Main Execution Column */}
          <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin p-4 sm:p-5 space-y-4">
            
            {/* KPI metric Cards */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3">
              
              {/* Project Progress */}
              <div className="p-3.5 rounded-xl border border-border/50 bg-surface/60 dark:bg-card/40 flex flex-col justify-between gap-2 shadow-2xs hover:border-border transition-all">
                <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Project Progress</span>
                <div className="space-y-1.5">
                  <div className="flex items-end justify-between">
                    <span className="text-base font-bold font-mono text-foreground leading-none">{progressRate}%</span>
                    <span className="text-[10px] text-muted-foreground font-medium">({completedTasks.length}/{allTasks.length} Completed)</span>
                  </div>
                  <div className="w-full bg-secondary/80 dark:bg-secondary h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all duration-500 ease-out shadow-xs" style={{ width: `${progressRate}%` }} />
                  </div>
                </div>
              </div>

              {/* Goals Complete */}
              <div className="p-3.5 rounded-xl border border-border/50 bg-surface/60 dark:bg-card/40 flex flex-col justify-between gap-2 shadow-2xs hover:border-border transition-all">
                <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Goals Complete</span>
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-base font-bold font-mono text-foreground leading-none">
                      {projectGoals.filter(g => g.status === 'completed').length}
                    </span>
                    <span className="text-[9px] text-muted-foreground mt-1 font-medium">Completed</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">Total: {projectGoals.length}</span>
                </div>
              </div>

              {/* Tasks Left */}
              <div className="p-3.5 rounded-xl border border-border/50 bg-surface/60 dark:bg-card/40 flex flex-col justify-between gap-2 shadow-2xs hover:border-border transition-all">
                <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Tasks Left</span>
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-base font-bold font-mono text-foreground leading-none">
                      {activeTasks.length}
                    </span>
                    <span className="text-[9px] text-muted-foreground mt-1 font-medium">Active tasks</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Total: {allTasks.length}
                  </span>
                </div>
              </div>
              
            </div>

            {/* Segmented Tab Selector - Tightened Apple Style */}
            <div className="flex border-b border-border/40 gap-1 pb-1">
              {(['overview', 'tasks', 'goals'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer capitalize relative",
                    activeTab === tab
                      ? "text-primary bg-primary/10 font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Project Description */}
                    {project.description && (
                      <div className="p-4 rounded-xl border border-border/40 bg-surface/40 dark:bg-card/30">
                        <h3 className="text-xs font-bold text-foreground mb-1.5">Description</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                          {project.description}
                        </p>
                      </div>
                    )}

                    {/* Project File Attachments */}
                    <div>
                      <AttachmentSection
                        entityType="projects"
                        entityId={project.id}
                        files={project.files}
                        onAttachmentsChanged={async (updatedFiles) => {
                          try {
                            await updateProjectAttachments(project.id, updatedFiles);
                          } catch (err) {
                            console.error("Failed to update project attachments:", err);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'tasks' && (
                  <div className="p-4 rounded-xl border border-border/40 bg-surface/40 dark:bg-card/30 space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-border/30 pb-2">
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span>Tasks</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="flex items-center justify-center gap-1 px-2.5 py-1 h-7 text-xs font-semibold rounded-lg border border-primary/20 bg-primary/10 hover:bg-primary/15 text-primary transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Add Task</span>
                      </button>
                    </div>

                      {tasksLoading ? (
                        <div className="flex py-10 justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {/* Render active tasks checklist cards */}
                          {activeTasks.length > 0 ? (
                            activeTasks.map(task => (
                              <motion.div
                                key={task.id}
                                onClick={() => setSearchParams({ task: task.id })}
                                whileHover={{ y: -1 }}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-surface dark:bg-card border border-border/40 hover:border-border transition-all group shadow-2xs cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <button
                                    onClick={(e) => handleToggleTaskStatus(e, task)}
                                    className="h-4.5 w-4.5 rounded-full border border-border hover:border-primary bg-surface/50 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                  >
                                    <div className="h-1.5 w-1.5 rounded-full bg-transparent hover:bg-primary/50 transition-colors" />
                                  </button>
                                  <div className="min-w-0">
                                    <span className="text-xs font-semibold block text-foreground group-hover:text-primary transition-colors truncate">{task.title}</span>
                                    {task.dueDate && (
                                      <span className="text-[9px] font-medium text-muted-foreground mt-0.5 block">
                                        Due: {new Date(task.dueDate instanceof Date ? task.dueDate : (task.dueDate as any).seconds * 1000).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  {task.assigneeIds.length > 0 && (
                                    getMemberPhotoURL(task.assigneeIds[0]) ? (
                                      <img
                                        src={getMemberPhotoURL(task.assigneeIds[0])}
                                        alt={getMemberName(task.assigneeIds[0])}
                                        className="w-5 h-5 rounded-full object-cover shrink-0 border border-border"
                                        title={`Assigned to ${getMemberName(task.assigneeIds[0])}`}
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center font-bold text-[8px] text-primary shrink-0" title={`Assigned to ${getMemberName(task.assigneeIds[0])}`}>
                                        {getInitials(task.assigneeIds[0])}
                                      </div>
                                    )
                                  )}
                                </div>
                              </motion.div>
                            ))
                          ) : (
                            <div className="py-10 rounded-xl border border-dashed border-border/60 bg-muted/20 flex flex-col items-center justify-center text-center">
                              <p className="text-[10px] text-muted-foreground italic">No active tasks.</p>
                            </div>
                          )}

                          {/* Completed tasks accordion */}
                          {completedTasks.length > 0 && (
                            <div className="space-y-1.5 pt-1.5">
                              <button
                                type="button"
                                onClick={() => setShowCompleted(!showCompleted)}
                                className="w-full border border-border/50 bg-surface/40 dark:bg-card/30 hover:bg-muted/40 rounded-lg p-2 cursor-pointer flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground transition-all font-semibold shadow-2xs"
                              >
                                <span>Completed Tasks ({completedTasks.length})</span>
                                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform text-muted-foreground", showCompleted ? "rotate-180" : "")} />
                              </button>
                              <AnimatePresence>
                                {showCompleted && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden space-y-1.5"
                                  >
                                    {completedTasks.map(task => (
                                      <div
                                        key={task.id}
                                        onClick={() => setSearchParams({ task: task.id })}
                                        className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30 opacity-60 hover:opacity-90 transition-all cursor-pointer shadow-2xs"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <button
                                            onClick={(e) => handleToggleTaskStatus(e, task)}
                                            className="h-4 w-4 rounded-full border border-emerald-500 bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 cursor-pointer"
                                          >
                                            <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                                          </button>
                                          <span className="text-xs font-medium line-through text-muted-foreground truncate">{task.title}</span>
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
                )}

                {activeTab === 'goals' && (
                  <div className="p-4 rounded-xl border border-border/40 bg-surface/40 dark:bg-card/30 space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-border/30 pb-2">
                        <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Goals</span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => setGoalCreateOpen(true)}
                          className="flex items-center justify-center gap-1 px-2.5 py-1 h-7 text-xs font-semibold rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Add Goal</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {projectGoals.length > 0 ? (
                          projectGoals.map(goal => (
                            <motion.div
                              key={goal.id}
                              onClick={() => setSearchParams((prev) => { prev.set('goal', goal.id); return prev; })}
                              whileHover={{ y: -1 }}
                              className="flex flex-col p-3 rounded-lg bg-surface dark:bg-card border border-border/40 hover:border-border transition-all group shadow-2xs cursor-pointer gap-2"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs font-semibold block text-foreground group-hover:text-emerald-500 transition-colors truncate">
                                    {goal.title}
                                  </span>
                                  {goal.targetDate && (
                                    <span className="text-[9px] font-medium text-muted-foreground mt-0.5 block">
                                      Due: {new Date(goal.targetDate instanceof Date ? goal.targetDate : (goal.targetDate as any).seconds * 1000).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={cn(
                                    "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded leading-none border",
                                    goal.status === 'completed'
                                      ? "border-emerald-500/20 text-emerald-600 bg-emerald-500/5 dark:text-emerald-400"
                                      : "border-primary/20 text-primary bg-primary/5"
                                  )}>
                                    {goal.status}
                                  </span>
                                  {goal.ownerId && (
                                    getMemberPhotoURL(goal.ownerId) ? (
                                      <img
                                        src={getMemberPhotoURL(goal.ownerId)}
                                        alt={getMemberName(goal.ownerId)}
                                        className="w-5 h-5 rounded-full object-cover shrink-0 border border-border"
                                        title={`Owner: ${getMemberName(goal.ownerId)}`}
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center font-bold text-[8px] text-primary shrink-0" title={`Owner: ${getMemberName(goal.ownerId)}`}>
                                        {getInitials(goal.ownerId)}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>

                              <div className="space-y-1 mt-0.5">
                                <div className="flex items-center justify-between text-[8px] font-semibold text-muted-foreground">
                                  <span>Progress</span>
                                  <span className="font-mono">{goal.progressRollup ?? 0}%</span>
                                </div>
                                <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                                    style={{ width: `${goal.progressRollup ?? 0}%` }} 
                                  />
                                </div>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="py-10 rounded-xl border border-dashed border-border/60 bg-muted/20 flex flex-col items-center justify-center text-center">
                            <p className="text-[10px] text-muted-foreground italic">No goals linked to this project.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

          </div>

          {/* Right side: Slide-Out Discussions Overlay */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="absolute inset-y-0 right-0 z-20 xl:relative w-[min(100%,clamp(19rem,32%,26rem))] shrink-0 border-l border-border/50 bg-surface/90 dark:bg-card/85 backdrop-blur-xl flex flex-col h-full overflow-hidden shadow-xl"
              >
                <div className="flex items-center justify-between p-3.5 border-b border-border/50 flex-shrink-0">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    Discussion
                  </span>
                  <button
                    onClick={() => setShowComments(false)}
                    className="p-1 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Comments List */}
                <div className="flex-grow overflow-y-auto p-3.5 space-y-3 scrollbar-thin">
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-2.5 bg-surface dark:bg-card/50 border border-border/50 p-3 rounded-xl shadow-2xs hover:border-border transition-all">
                        <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0 overflow-hidden shadow-2xs">
                          {getMemberPhotoURL(comment.authorId) ? (
                            <img src={getMemberPhotoURL(comment.authorId)} alt={comment.authorName} className="h-full w-full object-cover" />
                          ) : (
                            getMemberInitials(comment.authorId)
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-foreground truncate">
                              {comment.authorName}
                            </span>
                            <span className="text-[8px] text-muted-foreground font-mono">
                              {formatTimestamp(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/80 font-medium leading-relaxed break-words">
                            {comment.body}
                          </p>
                          
                          {comment.files && comment.files.length > 0 && (
                            <div className="mt-1.5 space-y-1 max-w-sm">
                              {comment.files.map((file, fIdx) => (
                                <a
                                  key={fIdx}
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1.5 p-1.5 rounded-lg border border-border/50 bg-surface hover:bg-muted/50 text-[10px] text-primary font-semibold truncate transition-colors shadow-2xs"
                                >
                                  <Paperclip className="w-3 h-3 text-primary shrink-0" />
                                  <span className="truncate flex-1">{file.name}</span>
                                  <span className="text-[8px] text-muted-foreground font-mono shrink-0">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center text-xs text-muted-foreground italic">
                      No discussions yet. Start the conversation!
                    </div>
                  )}
                </div>

                {/* Comment Input */}
                <div className="p-3 border-t border-border/50 bg-surface/50 dark:bg-card/40 flex-shrink-0 flex flex-col gap-2">
                  <AttachmentInput
                    selectedFiles={commentFiles}
                    onRemove={(idx) => setCommentFiles(prev => prev.filter((_, i) => i !== idx))}
                    onAdd={(files) => setCommentFiles(prev => [...prev, ...Array.from(files)])}
                  />
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={uploadingCommentFiles ? "Uploading files..." : "Write a comment..."}
                      value={commentBody}
                      disabled={uploadingCommentFiles}
                      onChange={(e) => setCommentBody(e.target.value)}
                      className="flex-1 bg-surface dark:bg-background border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-medium disabled:opacity-50 shadow-2xs"
                    />
                    <button
                      type="button"
                      disabled={uploadingCommentFiles}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.onchange = (e) => {
                          const files = (e.target as HTMLInputElement).files;
                           if (files) setCommentFiles(prev => [...prev, ...Array.from(files)]);
                        };
                        input.click();
                      }}
                      className="p-2 bg-surface hover:bg-muted border border-border/60 rounded-xl text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shrink-0 shadow-2xs"
                      title="Attach File"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="submit"
                      disabled={uploadingCommentFiles}
                      className="p-2 bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/20 rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shrink-0 shadow-2xs"
                    >
                      {uploadingCommentFiles ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>


      {/* Create task modal */}
      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        orgId={orgId}
        actor={actor}
        defaultProjectId={projectId}
      />

      {/* Redesigned Task Detail drawer driven dynamically by search parameters */}
      <TaskDetailDrawer
        task={activeTask}
        onClose={() => setSearchParams((prev) => { prev.delete('task'); return prev; })}
        orgId={orgId}
        actor={actor}
        members={members}
        projects={project ? [project] : []}
        goals={goals}
      />

      {/* Redesigned Goal Detail drawer driven dynamically by search parameters */}
      <GoalDetailDrawer
        goal={activeGoal}
        onClose={() => setSearchParams((prev) => { prev.delete('goal'); return prev; })}
        orgId={orgId}
        actor={actor}
        members={members}
        projects={project ? [project] : []}
        tasks={allTasks}
      />

      {/* Security edit Settings Dialog */}
      <AnimatePresence>
        {isEditing && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="fixed inset-0 bg-neutral-950/20 dark:bg-neutral-950/60 backdrop-blur-sm z-[100]"
            />
            {/* Dialog Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg p-5 rounded-2xl border border-border bg-surface dark:bg-card backdrop-blur-xl shadow-2xl z-[101] flex flex-col gap-4 max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
                    <Lock className="w-4 h-4 text-amber-500" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Project Details</h3>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="w-8 h-8 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5">
                {/* Security Active Notice */}
                <div className="p-3 bg-amber-500/[0.04] border border-amber-500/20 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Private Project</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                    Only members invited to this project can view its tasks, goals, and discussions.
                  </p>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Project Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface dark:bg-background text-xs font-semibold text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground shadow-2xs"
                    placeholder="Enter project name..."
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Project Description</label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface dark:bg-background text-xs font-semibold text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all h-20 resize-none leading-relaxed placeholder:text-muted-foreground shadow-2xs"
                    placeholder="Describe what this project entails..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Start Date */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Start Date</label>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface dark:bg-background text-xs font-semibold text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all shadow-2xs"
                    />
                  </div>

                  {/* Due Date */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Due Date</label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface dark:bg-background text-xs font-semibold text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-2.5 border-t border-border/50 pt-3 mt-1">
                {(project.ownerId === user?.uid || userProfile?.role === 'owner' || userProfile?.role === 'admin') ? (
                  <button
                    onClick={async () => {
                      if (confirm('Delete this project? Associated goals and tasks will be unlinked.')) {
                        try {
                          await deleteProject(project.id);
                          navigate('/workspace');
                        } catch (err) {
                          console.error('Failed to delete project:', err);
                        }
                      }
                    }}
                    className="px-3 py-1.5 border border-red-500/25 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Project</span>
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3.5 py-1.5 border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProject}
                    className="px-4 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Goal Creation Dialog */}
      <AnimatePresence>
        {goalCreateOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGoalCreateOpen(false)}
              className="fixed inset-0 bg-neutral-950/20 dark:bg-neutral-950/60 backdrop-blur-sm z-[100]"
            />
            {/* Dialog Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg p-6 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl shadow-2xl z-[101] flex flex-col gap-4 max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <form onSubmit={handleCreateGoalSubmit} className="space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-200/40 dark:border-neutral-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                      <Target className="w-4 h-4 text-emerald-500" />
                    </div>
                    <h3 className="text-sm font-black text-neutral-850 dark:text-neutral-100">Add Goal</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGoalCreateOpen(false)}
                    className="w-8 h-8 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-805 text-neutral-500 hover:text-neutral-850 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Goal Title</label>
                    <input
                      type="text"
                      required
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-955/40 text-xs font-semibold text-neutral-850 dark:text-neutral-200 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-neutral-455 shadow-xs"
                      placeholder="Goal name..."
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Description</label>
                    <textarea
                      value={newGoalDesc}
                      onChange={(e) => setNewGoalDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-955/40 text-xs font-semibold text-neutral-850 dark:text-neutral-200 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all h-24 resize-none leading-relaxed placeholder:text-neutral-405 shadow-xs"
                      placeholder="Details about this goal..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Target Date */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Due Date</label>
                      <input
                        type="date"
                        value={newGoalTargetDate}
                        onChange={(e) => setNewGoalTargetDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-850 bg-white/50 dark:bg-neutral-955/40 text-xs font-semibold text-neutral-850 dark:text-neutral-200 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Owner</label>
                      <SearchableSelect
                        value={newGoalOwnerId}
                        onChange={setNewGoalOwnerId}
                        options={members.map((member) => ({
                          value: member.uid,
                          label: member.fullName || member.username,
                          detail: member.designation || 'Member',
                          photoURL: member.photoURL,
                        }))}
                        placeholder="Select owner..."
                        triggerClassName="bg-white/50 dark:bg-neutral-955/40 hover:border-indigo-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-end gap-2.5 border-t border-neutral-200/40 dark:border-neutral-800/60 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setGoalCreateOpen(false)}
                    className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-550 hover:text-neutral-850 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-emerald-600/10"
                  >
                    Create Goal
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Redesigned Manage Members & Teams Modal */}
      <AnimatePresence>
        {showManageModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowManageModal(false); setPickerSearchQuery(''); }}
              className="fixed inset-0 bg-neutral-950/20 dark:bg-neutral-950/60 backdrop-blur-sm z-[100]"
            />
            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/40 bg-white dark:bg-neutral-900 shadow-2xl z-[101] flex flex-col gap-4 max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-neutral-200/45 dark:border-neutral-800/65 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 shrink-0">
                    <Users className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-neutral-850 dark:text-neutral-100">Add Members & Teams</h3>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Add people or teams to this project</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowManageModal(false); setPickerSearchQuery(''); }}
                  className="w-8 h-8 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-805 text-neutral-500 hover:text-neutral-850 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm animate-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search input bar */}
              <div className="relative shrink-0">
                <input
                  type="text"
                  placeholder="Search people or teams..."
                  value={pickerSearchQuery}
                  onChange={(e) => setPickerSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-neutral-400 shadow-xs"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 pointer-events-none">
                  <Users className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* List container */}
              <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 pr-1 py-1 min-h-0">
                {/* Choose Teams Section */}
                {teams.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Teams</span>
                    <div className="space-y-1.5">
                      {teams
                        .filter(t => t.name.toLowerCase().includes(pickerSearchQuery.toLowerCase()))
                        .map((team) => {
                          const isTeamIncluded = (project.teamIds || []).includes(team.id);
                          return (
                            <div
                              key={team.id}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-2xl border transition-all",
                                isTeamIncluded
                                  ? "border-indigo-500/35 bg-indigo-500/[0.04] dark:bg-indigo-500/[0.06]"
                                  : "border-neutral-150/40 dark:border-neutral-800/40 bg-neutral-50/20 dark:bg-neutral-900/40"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl border border-indigo-500/25 bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                  <Users className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold block text-neutral-800 dark:text-neutral-100 truncate">{team.name}</span>
                                  <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-semibold block mt-0.5">
                                    {(team.memberIds || []).length + 1} members • Lead: {getMemberName(team.managerId)}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleProjectTeam(team.id)}
                                className={cn(
                                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs border",
                                  isTeamIncluded
                                    ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-500/15"
                                    : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-750"
                                )}
                              >
                                {isTeamIncluded ? 'Added' : 'Add Team'}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Choose Members Section */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">People</span>
                  <div className="space-y-1.5">
                    {members
                      .filter(m => m.fullName.toLowerCase().includes(pickerSearchQuery.toLowerCase()) || m.username.toLowerCase().includes(pickerSearchQuery.toLowerCase()))
                      .map((member) => {
                        const isIncluded = (project.memberIds || []).includes(member.uid);
                        const photoURL = getMemberPhotoURL(member.uid);
                        return (
                          <div
                            key={member.uid}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-2xl border transition-all",
                              isIncluded
                                ? "border-indigo-500/35 bg-indigo-500/[0.04] dark:bg-indigo-500/[0.06]"
                                : "border-neutral-150/40 dark:border-neutral-800/40 bg-neutral-50/20 dark:bg-neutral-900/40"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {photoURL ? (
                                <img
                                  src={photoURL}
                                  alt={member.fullName}
                                  className="w-8 h-8 rounded-xl object-cover shrink-0 border border-neutral-200/50"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-xl border border-indigo-500/20 bg-indigo-500/10 flex items-center justify-center font-bold text-[10px] text-indigo-650 dark:text-indigo-400 shrink-0">
                                  {getInitials(member.uid)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="text-xs font-bold block text-neutral-800 dark:text-neutral-100 truncate">{member.fullName}</span>
                                <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-semibold block mt-0.5 truncate">{member.designation || 'Member'}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleProjectMember(member.uid)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs border",
                                isIncluded
                                  ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-500/15"
                                  : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-750"
                              )}
                            >
                              {isIncluded ? 'Joined' : 'Add'}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
