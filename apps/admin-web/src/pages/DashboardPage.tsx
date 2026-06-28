import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import type { Organization, UserProfile, Task, Channel, Team, Goal, Project, OrgRequest } from '@guild/types';
import { HqStatCard } from '../components/HqStatCard';
import { FilterBar } from '../components/FilterBar';
import { PeopleWorkloadTable } from '../components/PeopleWorkloadTable';
import { TeamsHealthTable } from '../components/TeamsHealthTable';
import { WorkItemsTable } from '../components/WorkItemsTable';
import { RequestsMappingTable } from '../components/RequestsMappingTable';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer';
import { GoalDetailDrawer } from '../components/GoalDetailDrawer';
import { ProjectDetailDrawer } from '../components/ProjectDetailDrawer';
import { ProjectsTable } from '../components/ProjectsTable';
import { AnimatePresence } from 'motion/react';
import {
  updateOrganizationDetails,
  auth
} from '@guild/firebase';

import {
  Users,
  Users2,
  Building,
  ClipboardList,
  Target,
  AlertTriangle,
  CheckCircle2,
  Percent,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldAlert,
  Crown,
  Key,
  Copy,
  Briefcase,
  Trash2,
  GitPullRequest
} from 'lucide-react';


interface DashboardPageProps {
  activeSection: string;
  orgs:     Organization[];
  users:    UserProfile[];
  tasks:    Task[];
  channels: Channel[];
  teams:    Team[];
  goals:    Goal[];
  projects: Project[];
  requests: OrgRequest[];
  loading:  boolean;
  error:    string | null;
  refresh:  () => void;
}

