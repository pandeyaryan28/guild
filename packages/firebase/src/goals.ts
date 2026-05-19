import {
  collection, doc, setDoc, updateDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Goal, GoalStatus, ActorInfo } from '@guild/types';

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function createGoal(params: {
  orgId: string;
  title: string;
  description?: string;
  targetDate?: Date | null;
  actor: ActorInfo;
}): Promise<string> {
  const ref = doc(collection(db, 'goals'));
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
  });
  return ref.id;
}

export async function updateGoal(
  goalId: string,
  patch: Partial<Pick<Goal, 'title' | 'description' | 'status' | 'targetDate'>>,
): Promise<void> {
  await updateDoc(doc(db, 'goals', goalId), {
    ...patch,
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
