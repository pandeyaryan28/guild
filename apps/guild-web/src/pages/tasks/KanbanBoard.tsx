import * as React from 'react';
import {
  DndContext, DragOverlay, closestCenter,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
  useDroppable,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { deleteTask, moveTask, type Task, type TaskLabel, type TaskStatus, STATUSES, type ActorInfo } from '../../lib/tasks';

// Collapsed "done" column
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
        'w-12 flex-shrink-0 h-full flex flex-col items-center justify-between py-5 rounded-xl border cursor-pointer select-none transition-all duration-200',
        isOver
          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300/50 dark:border-emerald-700/30'
          : 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700/60'
      )}
      title="Expand completed column"
    >
      <div className="flex flex-col items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30 flex items-center justify-center">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/40 dark:border-emerald-800/30 px-1.5 py-0.5 rounded-md">
          {tasks.length}
        </span>
      </div>

      <span
        className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        Done
      </span>

      <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
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

    const overId = over.id as string;
    const isColumn = STATUSES.includes(overId as TaskStatus);
    let targetStatus: TaskStatus = isColumn ? (overId as TaskStatus) : (findTask(overId)?.status ?? activeTask.status);

    if (targetStatus === 'done' && activeTask.creatorId !== actor.uid) {
      targetStatus = 'review';
    }

    const targetColTasks = columns.get(targetStatus) ?? [];

    let newOrderIndex: number;
    if (isColumn || targetColTasks.length === 0) {
      const last = targetColTasks[targetColTasks.length - 1];
      newOrderIndex = last ? last.orderIndex + 1000 : 1000;
    } else {
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
      <div className="flex gap-4 h-full pb-4 overflow-x-auto scrollbar-thin items-stretch">
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

      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
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
