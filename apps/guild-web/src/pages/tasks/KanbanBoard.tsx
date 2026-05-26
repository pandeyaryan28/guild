import * as React from 'react';
import {
  DndContext, DragOverlay, closestCenter,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
  useDroppable,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
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
        "w-12 h-full flex-shrink-0 flex flex-col items-center justify-between py-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none relative group",
        isOver
          ? "bg-cyan-500/10 border-cyan-500/40 ring-1 ring-cyan-500/20"
          : "bg-bg-primary/45 border-border-default/50 hover:border-cyan-500/35 hover:bg-cyan-500/[0.02]"
      )}
      title="Expand Completed Tasks"
    >
      {/* Background Accent Glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 rounded-2xl pointer-events-none transition-opacity duration-300" />
      
      {/* Top Section: Badge and Icon */}
      <div className="flex flex-col items-center gap-3 relative z-10">
        <div className="h-7 w-7 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 group-hover:scale-105 transition-transform">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Middle Section: Rotated Vertical Label */}
      <div className="flex items-center justify-center flex-1 relative z-10 my-4">
        <span 
          className="text-xs font-black text-muted-foreground uppercase tracking-widest select-none pointer-events-none group-hover:text-foreground transition-colors"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          COMPLETED ARCHIVE
        </span>
      </div>

      {/* Bottom Section: Expand chevron */}
      <div className="h-7 w-7 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-white/5 transition-all">
        <ChevronLeft className="h-4 w-4 rotate-180" />
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
      <div className="flex gap-5 h-full pb-4 overflow-x-auto">
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
