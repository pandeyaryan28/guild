import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, AlertCircle, Shield, User, Folder, Target, Check, SlidersHorizontal, Trash2, Search
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
  const [memberSearch, setMemberSearch] = useState('');

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
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Canvas Slide Over Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-lg h-screen bg-slate-50 border-l border-zinc-200 shadow-2xl flex flex-col justify-between overflow-hidden z-10 text-zinc-800"
          >
            {/* Header controls */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 px-2 py-0.5 rounded-md border border-zinc-200 bg-zinc-50">
                  Task Workspace
                </span>
                <span className="text-[9px] font-mono text-zinc-400">ID: {task.id.slice(0, 8)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  title="Delete Task"
                  className="h-8 w-8 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 hover:text-red-600 active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-full border border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable details view */}
            <div className="flex-1 min-h-0 overflow-y-auto aether-scroll p-6 space-y-6 bg-slate-50/50">
              {/* Editable Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1">Task Title</label>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  className="w-full text-base font-black tracking-tight text-zinc-800 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none bg-white hover:bg-zinc-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-xs"
                  placeholder="Task title..."
                />
              </div>

              {/* Status and Priority Grid */}
              <div className="grid grid-cols-2 gap-4 border-t border-zinc-200/60 pt-5">
                {/* Status selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1">Status</label>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                      className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-xs"
                    >
                      <option value="todo" className="bg-white text-zinc-500 font-semibold">Todo</option>
                      <option value="in_progress" className="bg-white text-blue-500 font-semibold">In Progress</option>
                      <option value="review" className="bg-white text-amber-500 font-semibold">Review</option>
                      <option value="done" className="bg-white text-emerald-500 font-semibold">Done</option>
                    </select>
                  </div>
                </div>

                {/* Priority selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                    className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-xs"
                  >
                    <option value="none" className="bg-white text-zinc-500">None</option>
                    <option value="low" className="bg-white text-sky-500">Low</option>
                    <option value="medium" className="bg-white text-amber-500">Medium</option>
                    <option value="high" className="bg-white text-orange-500 font-semibold">High</option>
                    <option value="urgent" className="bg-white text-rose-600 font-semibold">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Relational Bindings: Project & Goal */}
              <div className="grid grid-cols-2 gap-4 border-t border-zinc-200/60 pt-5">
                {/* Project Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-indigo-500" />
                    Project Binder
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-xs"
                  >
                    <option value="">Unscoped (No project)</option>
                    {projects.map(proj => (
                      <option key={proj.id} value={proj.id} className="bg-white text-zinc-800">
                        {proj.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Goal Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-cyan-500" />
                    Strategic Goal Binder
                  </label>
                  <select
                    value={goalId}
                    onChange={(e) => handleGoalChange(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-xs"
                  >
                    <option value="">Unlinked (No goal)</option>
                    {goals.map(gl => (
                      <option key={gl.id} value={gl.id} className="bg-white text-zinc-800">
                        {gl.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date & Assignees */}
              <div className="space-y-5 border-t border-zinc-200/60 pt-5">
                {/* Due Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    Due Date Deadline
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className="w-full px-3.5 py-3 border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 rounded-xl outline-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-xs"
                  />
                </div>

                {/* Assignees Checklist */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    Assignees Roster
                  </label>

                  {/* Assignees checklist search input */}
                  <div className="relative mb-2 shrink-0">
                    <span className="absolute inset-y-0 left-3 flex items-center text-zinc-400 pointer-events-none">
                      <Search className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search assignees..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 rounded-xl outline-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-2xs"
                    />
                    {memberSearch && (
                      <button
                        type="button"
                        onClick={() => setMemberSearch('')}
                        className="absolute inset-y-0 right-2.5 flex items-center text-zinc-400 hover:text-zinc-700 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="border border-zinc-200 bg-white rounded-xl p-3 max-h-[160px] overflow-y-auto space-y-2.5 aether-scroll shadow-xs">
                    {(() => {
                      const filteredUsers = users.filter(u => 
                        (u.fullName || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
                        (u.username || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
                        (u.designation || '').toLowerCase().includes(memberSearch.toLowerCase())
                      );

                      if (filteredUsers.length === 0) {
                        return (
                          <p className="text-xs text-zinc-400 italic text-center py-4">No assignees match search</p>
                        );
                      }

                      return filteredUsers.map(u => {
                        const isAssigned = assigneeIds.includes(u.uid);
                        return (
                          <label key={u.uid} className="flex items-center justify-between cursor-pointer group select-none">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={() => handleAssigneeToggle(u.uid)}
                                className="rounded border-zinc-300 bg-zinc-50 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                              />
                              <div>
                                <p className="text-xs font-bold text-zinc-800 group-hover:text-indigo-600 transition-colors">
                                  {u.fullName || u.username}
                                </p>
                                <p className="text-[9px] text-zinc-400 font-mono">@{u.username}</p>
                              </div>
                            </div>
                            {u.designation && (
                              <span className="text-[9px] font-semibold text-zinc-500 border border-zinc-200 bg-zinc-50 px-2 py-0.5 rounded">
                                {u.designation}
                              </span>
                            )}
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Editable Description */}
              <div className="space-y-1.5 border-t border-zinc-200/60 pt-5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1">Description</label>
                <textarea
                  ref={descRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescBlur}
                  className="w-full px-3.5 py-3 border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 rounded-xl outline-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all min-h-[120px] placeholder:text-zinc-400 resize-none shadow-xs"
                  placeholder="Describe the details and deliverables of this task..."
                />
              </div>
            </div>

            {/* Footer with helpful info */}
            <div className="px-6 py-4 bg-white border-t border-zinc-200 shrink-0 text-center text-[10px] text-zinc-400 font-semibold tracking-wide">
              * Edits auto-save immediately on input selection or clicking out of input fields.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
