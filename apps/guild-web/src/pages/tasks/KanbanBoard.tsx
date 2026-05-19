import * as React from 'react';
import {
  DndContext, DragOverlay, closestCenter,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { deleteTask, moveTask, type Task, type TaskLabel, type TaskStatus, STATUSES, type ActorInfo } from '../../lib/tasks';

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
    const targetStatus: TaskStatus = isColumn ? (overId as TaskStatus) : (findTask(overId)?.status ?? activeTask.status);
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
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={columns.get(status) ?? []}
            labels={labels}
            memberMap={memberMap}
            onTaskClick={onTaskClick}
            onAddTask={() => onAddTask(status)}
            onDeleteTask={handleDelete}
          />
        ))}
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
