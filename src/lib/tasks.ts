import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  Timestamp, writeBatch, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';
export type ActivityType =
  | 'created' | 'status_changed' | 'assigned' | 'unassigned'
  | 'priority_changed' | 'edited' | 'commented' | 'label_added'
  | 'label_removed' | 'due_date_set';

export interface Task {
  id: string;
  orgId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  creatorId: string;
  labelIds: string[];
  dueDate: Timestamp | null;
  orderIndex: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TaskComment {
  id: string;
  taskId: string;
  orgId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  body: string;
  mentions: string[];
  createdAt: Timestamp;
  editedAt?: Timestamp;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  orgId: string;
  actorId: string;
  actorName: string;
  type: ActivityType;
  payload: Record<string, any>;
  createdAt: Timestamp;
}

export interface TaskLabel {
  id: string;
  orgId: string;
  name: string;
  color: string; // hex color
  createdAt: Timestamp;
}

export interface ActorInfo {
  uid: string;
  name: string;
}

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
  type: ActivityType, payload: Record<string, any> = {},
): Promise<void> {
  const ref = doc(collection(db, 'taskActivities'));
  await setDoc(ref, { id: ref.id, taskId, orgId, actorId: actor.uid, actorName: actor.name, type, payload, createdAt: serverTimestamp() });
}

async function getNextOrderIndex(orgId: string, status: TaskStatus): Promise<number> {
  const snap = await getDocs(
    query(collection(db, 'tasks'), where('orgId', '==', orgId), where('status', '==', status), orderBy('orderIndex', 'desc')),
  );
  if (snap.empty) return 1000;
  return ((snap.docs[0].data() as Task).orderIndex ?? 1000) + 1000;
}

// ─── Task CRUD ────────────────────────────────────────────────────────────────

export async function createTask(params: {
  orgId: string; title: string; description?: string;
  status?: TaskStatus; priority?: TaskPriority;
  assigneeIds?: string[]; labelIds?: string[];
  dueDate?: Date | null; actor: ActorInfo;
}): Promise<string> {
  const ref = doc(collection(db, 'tasks'));
  const status = params.status ?? 'todo';
  const orderIndex = await getNextOrderIndex(params.orgId, status);
  await setDoc(ref, {
    id: ref.id, orgId: params.orgId, title: params.title,
    description: params.description ?? '', status,
    priority: params.priority ?? 'none',
    assigneeIds: params.assigneeIds ?? [],
    creatorId: params.actor.uid,
    labelIds: params.labelIds ?? [],
    dueDate: params.dueDate ? Timestamp.fromDate(params.dueDate) : null,
    orderIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  await logActivity(ref.id, params.orgId, params.actor, 'created', { title: params.title });
  return ref.id;
}

export async function updateTask(
  taskId: string, orgId: string,
  patch: Partial<Pick<Task, 'title' | 'description'>>,
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
  await updateDoc(doc(db, 'tasks', taskId), { status: newStatus, orderIndex: newOrderIndex, updatedAt: serverTimestamp() });
  if (newStatus !== oldStatus) {
    await logActivity(taskId, orgId, actor, 'status_changed', { from: oldStatus, to: newStatus });
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
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), { assigneeIds: newIds, updatedAt: serverTimestamp() });
  const added = newIds.filter((id) => !oldIds.includes(id));
  const removed = oldIds.filter((id) => !newIds.includes(id));
  const ps: Promise<void>[] = [];
  if (added.length) ps.push(logActivity(taskId, orgId, actor, 'assigned', { assigneeIds: added }));
  if (removed.length) ps.push(logActivity(taskId, orgId, actor, 'unassigned', { assigneeIds: removed }));
  await Promise.all(ps);
}

export async function updateDueDate(
  taskId: string, orgId: string, dueDate: Date | null, actor: ActorInfo,
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), { dueDate: dueDate ? Timestamp.fromDate(dueDate) : null, updatedAt: serverTimestamp() });
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
  await deleteDoc(doc(db, 'tasks', taskId));
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function addComment(params: {
  taskId: string; orgId: string; authorId: string;
  authorName: string; authorUsername: string;
  body: string; mentions: string[];
}): Promise<string> {
  const ref = doc(collection(db, 'taskComments'));
  await setDoc(ref, { id: ref.id, ...params, createdAt: serverTimestamp() });
  await logActivity(params.taskId, params.orgId, { uid: params.authorId, name: params.authorName }, 'commented', { preview: params.body.slice(0, 80) });
  return ref.id;
}

export async function editComment(commentId: string, newBody: string): Promise<void> {
  await updateDoc(doc(db, 'taskComments', commentId), { body: newBody, editedAt: serverTimestamp() });
}

export async function deleteComment(commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'taskComments', commentId));
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export async function createLabel(orgId: string, name: string, color: string): Promise<string> {
  const ref = doc(collection(db, 'taskLabels'));
  await setDoc(ref, { id: ref.id, orgId, name, color, createdAt: serverTimestamp() });
  return ref.id;
}

// ─── Listeners ────────────────────────────────────────────────────────────────

export function listenToTasks(orgId: string, cb: (tasks: Task[]) => void): () => void {
  return onSnapshot(
    query(collection(db, 'tasks'), where('orgId', '==', orgId), orderBy('createdAt', 'asc')),
    (snap) => cb(snap.docs.map((d) => d.data() as Task)),
  );
}

export function listenToComments(taskId: string, cb: (comments: TaskComment[]) => void): () => void {
  return onSnapshot(
    query(collection(db, 'taskComments'), where('taskId', '==', taskId), orderBy('createdAt', 'asc')),
    (snap) => cb(snap.docs.map((d) => d.data() as TaskComment)),
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
