import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { WorkspaceCycle, CycleStatus } from '@guild/types';

const COLLECTION = 'workspaceCycles';

export async function createWorkspaceCycle(params: {
  orgId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  status?: CycleStatus;
}): Promise<string> {
  // Find highest existing cycle number
  const numQuery = query(
    collection(db, COLLECTION),
    where('orgId', '==', params.orgId),
    orderBy('number', 'desc'),
    limit(1)
  );

  let nextNumber = 1;
  try {
    const snap = await getDocs(numQuery);
    if (!snap.empty) {
      const highest = snap.docs[0].data() as WorkspaceCycle;
      nextNumber = (highest.number || 0) + 1;
    }
  } catch (err) {
    console.warn('[createWorkspaceCycle] Could not query latest cycle number:', err);
  }

  const ref = doc(collection(db, COLLECTION));
  const newCycle: Omit<WorkspaceCycle, 'createdAt' | 'updatedAt'> = {
    id: ref.id,
    orgId: params.orgId,
    number: nextNumber,
    title: params.title || `Cycle ${nextNumber}`,
    startDate: Timestamp.fromDate(params.startDate),
    endDate: Timestamp.fromDate(params.endDate),
    status: params.status || 'upcoming',
    totalPoints: 0,
    completedPoints: 0,
    totalIssues: 0,
    completedIssues: 0
  };

  await setDoc(ref, {
    ...newCycle,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return ref.id;
}

export async function updateWorkspaceCycle(
  cycleId: string,
  patch: Partial<Omit<WorkspaceCycle, 'id' | 'orgId' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, cycleId);
  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp()
  });
}

export async function deleteWorkspaceCycle(cycleId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, cycleId));
}

export function listenToWorkspaceCycles(
  orgId: string,
  cb: (cycles: WorkspaceCycle[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('orgId', '==', orgId),
    orderBy('startDate', 'desc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const cycles = snap.docs.map((d) => d.data() as WorkspaceCycle);
      cb(cycles);
    },
    (err) => {
      console.error('[listenToWorkspaceCycles] Error:', err);
      cb([]);
    }
  );
}
