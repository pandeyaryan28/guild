import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
  Timestamp, writeBatch, getDocs, getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notifications';
import type {
  Task, TaskStatus, TaskPriority, TaskComment,
  TaskActivity, TaskLabel, ActivityType, ActorInfo,
  MessageAttachment,
} from '@guild/types';

// ─── Config ───────────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; dot: string }> = {
  todo:        { label: 'Todo',        color: 'text-zinc-400',    dot: '#71717a' },
  in_progress: { label: 'In Progress', color: 'text-blue-400',    dot: '#60a5fa' },
  review:      { label: 'Review',      color: 'text-amber-400',   dot: '#fbbf24' },
  done:        { label: 'Done',        color: 'text-emerald-400', dot: '#34d399' },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  none:   { label: 'None',   color: '#52525b' },
  low:    { label: 'Low',    color: '#38bdf8' },
  medium: { label: 'Medium', color: '#fbbf24' },
  high:   { label: 'High',   color: '#f97316' },
  urgent: { label: 'Urgent', color: '#ef4444' },
};

export const LABEL_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6',
  '#ec4899', '#6b7280',
];

export const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function logActivity(
  taskId: string, orgId: string, actor: ActorInfo,
  type: ActivityType, payload: Record<string, unknown> = {},
): Promise<void> {
  const ref = doc(collection(db, 'taskActivities'));
  await setDoc(ref, {
    id: ref.id, taskId, orgId,
    actorId: actor.uid, actorName: actor.name,
    type, payload, createdAt: serverTimestamp(),
  });
}

async function getNextOrderIndex(orgId: string, status: TaskStatus): Promise<number> {
  const snap = await getDocs(
    query(
      collection(db, 'tasks'),
      where('orgId', '==', orgId),
      where('status', '==', status),
      orderBy('orderIndex', 'desc'),
      limit(1),
    ),
  );
  if (snap.empty) return 1000;
  return ((snap.docs[0].data() as Task).orderIndex ?? 1000) + 1000;
}

export async function syncGoalProgress(goalId: string, orgId?: string): Promise<void> {
  let resolvedOrgId = orgId;
  if (!resolvedOrgId) {
    const goalSnap = await getDoc(doc(db, 'goals', goalId));
    if (!goalSnap.exists()) return;
    resolvedOrgId = goalSnap.data()?.orgId;
  }
  if (!resolvedOrgId) return;

  const tasksSnap = await getDocs(
    query(
      collection(db, 'tasks'),
      where('orgId', '==', resolvedOrgId),
      where('goalId', '==', goalId)
    )
  );
  if (tasksSnap.empty) {
    await updateDoc(doc(db, 'goals', goalId), {
      progressRollup: 0,
      updatedAt: serverTimestamp(),
    });
    return;
  }
  const allTasks = tasksSnap.docs.map((d) => d.data() as Task);
  const approvedTasks = allTasks.filter((t) => t.approved !== false);
  if (approvedTasks.length === 0) {
    await updateDoc(doc(db, 'goals', goalId), {
      progressRollup: 0,
      updatedAt: serverTimestamp(),
    });
    return;
  }
  const doneTasks = approvedTasks.filter((t) => t.status === 'done');
  const progressPercent = Math.round((doneTasks.length / approvedTasks.length) * 100);

  await updateDoc(doc(db, 'goals', goalId), {
    progressRollup: progressPercent,
    updatedAt: serverTimestamp(),
  });
}

// ─── Task CRUD ────────────────────────────────────────────────────────────────

