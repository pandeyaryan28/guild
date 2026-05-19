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
import { ScopedTaskRow } from '../../components/tasks/ScopedTaskRow';
import { TaskDetailPanel } from '../tasks/TaskDetailPanel';
import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { STATUS_CONFIG, STATUSES, moveTask, type Task, type TaskStatus } from '../../lib/tasks';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const STATUS_ORDER = STATUSES;

function VerticalStatusSection({
  status,
  tasks,
  orgId,
  onTaskClick,
  onAddTask,
  projectId,
}: {
  status: TaskStatus;
  tasks: Task[];
  orgId: string;
  onTaskClick: (t: Task) => void;
  onAddTask: () => void;
  projectId: string;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const config = STATUS_CONFIG[status];

  return (
    <div className="rounded-xl border border-border/30 bg-background/20 overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-accent/10 transition-colors"
      >
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: config.dot }}
        />
        <span className="text-[11px] font-bold uppercase tracking-wider flex-1 text-left" style={{ color: config.dot }}>
          {config.label}
        </span>
        <span className="text-[10px] text-muted-foreground font-medium">
          {tasks.length}
        </span>
        {collapsed
          ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
        }
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1.5">
              <SortableContext
                items={tasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {tasks.map((task) => (
                  <div key={task.id} className="cursor-pointer" onClick={() => onTaskClick(task)}>
                    <ScopedTaskRow task={task} />
                  </div>
                ))}
              </SortableContext>

              {tasks.length === 0 && (
                <div className="flex items-center justify-center py-4">
                  <p className="text-[11px] text-muted-foreground/40 italic">No tasks</p>
                </div>
              )}

              {/* Add task row */}
              <button
                onClick={(e) => { e.stopPropagation(); onAddTask(); }}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/20 transition-all w-full"
              >
                <Plus className="h-3 w-3" />
                Add task
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const actor = React.useMemo(
    () => ({ uid: user?.uid ?? '', name: userProfile?.fullName || user?.displayName || 'Unknown' }),
    [user, userProfile],
  );

  const allTasks = React.useMemo(() => {
    const all: Task[] = [];
    for (const col of columns.values()) all.push(...col);
    return all;
  }, [columns]);

  const activeTask = activeId ? allTasks.find((t) => t.id === activeId) ?? null : null;

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !orgId) return;
    const task = allTasks.find((t) => t.id === active.id);
    const targetStatus = over.id as TaskStatus;
    if (!task || task.status === targetStatus) return;
    await moveTask(task.id, orgId, targetStatus, task.orderIndex, task.status, actor);
  };

  if (!orgId) return null;

  if (projectLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
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
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/30 flex-shrink-0">
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

        {/* Vertical Kanban — status sections */}
        <DndContext
          sensors={sensors}
          onDragStart={({ active }) => setActiveId(active.id as string)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="space-y-2">
            {STATUS_ORDER.map((status) => {
              const tasks = columns.get(status) ?? [];
              return (
                <VerticalStatusSection
                  key={status}
                  status={status}
                  tasks={tasks}
                  orgId={orgId}
                  onTaskClick={setSelectedTask}
                  onAddTask={() => setCreateOpen(true)}
                  projectId={projectId ?? ''}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeTask && <ScopedTaskRow task={activeTask} />}
          </DragOverlay>
        </DndContext>
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
