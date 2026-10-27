import * as React from 'react';
import { X, Sparkles, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { IssueStatus, IssuePriority } from '@guild/types';
import { ISSUE_STATUS_CONFIG, ISSUE_PRIORITY_CONFIG } from '../../hooks/useWorkspaceIssues';
import { useOrgMembers } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '@/lib/utils';

interface StudioCreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStatus?: IssueStatus;
  onSubmit: (data: {
    title: string;
    descriptionHtml?: string;
    status: IssueStatus;
    priority: IssuePriority;
    estimatePoints?: number | null;
    assigneeId?: string | null;
    assigneeName?: string | null;
  }) => Promise<void>;
}

export function StudioCreateIssueModal({
  isOpen,
  onClose,
  defaultStatus = 'todo',
  onSubmit
}: StudioCreateIssueModalProps) {
  const { userProfile } = useAuth();
  const members = useOrgMembers(userProfile?.organizationId);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<IssueStatus>(defaultStatus);
  const [priority, setPriority] = React.useState<IssuePriority>('none');
  const [estimatePoints, setEstimatePoints] = React.useState<number | null>(null);
  const [assigneeId, setAssigneeId] = React.useState<string | null>(userProfile?.uid || null);
  const [submitting, setSubmitting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus);
      setPriority('none');
      setEstimatePoints(null);
      setAssigneeId(userProfile?.uid || null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, defaultStatus, userProfile?.uid]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    try {
      const selectedMember = members.find((m) => m.uid === assigneeId);
      await onSubmit({
        title: title.trim(),
        descriptionHtml: description.trim(),
        status,
        priority,
        estimatePoints,
        assigneeId,
        assigneeName: selectedMember?.fullName || null
      });
      onClose();
    } catch (err) {
      console.error('Failed to create issue:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Dimming Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-md"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative w-full max-w-lg bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong rounded-3xl shadow-2xl p-6 z-10 select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/80 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">
                NEW ISSUE
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Issue title..."
                className="w-full text-base font-semibold text-foreground placeholder:text-muted-foreground/50 bg-transparent outline-none border-b border-border/50 pb-2 focus:border-primary transition-colors"
              />
            </div>

            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description or context..."
                rows={3}
                className="w-full text-xs text-foreground placeholder:text-muted-foreground/50 bg-secondary/30 rounded-xl p-3 outline-none border border-border/50 focus:border-primary/50 resize-none font-medium"
              />
            </div>

            {/* Selectors Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Status */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as IssueStatus)}
                  className="w-full text-xs font-medium bg-secondary/50 border border-border rounded-xl px-2.5 py-1.5 text-foreground outline-none cursor-pointer"
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                  <option value="triage">Triage</option>
                  <option value="backlog">Backlog</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as IssuePriority)}
                  className="w-full text-xs font-medium bg-secondary/50 border border-border rounded-xl px-2.5 py-1.5 text-foreground outline-none cursor-pointer"
                >
                  <option value="none">None</option>
                  <option value="urgent">🚨 Urgent</option>
                  <option value="high">🔺 High</option>
                  <option value="medium">🔸 Medium</option>
                  <option value="low">🔹 Low</option>
                </select>
              </div>

              {/* Estimate Points */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                  Points
                </label>
                <select
                  value={estimatePoints ?? ''}
                  onChange={(e) =>
                    setEstimatePoints(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full text-xs font-medium bg-secondary/50 border border-border rounded-xl px-2.5 py-1.5 text-foreground outline-none cursor-pointer"
                >
                  <option value="">None</option>
                  <option value="1">1 pt</option>
                  <option value="2">2 pts</option>
                  <option value="3">3 pts</option>
                  <option value="5">5 pts</option>
                  <option value="8">8 pts</option>
                </select>
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                Assignee
              </label>
              <select
                value={assigneeId ?? ''}
                onChange={(e) => setAssigneeId(e.target.value || null)}
                className="w-full text-xs font-medium bg-secondary/50 border border-border rounded-xl px-2.5 py-1.5 text-foreground outline-none cursor-pointer"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.uid} value={m.uid}>
                    {m.fullName || m.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border/80">
              <span className="text-[10px] text-muted-foreground">
                Press <span className="font-mono font-bold">⌘+Enter</span> to create
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || submitting}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
                >
                  {submitting ? 'Creating...' : 'Create Issue'}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