export async function createTask(params: {
  orgId: string; title: string; description?: string;
  status?: TaskStatus; priority?: TaskPriority;
  assigneeIds?: string[]; labelIds?: string[];
  dueDate?: Date | null; actor: ActorInfo;
  approved?: boolean;
  // Execution OS — optional scope fields
  projectId?: string | null;
  goalId?: string | null;
  parentTaskId?: string | null;
}): Promise<string> {
  const ref = doc(collection(db, 'tasks'));
  const status = params.status ?? 'todo';
  const orderIndex = await getNextOrderIndex(params.orgId, status);

  let approved = params.approved;
  let creatorProfile: Record<string, any> | null = null;
  let approverId: string | null = null;

  if (approved === undefined || approved === false) {
    const creatorDoc = await getDoc(doc(db, 'users', params.actor.uid));
    creatorProfile = creatorDoc.exists() ? creatorDoc.data() : null;
    const managerId = (creatorProfile?.managerId as string) || null;

    if (managerId) {
      approverId = managerId;
      if (approved === undefined && !params.parentTaskId) {
        approved = false;
      }
    } else {
      const orgDoc = await getDoc(doc(db, 'organizations', params.orgId));
      const orgData = orgDoc.exists() ? orgDoc.data() : null;
      const ownerId = (orgData?.ownerId as string) || null;
      approverId = ownerId;
      if (approved === undefined && !params.parentTaskId && params.actor.uid !== ownerId) {
        approved = false;
      }
    }
    if (approved === undefined) {
      approved = true;
    }
  }

  const batch = writeBatch(db);
  const now = serverTimestamp();

  batch.set(ref, {
    id: ref.id,
    orgId: params.orgId,
    title: params.title,
    description: params.description ?? '',
    status,
    priority: params.priority ?? 'none',
    assigneeIds: params.assigneeIds ?? [],
    creatorId: params.actor.uid,
    labelIds: params.labelIds ?? [],
    dueDate: params.dueDate ? Timestamp.fromDate(params.dueDate) : null,
    orderIndex,
    createdAt: now,
    updatedAt: now,
    approved,
    // Scope fields — null means unscoped (backward compatible)
    projectId: params.projectId ?? null,
    goalId: params.goalId ?? null,
    parentTaskId: params.parentTaskId ?? null,
  });

  const actRef = doc(collection(db, 'taskActivities'));
  batch.set(actRef, {
    id: actRef.id,
    taskId: ref.id,
    orgId: params.orgId,
    actorId: params.actor.uid,
    actorName: params.actor.name,
    type: 'created',
    payload: { title: params.title },
    createdAt: now,
  });

  if (approved === false && approverId) {
    try {
      const approverSnap = await getDoc(doc(db, 'users', approverId));
      const approverData = approverSnap.exists() ? approverSnap.data() : null;
      const approverName = approverData?.fullName || approverData?.name || 'Manager';
      const approverUsername = approverData?.username || 'manager';

      const requestRef = doc(collection(db, 'requests'));
      batch.set(requestRef, {
        id: requestRef.id,
        orgId: params.orgId,
        creatorId: params.actor.uid,
        creatorName: params.actor.name,
        creatorUsername: creatorProfile?.username || 'member',
        approverId,
        approverName,
        approverUsername,
        type: 'other',
        title: `Approve Task: "${params.title}"`,
        description: params.description || `Approval request to create task: "${params.title}"`,
        status: 'pending',
        taskId: ref.id,
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      console.error('Failed to prepare associated approval request:', e);
    }
  }

  await batch.commit();

  if (params.goalId) {
    await syncGoalProgress(params.goalId, params.orgId);
  }

  if (approved === false && approverId) {
    createNotification({
      orgId: params.orgId,
      recipientId: approverId,
      category: 'requests',
      type: 'request_pending',
      urgency: 'medium',
      actor: { id: params.actor.uid, name: params.actor.name },
      title: 'New Approval Request',
      body: `${params.actor.name} submitted: "Approve Task: ${params.title}"`,
      link: '/requests',
    }).catch((e) => console.error('Failed to send approval request notification:', e));
  }

  return ref.id;
}

export async function updateTask(
  taskId: string, orgId: string,
  patch: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'projectId' | 'goalId' | 'approved'>>,
  actor: ActorInfo,
): Promise<void> {
  const taskDoc = await getDoc(doc(db, 'tasks', taskId));
  const taskData = taskDoc.exists() ? (taskDoc.data() as Task) : null;
  const oldGoalId = taskData?.goalId;

  await updateDoc(doc(db, 'tasks', taskId), { ...patch, updatedAt: serverTimestamp() });
  await logActivity(taskId, orgId, actor, 'edited', patch);

  // Synchronize approval status to associated requests collection
  if (patch.approved === true) {
    try {
      const q = query(
        collection(db, 'requests'),
        where('orgId', '==', orgId),
        where('taskId', '==', taskId),
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(doc(db, 'requests', d.id), {
          status: 'approved',
          approverId: actor.uid,
          approverName: actor.name,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error('Failed to sync task approval to requests:', e);
    }
  }

  // Sync goal progress if goalId, status, or approved status was changed, or if task is linked to a goal
  const newGoalId = patch.goalId !== undefined ? patch.goalId : oldGoalId;
  if (oldGoalId) {
    await syncGoalProgress(oldGoalId, orgId);
  }
  if (newGoalId && newGoalId !== oldGoalId) {
    await syncGoalProgress(newGoalId, orgId);
  }
}

export async function moveTask(
  taskId: string, orgId: string,
  newStatus: TaskStatus, newOrderIndex: number, oldStatus: TaskStatus,
  actor: ActorInfo,
): Promise<void> {
  const taskDoc = await getDoc(doc(db, 'tasks', taskId));
  if (!taskDoc.exists()) {
    throw new Error(`Task with id "${taskId}" not found or has already been deleted.`);
  }
  const taskData = taskDoc.data() as Task;
  const authoritativeOldStatus = taskData.status ?? oldStatus;

  const STATUS_ORDER: Record<TaskStatus, number> = { todo: 0, in_progress: 1, review: 2, done: 3 };
  const oldStatusVal = STATUS_ORDER[authoritativeOldStatus] ?? 0;
  const newStatusVal = STATUS_ORDER[newStatus] ?? 0;

  if (newStatusVal < oldStatusVal) {
    // Allow rejecting review back to in_progress/todo or reopening a completed task
    const isRejection = authoritativeOldStatus === 'review' && (newStatus === 'in_progress' || newStatus === 'todo');
    const isReopen = authoritativeOldStatus === 'done' && (newStatus === 'in_progress' || newStatus === 'todo' || newStatus === 'review');
    const isBackToTodo = authoritativeOldStatus === 'in_progress' && newStatus === 'todo';
    if (!isRejection && !isReopen && !isBackToTodo) {
      throw new Error("Backward status transitions are not allowed except when rejecting a review or reopening a task.");
    }
  }

  const completedAtPatch =
    newStatus === 'done'
      ? { completedAt: serverTimestamp() }
      : authoritativeOldStatus === 'done'
      ? { completedAt: null }
      : {};
  await updateDoc(doc(db, 'tasks', taskId), {
    status: newStatus, orderIndex: newOrderIndex, updatedAt: serverTimestamp(),
    ...completedAtPatch,
  });
  if (newStatus !== authoritativeOldStatus) {
    await logActivity(taskId, orgId, actor, 'status_changed', { from: authoritativeOldStatus, to: newStatus });
  }

  if (taskData?.goalId) {
    await syncGoalProgress(taskData.goalId, orgId);
  }
}

export async function updatePriority(
  taskId: string, orgId: string,
  newPriority: TaskPriority, oldPriority: TaskPriority, actor: ActorInfo,
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), { priority: newPriority, updatedAt: serverTimestamp() });
  await logActivity(taskId, orgId, actor, 'priority_changed', { from: oldPriority, to: newPriority });
}

export async function updateAssignees(
  taskId: string, orgId: string,
  newIds: string[], oldIds: string[], actor: ActorInfo,
  taskTitle?: string,
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), { assigneeIds: newIds, updatedAt: serverTimestamp() });
  const added = newIds.filter((id) => !oldIds.includes(id));
  const removed = oldIds.filter((id) => !newIds.includes(id));
  const ps: Promise<void>[] = [];
  if (added.length) ps.push(logActivity(taskId, orgId, actor, 'assigned', { assigneeIds: added }));
  if (removed.length) ps.push(logActivity(taskId, orgId, actor, 'unassigned', { assigneeIds: removed }));
  await Promise.all(ps);
  // Notify newly assigned users (fire-and-forget)
  for (const uid of added) {
    createNotification({
      orgId,
      recipientId: uid,
      category: 'tasks',
      type: 'task_assign',
      urgency: 'medium',
      actor: { id: actor.uid, name: actor.name },
      title: `Assigned to Task`,
      body: `${actor.name} assigned you to: "${taskTitle ?? 'a task'}"`,
      link: `/workspace?task=${taskId}`,
    }).catch(() => console.error('Failed to send task_assigned notification'));
  }
}

export async function updateDueDate(
  taskId: string, orgId: string, dueDate: Date | null, actor: ActorInfo,
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), {
    dueDate: dueDate ? Timestamp.fromDate(dueDate) : null, updatedAt: serverTimestamp(),
  });
  await logActivity(taskId, orgId, actor, 'due_date_set', { dueDate: dueDate?.toISOString() ?? null });
}

