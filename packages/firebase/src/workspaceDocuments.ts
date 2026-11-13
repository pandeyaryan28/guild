import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocs,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  WorkspaceDocument,
  WorkspaceDocumentPresence,
  CanvasVisibility,
  CanvasAccessRole,
  CanvasCollaborator
} from '@guild/types';

const COLLECTION = 'workspaceDocuments';
const PRESENCE_COLLECTION = 'workspaceDocumentPresence';

/**
 * Helper to evaluate whether a user has read access to a WorkspaceDocument.
 * By default, canvases are private to `createdBy` unless explicitly shared via
 * `allowedUserIds` / `permissions` or opened to `visibility === 'workspace'`.
 */
export function canUserAccessDocument(docData: WorkspaceDocument, userId?: string): boolean {
  if (!userId) return true;
  if (!docData.createdBy && !(docData as any).creatorId) {
    return true;
  }
  if (docData.createdBy === userId || (docData as any).creatorId === userId) {
    return true;
  }
  if (docData.visibility === 'workspace') {
    return true;
  }
  if (Array.isArray(docData.allowedUserIds) && docData.allowedUserIds.includes(userId)) {
    return true;
  }
  if (docData.permissions && Boolean(docData.permissions[userId])) {
    return true;
  }
  if (
    docData.collaborators &&
    !Array.isArray(docData.collaborators) &&
    typeof docData.collaborators === 'object' &&
    Boolean((docData.collaborators as any)[userId])
  ) {
    return true;
  }
  return false;
}

/**
 * Resolves the effective access role ('admin' | 'edit' | 'view') for a user on a canvas.
 */
export function getUserDocumentRole(
  docData: WorkspaceDocument | null | undefined,
  userId?: string
): CanvasAccessRole {
  if (!docData) return 'edit';
  if (!userId) return 'edit';
  if (!docData.createdBy && !(docData as any).creatorId) {
    return 'admin';
  }
  if (docData.createdBy === userId || (docData as any).creatorId === userId) {
    return 'admin';
  }
  if (docData.permissions && docData.permissions[userId]) {
    return docData.permissions[userId];
  }
  if (Array.isArray(docData.allowedUserIds) && docData.allowedUserIds.includes(userId)) {
    return 'edit';
  }
  if (docData.visibility === 'workspace') {
    return 'edit';
  }
  return 'view';
}

export async function createWorkspaceDocument(params: {
  orgId: string;
  parentId?: string | null;
  parentDatabaseRowId?: string | null;
  title?: string;
  icon?: string;
  coverUrl?: string | null;
  contentJson?: string;
  contentHtml?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  orderIndex?: number;
  visibility?: CanvasVisibility;
  inheritPermissions?: boolean;
}): Promise<string> {
  const ref = doc(collection(db, COLLECTION));

  let visibility: CanvasVisibility = params.visibility ?? 'private';
  let allowedUserIds: string[] = [params.userId];
  let permissions: Record<string, CanvasAccessRole> = {
    [params.userId]: 'admin'
  };
  let collaborators: Record<string, CanvasCollaborator> = {
    [params.userId]: {
      uid: params.userId,
      name: params.userName,
      email: params.userEmail || '',
      avatarUrl: params.userAvatar || '',
      role: 'admin',
      addedAt: Date.now()
    }
  };

  // Notion Top-Down Permission Inheritance: if creating a sub-canvas under a parent canvas,
  // inherit the parent canvas's access list unless explicitly overridden.
  const shouldInherit = params.inheritPermissions ?? Boolean(params.parentId);
  if (params.parentId && shouldInherit) {
    try {
      const parentSnap = await getDoc(doc(db, COLLECTION, params.parentId));
      if (parentSnap.exists()) {
        const parentData = parentSnap.data() as WorkspaceDocument;
        if (parentData.visibility) {
          visibility = parentData.visibility;
        }
        const mergedAllowed = new Set<string>([
          params.userId,
          parentData.createdBy,
          ...(parentData.allowedUserIds || [])
        ]);
        allowedUserIds = Array.from(mergedAllowed).filter(Boolean);
        permissions = {
          ...(parentData.permissions || {}),
          [parentData.createdBy]: 'admin',
          [params.userId]: 'admin'
        };
        collaborators = {
          ...(parentData.collaborators || {}),
          ...collaborators
        };
      }
    } catch (err) {
      console.warn('[createWorkspaceDocument] Could not inherit parent permissions:', err);
    }
  }

  const newDoc: Omit<WorkspaceDocument, 'createdAt' | 'updatedAt'> = {
    id: ref.id,
    orgId: params.orgId,
    parentId: params.parentId ?? null,
    parentDatabaseRowId: params.parentDatabaseRowId ?? null,
    title: params.title || 'Untitled Canvas',
    icon: params.icon || 'FileText',
    coverUrl: params.coverUrl ?? null,
    contentJson: params.contentJson || JSON.stringify({ type: 'doc', content: [] }),
    contentHtml: params.contentHtml || '',
    createdBy: params.userId,
    creatorName: params.userName,
    lastEditedBy: params.userId,
    lastEditedByName: params.userName,
    isArchived: false,
    isFavorite: false,
    orderIndex: params.orderIndex ?? Date.now(),
    visibility,
    allowedUserIds,
    permissions,
    collaborators,
    inheritPermissions: shouldInherit,
    fullWidth: true,
    smallText: false,
    showToc: true,
    status: 'draft',
    tags: [],
    linkedIssueIds: [],
    linkedCycleId: null,
    linkedProjectId: null,
    customProperties: []
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
  patch: Partial<
    Pick<
      WorkspaceDocument,
      | 'title'
      | 'icon'
      | 'coverUrl'
      | 'parentId'
      | 'parentDatabaseRowId'
      | 'isArchived'
      | 'isFavorite'
      | 'status'
      | 'orderIndex'
      | 'tags'
      | 'linkedIssueIds'
      | 'linkedCycleId'
      | 'linkedProjectId'
      | 'visibility'
      | 'allowedUserIds'
      | 'permissions'
      | 'collaborators'
      | 'inheritPermissions'
      | 'fullWidth'
      | 'smallText'
      | 'showToc'
      | 'customProperties'
    >
  >,
  userId?: string,
  userName?: string
): Promise<void> {
  const ref = doc(db, COLLECTION, docId);
  const cleanedPatch: Record<string, any> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) {
      cleanedPatch[k] = v;
    }
  }
  const updates: Record<string, any> = {
    ...cleanedPatch,
    updatedAt: serverTimestamp()
  };

  if (userId) updates.lastEditedBy = userId;
  if (userName) updates.lastEditedByName = userName;

  await updateDoc(ref, updates);
}

