import React, { useState, useMemo } from 'react';
import type { Project, ProjectStatus, Task, UserProfile, Organization, ActorInfo } from '@guild/types';
import { createProject } from '@guild/firebase';
import { format } from 'date-fns';
import {
  Folder, Plus, Search, Grid, List, Calendar, User, Percent,
  ClipboardList, CheckCircle, TrendingUp, X, Briefcase, Clock,
  ArrowRight, ShieldCheck, AlertTriangle, AlertCircle
} from 'lucide-react';

interface ProjectsTableProps {
  projects: Project[];
  tasks: Task[];
  users: UserProfile[];
  orgs: Organization[];
  onSelectProject: (project: Project) => void;
  refresh: () => void;
  activeOrgId: string;
  actor: ActorInfo;
}

export function ProjectsTable({
  projects,
  tasks,
  users,
  orgs,
  onSelectProject,
  refresh,
  activeOrgId,
  actor,
}: ProjectsTableProps) {
  // --- View & Navigation State ---
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // --- Search & Filters State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');

  // --- Create Project Form States ---
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectOrg, setNewProjectOrg] = useState(activeOrgId || (orgs[0]?.id ?? ''));
  const [newProjectOwner, setNewProjectOwner] = useState(actor.uid);
  const [newProjectStart, setNewProjectStart] = useState('');
  const [newProjectDue, setNewProjectDue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // --- Helper: Date Formatter ---
  function fmtDate(ts: any) {
    if (!ts) return '—';
    try {
      // If it's a Firestore Timestamp
      if (ts && typeof ts.toDate === 'function') {
        return format(ts.toDate(), 'MMM d, yyyy');
      }
      // If it's an ordinary Date
      return format(new Date(ts), 'MMM d, yyyy');
    } catch {
      return '—';
    }
  }

  // --- Mapping Lookup Tables ---
  const orgMap = useMemo(() => Object.fromEntries(orgs.map(o => [o.id, o.name])), [orgs]);
  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.uid, u.fullName || u.username])), [users]);

  // --- Helper: Get Project Progress Metrics ---
  const projectMetrics = useMemo(() => {
    const metrics: Record<string, { total: number; completed: number; progress: number }> = {};
    projects.forEach(p => {
      const pTasks = tasks.filter(t => t.projectId === p.id);
      const completed = pTasks.filter(t => t.status === 'done').length;
      const progress = pTasks.length > 0 ? Math.round((completed / pTasks.length) * 100) : 0;
      metrics[p.id] = { total: pTasks.length, completed, progress };
    });
    return metrics;
  }, [projects, tasks]);

  // --- Filtering Logic ---
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesOrg = orgFilter === 'all' || p.orgId === orgFilter;
      const matchesOwner = ownerFilter === 'all' || p.ownerId === ownerFilter;

      return matchesSearch && matchesStatus && matchesOrg && matchesOwner;
    });
  }, [projects, searchQuery, statusFilter, orgFilter, ownerFilter]);

  // --- KPI Stats Calculation ---
  const totalCount = filteredProjects.length;
  const activeCount = filteredProjects.filter(p => p.status === 'active').length;
  const completedCount = filteredProjects.filter(p => p.status === 'completed').length;
  const avgProgress = useMemo(() => {
    if (filteredProjects.length === 0) return 0;
    const progressSums = filteredProjects.map(p => projectMetrics[p.id]?.progress ?? 0);
    return Math.round(progressSums.reduce((a, b) => a + b, 0) / filteredProjects.length);
  }, [filteredProjects, projectMetrics]);

  // --- Project Creation Handler ---
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setCreateError('Project Name is required.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const pOrg = newProjectOrg || activeOrgId || orgs[0]?.id;
      if (!pOrg) {
        throw new Error('No active Organization context found. Create an organization first.');
      }

      await createProject({
        orgId: pOrg,
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        startDate: newProjectStart ? new Date(newProjectStart) : null,
        dueDate: newProjectDue ? new Date(newProjectDue) : null,
        actor: {
          uid: newProjectOwner,
          name: userMap[newProjectOwner] || 'Lead Owner',
        },
      });

      // Reset form states
      setNewProjectName('');
      setNewProjectDesc('');
      setNewProjectStart('');
      setNewProjectDue('');
      setShowCreateForm(false);

      // Trigger hot reload data from parent hook
      refresh();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create project.');
    } finally {
      setIsCreating(false);
    }
  };

  // --- Project Status Badge Helper ---
  function renderStatusBadge(status: ProjectStatus | undefined) {
    const config: Record<string, { bg: string; text: string; label: string; dot: string }> = {
      active: { bg: 'oklch(0.70 0.19 155 / 12%)', text: 'oklch(0.70 0.19 155)', label: 'Active', dot: 'oklch(0.70 0.19 155)' },
      completed: { bg: 'oklch(0.62 0.18 265 / 12%)', text: 'oklch(0.62 0.18 265)', label: 'Completed', dot: 'oklch(0.62 0.18 265)' },
      paused: { bg: 'oklch(0.80 0.18 75 / 12%)', text: 'oklch(0.80 0.18 75)', label: 'Paused', dot: 'oklch(0.80 0.18 75)' },
      archived: { bg: 'oklch(0.62 0.02 265 / 12%)', text: 'oklch(0.62 0.02 265)', label: 'Archived', dot: 'oklch(0.62 0.02 265)' },
    };

    const s = status || 'active';
    const cell = config[s] || config.active;

    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border border-transparent shrink-0 uppercase"
        style={{
          backgroundColor: cell.bg,
          color: cell.text,
          borderColor: `${cell.text}10`
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cell.dot }} />
        {cell.label}
      </span>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* ─── METRICS CARDS PANEL ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Projects */}
        <div className="aether-glass p-5 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider">Total Initiatives</span>
            <div className="text-2xl font-black text-[--foreground] tracking-tight">{totalCount}</div>
            <p className="text-[9px] text-[--muted-foreground]/80">Overall workspace projects loaded</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center text-[--muted-foreground]">
            <Folder className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Active Initiatives */}
        <div className="aether-glass p-5 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider">Active Status</span>
            <div className="text-2xl font-black text-emerald-450 tracking-tight">{activeCount}</div>
            <p className="text-[9px] text-[--muted-foreground]/80">Pipeline initiatives actively in execution</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-450">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Completed Initiatives */}
        <div className="aether-glass p-5 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider">Completed Status</span>
            <div className="text-2xl font-black text-indigo-450 tracking-tight">{completedCount}</div>
            <p className="text-[9px] text-[--muted-foreground]/80">Initiatives delivered & integrated</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-450">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Delivery Progress */}
        <div className="aether-glass p-5 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider">Mean Velocity</span>
            <div className="text-2xl font-black text-cyan-400 tracking-tight">{avgProgress}%</div>
            <p className="text-[9px] text-[--muted-foreground]/80">Average completion progress of projects</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Percent className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─── SEARCH & FILTER TOOLBAR ─── */}
      <div className="aether-glass p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search projects name, scope details..."
            className="w-full pl-9 pr-4 py-2.5 aether-glass-input text-xs font-semibold placeholder:text-[--muted-foreground]/40 focus:outline-none"
          />
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-[--muted-foreground]/40" />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Org Filter (if multiple orgs exist) */}
          {orgs.length > 1 && (
            <select
              value={orgFilter}
              onChange={e => setOrgFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/[0.02] dark:bg-white/[0.04] border border-white/10 dark:border-white/5 text-[--muted-foreground] hover:text-[--foreground] transition-all cursor-pointer shadow-sm outline-none"
            >
              <option value="all">All Organizations</option>
              {orgs.map(o => (
                <option key={o.id} value={o.id} className="bg-[--background] text-[--foreground]">
                  {o.name}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/[0.02] dark:bg-white/[0.04] border border-white/10 dark:border-white/5 text-[--muted-foreground] hover:text-[--foreground] transition-all cursor-pointer shadow-sm outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>

          {/* Owner Lead Filter */}
          <select
            value={ownerFilter}
            onChange={e => setOwnerFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/[0.02] dark:bg-white/[0.04] border border-white/10 dark:border-white/5 text-[--muted-foreground] hover:text-[--foreground] transition-all cursor-pointer shadow-sm outline-none w-48"
          >
            <option value="all">All Project Leads</option>
            {users.map(u => (
              <option key={u.uid} value={u.uid} className="bg-[--background] text-[--foreground]">
                {u.fullName || u.username}
              </option>
            ))}
          </select>

          {/* Spacer */}
          <div className="h-6 w-[1px] bg-white/10 hidden sm:block mx-1" />

          {/* View Toggles */}
          <div className="flex bg-white/[0.03] dark:bg-white/[0.05] border border-white/10 dark:border-white/5 rounded-xl p-0.5 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg cursor-pointer transition-all ${viewMode === 'grid' ? 'bg-white/10 text-[--foreground]' : 'text-[--muted-foreground] hover:text-[--foreground]'}`}
              title="Grid Layout"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg cursor-pointer transition-all ${viewMode === 'table' ? 'bg-white/10 text-[--foreground]' : 'text-[--muted-foreground] hover:text-[--foreground]'}`}
              title="List Layout"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={() => setShowCreateForm(prev => !prev)}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer transition-all active:scale-95"
            style={{
              background: showCreateForm
                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/20'
                : 'linear-gradient(135deg, var(--primary) 0%, oklch(from var(--primary) calc(l - 0.08) c h) 100%)'
            }}
          >
            {showCreateForm ? (
              <>
                <X className="w-3.5 h-3.5" />
                Cancel Form
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Create Project
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── INLINE CREATE PROJECT FORM ─── */}
      {showCreateForm && (
        <div className="aether-glass p-6 animate-fade-in border border-indigo-500/20 shadow-xl space-y-6">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-indigo-400 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              Configure Pipeline Initiative Workspace
            </h3>
            <p className="text-[10px] text-[--muted-foreground] mt-0.5">
              Launch a brand-new strategic project workspace bound to your organization
            </p>
          </div>

          {createError && (
            <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-pulse">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Project Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[--muted-foreground] px-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="e.g., Q3 Cloud Migration Pipeline"
                  className="w-full px-4 py-3 aether-glass-input text-xs font-semibold focus:outline-none"
                />
              </div>

              {/* Lead Owner selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[--muted-foreground] px-1">
                  Project Lead Lead
                </label>
                <select
                  value={newProjectOwner}
                  onChange={e => setNewProjectOwner(e.target.value)}
                  className="w-full px-4 py-3 aether-glass-input text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  {users.map(u => (
                    <option key={u.uid} value={u.uid} className="bg-zinc-950 text-[--foreground]">
                      {u.fullName || u.username} ({u.designation || 'Member'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description Scope */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[--muted-foreground] px-1">
                Project Scope & Strategic Description
              </label>
              <textarea
                value={newProjectDesc}
                onChange={e => setNewProjectDesc(e.target.value)}
                placeholder="Define strategic goals, targeted outcomes, delivery boundaries..."
                className="w-full px-4 py-3 aether-glass-input text-xs font-semibold focus:outline-none min-h-[80px] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[--muted-foreground] px-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={newProjectStart}
                  onChange={e => setNewProjectStart(e.target.value)}
                  className="w-full px-4 py-3 aether-glass-input text-xs font-semibold focus:outline-none cursor-pointer"
                />
              </div>

              {/* Due Date Deadline */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[--muted-foreground] px-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  Due Date Deadline
                </label>
                <input
                  type="date"
                  value={newProjectDue}
                  onChange={e => setNewProjectDue(e.target.value)}
                  className="w-full px-4 py-3 aether-glass-input text-xs font-semibold focus:outline-none cursor-pointer"
                />
              </div>

              {/* Organization Space */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[--muted-foreground] px-1">
                  Organization Workspace
                </label>
                <select
                  value={newProjectOrg}
                  onChange={e => setNewProjectOrg(e.target.value)}
                  className="w-full px-4 py-3 aether-glass-input text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  {orgs.map(o => (
                    <option key={o.id} value={o.id} className="bg-zinc-950 text-[--foreground]">
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold border border-white/10 text-[--muted-foreground] hover:text-[--foreground] hover:bg-white/[0.04] transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-b from-indigo-500/90 to-indigo-600/90 hover:brightness-105 border-t border-white/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-md select-none shrink-0"
              >
                {isCreating ? 'Launching Space...' : 'Launch Project Initiative'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── INITIATIVE RENDERING SECTION ─── */}
      {filteredProjects.length === 0 ? (
        <div className="aether-glass flex flex-col items-center justify-center p-16 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-indigo-500/5 border border-indigo-500/10 mb-4 text-indigo-400">
            <Folder className="w-6 h-6 animate-pulse" />
          </div>
          <h4 className="text-sm font-bold text-[--foreground] uppercase tracking-wide">No Initiatives Found</h4>
          <p className="text-xs text-[--muted-foreground] max-w-sm mt-1">
            No projects in the current workspace match your filter criteria. Adjust your settings or launch a new initiative above!
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW LAYOUT */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((p, i) => {
            const pStats = projectMetrics[p.id] || { total: 0, completed: 0, progress: 0 };
            const pOwnerInitials = userMap[p.ownerId]
              ? userMap[p.ownerId].split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
              : '??';

            return (
              <div
                key={p.id}
                onClick={() => onSelectProject(p)}
                className="aether-glass aether-glass-interactive p-5 space-y-4 hover:scale-[1.01] hover:border-indigo-500/20 active:scale-[0.99] transition-all duration-300 flex flex-col justify-between shadow-xl cursor-pointer"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Header info */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[9px] font-black uppercase tracking-wider text-[--muted-foreground] truncate max-w-[140px]">
                      {orgMap[p.orgId] || 'Squad Space'}
                    </span>
                    {renderStatusBadge(p.status)}
                  </div>
                  <h4 className="text-md font-black tracking-tight text-[--foreground] group-hover:text-indigo-400 transition-colors pt-1 line-clamp-1">
                    {p.name}
                  </h4>
                  <p className="text-xs text-[--muted-foreground]/80 font-medium line-clamp-2 h-9">
                    {p.description || 'No strategic description provided for this project.'}
                  </p>
                </div>

                {/* Progress Indicator */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between text-[10px] font-bold shrink-0">
                    <span className="text-[9px] uppercase tracking-wider text-indigo-400">Progression Rate</span>
                    <span className="text-[--foreground] tabular-nums">{pStats.progress}% ({pStats.completed}/{pStats.total} tasks)</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden shrink-0 border border-white/5 shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                      style={{
                        width: `${pStats.progress}%`,
                        backgroundColor: pStats.progress >= 80 ? 'oklch(0.70 0.19 155)' : pStats.progress >= 40 ? 'oklch(0.80 0.18 75)' : 'oklch(0.65 0.22 25)'
                      }}
                    />
                  </div>
                </div>

                {/* Dates & Owner */}
                <div className="flex items-center justify-between pt-3.5 border-t border-white/5 text-[10px] font-semibold text-[--muted-foreground] shrink-0">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[--muted-foreground]/50" />
                    <span>{fmtDate(p.dueDate)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold max-w-[100px] truncate text-right text-[9px] uppercase tracking-wider">
                      {userMap[p.ownerId]?.split(' ')[0] || 'Unassigned'}
                    </span>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] text-white border border-white/10 shrink-0 shadow-md"
                      style={{
                        background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
                      }}
                      title={userMap[p.ownerId] || 'Owner'}
                    >
                      {pOwnerInitials}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW LAYOUT */
        <div className="overflow-x-auto rounded-2xl border border-white/10 dark:border-white/5 bg-black/10 shadow-xl">
          <table className="w-full text-sm border-collapse select-none">
            <thead>
              <tr className="border-b border-white/10 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-[--muted-foreground]" style={{ background: 'oklch(from var(--muted) l c h / 40%)' }}>
                <th className="text-left px-5 py-4 first:rounded-tl-2xl">Project Name</th>
                <th className="text-left px-4 py-4">Organization</th>
                <th className="text-left px-4 py-4">Status</th>
                <th className="text-left px-4 py-4">Lead Owner</th>
                <th className="text-left px-4 py-4">Progression Velocity</th>
                <th className="text-left px-4 py-4">Target Date</th>
                <th className="text-right px-5 py-4 last:rounded-tr-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProjects.map((p, i) => {
                const pStats = projectMetrics[p.id] || { total: 0, completed: 0, progress: 0 };
                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProject(p)}
                    className="transition-colors hover:bg-[--accent]/30 group cursor-pointer"
                    style={{ background: i % 2 === 0 ? 'transparent' : 'oklch(from var(--card) l c h / 15%)' }}
                  >
                    {/* Title */}
                    <td className="px-5 py-3.5">
                      <div>
                        <span className="font-bold text-sm text-[--foreground] group-hover:text-indigo-400 transition-colors">
                          {p.name}
                        </span>
                        {p.description && (
                          <p className="text-[10px] text-[--muted-foreground] line-clamp-1 max-w-[280px] mt-0.5 font-medium">
                            {p.description}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Org */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-[--muted-foreground] font-semibold">
                        {orgMap[p.orgId] || 'Workspace'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {renderStatusBadge(p.status)}
                    </td>

                    {/* Owner */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[--foreground] font-bold">
                          {userMap[p.ownerId] || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Progress */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3 w-40">
                        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden shrink-0 border border-white/5 shadow-inner">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${pStats.progress}%`,
                              backgroundColor: pStats.progress >= 80 ? 'oklch(0.70 0.19 155)' : pStats.progress >= 40 ? 'oklch(0.80 0.18 75)' : 'oklch(0.65 0.22 25)'
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-[--foreground] tabular-nums shrink-0">{pStats.progress}%</span>
                      </div>
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-[--muted-foreground] font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-[--muted-foreground]/50" />
                        <span>{fmtDate(p.dueDate)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProject(p);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 transition-all cursor-pointer"
                      >
                        Details
                        <ArrowRight className="w-3 h-3 text-indigo-400 ml-0.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