export async function updateLabels(
  taskId: string, orgId: string,
  newIds: string[], oldIds: string[], actor: ActorInfo,
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), { labelIds: newIds, updatedAt: serverTimestamp() });
  const added = newIds.filter((id) => !oldIds.includes(id));
  const removed = oldIds.filter((id) => !newIds.includes(id));
  const ps: Promise<void>[] = [];
  if (added.length) ps.push(logActivity(taskId, orgId, actor, 'label_added', { labelIds: added }));
  if (removed.length) ps.push(logActivity(taskId, orgId, actor, 'label_removed', { labelIds: removed }));
  await Promise.all(ps);
}

export async function deleteTask(taskId: string, orgId?: string): Promise<void> {
  const taskDoc = await getDoc(doc(db, 'tasks', taskId));
  const taskData = taskDoc.exists() ? (taskDoc.data() as Task) : null;
  const resolvedOrgId = orgId || taskData?.orgId;

  // Cascade delete subtasks, comments, activities, and update/clean linked requests
  if (resolvedOrgId) {
    try {
      const [subtasksSnap, commentsSnap, activitiesSnap, requestsSnap] = await Promise.all([
        getDocs(query(collection(db, 'tasks'), where('orgId', '==', resolvedOrgId), where('parentTaskId', '==', taskId))),
        getDocs(query(collection(db, 'taskComments'), where('orgId', '==', resolvedOrgId), where('taskId', '==', taskId))),
        getDocs(query(collection(db, 'taskActivities'), where('orgId', '==', resolvedOrgId), where('taskId', '==', taskId))),
        getDocs(query(collection(db, 'requests'), where('orgId', '==', resolvedOrgId), where('taskId', '==', taskId))),
      ]);

      const batch = writeBatch(db);
      subtasksSnap.docs.forEach((d) => batch.delete(doc(db, 'tasks', d.id)));
      commentsSnap.docs.forEach((d) => batch.delete(doc(db, 'taskComments', d.id)));
      activitiesSnap.docs.forEach((d) => batch.delete(doc(db, 'taskActivities', d.id)));
      requestsSnap.docs.forEach((d) => {
        batch.update(doc(db, 'requests', d.id), {
          status: 'rejected',
          updatedAt: serverTimestamp(),
        });
      });
      batch.delete(doc(db, 'tasks', taskId));
      await batch.commit();
    } catch (e) {
      console.error('Failed to cascade-clean task dependencies, falling back to direct delete:', e);
      await deleteDoc(doc(db, 'tasks', taskId));
    }
  } else {
    await deleteDoc(doc(db, 'tasks', taskId));
  }

  if (taskData?.goalId) {
    await syncGoalProgress(taskData.goalId, resolvedOrgId);
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function addComment(params: {
  taskId: string; orgId: string; authorId: string;
  authorName: string; authorUsername: string;
  body: string; mentions: string[];
  files?: MessageAttachment[];
  notifyIds?: string[];
  taskTitle?: string;
}): Promise<string> {
  const ref = doc(collection(db, 'taskComments'));
  await setDoc(ref, { id: ref.id, ...params, createdAt: serverTimestamp() });
  await logActivity(
    params.taskId, params.orgId,
    { uid: params.authorId, name: params.authorName },
    'commented', { preview: params.body.slice(0, 80) },
  );
  const toNotify = new Set([...(params.notifyIds ?? []), ...params.mentions]);
  for (const uid of toNotify) {
    const isMention = params.mentions.includes(uid);
    createNotification({
      orgId: params.orgId,
      recipientId: uid,
      category: isMention ? 'mentions' : 'tasks',
      type: isMention ? 'mention' : 'task_comment',
      urgency: isMention ? 'high' : 'medium',
      actor: { id: params.authorId, name: params.authorName },
      title: isMention 
        ? `${params.authorName} mentioned you in a comment`
        : `${params.authorName} commented on task "${params.taskTitle ?? 'a task'}"`,
      body: params.body.slice(0, 100),
      link: `/workspace?task=${params.taskId}`,
    }).catch(() => console.error('Failed to send task comment notification'));
  }
  return ref.id;
}

export async function editComment(commentId: string, newBody: string): Promise<void> {
  await updateDoc(doc(db, 'taskComments', commentId), { body: newBody, editedAt: serverTimestamp() });
}

export async function deleteComment(commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'taskComments', commentId));
}

