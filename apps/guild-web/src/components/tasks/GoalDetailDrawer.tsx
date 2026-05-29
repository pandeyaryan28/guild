import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, Calendar, User, Tag, 
  Trash2, Plus, Target, ChevronRight,
  ListTodo, Loader2, Link2, Sparkles, MessageSquare, Send, Paperclip
} from 'lucide-react';
import { updateGoal, addGoalComment, updateGoalAttachments, type Goal, type GoalStatus } from '../../lib/goals';

type GoalHorizon = 'short_term' | 'long_term';
import { 
  createTask, moveTask, deleteTask, 
  STATUS_CONFIG, STATUSES, type Task, type TaskStatus, type ActorInfo 
} from '../../lib/tasks';
import { useGoalComments } from '../../hooks/useGoals';
import { AttachmentSection } from './AttachmentSection';
import { AttachmentInput } from './AttachmentInput';
import { type MessageAttachment } from '@guild/types';
import { uploadEntityAttachment } from '../../lib/storage';
import { cn } from '@/lib/utils';

interface GoalDetailDrawerProps {
  goal: Goal | null;
  onClose: () => void;
  orgId: string;
  actor: ActorInfo;
  members: any[];
  projects: any[];
  tasks: Task[];
  onSelectTask?: (task: Task) => void;
}

