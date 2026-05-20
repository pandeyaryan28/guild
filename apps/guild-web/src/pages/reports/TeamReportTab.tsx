import * as React from 'react';
import { Users, CheckSquare, Clock, AlertTriangle, Target, Loader2 } from 'lucide-react';
import { getManagerTeamReport, getRecentActivity } from '../../lib/reports';
import type { RecentActivityItem, MemberContribution } from '../../lib/reports';
import { getUserById } from '../../lib/firestore';
import { listenToManagedTeams } from '../../lib/teams';
import { KpiCards } from './KpiCards';
import type { KpiCardData } from './KpiCards';
import { StatusDistribution } from './StatusDistribution';
import { ContributionTable } from './ContributionTable';
import { ActivityTable } from './ActivityTable';
import type { ReportFiltersState } from './types';
import type { UserProfile } from '../../lib/firestore';
import type { Team } from '@guild/types';

interface Props {
  orgId: string;
  managerId: string;
  filters: ReportFiltersState;
}

export function TeamReportTab({ orgId, managerId, filters }: Props) {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [memberProfiles, setMemberProfiles] = React.useState<UserProfile[]>([]);
  const [data, setData] = React.useState<{
    totalTasks: number; completedTasks: number; inProgressTasks: number; overdueTasks: number;
    totalGoals: number; completedGoals: number; members: MemberContribution[];
  } | null>(null);
  const [activities, setActivities] = React.useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actLoading, setActLoading] = React.useState(true);

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

  // Fetch report data when member profiles are ready
  React.useEffect(() => {
    if (memberProfiles.length === 0) { setLoading(false); return; }
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
      memberProfiles,
    ).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [orgId, managerId, memberProfiles, filters.datePreset, filters.customFrom, filters.customTo, filters.status, filters.priority]);

  // Fetch recent team activity
  React.useEffect(() => {
    const memberIds = memberProfiles.map((m) => m.uid);
    if (memberIds.length === 0) return;
    setActLoading(true);
    getRecentActivity(orgId, 'team', managerId, memberIds)
      .then((a) => { setActivities(a); setActLoading(false); })
      .catch(() => setActLoading(false));
  }, [orgId, managerId, memberProfiles]);

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
    { label: 'Total Tasks', value: data.totalTasks, icon: CheckSquare, accent: 'blue' },
    { label: 'Completed', value: data.completedTasks, icon: CheckSquare, accent: 'emerald' },
    { label: 'In Progress', value: data.inProgressTasks, icon: Clock, accent: 'violet' },
    { label: 'Overdue', value: data.overdueTasks, icon: AlertTriangle, accent: 'red' },
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
      <KpiCards cards={kpis} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatusDistribution data={statusData} title="Team Task Status" />
        <div className="lg:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Member Contributions
          </p>
          <ContributionTable members={data.members} />
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Team Activity
        </p>
        <ActivityTable activities={activities} loading={actLoading} emptyText="No team activity yet" />
      </div>
    </div>
  );
}
