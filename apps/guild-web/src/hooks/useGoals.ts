import * as React from 'react';
import { listenToGoals, listenToGoal, listenToGoalComments } from '../lib/goals';
import type { Goal, GoalComment } from '../lib/goals';

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
  const [comments, setComments] = React.useState<GoalComment[]>([]);
  React.useEffect(() => {
    if (!goalId) { setComments([]); return; }
    return listenToGoalComments(goalId, setComments);
  }, [goalId]);
  return comments;
}

export type { Goal, GoalComment };
