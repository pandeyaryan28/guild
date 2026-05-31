import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { 
  X, Check, Calendar, User, Tag, 
  Trash2, Send, Clock, AlertCircle, Play, 
  ChevronRight, Sparkles, MessageSquare, ListTodo,
  Paperclip, Loader2, ListChecks, CheckCircle2, UserPlus, HelpCircle
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
}

export function TaskDetailDrawer({
  task,
  onClose,
  orgId,
  actor,
  members,
  projects,
  goals
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
        assigneeIds: [actor.uid],
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end overflow-hidden select-none pointer-events-none">
        
        {/* Backdrop overlay with elegant blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/20 dark:bg-neutral-950/50 backdrop-blur-xs z-40 pointer-events-auto"
        />

        {/* Drawer panel with premium spacing, glassmorphic touches, and shadow */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 35 }}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col h-full pointer-events-auto"
        >
          
          {/* Premium Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-850 flex-shrink-0 bg-neutral-50/50 dark:bg-neutral-900/50 backdrop-blur">
            <div className="min-w-0 flex-1 mr-4">
              {parentTask ? (
                // Beautiful breadcrumbs showing hierarchy
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 font-semibold mb-0.5 truncate">
                  <span 
                    onClick={() => setSearchParams({ task: parentTask.id })}
                    className="hover:text-primary cursor-pointer transition-colors max-w-[200px] truncate block"
                  >
                    {parentTask.title}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-350 dark:text-neutral-700 shrink-0" />
                  <span className="text-neutral-500 dark:text-neutral-400 font-bold max-w-[200px] truncate block">
                    Current task
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest font-black text-neutral-400 dark:text-neutral-500">
                    Task Parameters
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-850 text-neutral-500 hover:text-neutral-850 dark:hover:text-neutral-200 transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Two-Column Split Layout */}
          <div className="flex-grow flex flex-col md:flex-row overflow-hidden min-h-0">
            
            {/* Left Column: Title, Description, Subtasks, Activity */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-neutral-100 dark:border-neutral-850 overflow-y-auto scrollbar-thin p-6 space-y-6">
              
              {/* Creator/Assigner Review & Approval Banner */}
              {task.status === 'review' && task.creatorId === actor.uid && (
                <div className="bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border border-amber-500/25 rounded-2xl p-4.5 space-y-3.5 relative overflow-hidden shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 shadow-xs">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-500">
                        Review Approval Request
                      </h4>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-350 leading-relaxed font-semibold">
                        This task has been submitted for review. Please inspect the revisions and approve it, or send it back with comments.
                      </p>
                    </div>
                  </div>

                  {!isSendBackOpen ? (
                    <div className="flex items-center gap-3.5 pt-1.5 border-t border-amber-500/10">
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
                          setToastMessage("Task sent back with revisions requested.");
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

              {/* Title Field with satisfy focus */}
              <div className="space-y-1">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                    autoFocus
                    className="w-full text-lg font-bold text-neutral-850 dark:text-neutral-100 outline-none border-b-2 border-primary/50 bg-transparent pb-1 transition-all"
                  />
                ) : (
                  <h2
                    onClick={() => setIsEditingTitle(true)}
                    className="text-lg font-bold text-neutral-850 dark:text-neutral-100 cursor-text hover:bg-neutral-50 dark:hover:bg-neutral-850/30 px-2 py-1 rounded-xl border border-transparent hover:border-neutral-200/20 transition-all break-words leading-tight"
                  >
                    {title || <span className="text-neutral-400 italic font-normal">Untitled Task</span>}
                  </h2>
                )}
              </div>

              {/* Description box */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500 px-1">
                  Details
                </label>
                {isEditingDesc ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescBlur}
                    rows={4}
                    autoFocus
                    placeholder="Provide expectation details, notes or guidelines..."
                    className="w-full bg-neutral-50 dark:bg-neutral-850/30 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 py-3.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:border-primary/50 font-semibold resize-none transition-all"
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className="min-h-16 text-xs text-neutral-650 dark:text-neutral-350 hover:bg-neutral-50 dark:hover:bg-neutral-850/20 px-4 py-3.5 rounded-2xl border border-neutral-150 dark:border-neutral-850 cursor-text transition-all leading-relaxed whitespace-pre-wrap font-semibold"
                  >
                    {description || <span className="text-neutral-400 italic font-normal">Add descriptive notes or requirements...</span>}
                  </div>
                )}
              </div>

              {/* Inline Subtasks Card (Premium addition) */}
              <div className="bg-neutral-50/50 dark:bg-neutral-850/15 border border-neutral-150 dark:border-neutral-850 rounded-2xl p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-neutral-850 dark:text-neutral-200">Subtasks</h3>
                  </div>
                  {totalSubtasksCount > 0 && (
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                      {completedSubtasksCount} of {totalSubtasksCount} done
                    </span>
                  )}
                </div>

                {/* Subtasks Progress Bar */}
                {totalSubtasksCount > 0 && (
                  <div className="space-y-1">
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${subtaskProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Subtask list */}
                {subtasks.length > 0 ? (
                  <div className="space-y-2">
                    {subtasks.map((sub) => (
                      <div 
                        key={sub.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-150/40 dark:border-neutral-800/40 hover:border-neutral-250 dark:hover:border-neutral-700 transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Animated Checkbox status toggle */}
                          <button
                            onClick={() => handleToggleSubtaskStatus(sub)}
                            className={cn(
                              "h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                              sub.status === 'done' 
                                ? "bg-primary border-primary text-white" 
                                : "border-neutral-300 dark:border-neutral-700 hover:border-primary bg-transparent"
                            )}
                          >
                            {sub.status === 'done' && <Check className="w-2.5 h-2.5 stroke-[3.5]" />}
                          </button>

                          {/* Click subtask title to switch context */}
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

                        {/* Assignee initials and delete buttons on right */}
                        <div className="flex items-center gap-2 shrink-0">
                          {sub.assigneeIds.slice(0, 1).map((uid) => (
                            <div 
                              key={uid} 
                              className="h-5.5 w-5.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[8px] font-bold text-primary shrink-0 overflow-hidden"
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
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 italic text-center py-2">
                    No subtasks added yet. Break task into smaller chunks.
                  </p>
                )}

                {/* Quick-Add Subtask Form */}
                <form onSubmit={handleAddSubtaskSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a subtask..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 outline-none hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-primary/50 transition-all font-semibold"
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

              {/* Task Media & Attachments */}
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

              {/* Tabbed Feed: Comments vs. Premium Activity Log */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col flex-grow min-h-[320px]">
                <div className="flex border-b border-neutral-150 dark:border-neutral-850 mb-4 flex-shrink-0">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={cn(
                      "pb-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                      activeTab === 'comments'
                        ? "border-primary text-neutral-850 dark:text-neutral-200 font-extrabold"
                        : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    )}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Comments ({comments.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={cn(
                      "pb-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                      activeTab === 'activity'
                        ? "border-primary text-neutral-850 dark:text-neutral-200 font-extrabold"
                        : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    )}
                  >
                    <ListTodo className="w-4 h-4" />
                    <span>Activity Log ({activities.length})</span>
                  </button>
                </div>

                {/* Tab content viewports */}
                <div className="flex-grow flex flex-col overflow-hidden min-h-[220px]">
                  {activeTab === 'comments' ? (
                    <div className="flex flex-col h-full overflow-hidden justify-between">
                      {/* Comments Thread */}
                      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin max-h-[250px]">
                        {comments.length > 0 ? (
                          comments.map((comment) => (
                            <div key={comment.id} className="flex items-start gap-3 bg-neutral-50/30 dark:bg-neutral-850/10 p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-850/50">
                              <div className="h-7.5 w-7.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 overflow-hidden shadow-sm">
                                {getMemberPhotoURL(comment.authorId) ? (
                                  <img src={getMemberPhotoURL(comment.authorId)} alt={comment.authorName} className="h-full w-full object-cover" />
                                ) : (
                                  getMemberInitials(comment.authorId)
                                )}
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-neutral-850 dark:text-neutral-200 truncate">
                                    {comment.authorName}
                                  </span>
                                  <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-mono">
                                    {formatTimestamp(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-650 dark:text-neutral-350 font-semibold leading-relaxed break-words">
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
                                        className="flex items-center gap-2 p-1.5 rounded-lg border border-neutral-200/40 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 text-[10px] text-primary font-bold truncate transition-colors shadow-xs"
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
                          <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-500 italic">
                            No team comments on this task yet. Add yours below.
                          </div>
                        )}
                      </div>

                      {/* Comment Input Section */}
                      <div className="border-t border-neutral-150 dark:border-neutral-850 pt-3.5 flex-shrink-0 flex flex-col gap-2">
                        <AttachmentInput
                          selectedFiles={commentFiles}
                          onRemove={(idx) => setCommentFiles(prev => prev.filter((_, i) => i !== idx))}
                          onAdd={(files) => setCommentFiles(prev => [...prev, ...Array.from(files)])}
                        />
                        <form onSubmit={handleAddComment} className="flex gap-2">
                          <input
                            type="text"
                            placeholder={uploadingCommentFiles ? "Uploading attachment files..." : "Add your comment here..."}
                            value={commentBody}
                            disabled={uploadingCommentFiles}
                            onChange={(e) => setCommentBody(e.target.value)}
                            className="flex-1 bg-neutral-50 dark:bg-neutral-850/30 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 outline-none hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-primary/50 transition-all font-semibold disabled:opacity-50"
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
                            className="p-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200/60 dark:border-neutral-800 rounded-xl text-neutral-500 dark:text-neutral-450 hover:text-neutral-800 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                            title="Attach File"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <button
                            type="submit"
                            disabled={uploadingCommentFiles}
                            className="p-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200/60 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-350 hover:text-neutral-850 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
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
                    // Upgraded Rich Timeline Activity Log
                    <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin max-h-[320px] pt-1">
                      {activities.length > 0 ? (
                        activities.map((act) => (
                          <div 
                            key={act.id} 
                            className="flex items-start gap-4 pb-5 border-l-2 border-neutral-100 dark:border-neutral-800 ml-4.5 pl-6 relative last:border-0"
                          >
                            {/* Visual background coded indicator */}
                            <div className={cn(
                              "absolute -left-[15px] top-0 h-7 w-7 rounded-full border flex items-center justify-center shadow-xs shrink-0 bg-white dark:bg-neutral-900",
                              getActivityColor(act.type)
                            )}>
                              {getActivityIcon(act.type)}
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-neutral-850 dark:text-neutral-200 truncate">
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
                        <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-500 italic">
                          No audit activities registered yet.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Parameters Dashboard */}
            <div className="w-full md:w-64 flex-shrink-0 bg-neutral-50/50 dark:bg-neutral-850/10 p-6 space-y-6 flex flex-col overflow-y-auto scrollbar-thin">
              
              {/* Parameter Block: Status */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Status
                </label>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-850 dark:text-neutral-200 outline-none cursor-pointer focus:border-primary/50 transition-all font-bold"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>

              {/* Parameter Block: Priority */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Priority
                </label>
                <select
                  value={task.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-850 dark:text-neutral-200 outline-none cursor-pointer focus:border-primary/50 transition-all font-bold"
                >
                  <option value="none">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Parameter Block: Assignee Selector list */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Assignees
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin pr-1">
                  {members.map((m) => {
                    const isAssigned = task.assigneeIds.includes(m.uid);
                    return (
                      <button
                        key={m.uid}
                        onClick={() => handleAssigneeChange(m.uid)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-xl px-3 py-2 text-left border transition-all cursor-pointer",
                          isAssigned
                            ? "bg-primary/[0.06] border-primary/25 text-neutral-850 dark:text-white"
                            : "bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-850 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-50/50"
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

              {/* Parameter Block: Due Date */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1 px-0.5">
                  <Calendar className="w-3 h-3 text-primary" />
                  <span>Due Date</span>
                </label>
                <input
                  type="date"
                  value={getDueDateString()}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-850 dark:text-neutral-200 outline-none cursor-pointer focus:border-primary/50 transition-all font-mono font-semibold"
                />
              </div>

              {/* Connected contextual metadata references */}
              <div className="space-y-3.5 pt-4.5 border-t border-neutral-150 dark:border-neutral-850">
                {currentProject && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Project Context</span>
                    <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-500/5 px-2 py-1 border border-indigo-500/10 rounded-xl block truncate">
                      {currentProject.name}
                    </span>
                  </div>
                )}

                {currentGoal && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Focus Goal</span>
                    <span className="text-[11px] font-bold text-cyan-500 dark:text-cyan-400 bg-cyan-500/5 px-2 py-1 border border-cyan-500/10 rounded-xl block truncate">
                      {currentGoal.title}
                    </span>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* ─── Floating Warning Toast for Drawer ─── */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="absolute bottom-6 right-6 z-[100] flex items-center gap-2.5 bg-neutral-900/95 dark:bg-white/95 text-white dark:text-neutral-900 border border-white/10 dark:border-neutral-200/50 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur max-w-sm select-none"
              >
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-bold leading-tight">{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