export function GoalDetailDrawer({
  goal,
  onClose,
  orgId,
  actor,
  members,
  projects,
  tasks,
  onSelectTask
}: GoalDetailDrawerProps) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [isEditingDesc, setIsEditingDesc] = React.useState(false);
  const [inlineTaskTitle, setInlineTaskTitle] = React.useState('');
  const [showCompletedTasks, setShowCompletedTasks] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'tasks' | 'comments'>('tasks');
  const [commentBody, setCommentBody] = React.useState('');
  const [commentFiles, setCommentFiles] = React.useState<File[]>([]);
  const [uploadingCommentFiles, setUploadingCommentFiles] = React.useState(false);

  const comments = useGoalComments(goal?.id || null);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim() && commentFiles.length === 0) return;
    setUploadingCommentFiles(true);
    try {
      let uploaded: MessageAttachment[] = [];
      if (commentFiles.length > 0) {
        uploaded = await Promise.all(
          commentFiles.map(file => uploadEntityAttachment('comments', goal.id, file))
        );
      }
      
      await addGoalComment({
        goalId: goal.id,
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
      console.error('Failed to add comment:', err);
    } finally {
      setUploadingCommentFiles(false);
    }
  };

  React.useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setDescription(goal.description || '');
    }
  }, [goal]);

  if (!goal) return null;

  const currentProject = projects.find(p => p.id === goal.projectId);
  const goalTasks = tasks.filter(t => t.goalId === goal.id);
  const activeTasks = goalTasks.filter(t => t.status !== 'done');
  const completedTasks = goalTasks.filter(t => t.status === 'done');
  const progress = goal.progressRollup ?? 0;

  const handleTitleBlur = async () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== goal.title) {
      try {
        await updateGoal(goal.id, { title: title.trim() });
      } catch (err) {
        console.error('Failed to update title:', err);
        setTitle(goal.title);
      }
    }
  };

  const handleDescBlur = async () => {
    setIsEditingDesc(false);
    if (description !== goal.description) {
      try {
        await updateGoal(goal.id, { description });
      } catch (err) {
        console.error('Failed to update description:', err);
        setDescription(goal.description || '');
      }
    }
  };

  const handleHorizonChange = async (horizon: GoalHorizon) => {
    try {
      await updateGoal(goal.id, { horizon });
    } catch (err) {
      console.error('Failed to update horizon:', err);
    }
  };

  const handleProjectChange = async (projectId: string) => {
    try {
      await updateGoal(goal.id, { projectId: projectId || null });
    } catch (err) {
      console.error('Failed to update project mapping:', err);
    }
  };

  const handleOwnerChange = async (ownerId: string) => {
    try {
      await updateGoal(goal.id, { ownerId });
    } catch (err) {
      console.error('Failed to update owner:', err);
    }
  };

  const handleTargetDateChange = async (dateStr: string) => {
    try {
      await updateGoal(goal.id, { targetDate: dateStr ? new Date(dateStr) as any : null });
    } catch (err) {
      console.error('Failed to update target date:', err);
    }
  };

  const handleToggleGoalStatus = async () => {
    const nextStatus: GoalStatus = goal.status === 'completed' ? 'active' : 'completed';
    try {
      await updateGoal(goal.id, { status: nextStatus });
    } catch (err) {
      console.error('Failed to toggle goal status:', err);
    }
  };

  const handleToggleTaskStatus = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const oldStatus = task.status;
    const newStatus: TaskStatus = oldStatus === 'done' ? 'todo' : 'done';
    try {
      await moveTask(task.id, orgId, newStatus, task.orderIndex || 1000, oldStatus, actor);
    } catch (err) {
      console.error('Failed to toggle task status:', err);
    }
  };

  const handleInlineTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineTaskTitle.trim()) return;
    try {
      await createTask({
        orgId,
        title: inlineTaskTitle.trim(),
        description: '',
        priority: 'none',
        projectId: goal.projectId || null,
        goalId: goal.id,
        assigneeIds: [actor.uid],
        dueDate: null,
        actor
      });
      setInlineTaskTitle('');
    } catch (err) {
      console.error('Failed to create inline task:', err);
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

  const getMemberInitials = (uid: string) => {
    const m = members.find(mem => mem.uid === uid);
    if (!m) return '?';
    return m.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getMemberPhotoURL = (uid: string) => {
    const m = members.find(mem => mem.uid === uid);
    return m?.photoURL || '';
  };

  const getTargetDateString = () => {
    if (!goal.targetDate) return '';
    const date = typeof goal.targetDate.toDate === 'function' ? goal.targetDate.toDate() : new Date((goal.targetDate as any).seconds * 1000);
    return date.toISOString().split('T')[0];
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '';
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts.seconds * 1000);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end overflow-hidden select-none pointer-events-none">
        
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/20 dark:bg-neutral-950/40 backdrop-blur-xs z-40 pointer-events-auto"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 35 }}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col h-full pointer-events-auto"
        >
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-black text-neutral-400 dark:text-neutral-500">
                Strategic Goal Detail
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all active:scale-95 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Core split panel */}
          <div className="flex-grow flex flex-col md:flex-row overflow-hidden min-h-0">
            
            {/* Left side: Title, Description, Tasks checklist */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-neutral-100 dark:border-neutral-800 overflow-y-auto aether-scroll p-6 space-y-6">
              
              {/* Strategic Goal Title */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleGoalStatus}
                    className={cn(
                      "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                      goal.status === 'completed'
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                        : "border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 hover:border-cyan-500"
                    )}
                  >
                    {goal.status === 'completed' ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-transparent hover:bg-cyan-500/50" />
                    )}
                  </button>

                  {isEditingTitle ? (
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={handleTitleBlur}
                      onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                      autoFocus
                      className="w-full text-base font-bold text-neutral-850 dark:text-neutral-100 outline-none border-b border-accent/40 bg-transparent pb-1"
                    />
                  ) : (
                    <h2
                      onClick={() => setIsEditingTitle(true)}
                      className={cn(
                        "text-base font-bold cursor-text hover:bg-neutral-50 dark:hover:bg-neutral-850/30 px-1 py-0.5 rounded transition-colors break-words flex-1 min-w-0",
                        goal.status === 'completed' ? "text-neutral-400 dark:text-neutral-550 line-through decoration-cyan-500/50" : "text-neutral-850 dark:text-neutral-100"
                      )}
                    >
                      {title || <span className="text-neutral-400 italic">Untitled Goal Focus</span>}
                    </h2>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500">
                  Responsibility Definition
                </label>
                {isEditingDesc ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescBlur}
                    rows={4}
                    autoFocus
                    placeholder="Describe expected results and chronological outcomes..."
                    className="w-full bg-neutral-50 dark:bg-neutral-850/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-xs text-neutral-800 dark:text-neutral-250 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:border-accent/40 font-semibold resize-none"
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className="min-h-16 text-xs text-neutral-650 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-850/30 px-3 py-2.5 rounded-xl border border-neutral-100 dark:border-neutral-850 cursor-text transition-colors leading-relaxed whitespace-pre-wrap font-semibold"
                  >
                    {description || <span className="text-neutral-400 italic">Add expected high-level outcome notes...</span>}
                  </div>
                )}
              </div>

              {/* Goal Media & Files */}
              <div className="pt-2">
                <AttachmentSection
                  entityType="goals"
                  entityId={goal.id}
                  files={goal.files}
                  onAttachmentsChanged={async (updatedFiles) => {
                    try {
                      await updateGoalAttachments(goal.id, updatedFiles);
                    } catch (err) {
                      console.error("Failed to update goal attachments:", err);
                    }
                  }}
                />
              </div>

              {/* Tabs for Feed: Checklist vs Discussion */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col flex-grow min-h-[300px]">
                <div className="flex border-b border-neutral-100 dark:border-neutral-800 mb-4 flex-shrink-0">
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={cn(
                      "pb-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                      activeTab === 'tasks'
                        ? "border-accent text-neutral-800 dark:text-neutral-200"
                        : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    )}
                  >
                    <ListTodo className="w-3.5 h-3.5" />
                    <span>Checklist ({activeTasks.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={cn(
                      "pb-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                      activeTab === 'comments'
                        ? "border-accent text-neutral-800 dark:text-neutral-200"
                        : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Discussion ({comments.length})</span>
                  </button>
                </div>

                <div className="flex-grow flex flex-col overflow-hidden min-h-[220px]">
                  {activeTab === 'tasks' ? (
                    <div className="space-y-4">
                      {/* Inline task adder inside drawer */}
                      <form onSubmit={handleInlineTaskSubmit} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add dynamic task to checklist..."
                          value={inlineTaskTitle}
                          onChange={(e) => setInlineTaskTitle(e.target.value)}
                          className="flex-1 bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-850 dark:text-neutral-200 placeholder:text-neutral-400 outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:border-accent/40 shadow-inner font-semibold"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-2.5 bg-neutral-100 dark:bg-neutral-850 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all cursor-pointer shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </form>

                      {/* Checklist lists */}
                      <div className="space-y-2 max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
                        {/* Active checklist */}
                        {activeTasks.length > 0 ? (
                          activeTasks.map(task => (
                            <div
                              key={task.id}
                              onClick={() => onSelectTask?.(task)}
                              className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/40 dark:bg-neutral-850/10 hover:bg-neutral-50 dark:hover:bg-neutral-850/30 border border-neutral-100 dark:border-neutral-850/50 hover:border-accent/30 transition-all cursor-pointer group shadow-sm"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  onClick={(e) => handleToggleTaskStatus(e, task)}
                                  className="h-4.5 w-4.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center shrink-0 transition-colors cursor-pointer hover:border-accent"
                                >
                                  <div className="h-1.5 w-1.5 rounded-full bg-transparent" />
                                </div>
                                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                                  {task.title}
                                </span>
                              </div>
                              <button
                                onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                className="text-neutral-400 hover:text-red-400 p-0.5 cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="py-6 text-center text-xs text-neutral-400 italic bg-neutral-50/20 dark:bg-neutral-850/5 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                            No active tasks in checklist.
                          </div>
                        )}

                        {/* Completed tasks accordion */}
                        {completedTasks.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <button
                              onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                              className="w-full flex items-center justify-between p-2 rounded-xl bg-neutral-100/50 dark:bg-neutral-850/30 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-800/40 text-[10px] text-neutral-500 font-bold transition-all cursor-pointer"
                            >
                              <span>Completed Tasks ({completedTasks.length})</span>
                              <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showCompletedTasks ? "rotate-90" : "")} />
                            </button>
                            <AnimatePresence>
                              {showCompletedTasks && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden space-y-2"
                                >
                                  {completedTasks.map(task => (
                                    <div
                                      key={task.id}
                                      onClick={() => onSelectTask?.(task)}
                                      className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/20 dark:bg-neutral-850/5 border border-neutral-100/60 dark:border-neutral-850/30 opacity-60 hover:opacity-90 transition-all cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                          onClick={(e) => handleToggleTaskStatus(e, task)}
                                          className="h-4.5 w-4.5 rounded-full border border-cyan-500 bg-cyan-500/10 flex items-center justify-center shrink-0 cursor-pointer"
                                        >
                                          <Check className="w-2.5 h-2.5 text-cyan-500" />
                                        </div>
                                        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-455 line-through truncate">
                                          {task.title}
                                        </span>
                                      </div>
                                      <button
                                        onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                        className="text-neutral-400 hover:text-red-400 p-0.5 cursor-pointer"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Discussions / Comments view
                    <div className="flex flex-col h-full overflow-hidden justify-between">
                      {/* Comments Thread */}
                      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin max-h-[240px]">
                        {comments.length > 0 ? (
                          comments.map((comment) => (
                            <div key={comment.id} className="flex items-start gap-3 bg-neutral-50/50 dark:bg-neutral-850/15 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-850 animate-fluid-pop">
                              {getMemberPhotoURL(comment.authorId) ? (
                                <img
                                  src={getMemberPhotoURL(comment.authorId)}
                                  alt={comment.authorName}
                                  className="h-7 w-7 rounded-full object-cover shrink-0 border border-white/10 dark:border-black/20"
                                />
                              ) : (
                                <div className="h-7 w-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] font-bold text-accent shrink-0">
                                  {getMemberInitials(comment.authorId)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-255 truncate">
                                    {comment.authorName}
                                  </span>
                                  <span className="text-[9px] text-neutral-400 font-mono">
                                    {formatTimestamp(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold leading-relaxed break-words">
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
                                        className="flex items-center gap-2 p-1.5 rounded-lg border border-neutral-200/40 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[10px] text-accent font-bold truncate transition-colors"
                                      >
                                        <Paperclip className="w-3 h-3 text-accent shrink-0" />
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
                          <div className="py-8 text-center text-xs text-neutral-400 italic">
                            No updates or discussions on this goal yet.
                          </div>
                        )}
                      </div>

                      {/* Comment Input */}
                      <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 flex-shrink-0 flex flex-col gap-2">
                        <AttachmentInput
                          selectedFiles={commentFiles}
                          onRemove={(idx) => setCommentFiles(prev => prev.filter((_, i) => i !== idx))}
                          onAdd={(files) => setCommentFiles(prev => [...prev, ...Array.from(files)])}
                        />
                        <form onSubmit={handleAddComment} className="flex gap-2">
                          <input
                            type="text"
                            placeholder={uploadingCommentFiles ? "Uploading attachments..." : "Type an update or comment..."}
                            value={commentBody}
                            disabled={uploadingCommentFiles}
                            onChange={(e) => setCommentBody(e.target.value)}
                            className="flex-1 bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:border-accent/40 shadow-inner font-semibold disabled:opacity-50"
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
                            className="p-2.5 bg-neutral-100 dark:bg-neutral-850 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-850 dark:hover:text-neutral-200 transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center"
                            title="Attach Files"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <button
                            type="submit"
                            disabled={uploadingCommentFiles}
                            className="p-2.5 bg-neutral-100 dark:bg-neutral-850 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-355 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center"
                          >
                            {uploadingCommentFiles ? (
                              <Loader2 className="w-4 h-4 animate-spin text-accent" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right side: Parameters block (horizon, project, owner, target date) */}
            <div className="w-full md:w-64 flex-shrink-0 bg-neutral-50/50 dark:bg-neutral-850/10 p-6 space-y-6 flex flex-col overflow-y-auto aether-scroll">
              
              {/* Rollup Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase">
                  <span>Goal Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-neutral-150 dark:bg-neutral-800 rounded-full h-2 overflow-hidden shadow-inner">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)`
                    }}
                  />
                </div>
              </div>

              {/* Param: Horizon */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Chronology Horizon
                </label>
                <select
                  value={goal.horizon}
                  onChange={(e) => handleHorizonChange(e.target.value as GoalHorizon)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-850 dark:text-neutral-200 outline-none cursor-pointer focus:border-accent/40 font-bold"
                >
                  <option value="short_term">Short Term (Weekly/Monthly)</option>
                  <option value="long_term">Long Term (Quarterly/Annual)</option>
                </select>
              </div>

              {/* Param: Project */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Associated Project
                </label>
                <select
                  value={goal.projectId || ''}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-850 dark:text-neutral-200 outline-none cursor-pointer focus:border-accent/40 font-bold"
                >
                  <option value="">None (Standalone Goal)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Param: Owner */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Responsible Owner
                </label>
                <select
                  value={goal.ownerId || ''}
                  onChange={(e) => handleOwnerChange(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-850 dark:text-neutral-200 outline-none cursor-pointer focus:border-accent/40 font-bold"
                >
                  <option value="">Select Employee...</option>
                  {members.map(m => (
                    <option key={m.uid} value={m.uid}>{m.fullName || m.username}</option>
                  ))}
                </select>
              </div>

              {/* Param: Target Date */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Target Date</span>
                </label>
                <input
                  type="date"
                  value={getTargetDateString()}
                  onChange={(e) => handleTargetDateChange(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-850 dark:text-neutral-200 outline-none cursor-pointer focus:border-accent/40 font-mono font-semibold"
                />
              </div>

            </div>

          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
