import * as React from 'react';
import {
  DndContext, DragOverlay, closestCenter,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { GoalKanbanColumn } from './GoalKanbanColumn';
import { GoalKanbanCard } from './GoalKanbanCard';
import { deleteGoal, updateGoal, type Goal, type GoalStatus } from '../../lib/goals';

interface GoalKanbanBoardProps {
  goals: Goal[];
  onGoalClick: (goal: Goal) => void;
  onAddGoal: () => void;
}

export function GoalKanbanBoard({ goals, onGoalClick, onAddGoal }: GoalKanbanBoardProps) {
  const [activeGoal, setActiveGoal] = React.useState<Goal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findGoal = (id: string) => goals.find((g) => g.id === id);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveGoal(findGoal(event.active.id as string) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGoal(null);
    if (!over || active.id === over.id) return;

    const activeGoal = findGoal(active.id as string);
    if (!activeGoal) return;

    // Determine target status
    const overId = over.id as string;
    const isColumn = ['active', 'completed', 'cancelled'].includes(overId);
    let targetStatus: GoalStatus = isColumn ? (overId as GoalStatus) : (findGoal(overId)?.status ?? activeGoal.status);

    if (activeGoal.status !== targetStatus) {
      await updateGoal(activeGoal.id, { status: targetStatus });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Delete this goal? associated tasks will be unlinked.')) return;
    await deleteGoal(goalId);
  };

  const handleStatusChange = async (goalId: string, nextStatus: GoalStatus) => {
    await updateGoal(goalId, { status: nextStatus });
  };

  const columns = React.useMemo(() => {
    const map = new Map<GoalStatus, Goal[]>();
    map.set('active', []);
    map.set('completed', []);
    map.set('cancelled', []);
    for (const g of goals) {
      const col = map.get(g.status);
      if (col) col.push(g);
    }
    return map;
  }, [goals]);

  const statuses: GoalStatus[] = ['active', 'completed', 'cancelled'];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-5 h-full pb-4 overflow-x-auto select-none">
        {statuses.map((status) => (
          <GoalKanbanColumn
            key={status}
            status={status}
            goals={columns.get(status) ?? []}
            onGoalClick={onGoalClick}
            onAddGoal={status === 'active' ? onAddGoal : undefined}
            onDeleteGoal={handleDeleteGoal}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {activeGoal && (
          <GoalKanbanCard
            goal={activeGoal}
            onClick={() => {}}
            onDelete={() => {}}
            onStatusChange={() => {}}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
