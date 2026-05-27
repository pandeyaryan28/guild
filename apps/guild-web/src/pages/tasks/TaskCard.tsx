import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, Calendar, Clock } from 'lucide-react';
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

  const priorityLabel = priority?.label || 'None';
  const priorityColor = priority?.color || '#52525b';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative rounded-2xl border bg-white/[0.025] dark:bg-white/[0.002] backdrop-blur-md transition-all duration-300 cursor-grab active:cursor-grabbing select-none overflow-hidden pl-3',
        'border-white/5 hover:border-violet-500/25 hover:bg-white/[0.05] dark:hover:bg-white/[0.005] hover:shadow-[0_12px_24px_-10px_rgba(124,58,237,0.18)] hover:-translate-y-0.5',
        isSortableDragging && 'opacity-25 border-violet-500/15',
        isDragging && 'shadow-2xl shadow-violet-500/25 border-violet-500/35 bg-white/[0.06] dark:bg-white/[0.01] rotate-1 scale-102',
      )}
      onClick={(e) => { 
        if (!(e.target as HTMLElement).closest('[data-no-click]')) {
          onClick(); 
        }
      }}
    >
      {/* Absolute Priority Glowing Left Accent Strip */}
      {task.priority !== 'none' && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-[5px] transition-all duration-300"
          style={{ 
            backgroundColor: priorityColor, 
            boxShadow: `0 0 12px ${priorityColor}80`
          }}
          title={`Priority: ${priorityLabel}`}
        />
      )}

      <div className="p-4.5 space-y-3.5">
        {/* Title and Dropdown Menu Actions */}
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12.5px] font-bold text-foreground/95 group-hover:text-foreground leading-snug flex-1 min-w-0 tracking-wide break-words transition-colors">
            {task.title}
          </p>

          <div data-no-click className="shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 rounded-xl p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5 border border-transparent hover:border-white/10 transition-all outline-none min-h-8 min-w-8 flex items-center justify-center cursor-pointer">
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 border border-white/10 bg-surface/90 backdrop-blur-xl p-1 text-xs shadow-xl rounded-xl">
                <DropdownMenuItem onClick={onClick} className="font-semibold cursor-pointer py-2 hover:bg-white/5 rounded-lg">Open Details</DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:text-red-400 font-semibold cursor-pointer py-2 hover:bg-red-500/10 rounded-lg">Delete Task</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Custom Badges (Labels) row */}
        {taskLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {taskLabels.slice(0, 2).map((l) => (
              <LabelBadge key={l.id} label={l} />
            ))}
            {taskLabels.length > 2 && (
              <span className="text-[9px] font-black text-muted-foreground/60 bg-white/[0.03] border border-white/5 px-2 py-0.5 rounded-lg select-none">
                +{taskLabels.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Footer Area: Avatars & Due Badge */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5 select-none">
          {/* Overlapping Assigned Members */}
          <div className="flex items-center -space-x-1.5">
            {task.assigneeIds.slice(0, 3).map((uid) => {
              const m = memberMap.get(uid);
              const initials = (m?.fullName || m?.username || '?')[0].toUpperCase();
              return (
                <div
                  key={uid}
                  className="h-5 w-5 rounded-full bg-violet-500/10 border border-white/10 hover:border-violet-500/30 flex items-center justify-center text-[8.5px] font-bold text-violet-400 shadow-sm transition-colors cursor-default"
                  title={m?.fullName || m?.username}
                >
                  {initials}
                </div>
              );
            })}
            {task.assigneeIds.length > 3 && (
              <div className="h-5 w-5 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-[7.5px] font-bold text-muted-foreground shadow-sm">
                +{task.assigneeIds.length - 3}
              </div>
            )}
          </div>

          {/* Styled Due Date Badge */}
          {due && (
            <span className={cn(
              'flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border backdrop-blur-md font-mono transition-all duration-300',
              isOverdue 
                ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.1)]' 
                : isDueToday 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)] animate-pulse' 
                : 'bg-white/[0.03] border-white/5 text-muted-foreground',
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
