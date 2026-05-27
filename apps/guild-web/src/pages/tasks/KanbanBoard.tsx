import * as React from 'react';
import {
  DndContext, DragOverlay, closestCenter,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
  useDroppable,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
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
        "w-14 h-full flex-shrink-0 flex flex-col items-center justify-between py-6 rounded-xl border transition-all duration-300 cursor-pointer select-none relative group font-mono overflow-hidden",
        isOver
          ? "bg-cyan-950/20 border-cyan-500/40 ring-1 ring-cyan-500/25 shadow-[0_0_15px_rgba(34,211,238,0.25)]"
          : "bg-white/[0.01] border-white/5 hover:border-cyan-500/35 hover:bg-cyan-500/[0.02]"
      )}
      title="Expand Vault Chamber"
    >
      {/* Holographic scanning overlay effect inside the shutter tab */}
      <div className="absolute inset-x-0 top-0 bottom-0 bg-gradient-to-b from-transparent via-cyan-500/[0.04] to-transparent pointer-events-none animate-pulse duration-[3s]" />
      
      {/* Top telemetry panel */}
      <div className="flex flex-col items-center gap-3.5 relative z-10 select-none">
        <div className="h-8 w-8 rounded bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 group-hover:scale-105 transition-transform duration-300">
          <CheckCircle2 className="h-4.5 w-4.5" />
        </div>
        <span className="text-[9px] font-black text-cyan-400 bg-cyan-500/5 border border-cyan-500/25 px-2 py-0.5 rounded font-mono select-none">
          {tasks.length}
        </span>
      </div>

      {/* Middle rotating vertical text tag */}
      <div className="flex items-center justify-center flex-1 relative z-10 my-4 select-none">
        <span 
          className="text-[9.5px] font-black text-muted-foreground uppercase tracking-[0.25em] select-none pointer-events-none group-hover:text-foreground transition-colors duration-300"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          [ARCHIVE_VAULT]
        </span>
      </div>

      {/* Bottom expand chevron */}
      <div className="h-8 w-8 rounded bg-white/[0.01] border border-white/5 flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-white/10 transition-all duration-300 min-h-8 min-w-8">
        <ChevronLeft className="h-4 w-4 rotate-180 transition-transform duration-300 group-hover:translate-x-0.5" />
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
      <div className="flex gap-5 h-full pb-4 overflow-x-auto custom-scrollbar select-none scroll-smooth">
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
