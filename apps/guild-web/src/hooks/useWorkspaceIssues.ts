import * as React from 'react';
import {
  listenToWorkspaceIssues,
  listenToIssuesByCycle,
  createWorkspaceIssue,
  updateWorkspaceIssue,
  deleteWorkspaceIssue
} from '../lib/workspaceIssues';
import type { WorkspaceIssue, IssueStatus, IssuePriority } from '@guild/types';
import { useAuth } from './useAuth';

export const ISSUE_STATUS_CONFIG: Record<
  IssueStatus,
  { label: string; color: string; dotColor: string }
> = {
  triage: { label: 'Triage', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', dotColor: 'bg-amber-500' },
  backlog: { label: 'Backlog', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', dotColor: 'bg-slate-400' },
  todo: { label: 'Todo', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', dotColor: 'bg-indigo-400' },
  in_progress: { label: 'In Progress', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', dotColor: 'bg-sky-400' },
  in_review: { label: 'In Review', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', dotColor: 'bg-purple-400' },
  done: { label: 'Done', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dotColor: 'bg-emerald-400' },
  canceled: { label: 'Canceled', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', dotColor: 'bg-rose-400' }
};

export const ISSUE_PRIORITY_CONFIG: Record<
  IssuePriority,
  { label: string; color: string; icon: string }
> = {
  urgent: { label: 'Urgent', color: 'text-rose-500 bg-rose-500/10', icon: '🚨' },
  high: { label: 'High', color: 'text-orange-500 bg-orange-500/10', icon: '🔺' },
  medium: { label: 'Medium', color: 'text-amber-500 bg-amber-500/10', icon: '🔸' },
  low: { label: 'Low', color: 'text-blue-400 bg-blue-500/10', icon: '🔹' },
  none: { label: 'No Priority', color: 'text-muted-foreground bg-muted/40', icon: '▫️' }
};

export function useWorkspaceIssues(orgId: string | undefined, cycleId?: string | null) {
  const { userProfile } = useAuth();
  const [issues, setIssues] = React.useState<WorkspaceIssue[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!orgId) {
      setIssues([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = cycleId
      ? listenToIssuesByCycle(orgId, cycleId, (data) => {
          setIssues(data);
          setLoading(false);
        })
      : listenToWorkspaceIssues(orgId, (data) => {
          setIssues(data);
          setLoading(false);
        });

    return () => unsubscribe();
  }, [orgId, cycleId]);

  const handleCreate = React.useCallback(
    async (params: {
      title: string;
      descriptionHtml?: string;
      descriptionJson?: string;
      status?: IssueStatus;
      priority?: IssuePriority;
      estimatePoints?: number | null;
      cycleId?: string | null;
      assigneeId?: string | null;
      assigneeName?: string | null;
      assigneeAvatar?: string | null;
      teamPrefix?: string;
    }) => {
      if (!orgId || !userProfile) throw new Error('Not authenticated');
      return await createWorkspaceIssue({
        ...params,
        orgId,
        userId: userProfile.uid,
        userName: userProfile.fullName || 'Teammate'
      });
    },
    [orgId, userProfile]
  );

  const handleUpdate = React.useCallback(
    async (
      issueId: string,
      patch: Partial<Omit<WorkspaceIssue, 'id' | 'orgId' | 'identifier' | 'teamPrefix' | 'number' | 'createdAt'>>
    ) => {
      // Optimistic update
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, ...patch } : i))
      );
      await updateWorkspaceIssue(issueId, patch);
    },
    []
  );

  const handleDelete = React.useCallback(async (issueId: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== issueId));
    await deleteWorkspaceIssue(issueId);
  }, []);

  // Group by status for Kanban Board
  const issuesByStatus = React.useMemo(() => {
    const grouped: Record<IssueStatus, WorkspaceIssue[]> = {
      triage: [],
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      canceled: []
    };
    for (const issue of issues) {
      const s = issue.status || 'todo';
      if (grouped[s]) {
        grouped[s].push(issue);
      } else {
        grouped.todo.push(issue);
      }
    }
    return grouped;
  }, [issues]);

  return {
    issues,
    issuesByStatus,
    loading,
    createIssue: handleCreate,
    updateIssue: handleUpdate,
    deleteIssue: handleDelete
  };
}
