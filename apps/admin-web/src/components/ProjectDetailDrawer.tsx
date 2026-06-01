import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, AlertCircle, Shield, User, Folder, Check, Trash2, Percent, CheckCircle
} from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
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
                  Pipeline Initiative Workspace
                </span>
                <span className="text-[9px] font-mono text-zinc-400">ID: {project.id.slice(0, 8)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  title="Delete Project"
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
              
              {/* Progression roll-up dashboard */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-100/80 space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Progression Rate</span>
                  <span className="text-zinc-700 tabular-nums font-extrabold">{completionPct}% ({completedTasks}/{projectTasks.length} tasks)</span>
                </div>
                <div className="w-full h-2 bg-zinc-200/60 border border-zinc-200 rounded-full overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${completionPct}%`,
                      backgroundColor: completionPct >= 80 ? '#10b981' : completionPct >= 40 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
              </div>

              {/* Editable Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1">Project Name</label>
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleNameBlur}
                  className="w-full text-base font-black tracking-tight text-zinc-800 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none bg-white hover:bg-zinc-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-xs"
                  placeholder="Project name..."
                />
              </div>

              {/* Status and Owner Lead */}
              <div className="grid grid-cols-2 gap-4 border-t border-zinc-200/60 pt-5">
                {/* Status selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                    className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-xs"
                  >
                    <option value="active" className="bg-white text-emerald-600 font-semibold">Active</option>
                    <option value="paused" className="bg-white text-amber-600 font-semibold">Paused</option>
                    <option value="completed" className="bg-white text-blue-650 font-semibold">Completed</option>
                    <option value="archived" className="bg-white text-zinc-500 font-semibold">Archived</option>
                  </select>
                </div>

                {/* Owner Lead */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    Owner / Lead
                  </label>
                  <SearchableSelect
                    value={ownerId}
                    onChange={handleOwnerChange}
                    options={users.map(u => ({
                      value: u.uid,
                      label: u.fullName || u.username,
                      detail: u.designation || 'Member',
                      photoURL: u.photoURL
                    }))}
                    placeholder="Choose project lead..."
                  />
                </div>
              </div>

              {/* Start Date and Due Date Grid */}
              <div className="grid grid-cols-2 gap-4 border-t border-zinc-200/60 pt-5">
                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-3.5 py-3 border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 rounded-xl outline-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-xs"
                  />
                </div>

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
              </div>

              {/* Description field */}
              <div className="space-y-1.5 border-t border-zinc-200/60 pt-5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1">Project Description</label>
                <textarea
                  ref={descRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescBlur}
                  className="w-full px-3.5 py-3 border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 rounded-xl outline-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all min-h-[120px] placeholder:text-zinc-400 resize-none shadow-xs"
                  placeholder="Define scope, strategic objectives, and target outcomes..."
                />
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white border-t border-zinc-200 shrink-0 text-center text-[10px] text-zinc-400 font-semibold tracking-wide">
              * Edits auto-save immediately on input selection or clicking out of input fields.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
