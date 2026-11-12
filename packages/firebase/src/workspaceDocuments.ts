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
import type { WorkspaceDocument, DocumentStatus, WorkspaceDocumentPresence } from '@guild/types';

const COLLECTION = 'workspaceDocuments';
const PRESENCE_COLLECTION = 'workspaceDocumentPresence';

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
    icon: params.icon || 'FileText',
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
    where('orgId', '==', orgId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs
        .map((d) => d.data() as WorkspaceDocument)
        .filter((d) => !d.isArchived)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      cb(docs);
    },
    (err) => {
      console.error('[listenToWorkspaceDocuments] Error:', err);
      cb([]);
    }
  );
}

export async function updateWorkspaceDocumentPresence(params: {
  docId: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
}): Promise<void> {
  const presenceId = `${params.docId}_${params.userId}`;
  const ref = doc(db, PRESENCE_COLLECTION, presenceId);
  await setDoc(
    ref,
    {
      id: presenceId,
      docId: params.docId,
      userId: params.userId,
      userName: params.userName,
      avatarUrl: params.avatarUrl || null,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function removeWorkspaceDocumentPresence(docId: string, userId: string): Promise<void> {
  const presenceId = `${docId}_${userId}`;
  try {
    await deleteDoc(doc(db, PRESENCE_COLLECTION, presenceId));
  } catch (err) {
    // Ignore cleanup error
  }
}

export function listenToWorkspaceDocumentPresence(
  docId: string,
  cb: (presenceList: WorkspaceDocumentPresence[]) => void
): () => void {
  const q = query(
    collection(db, PRESENCE_COLLECTION),
    where('docId', '==', docId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const now = Date.now();
      const list = snap.docs
        .map((d) => d.data() as WorkspaceDocumentPresence)
        .filter((p) => {
          if (!p.updatedAt) return true;
          const time =
            typeof (p.updatedAt as any).toMillis === 'function'
              ? (p.updatedAt as any).toMillis()
              : (p.updatedAt as any).seconds
                ? (p.updatedAt as any).seconds * 1000
                : now;
          // Active within last 45 seconds (heartbeat is 15s)
          return now - time < 45000;
        });
      cb(list);
    },
    (err) => {
      console.error('[listenToWorkspaceDocumentPresence] Error:', err);
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
