import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, AlertCircle, Shield, User, Folder, Check, Trash2, Percent, CheckCircle
} from 'lucide-react';
import { 
  db, updateProject, deleteProject
} from '@guild/firebase';
import { Timestamp, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import type { Project, UserProfile, Task, ProjectStatus, ActorInfo } from '@guild/types';

interface ProjectDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  users: UserProfile[];
  tasks: Task[];
  actor: ActorInfo;
  refresh: () => void;
}

export function ProjectDetailDrawer({
  isOpen,
  onClose,
  project,
  users,
  tasks,
  actor,
  refresh,
}: ProjectDetailDrawerProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [ownerId, setOwnerId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // Sync state with project when drawer opens or project changes
  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setStatus(project.status || 'active');
      setOwnerId(project.ownerId || '');
      
      const formatDate = (stamp: Timestamp | null | undefined) => {
        if (!stamp) return '';
        try {
          const date = typeof stamp.toDate === 'function' 
            ? stamp.toDate() 
            : new Date((stamp as any).seconds * 1000);
          return date.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      setStartDate(formatDate(project.startDate));
      setDueDate(formatDate(project.dueDate));
    }
  }, [project, isOpen]);

  if (!project) return null;

  // Calculate project-specific task completion metrics
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const completedTasks = projectTasks.filter(t => t.status === 'done').length;
  const completionPct = projectTasks.length > 0 
    ? Math.round((completedTasks / projectTasks.length) * 100) 
    : 0;

  const handleNameBlur = async () => {
    if (!name.trim() || name === project.name) return;
    try {
      await updateProject(project.id, { name: name.trim() });
      refresh();
    } catch (err) {
      console.error('Failed to update project name:', err);
    }
  };

  const handleDescBlur = async () => {
    if (description === project.description) return;
    try {
      await updateProject(project.id, { description });
      refresh();
    } catch (err) {
      console.error('Failed to update project description:', err);
    }
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    try {
      setStatus(newStatus);
      await updateProject(project.id, { status: newStatus });
      refresh();
    } catch (err) {
      console.error('Failed to update project status:', err);
    }
  };

  const handleOwnerChange = async (newOwnerId: string) => {
    try {
      setOwnerId(newOwnerId);
      const docRef = doc(db, 'projects', project.id);
      await updateDoc(docRef, {
        ownerId: newOwnerId,
        updatedAt: serverTimestamp(),
      });
      refresh();
    } catch (err) {
      console.error('Failed to update project owner:', err);
    }
  };

  const handleStartDateChange = async (dateStr: string) => {
    try {
      setStartDate(dateStr);
      const date = dateStr ? new Date(dateStr) : null;
      await updateProject(project.id, { startDate: date ? Timestamp.fromDate(date) : null });
      refresh();
    } catch (err) {
      console.error('Failed to update project start date:', err);
    }
  };

  const handleDueDateChange = async (dateStr: string) => {
    try {
      setDueDate(dateStr);
      const date = dateStr ? new Date(dateStr) : null;
      await updateProject(project.id, { dueDate: date ? Timestamp.fromDate(date) : null });
      refresh();
    } catch (err) {
      console.error('Failed to update project due date:', err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to permanently delete this project? Relational tasks will remain but lose their project binding.')) {
      try {
        await deleteProject(project.id);
        refresh();
        onClose();
      } catch (err) {
        console.error('Failed to delete project:', err);
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
                  Pipeline Initiative Workspace
                </span>
                <span className="text-[9px] font-mono text-zinc-500">ID: {project.id.slice(0, 8)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  title="Delete Project"
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
              
              {/* Progression roll-up dashboard */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border border-white/10 dark:border-zinc-800/80 space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Progression Rate</span>
                  <span className="text-[--foreground] tabular-nums font-extrabold">{completionPct}% ({completedTasks}/{projectTasks.length} tasks)</span>
                </div>
                <div className="w-full h-2 bg-white/5 border border-white/5 rounded-full overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${completionPct}%`,
                      backgroundColor: completionPct >= 80 ? 'var(--status-done)' : completionPct >= 40 ? 'var(--status-review)' : 'var(--destructive)'
                    }}
                  />
                </div>
              </div>

              {/* Editable Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1">Project Name</label>
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleNameBlur}
                  className="w-full text-lg font-black tracking-tight text-[--foreground] border-0 border-b border-transparent focus:border-[--ring] rounded-lg px-1 py-1 focus:outline-none bg-transparent hover:bg-white/5 dark:hover:bg-white/[0.02] focus:bg-white/10 dark:focus:bg-white/[0.04] transition-all"
                  placeholder="Project name..."
                />
              </div>

              {/* Status and Owner Lead */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 dark:border-zinc-900 pt-5">
                {/* Status selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="active" className="bg-[--surface] text-emerald-400 font-semibold">Active</option>
                    <option value="paused" className="bg-[--surface] text-amber-400 font-semibold">Paused</option>
                    <option value="completed" className="bg-[--surface] text-blue-450 font-semibold">Completed</option>
                    <option value="archived" className="bg-[--surface] text-zinc-500 font-semibold">Archived</option>
                  </select>
                </div>

                {/* Owner Lead */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-500" />
                    Owner / Lead
                  </label>
                  <select
                    value={ownerId}
                    onChange={(e) => handleOwnerChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">Choose project lead...</option>
                    {users.map(u => (
                      <option key={u.uid} value={u.uid} className="bg-[--surface] text-[--foreground]">
                        {u.fullName || u.username} ({u.designation || 'Member'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Date and Due Date Grid */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 dark:border-zinc-900 pt-5">
                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all cursor-pointer"
                  />
                </div>

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
              </div>

              {/* Description field */}
              <div className="space-y-1.5 border-t border-white/5 dark:border-zinc-900 pt-5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1">Project Description</label>
                <textarea
                  ref={descRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescBlur}
                  className="w-full px-3.5 py-2.5 border border-white/10 dark:border-zinc-800/60 bg-white/[0.05] dark:bg-zinc-900/10 text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all min-h-[120px] placeholder:text-zinc-500 resize-none"
                  placeholder="Define scope, strategic objectives, and target outcomes..."
                />
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white/[0.02] dark:bg-zinc-900/10 border-t border-white/10 dark:border-zinc-800/50 shrink-0 text-center text-[10px] text-zinc-500 font-semibold tracking-wide">
              * Edits auto-save immediately on input selection or clicking out of input fields.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
