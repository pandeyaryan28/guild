import * as React from 'react';
import {
  CheckSquare, Clock, AlertTriangle, Target, TrendingUp, Loader2,
} from 'lucide-react';
import { getMyReport, getRecentActivity } from '../../lib/reports';
import type { RecentActivityItem } from '../../lib/reports';
import { KpiCards } from './KpiCards';
import type { KpiCardData } from './KpiCards';
import { StatusDistribution } from './StatusDistribution';
import { ActivityTable } from './ActivityTable';
import type { ReportFiltersState } from './types';

interface Props {
  orgId: string;
  userId: string;
  filters: ReportFiltersState;
}

export function MyReportTab({ orgId, userId, filters }: Props) {
  const [data, setData] = React.useState<{
    assigned: number; completed: number; inProgress: number; overdue: number;
    completionRate: number; goalsTotal: number; goalsCompleted: number; goalsActive: number;
  } | null>(null);
  const [activities, setActivities] = React.useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actLoading, setActLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    getMyReport(orgId, userId, {
      datePreset: filters.datePreset,
      customFrom: filters.customFrom,
      customTo: filters.customTo,
      status: filters.status,
      priority: filters.priority,
    }).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [orgId, userId, filters.datePreset, filters.customFrom, filters.customTo, filters.status, filters.priority]);

  React.useEffect(() => {
    setActLoading(true);
    getRecentActivity(orgId, 'user', userId).then((a) => {
      setActivities(a); setActLoading(false);
    }).catch(() => setActLoading(false));
  }, [orgId, userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const kpis: KpiCardData[] = [
    { label: 'Tasks Assigned', value: data.assigned, icon: CheckSquare, accent: 'blue' },
    { label: 'Tasks Completed', value: data.completed, icon: CheckSquare, accent: 'emerald' },
    { label: 'In Progress', value: data.inProgress, icon: Clock, accent: 'violet' },
    { label: 'Overdue', value: data.overdue, icon: AlertTriangle, accent: 'red' },
    { label: 'Completion Rate', value: `${data.completionRate}%`, icon: TrendingUp, accent: 'emerald' },
    { label: 'Goals Total', value: data.goalsTotal, icon: Target, accent: 'default' },
    { label: 'Goals Completed', value: data.goalsCompleted, icon: Target, accent: 'emerald' },
    { label: 'Goals Active', value: data.goalsActive, icon: Target, accent: 'blue' },
  ];

  const statusData = [
    { label: 'Todo', count: Math.max(0, data.assigned - data.completed - data.inProgress), color: '#71717a' },
    { label: 'In Progress', count: data.inProgress, color: '#60a5fa' },
    { label: 'Done', count: data.completed, color: '#34d399' },
    { label: 'Overdue', count: data.overdue, color: '#f87171' },
  ];

  return (
    <div className="space-y-6">
      <KpiCards cards={kpis} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusDistribution data={statusData} title="Task Status" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Recent Activity
          </p>
          <ActivityTable
            activities={activities}
            loading={actLoading}
            emptyText="No personal activity yet"
          />
        </div>
      </div>
    </div>
  );
}
