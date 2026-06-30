import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { 
  X, Check, Calendar, User, Tag, 
  Trash2, Send, Clock, AlertCircle, Play, 
  ChevronRight, Sparkles, MessageSquare, ListTodo,
  Paperclip, Loader2, ListChecks, CheckCircle2, UserPlus, HelpCircle,
  Flag, Share2
} from 'lucide-react';
import { 
  updateTask, moveTask, updatePriority, 
  updateAssignees, updateDueDate, 
  addComment, updateTaskAttachments,
  createTask, deleteTask,
  STATUS_CONFIG, PRIORITY_CONFIG, STATUSES,
  type Task, type TaskStatus, type TaskPriority, type ActorInfo 
} from '../../lib/tasks';
import { useTaskComments, useTaskActivities, useSubtasks, useSingleTask } from '../../hooks/useTasks';
import { cn } from '@/lib/utils';
import { AttachmentSection } from './AttachmentSection';
import { AttachmentInput } from './AttachmentInput';
import { type MessageAttachment } from '@guild/types';
import { uploadEntityAttachment } from '../../lib/storage';

interface TaskDetailDrawerProps {
  task: Task | null;
  onClose: () => void;
  orgId: string;
  actor: ActorInfo;
  members: any[];
  projects: any[];
  goals: any[];
  inline?: boolean;
}

