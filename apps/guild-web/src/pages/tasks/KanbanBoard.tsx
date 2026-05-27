import * as React from 'react';
import {
  DndContext, DragOverlay, closestCenter,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
  useDroppable,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ChevronLeft, CheckCircle2, ChevronRight, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { deleteTask, moveTask, type Task, type TaskLabel, type TaskStatus, STATUSES, type ActorInfo } from '../../lib/tasks';

function CollapsedDoneColumn({
  status,
  tasks,
  onExpand,
}: {
  status: TaskStatus;
  tasks: Task[];
  onExpand: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      onClick={onExpand}
      className={cn(
        "w-16 h-full flex-shrink-0 flex flex-col items-center justify-between py-6 rounded-2xl border transition-all duration-300 cursor-pointer select-none relative group overflow-hidden bg-slate-50/50 dark:bg-slate-900/50",
        isOver
          ? "bg-indigo-50/20 dark:bg-indigo-950/20 border-indigo-500/40 ring-1 ring-indigo-500/20 shadow-lg"
          : "border-slate-200 dark:border-slate-800/80 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/80"
      )}
      title="Expand Completed Tasks Column"
    >
      <div className="flex flex-col items-center gap-3 relative z-10 select-none">
        <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center border border-indigo-150 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform duration-300">
          <CheckCircle2 className="h-4.5 w-4.5" />
        </div>
        <span className="text-[11px] font-bold text-indigo-650 dark:text-indigo-455 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div className="flex items-center justify-center flex-1 relative z-10 my-4 select-none">
        <span 
          className="text-xs font-semibold text-slate-450 dark:text-slate-550 uppercase tracking-widest select-none pointer-events-none group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors duration-300"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Completed Archive
        </span>
      </div>

      <div className="h-8 w-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-all duration-300 min-h-8 min-w-8">
        <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  columns: Map<TaskStatus, Task[]>;
  allTasks: Task[];
  labels: TaskLabel[];
  memberMap: Map<string, { fullName: string; username: string }>;
  orgId: string;
  actor: ActorInfo;
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}

export function KanbanBoard({ columns, allTasks, labels, memberMap, orgId, actor, onTaskClick, onAddTask }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  const [isDoneCollapsed, setIsDoneCollapsed] = React.useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findTask = (id: string) => allTasks.find((t) => t.id === id);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(findTask(event.active.id as string) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || active.id === over.id) return;

    const activeTask = findTask(active.id as string);
    if (!activeTask) return;

    // Determine target status
    const overId = over.id as string;
    const isColumn = STATUSES.includes(overId as TaskStatus);
    let targetStatus: TaskStatus = isColumn ? (overId as TaskStatus) : (findTask(overId)?.status ?? activeTask.status);

    // Intercept drops to done for non-creators
    if (targetStatus === 'done' && activeTask.creatorId !== actor.uid) {
      targetStatus = 'review';
    }

    const targetColTasks = columns.get(targetStatus) ?? [];

    let newOrderIndex: number;
    if (isColumn || targetColTasks.length === 0) {
      // Drop into column area — append at end
      const last = targetColTasks[targetColTasks.length - 1];
      newOrderIndex = last ? last.orderIndex + 1000 : 1000;
    } else {
      // Drop onto another task — calculate midpoint
      const overTask = findTask(overId)!;
      const overIndex = targetColTasks.findIndex((t) => t.id === overId);
      const prev = targetColTasks[overIndex - 1]?.orderIndex ?? 0;
      newOrderIndex = (prev + overTask.orderIndex) / 2;
    }

    await moveTask(active.id as string, orgId, targetStatus, newOrderIndex, activeTask.status, actor);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    await deleteTask(taskId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-5 h-full pb-4 overflow-x-auto scrollbar-thin select-none scroll-smooth items-stretch">
        {STATUSES.map((status) => {
          if (status === 'done' && isDoneCollapsed) {
            return (
              <CollapsedDoneColumn
                key={status}
                status={status}
                tasks={columns.get(status) ?? []}
                onExpand={() => setIsDoneCollapsed(false)}
              />
            );
          }

          return (
            <KanbanColumn
              key={status}
              status={status}
              tasks={columns.get(status) ?? []}
              labels={labels}
              memberMap={memberMap}
              onTaskClick={onTaskClick}
              onAddTask={() => onAddTask(status)}
              onDeleteTask={handleDelete}
              onCollapse={status === 'done' ? () => setIsDoneCollapsed(true) : undefined}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {activeTask && (
          <TaskCard
            task={activeTask}
            labels={labels}
            memberMap={memberMap}
            onClick={() => {}}
            onDelete={() => {}}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
