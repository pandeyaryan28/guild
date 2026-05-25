import * as React from 'react';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ReportScopeTabs } from './ReportScopeTabs';
import { ReportFiltersBar } from './ReportFiltersBar';
import { MyReportTab } from './MyReportTab';
import { TeamReportTab } from './TeamReportTab';
import { ProjectReportTab } from './ProjectReportTab';
import { DEFAULT_FILTERS } from './types';
import type { ReportScope, ReportFiltersState } from './types';
import { TaskDetailPanel } from '../tasks/TaskDetailPanel';
import { cn } from '@/lib/utils';
import type { Task } from '../../lib/tasks';

export function ReportsPage() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const userId = userProfile?.uid;
  const isManager = userProfile?.isManager === true;

  const [activeScope, setActiveScope] = React.useState<ReportScope>('my');
  const [filters, setFilters] = React.useState<ReportFiltersState>(DEFAULT_FILTERS);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  const actor = React.useMemo(() => ({
    uid: userProfile?.uid || '',
    name: userProfile?.fullName || 'Anonymous',
  }), [userProfile]);
  const actorName = userProfile?.username || 'user';

  const tabs = React.useMemo(() => {
    const t: { id: ReportScope; label: string }[] = [
      { id: 'my', label: 'My Report' },
    ];
    if (isManager) t.push({ id: 'team', label: 'Team Report' });
    t.push({ id: 'project', label: 'Project Report' });
    return t;
  }, [isManager]);

  if (!orgId || !userId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden w-full">
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border-default flex-shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Reports</h1>
            <p className="text-[11px] text-muted-foreground">
              Track your progress and team performance
            </p>
          </div>
        </div>

        {/* Scope Tabs */}
        <ReportScopeTabs tabs={tabs} active={activeScope} onChange={setActiveScope} />

        {/* Filters Bar */}
        <ReportFiltersBar filters={filters} onChange={setFilters} />

        {/* Tab Content */}
        <div className="p-6">
          {activeScope === 'my' && (
            <MyReportTab orgId={orgId} userId={userId} filters={filters} onSelectTask={setSelectedTask} />
          )}
          {activeScope === 'team' && isManager && (
            <TeamReportTab orgId={orgId} managerId={userId} filters={filters} onSelectTask={setSelectedTask} />
          )}
          {activeScope === 'project' && (
            <ProjectReportTab orgId={orgId} userId={userId} filters={filters} onSelectTask={setSelectedTask} />
          )}
        </div>
      </div>

      {/* Slide-out Task Detail Drawer */}
      <div
        className={cn(
          'border-border-default bg-card overflow-hidden transition-all duration-300 ease-in-out border-l flex-shrink-0 z-40',
          'fixed inset-y-0 right-0 md:relative md:inset-auto',
          selectedTask 
            ? 'w-full translate-x-0 md:w-[420px] md:translate-x-0 h-full border-l' 
            : 'w-0 translate-x-full md:w-0 md:translate-x-0'
        )}
      >
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            orgId={orgId}
            actor={actor}
            authorUsername={actorName}
          />
        )}
      </div>
    </div>
  );
}
