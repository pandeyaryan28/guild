import * as React from 'react';
import {
  listenToWorkspaceDocuments,
  listenToWorkspaceDocument,
  createWorkspaceDocument,
  updateWorkspaceDocumentContent,
  updateWorkspaceDocumentMeta,
  deleteWorkspaceDocument,
  reorderWorkspaceDocuments,
  updateWorkspaceDocumentPresence,
  removeWorkspaceDocumentPresence,
  listenToWorkspaceDocumentPresence,
  upsertCanvasCollaborator,
  removeCanvasCollaborator,
  setCanvasVisibility,
  canUserAccessDocument,
  getUserDocumentRole
} from '../lib/workspaceDocuments';
import type {
  WorkspaceDocument,
  WorkspaceDocumentPresence,
  CanvasVisibility,
  CanvasAccessRole,
  CanvasCollaborator
} from '@guild/types';
import { useAuth } from './useAuth';

export interface DocumentTreeNode extends WorkspaceDocument {
  children: DocumentTreeNode[];
}

export function buildDocumentTree(docs: WorkspaceDocument[]): DocumentTreeNode[] {
  const map = new Map<string, DocumentTreeNode>();
  const roots: DocumentTreeNode[] = [];

  // Create node wrappers
  for (const doc of docs) {
    map.set(doc.id, { ...doc, children: [] });
  }

  // Build hierarchy
  for (const doc of docs) {
    const node = map.get(doc.id)!;
    if (doc.parentId && map.has(doc.parentId)) {
      map.get(doc.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort by orderIndex
  const sortNodes = (nodes: DocumentTreeNode[]) => {
    nodes.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortNodes(node.children);
      }
    }
  };

  sortNodes(roots);
  return roots;
}

export function useWorkspaceDocuments(orgId: string | undefined) {
  const { userProfile } = useAuth();
  const userId = userProfile?.uid;
  const [documents, setDocuments] = React.useState<WorkspaceDocument[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!orgId || !userId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenToWorkspaceDocuments(
      orgId,
      (docs) => {
        setDocuments(docs);
        setLoading(false);
      },
      userId
    );

    return () => unsubscribe();
  }, [orgId, userId]);

  const docMap = React.useMemo(() => {
    const m = new Map<string, WorkspaceDocument>();
    for (const d of documents) {
      m.set(d.id, d);
    }
    return m;
  }, [documents]);

  // Full tree
  const tree = React.useMemo(() => buildDocumentTree(documents), [documents]);

  // Helper to get root ancestor of a document to classify it into Private vs Shared vs Workspace
  const getRootDoc = React.useCallback(
    (docItem: WorkspaceDocument): WorkspaceDocument => {
      let curr = docItem;
      const visited = new Set<string>([curr.id]);
      while (curr.parentId && docMap.has(curr.parentId) && !visited.has(curr.parentId)) {
        visited.add(curr.parentId);
        curr = docMap.get(curr.parentId)!;
      }
      return curr;
    },
    [docMap]
  );

  // Partitioned trees (Notion-style Private / Shared / Workspace sections)
  const { privateTree, sharedTree, workspaceTree } = React.useMemo(() => {
    const privDocs: WorkspaceDocument[] = [];
    const sharDocs: WorkspaceDocument[] = [];
    const workDocs: WorkspaceDocument[] = [];

    for (const d of documents) {
      const root = getRootDoc(d);
      const vis = root.visibility || 'private';
      const allowedCount = Array.isArray(root.allowedUserIds) ? root.allowedUserIds.length : 1;
      const isSharedWithOthers = vis === 'shared' || allowedCount > 1 || root.createdBy !== userId;

      if (vis === 'workspace') {
        workDocs.push(d);
      } else if (isSharedWithOthers) {
        sharDocs.push(d);
      } else {
        privDocs.push(d);
      }
    }

    return {
      privateTree: buildDocumentTree(privDocs),
      sharedTree: buildDocumentTree(sharDocs),
      workspaceTree: buildDocumentTree(workDocs)
    };
  }, [documents, getRootDoc, userId]);

  const favorites = React.useMemo(() => documents.filter((d) => d.isFavorite), [documents]);

  // Walk upward `parentId` pointers to build the ordered Breadcrumb trail: [Root, ..., Parent, Current]
  const getBreadcrumbs = React.useCallback(
    (docId: string | null | undefined): WorkspaceDocument[] => {
      if (!docId || !docMap.has(docId)) return [];
      const chain: WorkspaceDocument[] = [];
      let curr: WorkspaceDocument | undefined = docMap.get(docId);
      const visited = new Set<string>();

      while (curr && !visited.has(curr.id)) {
        visited.add(curr.id);
        chain.unshift(curr);
        curr = curr.parentId ? docMap.get(curr.parentId) : undefined;
      }
      return chain;
    },
    [docMap]
  );

  // Direct child canvases of a given document
  const getChildDocuments = React.useCallback(
    (parentId: string | null | undefined): WorkspaceDocument[] => {
      if (!parentId) return [];
      return documents
        .filter((d) => d.parentId === parentId)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    },
    [documents]
  );

  // Backlinks: canvases that either parent this canvas or reference its ID inside their contentJson
  const getBacklinks = React.useCallback(
    (targetDocId: string | null | undefined): WorkspaceDocument[] => {
      if (!targetDocId) return [];
      const targetDoc = docMap.get(targetDocId);
      return documents.filter((d) => {
        if (d.id === targetDocId) return false;
        if (targetDoc?.parentId === d.id) return true;
        if (d.contentJson && d.contentJson.includes(targetDocId)) return true;
        return false;
      });
    },
    [documents, docMap]
  );

  const handleCreateDocument = React.useCallback(
    async (params?: {
      parentId?: string | null;
      parentDatabaseRowId?: string | null;
      title?: string;
      icon?: string;
      contentJson?: string;
      contentHtml?: string;
      visibility?: CanvasVisibility;
    }) => {
      if (!orgId || !userProfile) throw new Error('Not authenticated');
      return await createWorkspaceDocument({
        orgId,
        parentId: params?.parentId ?? null,
        parentDatabaseRowId: params?.parentDatabaseRowId ?? null,
        title: params?.title || 'Untitled Canvas',
        icon: params?.icon || 'FileText',
        contentJson: params?.contentJson,
        contentHtml: params?.contentHtml,
        visibility: params?.visibility,
        userId: userProfile.uid,
        userName: userProfile.fullName || 'Teammate',
        userEmail: userProfile.email || '',
        userAvatar: userProfile.photoURL || ''
      });
    },
    [orgId, userProfile]
  );

  const handleUpdateMeta = React.useCallback(
    async (docId: string, patch: Partial<WorkspaceDocument>) => {
      if (!userProfile) return;
      await updateWorkspaceDocumentMeta(docId, patch, userProfile.uid, userProfile.fullName);
    },
    [userProfile]
  );

  const handleDelete = React.useCallback(async (docId: string) => {
    await deleteWorkspaceDocument(docId);
  }, []);

  const handleReorder = React.useCallback(
    async (items: { id: string; orderIndex: number; parentId: string | null }[]) => {
      if (!orgId) return;
      await reorderWorkspaceDocuments(orgId, items);
    },
    [orgId]
  );

  const handleUpsertCollaborator = React.useCallback(
    async (docId: string, collaborator: CanvasCollaborator, cascadeToChildren = true) => {
      if (!orgId) return;
      await upsertCanvasCollaborator({
        docId,
        orgId,
        collaborator,
        cascadeToChildren
      });
    },
    [orgId]
  );

  const handleRemoveCollaborator = React.useCallback(
    async (docId: string, targetUid: string, cascadeToChildren = true) => {
      if (!orgId) return;
      await removeCanvasCollaborator({
        docId,
        orgId,
        targetUid,
        cascadeToChildren
      });
    },
    [orgId]
  );

  const handleSetVisibility = React.useCallback(
    async (docId: string, visibility: CanvasVisibility, cascadeToChildren = true) => {
      if (!orgId) return;
      await setCanvasVisibility({
        docId,
        orgId,
        visibility,
        cascadeToChildren
      });
    },
    [orgId]
  );

  return {
    documents,
    docMap,
    tree,
    privateTree,
    sharedTree,
    workspaceTree,
    favorites,
    loading,
    getBreadcrumbs,
    getChildDocuments,
    getBacklinks,
    createDocument: handleCreateDocument,
    updateMeta: handleUpdateMeta,
    deleteDocument: handleDelete,
    reorderDocuments: handleReorder,
    upsertCollaborator: handleUpsertCollaborator,
    removeCollaborator: handleRemoveCollaborator,
    setVisibility: handleSetVisibility
  };
}

