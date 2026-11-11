import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Trash2, Zap, Check, AlertCircle, Calendar, User, Clock,
  ChevronDown, CheckCircle2, Flag, ArrowRight, Sparkles, Loader2
} from 'lucide-react';
import type { WorkspaceIssue, IssueStatus, IssuePriority, WorkspaceCycle, UserProfile } from '@guild/types';
import { ISSUE_STATUS_CONFIG, ISSUE_PRIORITY_CONFIG } from '../../hooks/useWorkspaceIssues';
import { updateWorkspaceIssue, deleteWorkspaceIssue } from '../../lib/workspaceIssues';
import { cn } from '@/lib/utils';

interface IssueDetailDrawerProps {
  issue: WorkspaceIssue | null;
  onClose: () => void;
  members: UserProfile[];
  cycles: WorkspaceCycle[];
  onIssueUpdated?: (issueId: string, patch: Partial<WorkspaceIssue>) => void;
  onIssueDeleted?: (issueId: string) => void;
}

export function IssueDetailDrawer({
  issue,
  onClose,
  members,
  cycles,
  onIssueUpdated,
  onIssueDeleted,
}: IssueDetailDrawerProps) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isSavingDesc, setIsSavingDesc] = React.useState(false);
  const [descSaved, setDescSaved] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    if (issue) {
      setTitle(issue.title || '');
      setDescription(issue.descriptionHtml || '');
      setDescSaved(false);
    }
  }, [issue?.id, issue?.title, issue?.descriptionHtml]);

  // Lock body scroll when open
  React.useEffect(() => {
    if (!issue) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [issue]);

  if (!issue) return null;

  const currentStatusCfg = ISSUE_STATUS_CONFIG[issue.status] || ISSUE_STATUS_CONFIG.todo;
  const currentPriorityCfg = ISSUE_PRIORITY_CONFIG[issue.priority] || ISSUE_PRIORITY_CONFIG.none;

  const handleUpdate = async (patch: Partial<WorkspaceIssue>) => {
    try {
      if (onIssueUpdated) onIssueUpdated(issue.id, patch);
      await updateWorkspaceIssue(issue.id, patch);
    } catch (err) {
      console.error('Failed to update issue:', err);
    }
  };

  const handleSaveTitle = async () => {
    if (title.trim() && title.trim() !== issue.title) {
      await handleUpdate({ title: title.trim() });
    }
  };

  const handleSaveDescription = async () => {
    setIsSavingDesc(true);
    try {
      await handleUpdate({ descriptionHtml: description });
      setDescSaved(true);
      setTimeout(() => setDescSaved(false), 2000);
    } finally {
      setIsSavingDesc(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${issue.identifier}?`)) return;
    setIsDeleting(true);
    try {
      if (onIssueDeleted) onIssueDeleted(issue.id);
      await deleteWorkspaceIssue(issue.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete issue:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const currentCycle = cycles.find((c) => c.id === issue.cycleId);
  const currentAssignee = members.find((m) => m.uid === issue.assigneeId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        />

        {/* Slide-over Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="relative w-full max-w-xl h-full bg-surface border-l border-border shadow-2xl flex flex-col z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                ⚡ {issue.identifier}
              </span>
              <span className="text-xs font-medium text-muted-foreground">Workspace Issue</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Delete Issue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Title */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-full text-base font-bold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-hidden py-1 transition-colors"
                placeholder="Issue title..."
              />
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-secondary/30 border border-border/60">
              {/* Status */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Status
                </label>
                <select
                  value={issue.status}
                  onChange={(e) => handleUpdate({ status: e.target.value as IssueStatus })}
                  className="w-full text-xs font-medium bg-surface border border-border rounded-xl px-2.5 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {Object.entries(ISSUE_STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Priority
                </label>
                <select
                  value={issue.priority}
                  onChange={(e) => handleUpdate({ priority: e.target.value as IssuePriority })}
                  className="w-full text-xs font-medium bg-surface border border-border rounded-xl px-2.5 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {Object.entries(ISSUE_PRIORITY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.icon} {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Assignee
                </label>
                <select
                  value={issue.assigneeId || ''}
                  onChange={(e) => {
                    const selectedUid = e.target.value;
                    const member = members.find((m) => m.uid === selectedUid);
                    handleUpdate({
                      assigneeId: member ? member.uid : null,
                      assigneeName: member ? member.fullName : null,
                      assigneeAvatar: member ? member.photoURL || null : null,
                    });
                  }}
                  className="w-full text-xs font-medium bg-surface border border-border rounded-xl px-2.5 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.fullName} (@{m.username})
                    </option>
                  ))}
                </select>
              </div>

              {/* Estimate Points */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Estimate Points
                </label>
                <select
                  value={issue.estimatePoints ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    handleUpdate({ estimatePoints: val });
                  }}
                  className="w-full text-xs font-medium bg-surface border border-border rounded-xl px-2.5 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">No estimate</option>
                  <option value="1">1 pt (Tiny)</option>
                  <option value="2">2 pts (Small)</option>
                  <option value="3">3 pts (Medium)</option>
                  <option value="5">5 pts (Large)</option>
                  <option value="8">8 pts (X-Large)</option>
                </select>
              </div>

              {/* Cycle */}
              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Sprint / Cycle
                </label>
                <select
                  value={issue.cycleId || ''}
                  onChange={(e) => handleUpdate({ cycleId: e.target.value || null })}
                  className="w-full text-xs font-medium bg-surface border border-border rounded-xl px-2.5 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">No Cycle</option>
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title || `Cycle (${c.status})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Description
                </label>
                {descSaved && (
                  <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Add context, acceptance criteria, or technical details..."
                className="w-full text-xs text-foreground bg-secondary/20 border border-border rounded-2xl p-3.5 placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveDescription}
                  disabled={isSavingDesc}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingDesc && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save Description
                </button>
              </div>
            </div>

            {/* Meta details footer */}
            <div className="pt-4 border-t border-border/60 text-[11px] text-muted-foreground space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Created by:</span>
                <span className="font-medium text-foreground">{issue.creatorName || 'Teammate'}</span>
              </div>
              {issue.completedAt && (
                <div className="flex items-center justify-between">
                  <span>Completed:</span>
                  <span className="font-medium text-emerald-500">
                    {new Date((issue.completedAt as any)?.toDate?.() || issue.completedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
