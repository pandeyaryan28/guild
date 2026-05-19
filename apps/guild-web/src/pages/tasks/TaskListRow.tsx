import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { moveTask, STATUS_CONFIG, PRIORITY_CONFIG, type Task, type ActorInfo } from '../../lib/tasks';

interface TaskListRowProps {
  task: Task;
  orgId: string;
  actor: ActorInfo;
  depth?: number;
  subtasks?: Task[];
  isSelected?: boolean;
  onSelect: (task: Task) => void;
  onDelete?: (task: Task) => void;
  memberMap: Record<string, string>; // uid → display name/initials
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function DueBadge({ dueDate }: { dueDate: { toDate: () => Date } | null | undefined }) {
  if (!dueDate) return null;
  const due = dueDate.toDate?.();
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);

  const label =
    diffDays === 0 ? 'Today' :
    diffDays === 1 ? 'Tomorrow' :
    diffDays === -1 ? 'Yesterday' :
    diffDays < 0 ? `${Math.abs(diffDays)}d ago` :
    due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const isOverdue = diffDays < 0;
  const isToday = diffDays === 0;

  return (
    <span className={cn(
      'text-[10px] font-medium px-1.5 py-0.5 rounded',
      isOverdue ? 'bg-red-500/15 text-red-400' :
      isToday ? 'bg-amber-500/15 text-amber-400' :
      'text-text-muted',
    )}>
      {label}
    </span>
  );
}

export function TaskListRow({
  task,
  orgId,
  actor,
  depth = 0,
  subtasks = [],
  isSelected,
  onSelect,
  onDelete,
  memberMap,
}: TaskListRowProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [completing, setCompleting] = React.useState(false);
  const isDone = task.status === 'done';
  const hasSubtasks = subtasks.length > 0;
  const priority = PRIORITY_CONFIG[task.priority];
  const statusCfg = STATUS_CONFIG[task.status];

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (completing) return;
    setCompleting(true);
    const newStatus = isDone ? 'todo' : 'done';
    await moveTask(task.id, orgId, newStatus, task.orderIndex, task.status, actor);
    setCompleting(false);
  };

  return (
    <>
      <div
        className={cn(
          'task-row group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-100',
          isSelected ? 'bg-primary/10 ring-1 ring-primary/25' : 'hover:bg-accent/30',
          depth > 0 && 'ml-6',
        )}
        style={{ paddingLeft: depth > 0 ? `${12 + depth * 16}px` : undefined }}
        onClick={() => onSelect(task)}
      >
        {/* Expand/collapse subtask chevron */}
        {hasSubtasks ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="flex-shrink-0 text-text-muted hover:text-muted-foreground transition-colors"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="flex-shrink-0 w-3.5" />
        )}

        {/* Checkbox circle */}
        <button
          onClick={handleComplete}
          className={cn(
            'flex-shrink-0 h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center transition-all duration-200',
            isDone
              ? 'bg-primary border-primary'
              : 'border-border-default hover:border-primary/60 hover:bg-primary/5',
            completing && 'opacity-60 scale-90',
          )}
          title={isDone ? 'Mark incomplete' : 'Mark complete'}
        >
          {isDone && (
            <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Title */}
        <span className={cn(
          'flex-1 text-sm truncate transition-colors',
          isDone ? 'line-through text-text-muted' : isSelected ? 'text-primary font-medium' : 'text-foreground',
        )}>
          {task.title}
        </span>

        {/* Meta — always visible on selected, hover-visible otherwise */}
        <div className={cn(
          'flex items-center gap-2 flex-shrink-0 transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}>
          {/* Priority dot */}
          {task.priority !== 'none' && (
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: priority.color }}
              title={priority.label}
            />
          )}

          {/* Due date */}
          <DueBadge dueDate={task.dueDate as any} />

          {/* Assignee avatars (up to 2) */}
          {task.assigneeIds.slice(0, 2).map((uid) => {
            const name = memberMap[uid] || uid;
            return (
              <div
                key={uid}
                className="h-5 w-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[8px] font-bold text-primary flex-shrink-0"
                title={name}
              >
                {getInitials(name)}
              </div>
            );
          })}
          {task.assigneeIds.length > 2 && (
            <span className="text-[10px] text-muted-foreground">+{task.assigneeIds.length - 2}</span>
          )}

          {/* Status badge (non-todo) */}
          {task.status !== 'todo' && task.status !== 'done' && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${statusCfg.dot}20`, color: statusCfg.dot }}
            >
              {statusCfg.label}
            </span>
          )}

          {/* Subtask count */}
          {hasSubtasks && (
            <span className="text-[10px] text-text-muted">
              {subtasks.filter((s) => s.status === 'done').length}/{subtasks.length}
            </span>
          )}
        </div>

        {/* Delete (hover only) */}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-muted-foreground hover:text-red-400 transition-all ml-1"
            title="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Subtasks */}
      {expanded && subtasks.map((sub) => (
        <TaskListRow
          key={sub.id}
          task={sub}
          orgId={orgId}
          actor={actor}
          depth={depth + 1}
          subtasks={[]}
          isSelected={isSelected && false}
          onSelect={onSelect}
          onDelete={onDelete}
          memberMap={memberMap}
        />
      ))}
    </>
  );
}