export function useWorkspaceDocument(docId: string | undefined) {
  const { userProfile } = useAuth();
  const [document, setDocument] = React.useState<WorkspaceDocument | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saveStatus, setSaveStatus] = React.useState<'saved' | 'saving' | 'unsaved'>('saved');
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (!docId) {
      setDocument(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenToWorkspaceDocument(docId, (doc) => {
      if (doc && canUserAccessDocument(doc, userProfile?.uid)) {
        setDocument(doc);
      } else {
        setDocument(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [docId, userProfile?.uid]);

  const accessRole: CanvasAccessRole = React.useMemo(
    () => getUserDocumentRole(document, userProfile?.uid),
    [document, userProfile?.uid]
  );

  const canEdit = accessRole === 'admin' || accessRole === 'edit';
  const canManageAccess = accessRole === 'admin';

  // Debounced content auto-save
  const saveContent = React.useCallback(
    (contentJson: string, contentHtml?: string, title?: string) => {
      if (!docId || !userProfile || !canEdit) return;
      setSaveStatus('saving');

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(async () => {
        try {
          await updateWorkspaceDocumentContent({
            docId,
            contentJson,
            contentHtml,
            title,
            userId: userProfile.uid,
            userName: userProfile.fullName || 'Teammate'
          });
          setSaveStatus('saved');
        } catch (err) {
          console.error('[useWorkspaceDocument] Failed to auto-save:', err);
          setSaveStatus('unsaved');
        }
      }, 1500);
    },
    [docId, userProfile, canEdit]
  );

  return {
    document,
    loading,
    saveStatus,
    saveContent,
    accessRole,
    canEdit,
    canManageAccess
  };
}

export function useWorkspaceDocumentPresence(docId: string | undefined) {
  const { userProfile } = useAuth();
  const [presenceList, setPresenceList] = React.useState<WorkspaceDocumentPresence[]>([]);

  // 15-second heartbeat
  React.useEffect(() => {
    if (!docId || !userProfile) return;

    const sendHeartbeat = () => {
      updateWorkspaceDocumentPresence({
        docId,
        userId: userProfile.uid,
        userName: userProfile.fullName || 'Teammate',
        avatarUrl: userProfile.photoURL || null
      }).catch((err) => {
        console.warn('[useWorkspaceDocumentPresence] heartbeat failed:', err);
      });
    };

    // Send immediate heartbeat on mount or doc change
    sendHeartbeat();

    // Heartbeat every 15 seconds
    const interval = setInterval(sendHeartbeat, 15000);

    return () => {
      clearInterval(interval);
      removeWorkspaceDocumentPresence(docId, userProfile.uid).catch(() => {});
    };
  }, [docId, userProfile]);

  // Real-time listener for active document viewers
  React.useEffect(() => {
    if (!docId) {
      setPresenceList([]);
      return;
    }

    const unsubscribe = listenToWorkspaceDocumentPresence(docId, (list) => {
      setPresenceList(list);
    });

    return () => unsubscribe();
  }, [docId]);

  return { presenceList };
}
