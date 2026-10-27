import * as React from 'react';
import {
  listenToWorkspaceDocuments,
  listenToWorkspaceDocument,
  createWorkspaceDocument,
  updateWorkspaceDocumentContent,
  updateWorkspaceDocumentMeta,
  deleteWorkspaceDocument,
  reorderWorkspaceDocuments
} from '../lib/workspaceDocuments';
import type { WorkspaceDocument } from '@guild/types';
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
  const [documents, setDocuments] = React.useState<WorkspaceDocument[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!orgId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenToWorkspaceDocuments(orgId, (docs) => {
      setDocuments(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgId]);

  const tree = React.useMemo(() => buildDocumentTree(documents), [documents]);
  const favorites = React.useMemo(() => documents.filter((d) => d.isFavorite), [documents]);

  const handleCreateDocument = React.useCallback(
    async (params?: { parentId?: string | null; title?: string; icon?: string }) => {
      if (!orgId || !userProfile) throw new Error('Not authenticated');
      return await createWorkspaceDocument({
        orgId,
        parentId: params?.parentId ?? null,
        title: params?.title || 'Untitled Document',
        icon: params?.icon || '📄',
        userId: userProfile.uid,
        userName: userProfile.fullName || 'Teammate'
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

  return {
    documents,
    tree,
    favorites,
    loading,
    createDocument: handleCreateDocument,
    updateMeta: handleUpdateMeta,
    deleteDocument: handleDelete,
    reorderDocuments: handleReorder
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
      setDocument(doc);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [docId]);

  // Debounced content auto-save
  const saveContent = React.useCallback(
    (contentJson: string, contentHtml?: string, title?: string) => {
      if (!docId || !userProfile) return;
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
      }, 500);
    },
    [docId, userProfile]
  );

  return {
    document,
    loading,
    saveStatus,
    saveContent
  };
}