export async function updateTaskAttachments(
  taskId: string,
  files: MessageAttachment[]
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), { files, updatedAt: serverTimestamp() });
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export async function createLabel(orgId: string, name: string, color: string): Promise<string> {
  const ref = doc(collection(db, 'taskLabels'));
  await setDoc(ref, { id: ref.id, orgId, name, color, createdAt: serverTimestamp() });
  return ref.id;
}

// ─── Listeners ────────────────────────────────────────────────────────────────

export type TaskScopeFilter =
  | { projectId: string; goalId?: never }
  | { goalId: string; projectId?: never }
  | Record<string, never>;

function normalizeTask(d: any): Task {
  const data = (typeof d.data === 'function' ? d.data() : d) as Task;
  return {
    ...data,
    id: data.id || d.id,
    assigneeIds: Array.isArray(data.assigneeIds) ? data.assigneeIds : [],
    labelIds: Array.isArray(data.labelIds) ? data.labelIds : [],
  };
}

export function listenToTasks(
  orgId: string,
  cb: (tasks: Task[]) => void,
  scope?: TaskScopeFilter,
): () => void {
  let q;
  if (scope && 'projectId' in scope && scope.projectId) {
    q = query(
      collection(db, 'tasks'),
      where('orgId', '==', orgId),
      where('projectId', '==', scope.projectId),
      orderBy('createdAt', 'asc'),
    );
  } else if (scope && 'goalId' in scope && scope.goalId) {
    q = query(
      collection(db, 'tasks'),
      where('orgId', '==', orgId),
      where('goalId', '==', scope.goalId),
      orderBy('createdAt', 'asc'),
    );
  } else {
    q = query(
      collection(db, 'tasks'),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'asc'),
    );
  }
  return onSnapshot(q, (snap) => cb(snap.docs.map(normalizeTask)));
}

