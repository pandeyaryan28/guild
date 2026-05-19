import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Plus, Calendar, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useGoals } from '../../hooks/useGoals';
import { CreateGoalModal } from './CreateGoalModal';
import type { Goal } from '../../lib/goals';

const STATUS_CONFIG: Record<Goal['status'], { label: string; color: string; dot: string }> = {
  active:    { label: 'Active',    color: 'text-violet-400', dot: '#a78bfa' },
  completed: { label: 'Completed', color: 'text-emerald-400', dot: '#34d399' },
  cancelled: { label: 'Cancelled', color: 'text-zinc-500',    dot: '#52525b' },
};

function GoalCard({ goal }: { goal: Goal }) {
  const navigate = useNavigate();
  const config = STATUS_CONFIG[goal.status];
  const due = goal.targetDate?.toDate?.();
  const now = new Date();
  const isOverdue = due && due < now && goal.status === 'active';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative rounded-xl border border-border/40 bg-card p-5 cursor-pointer',
        'hover:border-violet-500/40 hover:bg-card/80 transition-all duration-200',
        'hover:shadow-lg hover:shadow-black/20',
      )}
      onClick={() => navigate(`/goals/${goal.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.dot }} />
          <span className={cn('text-[10px] font-semibold uppercase tracking-wider', config.color)}>
            {config.label}
          </span>
        </div>
        {due && (
          <span className={cn(
            'flex items-center gap-1 text-[10px] font-medium',
            isOverdue ? 'text-red-400' : 'text-muted-foreground',
          )}>
            <Calendar className="h-2.5 w-2.5" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      <h3 className="text-sm font-semibold text-foreground mb-1 leading-snug group-hover:text-violet-400 transition-colors">
        {goal.title}
      </h3>

      {goal.description && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
          {goal.description}
        </p>
      )}

      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-violet-400 text-xs">
        →
      </div>
    </motion.div>
  );
}

export function GoalsPage() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { goals, loading } = useGoals(orgId);
  const [createOpen, setCreateOpen] = React.useState(false);

  const active = goals.filter((g) => g.status === 'active');
  const others = goals.filter((g) => g.status !== 'active');

  if (!orgId) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
            <Target className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Goals</h1>
            <p className="text-[11px] text-muted-foreground">
              {loading ? 'Loading…' : `${active.length} active goal${active.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white border-0">
          <Plus className="h-3.5 w-3.5" />
          New Goal
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <Target className="h-6 w-6 text-violet-400/60" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">No goals yet</p>
              <p className="text-[11px] text-muted-foreground">Create a goal to track outcomes independent of projects.</p>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 text-xs h-8 bg-violet-600 hover:bg-violet-700 text-white border-0">
              <Plus className="h-3.5 w-3.5" />
              New Goal
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {active.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Active</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {active.map((g) => <GoalCard key={g.id} goal={g} />)}
                  </AnimatePresence>
                </div>
              </div>
            )}
            {others.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Others</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                  <AnimatePresence>
                    {others.map((g) => <GoalCard key={g.id} goal={g} />)}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <CreateGoalModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        orgId={orgId}
      />
    </div>
  );
}
