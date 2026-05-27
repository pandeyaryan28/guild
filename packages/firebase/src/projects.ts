import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  Timestamp, collectionGroup,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Project, ProjectStatus, Milestone, ActorInfo } from '@guild/types';

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function createProject(params: {
  orgId: string;
  name: string;
  description?: string;
  memberIds?: string[];
  startDate?: Date | null;
  dueDate?: Date | null;
  actor: ActorInfo;
}): Promise<string> {
  const ref = doc(collection(db, 'projects'));
  await setDoc(ref, {
    id: ref.id,
    orgId: params.orgId,
    name: params.name,
    description: params.description ?? '',
    ownerId: params.actor.uid,
    memberIds: params.memberIds ?? [params.actor.uid],
    status: 'active' as ProjectStatus,
    startDate: params.startDate ? Timestamp.fromDate(params.startDate) : null,
    dueDate: params.dueDate ? Timestamp.fromDate(params.dueDate) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProject(
  projectId: string,
  patch: Partial<Pick<Project, 'name' | 'description' | 'status' | 'memberIds' | 'dueDate' | 'startDate'>>,
): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveProject(projectId: string): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), {
    status: 'archived' as ProjectStatus,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', projectId));
}

export function listenToProjects(
  orgId: string,
  userId: string,
  cb: (projects: Project[]) => void,
): () => void {
  return onSnapshot(
    query(
      collection(db, 'projects'),
      where('orgId', '==', orgId),
      where('memberIds', 'array-contains', userId),
      orderBy('createdAt', 'asc'),
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as Project)),
  );
}

export function listenToProject(
  projectId: string,
  cb: (project: Project | null) => void,
): () => void {
  return onSnapshot(doc(db, 'projects', projectId), (snap) =>
    cb(snap.exists() ? (snap.data() as Project) : null),
  );
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function createMilestone(params: {
  projectId: string;
  orgId: string;
  title: string;
  dueDate?: Date | null;
}): Promise<string> {
  const ref = doc(collection(db, 'projects', params.projectId, 'milestones'));
  await setDoc(ref, {
    id: ref.id,
    projectId: params.projectId,
    orgId: params.orgId,
    title: params.title,
    dueDate: params.dueDate ? Timestamp.fromDate(params.dueDate) : null,
    completed: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function toggleMilestone(
  projectId: string,
  milestoneId: string,
  completed: boolean,
): Promise<void> {
  await updateDoc(
    doc(db, 'projects', projectId, 'milestones', milestoneId),
    { completed },
  );
}

export async function deleteMilestone(
  projectId: string,
  milestoneId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'projects', projectId, 'milestones', milestoneId));
}

export function listenToMilestones(
  projectId: string,
  cb: (milestones: Milestone[]) => void,
): () => void {
  return onSnapshot(
    query(
      collection(db, 'projects', projectId, 'milestones'),
      orderBy('createdAt', 'asc'),
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as Milestone)),
  );
}

export type { Project, Milestone, ProjectStatus };
