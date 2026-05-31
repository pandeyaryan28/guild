import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, AlertCircle, Shield, User, Folder, Target, Check, SlidersHorizontal, Trash2
} from 'lucide-react';
import { 
  db, updateTask, moveTask, updatePriority, updateAssignees, updateDueDate, deleteTask
} from '@guild/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Task, UserProfile, Project, Goal, TaskStatus, TaskPriority, ActorInfo } from '@guild/types';

interface TaskDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  users: UserProfile[];
  projects: Project[];
  goals: Goal[];
  actor: ActorInfo;
  refresh: () => void;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  todo:        { label: 'Todo',        color: 'text-zinc-400 border-zinc-500/20', bg: 'bg-zinc-500/10' },
  in_progress: { label: 'In Progress', color: 'text-blue-400 border-blue-500/20', bg: 'bg-blue-500/10' },
  review:      { label: 'Review',      color: 'text-amber-400 border-amber-500/20', bg: 'bg-amber-500/10' },
  done:        { label: 'Done',        color: 'text-emerald-400 border-emerald-500/20', bg: 'bg-emerald-500/10' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  none:   { label: 'None',   color: 'text-zinc-500 border-zinc-500/20', bg: 'bg-zinc-500/10' },
  low:    { label: 'Low',    color: 'text-sky-400 border-sky-500/20', bg: 'bg-sky-500/10' },
  medium: { label: 'Medium', color: 'text-amber-400 border-amber-500/20', bg: 'bg-amber-500/10' },
  high:   { label: 'High',   color: 'text-orange-400 border-orange-500/20', bg: 'bg-orange-500/10' },
  urgent: { label: 'Urgent', color: 'text-rose-500 border-rose-500/20', bg: 'bg-rose-500/10' },
};