export function DashboardPage({
  activeSection,
  orgs,
  users,
  tasks,
  channels,
  teams,
  goals,
  projects,
  requests,
  loading,
  error,
  refresh
}: DashboardPageProps) {
  
  // ─── STATE FOR OVERVIEW ──────────────────────────────────────────────────
  const [overviewDateRange, setOverviewDateRange] = useState<string>('30d');
  const [activeCardTab, setActiveCardTab] = useState<'projects' | 'requests' | 'work' | 'available_members'>('projects');

  // ─── STATES FOR DRAWER CANVASES ──────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // ─── STATES FOR PEOPLE SCREEN ────────────────────────────────────────────
  const [peopleSearch, setPeopleSearch] = useState<string>('');
  const [peopleRole, setPeopleRole] = useState<string>('all');
  const [peopleOrg, setPeopleOrg] = useState<string>('all');

  // ─── STATES FOR WORK SCREEN ──────────────────────────────────────────────
  const [workSearch, setWorkSearch] = useState<string>('');
  const [workStatus, setWorkStatus] = useState<string>('all');
  const [workPriority, setWorkPriority] = useState<string>('all');
  const [workAssignee, setWorkAssignee] = useState<string>('all');
  const [workTeam, setWorkTeam] = useState<string>('all');
  const [workOrg, setWorkOrg] = useState<string>('all');



  // ─── STATES FOR SETTINGS SCREEN ──────────────────────────────────────────
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [orgFormName, setOrgFormName] = useState('');
  const [orgFormIndustry, setOrgFormIndustry] = useState('');
  const [orgFormCompanySize, setOrgFormCompanySize] = useState('');
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentUser = useMemo(() => {
    const uid = auth.currentUser?.uid;
    return users.find(u => u.uid === uid);
  }, [users]);

  const activeOrg = useMemo(() => {
    return orgs.find(o => o.id === selectedOrgId) || orgs.find(o => o.id === currentUser?.organizationId) || orgs[0];
  }, [selectedOrgId, orgs, currentUser]);

  const pendingRequests = useMemo(() => {
    return requests.filter(r => r.status === 'pending');
  }, [requests]);

  const now = useMemo(() => new Date(), []);

  // Available members calculation (no assigned active tasks or goals)
  const assignedUserIds = useMemo(() => {
    const ids = new Set<string>();
    tasks.forEach(t => {
      if (t.status !== 'done' && t.assigneeIds) {
        t.assigneeIds.forEach(id => ids.add(id));
      }
    });
    goals.forEach(g => {
      if (g.status !== 'completed' && g.ownerId) {
        ids.add(g.ownerId);
      }
    });
    return ids;
  }, [tasks, goals]);

  const availableMembers = useMemo(() => {
    return users.filter(u => !assignedUserIds.has(u.uid));
  }, [users, assignedUserIds]);

  // Overdue Members List with Details
  const overdueMembersList = useMemo(() => {
    return users.map(u => {
      const userTasks = tasks.filter(t => t.assigneeIds?.includes(u.uid) && t.status !== 'done');
      const overdueTasks = userTasks.filter(t => {
        if (!t.dueDate) return false;
        try {
          return t.dueDate.toDate() < now;
        } catch {
          return false;
        }
      });
      return {
        user: u,
        overdueTasks,
      };
    }).filter(item => item.overdueTasks.length > 0);
  }, [users, tasks, now]);

  // Overdue Teams List with Details
  const overdueTeamsList = useMemo(() => {
    return teams.map(team => {
      const teamUids = [team.managerId, ...team.memberIds];
      const teamTasks = tasks.filter(t => t.assigneeIds?.some(uid => teamUids.includes(uid)) && t.status !== 'done');
      const overdueTasks = teamTasks.filter(t => {
        if (!t.dueDate) return false;
        try {
          return t.dueDate.toDate() < now;
        } catch {
          return false;
        }
      });
      return {
        team,
        overdueTasks,
      };
    }).filter(item => item.overdueTasks.length > 0);
  }, [teams, tasks, now]);

  // Sync form states and global invite token when activeOrg changes
  useEffect(() => {
    if (activeOrg) {
      setOrgFormName(activeOrg.name || '');
      setOrgFormIndustry(activeOrg.industry || '');
      setOrgFormCompanySize(activeOrg.companySize || '');
    }
  }, [activeOrg]);

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 rounded-lg animate-shimmer" />
          <div className="h-9 w-24 rounded-lg animate-shimmer" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl animate-shimmer" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
        <div className="h-64 rounded-2xl animate-shimmer" />
        <div className="h-64 rounded-2xl animate-shimmer" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4 text-center p-8">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/20">
          <ShieldAlert className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[--foreground]">Failed to load admin data</p>
          <p className="text-xs text-[--muted-foreground] mt-1">{error}</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[--primary] text-[--primary-foreground] hover:opacity-90 transition-opacity cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </button>
      </div>
    );
  }

  const orgMap = Object.fromEntries(orgs.map(o => [o.id, o.name]));
  const userMap = Object.fromEntries(users.map(u => [u.uid, u.fullName || u.username]));



  const handleSaveOrgDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setIsSavingOrg(true);
    setSaveSuccess(false);
    try {
      await updateOrganizationDetails(activeOrg.id, {
        name: orgFormName.trim(),
        industry: orgFormIndustry.trim(),
        companySize: orgFormCompanySize.trim()
      });
      setSaveSuccess(true);
      refresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save organization properties');
    } finally {
      setIsSavingOrg(false);
    }
  };


  // ─── OVERVIEW METRIC CALCULATIONS ───────────────────────────────────────
  const activeMembers = users.filter(u => u.organizationId).length;
  const totalOrgs = orgs.length;
  
  // Filter tasks & goals in-flight
  const activeTasksCount = tasks.filter(t => t.status !== 'done').length;
  const activeGoalsCount = goals.filter(g => g.status !== 'completed').length;
  const activeProjectsCount = projects.filter(p => p.status !== 'completed').length;
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

  // Combined Completion Ratio
  const totalItemsCount = tasks.length + goals.length;
  const totalDoneCount = tasks.filter(t => t.status === 'done').length + goals.filter(g => g.status === 'completed').length;
  const completionRate = totalItemsCount > 0 ? Math.round((totalDoneCount / totalItemsCount) * 100) : 0;

  const getDaysLate = (ts: any) => {
    if (!ts) return 0;
    try {
      const due = ts.toDate();
      const diff = now.getTime() - due.getTime();
      return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  };



  // Keep dropdown options in case they are referenced in other sections
  const orgOptions = [
    { value: 'all', label: 'All Organizations' },
    ...orgs.map(o => ({ value: o.id, label: o.name }))
  ];

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'owner', label: 'Owner' },
    { value: 'admin', label: 'Admin' },
    { value: 'member', label: 'Member' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'todo', label: 'Todo' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
  ];

  const goalStatusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'none', label: 'None' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const userOptions = [
    { value: 'all', label: 'All Members' },
    ...users.map(u => ({ value: u.uid, label: u.fullName || u.username }))
  ];

  const teamOptions = [
    { value: 'all', label: 'All Teams' },
    ...teams.map(t => ({ value: t.id, label: t.name }))
  ];

  // ─── RENDER ENGINE FOR SELECTED TAB ──────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto pb-20 select-none">
      
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-black text-[--foreground] tracking-tight uppercase">
            Guild Orbit / {activeSection}
          </h1>
          <p className="text-xs text-[--muted-foreground] font-semibold mt-0.5 tracking-wide">
            Live updates · Last synced at {format(now, "h:mm a")}
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 self-start sm:self-center px-4 py-2 rounded-xl text-xs font-semibold
                     border border-white/10 dark:border-white/5 text-[--muted-foreground] bg-white/[0.03] hover:bg-white/[0.08]
                     hover:text-[--foreground] hover:border-[--ring] transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Data
        </button>
      </div>

      {/* ────────────────── SECTION ROUTING ────────────────── */}

      {activeSection === 'overview' && (
        <div className="space-y-8 animate-fade-up">
          {/* ─── ORGANIZATION BANNER ─── */}
          <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 lg:p-8 shadow-sm">
            {/* Soft, professional gradient glows (strictly non-dark) */}
            <div className="absolute right-0 top-0 w-72 h-72 rounded-full bg-indigo-50/50 filter blur-3xl pointer-events-none -z-10" />
            <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-full bg-sky-50/30 filter blur-3xl pointer-events-none -z-10" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900">
                  {activeOrg?.name || 'Workspace'}
                </h2>
                <p className="text-sm text-zinc-500 max-w-xl">
                  Manage your organization's members, projects, requests, and tasks.
                </p>
                
                {/* Org Details badges */}
                <div className="flex flex-wrap gap-2.5 pt-1 text-xs">
                  {activeOrg?.industry && (
                    <span className="px-3 py-1 rounded-xl bg-zinc-50 border border-zinc-100 text-zinc-600">
                      Sector: <span className="font-semibold text-zinc-900">{activeOrg.industry}</span>
                    </span>
                  )}
                  {activeOrg?.companySize && (
                    <span className="px-3 py-1 rounded-xl bg-zinc-50 border border-zinc-100 text-zinc-600">
                      Company Size: <span className="font-semibold text-zinc-900">{activeOrg.companySize}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-zinc-50/80 border border-zinc-100/80 divide-x divide-zinc-200/50 lg:min-w-[420px]">
                <div className="px-3">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Members</div>
                  <div className="text-2xl font-black text-zinc-800 mt-1">{users.length}</div>
                </div>
                <div className="px-4">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Teams</div>
                  <div className="text-2xl font-black text-zinc-800 mt-1">{teams.length}</div>
                </div>
                <div className="px-4">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Projects</div>
                  <div className="text-2xl font-black text-zinc-800 mt-1">{projects.length}</div>
                </div>
                <div className="px-4">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Channels</div>
                  <div className="text-2xl font-black text-zinc-800 mt-1">{channels.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── INTERACTIVE METRIC CARDS ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Active Projects Card */}
            <div 
              onClick={() => setActiveCardTab('projects')}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden select-none bg-white
                ${activeCardTab === 'projects' 
                  ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-md' 
                  : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-sm'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Active Projects</span>
                <div className={`p-2 rounded-xl ${activeCardTab === 'projects' ? 'bg-indigo-50 text-indigo-600' : 'bg-zinc-50 text-zinc-400'}`}>
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-zinc-800">{activeProjectsCount}</span>
                <span className="text-xs text-zinc-400">currently active</span>
              </div>
            </div>

            {/* 2. Pending Requests Card */}
            <div 
              onClick={() => setActiveCardTab('requests')}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden select-none bg-white
                ${activeCardTab === 'requests' 
                  ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-md' 
                  : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-sm'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pending Requests</span>
                <div className={`p-2 rounded-xl ${activeCardTab === 'requests' ? 'bg-indigo-50 text-indigo-600' : 'bg-zinc-50 text-zinc-400'}`}>
                  <GitPullRequest className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-zinc-800">{pendingRequestsCount}</span>
                <span className="text-xs text-zinc-400 font-semibold">awaiting approval</span>
              </div>
            </div>

            {/* 3. Active Tasks / Goals Card */}
            <div 
              onClick={() => setActiveCardTab('work')}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden select-none bg-white
                ${activeCardTab === 'work' 
                  ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-md' 
                  : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-sm'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Active Tasks & Goals</span>
                <div className={`p-2 rounded-xl ${activeCardTab === 'work' ? 'bg-indigo-50 text-indigo-600' : 'bg-zinc-50 text-zinc-400'}`}>
                  <ClipboardList className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-zinc-800">{activeTasksCount + activeGoalsCount}</span>
                <span className="text-xs text-zinc-400">items in flight</span>
              </div>
            </div>

            {/* 4. Available Members Card */}
            <div 
              onClick={() => setActiveCardTab('available_members')}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden select-none bg-white
                ${activeCardTab === 'available_members' 
                  ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-md' 
                  : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-sm'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Available Members</span>
                <div className={`p-2 rounded-xl ${activeCardTab === 'available_members' ? 'bg-indigo-50 text-indigo-600' : 'bg-zinc-50 text-zinc-400'}`}>
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-zinc-800">{availableMembers.length}</span>
                <span className="text-xs text-zinc-400 font-semibold">without assignments</span>
              </div>
            </div>
          </div>

          {/* ─── DYNAMIC DETAILS TABLE VIEW ─── */}
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
                {activeCardTab === 'projects' && <Briefcase className="w-4.5 h-4.5 text-indigo-500" />}
                {activeCardTab === 'requests' && <GitPullRequest className="w-4.5 h-4.5 text-indigo-500" />}
                {activeCardTab === 'work' && <ClipboardList className="w-4.5 h-4.5 text-indigo-500" />}
                {activeCardTab === 'available_members' && <Users className="w-4.5 h-4.5 text-indigo-500" />}
                {activeCardTab === 'projects' && 'Active Projects Directory'}
                {activeCardTab === 'requests' && 'Pending Workspace Requests'}
                {activeCardTab === 'work' && 'Active Workloads (Tasks & Goals)'}
                {activeCardTab === 'available_members' && 'Available Capacity (Unassigned Members)'}
              </h3>
              <span className="text-xs font-semibold text-zinc-400">
                {activeCardTab === 'projects' && `${activeProjectsCount} item(s) found`}
                {activeCardTab === 'requests' && `${pendingRequestsCount} item(s) found`}
                {activeCardTab === 'work' && `${activeTasksCount + activeGoalsCount} item(s) found`}
                {activeCardTab === 'available_members' && `${availableMembers.length} member(s) found`}
              </span>
            </div>

            <div className="overflow-x-auto">
              {activeCardTab === 'projects' && (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[10px] uppercase font-bold text-zinc-400 bg-zinc-50/50 animate-fade-in">
                      <th className="px-4 py-3">Project Name</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Lead Owner</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {projects.filter(p => p.status !== 'completed').length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-zinc-400 italic">No active projects found in this workspace.</td>
                      </tr>
                    ) : (
                      projects.filter(p => p.status !== 'completed').map(p => (
                        <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors animate-fade-in">
                          <td className="px-4 py-3 font-bold text-zinc-800">{p.name}</td>
                          <td className="px-4 py-3 text-zinc-500 max-w-sm truncate">{p.description || '—'}</td>
                          <td className="px-4 py-3 text-zinc-600 font-semibold">{userMap[p.ownerId] || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wide">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeCardTab === 'requests' && (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[10px] uppercase font-bold text-zinc-400 bg-zinc-50/50 animate-fade-in">
                      <th className="px-4 py-3">Requester</th>
                      <th className="px-4 py-3">Request Details</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {requests.filter(r => r.status === 'pending').length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-zinc-400 italic">No pending requests found in this workspace.</td>
                      </tr>
                    ) : (
                      requests.filter(r => r.status === 'pending').map(r => (
                        <tr key={r.id} className="hover:bg-zinc-50/60 transition-colors animate-fade-in">
                          <td className="px-4 py-3 font-bold text-zinc-800">{r.creatorName || 'Unknown User'}</td>
                          <td className="px-4 py-3 text-zinc-500 max-w-sm truncate">{r.title || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-wide">
                              {r.type?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-400 font-mono text-[10px]">
                            {r.createdAt ? format(r.createdAt.toDate(), "MMM dd, yyyy") : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeCardTab === 'work' && (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[10px] uppercase font-bold text-zinc-400 bg-zinc-50/50 animate-fade-in">
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Assignee / Owner</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Target Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {tasks.filter(t => t.status !== 'done').length === 0 && goals.filter(g => g.status !== 'completed').length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-zinc-400 italic">No active tasks or goals found.</td>
                      </tr>
                    ) : (
                      <>
                        {tasks.filter(t => t.status !== 'done').map(t => (
                          <tr key={t.id} className="hover:bg-zinc-50/60 transition-colors animate-fade-in">
                            <td className="px-4 py-3 font-bold text-zinc-800">{t.title}</td>
                            <td className="px-4 py-3 text-zinc-400 uppercase font-bold tracking-wider text-[9px]">Task</td>
                            <td className="px-4 py-3 text-zinc-600">
                              {t.assigneeIds && t.assigneeIds.map(id => userMap[id] || id).join(', ') || 'Unassigned'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                t.priority === 'urgent' ? 'bg-red-50 text-red-600 border border-red-100' :
                                t.priority === 'high' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                t.priority === 'medium' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                'bg-zinc-50 text-zinc-600 border border-zinc-100'
                              }`}>
                                {t.priority || 'medium'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-500">
                              {t.dueDate ? format(t.dueDate.toDate(), "MMM dd, yyyy") : 'No due date'}
                            </td>
                          </tr>
                        ))}
                        {goals.filter(g => g.status !== 'completed').map(g => (
                          <tr key={g.id} className="hover:bg-zinc-50/60 transition-colors animate-fade-in">
                            <td className="px-4 py-3 font-bold text-zinc-800">{g.title}</td>
                            <td className="px-4 py-3 text-indigo-400 uppercase font-bold tracking-wider text-[9px]">Strategic Goal</td>
                            <td className="px-4 py-3 text-zinc-600">{userMap[g.ownerId] || '—'}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wide">
                                Active
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-500">
                              {g.targetDate ? format(g.targetDate.toDate(), "MMM dd, yyyy") : '—'}
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              )}

              {activeCardTab === 'available_members' && (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[10px] uppercase font-bold text-zinc-400 bg-zinc-50/50 animate-fade-in">
                      <th className="px-4 py-3">Member Name</th>
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">Designation</th>
                      <th className="px-4 py-3">Role Badge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {availableMembers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-zinc-400 italic">All organization members are currently assigned to tasks or goals.</td>
                      </tr>
                    ) : (
                      availableMembers.map(u => (
                        <tr key={u.uid} className="hover:bg-zinc-50/60 transition-colors animate-fade-in">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                                {(u.fullName || u.username || '?').slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-bold text-zinc-800">{u.fullName || '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-zinc-400 font-mono">@{u.username}</td>
                          <td className="px-4 py-3 text-zinc-500 font-semibold">{u.designation || 'Member'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wide">
                              Available Capacity
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ─── TWIN OVERDUE TRACKING PANELS ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">
            {/* Panel 1: Members with Overdue Tasks */}
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                  Members with Overdue Tasks
                </h3>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {overdueMembersList.length} user(s) late
                </span>
              </div>

              <div className="space-y-3 max-h-[360px] overflow-y-auto aether-scroll pr-1">
                {overdueMembersList.length === 0 ? (
                  <div className="text-center py-10 text-zinc-400 italic text-xs">
                    All members have completed or kept up with their deadlines. Great job!
                  </div>
                ) : (
                  overdueMembersList.map(({ user, overdueTasks }) => (
                    <div key={user.uid} className="p-4 rounded-2xl bg-zinc-50/50 border border-zinc-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-red-50 text-red-500 border border-red-100 shrink-0">
                            {(user.fullName || user.username || '?').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-800 text-xs leading-none">{user.fullName || '—'}</div>
                            <div className="text-[10px] text-zinc-400 mt-1 leading-none">@{user.username} · {user.designation || 'Member'}</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider">
                          {overdueTasks.length} Overdue
                        </span>
                      </div>

                      <div className="space-y-1.5 pl-1.5 border-l-2 border-red-200">
                        {overdueTasks.map(t => (
                          <div key={t.id} className="flex items-center justify-between text-[11px] text-zinc-600 py-0.5">
                            <span className="font-semibold truncate max-w-[200px]">{t.title}</span>
                            <span className="text-[10px] text-red-500 font-bold shrink-0">
                              ({getDaysLate(t.dueDate)} days late)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Panel 2: Teams with Overdue Tasks */}
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
                  Teams with Overdue Tasks
                </h3>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {overdueTeamsList.length} team(s) late
                </span>
              </div>

              <div className="space-y-3 max-h-[360px] overflow-y-auto aether-scroll pr-1">
                {overdueTeamsList.length === 0 ? (
                  <div className="text-center py-10 text-zinc-400 italic text-xs">
                    All collaborative teams are fully on schedule. Great work!
                  </div>
                ) : (
                  overdueTeamsList.map(({ team, overdueTasks }) => (
                    <div key={team.id} className="p-4 rounded-2xl bg-zinc-50/50 border border-zinc-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-zinc-800 text-xs uppercase tracking-wider">{team.name} Team</div>
                          <div className="text-[10px] text-zinc-400 mt-1 font-semibold">Manager: {userMap[team.managerId] || '—'}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider">
                          {overdueTasks.length} Overdue
                        </span>
                      </div>

                      <div className="space-y-1.5 pl-1.5 border-l-2 border-red-200">
                        {overdueTasks.map(t => (
                          <div key={t.id} className="flex items-center justify-between text-[11px] text-zinc-600 py-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold truncate">{t.title}</span>
                              <span className="text-[9px] text-zinc-400 truncate">
                                (Assigned: {t.assigneeIds?.map(id => userMap[id] || id).join(', ')})
                              </span>
                            </div>
                            <span className="text-[10px] text-red-500 font-bold shrink-0 ml-1.5">
                              ({getDaysLate(t.dueDate)} days late)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'people' && (
        <div className="space-y-6">
          {/* People Filterbar */}
          <FilterBar
            searchPlaceholder="Search people by name, username, or job designation..."
            searchValue={peopleSearch}
            onSearchChange={setPeopleSearch}
            filters={[
              {
                id: 'org',
                label: 'Organization',
                value: peopleOrg,
                options: orgOptions,
                onChange: setPeopleOrg,
              },
              {
                id: 'role',
                label: 'Role',
                value: peopleRole,
                options: roleOptions,
                onChange: setPeopleRole,
              },
            ]}
            hasActiveFilters={peopleSearch !== '' || peopleRole !== 'all' || peopleOrg !== 'all'}
            onClearFilters={() => {
              setPeopleSearch('');
              setPeopleRole('all');
              setPeopleOrg('all');
            }}
          />

          {/* People Workload Table */}
          <PeopleWorkloadTable
            users={users}
            tasks={tasks}
            goals={goals}
            teams={teams}
            orgs={orgs}
            searchQuery={peopleSearch}
            roleFilter={peopleRole}
            orgFilter={peopleOrg}
            refresh={refresh}
          />
        </div>
      )}

      {activeSection === 'teams' && (
        <div className="space-y-6">
          {/* Teams Table & Manager reporter trees */}
          <TeamsHealthTable
            teams={teams}
            projects={projects}
            users={users}
            tasks={tasks}
            goals={goals}
            orgs={orgs}
            refresh={refresh}
            onSelectProject={setSelectedProject}
          />
        </div>
      )}

      {activeSection === 'work' && (
        <div className="space-y-6">
          {/* Filters */}
          <FilterBar
            searchPlaceholder="Search task titles, strategic goal descriptions..."
            searchValue={workSearch}
            onSearchChange={setWorkSearch}
            filters={[
              {
                id: 'org',
                label: 'Organization',
                value: workOrg,
                options: orgOptions,
                onChange: setWorkOrg,
              },
              {
                id: 'status',
                label: 'Status',
                value: workStatus,
                options: statusOptions,
                onChange: setWorkStatus,
              },
              {
                id: 'priority',
                label: 'Priority',
                value: workPriority,
                options: priorityOptions,
                onChange: setWorkPriority,
              },
              {
                id: 'assignee',
                label: 'Assignee',
                value: workAssignee,
                options: userOptions,
                onChange: setWorkAssignee,
              },
              {
                id: 'team',
                label: 'Team',
                value: workTeam,
                options: teamOptions,
                onChange: setWorkTeam,
              },
            ]}
            hasActiveFilters={
              workSearch !== '' ||
              workStatus !== 'all' ||
              workPriority !== 'all' ||
              workAssignee !== 'all' ||
              workTeam !== 'all' ||
              workOrg !== 'all'
            }
            onClearFilters={() => {
              setWorkSearch('');
              setWorkStatus('all');
              setWorkPriority('all');
              setWorkAssignee('all');
              setWorkTeam('all');
              setWorkOrg('all');
            }}
          />

          {/* WorkItemsTable */}
          <WorkItemsTable
            tasks={tasks}
            goals={goals}
            users={users}
            teams={teams}
            orgs={orgs}
            searchQuery={workSearch}
            statusFilter={workStatus}
            priorityFilter={workPriority}
            assigneeFilter={workAssignee}
            teamFilter={workTeam}
            orgFilter={workOrg}
            onSelectTask={setSelectedTask}
            onSelectGoal={setSelectedGoal}
          />
        </div>
      )}



      {activeSection === 'projects' && (
        <div className="space-y-6">
          <ProjectsTable
            projects={projects}
            tasks={tasks}
            users={users}
            orgs={orgs}
            onSelectProject={setSelectedProject}
            refresh={refresh}
            activeOrgId={activeOrg?.id || currentUser?.organizationId || ''}
            actor={{
              uid: currentUser?.uid || '',
              name: currentUser?.fullName || currentUser?.username || 'Admin',
            }}
          />
        </div>
      )}

      {activeSection === 'requests' && (
        <div className="space-y-6">
          <RequestsMappingTable
            requests={requests}
            users={users}
            teams={teams}
            activeOrgId={activeOrg?.id || currentUser?.organizationId || ''}
            refresh={refresh}
          />
        </div>
      )}



      {activeSection === 'settings' && (
        <div className="space-y-8 animate-fade-up">
          {/* Org Selector at the top if there are multiple orgs */}
          <div className="aether-glass p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[--muted-foreground] flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                Workspace Configurator Selection
              </h3>
              <p className="text-[10px] text-[--muted-foreground] font-semibold tracking-wide">
                Select which active organization space to manage and customize properties
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[--muted-foreground] shrink-0">Selected Org:</span>
              <select
                value={activeOrg?.id || ''}
                onChange={e => setSelectedOrgId(e.target.value)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/[0.02] dark:bg-white/[0.04] border border-white/10 dark:border-white/5 text-[--foreground]
                           focus:border-[--ring] outline-none cursor-pointer w-64 shadow-inner"
              >
                {orgs.map(o => (
                  <option key={o.id} value={o.id} className="bg-[--background] text-[--foreground]">
                    {o.name} {o.id === currentUser?.organizationId ? '(Your Active Org)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Organization Properties Form Card */}
            <div className="aether-glass aether-glass-interactive p-5 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[--muted-foreground] flex items-center gap-2">
                    <Building className="w-4.5 h-4.5 text-[--primary]" />
                    Organization Properties
                  </h3>
                  <span className="text-[10px] font-bold text-[--muted-foreground]/60 uppercase tracking-widest">
                    ID: {activeOrg?.id || 'N/A'}
                  </span>
                </div>

                {activeOrg ? (
                  <form onSubmit={handleSaveOrgDetails} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[--muted-foreground] px-1">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        required
                        value={orgFormName}
                        onChange={e => setOrgFormName(e.target.value)}
                        className="w-full px-4 py-3 aether-glass-input text-xs font-semibold placeholder:text-[--muted-foreground]/40 focus:outline-none transition-all"
                        placeholder="Enter organization name"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[--muted-foreground] px-1">
                          Industry Sector
                        </label>
                        <select
                          value={orgFormIndustry}
                          onChange={e => setOrgFormIndustry(e.target.value)}
                          className="w-full px-4 py-3 aether-glass-input text-xs font-semibold focus:outline-none transition-all cursor-pointer"
                        >
                          <option value="" className="bg-[--background]">Select Industry</option>
                          <option value="Tech" className="bg-[--background]">Tech / Software</option>
                          <option value="Finance" className="bg-[--background]">Finance</option>
                          <option value="Health" className="bg-[--background]">Health / Biotech</option>
                          <option value="Education" className="bg-[--background]">Education</option>
                          <option value="Agency" className="bg-[--background]">Agency / Studio</option>
                          <option value="E-Commerce" className="bg-[--background]">E-Commerce</option>
                          <option value="Other" className="bg-[--background]">Other</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[--muted-foreground] px-1">
                          Company Size
                        </label>
                        <select
                          value={orgFormCompanySize}
                          onChange={e => setOrgFormCompanySize(e.target.value)}
                          className="w-full px-4 py-3 aether-glass-input text-xs font-semibold focus:outline-none transition-all cursor-pointer"
                        >
                          <option value="" className="bg-[--background]">Select Size</option>
                          <option value="1-10" className="bg-[--background]">1-10 Employees</option>
                          <option value="11-50" className="bg-[--background]">11-50 Employees</option>
                          <option value="51-200" className="bg-[--background]">51-200 Employees</option>
                          <option value="201-500" className="bg-[--background]">201-500 Employees</option>
                          <option value="500+" className="bg-[--background]">500+ Employees</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-6">
                      <div className="flex items-center gap-2">
                        {saveSuccess && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-lg animate-fade-in">
                            ✓ Details updated successfully
                          </span>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={isSavingOrg}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-b from-indigo-500/90 to-indigo-600/90 hover:brightness-105 border-t border-white/20 text-white
                                   active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all cursor-pointer shadow-md select-none shrink-0"
                      >
                        {isSavingOrg ? 'Saving Workspace...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-xs text-[--muted-foreground] italic">No active organization selected to configure.</p>
                )}
              </div>
            </div>


          </div>
        </div>
      )}

      {/* ─── DETAIL CANVAS DRAWERS ─── */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailDrawer
            isOpen={!!selectedTask}
            onClose={() => setSelectedTask(null)}
            task={selectedTask}
            users={users}
            projects={projects}
            goals={goals}
            actor={{
              uid: currentUser?.uid || '',
              name: currentUser?.fullName || currentUser?.username || 'Admin',
            }}
            refresh={refresh}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedGoal && (
          <GoalDetailDrawer
            isOpen={!!selectedGoal}
            onClose={() => setSelectedGoal(null)}
            goal={selectedGoal}
            users={users}
            projects={projects}
            actor={{
              uid: currentUser?.uid || '',
              name: currentUser?.fullName || currentUser?.username || 'Admin',
            }}
            refresh={refresh}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProject && (
          <ProjectDetailDrawer
            isOpen={!!selectedProject}
            onClose={() => setSelectedProject(null)}
            project={selectedProject}
            users={users}
            tasks={tasks}
            goals={goals}
            actor={{
              uid: currentUser?.uid || '',
              name: currentUser?.fullName || currentUser?.username || 'Admin',
            }}
            refresh={refresh}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

