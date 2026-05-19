import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronRight, Plus, Settings, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import { useProject } from '../../hooks/useProjects';
import { useMilestones } from '../../hooks/useMilestones';
import { useTasks } from '../../hooks/useTasks';
import { MilestoneRail } from './MilestoneRail';
import { TaskDetailPanel } from '../tasks/TaskDetailPanel';
import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { type Task } from '../../lib/tasks';
import { TaskIsland } from '../../components/tasks/TaskIsland';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const orgId = userProfile?.organizationId;
  const { project, loading: projectLoading } = useProject(projectId);
  const { milestones } = useMilestones(projectId);
  const { columns } = useTasks(orgId, projectId ? { projectId } : undefined);

  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const actor = React.useMemo(
    () => ({ uid: user?.uid ?? '', name: userProfile?.fullName || user?.displayName || 'Unknown' }),
    [user, userProfile],
  );

  const allTasks = React.useMemo(() => {
    const all: Task[] = [];
    for (const col of columns.values()) all.push(...col);
    return all;
  }, [columns]);

  if (!orgId) return null;

  if (projectLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Project not found.</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border-default flex-shrink-0">
        <button
          onClick={() => navigate('/projects')}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">{project.name}</h1>
          {project.description && (
            <p className="text-[11px] text-muted-foreground truncate">{project.description}</p>
          )}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add Task
        </Button>
        <button className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-accent/30">
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Milestone rail */}
        {projectId && (
          <MilestoneRail projectId={projectId} orgId={orgId} milestones={milestones} />
        )}

        {/* Task Island UI */}
        <TaskIsland
          tasks={allTasks}
          loading={projectLoading}
          orgId={orgId}
          actor={actor}
          selectedTask={selectedTask}
          onSelectTask={setSelectedTask}
          defaultProjectId={projectId}
        />
      </div>

      {/* Task detail panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          orgId={orgId}
          actor={actor}
          authorUsername={userProfile?.username || ''}
        />
      )}

      {/* Create task modal */}
      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        orgId={orgId}
        actor={actor}
        defaultProjectId={projectId}
      />
    </div>
  );
}