export function listenToComments(orgId: string, taskId: string, cb: (comments: TaskComment[]) => void): () => void {
  return onSnapshot(
    query(
      collection(db, 'taskComments'),
      where('orgId', '==', orgId),
      where('taskId', '==', taskId)
    ),
    (snap) => {
      const list = snap.docs.map((d) => d.data() as TaskComment);
      list.sort((a, b) => {
        const t1 = a.createdAt?.seconds || 0;
        const t2 = b.createdAt?.seconds || 0;
        return t1 - t2;
      });
      cb(list);
    }
  );
}

export function listenToActivities(
  taskId: string,
  cb: (activities: TaskActivity[]) => void,
  orgId?: string,
): () => void {
  if (orgId) {
    return onSnapshot(
      query(
        collection(db, 'taskActivities'),
        where('orgId', '==', orgId),
        where('taskId', '==', taskId),
        orderBy('createdAt', 'asc'),
      ),
      (snap) => cb(snap.docs.map((d) => d.data() as TaskActivity)),
    );
  }
  let unsubInner: (() => void) | null = null;
  let cancelled = false;
  getDoc(doc(db, 'tasks', taskId)).then((taskSnap) => {
    if (cancelled || !taskSnap.exists()) return;
    const resolvedOrgId = taskSnap.data()?.orgId;
    if (!resolvedOrgId) return;
    unsubInner = onSnapshot(
      query(
        collection(db, 'taskActivities'),
        where('orgId', '==', resolvedOrgId),
        where('taskId', '==', taskId),
        orderBy('createdAt', 'asc'),
      ),
      (snap) => cb(snap.docs.map((d) => d.data() as TaskActivity)),
    );
  }).catch(() => {});
  return () => {
    cancelled = true;
    unsubInner?.();
  };
}

export function listenToLabels(orgId: string, cb: (labels: TaskLabel[]) => void): () => void {
  return onSnapshot(
    query(collection(db, 'taskLabels'), where('orgId', '==', orgId), orderBy('createdAt', 'asc')),
    (snap) => cb(snap.docs.map((d) => d.data() as TaskLabel)),
  );
}

export function listenToTask(taskId: string, cb: (task: Task | null) => void): () => void {
  return onSnapshot(doc(db, 'tasks', taskId), (snap) => {
    cb(snap.exists() ? normalizeTask(snap) : null);
  });
}

export function listenToSubtasks(
  parentTaskId: string,
  cb: (tasks: Task[]) => void,
  orgId?: string,
): () => void {
  const handleSnap = (snap: any) => {
    const list = snap.docs.map(normalizeTask);
    list.sort((a: Task, b: Task) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return aTime - bTime;
    });
    cb(list);
  };
  if (orgId) {
    return onSnapshot(
      query(
        collection(db, 'tasks'),
        where('orgId', '==', orgId),
        where('parentTaskId', '==', parentTaskId),
      ),
      handleSnap,
    );
  }
  let unsubInner: (() => void) | null = null;
  let cancelled = false;
  getDoc(doc(db, 'tasks', parentTaskId)).then((taskSnap) => {
    if (cancelled || !taskSnap.exists()) return;
    const resolvedOrgId = taskSnap.data()?.orgId;
    if (!resolvedOrgId) return;
    unsubInner = onSnapshot(
      query(
        collection(db, 'tasks'),
        where('orgId', '==', resolvedOrgId),
        where('parentTaskId', '==', parentTaskId),
      ),
      handleSnap,
    );
  }).catch(() => {});
  return () => {
    cancelled = true;
    unsubInner?.();
  };
}

export type {
  Task, TaskStatus, TaskPriority, TaskComment,
  TaskActivity, TaskLabel, ActivityType, ActorInfo,
};

