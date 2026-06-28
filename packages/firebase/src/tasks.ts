import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
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
    ),
  );
  if (snap.empty) return 1000;
  return ((snap.docs[0].data() as Task).orderIndex ?? 1000) + 1000;
}

export async function syncGoalProgress(goalId: string): Promise<void> {
  const tasksSnap = await getDocs(
    query(
      collection(db, 'tasks'),
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
  const doneTasks = allTasks.filter((t) => t.status === 'done');
  const progressPercent = Math.round((doneTasks.length / allTasks.length) * 100);

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
  // Execution OS — optional scope fields
  projectId?: string | null;
  goalId?: string | null;
  parentTaskId?: string | null;
}): Promise<string> {
  const ref = doc(collection(db, 'tasks'));
  const status = params.status ?? 'todo';
  const orderIndex = await getNextOrderIndex(params.orgId, status);
  await setDoc(ref, {
    id: ref.id, orgId: params.orgId, title: params.title,
    description: params.description ?? '', status,
    priority: params.priority ?? 'none',
    assigneeIds: (params.assigneeIds && params.assigneeIds.length > 0) ? params.assigneeIds : [params.actor.uid],
    creatorId: params.actor.uid,
    labelIds: params.labelIds ?? [],
    dueDate: params.dueDate ? Timestamp.fromDate(params.dueDate) : null,
    orderIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    // Scope fields — null means unscoped (backward compatible)
    projectId: params.projectId ?? null,
    goalId: params.goalId ?? null,
    parentTaskId: params.parentTaskId ?? null,
  });
  await logActivity(ref.id, params.orgId, params.actor, 'created', { title: params.title });
  if (params.goalId) {
    await syncGoalProgress(params.goalId);
  }
  return ref.id;
}

export async function updateTask(
  taskId: string, orgId: string,
  patch: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'projectId' | 'goalId'>>,
  actor: ActorInfo,
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), { ...patch, updatedAt: serverTimestamp() });
  await logActivity(taskId, orgId, actor, 'edited', patch);
}

export async function moveTask(
  taskId: string, orgId: string,
  newStatus: TaskStatus, newOrderIndex: number, oldStatus: TaskStatus,
  actor: ActorInfo,
): Promise<void> {
  const taskDoc = await getDoc(doc(db, 'tasks', taskId));
  const taskData = taskDoc.exists() ? (taskDoc.data() as Task) : null;

  const completedAtPatch =
    newStatus === 'done'
      ? { completedAt: serverTimestamp() }
      : oldStatus === 'done'
      ? { completedAt: null }
      : {};
  await updateDoc(doc(db, 'tasks', taskId), {
    status: newStatus, orderIndex: newOrderIndex, updatedAt: serverTimestamp(),
    ...completedAtPatch,
  });
  if (newStatus !== oldStatus) {
    await logActivity(taskId, orgId, actor, 'status_changed', { from: oldStatus, to: newStatus });
  }

  if (taskData?.goalId) {
    await syncGoalProgress(taskData.goalId);
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
      link: `/tasks?task=${taskId}`,
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

export async function deleteTask(taskId: string): Promise<void> {
  const taskDoc = await getDoc(doc(db, 'tasks', taskId));
  const taskData = taskDoc.exists() ? (taskDoc.data() as Task) : null;

  await deleteDoc(doc(db, 'tasks', taskId));

  if (taskData?.goalId) {
    await syncGoalProgress(taskData.goalId);
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
      link: `/tasks?task=${params.taskId}`,
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
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => d.data() as Task)));
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

export function listenToActivities(taskId: string, cb: (activities: TaskActivity[]) => void): () => void {
  return onSnapshot(
    query(collection(db, 'taskActivities'), where('taskId', '==', taskId), orderBy('createdAt', 'asc')),
    (snap) => cb(snap.docs.map((d) => d.data() as TaskActivity)),
  );
}

export function listenToLabels(orgId: string, cb: (labels: TaskLabel[]) => void): () => void {
  return onSnapshot(
    query(collection(db, 'taskLabels'), where('orgId', '==', orgId), orderBy('createdAt', 'asc')),
    (snap) => cb(snap.docs.map((d) => d.data() as TaskLabel)),
  );
}

export function listenToTask(taskId: string, cb: (task: Task | null) => void): () => void {
  return onSnapshot(doc(db, 'tasks', taskId), (snap) => {
    cb(snap.exists() ? (snap.data() as Task) : null);
  });
}

export function listenToSubtasks(
  parentTaskId: string,
  cb: (tasks: Task[]) => void,
): () => void {
  const q = query(
    collection(db, 'tasks'),
    where('parentTaskId', '==', parentTaskId)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => d.data() as Task);
    list.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return aTime - bTime;
    });
    cb(list);
  });
}

export type {
  Task, TaskStatus, TaskPriority, TaskComment,
  TaskActivity, TaskLabel, ActivityType, ActorInfo,
};