export function TaskDetailDrawer({
  task,
  onClose,
  orgId,
  actor,
  members,
  projects,
  goals,
  inline = false
}: TaskDetailDrawerProps) {
  const [, setSearchParams] = useSearchParams();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [commentBody, setCommentBody] = React.useState('');
  const [commentFiles, setCommentFiles] = React.useState<File[]>([]);
  const [uploadingCommentFiles, setUploadingCommentFiles] = React.useState(false);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [isEditingDesc, setIsEditingDesc] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'comments' | 'activity'>('comments');
  const [newSubtaskTitle, setNewSubtaskTitle] = React.useState('');
  const [isAddingSubtask, setIsAddingSubtask] = React.useState(false);

  // Toast and Send Back states
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isSendBackOpen, setIsSendBackOpen] = React.useState(false);
  const [sendBackText, setSendBackText] = React.useState('');
  const [isSubmittingSendBack, setIsSubmittingSendBack] = React.useState(false);

  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Firestore Subscriptions
  const comments = useTaskComments(task?.id || null);
  const activities = useTaskActivities(task?.id || null);
  const subtasks = useSubtasks(task?.id || null);
  const parentTask = useSingleTask(task?.parentTaskId || null);

  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
    }
  }, [task]);

  if (!task) return null;

  // Authorization checks: only creator of task or owner/admin of org can delete
  const currentUserMember = members.find(m => m.uid === actor.uid);
  const userRole = currentUserMember?.role || 'member';
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';
  const isCreator = task.creatorId === actor.uid;
  const canDelete = isCreator || isOwnerOrAdmin;

  const currentProject = projects.find(p => p.id === task.projectId);
  const currentGoal = goals.find(g => g.id === task.goalId);

  // Subtask analytics
  const completedSubtasksCount = subtasks.filter(s => s.status === 'done').length;
  const totalSubtasksCount = subtasks.length;
  const subtaskProgress = totalSubtasksCount > 0 ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) : 0;

  const handleTitleBlur = async () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== task.title) {
      try {
        await updateTask(task.id, orgId, { title: title.trim() }, actor);
      } catch (err) {
        console.error('Failed to update title:', err);
        setTitle(task.title);
      }
    }
  };

  const handleDescBlur = async () => {
    setIsEditingDesc(false);
    if (description !== task.description) {
      try {
        await updateTask(task.id, orgId, { description }, actor);
      } catch (err) {
        console.error('Failed to update description:', err);
        setDescription(task.description || '');
      }
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    const STATUS_ORDER: Record<TaskStatus, number> = { todo: 0, in_progress: 1, review: 2, done: 3 };
    const oldStatusVal = STATUS_ORDER[task.status] ?? 0;
    const newStatusVal = STATUS_ORDER[newStatus] ?? 0;

    if (newStatusVal < oldStatusVal) {
      // Backward status transition
      const isRejection = task.status === 'review' && newStatus === 'in_progress' && task.creatorId === actor.uid;
      if (!isRejection) {
        setToastMessage("Status cannot go backward once moved.");
        return;
      }
    }

    if (newStatus === 'done' && task.status === 'review' && task.creatorId !== actor.uid) {
      setToastMessage("Only the creator of this task can approve it from In Review.");
      return;
    }
    try {
      await moveTask(task.id, orgId, newStatus, task.orderIndex, task.status, actor);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    try {
      await updatePriority(task.id, orgId, newPriority, task.priority, actor);
    } catch (err) {
      console.error('Failed to update priority:', err);
    }
  };

  const handleAssigneeChange = async (userId: string) => {
    const isAssigned = task.assigneeIds.includes(userId);
    let newAssignees = [...task.assigneeIds];
    if (isAssigned) {
      newAssignees = newAssignees.filter(id => id !== userId);
    } else {
      newAssignees.push(userId);
    }
    try {
      await updateAssignees(task.id, orgId, newAssignees, task.assigneeIds, actor, task.title);
    } catch (err) {
      console.error('Failed to update assignees:', err);
    }
  };

  const handleDueDateChange = async (dateStr: string) => {
    try {
      await updateDueDate(task.id, orgId, dateStr ? new Date(dateStr) : null, actor);
    } catch (err) {
      console.error('Failed to update due date:', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim() && commentFiles.length === 0) return;
    setUploadingCommentFiles(true);
    try {
      let uploaded: MessageAttachment[] = [];
      if (commentFiles.length > 0) {
        uploaded = await Promise.all(
          commentFiles.map(file => uploadEntityAttachment('comments', task.id, file))
        );
      }

      await addComment({
        taskId: task.id,
        orgId,
        authorId: actor.uid,
        authorName: actor.name,
        authorUsername: actor.name.toLowerCase().replace(/\s+/g, ''),
        body: commentBody.trim(),
        mentions: [],
        taskTitle: task.title,
        files: uploaded
      });
      setCommentBody('');
      setCommentFiles([]);
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setUploadingCommentFiles(false);
    }
  };

  const handleAddSubtaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || isAddingSubtask) return;
    setIsAddingSubtask(true);
    try {
      await createTask({
        orgId,
        title: newSubtaskTitle.trim(),
        status: 'todo',
        priority: 'none',
        assigneeIds: (task.assigneeIds && task.assigneeIds.length > 0) ? task.assigneeIds : [],
        dueDate: null,
        actor,
        projectId: task.projectId || null,
        goalId: task.goalId || null,
        parentTaskId: task.id,
      });
      setNewSubtaskTitle('');
    } catch (err) {
      console.error('Failed to create subtask:', err);
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSubtaskStatus = async (sub: Task) => {
    const nextStatus: TaskStatus = sub.status === 'done' ? 'todo' : 'done';
    try {
      await moveTask(sub.id, orgId, nextStatus, sub.orderIndex || 1000, sub.status, actor);
    } catch (err) {
      console.error('Failed to update subtask status:', err);
    }
  };

  const handleDeleteSubtask = async (subId: string) => {
    if (confirm('Are you sure you want to delete this subtask?')) {
      try {
        await deleteTask(subId);
      } catch (err) {
        console.error('Failed to delete subtask:', err);
      }
    }
  };

  const getMemberInitials = (uid: string) => {
    const m = members.find(mem => mem.uid === uid);
    if (!m) return '?';
    return m.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getMemberName = (uid: string) => {
    const m = members.find(mem => mem.uid === uid);
    return m?.fullName || 'Teammate';
  };

  const getMemberPhotoURL = (uid: string) => {
    const m = members.find(mem => mem.uid === uid);
    return m?.photoURL || '';
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '';
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts.seconds * 1000);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getDueDateString = () => {
    if (!task.dueDate) return '';
    const date = typeof task.dueDate.toDate === 'function' ? task.dueDate.toDate() : new Date((task.dueDate as any).seconds * 1000);
    return date.toISOString().split('T')[0];
  };

  // Human friendly Activity Detail renderer using plain language
  const renderActivityDetail = (act: any) => {
    const p = act.payload || {};
    switch (act.type) {
      case 'created':
        return <span>created the task <strong>"{p.title || task.title}"</strong></span>;
      case 'edited':
        if (p.title && p.description) {
          return <span>updated both the title and task details</span>;
        } else if (p.title) {
          return <span>updated task title to <strong>"{p.title}"</strong></span>;
        } else if (p.description !== undefined) {
          return <span>updated task details</span>;
        }
        return <span>edited task details</span>;
      case 'status_changed':
        const fromLabel = STATUS_CONFIG[p.from as TaskStatus]?.label || p.from || 'Todo';
        const toLabel = STATUS_CONFIG[p.to as TaskStatus]?.label || p.to || 'Done';
        return (
          <span>
            changed status from <span className="font-semibold text-neutral-500 dark:text-neutral-450">{fromLabel}</span> to <strong className="text-primary font-bold">{toLabel}</strong>
          </span>
        );
      case 'priority_changed':
        const fromPri = p.from || 'None';
        const toPri = p.to || 'None';
        return (
          <span>
            changed priority from <span className="font-semibold text-neutral-500 dark:text-neutral-450 text-xs capitalize">{fromPri}</span> to <strong className="text-primary capitalize">{toPri}</strong>
          </span>
        );
      case 'assigned':
        const assignedNames = (p.assigneeIds || []).map((uid: string) => getMemberName(uid)).join(', ');
        return <span>assigned the task to <strong>{assignedNames || 'a teammate'}</strong></span>;
      case 'unassigned':
        const unassignedNames = (p.assigneeIds || []).map((uid: string) => getMemberName(uid)).join(', ');
        return <span>removed <strong>{unassignedNames || 'assignee'}</strong> from the task</span>;
      case 'due_date_set':
        if (!p.dueDate) return <span>removed the due date</span>;
        const due = new Date(p.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        return <span>scheduled the due date for <strong>{due}</strong></span>;
      case 'commented':
        return (
          <span className="italic text-neutral-500 dark:text-neutral-400">
            added a comment: "{p.preview || '...'}"
          </span>
        );
      default:
        return <span>performed an action: {act.type.replace(/_/g, ' ')}</span>;
    }
  };

  // Activity Icon picker
  const getActivityIcon = (type: string) => {
    const iconClass = "w-3.5 h-3.5";
    switch (type) {
      case 'created':
        return <Sparkles className={cn(iconClass, "text-cyan-500")} />;
      case 'status_changed':
        return <CheckCircle2 className={cn(iconClass, "text-emerald-500")} />;
      case 'priority_changed':
        return <AlertCircle className={cn(iconClass, "text-amber-500")} />;
      case 'assigned':
        return <UserPlus className={cn(iconClass, "text-indigo-500")} />;
      case 'unassigned':
        return <User className={cn(iconClass, "text-rose-500")} />;
      case 'due_date_set':
        return <Calendar className={cn(iconClass, "text-sky-500")} />;
      case 'commented':
        return <MessageSquare className={cn(iconClass, "text-teal-500")} />;
      default:
        return <HelpCircle className={cn(iconClass, "text-neutral-400")} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'created': return 'bg-cyan-500/10 border-cyan-500/20';
      case 'status_changed': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'priority_changed': return 'bg-amber-500/10 border-amber-500/20';
      case 'assigned': return 'bg-indigo-500/10 border-indigo-500/20';
      case 'unassigned': return 'bg-rose-500/10 border-rose-500/20';
      case 'due_date_set': return 'bg-sky-500/10 border-sky-500/20';
      case 'commented': return 'bg-teal-500/10 border-teal-500/20';
      default: return 'bg-neutral-500/10 border-neutral-500/20';
    }
  };

  // --- Redesign Helpers ---
  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?task=${task.id}`;
    navigator.clipboard.writeText(url);
    setToastMessage("Task link copied!");
  };

  const handleDeleteTask = async () => {
    if (!canDelete) {
      setToastMessage("Only the creator of this task or an admin/owner can delete it.");
      return;
    }
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask(task.id);
        onClose();
      } catch (err) {
        console.error("Failed to delete task:", err);
      }
    }
  };

  const renderStatusTrigger = (s: TaskStatus) => {
    const config = STATUS_CONFIG[s];
    const bgColors: Record<TaskStatus, string> = {
      todo: "bg-neutral-100/80 hover:bg-neutral-200/80 dark:bg-neutral-800/60 dark:hover:bg-neutral-700/60 border-neutral-200/60 dark:border-neutral-800 text-neutral-800 dark:text-neutral-250",
      in_progress: "bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 border-blue-150 dark:border-blue-900/40 text-blue-600 dark:text-blue-400",
      review: "bg-amber-50/80 hover:bg-amber-100/80 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border-amber-150 dark:border-amber-900/40 text-amber-600 dark:text-amber-400",
      done: "bg-emerald-50/80 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border-emerald-150 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400"
    };

    return (
      <div className={cn("flex items-center justify-between w-full border rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-xs", bgColors[s])}>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: config.dot }} />
          <span>{config.label}</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 rotate-90 shrink-0 opacity-60" />
      </div>
    );
  };

  const renderStatusOption = (s: TaskStatus, isSelected: boolean) => {
    const config = STATUS_CONFIG[s];
    return (
      <div className={cn(
        "flex items-center justify-between w-full px-3.5 py-2.5 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-colors",
        isSelected ? "text-primary bg-primary/[0.03] dark:bg-primary/[0.05]" : "text-neutral-700 dark:text-neutral-350"
      )}>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: config.dot }} />
          <span>{config.label}</span>
        </div>
        {isSelected && <Check className="w-4 h-4 text-primary shrink-0 stroke-[2.5]" />}
      </div>
    );
  };

  const renderPriorityTrigger = (p: TaskPriority) => {
    const config = PRIORITY_CONFIG[p];
    const borderColors: Record<TaskPriority, string> = {
      none: "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-450",
      low: "border-sky-200 dark:border-sky-900/40 bg-sky-50/20 dark:bg-sky-950/10 text-sky-600 dark:text-sky-400",
      medium: "border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 text-amber-600 dark:text-amber-400",
      high: "border-orange-200 dark:border-orange-900/40 bg-orange-50/20 dark:bg-orange-950/10 text-orange-600 dark:text-orange-400",
      urgent: "border-rose-200 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400"
    };

    return (
      <div className={cn("flex items-center justify-between w-full border rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-xs", borderColors[p])}>
        <div className="flex items-center gap-2.5">
          <Flag className="w-3.5 h-3.5 shrink-0" style={{ fill: config.color, stroke: config.color }} />
          <span>{config.label} Priority</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 rotate-90 shrink-0 opacity-60" />
      </div>
    );
  };

  const renderPriorityOption = (p: TaskPriority, isSelected: boolean) => {
    const config = PRIORITY_CONFIG[p];
    return (
      <div className={cn(
        "flex items-center justify-between w-full px-3.5 py-2.5 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-colors",
        isSelected ? "text-primary bg-primary/[0.03] dark:bg-primary/[0.05]" : "text-neutral-700 dark:text-neutral-350"
      )}>
        <div className="flex items-center gap-2.5">
          <Flag className="w-3.5 h-3.5 shrink-0" style={{ fill: config.color, stroke: config.color }} />
          <span>{config.label} Priority</span>
        </div>
        {isSelected && <Check className="w-4 h-4 text-primary shrink-0 stroke-[2.5]" />}
      </div>
    );
  };

  if (inline) {
    return (
      <div className="h-full border-l border-white/10 dark:border-white/5 bg-surface/95 dark:bg-zinc-950/60 backdrop-blur-xl flex flex-col z-30 overflow-hidden absolute inset-y-0 right-0 w-full sm:w-[420px] lg:relative shadow-2xl lg:shadow-none shrink-0">
        <div className="w-full sm:w-[420px] h-full flex flex-col min-h-0">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-850/60 flex-shrink-0 bg-neutral-50/30 dark:bg-neutral-900/30 backdrop-blur-sm">
            <div className="min-w-0 flex-1 mr-4">
              {parentTask ? (
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 font-bold mb-0.5 truncate">
                  <span 
                    onClick={() => setSearchParams({ task: parentTask.id })}
                    className="hover:text-primary cursor-pointer transition-colors max-w-[120px] truncate block"
                  >
                    {parentTask.title}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-350 dark:text-neutral-700 shrink-0" />
                  <span className="text-neutral-550 dark:text-neutral-300 font-extrabold max-w-[120px] truncate block">
                    Current task
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest font-black text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800/60 px-2 py-0.5 rounded-md">
                    Task Workspace
                  </span>
                </div>
              )}
            </div>

            {/* Quick Actions & Close Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-xl border border-neutral-200/65 dark:border-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
                title="Copy Link to Task"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <div className="h-6 w-[1px] bg-neutral-200 dark:bg-neutral-800 mx-1 shrink-0" />
              <button
                onClick={onClose}
                className="p-2 rounded-xl border border-neutral-200/65 dark:border-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-grow flex flex-col overflow-y-auto scrollbar-thin min-h-0">
            {/* Left Workspace Column (Stacked vertically when inline) */}
            <div className="p-6 space-y-6 flex-shrink-0">
              
              {/* Approval revisions block */}
              {task.status === 'review' && task.creatorId === actor.uid && (
                <div className="bg-amber-500/[0.03] dark:bg-amber-500/[0.05] border border-amber-500/20 rounded-2xl p-4.5 space-y-3.5 relative overflow-hidden shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <div className="h-7.5 w-7.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 shadow-xs">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-500">
                        Review Approval Request
                      </h4>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed font-semibold">
                        This task has been submitted for review. Please inspect the revisions and approve it, or send it back with comments.
                      </p>
                    </div>
                  </div>

                  {!isSendBackOpen ? (
                    <div className="flex items-center gap-3 pt-2.5 border-t border-amber-500/10">
                      <button
                        onClick={() => handleStatusChange('done')}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Approve Task
                      </button>
                      <button
                        onClick={() => setIsSendBackOpen(true)}
                        className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-450 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
                      >
                        Request Revisions
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!sendBackText.trim() || isSubmittingSendBack) return;
                        setIsSubmittingSendBack(true);
                        try {
                          await moveTask(task.id, orgId, 'in_progress', task.orderIndex, task.status, actor);
                          await addComment({
                            taskId: task.id,
                            orgId,
                            authorId: actor.uid,
                            authorName: actor.name,
                            authorUsername: actor.name.toLowerCase().replace(/\s+/g, ''),
                            body: `[Review Feedback] ${sendBackText.trim()}`,
                            mentions: task.assigneeIds || [],
                            taskTitle: task.title
                          });
                          setIsSendBackOpen(false);
                          setSendBackText('');
                          setToastMessage("Revisions requested.");
                        } catch (err) {
                          console.error("Failed to request changes:", err);
                        } finally {
                          setIsSubmittingSendBack(false);
                        }
                      }}
                      className="space-y-3 pt-2.5 border-t border-amber-500/10"
                    >
                      <textarea
                        value={sendBackText}
                        onChange={(e) => setSendBackText(e.target.value)}
                        placeholder="Detail what revisions or corrections are needed..."
                        rows={3}
                        required
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-neutral-450 focus:border-amber-500/50 outline-none resize-none font-semibold transition-all"
                      />
                      <div className="flex items-center gap-2.5 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsSendBackOpen(false);
                            setSendBackText('');
                          }}
                          className="px-3.5 py-1.5 border border-border-default/60 hover:bg-bg-secondary text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!sendBackText.trim() || isSubmittingSendBack}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-[11px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          {isSubmittingSendBack ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Send Back"
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Title Header */}
              <div className="space-y-1.5">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                    autoFocus
                    className="w-full text-lg font-bold text-neutral-850 dark:text-neutral-100 outline-none border-b border-primary bg-transparent pb-1.5 transition-all"
                  />
                ) : (
                  <h2
                    onClick={() => setIsEditingTitle(true)}
                    className="text-lg font-bold text-neutral-850 dark:text-neutral-100 cursor-text hover:bg-neutral-50/50 dark:hover:bg-neutral-850/20 px-2 py-1 -ml-2 rounded-xl border border-transparent hover:border-neutral-200/30 transition-all break-words leading-tight"
                  >
                    {title || <span className="text-neutral-400 italic font-normal">Untitled Task</span>}
                  </h2>
                )}
              </div>

              {/* Description Pad */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Task Guidelines & Description
                </label>
                {isEditingDesc ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescBlur}
                    rows={4}
                    autoFocus
                    placeholder="Provide expectation details, notes or guidelines..."
                    className="w-full bg-neutral-50/50 dark:bg-neutral-850/20 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 py-3.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-450 dark:placeholder:text-neutral-600 outline-none focus:border-primary/50 font-semibold resize-none transition-all"
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className="min-h-16 text-xs text-neutral-650 dark:text-neutral-350 hover:bg-neutral-50/50 dark:hover:bg-neutral-850/10 px-4 py-3.5 rounded-2xl border border-neutral-150 dark:border-neutral-850/80 cursor-text transition-all leading-relaxed whitespace-pre-wrap font-semibold"
                  >
                    {description || <span className="text-neutral-400 italic font-normal">Add descriptive notes, key requirements or guidelines...</span>}
                  </div>
                )}
              </div>

              {/* Subtasks checklist area */}
              <div className="bg-neutral-50/20 dark:bg-neutral-850/10 border border-neutral-150 dark:border-neutral-850/80 rounded-2xl p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Subtask Items</h3>
                  </div>
                  {totalSubtasksCount > 0 && (
                    <span className="text-[10px] font-black text-neutral-450 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800/80 px-2 py-0.5 rounded-full">
                      {completedSubtasksCount} of {totalSubtasksCount} done
                    </span>
                  )}
                </div>

                {/* Subtask Progress indicator */}
                {totalSubtasksCount > 0 && (
                  <div className="space-y-1">
                    <div className="w-full bg-neutral-200/70 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-500 ease-out shadow-xs" 
                        style={{ width: `${subtaskProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Subtask items card stack */}
                {subtasks.length > 0 ? (
                  <div className="space-y-2">
                    {subtasks.map((sub) => (
                      <div 
                        key={sub.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-150/40 dark:border-neutral-800/40 hover:border-neutral-250 dark:hover:border-neutral-700 hover:shadow-xs transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={() => handleToggleSubtaskStatus(sub)}
                            className={cn(
                              "h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-2xs",
                              sub.status === 'done' 
                                ? "bg-primary border-primary text-white" 
                                : "border-neutral-350 dark:border-neutral-700 hover:border-primary bg-transparent"
                            )}
                          >
                            {sub.status === 'done' && <Check className="w-2.5 h-2.5 stroke-[3.5]" />}
                          </button>

                          <span 
                            onClick={() => setSearchParams({ task: sub.id })}
                            className={cn(
                              "text-xs font-semibold cursor-pointer hover:text-primary transition-all truncate",
                              sub.status === 'done' ? "text-neutral-450 dark:text-neutral-500 line-through" : "text-neutral-800 dark:text-neutral-200"
                            )}
                          >
                            {sub.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {sub.assigneeIds.slice(0, 1).map((uid) => (
                            <div 
                              key={uid} 
                              className="h-5.5 w-5.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[8px] font-bold text-primary shrink-0 overflow-hidden shadow-2xs"
                              title={getMemberName(uid)}
                            >
                              {getMemberPhotoURL(uid) ? (
                                <img src={getMemberPhotoURL(uid)} alt={getMemberName(uid)} className="h-full w-full object-cover" />
                              ) : (
                                getMemberInitials(uid)
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => handleDeleteSubtask(sub.id)}
                            className="p-1 rounded text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-850 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-450 dark:text-neutral-550 italic text-center py-2">
                    No checklist subtasks. Break this task into smaller steps.
                  </p>
                )}

                {/* Subtask inline creation input */}
                <form onSubmit={handleAddSubtaskSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a subtask step..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-850 dark:text-neutral-200 placeholder:text-neutral-450 outline-none hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-primary/50 transition-all font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={!newSubtaskTitle.trim() || isAddingSubtask}
                    className="px-3.5 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-xs font-bold hover:bg-neutral-850 dark:hover:bg-neutral-100 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  >
                    {isAddingSubtask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
                  </button>
                </form>
              </div>

              {/* Attachments Section */}
              <div>
                <AttachmentSection
                  entityType="tasks"
                  entityId={task.id}
                  files={task.files}
                  onAttachmentsChanged={async (updatedFiles) => {
                    try {
                      await updateTaskAttachments(task.id, updatedFiles);
                    } catch (err) {
                      console.error("Failed to update task attachments:", err);
                    }
                  }}
                />
              </div>

              {/* Discussion & Activity Timelines */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-850/60 flex flex-col flex-grow min-h-[320px]">
                <div className="flex border-b border-neutral-150 dark:border-neutral-850/60 mb-4 flex-shrink-0 relative">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={cn(
                      "pb-2 px-4 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 relative z-10",
                      activeTab === 'comments'
                        ? "text-neutral-900 dark:text-neutral-100 font-black"
                        : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 font-semibold"
                    )}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Comments ({comments.length})</span>
                    {activeTab === 'comments' && (
                      <motion.div 
                        layoutId="activeTabUnderline" 
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" 
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={cn(
                      "pb-2 px-4 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 relative z-10",
                      activeTab === 'activity'
                        ? "text-neutral-900 dark:text-neutral-100 font-black"
                        : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 font-semibold"
                    )}
                  >
                    <ListTodo className="w-4 h-4" />
                    <span>Activity Log ({activities.length})</span>
                    {activeTab === 'activity' && (
                      <motion.div 
                        layoutId="activeTabUnderline" 
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" 
                      />
                    )}
                  </button>
                </div>

                {/* Switchable Thread Panels */}
                <div className="flex-grow flex flex-col overflow-hidden min-h-[220px]">
                  {activeTab === 'comments' ? (
                    <div className="flex flex-col h-full overflow-hidden justify-between">
                      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin max-h-[250px]">
                        {comments.length > 0 ? (
                          comments.map((comment) => (
                            <div key={comment.id} className="flex items-start gap-3 bg-neutral-50/30 dark:bg-neutral-850/10 p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-850/50 hover:shadow-2xs transition-all">
                              <div className="h-7.5 w-7.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 overflow-hidden shadow-xs">
                                {getMemberPhotoURL(comment.authorId) ? (
                                  <img src={getMemberPhotoURL(comment.authorId)} alt={comment.authorName} className="h-full w-full object-cover" />
                                ) : (
                                  getMemberInitials(comment.authorId)
                                )}
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 truncate">
                                    {comment.authorName}
                                  </span>
                                  <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-mono">
                                    {formatTimestamp(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-650 dark:text-neutral-300 font-semibold leading-relaxed break-words whitespace-pre-wrap">
                                  {comment.body}
                                </p>
                                
                                {comment.files && comment.files.length > 0 && (
                                  <div className="mt-2 space-y-1.5 max-w-sm">
                                    {comment.files.map((file, fIdx) => (
                                      <a
                                        key={fIdx}
                                        href={file.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 p-1.5 rounded-xl border border-neutral-200/40 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 text-[10px] text-primary font-bold truncate transition-colors shadow-2xs"
                                      >
                                        <Paperclip className="w-3 h-3 text-primary shrink-0" />
                                        <span className="truncate flex-1">{file.name}</span>
                                        <span className="text-[8px] text-neutral-400 font-semibold shrink-0">
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
                          <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-550 italic">
                            No team comments on this task yet. Add yours below.
                          </div>
                        )}
                      </div>

                      <div className="border-t border-neutral-150 dark:border-neutral-850/60 pt-3.5 flex-shrink-0 flex flex-col gap-2">
                        <AttachmentInput
                          selectedFiles={commentFiles}
                          onRemove={(idx) => setCommentFiles(prev => prev.filter((_, i) => i !== idx))}
                          onAdd={(files) => setCommentFiles(prev => [...prev, ...Array.from(files)])}
                        />
                        <form onSubmit={handleAddComment} className="flex gap-2">
                          <input
                            type="text"
                            placeholder={uploadingCommentFiles ? "Uploading attachments..." : "Add a team comment here..."}
                            value={commentBody}
                            disabled={uploadingCommentFiles}
                            onChange={(e) => setCommentBody(e.target.value)}
                            className="flex-1 bg-neutral-50/70 dark:bg-neutral-850/20 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-450 outline-none hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-primary/50 transition-all font-semibold disabled:opacity-50"
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
                            className="p-2.5 bg-neutral-100 dark:bg-neutral-850 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200/60 dark:border-neutral-800 rounded-xl text-neutral-500 dark:text-neutral-450 hover:text-neutral-800 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shadow-2xs"
                            title="Attach Files"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <button
                            type="submit"
                            disabled={uploadingCommentFiles}
                            className="p-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200/60 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-350 hover:text-neutral-850 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shadow-2xs"
                          >
                            {uploadingCommentFiles ? (
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin max-h-[320px] pt-1">
                      {activities.length > 0 ? (
                        activities.map((act) => (
                          <div 
                            key={act.id} 
                            className="flex items-start gap-4 pb-5 border-l border-neutral-100 dark:border-neutral-800 ml-4.5 pl-6 relative last:border-0"
                          >
                            <div className={cn(
                              "absolute -left-[14.5px] top-0 h-7 w-7 rounded-full border flex items-center justify-center shadow-xs shrink-0 bg-white dark:bg-neutral-900 z-10",
                              getActivityColor(act.type)
                            )}>
                              {getActivityIcon(act.type)}
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-250 truncate">
                                  {act.actorName}
                                </span>
                                <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-mono shrink-0">
                                  {formatTimestamp(act.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-550 dark:text-neutral-400 font-semibold leading-relaxed break-words">
                                {renderActivityDetail(act)}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-550 italic">
                          No audit activities registered yet.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Parameters Dashboard Column (Stacked vertically when inline) */}
            <div className="w-full flex-shrink-0 bg-neutral-50/20 dark:bg-neutral-900/10 p-6 space-y-5.5 flex flex-col border-t border-neutral-100 dark:border-neutral-850/60 flex-grow-0">
              
              {/* Status block with custom selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Workflow Status
                </label>
                <CustomDropdown
                  value={task.status}
                  onChange={handleStatusChange}
                  options={STATUSES}
                  renderTrigger={renderStatusTrigger}
                  renderOption={renderStatusOption}
                />
              </div>

              {/* Priority block with custom selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Task Urgency
                </label>
                <CustomDropdown
                  value={task.priority}
                  onChange={handlePriorityChange}
                  options={['none', 'low', 'medium', 'high', 'urgent']}
                  renderTrigger={renderPriorityTrigger}
                  renderOption={renderPriorityOption}
                />
              </div>

              {/* Assignees Collaborators block */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Team Assignees
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin pr-1">
                  {members.filter(m => m.uid !== actor.uid).map((m) => {
                    const isAssigned = task.assigneeIds.includes(m.uid);
                    return (
                      <button
                        key={m.uid}
                        onClick={() => handleAssigneeChange(m.uid)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-xl px-3 py-2 text-left border transition-all cursor-pointer shadow-2xs",
                          isAssigned
                            ? "bg-primary/[0.04] border-primary/25 text-primary dark:text-white"
                            : "bg-white dark:bg-neutral-900 border-neutral-200/50 dark:border-neutral-800/60 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-250 hover:bg-neutral-50/50"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-5.5 w-5.5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-extrabold text-primary shrink-0 overflow-hidden border border-primary/10">
                            {m.photoURL ? (
                              <img src={m.photoURL} alt={m.fullName} className="h-full w-full object-cover" />
                            ) : (
                              getMemberInitials(m.uid)
                            )}
                          </div>
                          <span className="text-[11px] font-semibold truncate">
                            {m.fullName || m.username}
                          </span>
                        </div>
                        {isAssigned && <Check className="w-3.5 h-3.5 text-primary shrink-0 stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Due Date picker block */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1 px-0.5">
                  <Calendar className="w-3 h-3 text-primary" />
                  <span>Schedule Due Date</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={getDueDateString()}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-neutral-855 dark:text-neutral-200 outline-none cursor-pointer focus:border-primary/50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all font-mono font-bold shadow-2xs"
                  />
                </div>
              </div>

              {/* Context connections info tags */}
              <div className="space-y-3.5 pt-4.5 border-t border-neutral-150 dark:border-neutral-850/60">
                {currentProject && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block px-0.5">Project Scope</span>
                    <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-500/[0.04] px-2 py-1.5 border border-indigo-500/10 rounded-xl block truncate shadow-2xs">
                      {currentProject.name}
                    </span>
                  </div>
                )}

                {currentGoal && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block px-0.5">Focus Goal Link</span>
                    <span className="text-[11px] font-bold text-cyan-500 dark:text-cyan-400 bg-cyan-500/[0.04] px-2 py-1.5 border border-cyan-500/10 rounded-xl block truncate shadow-2xs">
                      {currentGoal.title}
                    </span>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end overflow-hidden select-none pointer-events-none">
        
        {/* Transparent backdrop with blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/15 dark:bg-neutral-950/45 backdrop-blur-xs z-40 pointer-events-auto"
        />

        {/* Redesigned drawer panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 350, damping: 33 }}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white/95 dark:bg-neutral-900/95 border-l border-neutral-200/60 dark:border-neutral-800/60 shadow-2xl flex flex-col h-full pointer-events-auto backdrop-blur-xl"
        >
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-850/60 flex-shrink-0 bg-neutral-50/30 dark:bg-neutral-900/30 backdrop-blur-sm">
            <div className="min-w-0 flex-1 mr-4">
              {parentTask ? (
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 font-bold mb-0.5 truncate">
                  <span 
                    onClick={() => setSearchParams({ task: parentTask.id })}
                    className="hover:text-primary cursor-pointer transition-colors max-w-[200px] truncate block"
                  >
                    {parentTask.title}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-350 dark:text-neutral-700 shrink-0" />
                  <span className="text-neutral-550 dark:text-neutral-300 font-extrabold max-w-[200px] truncate block">
                    Current task
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest font-black text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800/60 px-2 py-0.5 rounded-md">
                    Task Workspace
                  </span>
                </div>
              )}
            </div>

            {/* Quick Actions & Close Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-xl border border-neutral-200/65 dark:border-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
                title="Copy Link to Task"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <div className="h-6 w-[1px] bg-neutral-200 dark:bg-neutral-800 mx-1 shrink-0" />
              <button
                onClick={onClose}
                className="p-2 rounded-xl border border-neutral-200/65 dark:border-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-grow flex flex-col md:flex-row overflow-hidden min-h-0">
            
            {/* Left Workspace Column */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-neutral-100 dark:border-neutral-850/60 overflow-y-auto scrollbar-thin p-6 space-y-6">
              
              {/* Approval revisions block */}
              {task.status === 'review' && task.creatorId === actor.uid && (
                <div className="bg-amber-500/[0.03] dark:bg-amber-500/[0.05] border border-amber-500/20 rounded-2xl p-4.5 space-y-3.5 relative overflow-hidden shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <div className="h-7.5 w-7.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 shadow-xs">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-500">
                        Review Approval Request
                      </h4>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed font-semibold">
                        This task has been submitted for review. Please inspect the revisions and approve it, or send it back with comments.
                      </p>
                    </div>
                  </div>

                  {!isSendBackOpen ? (
                    <div className="flex items-center gap-3 pt-2.5 border-t border-amber-500/10">
                      <button
                        onClick={() => handleStatusChange('done')}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Approve Task
                      </button>
                      <button
                        onClick={() => setIsSendBackOpen(true)}
                        className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
                      >
                        Request Revisions
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!sendBackText.trim() || isSubmittingSendBack) return;
                        setIsSubmittingSendBack(true);
                        try {
                          await moveTask(task.id, orgId, 'in_progress', task.orderIndex, task.status, actor);
                          await addComment({
                            taskId: task.id,
                            orgId,
                            authorId: actor.uid,
                            authorName: actor.name,
                            authorUsername: actor.name.toLowerCase().replace(/\s+/g, ''),
                            body: `[Review Feedback] ${sendBackText.trim()}`,
                            mentions: task.assigneeIds || [],
                            taskTitle: task.title
                          });
                          setIsSendBackOpen(false);
                          setSendBackText('');
                          setToastMessage("Revisions requested.");
                        } catch (err) {
                          console.error("Failed to request changes:", err);
                        } finally {
                          setIsSubmittingSendBack(false);
                        }
                      }}
                      className="space-y-3 pt-2.5 border-t border-amber-500/10"
                    >
                      <textarea
                        value={sendBackText}
                        onChange={(e) => setSendBackText(e.target.value)}
                        placeholder="Detail what revisions or corrections are needed..."
                        rows={3}
                        required
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-neutral-450 focus:border-amber-500/50 outline-none resize-none font-semibold transition-all"
                      />
                      <div className="flex items-center gap-2.5 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsSendBackOpen(false);
                            setSendBackText('');
                          }}
                          className="px-3.5 py-1.5 border border-border-default/60 hover:bg-bg-secondary text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!sendBackText.trim() || isSubmittingSendBack}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-[11px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          {isSubmittingSendBack ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Send Back"
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Title Header */}
              <div className="space-y-1.5">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                    autoFocus
                    className="w-full text-xl font-bold text-neutral-850 dark:text-neutral-100 outline-none border-b border-primary bg-transparent pb-1.5 transition-all"
                  />
                ) : (
                  <h2
                    onClick={() => setIsEditingTitle(true)}
                    className="text-xl font-bold text-neutral-850 dark:text-neutral-100 cursor-text hover:bg-neutral-50/50 dark:hover:bg-neutral-850/20 px-2 py-1 -ml-2 rounded-xl border border-transparent hover:border-neutral-200/30 transition-all break-words leading-tight"
                  >
                    {title || <span className="text-neutral-400 italic font-normal">Untitled Task</span>}
                  </h2>
                )}
              </div>

              {/* Description Pad */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Task Guidelines & Description
                </label>
                {isEditingDesc ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescBlur}
                    rows={4}
                    autoFocus
                    placeholder="Provide expectation details, notes or guidelines..."
                    className="w-full bg-neutral-50/50 dark:bg-neutral-850/20 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 py-3.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:border-primary/50 font-semibold resize-none transition-all"
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className="min-h-16 text-xs text-neutral-650 dark:text-neutral-350 hover:bg-neutral-50/50 dark:hover:bg-neutral-850/10 px-4 py-3.5 rounded-2xl border border-neutral-150 dark:border-neutral-850/80 cursor-text transition-all leading-relaxed whitespace-pre-wrap font-semibold"
                  >
                    {description || <span className="text-neutral-400 italic font-normal">Add descriptive notes, key requirements or guidelines...</span>}
                  </div>
                )}
              </div>

              {/* Subtasks checklist area */}
              <div className="bg-neutral-50/20 dark:bg-neutral-850/10 border border-neutral-150 dark:border-neutral-850/80 rounded-2xl p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Subtask Items</h3>
                  </div>
                  {totalSubtasksCount > 0 && (
                    <span className="text-[10px] font-black text-neutral-450 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800/80 px-2 py-0.5 rounded-full">
                      {completedSubtasksCount} of {totalSubtasksCount} done
                    </span>
                  )}
                </div>

                {/* Subtask Progress indicator */}
                {totalSubtasksCount > 0 && (
                  <div className="space-y-1">
                    <div className="w-full bg-neutral-200/70 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-500 ease-out shadow-xs" 
                        style={{ width: `${subtaskProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Subtask items card stack */}
                {subtasks.length > 0 ? (
                  <div className="space-y-2">
                    {subtasks.map((sub) => (
                      <div 
                        key={sub.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-150/40 dark:border-neutral-800/40 hover:border-neutral-250 dark:hover:border-neutral-700 hover:shadow-xs transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={() => handleToggleSubtaskStatus(sub)}
                            className={cn(
                              "h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-2xs",
                              sub.status === 'done' 
                                ? "bg-primary border-primary text-white" 
                                : "border-neutral-350 dark:border-neutral-700 hover:border-primary bg-transparent"
                            )}
                          >
                            {sub.status === 'done' && <Check className="w-2.5 h-2.5 stroke-[3.5]" />}
                          </button>

                          <span 
                            onClick={() => setSearchParams({ task: sub.id })}
                            className={cn(
                              "text-xs font-semibold cursor-pointer hover:text-primary transition-all truncate",
                              sub.status === 'done' ? "text-neutral-400 dark:text-neutral-500 line-through" : "text-neutral-800 dark:text-neutral-250"
                            )}
                          >
                            {sub.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {sub.assigneeIds.slice(0, 1).map((uid) => (
                            <div 
                              key={uid} 
                              className="h-5.5 w-5.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[8px] font-bold text-primary shrink-0 overflow-hidden shadow-2xs"
                              title={getMemberName(uid)}
                            >
                              {getMemberPhotoURL(uid) ? (
                                <img src={getMemberPhotoURL(uid)} alt={getMemberName(uid)} className="h-full w-full object-cover" />
                              ) : (
                                getMemberInitials(uid)
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => handleDeleteSubtask(sub.id)}
                            className="p-1 rounded text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-850 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-550 italic text-center py-2">
                    No checklist subtasks. Break this task into smaller steps.
                  </p>
                )}

                {/* Subtask inline creation input */}
                <form onSubmit={handleAddSubtaskSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a subtask step..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 outline-none hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-primary/50 transition-all font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={!newSubtaskTitle.trim() || isAddingSubtask}
                    className="px-3.5 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-xs font-bold hover:bg-neutral-850 dark:hover:bg-neutral-100 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  >
                    {isAddingSubtask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
                  </button>
                </form>
              </div>

              {/* Attachments Section */}
              <div>
                <AttachmentSection
                  entityType="tasks"
                  entityId={task.id}
                  files={task.files}
                  onAttachmentsChanged={async (updatedFiles) => {
                    try {
                      await updateTaskAttachments(task.id, updatedFiles);
                    } catch (err) {
                      console.error("Failed to update task attachments:", err);
                    }
                  }}
                />
              </div>

              {/* Discussion & Activity Timelines */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col flex-grow min-h-[320px]">
                <div className="flex border-b border-neutral-150 dark:border-neutral-850/60 mb-4 flex-shrink-0 relative">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={cn(
                      "pb-2 px-4 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 relative z-10",
                      activeTab === 'comments'
                        ? "text-neutral-900 dark:text-neutral-100 font-black"
                        : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 font-semibold"
                    )}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Comments ({comments.length})</span>
                    {activeTab === 'comments' && (
                      <motion.div 
                        layoutId="activeTabUnderline" 
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" 
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={cn(
                      "pb-2 px-4 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 relative z-10",
                      activeTab === 'activity'
                        ? "text-neutral-900 dark:text-neutral-100 font-black"
                        : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 font-semibold"
                    )}
                  >
                    <ListTodo className="w-4 h-4" />
                    <span>Activity Log ({activities.length})</span>
                    {activeTab === 'activity' && (
                      <motion.div 
                        layoutId="activeTabUnderline" 
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" 
                      />
                    )}
                  </button>
                </div>

                {/* Switchable Thread Panels */}
                <div className="flex-grow flex flex-col overflow-hidden min-h-[220px]">
                  {activeTab === 'comments' ? (
                    <div className="flex flex-col h-full overflow-hidden justify-between">
                      
                      {/* Comments view container */}
                      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin max-h-[250px]">
                        {comments.length > 0 ? (
                          comments.map((comment) => (
                            <div key={comment.id} className="flex items-start gap-3 bg-neutral-50/30 dark:bg-neutral-850/10 p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-850/50 hover:shadow-2xs transition-all">
                              <div className="h-7.5 w-7.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 overflow-hidden shadow-xs">
                                {getMemberPhotoURL(comment.authorId) ? (
                                  <img src={getMemberPhotoURL(comment.authorId)} alt={comment.authorName} className="h-full w-full object-cover" />
                                ) : (
                                  getMemberInitials(comment.authorId)
                                )}
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 truncate">
                                    {comment.authorName}
                                  </span>
                                  <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-mono">
                                    {formatTimestamp(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-650 dark:text-neutral-300 font-semibold leading-relaxed break-words whitespace-pre-wrap">
                                  {comment.body}
                                </p>
                                
                                {comment.files && comment.files.length > 0 && (
                                  <div className="mt-2 space-y-1.5 max-w-sm">
                                    {comment.files.map((file, fIdx) => (
                                      <a
                                        key={fIdx}
                                        href={file.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 p-1.5 rounded-xl border border-neutral-200/40 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 text-[10px] text-primary font-bold truncate transition-colors shadow-2xs"
                                      >
                                        <Paperclip className="w-3 h-3 text-primary shrink-0" />
                                        <span className="truncate flex-1">{file.name}</span>
                                        <span className="text-[8px] text-neutral-400 font-semibold shrink-0">
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
                          <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-550 italic">
                            No team comments on this task yet. Add yours below.
                          </div>
                        )}
                      </div>

                      {/* Comment inputs stack */}
                      <div className="border-t border-neutral-150 dark:border-neutral-850/60 pt-3.5 flex-shrink-0 flex flex-col gap-2">
                        <AttachmentInput
                          selectedFiles={commentFiles}
                          onRemove={(idx) => setCommentFiles(prev => prev.filter((_, i) => i !== idx))}
                          onAdd={(files) => setCommentFiles(prev => [...prev, ...Array.from(files)])}
                        />
                        <form onSubmit={handleAddComment} className="flex gap-2">
                          <input
                            type="text"
                            placeholder={uploadingCommentFiles ? "Uploading attachments..." : "Add a team comment here..."}
                            value={commentBody}
                            disabled={uploadingCommentFiles}
                            onChange={(e) => setCommentBody(e.target.value)}
                            className="flex-1 bg-neutral-50/70 dark:bg-neutral-850/20 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 outline-none hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-primary/50 transition-all font-semibold disabled:opacity-50"
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
                            className="p-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200/60 dark:border-neutral-800 rounded-xl text-neutral-500 dark:text-neutral-450 hover:text-neutral-800 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shadow-2xs"
                            title="Attach Files"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <button
                            type="submit"
                            disabled={uploadingCommentFiles}
                            className="p-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200/60 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-350 hover:text-neutral-850 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shadow-2xs"
                          >
                            {uploadingCommentFiles ? (
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin max-h-[320px] pt-1">
                      {activities.length > 0 ? (
                        activities.map((act) => (
                          <div 
                            key={act.id} 
                            className="flex items-start gap-4 pb-5 border-l border-neutral-100 dark:border-neutral-800 ml-4.5 pl-6 relative last:border-0"
                          >
                            <div className={cn(
                              "absolute -left-[14.5px] top-0 h-7 w-7 rounded-full border flex items-center justify-center shadow-xs shrink-0 bg-white dark:bg-neutral-900 z-10",
                              getActivityColor(act.type)
                            )}>
                              {getActivityIcon(act.type)}
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-250 truncate">
                                  {act.actorName}
                                </span>
                                <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-mono shrink-0">
                                  {formatTimestamp(act.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold leading-relaxed break-words">
                                {renderActivityDetail(act)}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-550 italic">
                          No audit activities registered yet.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Parameters Dashboard Column */}
            <div className="w-full md:w-64 flex-shrink-0 bg-neutral-50/20 dark:bg-neutral-900/10 p-6 space-y-5.5 flex flex-col overflow-y-auto scrollbar-thin border-t md:border-t-0 border-neutral-100 dark:border-neutral-850/60">
              
              {/* Status block with custom selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Workflow Status
                </label>
                <CustomDropdown
                  value={task.status}
                  onChange={handleStatusChange}
                  options={STATUSES}
                  renderTrigger={renderStatusTrigger}
                  renderOption={renderStatusOption}
                />
              </div>

              {/* Priority block with custom selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Task Urgency
                </label>
                <CustomDropdown
                  value={task.priority}
                  onChange={handlePriorityChange}
                  options={['none', 'low', 'medium', 'high', 'urgent']}
                  renderTrigger={renderPriorityTrigger}
                  renderOption={renderPriorityOption}
                />
              </div>

              {/* Assignees Collaborators block */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Team Assignees
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin pr-1">
                  {members.filter(m => m.uid !== actor.uid).map((m) => {
                    const isAssigned = task.assigneeIds.includes(m.uid);
                    return (
                      <button
                        key={m.uid}
                        onClick={() => handleAssigneeChange(m.uid)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-xl px-3 py-2 text-left border transition-all cursor-pointer shadow-2xs",
                          isAssigned
                            ? "bg-primary/[0.04] border-primary/25 text-primary dark:text-white"
                            : "bg-white dark:bg-neutral-900 border-neutral-200/50 dark:border-neutral-800/60 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-250 hover:bg-neutral-50/50"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-5.5 w-5.5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-extrabold text-primary shrink-0 overflow-hidden border border-primary/10">
                            {m.photoURL ? (
                              <img src={m.photoURL} alt={m.fullName} className="h-full w-full object-cover" />
                            ) : (
                              getMemberInitials(m.uid)
                            )}
                          </div>
                          <span className="text-[11px] font-semibold truncate">
                            {m.fullName || m.username}
                          </span>
                        </div>
                        {isAssigned && <Check className="w-3.5 h-3.5 text-primary shrink-0 stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Due Date picker block */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1 px-0.5">
                  <Calendar className="w-3 h-3 text-primary" />
                  <span>Schedule Due Date</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={getDueDateString()}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-neutral-850 dark:text-neutral-200 outline-none cursor-pointer focus:border-primary/50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all font-mono font-bold shadow-2xs"
                  />
                </div>
              </div>

              {/* Context connections info tags */}
              <div className="space-y-3.5 pt-4.5 border-t border-neutral-150 dark:border-neutral-850/60">
                {currentProject && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block px-0.5">Project Scope</span>
                    <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-500/[0.04] px-2 py-1.5 border border-indigo-500/10 rounded-xl block truncate shadow-2xs">
                      {currentProject.name}
                    </span>
                  </div>
                )}

                {currentGoal && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block px-0.5">Focus Goal Link</span>
                    <span className="text-[11px] font-bold text-cyan-500 dark:text-cyan-400 bg-cyan-500/[0.04] px-2 py-1.5 border border-cyan-500/10 rounded-xl block truncate shadow-2xs">
                      {currentGoal.title}
                    </span>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Warning bottom feedback Toast */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="absolute bottom-6 right-6 z-[100] flex items-center gap-2.5 bg-neutral-950/95 dark:bg-white/95 text-white dark:text-neutral-950 border border-white/10 dark:border-neutral-200/50 px-4.5 py-3 rounded-2xl shadow-2xl backdrop-blur-md max-w-sm select-none"
              >
                <AlertCircle className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                <span className="text-xs font-bold leading-tight">{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Local Custom Dropdown Component
interface CustomDropdownProps<T extends string> {
  value: T;
  onChange: (val: T) => void;
  options: readonly T[] | T[];
  renderTrigger: (val: T) => React.ReactNode;
  renderOption: (val: T, isSelected: boolean) => React.ReactNode;
  className?: string;
}

function CustomDropdown<T extends string>({
  value,
  onChange,
  options,
  renderTrigger,
  renderOption,
  className
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left focus:outline-none cursor-pointer"
      >
        {renderTrigger(value)}
      </button>
      {isOpen && (
        <div className="absolute z-30 w-full mt-1 bg-white dark:bg-neutral-850 border border-neutral-200/70 dark:border-neutral-800 rounded-xl shadow-xl py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className="w-full text-left cursor-pointer"
            >
              {renderOption(opt, opt === value)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
