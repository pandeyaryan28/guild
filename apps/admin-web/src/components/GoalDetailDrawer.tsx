import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, AlertCircle, Shield, User, Folder, Check, Trash2, Percent, CheckCircle
} from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { 
  db, updateGoal, deleteGoal
} from '@guild/firebase';
import { Timestamp, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
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
  const [projectId, setProjectId] = useState('');
  const [ownerId, setOwnerId] = useState('');
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
      setProjectId(goal.projectId || '');
      setOwnerId(goal.ownerId || '');
      
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

      setTargetDate(formatDate(goal.targetDate));
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
      await updateGoal(goal.id, { status: newStatus });
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

  const handleProjectChange = async (newProjectId: string) => {
    try {
      setProjectId(newProjectId);
      await updateGoal(goal.id, { projectId: newProjectId || null });
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
    if (window.confirm('Are you sure you want to permanently delete this strategic goal? Relational tasks will lose their goal binding.')) {
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
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Canvas Slide Over Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-lg h-screen bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col justify-between overflow-hidden z-10 text-zinc-850 dark:text-zinc-100"
          >
            {/* Header controls */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  Strategic Goal Workspace
                </span>
                <span className="text-[9px] font-mono text-zinc-400">ID: {goal.id.slice(0, 8)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  title="Delete Goal"
                  className="h-8 w-8 rounded-full border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 flex items-center justify-center text-red-500 hover:text-red-600 active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 active:scale-95 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable details view */}
            <div className="flex-1 min-h-0 overflow-y-auto aether-scroll p-6 space-y-6 bg-zinc-50/30 dark:bg-zinc-900/10">
              
              {/* Progress meter banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-50 to-indigo-50 dark:from-cyan-950/20 dark:to-indigo-950/20 border border-cyan-100/80 dark:border-cyan-900/30 flex items-center justify-between shadow-xs">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Progression Rate</span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">Synced aggregate completion</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-cyan-205 text-cyan-600 dark:text-cyan-400 font-extrabold text-sm shadow-sm tabular-nums">
                    {goal.progressRollup ?? 0}%
                  </div>
                </div>
              </div>

              {/* Editable Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block px-1">Goal Title</label>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  className="w-full text-base font-black tracking-tight text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-85/50 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-xs"
                  placeholder="Goal title..."
                />
              </div>

              {/* Status and Horizon Grid */}
              <div className="grid grid-cols-2 gap-4 border-t border-zinc-200/60 dark:border-zinc-850 pt-5">
                {/* Status selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-550 dark:text-zinc-400 block px-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as GoalStatus)}
                    className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-850 dark:text-zinc-150 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-xs"
                  >
                    <option value="active" className="bg-white dark:bg-zinc-900 text-cyan-600 dark:text-cyan-455 font-semibold">Active</option>
                    <option value="completed" className="bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-455 font-semibold">Completed</option>
                    <option value="cancelled" className="bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-455 font-semibold">Cancelled</option>
                  </select>
                </div>

                {/* Horizon selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-550 dark:text-zinc-400 block px-1">Horizon Type</label>
                  <select
                    value={horizon}
                    onChange={(e) => handleHorizonChange(e.target.value as GoalHorizon)}
                    className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-850 dark:text-zinc-150 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-xs"
                  >
                    <option value="short_term" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-150">Short Term</option>
                    <option value="long_term" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-150">Long Term</option>
                  </select>
                </div>
              </div>

              {/* Project binding & Owner Lead */}
              <div className="grid grid-cols-2 gap-4 border-t border-zinc-200/60 dark:border-zinc-850 pt-5">
                {/* Project Binder */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-550 dark:text-zinc-400 block px-1 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-indigo-500" />
                    Project Binder
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-850 dark:text-zinc-150 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-xs"
                  >
                    <option value="">Unscoped (No project)</option>
                    {projects.map(proj => (
                      <option key={proj.id} value={proj.id} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-150">
                        {proj.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Owner Lead */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-555 dark:text-zinc-400 block px-1 flex items-center gap-1.5">
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
                    placeholder="Choose owner lead..."
                  />
                </div>
              </div>

              {/* Target date deadline */}
              <div className="space-y-1.5 border-t border-zinc-200/60 dark:border-zinc-850 pt-5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-555 dark:text-zinc-400 block px-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  Target Date Deadline
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => handleTargetDateChange(e.target.value)}
                  className="w-full px-3.5 py-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-800 dark:text-zinc-150 rounded-xl outline-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-xs"
                />
              </div>

              {/* Description field */}
              <div className="space-y-1.5 border-t border-zinc-200/60 dark:border-zinc-850 pt-5">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-555 dark:text-zinc-400 block px-1">Goal Description</label>
                <textarea
                  ref={descRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescBlur}
                  className="w-full px-3.5 py-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-800 dark:text-zinc-150 rounded-xl outline-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all min-h-[120px] placeholder:text-zinc-400 dark:placeholder:text-zinc-650 resize-none shadow-xs"
                  placeholder="Define the strategic objective, timeline, and targets..."
                />
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0 text-center text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wide">
              * Edits auto-save immediately on input selection or clicking out of input fields.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
