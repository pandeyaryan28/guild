import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import type { Organization, UserProfile, Task, Channel, Team, Goal, Project, OrgRequest } from '@guild/types';
import { HqStatCard } from '../components/HqStatCard';
import { FilterBar } from '../components/FilterBar';
import { PeopleWorkloadTable } from '../components/PeopleWorkloadTable';
import { TeamsHealthTable } from '../components/TeamsHealthTable';
import { WorkItemsTable } from '../components/WorkItemsTable';
import { RequestsMappingTable } from '../components/RequestsMappingTable';
import {
  updateOrganizationDetails,
  disableGlobalInviteLink,
  getOrCreateGlobalInviteLink,
  resetGlobalInviteLink,
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
  const [globalInviteLink, setSettingsGlobalInviteLink] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
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

  // Sync form states and global invite token when activeOrg changes
  useEffect(() => {
    if (activeOrg) {
      setOrgFormName(activeOrg.name || '');
      setOrgFormIndustry(activeOrg.industry || '');
      setOrgFormCompanySize(activeOrg.companySize || '');
      if (activeOrg.globalInviteToken) {
        setSettingsGlobalInviteLink(`${window.location.origin}/join/${activeOrg.globalInviteToken}`);
      } else {
        setSettingsGlobalInviteLink('');
      }
    }
    setCopiedLink(false);
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

  const handleSettingsGenerateLink = async () => {
    if (!activeOrg || !currentUser) return;
    setIsGeneratingLink(true);
    try {
      const token = await getOrCreateGlobalInviteLink(activeOrg.id, currentUser.uid);
      setSettingsGlobalInviteLink(`${window.location.origin}/join/${token}`);
      refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to generate global invite link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleSettingsResetLink = async () => {
    if (!activeOrg || !currentUser) return;
    const confirm = window.confirm('Are you sure you want to revoke the active link and generate a new token? The old link will stop working immediately.');
    if (!confirm) return;
    setIsGeneratingLink(true);
    try {
      const token = await resetGlobalInviteLink(activeOrg.id, currentUser.uid);
      setSettingsGlobalInviteLink(`${window.location.origin}/join/${token}`);
      setCopiedLink(false);
      refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to reset global invite link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleSettingsDisableLink = async () => {
    if (!activeOrg) return;
    const confirm = window.confirm('Are you sure you want to completely revoke and disable the global invite link? Workspace membership access using this token will stop working.');
    if (!confirm) return;
    setIsGeneratingLink(true);
    try {
      await disableGlobalInviteLink(activeOrg.id);
      setSettingsGlobalInviteLink('');
      setCopiedLink(false);
      refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to disable global invite link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleSettingsCopyLink = () => {
    navigator.clipboard.writeText(globalInviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

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
  
  // Date Range Filtering for Completed Tasks
  const now = new Date();
  const cutoffDate = 
    overviewDateRange === '7d' ? subDays(now, 7) :
    overviewDateRange === '30d' ? subDays(now, 30) :
    overviewDateRange === '90d' ? subDays(now, 90) : null;

  const completedTasksAll = tasks.filter(t => t.status === 'done');
  const completedTasksInRange = completedTasksAll.filter(t => {
    if (!cutoffDate || !t.updatedAt) return true;
    try {
      return t.updatedAt.toDate() >= cutoffDate;
    } catch {
      return true;
    }
  });

  const doneGoalsCount = goals.filter(g => g.status === 'completed').length;
  const overdueTasksCount = tasks.filter(t => {
    if (t.status === 'done' || !t.dueDate) return false;
    try { return t.dueDate.toDate() < now; } catch { return false; }
  }).length;

  const overdueGoalsCount = goals.filter(g => {
    if (g.status === 'completed' || !g.targetDate) return false;
    try { return g.targetDate.toDate() < now; } catch { return false; }
  }).length;

  const totalOverdue = overdueTasksCount + overdueGoalsCount;
  
  // Combined Completion Ratio
  const totalItemsCount = tasks.length + goals.length;
  const totalDoneCount = completedTasksAll.length + doneGoalsCount;
  const completionRate = totalItemsCount > 0 ? Math.round((totalDoneCount / totalItemsCount) * 100) : 0;

  // Average Completion Rate of Projects
  const projectsWithRates = projects.map(p => {
    const projectTasks = tasks.filter(t => t.projectId === p.id);
    const completedTasks = projectTasks.filter(t => t.status === 'done').length;
    return projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
  });
  const avgCompletionPct = projectsWithRates.length > 0
    ? Math.round(projectsWithRates.reduce((a, b) => a + b, 0) / projectsWithRates.length)
    : 0;

  // OVERVIEW CARDS DATA (5 Premium KPI Cards)
  const STATS_CARDS = [
    {
      label: 'Teammates Load',
      value: users.length,
      color: 'oklch(0.62 0.18 265)', // Indigo
      sub: `${activeMembers} active in organizations`,
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: 'Squads & Teams',
      value: teams.length,
      color: 'oklch(0.65 0.26 300)', // Violet
      sub: 'Active collaborative squad groups',
      icon: <Users2 className="w-5 h-5" />,
    },
    {
      label: 'Initiatives (Projects)',
      value: projects.length,
      color: 'oklch(0.70 0.19 155)', // Emerald Green
      sub: `${avgCompletionPct}% average completion rate`,
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      label: 'Operations Hotspots',
      value: totalOverdue,
      color: 'oklch(0.65 0.22 25)', // Orange/Crimson
      sub: `${overdueTasksCount} overdue tasks · ${overdueGoalsCount} overdue goals`,
      icon: <AlertTriangle className="w-5 h-5 animate-pulse text-red-400" />,
    },
    {
      label: 'Execution Velocity',
      value: `${completionRate}%`,
      color: 'oklch(0.68 0.16 235)', // Sky Blue
      sub: `${totalDoneCount} / ${totalItemsCount} total items completed`,
      icon: <Percent className="w-5 h-5" />,
    },
  ];


  // ─── NEEDS ATTENTION: HOTSPOTS BY USER & TEAM ────────────────────────────
  // 1. Overloaded Users: count overdue tasks assigned to each user
  const userOverdueCounts: Record<string, number> = {};
  tasks.forEach(t => {
    if (t.status !== 'done' && t.dueDate) {
      try {
        if (t.dueDate.toDate() < now) {
          t.assigneeIds?.forEach(uid => {
            userOverdueCounts[uid] = (userOverdueCounts[uid] || 0) + 1;
          });
        }
      } catch {}
    }
  });

  const topOverdueUsers = Object.entries(userOverdueCounts)
    .map(([uid, count]) => ({
      name: userMap[uid] || 'Unknown User',
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 2. Overdue hotspots by team
  const teamOverdueCounts: Record<string, number> = {};
  teams.forEach(tm => {
    const teamUids = [tm.managerId, ...tm.memberIds];
    tasks.forEach(t => {
      if (t.status !== 'done' && t.dueDate) {
        try {
          if (t.dueDate.toDate() < now && t.assigneeIds?.some(uid => teamUids.includes(uid))) {
            teamOverdueCounts[tm.name] = (teamOverdueCounts[tm.name] || 0) + 1;
          }
        } catch {}
      }
    });
  });

  const topOverdueTeams = Object.entries(teamOverdueCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ─── OPTION ARRAYS FOR DROPDOWNS ─────────────────────────────────────────
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
            Guild HQ / {activeSection}
          </h1>
          <p className="text-xs text-[--muted-foreground] font-semibold mt-0.5 tracking-wide">
            HQ Brain operations visible center · Live sync at {format(now, "h:mm a")}
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
        <div className="space-y-8">
          
          {/* Overview Date Filter */}
          <div className="flex justify-end">
            <div className="flex items-center bg-white/[0.02] dark:bg-white/[0.04] border border-white/10 dark:border-white/5 p-0.5 rounded-xl text-[10px] font-semibold">
              {[
                { value: '7d', label: '7 Days' },
                { value: '30d', label: '30 Days' },
                { value: '90d', label: '90 Days' },
                { value: 'all', label: 'All Time' },
              ].map(d => {
                const active = overviewDateRange === d.value;
                return (
                  <button
                    key={d.value}
                    onClick={() => setOverviewDateRange(d.value)}
                    className="px-3.5 py-1.5 rounded-lg transition-all cursor-pointer"
                    style={{
                      background: active ? 'oklch(from var(--primary) l c h / 12%)' : 'transparent',
                      color: active ? 'var(--primary)' : 'var(--muted-foreground)'
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {STATS_CARDS.map((s, i) => (
              <HqStatCard key={s.label} {...s} className={`delay-${i * 100}`} />
            ))}
          </div>

          {/* Hotspots / Operational Alerts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Top Overdue Hotspots (Users) */}
            <div className="aether-glass aether-glass-interactive p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                  Needs Attention: Overloaded Users
                </h3>
                <span className="text-[10px] font-semibold text-[--muted-foreground]">Overdue hot hotspots</span>
              </div>
              <div className="space-y-2">
                {topOverdueUsers.length === 0 ? (
                  <p className="text-xs text-[--muted-foreground]/60 italic py-4">No overdue tasks assigned to users! Great job.</p>
                ) : (
                  topOverdueUsers.map((user, idx) => (
                    <div key={user.name} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[--foreground]">{idx + 1}. {user.name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 text-red-400">
                        {user.count} Overdue Tasks
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Overdue Hotspots (Teams) */}
            <div className="aether-glass aether-glass-interactive p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
                  Needs Attention: Lagging Teams
                </h3>
                <span className="text-[10px] font-semibold text-[--muted-foreground]">Overdue team loads</span>
              </div>
              <div className="space-y-2">
                {topOverdueTeams.length === 0 ? (
                  <p className="text-xs text-[--muted-foreground]/60 italic py-4">All teams are perfectly on schedule!</p>
                ) : (
                  topOverdueTeams.map((team, idx) => (
                    <div key={team.name} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[--foreground]">{idx + 1}. {team.name} Team</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 text-red-400">
                        {team.count} Overdue Tasks
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Pending Requests Hotspots */}
            <div className="aether-glass aether-glass-interactive p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  Needs Attention: Pending Requests
                </h3>
                <span className="text-[10px] font-semibold text-[--muted-foreground]">Outstanding approvals</span>
              </div>
              <div className="space-y-2">
                {pendingRequests.length === 0 ? (
                  <p className="text-xs text-[--muted-foreground]/60 italic py-4">All workspace requests have been fully resolved!</p>
                ) : (
                  pendingRequests.slice(0, 5).map((req, idx) => (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-[--foreground] truncate">{idx + 1}. {req.creatorName}</span>
                        <span className="text-[9px] text-[--muted-foreground] font-semibold truncate">({req.title})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-400 uppercase tracking-wide shrink-0">
                        {req.type.replace('_', ' ')}
                      </span>
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

            {/* 2. Global Invitation Control Center Card */}
            <div className="aether-glass aether-glass-interactive p-5 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[--muted-foreground] flex items-center gap-2">
                    <Key className="w-4.5 h-4.5 text-[--primary]" />
                    Global Invitation Gateway
                  </h3>
                  <span className="text-[10px] font-bold text-[--muted-foreground]/60 uppercase tracking-widest">
                    Workspace Invite Token
                  </span>
                </div>

                <div className="space-y-3.5">
                  <p className="text-xs text-[--muted-foreground] leading-relaxed">
                    The global multi-use invitation link allows anyone to instantly register and join the 
                    <strong className="text-[--foreground] font-bold ml-1">{activeOrg?.name}</strong> workspace. You can copy, reset, or completely revoke/disable the active invitation gateway below.
                  </p>

                  {globalInviteLink ? (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={globalInviteLink}
                          className="flex-1 px-4 py-3 aether-glass-input text-xs font-mono font-medium outline-none"
                        />
                        <button
                          onClick={handleSettingsCopyLink}
                          className="h-11 px-4 rounded-xl text-xs font-bold border border-white/10 dark:border-white/5 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-[--foreground] flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {copiedLink ? 'Copied!' : 'Copy'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2.5 pt-4 border-t border-white/5 mt-4">
                        <button
                          onClick={handleSettingsResetLink}
                          disabled={isGeneratingLink}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-white/10 dark:border-white/5 text-[--muted-foreground] bg-white/[0.03] hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer shadow-inner"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingLink ? 'animate-spin' : ''}`} />
                          Reset invite token
                        </button>
                        <button
                          onClick={handleSettingsDisableLink}
                          disabled={isGeneratingLink}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 active:scale-95 transition-all cursor-pointer shadow-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Disable link access
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-4 text-center">
                      <button
                        onClick={handleSettingsGenerateLink}
                        disabled={isGeneratingLink}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-gradient-to-b from-indigo-500/90 to-indigo-600/90 hover:brightness-105 border-t border-white/20 text-white active:scale-95 transition-all cursor-pointer shadow-lg select-none"
                      >
                        <Key className="w-4 h-4" />
                        {isGeneratingLink ? 'Activating Gateway...' : 'Activate Global Invitation Link'}
                      </button>
                      <p className="text-[10px] text-[--muted-foreground] font-semibold mt-2.5">
                        No active invite link gateway. Click to generate a shareable token.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

