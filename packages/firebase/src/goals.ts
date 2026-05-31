import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Goal, GoalStatus, GoalHorizon, GoalRecurrence, ActorInfo, MessageAttachment, GoalComment } from '@guild/types';

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function createGoal(params: {
  orgId: string;
  title: string;
  description?: string;
  targetDate?: Date | null;
  actor: ActorInfo;
  horizon?: GoalHorizon;
  recurrence?: GoalRecurrence;
  projectId?: string | null;
  ownerId?: string | null;
}): Promise<string> {
  const ref = doc(collection(db, 'goals'));
  const horizon = params.horizon ?? 'short_term';
  const recurrence = params.recurrence ?? 'none';
  await setDoc(ref, {
    id: ref.id,
    orgId: params.orgId,
    title: params.title,
    description: params.description ?? '',
    ownerId: params.ownerId ?? params.actor.uid,
    status: 'active' as GoalStatus,
    targetDate: params.targetDate ? Timestamp.fromDate(params.targetDate) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    projectId: params.projectId ?? null,

    // Chronology features
    horizon,
    recurrence,
    currentCycleStart: recurrence !== 'none' ? serverTimestamp() : null,
    completedCyclesCount: 0,
    progressRollup: 0,
    cycleHistory: [],
  });
  return ref.id;
}

export async function updateGoal(
  goalId: string,
  patch: Partial<Omit<Goal, 'id' | 'orgId' | 'createdAt'>>,
): Promise<void> {
  const completedAtPatch =
    patch.status === 'completed'
      ? { completedAt: serverTimestamp() }
      : patch.status !== undefined
      ? { completedAt: null }
      : {};
  await updateDoc(doc(db, 'goals', goalId), {
    ...patch,
    ...completedAtPatch,
    updatedAt: serverTimestamp(),
  });
}

export function listenToGoals(
  orgId: string,
  cb: (goals: Goal[]) => void,
): () => void {
  return onSnapshot(
    query(
      collection(db, 'goals'),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'asc'),
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as Goal)),
  );
}

export function listenToGoal(
  goalId: string,
  cb: (goal: Goal | null) => void,
): () => void {
  return onSnapshot(doc(db, 'goals', goalId), (snap) =>
    cb(snap.exists() ? (snap.data() as Goal) : null),
  );
}

export async function deleteGoal(goalId: string): Promise<void> {
  await deleteDoc(doc(db, 'goals', goalId));
}

export async function updateGoalAttachments(
  goalId: string,
  files: MessageAttachment[]
): Promise<void> {
  await updateDoc(doc(db, 'goals', goalId), { files, updatedAt: serverTimestamp() });
}

export async function addGoalComment(params: {
  goalId: string; orgId: string; authorId: string;
  authorName: string; authorUsername: string;
  body: string; mentions: string[];
  files?: MessageAttachment[];
}): Promise<string> {
  const ref = doc(collection(db, 'goalComments'));
  await setDoc(ref, { id: ref.id, ...params, createdAt: serverTimestamp() });
  return ref.id;
}

export function listenToGoalComments(
  orgId: string,
  goalId: string,
  cb: (comments: GoalComment[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, 'goalComments'),
      where('orgId', '==', orgId),
      where('goalId', '==', goalId)
    ),
    (snap) => {
      const list = snap.docs.map((d) => d.data() as GoalComment);
      list.sort((a, b) => {
        const t1 = a.createdAt?.seconds || 0;
        const t2 = b.createdAt?.seconds || 0;
        return t1 - t2;
      });
      cb(list);
    }
  );
}

export async function deleteGoalComment(commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'goalComments', commentId));
}

export type { Goal, GoalStatus, GoalComment };
