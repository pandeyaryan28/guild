import * as React from 'react';
import {
  listenToTasks, listenToComments, listenToActivities, listenToLabels,
  listenToTask, listenToSubtasks,
  type Task, type TaskComment, type TaskActivity, type TaskLabel, type TaskStatus,
  type TaskScopeFilter,
  STATUSES,
} from '../lib/tasks';
import { useAuth } from './useAuth';
import { useWorkspaceData } from '../context/WorkspaceDataContext';

export function useTasks(orgId: string | undefined, scope?: TaskScopeFilter, includeUnapproved = false) {
  const workspace = useWorkspaceData();
  const canUseContext = Boolean(workspace && orgId && workspace.orgId === orgId);

  const [fallbackTasks, setFallbackTasks] = React.useState<Task[]>([]);
  const [fallbackLoading, setFallbackLoading] = React.useState(true);

  const scopeKey = scope ? JSON.stringify(scope) : '';

  React.useEffect(() => {
    if (canUseContext || !orgId) {
      if (!orgId) setFallbackLoading(false);
      return;
    }
    setFallbackLoading(true);
    return listenToTasks(orgId, (t) => {
      const filtered = includeUnapproved ? t : t.filter(x => x.approved !== false);
      setFallbackTasks(filtered);
      setFallbackLoading(false);
    }, scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseContext, orgId, scopeKey, includeUnapproved]);

  const tasks = React.useMemo(() => {
    if (!canUseContext || !workspace) return fallbackTasks;
    let list = workspace.allTasks;
    if (!includeUnapproved) {
      list = list.filter((x) => x.approved !== false);
    }
    if (scope && 'projectId' in scope && scope.projectId) {
      list = list.filter((x) => x.projectId === scope.projectId);
    } else if (scope && 'goalId' in scope && scope.goalId) {
      list = list.filter((x) => x.goalId === scope.goalId);
    }
    return list;
  }, [canUseContext, workspace, fallbackTasks, includeUnapproved, scope]);

  const loading = canUseContext && workspace ? workspace.tasksLoading : fallbackLoading;

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
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const [comments, setComments] = React.useState<TaskComment[]>([]);
  React.useEffect(() => {
    if (!taskId || !orgId) { setComments([]); return; }
    return listenToComments(orgId, taskId, setComments);
  }, [taskId, orgId]);
  return comments;
}

export function useTaskActivities(taskId: string | null, orgIdParam?: string) {
  const { userProfile } = useAuth();
  const orgId = orgIdParam || userProfile?.organizationId;
  const [activities, setActivities] = React.useState<TaskActivity[]>([]);
  React.useEffect(() => {
    if (!taskId) { setActivities([]); return; }
    return listenToActivities(taskId, setActivities, orgId);
  }, [taskId, orgId]);
  return activities;
}

export function useTaskLabels(orgId: string | undefined) {
  const workspace = useWorkspaceData();
  const canUseContext = Boolean(workspace && orgId && workspace.orgId === orgId);
  const [fallbackLabels, setFallbackLabels] = React.useState<TaskLabel[]>([]);

  React.useEffect(() => {
    if (canUseContext || !orgId) return;
    return listenToLabels(orgId, setFallbackLabels);
  }, [canUseContext, orgId]);

  return canUseContext && workspace ? workspace.labels : fallbackLabels;
}

export function useSingleTask(taskId: string | null) {
  const workspace = useWorkspaceData();
  const cachedTask = React.useMemo(
    () => (taskId && workspace ? workspace.allTasks.find((t) => t.id === taskId) ?? null : null),
    [taskId, workspace],
  );
  const [task, setTask] = React.useState<Task | null>(null);
  React.useEffect(() => {
    if (!taskId) { setTask(null); return; }
    if (cachedTask) {
      setTask(cachedTask);
      return;
    }
    return listenToTask(taskId, setTask);
  }, [taskId, cachedTask]);
  return cachedTask ?? task;
}

export function useSubtasks(parentTaskId: string | null, orgIdParam?: string) {
  const { userProfile } = useAuth();
  const orgId = orgIdParam || userProfile?.organizationId;
  const workspace = useWorkspaceData();
  const canUseContext = Boolean(workspace && orgId && workspace.orgId === orgId);
  const [fallbackSubtasks, setFallbackSubtasks] = React.useState<Task[]>([]);

  React.useEffect(() => {
    if (canUseContext || !parentTaskId) {
      setFallbackSubtasks([]);
      return;
    }
    return listenToSubtasks(parentTaskId, setFallbackSubtasks, orgId);
  }, [canUseContext, parentTaskId, orgId]);

  return React.useMemo(() => {
    if (!parentTaskId) return [];
    if (canUseContext && workspace) {
      return workspace.allTasks
        .filter((t) => t.parentTaskId === parentTaskId)
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    }
    return fallbackSubtasks;
  }, [canUseContext, workspace, parentTaskId, fallbackSubtasks]);
}
