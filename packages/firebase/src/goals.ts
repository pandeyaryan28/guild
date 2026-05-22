import {
  collection, doc, setDoc, updateDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Goal, GoalStatus, GoalHorizon, GoalRecurrence, ActorInfo } from '@guild/types';

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function createGoal(params: {
  orgId: string;
  title: string;
  description?: string;
  targetDate?: Date | null;
  actor: ActorInfo;
  horizon?: GoalHorizon;
  recurrence?: GoalRecurrence;
}): Promise<string> {
  const ref = doc(collection(db, 'goals'));
  const horizon = params.horizon ?? 'short_term';
  const recurrence = params.recurrence ?? 'none';
  await setDoc(ref, {
    id: ref.id,
    orgId: params.orgId,
    title: params.title,
    description: params.description ?? '',
    ownerId: params.actor.uid,
    status: 'active' as GoalStatus,
    targetDate: params.targetDate ? Timestamp.fromDate(params.targetDate) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

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

export type { Goal, GoalStatus };
