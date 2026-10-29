import * as React from 'react';
import {
  Plus,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  User,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  Trash2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { WorkspaceIssue, WorkspaceCycle, IssueStatus, IssuePriority } from '@guild/types';
import { ISSUE_STATUS_CONFIG, ISSUE_PRIORITY_CONFIG } from '../../hooks/useWorkspaceIssues';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';

interface StudioIssuesViewProps {
  issues: WorkspaceIssue[];
  activeCycle: WorkspaceCycle | null;
  selectedCycleId: string | null;
  statusFilter?: IssueStatus | null;
  onCreateIssue: (status?: IssueStatus) => void;
  onUpdateIssue: (issueId: string, patch: Partial<WorkspaceIssue>) => void;
  onDeleteIssue: (issueId: string) => void;
}

export function StudioIssuesView({
  issues,
  activeCycle,
  selectedCycleId,
  statusFilter,
  onCreateIssue,
  onUpdateIssue,
  onDeleteIssue
}: StudioIssuesViewProps) {
  const { userProfile } = useAuth();
  const [filterMineOnly, setFilterMineOnly] = React.useState(false);
  const [filterPriority, setFilterPriority] = React.useState<IssuePriority | 'all'>('all');
  const [newIssueStatus, setNewIssueStatus] = React.useState<IssueStatus | null>(null);
  const [quickTitle, setQuickTitle] = React.useState('');
  const [selectedIssue, setSelectedIssue] = React.useState<WorkspaceIssue | null>(null);
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');

  React.useEffect(() => {
    if (selectedIssue) {
      setEditTitle(selectedIssue.title);
      setEditDescription(selectedIssue.descriptionHtml || '');
    }
  }, [selectedIssue?.id]);

  const filteredIssues = React.useMemo(() => {
    return issues.filter((issue) => {
      if (filterMineOnly && issue.assigneeId !== userProfile?.uid) return false;
      if (filterPriority !== 'all' && issue.priority !== filterPriority) return false;
      if (statusFilter && issue.status !== statusFilter) return false;
      return true;
    });
  }, [issues, filterMineOnly, filterPriority, statusFilter, userProfile?.uid]);

  const columns: Array<{ status: IssueStatus; label: string }> = [
    { status: 'todo', label: 'Todo' },
    { status: 'in_progress', label: 'In Progress' },
    { status: 'in_review', label: 'In Review' },
    { status: 'done', label: 'Done' }
  ];

  const handleQuickCreate = async (status: IssueStatus) => {
    if (!quickTitle.trim()) {
      setNewIssueStatus(null);
      return;
    }
    onCreateIssue(status);
    setQuickTitle('');
    setNewIssueStatus(null);
  };

  // Cycle progress calculation
  const totalIssues = issues.length;
  const doneIssues = issues.filter((i) => i.status === 'done').length;
  const progressPercent = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden select-none">
      {/* Top Bar: Active Cycle Progress & Velocity */}
      <div className="px-6 py-4 border-b border-border bg-surface/40 backdrop-blur-xl shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-foreground tracking-tight">
                {activeCycle?.title || 'Cycle 1'}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>{doneIssues} of {totalIssues} issues completed</span>
              <span>•</span>
              <span className="font-semibold text-foreground">{progressPercent}%</span>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMineOnly(!filterMineOnly)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
              filterMineOnly
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-surface/80 border-border text-muted-foreground hover:text-foreground'
            )}
          >
            Only My Issues
          </button>

          <button
            onClick={() => onCreateIssue('todo')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Issue</span>
            <span className="ml-1 text-[10px] opacity-75 font-mono px-1 rounded bg-black/20">C</span>
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full h-1 bg-secondary">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Kanban Board Grid */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-4 items-start">
        {columns.map((col) => {
          const colIssues = filteredIssues.filter((i) => i.status === col.status);
          const statusCfg = ISSUE_STATUS_CONFIG[col.status];

          return (
            <div
              key={col.status}
              className="w-80 shrink-0 bg-surface/60 dark:bg-surface/40 backdrop-blur-xl border border-border dark:border-border-strong rounded-2xl flex flex-col max-h-full overflow-hidden shadow-lg"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-3.5 py-3 border-b border-border/80">
                <div className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', statusCfg.dotColor)} />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-muted/60 text-muted-foreground">
                    {colIssues.length}
                  </span>
                </div>

                <button
                  onClick={() => onCreateIssue(col.status)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  title={`Add to ${col.label}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {colIssues.map((issue) => {
                  const priorityCfg = ISSUE_PRIORITY_CONFIG[issue.priority || 'none'];

                  return (
                    <motion.div
                      layout
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className="group relative p-3 rounded-xl bg-surface/90 dark:bg-surface/70 border border-border hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                    >
                      {/* Card Header: Identifier + Priority */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-mono font-bold text-muted-foreground px-1.5 py-0.5 rounded bg-secondary/80">
                          {issue.identifier}
                        </span>

                        <span
                          className={cn(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1',
                            priorityCfg.color
                          )}
                        >
                          <span>{priorityCfg.icon}</span>
                          <span>{priorityCfg.label}</span>
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-semibold text-foreground leading-snug mb-2 line-clamp-2">
                        {issue.title}
                      </h4>

                      {/* Footer: Assignee & Quick Status Shift */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-primary/20 text-primary font-bold text-[9px] flex items-center justify-center">
                            {issue.assigneeName ? issue.assigneeName[0] : 'U'}
                          </div>
                          <span className="truncate max-w-[80px]">
                            {issue.assigneeName || 'Unassigned'}
                          </span>
                        </div>

                        {/* Quick Advance Button */}
                        {col.status !== 'done' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextStatusMap: Record<IssueStatus, IssueStatus> = {
                                triage: 'todo',
                                backlog: 'todo',
                                todo: 'in_progress',
                                in_progress: 'in_review',
                                in_review: 'done',
                                done: 'done',
                                canceled: 'todo'
                              };
                              onUpdateIssue(issue.id, { status: nextStatusMap[col.status] });
                            }}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-secondary/80 text-foreground transition-opacity"
                            title="Move forward"
                          >
                            <span>Advance</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {colIssues.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground/60 font-medium">
                    No issues
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Issue Detail & Edit Modal */}
      <AnimatePresence>
        {selectedIssue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/40">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-muted-foreground px-2 py-0.5 rounded bg-secondary">
                    {selectedIssue.identifier}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">Issue Details</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteIssue(selectedIssue.id);
                      setSelectedIssue(null);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete Issue"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIssue(null)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/40 text-sm font-semibold text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                    <select
                      value={selectedIssue.status}
                      onChange={(e) => {
                        const status = e.target.value as IssueStatus;
                        onUpdateIssue(selectedIssue.id, { status });
                        setSelectedIssue({ ...selectedIssue, status });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/40 text-xs font-semibold text-foreground outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="todo">Todo</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Priority</label>
                    <select
                      value={selectedIssue.priority || 'none'}
                      onChange={(e) => {
                        const priority = e.target.value as IssuePriority;
                        onUpdateIssue(selectedIssue.id, { priority });
                        setSelectedIssue({ ...selectedIssue, priority });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/40 text-xs font-semibold text-foreground outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="none">No Priority</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                  <textarea
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Add issue context, reproduction steps, or acceptance criteria..."
                    className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/40 text-xs text-foreground outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-border bg-secondary/30 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIssue(null)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateIssue(selectedIssue.id, {
                      title: editTitle.trim() || selectedIssue.title,
                      descriptionHtml: editDescription.trim(),
                    });
                    setSelectedIssue(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
