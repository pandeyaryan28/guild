import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Trash2, Calendar, Check, Clock, AlertCircle } from 'lucide-react';
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
      'flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-medium select-none uppercase tracking-tight transition-all duration-300',
      isOverdue 
        ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-150 dark:border-rose-900/30 text-rose-600 dark:text-rose-455' 
        : isToday 
        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-150 dark:border-amber-900/30 text-amber-600 dark:text-amber-450 animate-pulse' 
        : isTomorrow 
        ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-150 dark:border-sky-900/30 text-sky-600 dark:text-sky-400' 
        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400',
    )}>
      <Calendar className="h-3.5 w-3.5 opacity-80 shrink-0" />
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

  // Custom styling for priority tags (soft modern SaaS chips)
  const priorityBadge = React.useMemo(() => {
    switch (task.priority) {
      case 'urgent':
        return { text: 'Urgent', className: 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-950/20 font-semibold' };
      case 'high':
        return { text: 'High', className: 'text-amber-600 dark:text-amber-450 border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20 font-semibold' };
      case 'medium':
        return { text: 'Medium', className: 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30 bg-indigo-50 dark:bg-indigo-950/20' };
      case 'low':
        return { text: 'Low', className: 'text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/30 bg-teal-50 dark:bg-teal-950/20' };
      default:
        return null;
    }
  }, [task.priority]);

  const taskIdCode = `#${task.id.slice(0, 4).toUpperCase()}`;

  return (
    <>
      <div
        className={cn(
          'group relative flex items-center justify-between px-5 py-4 border rounded-2xl transition-all duration-300',
          isSelected 
            ? 'bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-500/40 dark:border-indigo-400/45 shadow-sm' 
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/85 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-850/30 hover:shadow-sm hover:-translate-y-0.5',
          isDone && 'opacity-55 hover:opacity-75',
        )}
        style={{ paddingLeft: depth > 0 ? `${20 + depth * 24}px` : undefined }}
        onClick={() => onSelect(task)}
      >
        {/* Curved branch lines for subtask visualization */}
        {depth > 0 && (
          <div 
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ 
              left: `${(depth - 1) * 24 + 18}px`,
              width: '24px' 
            }}
          >
            {/* Elegant clean vertical thread and curve branch */}
            <div className="absolute top-0 bottom-1/2 left-[12px] w-[1px] bg-slate-200 dark:bg-slate-800" />
            <div className="absolute top-1/2 left-[12px] w-[12px] h-[1px] bg-slate-200 dark:bg-slate-800" />
          </div>
        )}

        <div className="flex items-center gap-4 min-w-0 flex-1 pl-1">
          {/* Chevron trigger for subtasks */}
          {hasSubtasks && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl p-1 transition-all duration-200 min-h-7 min-w-7 flex items-center justify-center cursor-pointer border border-transparent"
            >
              <ChevronRight className={cn("h-4 w-4 transition-transform duration-300", expanded ? "rotate-90 text-indigo-500" : "")} />
            </button>
          )}

          {/* Premium circular toggle checkbox */}
          <div className="relative shrink-0 select-none" data-no-click>
            <button
              onClick={handleComplete}
              className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer relative z-10 font-bold min-h-6 min-w-6 border',
                isDone
                  ? 'bg-emerald-500 border-transparent text-white shadow-sm scale-102 hover:scale-105 active:scale-95'
                  : isReview
                    ? 'bg-amber-500 border-transparent text-white shadow-sm animate-pulse'
                    : 'border-slate-300 dark:border-slate-700 bg-transparent hover:border-emerald-500 dark:hover:border-emerald-450 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 hover:scale-105 active:scale-95',
                completing && 'opacity-60 scale-90',
              )}
              title={isDone ? 'Mark Active' : isReview ? 'Mark Active' : 'Mark Completed'}
            >
              {isDone && (
                <Check className="h-3.5 w-3.5 text-white stroke-[3.5px]" />
              )}
              {isReview && (
                <Clock className="h-3 w-3 text-white animate-spin" style={{ animationDuration: '3s' }} />
              )}
            </button>
          </div>

          {/* Task Info details */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 pl-1">
            <div className="flex items-center gap-2.5 flex-wrap md:flex-nowrap">
              {/* Modern clean task code tag */}
              <span className="font-sans text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full select-none shrink-0 tracking-tight">
                {taskIdCode}
              </span>

              {/* Title text */}
              <span className={cn(
                'text-[14px] leading-snug transition-colors break-words font-semibold font-sans tracking-tight',
                isDone 
                  ? 'line-through text-slate-400 dark:text-slate-500 font-normal' 
                  : isReview 
                  ? 'text-slate-600 dark:text-slate-300 italic font-medium' 
                  : isSelected 
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold' 
                  : 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300',
              )}>
                {task.title}
              </span>
            </div>

            {/* Micro badges tags */}
            {(task.dueDate || task.priority !== 'none' || task.assigneeIds.length > 0 || (task.status !== 'todo' && task.status !== 'done') || hasSubtasks) && (
              <div className="flex items-center gap-2.5 flex-wrap pt-0.5 select-none">
                {/* Due Date */}
                <DueBadge dueDate={task.dueDate as any} />

                {/* Priority Chip */}
                {task.priority !== 'none' && priorityBadge && (
                  <span className={cn('px-2.5 py-0.5 rounded-full border text-[11px] select-none tracking-tight font-medium', priorityBadge.className)}>
                    {priorityBadge.text}
                  </span>
                )}

                {/* Status Badge */}
                {task.status !== 'todo' && task.status !== 'done' && statusCfg && (
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border select-none"
                    style={{ 
                      backgroundColor: `${statusCfg.dot}10`, 
                      borderColor: `${statusCfg.dot}20`, 
                      color: statusCfg.dot,
                    }}
                  >
                    {statusCfg.label}
                  </span>
                )}

                {/* Subtask count */}
                {hasSubtasks && (
                  <span className="text-[11px] font-semibold tracking-tight px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 select-none">
                    {subtasks.filter((s) => s.status === 'done').length}/{subtasks.length} subtasks
                  </span>
                )}

                {/* Overlapping assignee initials */}
                {task.assigneeIds.length > 0 && (
                  <div className="flex items-center -space-x-1.5 ml-1 select-none">
                    {task.assigneeIds.slice(0, 3).map((uid) => {
                      const name = memberMap[uid] || uid;
                      return (
                        <div
                          key={uid}
                          className="h-5 w-5 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-[9px] font-bold text-indigo-650 dark:text-indigo-400 shadow-sm"
                          title={name}
                        >
                          {getInitials(name)}
                        </div>
                      );
                    })}
                    {task.assigneeIds.length > 3 && (
                      <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[9px] font-semibold text-slate-500 dark:text-slate-450 shadow-sm">
                        +{task.assigneeIds.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Delete Trigger */}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            className="flex-shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-transparent rounded-xl p-2 transition-all cursor-pointer min-h-9 min-w-9 flex items-center justify-center shrink-0"
            title="Remove Task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Recursive Subtasks list */}
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