/**
 * Adds or updates a collaborator's access level ('admin' | 'edit' | 'view') on a canvas,
 * and optionally cascades the updated access control list to child sub-canvases.
 */
export async function upsertCanvasCollaborator(params: {
  docId: string;
  orgId: string;
  collaborator: CanvasCollaborator;
  cascadeToChildren?: boolean;
}): Promise<void> {
  const docRef = doc(db, COLLECTION, params.docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;

  const data = snap.data() as WorkspaceDocument;
  const creatorId = data.createdBy;
  const currentAllowed = new Set<string>([creatorId, ...(data.allowedUserIds || [])]);
  currentAllowed.add(params.collaborator.uid);

  const nextAllowedUserIds = Array.from(currentAllowed).filter(Boolean);
  const nextPermissions: Record<string, CanvasAccessRole> = {
    ...(data.permissions || {}),
    [creatorId]: 'admin',
    [params.collaborator.uid]: params.collaborator.role
  };
  const sanitizedCollaborator: CanvasCollaborator = {
    uid: params.collaborator.uid,
    name: params.collaborator.name || 'Member',
    email: params.collaborator.email || '',
    username: params.collaborator.username || '',
    avatarUrl: params.collaborator.avatarUrl || '',
    role: params.collaborator.role || 'edit',
    addedAt: params.collaborator.addedAt || Date.now()
  };
  const existingCollabMap =
    data.collaborators && !Array.isArray(data.collaborators) && typeof data.collaborators === 'object'
      ? data.collaborators
      : {};
  const nextCollaborators: Record<string, CanvasCollaborator> = {
    ...existingCollabMap,
    [params.collaborator.uid]: sanitizedCollaborator
  };

  const nextVisibility: CanvasVisibility =
    data.visibility === 'workspace'
      ? 'workspace'
      : nextAllowedUserIds.length > 1
        ? 'shared'
        : 'private';

  await updateDoc(docRef, {
    visibility: nextVisibility,
    allowedUserIds: nextAllowedUserIds,
    permissions: nextPermissions,
    collaborators: nextCollaborators,
    updatedAt: serverTimestamp()
  });

  if (params.cascadeToChildren !== false) {
    await cascadePermissionsToDescendants(params.orgId, params.docId, {
      visibility: nextVisibility,
      allowedUserIds: nextAllowedUserIds,
      permissions: nextPermissions,
      collaborators: nextCollaborators
    });
  }
}

/**
 * Removes a collaborator from a canvas (cannot remove the original creator).
 */
export async function removeCanvasCollaborator(params: {
  docId: string;
  orgId: string;
  targetUid: string;
  cascadeToChildren?: boolean;
}): Promise<void> {
  const docRef = doc(db, COLLECTION, params.docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;

  const data = snap.data() as WorkspaceDocument;
  const creatorId = data.createdBy;
  if (params.targetUid === creatorId) return; // Creator always retains access

  const nextAllowedUserIds = (data.allowedUserIds || [creatorId]).filter(
    (uid) => uid !== params.targetUid
  );
  if (!nextAllowedUserIds.includes(creatorId)) {
    nextAllowedUserIds.push(creatorId);
  }

  const nextPermissions: Record<string, CanvasAccessRole> = { ...(data.permissions || {}) };
  delete nextPermissions[params.targetUid];
  nextPermissions[creatorId] = 'admin';

  const nextCollaborators: Record<string, CanvasCollaborator> = { ...(data.collaborators || {}) };
  delete nextCollaborators[params.targetUid];

  const nextVisibility: CanvasVisibility =
    data.visibility === 'workspace'
      ? 'workspace'
      : nextAllowedUserIds.length > 1
        ? 'shared'
        : 'private';

  await updateDoc(docRef, {
    visibility: nextVisibility,
    allowedUserIds: nextAllowedUserIds,
    permissions: nextPermissions,
    collaborators: nextCollaborators,
    updatedAt: serverTimestamp()
  });

  if (params.cascadeToChildren !== false) {
    await cascadePermissionsToDescendants(params.orgId, params.docId, {
      visibility: nextVisibility,
      allowedUserIds: nextAllowedUserIds,
      permissions: nextPermissions,
      collaborators: nextCollaborators
    });
  }
}

/**
 * Sets top-level visibility ('private' | 'shared' | 'workspace') on a canvas.
 */
export async function setCanvasVisibility(params: {
  docId: string;
  orgId: string;
  visibility: CanvasVisibility;
  cascadeToChildren?: boolean;
}): Promise<void> {
  const docRef = doc(db, COLLECTION, params.docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;

  const data = snap.data() as WorkspaceDocument;
  const creatorId = data.createdBy;

  let nextAllowedUserIds = data.allowedUserIds || [creatorId];
  let nextPermissions = data.permissions || { [creatorId]: 'admin' };
  let nextCollaborators = data.collaborators || {};

  if (params.visibility === 'private') {
    nextAllowedUserIds = [creatorId];
    nextPermissions = { [creatorId]: 'admin' };
    const creatorCollab = nextCollaborators[creatorId];
    nextCollaborators = creatorCollab ? { [creatorId]: creatorCollab } : {};
  }

  await updateDoc(docRef, {
    visibility: params.visibility,
    allowedUserIds: nextAllowedUserIds,
    permissions: nextPermissions,
    collaborators: nextCollaborators,
    updatedAt: serverTimestamp()
  });

  if (params.cascadeToChildren !== false) {
    await cascadePermissionsToDescendants(params.orgId, params.docId, {
      visibility: params.visibility,
      allowedUserIds: nextAllowedUserIds,
      permissions: nextPermissions,
      collaborators: nextCollaborators
    });
  }
}

async function cascadePermissionsToDescendants(
  orgId: string,
  rootDocId: string,
  acl: {
    visibility: CanvasVisibility;
    allowedUserIds: string[];
    permissions: Record<string, CanvasAccessRole>;
    collaborators: Record<string, CanvasCollaborator>;
  }
): Promise<void> {
  try {
    const q = query(collection(db, COLLECTION), where('orgId', '==', orgId));
    const snap = await getDocs(q);
    const allDocs = snap.docs.map((d) => d.data() as WorkspaceDocument);

    // Find all descendants that inherit permissions
    const parentToChildren = new Map<string, WorkspaceDocument[]>();
    for (const d of allDocs) {
      if (d.parentId) {
        const list = parentToChildren.get(d.parentId) || [];
        list.push(d);
        parentToChildren.set(d.parentId, list);
      }
    }

    const toUpdate: WorkspaceDocument[] = [];
    const queue = [...(parentToChildren.get(rootDocId) || [])];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.inheritPermissions !== false) {
        toUpdate.push(curr);
        const kids = parentToChildren.get(curr.id) || [];
        queue.push(...kids);
      }
    }

    if (toUpdate.length === 0) return;
    const batch = writeBatch(db);
    for (const child of toUpdate) {
      const mergedAllowed = Array.from(new Set([child.createdBy, ...acl.allowedUserIds]));
      batch.update(doc(db, COLLECTION, child.id), {
        visibility: acl.visibility,
        allowedUserIds: mergedAllowed,
        permissions: { ...acl.permissions, [child.createdBy]: 'admin' },
        collaborators: acl.collaborators,
        updatedAt: serverTimestamp()
      });
    }
    await batch.commit();
  } catch (err) {
    console.warn('[cascadePermissionsToDescendants] Warning:', err);
  }
}

export async function deleteWorkspaceDocument(docId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, docId));
}

export function listenToWorkspaceDocuments(
  orgId: string,
  cb: (docs: WorkspaceDocument[]) => void,
  userId?: string
): () => void {
  const q = query(collection(db, COLLECTION), where('orgId', '==', orgId));

  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs
        .map((d) => {
          const data = d.data();
          return { ...data, id: data.id || d.id } as WorkspaceDocument;
        })
        .filter((d) => !d.isArchived && canUserAccessDocument(d, userId))
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
  } catch {
    // Ignore cleanup error
  }
}

export function listenToWorkspaceDocumentPresence(
  docId: string,
  cb: (presenceList: WorkspaceDocumentPresence[]) => void
): () => void {
  const q = query(collection(db, PRESENCE_COLLECTION), where('docId', '==', docId));

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
