import * as React from 'react';
import { listenToGoals, listenToGoal, listenToGoalComments } from '../lib/goals';
import type { Goal, GoalComment } from '../lib/goals';
import { useAuth } from './useAuth';
import { useWorkspaceData } from '../context/WorkspaceDataContext';

export function useGoals(orgId: string | undefined) {
  const workspace = useWorkspaceData();
  const canUseContext = Boolean(workspace && orgId && workspace.orgId === orgId);

  const [fallbackGoals, setFallbackGoals] = React.useState<Goal[]>([]);
  const [fallbackLoading, setFallbackLoading] = React.useState(true);

  React.useEffect(() => {
    if (canUseContext || !orgId) {
      if (!orgId) setFallbackLoading(false);
      return;
    }
    setFallbackLoading(true);
    return listenToGoals(orgId, (g) => {
      setFallbackGoals(g);
      setFallbackLoading(false);
    });
  }, [canUseContext, orgId]);

  if (canUseContext && workspace) {
    return { goals: workspace.goals, loading: workspace.goalsLoading };
  }
  return { goals: fallbackGoals, loading: fallbackLoading };
}

export function useGoal(goalId: string | undefined) {
  const workspace = useWorkspaceData();
  const cachedGoal = React.useMemo(
    () => (goalId && workspace ? workspace.goals.find((g) => g.id === goalId) ?? null : null),
    [goalId, workspace],
  );
  const [goal, setGoal] = React.useState<Goal | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!goalId) {
      setLoading(false);
      return;
    }
    if (cachedGoal) {
      setGoal(cachedGoal);
      setLoading(false);
      return;
    }
    setLoading(true);
    return listenToGoal(goalId, (g) => {
      setGoal(g);
      setLoading(false);
    });
  }, [goalId, cachedGoal]);

  return { goal: cachedGoal ?? goal, loading: cachedGoal ? false : loading };
}

export function useGoalComments(goalId: string | null) {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const [comments, setComments] = React.useState<GoalComment[]>([]);
  React.useEffect(() => {
    if (!goalId || !orgId) { setComments([]); return; }
    return listenToGoalComments(orgId, goalId, setComments);
  }, [goalId, orgId]);
  return comments;
}

export type { Goal, GoalComment };
