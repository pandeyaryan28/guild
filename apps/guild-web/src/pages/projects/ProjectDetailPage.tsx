import * as React from 'react';
import { Timestamp } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
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
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import { useProject, useProjectComments } from '../../hooks/useProjects';
import { useMilestones } from '../../hooks/useMilestones';
import { useTasks } from '../../hooks/useTasks';
import { useGoals } from '../../hooks/useGoals';
import { MilestoneRail } from './MilestoneRail';
import { TaskDetailDrawer } from '../../components/tasks/TaskDetailDrawer';

import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { useOrgMembers } from '../../hooks/useChat';
import { moveTask, deleteTask, type Task, type TaskStatus } from '../../lib/tasks';
import { updateProject, addProjectComment, updateProjectAttachments } from '../../lib/projects';
import { AttachmentSection } from '../../components/tasks/AttachmentSection';
import { AttachmentInput } from '../../components/tasks/AttachmentInput';
import { uploadEntityAttachment } from '../../lib/storage';
import { type MessageAttachment } from '@guild/types';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const orgId = userProfile?.organizationId;
  const { project, loading: projectLoading } = useProject(projectId);
  const { milestones } = useMilestones(projectId);
  const { columns, loading: tasksLoading } = useTasks(orgId, projectId ? { projectId } : undefined);
  const members = useOrgMembers(orgId);
  const { goals } = useGoals(orgId);

  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
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
  const [showMemberPicker, setShowMemberPicker] = React.useState(false);

  React.useEffect(() => {
    if (project) {
      setEditName(project.name);
      setEditDesc(project.description || '');
      setEditStartDate(project.startDate ? new Date((project.startDate as any).seconds * 1000).toISOString().split('T')[0] : '');
      setEditDueDate(project.dueDate ? new Date((project.dueDate as any).seconds * 1000).toISOString().split('T')[0] : '');
    }
  }, [project, isEditing]);

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

  const getMemberPhotoURL = (userId: string) => {
    const m = memberMap.get(userId);
    return m?.photoURL || '';
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
    // Filter root level project tasks only
    return all.filter(t => !t.parentTaskId);
  }, [columns]);

  const activeTasks = React.useMemo(() => allTasks.filter(t => t.status !== 'done'), [allTasks]);
  const completedTasks = React.useMemo(() => allTasks.filter(t => t.status === 'done'), [allTasks]);

  const activeTask = React.useMemo(() => {
    if (!selectedTask) return null;
    return allTasks.find(t => t.id === selectedTask.id) ?? selectedTask;
  }, [allTasks, selectedTask]);

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
    <div className="h-full w-full bg-transparent p-1.5 flex flex-col min-h-0 overflow-hidden gap-5">
      
      {/* ─── Premium Glassmorphic Obsidian Card ─── */}
      <div className="flex-1 min-h-0 border border-border-default/80 bg-surface/50 dark:bg-surface/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col z-10 relative">
        
        {/* Header Section */}
        <div className="p-6 border-b border-border-default/45 flex flex-col gap-4 shrink-0 bg-surface/10">
          <div className="flex items-center justify-between shrink-0 flex-wrap gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
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
                    onClick={handleToggleProjectStatus}
                    className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                      project.status === 'completed'
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "border-border-default bg-bg-primary/50 hover:border-indigo-500"
                    )}
                    title={project.status === 'completed' ? "Mark Project Active" : "Mark Project Completed"}
                  >
                    {project.status === 'completed' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <FolderGit className="w-3.5 h-3.5 text-indigo-500 drop-shadow-[0_0_4px_rgba(99,102,241,0.2)]" />
                    )}
                  </button>
                  <h1 className={cn("text-sm font-black tracking-tight truncate flex items-center gap-1.5", project.status === 'completed' ? "text-muted-foreground line-through decoration-indigo-500/50" : "text-foreground")}>
                    <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{project.name}</span>
                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/25 text-amber-600 dark:text-amber-400 bg-amber-500/[0.04] leading-none ml-2">
                      Secure Initiative
                    </span>
                  </h1>
                </div>
                {project.description && (
                  <p className="text-[10px] text-muted-foreground mt-1 max-w-2xl font-medium leading-relaxed truncate">{project.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-auto">
              {/* Meta dates */}
              <div className="flex flex-col gap-0.5 text-right font-mono text-[8px] text-muted-foreground hidden sm:flex">
                {project.startDate && (
                  <span>Start: {new Date(project.startDate instanceof Date ? project.startDate : (project.startDate as any).seconds * 1000).toLocaleDateString()}</span>
                )}
                {project.dueDate && (
                  <span>Due: {new Date(project.dueDate instanceof Date ? project.dueDate : (project.dueDate as any).seconds * 1000).toLocaleDateString()}</span>
                )}
              </div>
              
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] hover:bg-indigo-500/[0.08] text-indigo-600 dark:text-indigo-405 px-4 py-2 text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>

              <button
                onClick={() => setShowComments(!showComments)}
                className={cn(
                  "flex items-center justify-center gap-1.5 h-9 rounded-xl border px-3.5 transition-all active:scale-90 shrink-0 cursor-pointer text-xs font-bold",
                  showComments
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    : "border-border-default/60 hover:bg-bg-secondary text-muted-foreground hover:text-foreground"
                )}
                title="Project Discussion"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden md:inline">Discussion ({comments.length})</span>
              </button>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  "w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-90 shrink-0 cursor-pointer",
                  isEditing
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400"
                    : "border-border-default/60 hover:bg-bg-secondary text-muted-foreground hover:text-foreground"
                )}
                title="Project Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Project Members Row */}
          <div className="flex items-center gap-3 pt-2.5 border-t border-border-default/20 relative">
            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Project Team</span>
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {(project.memberIds || []).map((uid) => {
                const photoURL = getMemberPhotoURL(uid);
                const fullName = memberMap.get(uid)?.fullName || 'Member';
                return photoURL ? (
                  <img
                    key={uid}
                    src={photoURL}
                    alt={fullName}
                    className="w-6 h-6 rounded-full object-cover shrink-0 ring-2 ring-surface/90 border border-white/10 dark:border-black/20"
                    title={fullName}
                  />
                ) : (
                  <div
                    key={uid}
                    className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center font-bold text-[8px] shrink-0 ring-2 ring-surface/90",
                      getAvatarColor(uid)
                    )}
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
                className="w-6 h-6 rounded-full border border-dashed border-border-default hover:border-indigo-500 bg-bg-primary/50 text-muted-foreground hover:text-indigo-500 flex items-center justify-center transition-all cursor-pointer"
                title="Manage Members"
              >
                <Plus className="w-3 h-3" />
              </button>

              <AnimatePresence>
                {showMemberPicker && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowMemberPicker(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 mt-2 w-56 max-h-60 overflow-y-auto rounded-xl border border-border-default bg-surface/95 dark:bg-surface/90 backdrop-blur-md p-2 shadow-xl z-50 aether-scroll"
                    >
                      <div className="px-2 py-1.5 border-b border-border-default/45 mb-1.5">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Assign Members</span>
                      </div>
                      <div className="space-y-0.5">
                        {members.map((member) => {
                          const isIncluded = (project.memberIds || []).includes(member.uid);
                          return (
                            <button
                              key={member.uid}
                              onClick={() => handleToggleProjectMember(member.uid)}
                              className={cn(
                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-left transition-colors cursor-pointer",
                                isIncluded 
                                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                                  : "hover:bg-bg-secondary text-foreground"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {member.photoURL ? (
                                  <img
                                    src={member.photoURL}
                                    alt={member.fullName}
                                    className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/10 dark:border-black/20"
                                  />
                                ) : (
                                  <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[7px] shrink-0", getAvatarColor(member.uid))}>
                                    {getInitials(member.uid)}
                                  </div>
                                )}
                                <span className="truncate">{member.fullName}</span>
                              </div>
                              {isIncluded && <Check className="w-3 h-3 text-indigo-500 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Split container for canvas & sidebar */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          
          {/* Left side: Scrollable Spatial Canvas */}
          <div className="flex-1 overflow-y-auto aether-scroll p-6 space-y-6">
            
            {/* Progress overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Completion rate card */}
              <div className="p-4 rounded-xl border border-border-default/60 bg-bg-secondary/20 flex flex-col justify-between gap-3 shadow-sm">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Execution Progress</span>
                <div className="space-y-1.5">
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-black font-mono text-foreground leading-none">{progressRate}%</span>
                    <span className="text-[9px] text-muted-foreground font-semibold">({completedTasks.length}/{allTasks.length} Completed)</span>
                  </div>
                  <div className="w-full bg-bg-secondary rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-555 h-full rounded-full transition-all duration-500" style={{ width: `${progressRate}%`, backgroundColor: 'var(--accent)' }} />
                  </div>
                </div>
              </div>

              {/* Milestones brief card */}
              <div className="p-4 rounded-xl border border-border-default/60 bg-bg-secondary/20 flex flex-col justify-between gap-3 shadow-sm">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Milestones Hub</span>
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-xl font-black font-mono text-foreground leading-none">
                      {milestones.filter(m => m.completed).length}
                    </span>
                    <span className="text-[8px] text-muted-foreground mt-1 font-semibold">Completed Milestones</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground font-semibold">Total Milestones: {milestones.length}</span>
                </div>
              </div>

              {/* Active Task density */}
              <div className="p-4 rounded-xl border border-border-default/60 bg-bg-secondary/20 flex flex-col justify-between gap-3 shadow-sm">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Operational Workload</span>
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-xl font-black font-mono text-foreground leading-none">
                      {activeTasks.length}
                    </span>
                    <span className="text-[8px] text-muted-foreground mt-1 font-semibold">Active execution items</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground font-semibold">Workload density: {activeTasks.length > 5 ? 'High' : 'Normal'}</span>
                </div>
              </div>
              
            </div>

            {/* Milestone Rail widget */}
            {projectId && (
              <div className="rounded-xl border border-border-default bg-bg-secondary/10 shadow-sm overflow-hidden">
                <MilestoneRail projectId={projectId} orgId={orgId} milestones={milestones} />
              </div>
            )}

            {/* Project Media & Files */}
            <div className="pt-2">
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

            {/* Tasks Stack */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5 border-b border-border-default/45 pb-2">
                <Clock className="w-3.5 h-3.5 text-indigo-500 drop-shadow-[0_0_4px_rgba(99,102,241,0.2)]" />
                <span>Project Tasks Stack</span>
              </h3>

              {tasksLoading ? (
                <div className="flex py-12 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Render active tasks list */}
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
                            className="h-4 w-4 rounded-full border border-border-default bg-bg-primary/50 flex items-center justify-center shrink-0 transition-all cursor-pointer hover:border-indigo-555"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-transparent group-hover:bg-indigo-500/50" />
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
                            getMemberPhotoURL(task.assigneeIds[0]) ? (
                              <img
                                src={getMemberPhotoURL(task.assigneeIds[0])}
                                alt={memberMap.get(task.assigneeIds[0])?.fullName || 'Member'}
                                className="w-5.5 h-5.5 rounded-full object-cover shrink-0 border border-white/10 dark:border-black/20"
                                title={`Assigned to ${memberMap.get(task.assigneeIds[0])?.fullName || 'Member'}`}
                              />
                            ) : (
                              <div className="w-5.5 h-5.5 rounded-full bg-bg-secondary border border-border-default flex items-center justify-center font-bold text-[8px] text-muted-foreground" title={`Assigned to ${memberMap.get(task.assigneeIds[0])?.fullName || 'Member'}`}>
                                {getInitials(task.assigneeIds[0])}
                              </div>
                            )
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
                      <p className="text-[10px] text-muted-foreground italic">No active project tasks.</p>
                    </div>
                  )}

                  {/* Collapsible Completed Tasks Archive */}
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
                                    getMemberPhotoURL(task.assigneeIds[0]) ? (
                                      <img
                                        src={getMemberPhotoURL(task.assigneeIds[0])}
                                        alt={memberMap.get(task.assigneeIds[0])?.fullName || 'Member'}
                                        className="w-5.5 h-5.5 rounded-full object-cover shrink-0 border border-white/10 dark:border-black/20"
                                        title={`Assigned to ${memberMap.get(task.assigneeIds[0])?.fullName || 'Member'}`}
                                      />
                                    ) : (
                                      <div className="w-5.5 h-5.5 rounded-full bg-bg-secondary border border-border-default flex items-center justify-center font-bold text-[8px] text-muted-foreground" title={`Assigned to ${memberMap.get(task.assigneeIds[0])?.fullName || 'Member'}`}>
                                        {getInitials(task.assigneeIds[0])}
                                      </div>
                                    )
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

          {/* Right side: Collapsible Comments Sidebar */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 340, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="w-[340px] shrink-0 border-l border-border-default/45 bg-surface/10 dark:bg-surface/5 flex flex-col h-full overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 border-b border-border-default/45 flex-shrink-0">
                  <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                    Project Discussion
                  </span>
                  <button
                    onClick={() => setShowComments(false)}
                    className="p-1 rounded-lg border border-border-default/60 hover:bg-bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Comments List */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4 aether-scroll">
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3 bg-bg-secondary/30 dark:bg-neutral-850/10 p-3 rounded-2xl border border-border-default/40">
                        {getMemberPhotoURL(comment.authorId) ? (
                          <img
                            src={getMemberPhotoURL(comment.authorId)}
                            alt={comment.authorName}
                            className="h-7 w-7 rounded-full object-cover shrink-0 border border-white/10 dark:border-black/20"
                          />
                        ) : (
                          <div className={cn("h-7 w-7 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0", getAvatarColor(comment.authorId))}>
                            {getInitials(comment.authorId)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-foreground truncate">
                              {comment.authorName}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {formatTimestamp(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-semibold leading-relaxed break-words">
                            {comment.body}
                          </p>
                          
                          {comment.files && comment.files.length > 0 && (
                            <div className="mt-2 space-y-1 max-w-sm">
                              {comment.files.map((file, fIdx) => (
                                <a
                                  key={fIdx}
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 p-1.5 rounded-lg border border-border-default bg-surface/55 hover:bg-bg-secondary text-[10px] text-accent font-bold truncate transition-colors"
                                >
                                  <Paperclip className="w-3 h-3 text-accent shrink-0" />
                                  <span className="truncate flex-1">{file.name}</span>
                                  <span className="text-[8px] text-muted-foreground font-semibold shrink-0">
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
                    <div className="py-12 text-center text-xs text-muted-foreground italic">
                      No discussions on this project yet. Start the conversation!
                    </div>
                  )}
                </div>

                {/* Comment Input */}
                <div className="p-4 border-t border-border-default/45 bg-surface/20 flex-shrink-0 flex flex-col gap-2">
                  <AttachmentInput
                    selectedFiles={commentFiles}
                    onRemove={(idx) => setCommentFiles(prev => prev.filter((_, i) => i !== idx))}
                    onAdd={(files) => setCommentFiles(prev => [...prev, ...Array.from(files)])}
                  />
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={uploadingCommentFiles ? "Uploading files..." : "Send an update..."}
                      value={commentBody}
                      disabled={uploadingCommentFiles}
                      onChange={(e) => setCommentBody(e.target.value)}
                      className="flex-1 bg-bg-primary/50 border border-border-default rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none hover:bg-bg-primary focus:border-indigo-500/50 shadow-inner font-semibold disabled:opacity-50"
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
                      className="p-2 bg-bg-secondary hover:bg-bg-secondary/80 border border-border-default rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shrink-0"
                      title="Attach Files"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={uploadingCommentFiles}
                      className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-405 hover:text-indigo-755 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shrink-0"
                    >
                      {uploadingCommentFiles ? (
                        <Loader2 className="w-4 h-4 animate-spin text-accent" />
                      ) : (
                        <Send className="w-4 h-4" />
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

      <TaskDetailDrawer
        task={activeTask}
        onClose={() => setSelectedTask(null)}
        orgId={orgId}
        actor={actor}
        members={members}
        projects={project ? [project] : []}
        goals={goals}
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
                  <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
                    <Lock className="w-4 h-4 text-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.2)]" />
                  </div>
                  <h3 className="text-sm font-black text-foreground">Configure Secure Project</h3>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="w-7 h-7 rounded-lg border border-border-default/60 hover:bg-bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Security Active Notice */}
                <div className="p-3 bg-amber-500/[0.03] border border-amber-500/15 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Strict Security Active</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    This project is strictly private and secure. Only assigned project members can view the initiative, milestones, and its linked tasks/goals.
                  </p>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Project Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border-default bg-bg-primary/50 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-indigo-500/30"
                    placeholder="Enter project name..."
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Project Description</label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border-default bg-bg-primary/50 text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-indigo-500/30 h-20 resize-none leading-relaxed"
                    placeholder="Describe what this project entails..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Start Date</label>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-border-default bg-bg-primary/50 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>

                  {/* Due Date */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Due Date</label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-border-default bg-bg-primary/50 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>
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
                  onClick={handleSaveProject}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
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
