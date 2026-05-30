import * as React from 'react';
import {
  CheckSquare, Clock, AlertTriangle, Target, TrendingUp, Loader2,
} from 'lucide-react';
import { getMyReport } from '../../lib/reports';
import { KpiCards } from './KpiCards';
import type { KpiCardData } from './KpiCards';
import { StatusDistribution } from './StatusDistribution';
import type { ReportFiltersState } from './types';
import type { Task } from '../../lib/tasks';
import type { Project } from '../../lib/projects';
import type { Goal } from '../../lib/goals';
import { useTasks } from '../../hooks/useTasks';
import { ReportTasksList } from './ReportTasksList';

interface Props {
  orgId: string;
  userId: string;
  filters: ReportFiltersState;
  onSelectTask: (task: Task) => void;
  projects: Project[];
  goals: Goal[];
  onSelectGoal: (goal: Goal) => void;
}

type KpiType = 'assigned' | 'completed' | 'in_progress' | 'overdue';

export function MyReportTab({
  orgId,
  userId,
  filters,
  onSelectTask,
  projects,
  goals,
  onSelectGoal,
}: Props) {
  const [data, setData] = React.useState<{
    assigned: number; completed: number; inProgress: number; overdue: number;
    completionRate: number; goalsTotal: number; goalsCompleted: number; goalsActive: number;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedKpi, setSelectedKpi] = React.useState<KpiType | null>(null);

  // Load real-time tasks to display list matching KPI selection
  const { tasks: allOrgTasks } = useTasks(orgId);

  const myTasks = React.useMemo(() => {
    return allOrgTasks.filter((t) => t.assigneeIds.includes(userId));
  }, [allOrgTasks, userId]);

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

    return myTasks.filter((t) => {
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      
      const updated = t.updatedAt?.toDate?.() ?? new Date(0);
      const created = t.createdAt?.toDate?.() ?? new Date(0);
      return (updated >= from && updated <= to) || (created >= from && created <= to);
    });
  }, [myTasks, filters]);

  const displayedTasks = React.useMemo(() => {
    if (!selectedKpi) return [];
    if (selectedKpi === 'assigned') return filteredTasks;
    if (selectedKpi === 'completed') return filteredTasks.filter((t) => t.status === 'done');
    if (selectedKpi === 'in_progress') return filteredTasks.filter((t) => t.status === 'in_progress');
    if (selectedKpi === 'overdue') {
      return myTasks.filter((t) => {
        if (!t.dueDate || t.status === 'done') return false;
        return t.dueDate.toDate() < new Date();
      });
    }
    return [];
  }, [selectedKpi, filteredTasks, myTasks]);

  const listTitle = React.useMemo(() => {
    if (selectedKpi === 'assigned') return 'Assigned Tasks';
    if (selectedKpi === 'completed') return 'Completed Tasks';
    if (selectedKpi === 'in_progress') return 'In Progress Tasks';
    if (selectedKpi === 'overdue') return 'Overdue Tasks';
    return '';
  }, [selectedKpi]);

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
      label: 'Tasks Assigned', 
      value: data.assigned, 
      icon: CheckSquare, 
      accent: 'blue',
      onClick: () => setSelectedKpi(selectedKpi === 'assigned' ? null : 'assigned'),
      active: selectedKpi === 'assigned'
    },
    { 
      label: 'Tasks Completed', 
      value: data.completed, 
      icon: CheckSquare, 
      accent: 'emerald',
      onClick: () => setSelectedKpi(selectedKpi === 'completed' ? null : 'completed'),
      active: selectedKpi === 'completed'
    },
    { 
      label: 'In Progress', 
      value: data.inProgress, 
      icon: Clock, 
      accent: 'violet',
      onClick: () => setSelectedKpi(selectedKpi === 'in_progress' ? null : 'in_progress'),
      active: selectedKpi === 'in_progress'
    },
    { 
      label: 'Overdue', 
      value: data.overdue, 
      icon: AlertTriangle, 
      accent: 'red',
      onClick: () => setSelectedKpi(selectedKpi === 'overdue' ? null : 'overdue'),
      active: selectedKpi === 'overdue'
    },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusDistribution data={statusData} title="Task Status" />
      </div>
    </div>
  );
}
