import * as React from 'react';
import { Check, ChevronRight, Target, ClipboardList } from 'lucide-react';
import { updateTask } from '../../lib/tasks';
import { cn } from '@/lib/utils';

export interface WorkspaceCardProps {
  type: 'Task' | 'Goal' | 'Request';
  id: string;
  title: string;
  orgId: string;
  actor: any;
  tasks: any[];
  goals: any[];
  requests: any[];
  onOpenCard: (paramKey: string, val: string) => void;
}

export function WorkspaceCard({
  type,
  id,
  title,
  orgId,
  actor,
  tasks,
  goals,
  requests,
  onOpenCard
}: WorkspaceCardProps) {
  
  if (type === 'Task') {
    const taskObj = tasks.find(t => t.id === id);
    const checked = taskObj ? taskObj.status === 'done' : false;

    const handleCheckboxToggle = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!taskObj) return;
      const nextStatus = checked ? 'todo' : 'done';
      try {
        await updateTask(taskObj.id, orgId, { status: nextStatus }, actor);
      } catch (err) {
        console.error('Failed to toggle card task status:', err);
      }
    };

    return (
      <div 
        onClick={() => onOpenCard('task', id)}
        className="my-2 p-3.5 rounded-xl border border-white/5 aether-glass bg-indigo-500/[0.02] hover:bg-indigo-500/[0.04] hover:border-primary/20 transition-all flex items-start gap-3 cursor-pointer shadow-md select-none group"
      >
        <button
          onClick={handleCheckboxToggle}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded border mt-0.5 transition-all cursor-pointer",
            checked 
              ? "bg-primary border-primary text-white" 
              : "border-white/20 hover:border-white/30 bg-white/2"
          )}
        >
          {checked && <Check className="h-3 w-3 stroke-[3]" />}
        </button>
        <div className="flex-1 min-w-0">
          <span className={cn(
            "text-xs font-bold leading-snug block truncate",
            checked ? "text-muted-foreground line-through decoration-white/10" : "text-foreground"
          )}>
            {title}
          </span>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[8px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">Task</span>
            {taskObj && (
              <span className={cn(
                "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                taskObj.priority === 'urgent' ? "text-red-400 bg-red-500/10" :
                taskObj.priority === 'high' ? "text-orange-400 bg-orange-500/10" :
                taskObj.priority === 'medium' ? "text-amber-400 bg-amber-500/10" : "text-muted-foreground bg-white/5"
              )}>
                {taskObj.priority} priority
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors self-center" />
      </div>
    );
  }

  if (type === 'Goal') {
    const goalObj = goals.find(g => g.id === id);
    return (
      <div 
        onClick={() => onOpenCard('goal', id)}
        className="my-2 p-3.5 rounded-xl border border-white/5 aether-glass bg-emerald-500/[0.02] hover:bg-emerald-500/[0.04] hover:border-primary/20 transition-all flex items-start gap-3 cursor-pointer shadow-md select-none group"
      >
        <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
          <Target className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold leading-snug text-foreground block truncate">{title}</span>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Goal</span>
            {goalObj && (
              <span className="text-[8px] font-bold text-muted-foreground uppercase">{goalObj.horizon.replace('_', ' ')}</span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors self-center" />
      </div>
    );
  }

  if (type === 'Request') {
    const reqObj = requests.find(r => r.id === id);
    const status = reqObj ? reqObj.status : 'pending';

    return (
      <div 
        onClick={() => onOpenCard('request', id)}
        className="my-2 p-3.5 rounded-xl border border-white/5 aether-glass bg-amber-500/[0.02] hover:bg-amber-500/[0.04] hover:border-primary/20 transition-all flex items-start gap-3 cursor-pointer shadow-md select-none group"
      >
        <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
          <ClipboardList className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold leading-snug text-foreground block truncate">{title}</span>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[8px] font-black uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Request</span>
            <span className={cn(
              "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border",
              status === 'approved' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
              status === 'rejected' ? "bg-red-500/10 border-red-500/20 text-red-400" :
              "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
            )}>
              {status}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors self-center" />
      </div>
    );
  }

  return null;
}
