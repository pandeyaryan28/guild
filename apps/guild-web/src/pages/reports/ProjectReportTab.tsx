import * as React from 'react';
import {
  FolderKanban, CheckSquare, Clock, AlertTriangle, TrendingUp, Loader2, ChevronDown, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProjectReport } from '../../lib/reports';
import { getUserById } from '../../lib/firestore';
import { useProjects } from '../../hooks/useProjects';
import { KpiCards } from './KpiCards';
import type { KpiCardData } from './KpiCards';
import { StatusDistribution } from './StatusDistribution';
import type { ReportFiltersState } from './types';
import type { UserProfile } from '../../lib/firestore';
import { useTasks } from '../../hooks/useTasks';
import { ReportTasksList } from './ReportTasksList';
import type { Task } from '../../lib/tasks';
import type { Project } from '../../lib/projects';
import type { Goal } from '../../lib/goals';

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

export function ProjectReportTab({
  orgId,
  userId,
  filters,
  onSelectTask,
  projects: allProjectsProp,
  goals,
  onSelectGoal,
}: Props) {
  const navigate = useNavigate();
  const { projects, loading: projLoading } = useProjects(orgId);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');
  const [data, setData] = React.useState<{
    totalTasks: number; completedTasks: number; inProgressTasks: number;
    overdueTasks: number; completionRate: number; memberIds: string[];
  } | null>(null);
  const [memberProfiles, setMemberProfiles] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedKpi, setSelectedKpi] = React.useState<KpiType | null>(null);

  // Load real-time tasks to display list matching KPI selection
  const { tasks: allOrgTasks } = useTasks(orgId);

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

  const projectTasks = React.useMemo(() => {
    if (!selectedProjectId) return [];
    return allOrgTasks.filter((t) => t.projectId === selectedProjectId);
  }, [allOrgTasks, selectedProjectId]);

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

    return projectTasks.filter((t) => {
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      
      const updated = t.updatedAt?.toDate?.() ?? new Date(0);
      const created = t.createdAt?.toDate?.() ?? new Date(0);
      return (updated >= from && updated <= to) || (created >= from && created <= to);
    });
  }, [projectTasks, filters]);

  const displayedTasks = React.useMemo(() => {
    if (!selectedKpi) return [];
    if (selectedKpi === 'assigned') return filteredTasks;
    if (selectedKpi === 'completed') return filteredTasks.filter((t) => t.status === 'done');
    if (selectedKpi === 'in_progress') return filteredTasks.filter((t) => t.status === 'in_progress');
    if (selectedKpi === 'overdue') {
      return projectTasks.filter((t) => {
        if (!t.dueDate || t.status === 'done') return false;
        return t.dueDate.toDate() < new Date();
      });
    }
    return [];
  }, [selectedKpi, filteredTasks, projectTasks]);

  const listTitle = React.useMemo(() => {
    if (selectedKpi === 'assigned') return 'Total Project Tasks';
    if (selectedKpi === 'completed') return 'Completed Project Tasks';
    if (selectedKpi === 'in_progress') return 'In Progress Project Tasks';
    if (selectedKpi === 'overdue') return 'Overdue Project Tasks';
    return '';
  }, [selectedKpi]);

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
    setSelectedKpi(null); // Reset card selection on project change
  }, [orgId, selectedProjectId, filters.datePreset, filters.customFrom, filters.customTo, filters.status, filters.priority]);

  // Resolve member profiles from task assignees
  React.useEffect(() => {
    if (!data || data.memberIds.length === 0) { setMemberProfiles([]); return; }
    Promise.all(data.memberIds.map((id) => getUserById(id)))
      .then((ps) => setMemberProfiles(ps.filter(Boolean) as UserProfile[]))
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.memberIds.join(',')]);



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
      <div className="flex items-center justify-between w-full">
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
        {selectedProjectId && (
          <button
            onClick={() => navigate(`/projects/${selectedProjectId}`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <span>Go to Project Page</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          <KpiCards cards={kpis} />

          {selectedKpi && (
            <ReportTasksList
              tasks={displayedTasks}
              title={listTitle}
              onSelectTask={onSelectTask}
              orgId={orgId}
              projects={allProjectsProp}
              goals={goals}
              onSelectGoal={onSelectGoal}
            />
          )}

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
          </div>
        </>
      ) : null}
    </div>
  );
}
