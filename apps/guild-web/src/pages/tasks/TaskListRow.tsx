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
          'task-row group relative flex items-start gap-3 px-3 py-2.5 rounded-[12px] cursor-pointer transition-all duration-200 ease-out border border-transparent',
          isSelected 
            ? 'bg-primary/5 border-primary/20 shadow-sm' 
            : 'hover:bg-accent/20 hover:border-border-default/40 hover:shadow-sm',
          depth > 0 && 'ml-6',
        )}
        style={{ paddingLeft: depth > 0 ? `${12 + depth * 16}px` : undefined }}
        onClick={() => onSelect(task)}
      >
        {/* Expand/collapse subtask chevron */}
        {hasSubtasks && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="flex-shrink-0 mt-0.5 text-text-muted hover:text-muted-foreground transition-colors"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}

        {/* Checkbox circle */}
        <button
          onClick={handleComplete}
          className={cn(
            'flex-shrink-0 h-5 w-5 mt-0.5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200',
            isDone
              ? 'bg-primary border-primary'
              : 'border-muted-foreground/40 hover:border-primary/60 hover:bg-primary/5',
            completing && 'opacity-60 scale-90',
          )}
          title={isDone ? 'Mark incomplete' : 'Mark complete'}
        >
          {isDone && (
            <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Title and Metadata Container */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          {/* Title */}
          <span className={cn(
            'text-[14px] leading-tight transition-colors break-words',
            isDone ? 'line-through text-text-muted' : isSelected ? 'text-primary font-medium' : 'text-foreground/90',
          )}>
            {task.title}
          </span>

          {/* Meta row */}
          {(task.dueDate || task.priority !== 'none' || task.assigneeIds.length > 0 || (task.status !== 'todo' && task.status !== 'done') || hasSubtasks) && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Due date */}
              <DueBadge dueDate={task.dueDate as any} />

              {/* Priority dot */}
              {task.priority !== 'none' && (
                <div className="flex items-center gap-1">
                  <span
                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: priority.color }}
                    title={priority.label}
                  />
                  <span className="text-[10px] text-text-muted">{priority.label}</span>
                </div>
              )}

              {/* Status badge (non-todo) */}
              {task.status !== 'todo' && task.status !== 'done' && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${statusCfg.dot}15`, color: statusCfg.dot }}
                >
                  {statusCfg.label}
                </span>
              )}

              {/* Subtask count */}
              {hasSubtasks && (
                <span className="text-[10px] text-text-muted">
                  {subtasks.filter((s) => s.status === 'done').length}/{subtasks.length} subtasks
                </span>
              )}

              {/* Assignee avatars */}
              {task.assigneeIds.length > 0 && (
                <div className="flex items-center -space-x-1 ml-1">
                  {task.assigneeIds.slice(0, 2).map((uid) => {
                    const name = memberMap[uid] || uid;
                    return (
                      <div
                        key={uid}
                        className="h-4 w-4 rounded-full bg-primary/10 border border-bg-primary flex items-center justify-center text-[8px] font-bold text-primary flex-shrink-0 relative z-10"
                        title={name}
                      >
                        {getInitials(name)}
                      </div>
                    );
                  })}
                  {task.assigneeIds.length > 2 && (
                    <div className="h-4 w-4 rounded-full bg-muted border border-bg-primary flex items-center justify-center text-[8px] font-bold text-muted-foreground flex-shrink-0 relative z-0">
                      +{task.assigneeIds.length - 2}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete (hover only) */}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all p-1.5 rounded-md hover:bg-red-500/10"
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
