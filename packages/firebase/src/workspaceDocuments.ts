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
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import type { WorkspaceDocument, DocumentStatus } from '@guild/types';

const COLLECTION = 'workspaceDocuments';

export async function createWorkspaceDocument(params: {
  orgId: string;
  parentId?: string | null;
  title?: string;
  icon?: string;
  coverUrl?: string | null;
  userId: string;
  userName: string;
  orderIndex?: number;
}): Promise<string> {
  const ref = doc(collection(db, COLLECTION));
  const newDoc: Omit<WorkspaceDocument, 'createdAt' | 'updatedAt'> = {
    id: ref.id,
    orgId: params.orgId,
    parentId: params.parentId ?? null,
    title: params.title || 'Untitled Document',
    icon: params.icon || '📄',
    coverUrl: params.coverUrl ?? null,
    contentJson: JSON.stringify({ type: 'doc', content: [] }),
    contentHtml: '',
    createdBy: params.userId,
    creatorName: params.userName,
    lastEditedBy: params.userId,
    lastEditedByName: params.userName,
    isArchived: false,
    isFavorite: false,
    orderIndex: params.orderIndex ?? Date.now(),
    status: 'draft',
    tags: [],
    linkedIssueIds: []
  };

  await setDoc(ref, {
    ...newDoc,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return ref.id;
}

export async function updateWorkspaceDocumentContent(params: {
  docId: string;
  contentJson: string;
  contentHtml?: string;
  title?: string;
  userId: string;
  userName: string;
}): Promise<void> {
  const ref = doc(db, COLLECTION, params.docId);
  const updates: Record<string, any> = {
    contentJson: params.contentJson,
    lastEditedBy: params.userId,
    lastEditedByName: params.userName,
    updatedAt: serverTimestamp()
  };

  if (params.contentHtml !== undefined) {
    updates.contentHtml = params.contentHtml;
  }
  if (params.title !== undefined) {
    updates.title = params.title;
  }

  await updateDoc(ref, updates);
}

export async function updateWorkspaceDocumentMeta(
  docId: string,
  patch: Partial<Pick<WorkspaceDocument, 'title' | 'icon' | 'coverUrl' | 'parentId' | 'isArchived' | 'isFavorite' | 'status' | 'orderIndex' | 'tags' | 'linkedIssueIds' | 'linkedCycleId'>>,
  userId?: string,
  userName?: string
): Promise<void> {
  const ref = doc(db, COLLECTION, docId);
  const updates: Record<string, any> = {
    ...patch,
    updatedAt: serverTimestamp()
  };

  if (userId) updates.lastEditedBy = userId;
  if (userName) updates.lastEditedByName = userName;

  await updateDoc(ref, updates);
}

export async function deleteWorkspaceDocument(docId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, docId));
}

export function listenToWorkspaceDocuments(
  orgId: string,
  cb: (docs: WorkspaceDocument[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('orgId', '==', orgId),
    where('isArchived', '==', false),
    orderBy('orderIndex', 'asc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.map((d) => d.data() as WorkspaceDocument);
      cb(docs);
    },
    (err) => {
      console.error('[listenToWorkspaceDocuments] Error:', err);
      cb([]);
    }
  );
}

export function listenToWorkspaceDocument(
  docId: string,
  cb: (doc: WorkspaceDocument | null) => void
): () => void {
  const ref = doc(db, COLLECTION, docId);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        cb(snap.data() as WorkspaceDocument);
      } else {
        cb(null);
      }
    },
    (err) => {
      console.error('[listenToWorkspaceDocument] Error:', err);
      cb(null);
    }
  );
}

export async function reorderWorkspaceDocuments(
  orgId: string,
  items: { id: string; orderIndex: number; parentId: string | null }[]
): Promise<void> {
  if (items.length === 0) return;
  const CHUNK_SIZE = 400;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const ref = doc(db, COLLECTION, item.id);
      batch.update(ref, {
        orderIndex: item.orderIndex,
        parentId: item.parentId,
        updatedAt: serverTimestamp()
      });
    }
    await batch.commit();
  }
}