export function TaskDetailDrawer({
  isOpen,
  onClose,
  task,
  users,
  projects,
  goals,
  actor,
  refresh,
}: TaskDetailDrawerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('none');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [goalId, setGoalId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // Sync state with task when drawer opens or task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'todo');
      setPriority(task.priority || 'none');
      setAssigneeIds(task.assigneeIds || []);
      setProjectId(task.projectId || '');
      setGoalId(task.goalId || '');
      
      if (task.dueDate) {
        try {
          const date = typeof task.dueDate.toDate === 'function' 
            ? task.dueDate.toDate() 
            : new Date((task.dueDate as any).seconds * 1000);
          setDueDate(date.toISOString().split('T')[0]);
        } catch {
          setDueDate('');
        }
      } else {
        setDueDate('');
      }
    }
  }, [task, isOpen]);

  if (!task) return null;

  const handleTitleBlur = async () => {
    if (!title.trim() || title === task.title) return;
    try {
      await updateTask(task.id, task.orgId, { title: title.trim() }, actor);
      refresh();
    } catch (err) {
      console.error('Failed to update task title:', err);
    }
  };

  const handleDescBlur = async () => {
    if (description === task.description) return;
    try {
      await updateTask(task.id, task.orgId, { description }, actor);
      refresh();
    } catch (err) {
      console.error('Failed to update task description:', err);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      setStatus(newStatus);
      await moveTask(task.id, task.orgId, newStatus, task.orderIndex || 1000, task.status, actor);
      refresh();
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    try {
      setPriority(newPriority);
      await updatePriority(task.id, task.orgId, newPriority, task.priority, actor);
      refresh();
    } catch (err) {
      console.error('Failed to update task priority:', err);
    }
  };

  const handleAssigneeToggle = async (userId: string) => {
    let newIds = [...assigneeIds];
    if (newIds.includes(userId)) {
      newIds = newIds.filter(id => id !== userId);
    } else {
      newIds.push(userId);
    }
    try {
      setAssigneeIds(newIds);
      await updateAssignees(task.id, task.orgId, newIds, task.assigneeIds, actor, task.title);
      refresh();
    } catch (err) {
      console.error('Failed to update task assignees:', err);
    }
  };

  const handleDueDateChange = async (dateStr: string) => {
    try {
      setDueDate(dateStr);
      const date = dateStr ? new Date(dateStr) : null;
      await updateDueDate(task.id, task.orgId, date, actor);
      refresh();
    } catch (err) {
      console.error('Failed to update task due date:', err);
    }
  };

  const handleProjectChange = async (newProjId: string) => {
    try {
      setProjectId(newProjId);
      const docRef = doc(db, 'tasks', task.id);
      await updateDoc(docRef, {
        projectId: newProjId || null,
        updatedAt: serverTimestamp(),
      });
      refresh();
    } catch (err) {
      console.error('Failed to update task project:', err);
    }
  };

  const handleGoalChange = async (newGoalId: string) => {
    try {
      setGoalId(newGoalId);
      const docRef = doc(db, 'tasks', task.id);
      await updateDoc(docRef, {
        goalId: newGoalId || null,
        updatedAt: serverTimestamp(),
      });
      refresh();
    } catch (err) {
      console.error('Failed to update task goal:', err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to permanently delete this task?')) {
      try {
        await deleteTask(task.id);
        refresh();
        onClose();
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end select-none">
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Canvas Slide Over Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-lg h-screen bg-white/80 dark:bg-white/[0.03] backdrop-blur-3xl border-l border-white/10 dark:border-white/5 shadow-2xl flex flex-col justify-between"
          >
            {/* Header controls */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 dark:border-zinc-800/50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[--muted-foreground] px-2 py-0.5 rounded-md border border-white/10 dark:border-white/5 bg-white/5 dark:bg-white/[0.02]">
                  Task Workspace
                </span>
                <span className="text-[9px] font-mono text-zinc-500">ID: {task.id.slice(0, 8)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  title="Delete Task"
                  className="h-8 w-8 rounded-full border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 flex items-center justify-center text-red-400 hover:text-red-300 active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-[--muted-foreground] hover:text-[--foreground] active:scale-95 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable details view */}
            <div className="flex-1 overflow-y-auto aether-scroll p-6 space-y-6">
              {/* Editable Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1">Task Title</label>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  className="w-full text-lg font-black tracking-tight text-[--foreground] border-0 border-b border-transparent focus:border-[--ring] rounded-lg px-1 py-1 focus:outline-none bg-transparent hover:bg-white/5 dark:hover:bg-white/[0.02] focus:bg-white/10 dark:focus:bg-white/[0.04] transition-all"
                  placeholder="Task title..."
                />
              </div>

              {/* Status and Priority Grid */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 dark:border-zinc-900 pt-5">
                {/* Status selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1">Status</label>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] focus:outline-none transition-all cursor-pointer`}
                    >
                      <option value="todo" className="bg-[--surface] text-zinc-300">Todo</option>
                      <option value="in_progress" className="bg-[--surface] text-blue-400">In Progress</option>
                      <option value="review" className="bg-[--surface] text-amber-400">In Review</option>
                      <option value="done" className="bg-[--surface] text-emerald-400">Done</option>
                    </select>
                  </div>
                </div>

                {/* Priority selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="none" className="bg-[--surface] text-zinc-400">None</option>
                    <option value="low" className="bg-[--surface] text-sky-400">Low</option>
                    <option value="medium" className="bg-[--surface] text-amber-400">Medium</option>
                    <option value="high" className="bg-[--surface] text-orange-400">High</option>
                    <option value="urgent" className="bg-[--surface] text-rose-500">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Relational Bindings: Project & Goal */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 dark:border-zinc-900 pt-5">
                {/* Project Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-indigo-400" />
                    Project Binder
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">Unscoped (No project)</option>
                    {projects.map(proj => (
                      <option key={proj.id} value={proj.id} className="bg-[--surface] text-[--foreground]">
                        {proj.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Goal Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                    Strategic Goal Binder
                  </label>
                  <select
                    value={goalId}
                    onChange={(e) => handleGoalChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">Unlinked (No goal)</option>
                    {goals.map(gl => (
                      <option key={gl.id} value={gl.id} className="bg-[--surface] text-[--foreground]">
                        {gl.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date & Assignees */}
              <div className="space-y-5 border-t border-white/5 dark:border-zinc-900 pt-5">
                {/* Due Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    Due Date Deadline
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all cursor-pointer"
                  />
                </div>

                {/* Assignees Checklist */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-500" />
                    Assignees Roster
                  </label>
                  <div className="border border-white/10 dark:border-zinc-800/80 bg-white/[0.03] dark:bg-zinc-900/10 rounded-xl p-3 max-h-[160px] overflow-y-auto space-y-2.5 aether-scroll">
                    {users.map(u => {
                      const isAssigned = assigneeIds.includes(u.uid);
                      return (
                        <label key={u.uid} className="flex items-center justify-between cursor-pointer group select-none">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => handleAssigneeToggle(u.uid)}
                              className="rounded border-white/10 bg-white/[0.06] text-[--primary] focus:ring-[--ring] h-4 w-4 cursor-pointer"
                            />
                            <div>
                              <p className="text-xs font-bold text-[--foreground] group-hover:text-[--primary] transition-colors">
                                {u.fullName || u.username}
                              </p>
                              <p className="text-[9px] text-zinc-400 font-mono">@{u.username}</p>
                            </div>
                          </div>
                          {u.designation && (
                            <span className="text-[9px] font-semibold text-zinc-400 border border-white/5 bg-white/5 px-2 py-0.5 rounded">
                              {u.designation}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Editable Description */}
              <div className="space-y-1.5 border-t border-white/5 dark:border-zinc-900 pt-5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1">Description</label>
                <textarea
                  ref={descRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescBlur}
                  className="w-full px-3.5 py-2.5 border border-white/10 dark:border-zinc-800/60 bg-white/[0.05] dark:bg-zinc-900/10 text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all min-h-[120px] placeholder:text-zinc-500 resize-none"
                  placeholder="Describe the details and deliverables of this task..."
                />
              </div>
            </div>

            {/* Footer with helpful info */}
            <div className="px-6 py-4 bg-white/[0.02] dark:bg-zinc-900/10 border-t border-white/10 dark:border-zinc-800/50 shrink-0 text-center text-[10px] text-zinc-500 font-semibold tracking-wide">
              * Edits auto-save immediately on input selection or clicking out of input fields.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
