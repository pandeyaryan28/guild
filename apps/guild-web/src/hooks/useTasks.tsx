import * as React from 'react';
import {
  listenToTasks, listenToComments, listenToActivities, listenToLabels,
  type Task, type TaskComment, type TaskActivity, type TaskLabel, type TaskStatus,
  type TaskScopeFilter,
  STATUSES,
} from '../lib/tasks';

export function useTasks(orgId: string | undefined, scope?: TaskScopeFilter) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Stable scope key so effect doesn't re-run on every render
  const scopeKey = scope ? JSON.stringify(scope) : '';

  React.useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    return listenToTasks(orgId, (t) => { setTasks(t); setLoading(false); }, scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, scopeKey]);

  const columns = React.useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    for (const s of STATUSES) map.set(s, []);
    for (const task of tasks) {
      const col = map.get(task.status) ?? [];
      col.push(task);
    }
    for (const [s, col] of map) {
      map.set(s, [...col].sort((a, b) => a.orderIndex - b.orderIndex));
    }
    return map;
  }, [tasks]);

  return { tasks, columns, loading };
}


export function useTaskComments(taskId: string | null) {
  const [comments, setComments] = React.useState<TaskComment[]>([]);
  React.useEffect(() => {
    if (!taskId) { setComments([]); return; }
    return listenToComments(taskId, setComments);
  }, [taskId]);
  return comments;
}

export function useTaskActivities(taskId: string | null) {
  const [activities, setActivities] = React.useState<TaskActivity[]>([]);
  React.useEffect(() => {
    if (!taskId) { setActivities([]); return; }
    return listenToActivities(taskId, setActivities);
  }, [taskId]);
  return activities;
}

export function useTaskLabels(orgId: string | undefined) {
  const [labels, setLabels] = React.useState<TaskLabel[]>([]);
  React.useEffect(() => {
    if (!orgId) return;
    return listenToLabels(orgId, setLabels);
  }, [orgId]);
  return labels;
}
