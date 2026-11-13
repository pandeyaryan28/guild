import * as React from 'react';
import type { WorkspaceDocument } from '@guild/types';

export interface HeadingItem {
  id: string;
  text: string;
  level: 1 | 2 | 3;
  pos: number;
}

export type CanvasHeadingItem = HeadingItem;

export interface CanvasEditorContextValue {
  activeDoc: WorkspaceDocument | null;
  documents: WorkspaceDocument[];
  canEdit: boolean;
  headings: HeadingItem[];
  onSelectDoc: (docId: string) => void;
  onOpenSidePeek?: (docId: string) => void;
  createSubCanvas: (params?: {
    parentId?: string | null;
    title?: string;
    icon?: string;
    parentDatabaseRowId?: string | null;
    contentJson?: string;
  }) => Promise<string>;
  scrollToPos?: (pos: number) => void;
}

export const CanvasEditorContext = React.createContext<CanvasEditorContextValue>({
  activeDoc: null,
  documents: [],
  canEdit: true,
  headings: [],
  onSelectDoc: () => {},
  onOpenSidePeek: undefined,
  createSubCanvas: async () => '',
  scrollToPos: undefined
});

export const CanvasEditorProvider = CanvasEditorContext.Provider;

export function useCanvasEditorContext() {
  return React.useContext(CanvasEditorContext);
}
