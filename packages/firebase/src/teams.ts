import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { updateUserProfile } from './firestore';
import type { Team } from '@guild/types';

// ─── Teams Operations ─────────────────────────────────────────────────────────

export async function createTeam(params: {
  orgId: string;
  name: string;
  description?: string;
  managerId: string;
  memberIds: string[];
}): Promise<string> {
  const ref = doc(collection(db, 'teams'));
  const now = serverTimestamp();

  await setDoc(ref, {
    id: ref.id,
    orgId: params.orgId,
    name: params.name,
    description: params.description ?? '',
    managerId: params.managerId,
    memberIds: params.memberIds,
    createdAt: now,
    updatedAt: now,
  });

  // Mark the manager as a manager in their UserProfile
  await updateUserProfile(params.managerId, { isManager: true });

  return ref.id;
}

export async function updateTeam(
  teamId: string,
  patch: Partial<Pick<Team, 'name' | 'description' | 'managerId' | 'memberIds'>>,
): Promise<void> {
  const ref = doc(db, 'teams', teamId);
  const now = serverTimestamp();

  await updateDoc(ref, {
    ...patch,
    updatedAt: now,
  });

  // If a manager was updated, ensure their UserProfile is updated to support line reporting
  if (patch.managerId) {
    await updateUserProfile(patch.managerId, { isManager: true });
  }
}

export async function deleteTeam(teamId: string): Promise<void> {
  const ref = doc(db, 'teams', teamId);
  await deleteDoc(ref);
}

// ─── Listeners ────────────────────────────────────────────────────────────────

export function listenToOrgTeams(
  orgId: string,
  cb: (teams: Team[]) => void,
): () => void {
  return onSnapshot(
    query(
      collection(db, 'teams'),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'asc'),
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as Team)),
  );
}

export function listenToManagedTeams(
  orgId: string,
  managerId: string,
  cb: (teams: Team[]) => void,
): () => void {
  return onSnapshot(
    query(
      collection(db, 'teams'),
      where('orgId', '==', orgId),
      where('managerId', '==', managerId),
      orderBy('createdAt', 'asc'),
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as Team)),
  );
}
