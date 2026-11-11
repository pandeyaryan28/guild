import * as React from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import {
  Zap,
  CheckCircle2,
  Circle,
  Calendar,
  Plus,
  Trash2,
  Users,
  BarChart3,
  Check,
  X,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '@guild/utils';
import { useAuth } from '../../../hooks/useAuth';
import { useWorkspaceCycles } from '../../../hooks/useWorkspaceCycles';
import { useWorkspaceIssues } from '../../../hooks/useWorkspaceIssues';

interface SprintTask {
  id: string;
  identifier: string;
  title: string;
  completed: boolean;
  points: number;
  assignee: string;
}

const DEFAULT_SPRINT_TASKS: SprintTask[] = [
  { id: 'st-1', identifier: 'ORB-101', title: 'Implement Liquid Glass Navigation Header', completed: true, points: 5, assignee: 'Alex' },
  { id: 'st-2', identifier: 'ORB-102', title: 'Design Dual-Theme Token Architecture', completed: true, points: 3, assignee: 'Elena' },
  { id: 'st-3', identifier: 'ORB-103', title: 'Build TipTap Block Canvas Integration', completed: false, points: 8, assignee: 'Aryan' },
  { id: 'st-4', identifier: 'ORB-104', title: 'Real-time WebSocket Operational Sync', completed: false, points: 5, assignee: 'Marcus' },
];

export function SprintCycleBlock({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { cycles, activeCycle } = useWorkspaceCycles(orgId);

  // Attributes with sensible defaults
  const title = node.attrs.title || (activeCycle ? activeCycle.title : 'Sprint Cycle 24: Core Platform & Speed');
  const cycleNumber = node.attrs.cycleNumber || (activeCycle ? activeCycle.number : 24);
  const rawTasks: SprintTask[] = node.attrs.tasks && node.attrs.tasks.length > 0 ? node.attrs.tasks : DEFAULT_SPRINT_TASKS;

  const [tasks, setTasks] = React.useState<SprintTask[]>(rawTasks);
  const [newTitle, setNewTitle] = React.useState('');
  const [newPoints, setNewPoints] = React.useState<number>(3);
  const [showAddForm, setShowAddForm] = React.useState(false);

  // Sync tasks to TipTap node attributes
  const persistTasks = (updated: SprintTask[]) => {
    setTasks(updated);
    const completedPts = updated.filter((t) => t.completed).reduce((acc, t) => acc + t.points, 0);
    const totalPts = updated.reduce((acc, t) => acc + t.points, 0);
    updateAttributes({
      tasks: updated,
      totalPoints: totalPts,
      completedPoints: completedPts,
    });
  };

  const totalPoints = tasks.reduce((sum, t) => sum + (t.points || 0), 0);
  const completedPoints = tasks.filter((t) => t.completed).reduce((sum, t) => sum + (t.points || 0), 0);
  const percent = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  const toggleTask = (taskId: string) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    persistTasks(updated);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: SprintTask = {
      id: `st-${Date.now()}`,
      identifier: `ORB-${100 + tasks.length + 1}`,
      title: newTitle.trim(),
      completed: false,
      points: Number(newPoints) || 1,
      assignee: userProfile?.fullName?.split(' ')[0] || 'Me'
    };

    const updated = [...tasks, newTask];
    persistTasks(updated);
    setNewTitle('');
    setShowAddForm(false);
  };

  const removeTask = (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    persistTasks(updated);
  };

  return (
    <NodeViewWrapper className="my-6 not-prose">
      <div className="relative group/block rounded-2xl border border-border dark:border-border-strong bg-surface/90 dark:bg-surface/55 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:shadow-2xl overflow-hidden">
        {/* Subtle top specular accent gradient line */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-primary to-emerald-400" />

        <div className="p-5 sm:p-6 space-y-5">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    Active Sprint • Cycle {cycleNumber}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                    <Calendar className="w-3 h-3" />
                    4 days remaining
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight mt-0.5">
                  {title}
                </h3>
              </div>
            </div>

            {/* Delete Block Pill */}
            <div className="flex items-center gap-1.5 opacity-0 group-hover/block:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => deleteNode()}
                title="Remove Sprint Block"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Points Progress Bar & Metrics */}
          <div className="p-4 rounded-xl bg-secondary/50 dark:bg-secondary/25 border border-border/70 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-foreground flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                Sprint Velocity & Scope
              </span>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{completedPoints} pts done</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground font-bold">{totalPoints} total pts</span>
                <span className="px-2 py-0.5 rounded-full bg-surface dark:bg-surface/80 border border-border text-[10px] text-foreground font-mono">
                  {percent}%
                </span>
              </div>
            </div>

            {/* Apple fluid spring progress track */}
            <div className="w-full h-2.5 rounded-full bg-border/60 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2 rounded-lg bg-surface/70 dark:bg-surface/30 border border-border/40">
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Done</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {tasks.filter((t) => t.completed).length} issues
                </div>
              </div>
              <div className="p-2 rounded-lg bg-surface/70 dark:bg-surface/30 border border-border/40">
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Remaining</div>
                <div className="text-sm font-bold text-foreground">
                  {tasks.filter((t) => !t.completed).length} issues
                </div>
              </div>
              <div className="p-2 rounded-lg bg-surface/70 dark:bg-surface/30 border border-border/40">
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Burn Rate</div>
                <div className="text-sm font-bold text-primary">
                  {(totalPoints > 0 ? (completedPoints / 10).toFixed(1) : 0)} pts/day
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Sprint Issue / Task List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1 pb-1">
              <span>Sprint Backlog ({tasks.length})</span>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Issue
              </button>
            </div>

            {/* Quick Add Form */}
            {showAddForm && (
              <form onSubmit={handleAddTask} className="flex items-center gap-2 p-2 rounded-xl bg-surface dark:bg-surface/80 border border-primary/40 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  type="text"
                  autoFocus
                  placeholder="Issue title or deliverable..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none px-2 py-1"
                />
                <select
                  value={newPoints}
                  onChange={(e) => setNewPoints(Number(e.target.value))}
                  className="bg-secondary/60 text-foreground border border-border text-xs rounded-lg px-2 py-1 outline-none"
                >
                  <option value={1}>1 pt</option>
                  <option value={2}>2 pts</option>
                  <option value={3}>3 pts</option>
                  <option value={5}>5 pts</option>
                  <option value={8}>8 pts</option>
                </select>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-secondary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            <div className="space-y-1">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    'group/item flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-all duration-200 select-none',
                    task.completed
                      ? 'bg-secondary/30 border-border/40 text-muted-foreground'
                      : 'bg-surface/80 dark:bg-surface/30 border-border hover:border-primary/40 shadow-xs'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className="cursor-pointer text-muted-foreground hover:text-emerald-500 transition-colors"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                    <span className="text-[11px] font-mono font-semibold text-muted-foreground px-1.5 py-0.5 rounded bg-secondary/80 border border-border/50">
                      {task.identifier}
                    </span>
                    <span className={cn('text-xs font-medium truncate', task.completed && 'line-through text-muted-foreground/70')}>
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border">
                      {task.points} pts
                    </span>
                    <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                      {task.assignee.charAt(0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTask(task.id)}
                      className="opacity-0 group-hover/item:opacity-100 p-1 text-muted-foreground hover:text-rose-500 rounded transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
