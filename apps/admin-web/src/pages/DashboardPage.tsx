import React, { useState } from 'react';
import { format, subDays } from 'date-fns';
import type { Organization, UserProfile, Task, Channel, Team, Goal, TaskActivity } from '@guild/types';
import { HqStatCard } from '../components/HqStatCard';
import { FilterBar } from '../components/FilterBar';
import { PeopleWorkloadTable } from '../components/PeopleWorkloadTable';
import { TeamsHealthTable } from '../components/TeamsHealthTable';
import { WorkItemsTable } from '../components/WorkItemsTable';
import { ActivityFeed } from '../components/ActivityFeed';
import {
  Users,
  Building,
  ClipboardList,
  Target,
  AlertTriangle,
  CheckCircle2,
  Percent,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface DashboardPageProps {
  activeSection: string;
  orgs:     Organization[];
  users:    UserProfile[];
  tasks:    Task[];
  channels: Channel[];
  teams:    Team[];
  goals:    Goal[];
  activities: TaskActivity[];
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
  activities,
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

  // ─── STATES FOR ACTIVITY SCREEN ──────────────────────────────────────────
  const [actOrg, setActOrg] = useState<string>('all');
  const [actUser, setActUser] = useState<string>('all');
  const [actDate, setActDate] = useState<string>('30d');

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

  // OVERVIEW CARDS DATA
  const STATS_CARDS = [
    {
      label: 'Total Org Users',
      value: users.length,
      color: 'oklch(0.62 0.18 265)', // var(--primary)
      sub: `${activeMembers} active in organizations`,
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: 'Total Organizations',
      value: totalOrgs,
      color: 'oklch(0.65 0.26 300)',
      sub: 'Active organization spaces',
      icon: <Building className="w-5 h-5" />,
    },
    {
      label: 'Tasks Operational Load',
      value: tasks.length,
      color: 'oklch(0.68 0.16 235)',
      sub: `${completedTasksInRange.length} done in last ${overviewDateRange === 'all' ? 'all' : overviewDateRange}`,
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      label: 'Overdue hot hotspots',
      value: totalOverdue,
      color: 'oklch(0.65 0.22 25)',
      sub: `${overdueTasksCount} overdue tasks · ${overdueGoalsCount} overdue goals`,
      icon: <AlertTriangle className="w-5 h-5 animate-pulse text-red-400" />,
    },
    {
      label: 'Active Strategic Goals',
      value: goals.length,
      color: 'oklch(0.80 0.18 75)',
      sub: `${doneGoalsCount} completed goals`,
      icon: <Target className="w-5 h-5" />,
    },
    {
      label: 'Execution Completion Rate',
      value: `${completionRate}%`,
      color: 'oklch(0.70 0.19 155)',
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
                     border border-[--border] text-[--muted-foreground] bg-black/10 hover:bg-black/30
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
            <div className="flex items-center bg-[--input] border border-[--border] p-0.5 rounded-xl text-[10px] font-semibold">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STATS_CARDS.map((s, i) => (
              <HqStatCard key={s.label} {...s} className={`delay-${i * 100}`} />
            ))}
          </div>

          {/* Hotspots / Operational Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top Overdue Hotspots (Users) */}
            <div className="glass border border-[--border] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[--border] pb-2.5">
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
            <div className="glass border border-[--border] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[--border] pb-2.5">
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
          />
        </div>
      )}

      {activeSection === 'teams' && (
        <div className="space-y-6">
          {/* Teams Table & Manager reporter trees */}
          <TeamsHealthTable
            teams={teams}
            users={users}
            tasks={tasks}
            goals={goals}
            orgs={orgs}
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

      {activeSection === 'activity' && (
        <div className="space-y-6">
          {/* Filters */}
          <FilterBar
            filters={[
              {
                id: 'org',
                label: 'Organization',
                value: actOrg,
                options: orgOptions,
                onChange: setActOrg,
              },
              {
                id: 'user',
                label: 'User',
                value: actUser,
                options: userOptions,
                onChange: setActUser,
              },
            ]}
            dateRanges={[
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
              { value: 'all', label: 'All Time' },
            ]}
            activeDateRange={actDate}
            onDateRangeChange={setActDate}
            hasActiveFilters={actOrg !== 'all' || actUser !== 'all' || actDate !== '30d'}
            onClearFilters={() => {
              setActOrg('all');
              setActUser('all');
              setActDate('30d');
            }}
          />

          {/* Timeline Feed */}
          <ActivityFeed
            activities={activities}
            users={users}
            orgs={orgs}
            tasks={tasks}
            orgFilter={actOrg}
            userFilter={actUser}
            dateFilter={actDate}
          />
        </div>
      )}

    </div>
  );
}
