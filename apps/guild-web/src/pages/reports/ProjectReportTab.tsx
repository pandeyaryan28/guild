import * as React from 'react';
import {
  FolderKanban, CheckSquare, Clock, AlertTriangle, TrendingUp, Loader2, ChevronDown,
} from 'lucide-react';
import { getProjectReport, getRecentActivity } from '../../lib/reports';
import type { RecentActivityItem } from '../../lib/reports';
import { getUserById } from '../../lib/firestore';
import { useProjects } from '../../hooks/useProjects';
import { KpiCards } from './KpiCards';
import type { KpiCardData } from './KpiCards';
import { StatusDistribution } from './StatusDistribution';
import { ActivityTable } from './ActivityTable';
import type { ReportFiltersState } from './types';
import type { UserProfile } from '../../lib/firestore';

interface Props {
  orgId: string;
  userId: string;
  filters: ReportFiltersState;
}

export function ProjectReportTab({ orgId, userId, filters }: Props) {
  const { projects, loading: projLoading } = useProjects(orgId);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');
  const [data, setData] = React.useState<{
    totalTasks: number; completedTasks: number; inProgressTasks: number;
    overdueTasks: number; completionRate: number; memberIds: string[];
  } | null>(null);
  const [memberProfiles, setMemberProfiles] = React.useState<UserProfile[]>([]);
  const [activities, setActivities] = React.useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [actLoading, setActLoading] = React.useState(false);

  // Projects the user owns or is a member of
  const myProjects = projects.filter(
    (p) => p.ownerId === userId || p.memberIds.includes(userId),
  );

  // Auto-select the first project
  React.useEffect(() => {
    if (myProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(myProjects[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myProjects.length]);

  // Fetch project report data when project or filters change
  React.useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    getProjectReport(orgId, selectedProjectId, {
      datePreset: filters.datePreset,
      customFrom: filters.customFrom,
      customTo: filters.customTo,
      status: filters.status,
      priority: filters.priority,
    }).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [orgId, selectedProjectId, filters.datePreset, filters.customFrom, filters.customTo, filters.status, filters.priority]);

  // Resolve member profiles from task assignees
  React.useEffect(() => {
    if (!data || data.memberIds.length === 0) { setMemberProfiles([]); return; }
    Promise.all(data.memberIds.map((id) => getUserById(id)))
      .then((ps) => setMemberProfiles(ps.filter(Boolean) as UserProfile[]))
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.memberIds.join(',')]);

  // Fetch project activity
  React.useEffect(() => {
    if (!selectedProjectId) return;
    setActLoading(true);
    getRecentActivity(orgId, 'project', selectedProjectId)
      .then((a) => { setActivities(a); setActLoading(false); })
      .catch(() => setActLoading(false));
  }, [orgId, selectedProjectId]);

  if (projLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (myProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2">
        <FolderKanban className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">You are not part of any projects yet.</p>
      </div>
    );
  }

  const kpis: KpiCardData[] = data
    ? [
        { label: 'Total Tasks', value: data.totalTasks, icon: CheckSquare, accent: 'blue' },
        { label: 'Completed', value: data.completedTasks, icon: CheckSquare, accent: 'emerald' },
        { label: 'In Progress', value: data.inProgressTasks, icon: Clock, accent: 'violet' },
        { label: 'Overdue', value: data.overdueTasks, icon: AlertTriangle, accent: 'red' },
        { label: 'Completion Rate', value: `${data.completionRate}%`, icon: TrendingUp, accent: 'emerald' },
      ]
    : [];

  const statusData = data
    ? [
        { label: 'Completed', count: data.completedTasks, color: '#34d399' },
        { label: 'In Progress', count: data.inProgressTasks, color: '#60a5fa' },
        {
          label: 'Other',
          count: Math.max(0, data.totalTasks - data.completedTasks - data.inProgressTasks),
          color: '#71717a',
        },
        { label: 'Overdue', count: data.overdueTasks, color: '#f87171' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Project selector */}
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <FolderKanban className="h-4 w-4 text-primary" />
        </div>
        <div className="relative">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="appearance-none rounded-lg border border-border-default bg-card pl-3 pr-8 py-2 text-sm font-medium text-foreground outline-none cursor-pointer hover:border-primary/50 transition-colors min-w-[200px]"
          >
            {myProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          <KpiCards cards={kpis} />

          {/* Members involved */}
          {memberProfiles.length > 0 && (
            <div className="rounded-xl border border-border-default bg-card p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Members Involved
              </p>
              <div className="flex flex-wrap gap-2">
                {memberProfiles.map((m) => (
                  <div key={m.uid} className="flex items-center gap-2 rounded-lg bg-accent/30 px-3 py-1.5">
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                      {m.fullName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className="text-xs font-medium text-foreground">{m.fullName || m.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StatusDistribution data={statusData} title="Task Status" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Recent Activity
              </p>
              <ActivityTable
                activities={activities}
                loading={actLoading}
                emptyText="No project activity yet"
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
