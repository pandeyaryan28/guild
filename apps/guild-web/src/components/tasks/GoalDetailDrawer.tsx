import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { 
  X, Check, Calendar, User, Tag, 
  Trash2, Plus, Target, ChevronRight,
  ListTodo, Loader2, Link2, Sparkles, MessageSquare, Send, Paperclip,
  HelpCircle, RefreshCw, Folder, Share2, AlertCircle
} from 'lucide-react';
import { 
  updateGoal, addGoalComment, updateGoalAttachments, deleteGoal,
  type Goal, type GoalStatus 
} from '../../lib/goals';
import { 
  createTask, moveTask, deleteTask, 
  STATUS_CONFIG, STATUSES, type Task, type TaskStatus, type ActorInfo 
} from '../../lib/tasks';
import { useGoalComments } from '../../hooks/useGoals';
import { useAuth } from '../../hooks/useAuth';
import { AttachmentSection } from './AttachmentSection';
import { AttachmentInput } from './AttachmentInput';
import { type MessageAttachment, type GoalRecurrence, type GoalHorizon } from '@guild/types';
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
  inline?: boolean;
}

export function GoalDetailDrawer({
  goal,
  onClose,
  orgId,
  actor,
  members,
  projects,
  tasks,
  onSelectTask,
  inline = false
}: GoalDetailDrawerProps) {
  const { userProfile } = useAuth();
  const [, setSearchParams] = useSearchParams();
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
  const [isAddingTask, setIsAddingTask] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const comments = useGoalComments(goal?.id || null);

  React.useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setDescription(goal.description || '');
    }
  }, [goal]);

  if (!goal) return null;

  // Authorization checks: only creator (ownerId) of goal or owner/admin of org can delete
  const currentUserMember = members.find(m => m.uid === actor.uid);
  const userRole = currentUserMember?.role || 'member';
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';
  const isCreator = goal.ownerId === actor.uid;
  const canDelete = isCreator || isOwnerOrAdmin;

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

  const handleRecurrenceChange = async (recurrence: GoalRecurrence) => {
    try {
      await updateGoal(goal.id, { recurrence });
    } catch (err) {
      console.error('Failed to update recurrence:', err);
    }
  };

  const handleCustomDaysChange = async (customDays: number | null) => {
    try {
      await updateGoal(goal.id, { customDays });
    } catch (err) {
      console.error('Failed to update custom days:', err);
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
    if (!goal) return;
    const isAuthorized = 
      goal.ownerId === actor.uid || 
      userProfile?.role === 'owner' || 
      userProfile?.role === 'admin';

    if (!isAuthorized) {
      setToastMessage("Only the goal owner or an administrator can toggle this goal's status.");
      return;
    }

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
    if (!inlineTaskTitle.trim() || isAddingTask) return;
    setIsAddingTask(true);
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
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleDeleteTaskItem = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this checklist task?')) {
      try {
        await deleteTask(taskId);
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
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

  const getMemberInitials = (uid: string) => {
    const m = members.find(mem => mem.uid === uid);
    if (!m) return '?';
    return m.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getMemberPhotoURL = (uid: string) => {
    const m = members.find(mem => mem.uid === uid);
    return m?.photoURL || '';
  };

  const getMemberName = (uid: string) => {
    const m = members.find(mem => mem.uid === uid);
    return m?.fullName || 'Teammate';
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

  // --- Redesign Helpers ---
  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?goal=${goal.id}`;
    navigator.clipboard.writeText(url);
    setToastMessage("Goal link copied!");
  };

  const handleDeleteGoal = async () => {
    if (!canDelete) {
      setToastMessage("Only the creator of this goal or an admin/owner can delete it.");
      return;
    }
    if (confirm("Are you sure you want to delete this goal?")) {
      try {
        await deleteGoal(goal.id);
        onClose();
      } catch (err) {
        console.error("Failed to delete goal:", err);
      }
    }
  };

  const renderHorizonTrigger = (h: GoalHorizon) => {
    const labels: Record<GoalHorizon, string> = {
      short_term: "Short Term (Weekly/Monthly)",
      long_term: "Long Term (Quarterly/Annual)"
    };
    return (
      <div className="flex items-center justify-between w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-xs text-neutral-850 dark:text-neutral-200 hover:border-neutral-350 dark:hover:border-neutral-700">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>{labels[h]}</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 rotate-90 shrink-0 opacity-60" />
      </div>
    );
  };

  const renderHorizonOption = (h: GoalHorizon, isSelected: boolean) => {
    const labels: Record<GoalHorizon, string> = {
      short_term: "Short Term (Weekly/Monthly)",
      long_term: "Long Term (Quarterly/Annual)"
    };
    return (
      <div className={cn(
        "flex items-center justify-between w-full px-3.5 py-2.5 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-colors",
        isSelected ? "text-primary bg-primary/[0.03] dark:bg-primary/[0.05]" : "text-neutral-700 dark:text-neutral-350"
      )}>
        <div className="flex items-center gap-2.5">
          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>{labels[h]}</span>
        </div>
        {isSelected && <Check className="w-4 h-4 text-primary shrink-0 stroke-[2.5]" />}
      </div>
    );
  };

  const renderRecurrenceTrigger = (r: GoalRecurrence) => {
    const labels: Record<GoalRecurrence, string> = {
      none: "One-time Goal",
      daily: "Daily Cycle",
      weekly: "Weekly Cycle",
      monthly: "Monthly Cycle",
      custom: "Custom Cycle..."
    };
    return (
      <div className="flex items-center justify-between w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-xs text-neutral-850 dark:text-neutral-200 hover:border-neutral-350 dark:hover:border-neutral-700">
        <div className="flex items-center gap-2.5">
          <RefreshCw className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>{labels[r]}</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 rotate-90 shrink-0 opacity-60" />
      </div>
    );
  };

  const renderRecurrenceOption = (r: GoalRecurrence, isSelected: boolean) => {
    const labels: Record<GoalRecurrence, string> = {
      none: "One-time Goal",
      daily: "Daily Cycle",
      weekly: "Weekly Cycle",
      monthly: "Monthly Cycle",
      custom: "Custom Cycle..."
    };
    return (
      <div className={cn(
        "flex items-center justify-between w-full px-3.5 py-2.5 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-colors",
        isSelected ? "text-primary bg-primary/[0.03] dark:bg-primary/[0.05]" : "text-neutral-700 dark:text-neutral-350"
      )}>
        <div className="flex items-center gap-2.5">
          <RefreshCw className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>{labels[r]}</span>
        </div>
        {isSelected && <Check className="w-4 h-4 text-primary shrink-0 stroke-[2.5]" />}
      </div>
    );
  };

  const renderProjectTrigger = (pId: string) => {
    const proj = projects.find(p => p.id === pId);
    return (
      <div className="flex items-center justify-between w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-xs text-neutral-850 dark:text-neutral-200 hover:border-neutral-350 dark:hover:border-neutral-700">
        <div className="flex items-center gap-2.5 truncate">
          <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">{proj ? proj.name : "None (Independent Goal)"}</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 rotate-90 shrink-0 opacity-60" />
      </div>
    );
  };

  const renderProjectOption = (pId: string, isSelected: boolean) => {
    const proj = projects.find(p => p.id === pId);
    return (
      <div className={cn(
        "flex items-center justify-between w-full px-3.5 py-2.5 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-colors",
        isSelected ? "text-primary bg-primary/[0.03] dark:bg-primary/[0.05]" : "text-neutral-700 dark:text-neutral-350"
      )}>
        <div className="flex items-center gap-2.5 truncate">
          <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">{proj ? proj.name : "None (Independent Goal)"}</span>
        </div>
        {isSelected && <Check className="w-4 h-4 text-primary shrink-0 stroke-[2.5]" />}
      </div>
    );
  };

  const renderOwnerTrigger = (oId: string) => {
    const member = members.find(m => m.uid === oId);
    return (
      <div className="flex items-center justify-between w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-xs text-neutral-850 dark:text-neutral-200 hover:border-neutral-350 dark:hover:border-neutral-700">
        <div className="flex items-center gap-2.5 truncate">
          {member ? (
            <>
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-extrabold text-primary shrink-0 overflow-hidden border border-primary/10 shadow-2xs">
                {member.photoURL ? (
                  <img src={member.photoURL} alt={member.fullName} className="h-full w-full object-cover" />
                ) : (
                  getMemberInitials(member.uid)
                )}
              </div>
              <span className="truncate">{member.fullName || member.username}</span>
            </>
          ) : (
            <>
              <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="text-neutral-400">Select owner...</span>
            </>
          )}
        </div>
        <ChevronRight className="w-3.5 h-3.5 rotate-90 shrink-0 opacity-60" />
      </div>
    );
  };

  const renderOwnerOption = (oId: string, isSelected: boolean) => {
    const member = members.find(m => m.uid === oId);
    return (
      <div className={cn(
        "flex items-center justify-between w-full px-3.5 py-2.5 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-colors",
        isSelected ? "text-primary bg-primary/[0.03] dark:bg-primary/[0.05]" : "text-neutral-700 dark:text-neutral-350"
      )}>
        <div className="flex items-center gap-2.5 truncate">
          {member ? (
            <>
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-extrabold text-primary shrink-0 overflow-hidden border border-primary/10">
                {member.photoURL ? (
                  <img src={member.photoURL} alt={member.fullName} className="h-full w-full object-cover" />
                ) : (
                  getMemberInitials(member.uid)
                )}
              </div>
              <span className="truncate">{member.fullName || member.username}</span>
            </>
          ) : (
            <>
              <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="text-neutral-400">Select owner...</span>
            </>
          )}
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
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Goal Details
              </span>
            </div>
            
            {/* Quick action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {canDelete && (
                <button
                  onClick={handleDeleteGoal}
                  className="p-2 rounded-xl border border-neutral-200/65 dark:border-neutral-800/80 hover:bg-red-500/10 hover:border-red-500/20 text-neutral-500 hover:text-red-500 transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
                  title="Delete Goal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-xl border border-neutral-200/65 dark:border-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
                title="Copy Link to Goal"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl border border-neutral-200/65 dark:border-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Two-Column split workspace (Stacked vertically when inline) */}
          <div className="flex-grow flex flex-col overflow-y-auto scrollbar-thin min-h-0">
            
            {/* Left side: properties, outcome details, checklist */}
            <div className="p-6 space-y-6 flex-shrink-0">
              
              {/* Strategic Goal Title with satisfy editor */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleGoalStatus}
                    className={cn(
                      "h-5.5 w-5.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-2xs",
                      goal.status === 'completed'
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                        : "border-neutral-350 dark:border-neutral-700 bg-transparent hover:border-cyan-500"
                    )}
                    title={goal.status === 'completed' ? "Mark Goal as Active" : "Mark Goal as Completed"}
                  >
                    {goal.status === 'completed' ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-transparent hover:bg-cyan-500/50" />
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
                      className="w-full text-lg font-bold text-neutral-850 dark:text-neutral-100 outline-none border-b border-primary bg-transparent pb-1"
                    />
                  ) : (
                    <h2
                      onClick={() => setIsEditingTitle(true)}
                      className={cn(
                        "text-lg font-bold cursor-text hover:bg-neutral-50/50 dark:hover:bg-neutral-850/20 px-2 py-1 -ml-2 rounded-xl border border-transparent hover:border-neutral-200/30 transition-all break-words flex-1 min-w-0 leading-tight",
                        goal.status === 'completed' ? "text-neutral-450 dark:text-neutral-500 line-through decoration-cyan-500/50" : "text-neutral-850 dark:text-neutral-100"
                      )}
                    >
                      {title || <span className="text-neutral-400 italic font-normal">Untitled Goal Focus</span>}
                    </h2>
                  )}
                </div>
              </div>

              {/* Outcome Objectives Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Expected Strategic Outcome
                </label>
                {isEditingDesc ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescBlur}
                    rows={4}
                    autoFocus
                    placeholder="Describe expected results, outcomes and metrics..."
                    className="w-full bg-neutral-50/50 dark:bg-neutral-850/20 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 py-3.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-450 dark:placeholder:text-neutral-600 outline-none focus:border-primary/50 font-semibold resize-none transition-all"
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className="min-h-16 text-xs text-neutral-650 dark:text-neutral-350 hover:bg-neutral-50/50 dark:hover:bg-neutral-850/10 px-4 py-3.5 rounded-2xl border border-neutral-150 dark:border-neutral-850/80 cursor-text transition-all leading-relaxed whitespace-pre-wrap font-semibold"
                  >
                    {description || <span className="text-neutral-400 italic font-normal">Define strategic outcome targets, KPIs or focus objectives...</span>}
                  </div>
                )}
              </div>

              {/* Goal File Attachments */}
              <div>
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

              {/* Tabbed Feed: Tasks Checklist vs Discussion */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col flex-grow min-h-[300px]">
                <div className="flex border-b border-neutral-150 dark:border-neutral-850/60 mb-4 flex-shrink-0 relative">
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={cn(
                      "pb-2 px-4 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 relative z-10",
                      activeTab === 'tasks'
                        ? "text-neutral-900 dark:text-neutral-100 font-black"
                        : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 font-semibold"
                    )}
                  >
                    <ListTodo className="w-4 h-4" />
                    <span>Checklist ({activeTasks.length})</span>
                    {activeTab === 'tasks' && (
                      <motion.div 
                        layoutId="activeTabUnderlineGoal" 
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" 
                      />
                    )}
                  </button>
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
                    <span>Discussion ({comments.length})</span>
                    {activeTab === 'comments' && (
                      <motion.div 
                        layoutId="activeTabUnderlineGoal" 
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" 
                      />
                    )}
                  </button>
                </div>

                <div className="flex-grow flex flex-col overflow-hidden min-h-[220px]">
                  {activeTab === 'tasks' ? (
                    <div className="space-y-4">
                      {/* Inline task quick-adder */}
                      <form onSubmit={handleInlineTaskSubmit} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add an active task to this goal..."
                          value={inlineTaskTitle}
                          onChange={(e) => setInlineTaskTitle(e.target.value)}
                          className="flex-1 bg-neutral-50/70 dark:bg-neutral-850/20 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-450 outline-none hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-primary/50 transition-all font-semibold"
                        />
                        <button
                          type="submit"
                          disabled={!inlineTaskTitle.trim() || isAddingTask}
                          className="px-3.5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-xs font-bold hover:bg-neutral-850 dark:hover:bg-neutral-100 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all cursor-pointer flex items-center justify-center shrink-0"
                        >
                          {isAddingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
                        </button>
                      </form>

                      {/* Checklist sets */}
                      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
                        
                        {/* Active checklist */}
                        {activeTasks.length > 0 ? (
                          <div className="space-y-2">
                            {activeTasks.map(task => (
                              <div
                                key={task.id}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-150/40 dark:border-neutral-800/40 hover:border-neutral-250 dark:hover:border-neutral-700 hover:shadow-2xs transition-all group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <button
                                    onClick={(e) => handleToggleTaskStatus(e, task)}
                                    className="h-4.5 w-4.5 rounded-full border border-neutral-350 dark:border-neutral-700 hover:border-primary bg-transparent flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
                                  >
                                    <div className="h-1.5 w-1.5 rounded-full bg-transparent hover:bg-primary/50" />
                                  </button>
                                  <span 
                                    onClick={() => {
                                      if (onSelectTask) onSelectTask(task);
                                      else setSearchParams({ task: task.id });
                                    }}
                                    className="text-xs font-semibold cursor-pointer hover:text-primary transition-all truncate text-neutral-800 dark:text-neutral-200"
                                  >
                                    {task.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {task.assigneeIds.slice(0, 1).map((uid) => (
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
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-500 italic bg-neutral-50/20 dark:bg-neutral-850/5 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                            No active tasks in checklist. Add tasks to drive goal focus success.
                          </div>
                        )}

                        {/* Completed checklist Accordion */}
                        {completedTasks.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-neutral-100/50 dark:bg-neutral-850/30 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-800/40 text-[10px] text-neutral-500 font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              <span>Completed Checklist Items ({completedTasks.length})</span>
                              <ChevronRight className={cn("w-3.5 h-3.5 transition-transform text-neutral-450", showCompletedTasks ? "rotate-90" : "")} />
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
                                      className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50/20 dark:bg-neutral-850/5 border border-neutral-150/40 dark:border-neutral-800/30 opacity-60 hover:opacity-95 transition-all"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <button
                                          onClick={(e) => handleToggleTaskStatus(e, task)}
                                          className="h-4.5 w-4.5 rounded-full border border-cyan-500 bg-cyan-500/10 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
                                        >
                                          <Check className="w-2.5 h-2.5 text-cyan-500 stroke-[3]" />
                                        </button>
                                        <span 
                                          onClick={() => {
                                            if (onSelectTask) onSelectTask(task);
                                            else setSearchParams({ task: task.id });
                                          }}
                                          className="text-xs font-semibold cursor-pointer hover:text-primary transition-all line-through truncate text-neutral-400 dark:text-neutral-500"
                                        >
                                          {task.title}
                                        </span>
                                      </div>
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
                    // Discussion Feed
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
                                  <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-250 truncate">
                                    {comment.authorName}
                                  </span>
                                  <span className="text-[9px] text-neutral-400 dark:text-neutral-550 font-mono">
                                    {formatTimestamp(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-655 dark:text-neutral-300 font-semibold leading-relaxed break-words whitespace-pre-wrap">
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
                          <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-555 italic">
                            No focus comments or discussions yet.
                          </div>
                        )}
                      </div>

                      {/* Comment Input */}
                      <div className="border-t border-neutral-150 dark:border-neutral-850/60 pt-3.5 flex-shrink-0 flex flex-col gap-2">
                        <AttachmentInput
                          selectedFiles={commentFiles}
                          onRemove={(idx) => setCommentFiles(prev => prev.filter((_, i) => i !== idx))}
                          onAdd={(files) => setCommentFiles(prev => [...prev, ...Array.from(files)])}
                        />
                        <form onSubmit={handleAddComment} className="flex gap-2">
                          <input
                            type="text"
                            placeholder={uploadingCommentFiles ? "Uploading attachments..." : "Add your discussion comment here..."}
                            value={commentBody}
                            disabled={uploadingCommentFiles}
                            onChange={(e) => setCommentBody(e.target.value)}
                            className="flex-1 bg-neutral-50/70 dark:bg-neutral-850/20 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-800 dark:text-neutral-250 placeholder:text-neutral-400 outline-none hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-primary/50 transition-all font-semibold disabled:opacity-50"
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
                            className="p-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200/60 dark:border-neutral-800 rounded-xl text-neutral-500 dark:text-neutral-455 hover:text-neutral-800 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shadow-2xs"
                            title="Attach Files"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <button
                            type="submit"
                            disabled={uploadingCommentFiles}
                            className="p-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200/60 dark:border-neutral-800 rounded-xl text-neutral-650 dark:text-neutral-350 hover:text-neutral-850 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shadow-2xs"
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
                  )}
                </div>
              </div>

            </div>

            {/* Right side: Parameters block (horizon, recurrence, project, owner, target date) (Stacked vertically when inline) */}
            <div className="w-full flex-shrink-0 bg-neutral-50/20 dark:bg-neutral-900/10 p-6 space-y-5.5 flex flex-col border-t border-neutral-100 dark:border-neutral-850/60 flex-grow-0">
              
              {/* Goal Progress rollup card */}
              <div className="bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/60 dark:border-neutral-800/80 rounded-2xl p-4.5 space-y-2 shadow-xs backdrop-blur-xs">
                <div className="flex justify-between text-[10px] text-neutral-450 dark:text-neutral-550 font-black uppercase tracking-wider px-0.5">
                  <span>Goal Progress</span>
                  <span className="text-cyan-500 font-extrabold">{progress}%</span>
                </div>
                <div className="w-full bg-neutral-200/80 dark:bg-neutral-800 rounded-full h-2 overflow-hidden shadow-inner relative">
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-xs"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {goalTasks.length > 0 && (
                  <span className="text-[9px] font-bold text-neutral-450 dark:text-neutral-400 block px-0.5">
                    {activeTasks.length} active tasks · {completedTasks.length} completed
                  </span>
                )}
              </div>

              {/* Param: Chronology Horizon */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Chronology Horizon
                </label>
                <CustomDropdown
                  value={goal.horizon}
                  onChange={handleHorizonChange}
                  options={['short_term', 'long_term']}
                  renderTrigger={renderHorizonTrigger}
                  renderOption={renderHorizonOption}
                />
              </div>

              {/* Param: Repetitive Recurrence */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-primary" />
                  <span>Goal Recurrence</span>
                </label>
                <CustomDropdown
                  value={goal.recurrence || 'none'}
                  onChange={handleRecurrenceChange}
                  options={['none', 'daily', 'weekly', 'monthly', 'custom']}
                  renderTrigger={renderRecurrenceTrigger}
                  renderOption={renderRecurrenceOption}
                />
              </div>

              {/* Param: Custom Days Interval */}
              {goal.recurrence === 'custom' && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                    Repeat Every (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={goal.customDays || ''}
                    onChange={(e) => handleCustomDaysChange(parseInt(e.target.value) || null)}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-855 dark:text-neutral-250 outline-none focus:border-primary/50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all font-semibold font-mono shadow-2xs"
                    placeholder="e.g. 14 for bi-weekly"
                  />
                </div>
              )}

              {/* Param: Connected Project context */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Linked Project
                </label>
                <CustomDropdown
                  value={goal.projectId || ''}
                  onChange={handleProjectChange}
                  options={['', ...projects.map(p => p.id)]}
                  renderTrigger={renderProjectTrigger}
                  renderOption={renderProjectOption}
                />
              </div>

              {/* Param: Responsible Teammate Owner */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Responsible Owner
                </label>
                <CustomDropdown
                  value={goal.ownerId || ''}
                  onChange={handleOwnerChange}
                  options={['', ...members.map(m => m.uid)]}
                  renderTrigger={renderOwnerTrigger}
                  renderOption={renderOwnerOption}
                />
              </div>

              {/* Param: Target Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1 px-0.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Target Date</span>
                </label>
                <input
                  type="date"
                  value={getTargetDateString()}
                  onChange={(e) => handleTargetDateChange(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-855 dark:text-neutral-250 outline-none cursor-pointer focus:border-primary/50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all font-mono font-bold shadow-2xs"
                />
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
        
        {/* Transparent backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/15 dark:bg-neutral-950/45 backdrop-blur-xs z-40 pointer-events-auto"
        />

        {/* Redesigned goal drawer panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 350, damping: 33 }}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white/95 dark:bg-neutral-900/95 border-l border-neutral-200/60 dark:border-neutral-800/60 shadow-2xl flex flex-col h-full pointer-events-auto backdrop-blur-xl"
        >
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-850/60 flex-shrink-0 bg-neutral-50/30 dark:bg-neutral-900/30 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Goal Details
              </span>
            </div>
            
            {/* Quick action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {canDelete && (
                <button
                  onClick={handleDeleteGoal}
                  className="p-2 rounded-xl border border-neutral-200/65 dark:border-neutral-800/80 hover:bg-red-500/10 hover:border-red-500/20 text-neutral-500 hover:text-red-500 transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
                  title="Delete Goal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-xl border border-neutral-200/65 dark:border-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
                title="Copy Link to Goal"
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

          {/* Two-Column split workspace */}
          <div className="flex-grow flex flex-col md:flex-row overflow-hidden min-h-0">
            
            {/* Left side: properties, outcome details, checklist */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-neutral-100 dark:border-neutral-850/60 overflow-y-auto scrollbar-thin p-6 space-y-6">
              
              {/* Strategic Goal Title with satisfy editor */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleGoalStatus}
                    className={cn(
                      "h-5.5 w-5.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-2xs",
                      goal.status === 'completed'
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                        : "border-neutral-350 dark:border-neutral-700 bg-transparent hover:border-cyan-500"
                    )}
                    title={goal.status === 'completed' ? "Mark Goal as Active" : "Mark Goal as Completed"}
                  >
                    {goal.status === 'completed' ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-transparent hover:bg-cyan-500/50" />
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
                      className="w-full text-lg font-bold text-neutral-850 dark:text-neutral-100 outline-none border-b border-primary bg-transparent pb-1"
                    />
                  ) : (
                    <h2
                      onClick={() => setIsEditingTitle(true)}
                      className={cn(
                        "text-lg font-bold cursor-text hover:bg-neutral-50/50 dark:hover:bg-neutral-855/20 px-2 py-1 -ml-2 rounded-xl border border-transparent hover:border-neutral-200/30 transition-all break-words flex-1 min-w-0 leading-tight",
                        goal.status === 'completed' ? "text-neutral-450 dark:text-neutral-500 line-through decoration-cyan-500/50" : "text-neutral-850 dark:text-neutral-100"
                      )}
                    >
                      {title || <span className="text-neutral-400 italic font-normal">Untitled Goal Focus</span>}
                    </h2>
                  )}
                </div>
              </div>

              {/* Outcome Objectives Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Expected Strategic Outcome
                </label>
                {isEditingDesc ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescBlur}
                    rows={4}
                    autoFocus
                    placeholder="Describe expected results, outcomes and metrics..."
                    className="w-full bg-neutral-50/50 dark:bg-neutral-850/20 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 py-3.5 text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:border-primary/50 font-semibold resize-none transition-all"
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className="min-h-16 text-xs text-neutral-650 dark:text-neutral-350 hover:bg-neutral-50/50 dark:hover:bg-neutral-850/10 px-4 py-3.5 rounded-2xl border border-neutral-150 dark:border-neutral-850/80 cursor-text transition-all leading-relaxed whitespace-pre-wrap font-semibold"
                  >
                    {description || <span className="text-neutral-400 italic font-normal">Define strategic outcome targets, KPIs or focus objectives...</span>}
                  </div>
                )}
              </div>

              {/* Goal File Attachments */}
              <div>
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

              {/* Tabbed Feed: Tasks Checklist vs Discussion */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col flex-grow min-h-[300px]">
                <div className="flex border-b border-neutral-150 dark:border-neutral-850/60 mb-4 flex-shrink-0 relative">
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={cn(
                      "pb-2 px-4 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 relative z-10",
                      activeTab === 'tasks'
                        ? "text-neutral-900 dark:text-neutral-100 font-black"
                        : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 font-semibold"
                    )}
                  >
                    <ListTodo className="w-4 h-4" />
                    <span>Checklist ({activeTasks.length})</span>
                    {activeTab === 'tasks' && (
                      <motion.div 
                        layoutId="activeTabUnderlineGoal" 
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" 
                      />
                    )}
                  </button>
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
                    <span>Discussion ({comments.length})</span>
                    {activeTab === 'comments' && (
                      <motion.div 
                        layoutId="activeTabUnderlineGoal" 
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" 
                      />
                    )}
                  </button>
                </div>

                <div className="flex-grow flex flex-col overflow-hidden min-h-[220px]">
                  {activeTab === 'tasks' ? (
                    <div className="space-y-4">
                      {/* Inline task quick-adder */}
                      <form onSubmit={handleInlineTaskSubmit} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add an active task to this goal..."
                          value={inlineTaskTitle}
                          onChange={(e) => setInlineTaskTitle(e.target.value)}
                          className="flex-1 bg-neutral-50/70 dark:bg-neutral-850/20 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 dark:text-neutral-200 placeholder:text-neutral-450 outline-none hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-primary/50 transition-all font-semibold"
                        />
                        <button
                          type="submit"
                          disabled={!inlineTaskTitle.trim() || isAddingTask}
                          className="px-3.5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-xs font-bold hover:bg-neutral-850 dark:hover:bg-neutral-100 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all cursor-pointer flex items-center justify-center shrink-0"
                        >
                          {isAddingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
                        </button>
                      </form>

                      {/* Checklist sets */}
                      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
                        
                        {/* Active checklist */}
                        {activeTasks.length > 0 ? (
                          <div className="space-y-2">
                            {activeTasks.map(task => (
                              <div
                                key={task.id}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-150/40 dark:border-neutral-800/40 hover:border-neutral-250 dark:hover:border-neutral-700 hover:shadow-2xs transition-all group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <button
                                    onClick={(e) => handleToggleTaskStatus(e, task)}
                                    className="h-4.5 w-4.5 rounded-full border border-neutral-350 dark:border-neutral-700 hover:border-primary bg-transparent flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
                                  >
                                    <div className="h-1.5 w-1.5 rounded-full bg-transparent hover:bg-primary/50" />
                                  </button>
                                  <span 
                                    onClick={() => {
                                      if (onSelectTask) onSelectTask(task);
                                      else setSearchParams({ task: task.id });
                                    }}
                                    className="text-xs font-semibold cursor-pointer hover:text-primary transition-all truncate text-neutral-800 dark:text-neutral-200"
                                  >
                                    {task.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {task.assigneeIds.slice(0, 1).map((uid) => (
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
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-500 italic bg-neutral-50/20 dark:bg-neutral-850/5 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                            No active tasks in checklist. Add tasks to drive goal focus success.
                          </div>
                        )}

                        {/* Completed checklist Accordion */}
                        {completedTasks.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-neutral-100/50 dark:bg-neutral-850/30 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-800/40 text-[10px] text-neutral-500 font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              <span>Completed Checklist Items ({completedTasks.length})</span>
                              <ChevronRight className={cn("w-3.5 h-3.5 transition-transform text-neutral-450", showCompletedTasks ? "rotate-90" : "")} />
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
                                      className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50/20 dark:bg-neutral-850/5 border border-neutral-150/40 dark:border-neutral-800/30 opacity-60 hover:opacity-95 transition-all"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <button
                                          onClick={(e) => handleToggleTaskStatus(e, task)}
                                          className="h-4.5 w-4.5 rounded-full border border-cyan-500 bg-cyan-500/10 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
                                        >
                                          <Check className="w-2.5 h-2.5 text-cyan-500 stroke-[3]" />
                                        </button>
                                        <span 
                                          onClick={() => {
                                            if (onSelectTask) onSelectTask(task);
                                            else setSearchParams({ task: task.id });
                                          }}
                                          className="text-xs font-semibold cursor-pointer hover:text-primary transition-all line-through truncate text-neutral-400 dark:text-neutral-500"
                                        >
                                          {task.title}
                                        </span>
                                      </div>
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
                    // Discussion Feed
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
                                  <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-250 truncate">
                                    {comment.authorName}
                                  </span>
                                  <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-mono">
                                    {formatTimestamp(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-655 dark:text-neutral-300 font-semibold leading-relaxed break-words whitespace-pre-wrap">
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
                            No focus comments or discussions yet.
                          </div>
                        )}
                      </div>

                      {/* Comment Input */}
                      <div className="border-t border-neutral-150 dark:border-neutral-850/60 pt-3.5 flex-shrink-0 flex flex-col gap-2">
                        <AttachmentInput
                          selectedFiles={commentFiles}
                          onRemove={(idx) => setCommentFiles(prev => prev.filter((_, i) => i !== idx))}
                          onAdd={(files) => setCommentFiles(prev => [...prev, ...Array.from(files)])}
                        />
                        <form onSubmit={handleAddComment} className="flex gap-2">
                          <input
                            type="text"
                            placeholder={uploadingCommentFiles ? "Uploading attachments..." : "Add your discussion comment here..."}
                            value={commentBody}
                            disabled={uploadingCommentFiles}
                            onChange={(e) => setCommentBody(e.target.value)}
                            className="flex-1 bg-neutral-50/70 dark:bg-neutral-850/20 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-800 dark:text-neutral-250 placeholder:text-neutral-400 outline-none hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-primary/50 transition-all font-semibold disabled:opacity-50"
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
                  )}
                </div>
              </div>

            </div>

            {/* Right side: Parameters block (horizon, recurrence, project, owner, target date) */}
            <div className="w-full md:w-64 flex-shrink-0 bg-neutral-50/20 dark:bg-neutral-900/10 p-6 space-y-5.5 flex flex-col overflow-y-auto scrollbar-thin border-t md:border-t-0 border-neutral-100 dark:border-neutral-850/60">
              
              {/* Goal Progress rollup card */}
              <div className="bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/60 dark:border-neutral-800/80 rounded-2xl p-4.5 space-y-2 shadow-xs backdrop-blur-xs">
                <div className="flex justify-between text-[10px] text-neutral-450 dark:text-neutral-500 font-black uppercase tracking-wider px-0.5">
                  <span>Goal Progress</span>
                  <span className="text-cyan-500 font-extrabold">{progress}%</span>
                </div>
                <div className="w-full bg-neutral-200/80 dark:bg-neutral-800 rounded-full h-2 overflow-hidden shadow-inner relative">
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-xs"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {goalTasks.length > 0 && (
                  <span className="text-[9px] font-bold text-neutral-450 dark:text-neutral-400 block px-0.5">
                    {activeTasks.length} active tasks · {completedTasks.length} completed
                  </span>
                )}
              </div>

              {/* Param: Chronology Horizon */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Chronology Horizon
                </label>
                <CustomDropdown
                  value={goal.horizon}
                  onChange={handleHorizonChange}
                  options={['short_term', 'long_term']}
                  renderTrigger={renderHorizonTrigger}
                  renderOption={renderHorizonOption}
                />
              </div>

              {/* Param: Repetitive Recurrence */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-primary" />
                  <span>Goal Recurrence</span>
                </label>
                <CustomDropdown
                  value={goal.recurrence || 'none'}
                  onChange={handleRecurrenceChange}
                  options={['none', 'daily', 'weekly', 'monthly', 'custom']}
                  renderTrigger={renderRecurrenceTrigger}
                  renderOption={renderRecurrenceOption}
                />
              </div>

              {/* Param: Custom Days Interval */}
              {goal.recurrence === 'custom' && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                    Repeat Every (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={goal.customDays || ''}
                    onChange={(e) => handleCustomDaysChange(parseInt(e.target.value) || null)}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 dark:text-neutral-250 outline-none focus:border-primary/50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all font-semibold font-mono shadow-2xs"
                    placeholder="e.g. 14 for bi-weekly"
                  />
                </div>
              )}

              {/* Param: Connected Project context */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Linked Project
                </label>
                <CustomDropdown
                  value={goal.projectId || ''}
                  onChange={handleProjectChange}
                  options={['', ...projects.map(p => p.id)]}
                  renderTrigger={renderProjectTrigger}
                  renderOption={renderProjectOption}
                />
              </div>

              {/* Param: Responsible Teammate Owner */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-0.5">
                  Responsible Owner
                </label>
                <CustomDropdown
                  value={goal.ownerId || ''}
                  onChange={handleOwnerChange}
                  options={['', ...members.map(m => m.uid)]}
                  renderTrigger={renderOwnerTrigger}
                  renderOption={renderOwnerOption}
                />
              </div>

              {/* Param: Target Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1 px-0.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Target Date</span>
                </label>
                <input
                  type="date"
                  value={getTargetDateString()}
                  onChange={(e) => handleTargetDateChange(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 dark:text-neutral-250 outline-none cursor-pointer focus:border-primary/50 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all font-mono font-bold shadow-2xs"
                />
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
