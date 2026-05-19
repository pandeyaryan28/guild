import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import { useGoal } from '../../hooks/useGoals';
import { useTasks } from '../../hooks/useTasks';
import { TaskDetailPanel } from '../tasks/TaskDetailPanel';
import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { type Task } from '../../lib/tasks';
import { TaskIsland } from '../../components/tasks/TaskIsland';

export function GoalDetailPage() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const { goal, loading: goalLoading } = useGoal(goalId);
  const { columns } = useTasks(orgId, goalId ? { goalId } : undefined);

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

  if (goalLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Goal not found.</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/goals')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Goals
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border-default flex-shrink-0">
        <button onClick={() => navigate('/goals')} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">{goal.title}</h1>
          {goal.description && (
            <p className="text-[11px] text-muted-foreground truncate">{goal.description}</p>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white border-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Task
        </Button>
      </div>

      {/* Task Island UI */}
      <div className="flex-1 overflow-y-auto p-5">
        <TaskIsland
          tasks={allTasks}
          loading={goalLoading}
          orgId={orgId}
          actor={actor}
          selectedTask={selectedTask}
          onSelectTask={setSelectedTask}
          defaultGoalId={goalId}
        />
      </div>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          orgId={orgId}
          actor={actor}
          authorUsername={userProfile?.username || ''}
        />
      )}

      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        orgId={orgId}
        actor={actor}
        defaultGoalId={goalId}
      />
    </div>
  );
}
