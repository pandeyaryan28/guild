import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, AlertCircle, Shield, User, Folder, Target, Check, Trash2, Percent
} from 'lucide-react';
import { 
  db, updateGoal, deleteGoal
} from '@guild/firebase';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Goal, UserProfile, Project, GoalStatus, GoalHorizon, ActorInfo } from '@guild/types';

interface GoalDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  users: UserProfile[];
  projects: Project[];
  actor: ActorInfo;
  refresh: () => void;
}

export function GoalDetailDrawer({
  isOpen,
  onClose,
  goal,
  users,
  projects,
  actor,
  refresh,
}: GoalDetailDrawerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<GoalStatus>('active');
  const [horizon, setHorizon] = useState<GoalHorizon>('short_term');
  const [ownerId, setOwnerId] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [targetDate, setTargetDate] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // Sync state with goal when drawer opens or goal changes
  useEffect(() => {
    if (goal) {
      setTitle(goal.title || '');
      setDescription(goal.description || '');
      setStatus(goal.status || 'active');
      setHorizon(goal.horizon || 'short_term');
      setOwnerId(goal.ownerId || '');
      setProjectId(goal.projectId || '');
      
      if (goal.targetDate) {
        try {
          const date = typeof goal.targetDate.toDate === 'function' 
            ? goal.targetDate.toDate() 
            : new Date((goal.targetDate as any).seconds * 1000);
          setTargetDate(date.toISOString().split('T')[0]);
        } catch {
          setTargetDate('');
        }
      } else {
        setTargetDate('');
      }
    }
  }, [goal, isOpen]);

  if (!goal) return null;

  const handleTitleBlur = async () => {
    if (!title.trim() || title === goal.title) return;
    try {
      await updateGoal(goal.id, { title: title.trim() });
      refresh();
    } catch (err) {
      console.error('Failed to update goal title:', err);
    }
  };

  const handleDescBlur = async () => {
    if (description === goal.description) return;
    try {
      await updateGoal(goal.id, { description });
      refresh();
    } catch (err) {
      console.error('Failed to update goal description:', err);
    }
  };

  const handleStatusChange = async (newStatus: GoalStatus) => {
    try {
      setStatus(newStatus);
      const completedAtPatch = newStatus === 'completed' 
        ? { completedAt: Timestamp.now() } 
        : { completedAt: null };
      await updateGoal(goal.id, { status: newStatus, ...completedAtPatch });
      refresh();
    } catch (err) {
      console.error('Failed to update goal status:', err);
    }
  };

  const handleHorizonChange = async (newHorizon: GoalHorizon) => {
    try {
      setHorizon(newHorizon);
      await updateGoal(goal.id, { horizon: newHorizon });
      refresh();
    } catch (err) {
      console.error('Failed to update goal horizon:', err);
    }
  };

  const handleOwnerChange = async (newOwnerId: string) => {
    try {
      setOwnerId(newOwnerId);
      await updateGoal(goal.id, { ownerId: newOwnerId });
      refresh();
    } catch (err) {
      console.error('Failed to update goal owner:', err);
    }
  };

  const handleProjectChange = async (newProjId: string) => {
    try {
      setProjectId(newProjId);
      await updateGoal(goal.id, { projectId: newProjId || null });
      refresh();
    } catch (err) {
      console.error('Failed to update goal project:', err);
    }
  };

  const handleTargetDateChange = async (dateStr: string) => {
    try {
      setTargetDate(dateStr);
      const date = dateStr ? new Date(dateStr) : null;
      await updateGoal(goal.id, { targetDate: date ? Timestamp.fromDate(date) : null });
      refresh();
    } catch (err) {
      console.error('Failed to update goal target date:', err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to permanently delete this goal? Associated tasks will lose their goal binding.')) {
      try {
        await deleteGoal(goal.id);
        refresh();
        onClose();
      } catch (err) {
        console.error('Failed to delete goal:', err);
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
                  Strategic Goal Workspace
                </span>
                <span className="text-[9px] font-mono text-zinc-500">ID: {goal.id.slice(0, 8)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  title="Delete Goal"
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
              
              {/* Progress meter banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-white/10 dark:border-zinc-800/80 flex items-center justify-between shadow-inner">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400">Progression Rate</span>
                  <p className="text-xs text-[--muted-foreground] font-semibold">Synced aggregate completion</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-extrabold text-sm shadow-sm tabular-nums">
                    {goal.progressRollup ?? 0}%
                  </div>
                </div>
              </div>

              {/* Editable Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1">Goal Title</label>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  className="w-full text-lg font-black tracking-tight text-[--foreground] border-0 border-b border-transparent focus:border-[--ring] rounded-lg px-1 py-1 focus:outline-none bg-transparent hover:bg-white/5 dark:hover:bg-white/[0.02] focus:bg-white/10 dark:focus:bg-white/[0.04] transition-all"
                  placeholder="Goal title..."
                />
              </div>

              {/* Status and Horizon Grid */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 dark:border-zinc-900 pt-5">
                {/* Status selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as GoalStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="active" className="bg-[--surface] text-cyan-400 font-semibold">Active</option>
                    <option value="completed" className="bg-[--surface] text-emerald-400 font-semibold">Completed</option>
                    <option value="cancelled" className="bg-[--surface] text-rose-400 font-semibold">Cancelled</option>
                  </select>
                </div>

                {/* Horizon selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1">Horizon Type</label>
                  <select
                    value={horizon}
                    onChange={(e) => handleHorizonChange(e.target.value as GoalHorizon)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="short_term" className="bg-[--surface] text-[--foreground]">Short Term</option>
                    <option value="long_term" className="bg-[--surface] text-[--foreground]">Long Term</option>
                  </select>
                </div>
              </div>

              {/* Project binding & Owner Lead */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 dark:border-zinc-900 pt-5">
                {/* Project Binder */}
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
                    <option value="">Choose owner lead...</option>
                    {users.map(u => (
                      <option key={u.uid} value={u.uid} className="bg-[--surface] text-[--foreground]">
                        {u.fullName || u.username} ({u.designation || 'Member'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target date deadline */}
              <div className="space-y-1.5 border-t border-white/5 dark:border-zinc-900 pt-5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  Target Date Deadline
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => handleTargetDateChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all cursor-pointer"
                />
              </div>

              {/* Description field */}
              <div className="space-y-1.5 border-t border-white/5 dark:border-zinc-900 pt-5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block px-1">Goal Description</label>
                <textarea
                  ref={descRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescBlur}
                  className="w-full px-3.5 py-2.5 border border-white/10 dark:border-zinc-800/60 bg-white/[0.05] dark:bg-zinc-900/10 text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all min-h-[120px] placeholder:text-zinc-500 resize-none"
                  placeholder="Define the strategic objective, timeline, and targets..."
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
