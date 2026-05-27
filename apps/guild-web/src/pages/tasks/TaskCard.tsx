import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, Calendar, Clock, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Task, type TaskLabel, PRIORITY_CONFIG } from '../../lib/tasks';
import { LabelBadge } from '../../components/tasks/LabelBadge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface TaskCardProps {
  task: Task;
  labels: TaskLabel[];
  memberMap: Map<string, { fullName: string; username: string }>;
  onClick: () => void;
  onDelete: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, labels, memberMap, onClick, onDelete, isDragging }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const taskLabels = labels.filter((l) => task.labelIds.includes(l.id));
  const priority = PRIORITY_CONFIG[task.priority];
  const due = task.dueDate?.toDate();
  const now = new Date();
  const isOverdue = due && due < now && task.status !== 'done';
  const isDueToday = due && due.toDateString() === now.toDateString() && task.status !== 'done';

  const priorityColor = priority?.color || '#52525b';

  // Custom visual Severity codes for the card HUD
  const severityTag = React.useMemo(() => {
    switch (task.priority) {
      case 'urgent':
        return { text: `[/// URGENT ///]`, className: 'text-red-400 font-black shadow-[0_0_8px_rgba(239,68,68,0.2)] bg-red-500/5 px-1.5 py-0.5 rounded border border-red-500/10' };
      case 'high':
        return { text: `[// HIGH //]`, className: 'text-amber-400 font-bold bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10' };
      case 'medium':
        return { text: `[MEDIUM]`, className: 'text-violet-400 bg-violet-500/5 px-1.5 py-0.5 rounded border border-violet-500/10' };
      case 'low':
        return { text: `[LOW]`, className: 'text-cyan-400 bg-cyan-500/5 px-1.5 py-0.5 rounded border border-cyan-500/10' };
      default:
        return null;
    }
  }, [task.priority]);

  const taskIdCode = `T-${task.id.slice(0, 4).toUpperCase()}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative rounded-xl border bg-white/[0.015] dark:bg-black/[0.15] backdrop-blur-md transition-all duration-300 cursor-grab active:cursor-grabbing select-none overflow-hidden pl-3.5 py-4 pr-4 font-mono',
        'border-white/5 hover:border-violet-500/25 hover:bg-white/[0.035] dark:hover:bg-white/[0.002] hover:shadow-[0_8px_20px_-10px_rgba(124,58,237,0.2)] hover:-translate-y-0.5',
        isSortableDragging && 'opacity-20 border-violet-500/10',
        isDragging && 'shadow-2xl shadow-violet-500/25 border-violet-500/35 bg-white/[0.04] dark:bg-white/[0.004] rotate-1 scale-102',
      )}
      onClick={(e) => { 
        if (!(e.target as HTMLElement).closest('[data-no-click]')) {
          onClick(); 
        }
      }}
    >
      {/* Blueprint Grid mesh background specifically inside the card HUD */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />

      {/* Borderless absolute Glowing Left Laser indicator line */}
      {task.priority !== 'none' && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300"
          style={{ 
            backgroundColor: priorityColor, 
            boxShadow: `0 0 10px ${priorityColor}`
          }}
        />
      )}

      <div className="space-y-3 relative z-10">
        
        {/* Monospace Code index & Severity bracket tags */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[9px] font-black text-violet-400/90 bg-violet-500/5 border border-violet-500/10 px-1 rounded select-none tracking-wider">
              {taskIdCode}
            </span>
            {severityTag && (
              <span className={cn('text-[8.5px] font-mono select-none tracking-widest', severityTag.className)}>
                {severityTag.text}
              </span>
            )}
          </div>

          <div data-no-click className="shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent hover:border-white/10 transition-all outline-none min-h-7 min-w-7 flex items-center justify-center cursor-pointer">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 border border-white/10 bg-surface/95 backdrop-blur-2xl p-1 text-xs shadow-xl rounded font-mono">
                <DropdownMenuItem onClick={onClick} className="font-semibold cursor-pointer py-1.5 hover:bg-white/5 rounded">Open Node</DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:text-red-400 font-semibold cursor-pointer py-1.5 hover:bg-red-500/10 rounded">Remove Node</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title Node Description */}
        <div className="flex items-start gap-1.5">
          <Terminal className="h-3.5 w-3.5 text-violet-400/50 mt-0.5 shrink-0" />
          <p className="text-[12px] font-sans font-semibold text-foreground/90 group-hover:text-violet-400 leading-snug flex-1 min-w-0 tracking-wide break-words transition-colors duration-300">
            {task.title}
          </p>
        </div>

        {/* Custom Telemetry Badges */}
        {taskLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {taskLabels.slice(0, 2).map((l) => (
              <LabelBadge key={l.id} label={l} />
            ))}
            {taskLabels.length > 2 && (
              <span className="text-[8.5px] font-black text-muted-foreground/60 bg-white/[0.02] border border-white/10 px-1 rounded select-none">
                +{taskLabels.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Telemetry stats: assignees & clocks */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 select-none">
          {/* Overlapping tactical initials */}
          <div className="flex items-center -space-x-1.5">
            {task.assigneeIds.slice(0, 3).map((uid) => {
              const m = memberMap.get(uid);
              const initials = (m?.fullName || m?.username || '?')[0].toUpperCase();
              return (
                <div
                  key={uid}
                  className="h-4.5 w-4.5 rounded-full bg-violet-500/15 border border-white/10 flex items-center justify-center text-[7.5px] font-black text-violet-400 shadow-sm transition-colors cursor-default"
                  title={m?.fullName || m?.username}
                >
                  {initials}
                </div>
              );
            })}
            {task.assigneeIds.length > 3 && (
              <div className="h-4.5 w-4.5 rounded bg-white/[0.04] border border-white/10 flex items-center justify-center text-[7px] font-bold text-muted-foreground shadow-sm">
                +{task.assigneeIds.length - 3}
              </div>
            )}
          </div>

          {/* Glowing Due Clock badge */}
          {due && (
            <span className={cn(
              'flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border backdrop-blur-md transition-all duration-300 font-mono',
              isOverdue 
                ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]' 
                : isDueToday 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)] animate-pulse' 
                : 'bg-white/[0.02] border-white/10 text-muted-foreground',
            )}>
              <Clock className="h-2.5 w-2.5 opacity-80" />
              {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
