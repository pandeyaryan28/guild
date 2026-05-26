import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { moveTask, STATUS_CONFIG, PRIORITY_CONFIG, type Task, type ActorInfo, type TaskStatus } from '../../lib/tasks';

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
  const isTomorrow = diffDays === 1;

  return (
    <span className={cn(
      'text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border backdrop-blur-md font-mono',
      isOverdue ? 'bg-red-500/5 border-red-500/20 text-red-400' :
      isToday ? 'bg-amber-500/5 border-amber-500/20 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)]' :
      isTomorrow ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400' :
      'bg-white/[0.02] border-white/5 text-muted-foreground',
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
  const isReview = task.status === 'review';
  const hasSubtasks = subtasks.length > 0;
  const priority = PRIORITY_CONFIG[task.priority];
  const statusCfg = STATUS_CONFIG[task.status];

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (completing) return;
    setCompleting(true);
    
    let newStatus: TaskStatus;
    if (isDone || isReview) {
      newStatus = 'todo';
    } else {
      if (task.creatorId !== actor.uid) {
        newStatus = 'review';
      } else {
        newStatus = 'done';
      }
    }
    
    await moveTask(task.id, orgId, newStatus, task.orderIndex, task.status, actor);
    setCompleting(false);
  };

  return (
    <>
      <div
        className={cn(
          'task-row group relative flex items-start gap-3.5 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 ease-out border select-none',
          isSelected 
            ? 'bg-white/[0.04] dark:bg-white/[0.005] border-violet-500/25 shadow-lg shadow-violet-500/5' 
            : 'bg-white/[0.015] dark:bg-white/[0.001] border-white/5 hover:border-violet-500/20 hover:bg-white/[0.03] dark:hover:bg-white/[0.003] hover:shadow-md hover:-translate-y-0.5',
          isDone && 'opacity-60',
        )}
        style={{ paddingLeft: depth > 0 ? `${16 + depth * 22}px` : undefined }}
        onClick={() => onSelect(task)}
      >
        {/* Dynamic hierarchical guide lines for subtasks */}
        {depth > 0 && (
          <div 
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ 
              left: `${(depth - 1) * 22 + 12}px`,
              width: '20px' 
            }}
          >
            {/* Vertical thread line */}
            <div className="absolute top-0 bottom-1/2 left-[12px] w-[1.5px] bg-white/10 dark:bg-white/5" />
            {/* Horizontal junction guide line */}
            <div className="absolute top-1/2 left-[12px] w-[14px] h-[1.5px] bg-white/10 dark:bg-white/5" />
          </div>
        )}

        {/* Expand/collapse subtask chevron */}
        {hasSubtasks && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="flex-shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors p-0.5 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5 relative z-10"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}

        {/* Checkbox circle with premium neon gradients */}
        <button
          onClick={handleComplete}
          className={cn(
            'flex-shrink-0 h-5 w-5 mt-0.5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300 cursor-pointer relative z-10',
            isDone
              ? 'bg-gradient-to-br from-cyan-400 to-sky-500 border-transparent text-white shadow-[0_0_8px_rgba(34,211,238,0.4)]'
              : isReview
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-transparent text-white shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse'
                : 'border-white/20 hover:border-violet-400/60 hover:bg-violet-500/5',
            completing && 'opacity-65 scale-90',
          )}
          title={isDone ? 'Mark incomplete' : isReview ? 'In review - Mark incomplete' : 'Mark complete'}
        >
          {isDone && (
            <svg className="h-3 w-3 text-white font-black" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {isReview && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12">
              <path d="M6 2v4l2.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Title and Metadata Container */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
          {/* Title */}
          <span className={cn(
            'text-[13px] leading-tight transition-colors break-words font-semibold',
            isDone ? 'line-through text-muted-foreground' : isReview ? 'text-foreground/75 italic' : isSelected ? 'text-violet-400 font-bold' : 'text-foreground/90',
          )}>
            {task.title}
          </span>

          {/* Meta row */}
          {(task.dueDate || task.priority !== 'none' || task.assigneeIds.length > 0 || (task.status !== 'todo' && task.status !== 'done') || hasSubtasks) && (
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Due date */}
              <DueBadge dueDate={task.dueDate as any} />

              {/* Priority dot tag */}
              {task.priority !== 'none' && (
                <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 px-2 py-0.5 rounded-lg">
                  <span
                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: priority.color, boxShadow: `0 0 6px ${priority.color}` }}
                    title={priority.label}
                  />
                  <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{priority.label}</span>
                </div>
              )}

              {/* Status badge (non-todo) */}
              {task.status !== 'todo' && task.status !== 'done' && (
                <span
                  className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border"
                  style={{ backgroundColor: `${statusCfg.dot}10`, borderColor: `${statusCfg.dot}20`, color: statusCfg.dot }}
                >
                  {statusCfg.label}
                </span>
              )}

              {/* Subtask count */}
              {hasSubtasks && (
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-white/[0.02] border border-white/5 text-muted-foreground">
                  {subtasks.filter((s) => s.status === 'done').length}/{subtasks.length} SUBTASKS
                </span>
              )}

              {/* Assignee avatars */}
              {task.assigneeIds.length > 0 && (
                <div className="flex items-center -space-x-1.5 ml-1">
                  {task.assigneeIds.slice(0, 2).map((uid) => {
                    const name = memberMap[uid] || uid;
                    return (
                      <div
                        key={uid}
                        className="h-4.5 w-4.5 rounded-full bg-violet-500/10 border border-white/10 flex items-center justify-center text-[8px] font-bold text-violet-400 flex-shrink-0 relative z-10 shadow-sm"
                        title={name}
                      >
                        {getInitials(name)}
                      </div>
                    );
                  })}
                  {task.assigneeIds.length > 2 && (
                    <div className="h-4.5 w-4.5 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-[7px] font-bold text-muted-foreground flex-shrink-0 relative z-0 shadow-sm">
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
            className="flex-shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all p-1.5 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/10"
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
