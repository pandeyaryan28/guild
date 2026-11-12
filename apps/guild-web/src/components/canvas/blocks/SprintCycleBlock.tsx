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
  Target,
  Layers,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { cn } from '@guild/utils';
import { useAuth } from '../../../hooks/useAuth';
import { useWorkspaceCycles } from '../../../hooks/useWorkspaceCycles';
import { useWorkspaceIssues } from '../../../hooks/useWorkspaceIssues';
import type { IssueStatus } from '@guild/types';

export function SprintCycleBlock({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { cycles, activeCycle } = useWorkspaceCycles(orgId);
  const {
    issues,
    loading: issuesLoading,
    createIssue,
    updateIssue,
    deleteIssue
  } = useWorkspaceIssues(orgId, activeCycle?.id || null);

  const title = node.attrs.title ?? '';
  const cycleNumber = node.attrs.cycleNumber || (activeCycle ? activeCycle.number : null);

  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState(title);

  React.useEffect(() => {
    setTitleDraft(node.attrs.title ?? '');
  }, [node.attrs.title]);

  const [newTitle, setNewTitle] = React.useState('');
  const [newPoints, setNewPoints] = React.useState<number>(3);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleTitleSave = () => {
    setIsEditingTitle(false);
    updateAttributes({ title: titleDraft.trim() });
  };

  // Velocity metrics calculation based on live Firestore workspaceIssues
  const totalPoints = React.useMemo(() => {
    return issues.reduce((sum, i) => sum + (i.estimatePoints || 0), 0);
  }, [issues]);

  const completedPoints = React.useMemo(() => {
    return issues
      .filter((i) => i.status === 'done')
      .reduce((sum, i) => sum + (i.estimatePoints || 0), 0);
  }, [issues]);

  const percent = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
  const doneCount = issues.filter((i) => i.status === 'done').length;
  const remainingCount = issues.filter((i) => i.status !== 'done' && i.status !== 'canceled').length;

  const toggleIssueCompletion = async (issueId: string, currentStatus: IssueStatus) => {
    const nextStatus: IssueStatus = currentStatus === 'done' ? 'todo' : 'done';
    try {
      await updateIssue(issueId, { status: nextStatus });
    } catch (err) {
      console.error('Failed to update issue status:', err);
    }
  };

  const handleAddIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createIssue({
        title: newTitle.trim(),
        estimatePoints: Number(newPoints) || 1,
        cycleId: activeCycle?.id || null,
        status: 'todo',
        priority: 'medium',
        assigneeId: userProfile?.uid,
        assigneeName: userProfile?.fullName || 'Me'
      });
      setNewTitle('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to create sprint issue:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveIssue = async (issueId: string) => {
    try {
      await deleteIssue(issueId);
    } catch (err) {
      console.error('Failed to delete issue:', err);
    }
  };

  const displayedTitle = title || (activeCycle ? activeCycle.title : '');

  return (
    <NodeViewWrapper className="my-6 not-prose">
      <div className="relative group/block rounded-2xl border border-border dark:border-border-strong bg-surface/90 dark:bg-surface/55 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:shadow-2xl overflow-hidden">
        {/* Top specular accent gradient line */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-primary to-emerald-400" />

        <div className="p-5 sm:p-6 space-y-5">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {cycleNumber
                      ? `Active Sprint • Cycle ${cycleNumber}`
                      : (activeCycle ? `Active Sprint • Cycle ${activeCycle.number || 1}` : 'Active Sprint')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                    <Calendar className="w-3 h-3" />
                    {activeCycle ? 'In Progress' : 'Sprint Planning'}
                  </span>
                </div>

                {isEditingTitle ? (
                  <input
                    type="text"
                    autoFocus
                    placeholder="Sprint cycle name..."
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSave();
                      if (e.key === 'Escape') {
                        setTitleDraft(title);
                        setIsEditingTitle(false);
                      }
                    }}
                    className="mt-0.5 bg-transparent border-b border-primary text-base sm:text-lg font-bold text-foreground placeholder:text-muted-foreground/40 outline-none px-1"
                  />
                ) : (
                  <h3
                    onClick={() => setIsEditingTitle(true)}
                    className="text-base sm:text-lg font-bold text-foreground hover:text-primary cursor-pointer tracking-tight mt-0.5 transition-colors"
                    title="Click to rename sprint cycle"
                  >
                    {displayedTitle || <span className="text-muted-foreground/50 italic font-normal">Sprint cycle name...</span>}
                  </h3>
                )}
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
                  {doneCount} {doneCount === 1 ? 'issue' : 'issues'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-surface/70 dark:bg-surface/30 border border-border/40">
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Remaining</div>
                <div className="text-sm font-bold text-foreground">
                  {remainingCount} {remainingCount === 1 ? 'issue' : 'issues'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-surface/70 dark:bg-surface/30 border border-border/40">
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Burn Rate</div>
                <div className="text-sm font-bold text-primary">
                  {(totalPoints > 0 ? (completedPoints / 10).toFixed(1) : '0.0')} pts/day
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Sprint Issue / Task List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1 pb-1">
              <span>Sprint Issues ({issues.length})</span>
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
              <form onSubmit={handleAddIssue} className="flex items-center gap-2 p-2 rounded-xl bg-surface dark:bg-surface/80 border border-primary/40 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
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
                  className="bg-secondary/60 text-foreground border border-border text-xs rounded-lg px-2 py-1 outline-none cursor-pointer"
                >
                  <option value={1}>1 pt</option>
                  <option value={2}>2 pts</option>
                  <option value={3}>3 pts</option>
                  <option value={5}>5 pts</option>
                  <option value={8}>8 pts</option>
                </select>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || isSubmitting}
                  className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98] inline-flex items-center gap-1"
                >
                  {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {issuesLoading ? (
              <div className="p-4 flex items-center justify-center text-xs text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Loading issues...
              </div>
            ) : issues.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-secondary/30 dark:bg-secondary/15 border border-dashed border-border text-xs text-muted-foreground space-y-2">
                <Target className="w-5 h-5 mx-auto text-muted-foreground/50" />
                <p className="font-medium text-foreground/80">No active sprint issues yet</p>
                <p className="text-[11px] text-muted-foreground">Add issues to track sprint velocity, scope, and burndown.</p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all active:scale-[0.98] shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Sprint Issue
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {issues.map((issue) => {
                  const isDone = issue.status === 'done';
                  return (
                    <div
                      key={issue.id}
                      className={cn(
                        'group/item flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-all duration-200 select-none',
                        isDone
                          ? 'bg-secondary/30 border-border/40 text-muted-foreground'
                          : 'bg-surface/80 dark:bg-surface/30 border-border hover:border-primary/40 shadow-xs'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleIssueCompletion(issue.id, issue.status)}
                          className="cursor-pointer text-muted-foreground hover:text-emerald-500 transition-colors"
                          title={isDone ? 'Mark Incomplete' : 'Mark Done'}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <span className="text-[11px] font-mono font-semibold text-muted-foreground px-1.5 py-0.5 rounded bg-secondary/80 border border-border/50">
                          {issue.identifier}
                        </span>
                        <span className={cn('text-xs font-medium truncate', isDone && 'line-through text-muted-foreground/70')}>
                          {issue.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {issue.estimatePoints !== undefined && issue.estimatePoints !== null && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border">
                            {issue.estimatePoints} pts
                          </span>
                        )}
                        <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                          {(issue.assigneeName || 'U').charAt(0).toUpperCase()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIssue(issue.id)}
                          className="opacity-0 group-hover/item:opacity-100 p-1 text-muted-foreground hover:text-rose-500 rounded transition-opacity"
                          title="Delete issue"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
