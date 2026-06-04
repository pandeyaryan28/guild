import * as React from 'react';
import { Users, CheckSquare, Clock, AlertTriangle, Target, Loader2, ChevronDown } from 'lucide-react';
import { getManagerTeamReport } from '../../lib/reports';
import type { MemberContribution } from '../../lib/reports';
import { getUserById } from '../../lib/firestore';
import { listenToManagedTeams } from '../../lib/teams';
import { KpiCards } from './KpiCards';
import type { KpiCardData } from './KpiCards';
import { StatusDistribution } from './StatusDistribution';
import { ContributionTable } from './ContributionTable';
import type { ReportFiltersState } from './types';
import type { UserProfile } from '../../lib/firestore';
import type { Team } from '@guild/types';
import { useTasks } from '../../hooks/useTasks';
import { ReportTasksList } from './ReportTasksList';
import type { Task } from '../../lib/tasks';
import type { Project } from '../../lib/projects';
import type { Goal } from '../../lib/goals';

interface Props {
  orgId: string;
  managerId: string;
  filters: ReportFiltersState;
  onSelectTask: (task: Task) => void;
  projects: Project[];
  goals: Goal[];
  onSelectGoal: (goal: Goal) => void;
}

type KpiType = 'assigned' | 'completed' | 'in_progress' | 'overdue';

