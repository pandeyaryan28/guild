import * as React from 'react';
import { listenToGoals, listenToGoal, listenToGoalComments } from '../lib/goals';
import type { Goal, GoalComment } from '../lib/goals';
import { useAuth } from './useAuth';

export function useGoals(orgId: string | undefined) {
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    return listenToGoals(orgId, (g) => {
      setGoals(g);
      setLoading(false);
    });
  }, [orgId]);

  return { goals, loading };
}

export function useGoal(goalId: string | undefined) {
  const [goal, setGoal] = React.useState<Goal | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!goalId) return;
    setLoading(true);
    return listenToGoal(goalId, (g) => {
      setGoal(g);
      setLoading(false);
    });
  }, [goalId]);

  return { goal, loading };
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
