import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Trash2, Calendar, Check, Clock } from 'lucide-react';
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
      'flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border backdrop-blur-md font-mono select-none transition-all duration-300',
      isOverdue 
        ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.1)]' 
        : isToday 
        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)] animate-pulse' 
        : isTomorrow 
        ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.1)]' 
        : 'bg-white/[0.03] border-white/5 text-muted-foreground',
    )}>
      <Calendar className="h-3 w-3 opacity-80" />
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

  // Safe defaults if priority is missing
  const priorityLabel = priority?.label || 'None';
  const priorityColor = priority?.color || '#52525b';

  return (
    <>
      <div
        className={cn(
          'task-row group relative flex items-start gap-4 px-4.5 py-3.5 rounded-2xl cursor-pointer select-none border transition-all duration-300 ease-out',
          isSelected 
            ? 'bg-white/[0.05] dark:bg-white/[0.008] border-violet-500/40 shadow-[0_8px_24px_-8px_rgba(124,58,237,0.25)]' 
            : 'bg-white/[0.015] dark:bg-white/[0.002] border-white/5 hover:border-violet-500/25 hover:bg-white/[0.035] dark:hover:bg-white/[0.004] hover:shadow-[0_12px_24px_-12px_rgba(124,58,237,0.12)] hover:-translate-y-0.5',
          isDone && 'opacity-55 hover:opacity-75',
        )}
        style={{ paddingLeft: depth > 0 ? `${16 + depth * 22}px` : undefined }}
        onClick={() => onSelect(task)}
      >
        {/* Decorative hierarchical left guide lines for subtasks with glow */}
        {depth > 0 && (
          <div 
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ 
              left: `${(depth - 1) * 22 + 14}px`,
              width: '20px' 
            }}
          >
            {/* Curved subtle thread line */}
            <div className="absolute top-0 bottom-1/2 left-[12px] w-[1.5px] bg-gradient-to-b from-white/10 to-violet-500/20 dark:from-white/5 dark:to-violet-500/10" />
            <div className="absolute top-1/2 left-[12px] w-[12px] h-[1.5px] bg-violet-500/20 dark:bg-violet-500/10 rounded-r" />
          </div>
        )}

        {/* Expand/collapse subtask chevron with premium micro-interaction */}
        {hasSubtasks && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="flex-shrink-0 mt-0.5 text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5 p-1.5 rounded-xl border border-transparent hover:border-white/10 transition-all duration-200 relative z-10 min-h-8 min-w-8 flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform duration-300", expanded ? "rotate-90 text-violet-400" : "")} />
          </button>
        )}

        {/* Custom interactive checkbox circle with neon states */}
        <button
          onClick={handleComplete}
          className={cn(
            'flex-shrink-0 h-6 w-6 mt-0.5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300 cursor-pointer relative z-10 min-h-6 min-w-6',
            isDone
              ? 'bg-gradient-to-br from-cyan-400 to-sky-500 border-transparent text-white shadow-[0_0_10px_rgba(34,211,238,0.4)] scale-102 hover:scale-105 active:scale-95'
              : isReview
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-transparent text-white shadow-[0_0_10px_rgba(245,158,11,0.4)] animate-pulse'
                : 'border-white/20 hover:border-violet-400 hover:bg-violet-500/10 hover:scale-105 active:scale-95',
            completing && 'opacity-65 scale-90',
          )}
          title={isDone ? 'Mark incomplete' : isReview ? 'In review - Mark incomplete' : 'Mark complete'}
        >
          {isDone && (
            <Check className="h-3.5 w-3.5 text-white font-black stroke-[3px] animate-bounce-subtle" />
          )}
          {isReview && (
            <Clock className="h-3.5 w-3.5 text-white font-black animate-spin" style={{ animationDuration: '3s' }} />
          )}
        </button>

        {/* Title, tags and details metadata */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
          {/* Title Text */}
          <span className={cn(
            'text-[13.5px] leading-snug transition-colors break-words font-semibold tracking-wide',
            isDone 
              ? 'line-through text-muted-foreground/70 font-normal' 
              : isReview 
              ? 'text-foreground/80 italic font-medium' 
              : isSelected 
              ? 'text-violet-400 font-bold' 
              : 'text-foreground/90 group-hover:text-foreground transition-colors',
          )}>
            {task.title}
          </span>

          {/* Meta badges row */}
          {(task.dueDate || task.priority !== 'none' || task.assigneeIds.length > 0 || (task.status !== 'todo' && task.status !== 'done') || hasSubtasks) && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Due date */}
              <DueBadge dueDate={task.dueDate as any} />

              {/* Priority badge with glow */}
              {task.priority !== 'none' && (
                <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/5 px-2.5 py-1 rounded-xl select-none">
                  <span
                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ 
                      backgroundColor: priorityColor, 
                      boxShadow: `0 0 8px ${priorityColor}` 
                    }}
                    title={priorityLabel}
                  />
                  <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{priorityLabel}</span>
                </div>
              )}

              {/* Status badge (for in_progress & review) */}
              {task.status !== 'todo' && task.status !== 'done' && statusCfg && (
                <span
                  className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border select-none"
                  style={{ 
                    backgroundColor: `${statusCfg.dot}08`, 
                    borderColor: `${statusCfg.dot}20`, 
                    color: statusCfg.dot,
                    boxShadow: `0 0 8px ${statusCfg.dot}10`
                  }}
                >
                  {statusCfg.label}
                </span>
              )}

              {/* Subtask progress count badge */}
              {hasSubtasks && (
                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/5 text-muted-foreground select-none">
                  {subtasks.filter((s) => s.status === 'done').length}/{subtasks.length} Subtasks
                </span>
              )}

              {/* Overlapping premium assignee avatars */}
              {task.assigneeIds.length > 0 && (
                <div className="flex items-center -space-x-1.5 ml-1 select-none">
                  {task.assigneeIds.slice(0, 3).map((uid) => {
                    const name = memberMap[uid] || uid;
                    return (
                      <div
                        key={uid}
                        className="h-5 w-5 rounded-full bg-violet-500/10 border border-white/10 hover:border-violet-500/30 flex items-center justify-center text-[8.5px] font-bold text-violet-400 flex-shrink-0 relative z-10 shadow-sm transition-colors cursor-default"
                        title={name}
                      >
                        {getInitials(name)}
                      </div>
                    );
                  })}
                  {task.assigneeIds.length > 3 && (
                    <div className="h-5 w-5 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-[7.5px] font-bold text-muted-foreground flex-shrink-0 relative z-0 shadow-sm">
                      +{task.assigneeIds.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Action (Fully accessible with clean styling) */}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            className="flex-shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all p-2 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/15 cursor-pointer min-h-9 min-w-9 flex items-center justify-center"
            title="Delete task"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {/* Hierarchical Subtasks Rendering */}
      {expanded && subtasks.map((sub) => (
        <TaskListRow
          key={sub.id}
          task={sub}
          orgId={orgId}
          actor={actor}
          depth={depth + 1}
          subtasks={[]}
          isSelected={false}
          onSelect={onSelect}
          onDelete={onDelete}
          memberMap={memberMap}
        />
      ))}
    </>
  );
}