export function TeamReportTab({
  orgId,
  managerId,
  filters,
  onSelectTask,
  projects,
  goals,
  onSelectGoal,
}: Props) {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>('all');
  const [memberProfiles, setMemberProfiles] = React.useState<UserProfile[]>([]);
  const [data, setData] = React.useState<{
    totalTasks: number; completedTasks: number; inProgressTasks: number; overdueTasks: number;
    totalGoals: number; completedGoals: number; members: MemberContribution[];
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedKpi, setSelectedKpi] = React.useState<KpiType | null>(null);

  // Load real-time tasks to display list matching KPI selection
  const { tasks: allOrgTasks } = useTasks(orgId);

  // Listen to managed teams
  React.useEffect(() => {
    return listenToManagedTeams(orgId, managerId, setTeams);
  }, [orgId, managerId]);

  // Fetch member profiles when teams change
  React.useEffect(() => {
    const memberIds = [...new Set(teams.flatMap((t) => t.memberIds))];
    if (memberIds.length === 0) {
      setMemberProfiles([]);
      setLoading(false);
      return;
    }
    Promise.all(memberIds.map((id) => getUserById(id)))
      .then((profiles) => setMemberProfiles(profiles.filter(Boolean) as UserProfile[]))
      .catch(console.error);
  }, [teams]);

  // Memoize member profiles filtered by the selected team
  const filteredMemberProfiles = React.useMemo(() => {
    if (selectedTeamId === 'all') return memberProfiles;
    const targetTeam = teams.find(t => t.id === selectedTeamId);
    if (!targetTeam) return [];
    return memberProfiles.filter(m => targetTeam.memberIds?.includes(m.uid));
  }, [memberProfiles, teams, selectedTeamId]);

  const memberIds = React.useMemo(() => {
    return filteredMemberProfiles.map((m) => m.uid);
  }, [filteredMemberProfiles]);

  const teamTasks = React.useMemo(() => {
    if (memberIds.length === 0) return [];
    return allOrgTasks.filter((t) => t.assigneeIds.some((id) => memberIds.includes(id)));
  }, [allOrgTasks, memberIds]);

  const filteredTasks = React.useMemo(() => {
    const to = new Date();
    const from = new Date();
    if (filters.datePreset === '7d') from.setDate(from.getDate() - 7);
    else if (filters.datePreset === '30d') from.setDate(from.getDate() - 30);
    else if (filters.datePreset === '90d') from.setDate(from.getDate() - 90);
    else {
      from.setTime(filters.customFrom ? filters.customFrom.getTime() : 0);
      to.setTime(filters.customTo ? filters.customTo.getTime() : to.getTime());
    }

    return teamTasks.filter((t) => {
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      
      const updated = t.updatedAt?.toDate?.() ?? new Date(0);
      const created = t.createdAt?.toDate?.() ?? new Date(0);
      return (updated >= from && updated <= to) || (created >= from && created <= to);
    });
  }, [teamTasks, filters]);

  const displayedTasks = React.useMemo(() => {
    if (!selectedKpi) return [];
    if (selectedKpi === 'assigned') return filteredTasks;
    if (selectedKpi === 'completed') return filteredTasks.filter((t) => t.status === 'done');
    if (selectedKpi === 'in_progress') return filteredTasks.filter((t) => t.status === 'in_progress');
    if (selectedKpi === 'overdue') {
      return teamTasks.filter((t) => {
        if (!t.dueDate || t.status === 'done') return false;
        return t.dueDate.toDate() < new Date();
      });
    }
    return [];
  }, [selectedKpi, filteredTasks, teamTasks]);

  const listTitle = React.useMemo(() => {
    if (selectedKpi === 'assigned') return 'Total Team Tasks';
    if (selectedKpi === 'completed') return 'Completed Team Tasks';
    if (selectedKpi === 'in_progress') return 'In Progress Team Tasks';
    if (selectedKpi === 'overdue') return 'Overdue Team Tasks';
    return '';
  }, [selectedKpi]);

  // Fetch report data when filtered member profiles are ready
  React.useEffect(() => {
    if (filteredMemberProfiles.length === 0) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getManagerTeamReport(
      orgId, managerId,
      {
        datePreset: filters.datePreset,
        customFrom: filters.customFrom,
        customTo: filters.customTo,
        status: filters.status,
        priority: filters.priority,
      },
      filteredMemberProfiles,
    ).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
    setSelectedKpi(null); // Reset selection when filters or profiles change
  }, [orgId, managerId, filteredMemberProfiles, filters.datePreset, filters.customFrom, filters.customTo, filters.status, filters.priority]);



  if (teams.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2">
        <Users className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">You are not managing any teams yet.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const kpis: KpiCardData[] = [
    { 
      label: 'Total Tasks', 
      value: data.totalTasks, 
      icon: CheckSquare, 
      accent: 'blue',
      onClick: () => setSelectedKpi(selectedKpi === 'assigned' ? null : 'assigned'),
      active: selectedKpi === 'assigned'
    },
    { 
      label: 'Completed', 
      value: data.completedTasks, 
      icon: CheckSquare, 
      accent: 'emerald',
      onClick: () => setSelectedKpi(selectedKpi === 'completed' ? null : 'completed'),
      active: selectedKpi === 'completed'
    },
    { 
      label: 'In Progress', 
      value: data.inProgressTasks, 
      icon: Clock, 
      accent: 'violet',
      onClick: () => setSelectedKpi(selectedKpi === 'in_progress' ? null : 'in_progress'),
      active: selectedKpi === 'in_progress'
    },
    { 
      label: 'Overdue', 
      value: data.overdueTasks, 
      icon: AlertTriangle, 
      accent: 'red',
      onClick: () => setSelectedKpi(selectedKpi === 'overdue' ? null : 'overdue'),
      active: selectedKpi === 'overdue'
    },
    { label: 'Team Goals', value: data.totalGoals, icon: Target, accent: 'default' },
    { label: 'Goals Done', value: data.completedGoals, icon: Target, accent: 'emerald' },
  ];

  const statusData = [
    { label: 'Completed', count: data.completedTasks, color: '#34d399' },
    { label: 'In Progress', count: data.inProgressTasks, color: '#60a5fa' },
    {
      label: 'Other',
      count: Math.max(0, data.totalTasks - data.completedTasks - data.inProgressTasks),
      color: '#71717a',
    },
    { label: 'Overdue', count: data.overdueTasks, color: '#f87171' },
  ];

  return (
    <div className="space-y-6">
      {teams.length > 0 && (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="relative">
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="appearance-none rounded-lg aether-glass-input pl-3 pr-8 py-2 text-sm font-medium text-foreground outline-none cursor-pointer transition-colors min-w-[200px]"
              >
                <option value="all" className="bg-zinc-900 dark:bg-black text-foreground font-semibold">All Managed Teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id} className="bg-zinc-900 dark:bg-black text-foreground font-semibold">
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}

      <KpiCards cards={kpis} />

      {selectedKpi && (
        <ReportTasksList
          tasks={displayedTasks}
          title={listTitle}
          onSelectTask={onSelectTask}
          orgId={orgId}
          projects={projects}
          goals={goals}
          onSelectGoal={onSelectGoal}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatusDistribution data={statusData} title="Team Task Status" />
        <div className="lg:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Member Contributions
          </p>
          <ContributionTable members={data.members} />
        </div>
      </div>

    </div>
  );
}
