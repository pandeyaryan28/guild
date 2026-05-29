import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, Calendar, User, Tag, 
  Trash2, Send, Clock, AlertCircle, Play, 
  ChevronRight, Sparkles, MessageSquare, ListTodo,
  Paperclip, File, FileText, FileAudio, FileVideo, Download, ExternalLink,
  Loader2
} from 'lucide-react';
import { 
  updateTask, moveTask, updatePriority, 
  updateAssignees, updateDueDate, updateLabels, 
  addComment, updateTaskAttachments,
  STATUS_CONFIG, PRIORITY_CONFIG, STATUSES,
  type Task, type TaskStatus, type TaskPriority, type ActorInfo 
} from '../../lib/tasks';
import { useTaskComments, useTaskActivities } from '../../hooks/useTasks';
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
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [commentBody, setCommentBody] = React.useState('');
  const [commentFiles, setCommentFiles] = React.useState<File[]>([]);
  const [uploadingCommentFiles, setUploadingCommentFiles] = React.useState(false);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [isEditingDesc, setIsEditingDesc] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'comments' | 'activity'>('comments');

  const comments = useTaskComments(task?.id || null);
  const activities = useTaskActivities(task?.id || null);

  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
    }
  }, [task]);

  if (!task) return null;

  const currentProject = projects.find(p => p.id === task.projectId);
  const currentGoal = goals.find(g => g.id === task.goalId);

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
      // Don't allow empty assignees if it's the only one, or let it toggle
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

  const getMemberInitials = (uid: string) => {
    const m = members.find(mem => mem.uid === uid);
    if (!m) return '?';
    return m.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getMemberName = (uid: string) => {
    const m = members.find(mem => mem.uid === uid);
    return m?.fullName || 'Teammate';
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end overflow-hidden select-none pointer-events-none">
        
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/20 dark:bg-neutral-950/40 backdrop-blur-xs z-40 pointer-events-auto"
        />

        {/* Drawer panel */}
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
                Task Details
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all active:scale-95 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content - Two Column Split */}
          <div className="flex-grow flex flex-col md:flex-row overflow-hidden min-h-0">
            
            {/* Left Column: Title, Description, Comments/Activity */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-neutral-100 dark:border-neutral-800 overflow-y-auto aether-scroll p-6 space-y-6">
              
              {/* Title Field */}
              <div className="space-y-1">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                    autoFocus
                    className="w-full text-lg font-bold text-neutral-850 dark:text-neutral-100 outline-none border-b border-accent/40 bg-transparent pb-1"
                  />
                ) : (
                  <h2
                    onClick={() => setIsEditingTitle(true)}
                    className="text-lg font-bold text-neutral-850 dark:text-neutral-100 cursor-text hover:bg-neutral-50 dark:hover:bg-neutral-850/30 px-1 py-0.5 rounded transition-colors break-words"
                  >
                    {title || <span className="text-neutral-400 italic">Untitled Task</span>}
                  </h2>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500">
                  Description
                </label>
                {isEditingDesc ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescBlur}
                    rows={4}
                    autoFocus
                    placeholder="Describe task expectations and deliverables..."
                    className="w-full bg-neutral-50 dark:bg-neutral-850/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-xs text-neutral-800 dark:text-neutral-250 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:border-accent/40 font-semibold resize-none"
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className="min-h-16 text-xs text-neutral-650 dark:text-neutral-450 hover:bg-neutral-50 dark:hover:bg-neutral-850/30 px-3 py-2.5 rounded-xl border border-neutral-100 dark:border-neutral-850 cursor-text transition-colors leading-relaxed whitespace-pre-wrap font-semibold"
                  >
                    {description || <span className="text-neutral-400 italic">Add task parameters or notes...</span>}
                  </div>
                )}
              </div>

              {/* Task Media & Files */}
              <div className="pt-2">
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

              {/* Tabs for Feed */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col flex-grow min-h-[300px]">
                <div className="flex border-b border-neutral-100 dark:border-neutral-800 mb-4 flex-shrink-0">
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
                    <span>Comments ({comments.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={cn(
                      "pb-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                      activeTab === 'activity'
                        ? "border-accent text-neutral-800 dark:text-neutral-200"
                        : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    )}
                  >
                    <ListTodo className="w-3.5 h-3.5" />
                    <span>Activity Log ({activities.length})</span>
                  </button>
                </div>

                <div className="flex-grow flex flex-col overflow-hidden min-h-[220px]">
                  {activeTab === 'comments' ? (
                    <div className="flex flex-col h-full overflow-hidden justify-between">
                      {/* Comments Thread */}
                      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin max-h-[240px]">
                        {comments.length > 0 ? (
                          comments.map((comment) => (
                            <div key={comment.id} className="flex items-start gap-3 bg-neutral-50/50 dark:bg-neutral-850/15 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-850 animate-fluid-pop">
                              <div className="h-7 w-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] font-bold text-accent shrink-0">
                                {getMemberInitials(comment.authorId)}
                              </div>
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
                            No updates or discussions on this task yet.
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
                            className="p-2.5 bg-neutral-100 dark:bg-neutral-850 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-350 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center"
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
                  ) : (
                    // Activity Log
                    <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin max-h-[300px]">
                      {activities.length > 0 ? (
                        activities.map((act) => (
                          <div key={act.id} className="flex items-center gap-2.5 text-xs text-neutral-500 dark:text-neutral-450 border-b border-neutral-50 dark:border-neutral-850/50 pb-2 px-1">
                            <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span className="font-mono text-[9px] shrink-0">{formatTimestamp(act.createdAt)}</span>
                            <span className="font-bold text-neutral-800 dark:text-neutral-255 shrink-0">
                              {act.actorName}
                            </span>
                            <span className="truncate">
                              {act.type.replace('_', ' ')}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-neutral-400 italic">
                          No logged history events.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Task Parameters Panel */}
            <div className="w-full md:w-64 flex-shrink-0 bg-neutral-50/50 dark:bg-neutral-850/10 p-6 space-y-6 flex flex-col overflow-y-auto aether-scroll">
              
              {/* Parameter Block: Status */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Status
                </label>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-850 dark:text-neutral-200 outline-none cursor-pointer focus:border-accent/40 font-bold"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>

              {/* Parameter Block: Priority */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Priority
                </label>
                <select
                  value={task.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-850 dark:text-neutral-200 outline-none cursor-pointer focus:border-accent/40 font-bold"
                >
                  <option value="none">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Parameter Block: Assignee Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
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
                            ? "bg-accent/[0.06] border-accent/25 text-neutral-850 dark:text-white"
                            : "bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-850 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-50"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-5 w-5 rounded-full bg-accent/15 flex items-center justify-center text-[9px] font-extrabold text-accent shrink-0">
                            {getMemberInitials(m.uid)}
                          </div>
                          <span className="text-[11px] font-semibold truncate">
                            {m.fullName || m.username}
                          </span>
                        </div>
                        {isAssigned && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Parameter Block: Due Date */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Due Date</span>
                </label>
                <input
                  type="date"
                  value={getDueDateString()}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-850 dark:text-neutral-200 outline-none cursor-pointer focus:border-accent/40 font-mono font-semibold"
                />
              </div>

              {/* Parameter Block: Context mapping */}
              <div className="space-y-3.5 pt-4.5 border-t border-neutral-100 dark:border-neutral-800">
                {currentProject && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Linked Project</span>
                    <span className="text-[11px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-550/5 dark:bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/10 rounded block truncate">
                      {currentProject.name}
                    </span>
                  </div>
                )}

                {currentGoal && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Linked Goal Focus</span>
                    <span className="text-[11px] font-black text-cyan-500 dark:text-cyan-400 bg-cyan-550/5 dark:bg-cyan-500/5 px-2 py-0.5 border border-cyan-500/10 rounded block truncate">
                      {currentGoal.title}
                    </span>
                  </div>
                )}
              </div>

            </div>

          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
