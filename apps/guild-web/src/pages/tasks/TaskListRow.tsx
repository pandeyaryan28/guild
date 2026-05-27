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
      'flex items-center gap-1 px-2.5 py-0.5 rounded border backdrop-blur-md font-mono text-[9px] font-bold select-none uppercase transition-all duration-300',
      isOverdue 
        ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]' 
        : isToday 
        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)] animate-pulse' 
        : isTomorrow 
        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.15)]' 
        : 'bg-white/[0.02] border-white/10 text-muted-foreground',
    )}>
      <Calendar className="h-2.5 w-2.5 opacity-80" />
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

  // Custom styling for Severity Brackets
  const severityBracket = React.useMemo(() => {
    switch (task.priority) {
      case 'urgent':
        return { text: `[/// URGENT ///]`, className: 'text-red-400 border-red-500/20 bg-red-500/5 shadow-[0_0_6px_rgba(239,68,68,0.25)] font-black' };
      case 'high':
        return { text: `[// HIGH //]`, className: 'text-amber-400 border-amber-500/20 bg-amber-500/5 shadow-[0_0_6px_rgba(245,158,11,0.15)] font-bold' };
      case 'medium':
        return { text: `[MEDIUM]`, className: 'text-violet-400 border-violet-500/20 bg-violet-500/5' };
      case 'low':
        return { text: `[LOW]`, className: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5' };
      default:
        return null;
    }
  }, [task.priority]);

  // Dynamic hexadecimal clip-path hexagon polygon
  const hexClipStyle: React.CSSProperties = {
    clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
  };

  const taskIdCode = `T-${task.id.slice(0, 4).toUpperCase()}`;

  return (
    <>
      <div
        className={cn(
          'task-row group relative flex items-start gap-4 px-4 py-3 border select-none transition-all duration-300 font-mono',
          isSelected 
            ? 'bg-violet-950/20 dark:bg-violet-950/5 border-violet-500/40 shadow-[0_0_12px_rgba(167,139,250,0.15)]' 
            : 'bg-white/[0.01] dark:bg-black/[0.1] border-white/5 hover:border-violet-500/20 hover:bg-white/[0.02] dark:hover:bg-white/[0.002] hover:shadow-[0_0_8px_rgba(167,139,250,0.08)] hover:-translate-y-0.5',
          isDone && 'opacity-45 hover:opacity-65',
        )}
        style={{ paddingLeft: depth > 0 ? `${16 + depth * 22}px` : undefined }}
        onClick={() => onSelect(task)}
      >
        {/* Dynamic laser guide lines for nested subtasks */}
        {depth > 0 && (
          <div 
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ 
              left: `${(depth - 1) * 22 + 14}px`,
              width: '20px' 
            }}
          >
            {/* Cyber laser horizontal and vertical lines */}
            <div className="absolute top-0 bottom-1/2 left-[12px] w-[1px] bg-gradient-to-b from-white/10 to-violet-500/30 dark:from-white/5 dark:to-violet-500/15" />
            <div className="absolute top-1/2 left-[12px] w-[10px] h-[1px] bg-violet-500/30 dark:bg-violet-500/15" />
          </div>
        )}

        {/* Dynamic Chevron trigger */}
        {hasSubtasks && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="flex-shrink-0 mt-1 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded p-1 transition-all duration-200 min-h-7 min-w-7 flex items-center justify-center cursor-pointer border border-transparent hover:border-white/10"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-300", expanded ? "rotate-90 text-violet-400" : "")} />
          </button>
        )}

        {/* Hexagonal clipped toggle plate checkbox */}
        <div className="relative mt-1 shrink-0 select-none" data-no-click>
          <button
            onClick={handleComplete}
            style={hexClipStyle}
            className={cn(
              'h-6 w-6 flex items-center justify-center transition-all duration-300 cursor-pointer relative z-10 font-bold min-h-6 min-w-6',
              isDone
                ? 'bg-gradient-to-br from-cyan-400 to-sky-500 text-white shadow-[0_0_10px_rgba(34,211,238,0.5)] scale-102 hover:scale-105 active:scale-95'
                : isReview
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse'
                  : 'bg-white/[0.04] dark:bg-black/20 border border-white/20 hover:border-cyan-400/60 hover:bg-cyan-500/5 hover:scale-105 active:scale-95',
              completing && 'opacity-65 scale-90',
            )}
            title={isDone ? 'Mark active' : isReview ? 'Mark active' : 'Mark completed'}
          >
            {isDone && (
              <Check className="h-3 w-3 text-white font-black stroke-[3.5px] animate-bounce-subtle" />
            )}
            {isReview && (
              <Clock className="h-3 w-3 text-white animate-spin" style={{ animationDuration: '3s' }} />
            )}
          </button>
        </div>

        {/* Operational Command Row details */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 pl-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            {/* Monospace index ID code tag */}
            <span className="font-mono text-[9px] font-black text-violet-400 bg-violet-500/5 border border-violet-500/10 px-1.5 py-0.5 rounded w-fit select-all tracking-wider select-none shrink-0">
              {taskIdCode}
            </span>

            {/* Title Text */}
            <span className={cn(
              'text-[12.5px] leading-snug transition-colors break-words font-semibold font-sans tracking-wide',
              isDone 
                ? 'line-through text-muted-foreground/60 font-normal' 
                : isReview 
                ? 'text-foreground/75 italic font-medium' 
                : isSelected 
                ? 'text-violet-400 font-bold' 
                : 'text-foreground/90 group-hover:text-violet-400 transition-colors duration-300',
            )}>
              {task.title}
            </span>
          </div>

          {/* Telemetry Row Badge tags */}
          {(task.dueDate || task.priority !== 'none' || task.assigneeIds.length > 0 || (task.status !== 'todo' && task.status !== 'done') || hasSubtasks) && (
            <div className="flex items-center gap-2 flex-wrap pt-1 select-none">
              {/* Target date */}
              <DueBadge dueDate={task.dueDate as any} />

              {/* Glowing Cyber Severity bracket */}
              {task.priority !== 'none' && severityBracket && (
                <span className={cn('px-2 py-0.5 rounded border text-[8.5px] select-none tracking-widest font-mono', severityBracket.className)}>
                  {severityBracket.text}
                </span>
              )}

              {/* Holographic Status Badge (non-todo) */}
              {task.status !== 'todo' && task.status !== 'done' && statusCfg && (
                <span
                  className="text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border select-none font-mono"
                  style={{ 
                    backgroundColor: `${statusCfg.dot}08`, 
                    borderColor: `${statusCfg.dot}20`, 
                    color: statusCfg.dot,
                    boxShadow: `0 0 6px ${statusCfg.dot}10`
                  }}
                >
                  {statusCfg.label}
                </span>
              )}

              {/* Nested count progress */}
              {hasSubtasks && (
                <span className="text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.02] border border-white/10 text-muted-foreground select-none font-mono">
                  {subtasks.filter((s) => s.status === 'done').length}/{subtasks.length} subtasks
                </span>
              )}

              {/* Overlapping tactical assignee initials */}
              {task.assigneeIds.length > 0 && (
                <div className="flex items-center -space-x-1.5 ml-1 select-none">
                  {task.assigneeIds.slice(0, 3).map((uid) => {
                    const name = memberMap[uid] || uid;
                    return (
                      <div
                        key={uid}
                        className="h-4.5 w-4.5 rounded-full bg-violet-500/15 border border-white/10 flex items-center justify-center text-[7.5px] font-black text-violet-400 shadow-inner tracking-tighter"
                        title={name}
                      >
                        {getInitials(name)}
                      </div>
                    );
                  })}
                  {task.assigneeIds.length > 3 && (
                    <div className="h-4.5 w-4.5 rounded bg-white/[0.04] border border-white/10 flex items-center justify-center text-[7px] font-bold text-muted-foreground">
                      +{task.assigneeIds.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Technical Delete Trigger (fully hover optimized) */}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            className="flex-shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all p-2 rounded hover:bg-red-500/10 border border-transparent hover:border-red-500/15 cursor-pointer min-h-8 min-w-8 flex items-center justify-center shrink-0"
            title="Remove Directive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Recursive Subtasks expansion */}
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
