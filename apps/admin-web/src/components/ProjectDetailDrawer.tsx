import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, AlertCircle, Shield, User, Folder, Check, Trash2, Percent, CheckCircle, Users, ClipboardList, Target, Plus
} from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { 
  db, updateProject, deleteProject
} from '@guild/firebase';
import { Timestamp, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import type { Project, UserProfile, Task, Goal, ProjectStatus, ActorInfo } from '@guild/types';

interface ProjectDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  users: UserProfile[];
  tasks: Task[];
  goals: Goal[];
  actor: ActorInfo;
  refresh: () => void;
}

export function ProjectDetailDrawer({
  isOpen,
  onClose,
  project,
  users,
  tasks,
  goals,
  actor,
  refresh,
}: ProjectDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'tasks' | 'goals'>('general');
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

  // Calculate project-specific metrics
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const completedTasks = projectTasks.filter(t => t.status === 'done').length;
  const completionPct = projectTasks.length > 0 
    ? Math.round((completedTasks / projectTasks.length) * 100) 
    : 0;

  const projectGoals = goals.filter(g => g.projectId === project.id);
  const projectMemberIds = project.memberIds || [];
  const currentMembers = users.filter(u => projectMemberIds.includes(u.uid));
  const nonMembers = users.filter(u => !projectMemberIds.includes(u.uid));

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

  const handleAddMember = async (userId: string) => {
    if (projectMemberIds.includes(userId)) return;
    const newMemberIds = [...projectMemberIds, userId];
    try {
      await updateProject(project.id, { memberIds: newMemberIds });
      refresh();
    } catch (err) {
      console.error('Failed to add project member:', err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const newMemberIds = projectMemberIds.filter(id => id !== userId);
    try {
      await updateProject(project.id, { memberIds: newMemberIds });
      refresh();
    } catch (err) {
      console.error('Failed to remove project member:', err);
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
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/15 dark:bg-black/30 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Canvas Slide Over Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-lg h-screen bg-white border-l border-zinc-200 shadow-2xl flex flex-col justify-between overflow-hidden z-10 text-zinc-800"
          >
            {/* Header controls */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 px-2 py-0.5 rounded-md border border-zinc-200 bg-zinc-50">
                  Project Workspace
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
                  className="h-8 w-8 rounded-full border border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-500 hover:text-zinc-800 active:scale-95 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Segmented active tab selector */}
            <div className="flex border-b border-zinc-200 bg-white px-6 shrink-0 relative z-20">
              {(['general', 'members', 'tasks', 'goals'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-center text-xs font-bold capitalize transition-colors relative cursor-pointer ${
                    activeTab === tab
                      ? 'text-indigo-600'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <span className="relative z-10">{tab}</span>
                  {activeTab === tab && (
                    <motion.div
                      layoutId="project-drawer-active-tab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Scrollable details view */}
            <div className="flex-1 min-h-0 overflow-y-auto aether-scroll p-6 pb-32 space-y-6 bg-zinc-50/50">
              
              {/* TAB 1: General Details */}
              {activeTab === 'general' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Progression Rate Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-100/80 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Progression Rate</span>
                      <span className="text-zinc-700 tabular-nums font-extrabold">{completionPct}% ({completedTasks}/{projectTasks.length} tasks)</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden shrink-0">
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
                        <option value="completed" className="bg-white text-blue-600 font-semibold">Completed</option>
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
              )}

              {/* TAB 2: Project Members */}
              {activeTab === 'members' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Add Member block */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-zinc-400" />
                      Add Member
                    </label>
                    <SearchableSelect
                      value=""
                      onChange={(userId) => {
                        if (userId) handleAddMember(userId);
                      }}
                      options={nonMembers.map(u => ({
                        value: u.uid,
                        label: u.fullName || u.username,
                        detail: u.designation || 'Member',
                        photoURL: u.photoURL
                      }))}
                      placeholder="Search and add a member..."
                    />
                  </div>

                  {/* Current Members list */}
                  <div className="space-y-3 pt-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1">
                      Current Members ({currentMembers.length})
                    </label>
                    {currentMembers.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic px-1">No members assigned to this project yet.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-[420px] overflow-y-auto aether-scroll pr-1">
                        {currentMembers.map(member => (
                          <div 
                            key={member.uid} 
                            className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 bg-white shadow-xs hover:border-zinc-350 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] text-white border border-white/10"
                                style={{
                                  background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
                                }}
                              >
                                {member.fullName ? member.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : member.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-zinc-855">{member.fullName || member.username}</p>
                                <p className="text-[10px] text-zinc-500">{member.designation || 'Member'}</p>
                              </div>
                            </div>
                            {project.ownerId !== member.uid && (
                              <button
                                onClick={() => handleRemoveMember(member.uid)}
                                title="Remove Member"
                                className="p-1.5 rounded-lg border border-zinc-200 hover:bg-red-50 text-zinc-500 hover:text-red-500 cursor-pointer transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Tasks List */}
              {activeTab === 'tasks' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Task Status Overview */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Todo', count: projectTasks.filter(t => t.status === 'todo').length, color: 'bg-zinc-100 text-zinc-600' },
                      { label: 'In Progress', count: projectTasks.filter(t => t.status === 'in_progress').length, color: 'bg-indigo-50 text-indigo-600' },
                      { label: 'Review', count: projectTasks.filter(t => t.status === 'review').length, color: 'bg-amber-50 text-amber-600' },
                      { label: 'Done', count: projectTasks.filter(t => t.status === 'done').length, color: 'bg-emerald-50 text-emerald-600' },
                    ].map(statusGroup => (
                      <div key={statusGroup.label} className={`p-2 rounded-xl border border-zinc-200/50 text-center ${statusGroup.color}`}>
                        <div className="text-[9px] font-extrabold uppercase tracking-wider truncate">{statusGroup.label}</div>
                        <div className="text-base font-black mt-0.5">{statusGroup.count}</div>
                      </div>
                    ))}
                  </div>

                  {/* Tasks List container */}
                  <div className="space-y-3 pt-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1">
                      Project Tasks ({projectTasks.length})
                    </label>
                    {projectTasks.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic px-1">No tasks associated with this project yet.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-[420px] overflow-y-auto aether-scroll pr-1">
                        {projectTasks.map(task => (
                          <div 
                            key={task.id} 
                            className="p-3.5 rounded-xl border border-zinc-200 bg-white shadow-xs hover:border-zinc-300 transition-all flex flex-col gap-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-xs font-semibold text-zinc-800 line-clamp-2 leading-relaxed">{task.title}</h4>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider ${
                                task.status === 'done' ? 'bg-emerald-50 text-emerald-600' :
                                task.status === 'review' ? 'bg-amber-50 text-amber-600' :
                                task.status === 'in_progress' ? 'bg-indigo-50 text-indigo-600' :
                                'bg-zinc-100 text-zinc-600'
                              }`}>
                                {task.status.replace('_', ' ')}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-100 pt-2.5">
                              <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                task.priority === 'urgent' ? 'bg-red-500/10 text-red-500' :
                                task.priority === 'high' ? 'bg-amber-500/10 text-amber-500' :
                                task.priority === 'medium' ? 'bg-blue-500/10 text-blue-500' :
                                'bg-zinc-500/10 text-zinc-400'
                              }`}>
                                {task.priority} priority
                              </span>
                              {task.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(typeof task.dueDate.toDate === 'function' ? task.dueDate.toDate() : (task.dueDate as any).seconds * 1000).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Strategic Goals List */}
              {activeTab === 'goals' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block px-1">
                      Strategic Goals ({projectGoals.length})
                    </label>
                    {projectGoals.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic px-1">No goals associated with this project yet.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-[420px] overflow-y-auto aether-scroll pr-1">
                        {projectGoals.map(goal => (
                          <div 
                            key={goal.id} 
                            className="p-3.5 rounded-xl border border-zinc-200 bg-white shadow-xs hover:border-zinc-300 transition-all flex flex-col gap-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-xs font-semibold text-zinc-800 line-clamp-2 leading-relaxed">{goal.title}</h4>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider ${
                                goal.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                goal.status === 'cancelled' ? 'bg-rose-50 text-rose-600' :
                                'bg-cyan-50 text-cyan-600'
                              }`}>
                                {goal.status}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-100 pt-2.5">
                              <span className="capitalize px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-bold">
                                {goal.horizon.replace('_', ' ')}
                              </span>
                              {goal.targetDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(typeof goal.targetDate.toDate === 'function' ? goal.targetDate.toDate() : (goal.targetDate as any).seconds * 1000).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

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
