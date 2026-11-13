import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Layers,
  Folder,
  BookOpen,
  Table as TableIcon,
  CheckSquare,
  Target,
  Milestone,
  Plus,
  Search,
  SidebarClose,
  SidebarOpen,
  Star,
  Trash2,
  Image as ImageIcon,
  Check,
  Loader2,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Maximize2,
  Minimize2,
  Download,
  Share2,
  Printer,
  Copy,
  Sparkles,
  Code,
  Zap,
  Database,
  Compass,
  ShieldCheck,
  Cpu,
  Bookmark,
  MoreHorizontal,
  Lock,
  Users,
  Globe,
  PanelRightOpen,
  PanelRightClose,
  ArrowUpRight,
  ListTree,
  Tag,
  X,
  Briefcase,
  RefreshCw,
  Link2,
  Eye,
  LayoutGrid,
  Columns2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@guild/utils';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspaceData } from '../../context/WorkspaceDataContext';
import { useWorkspaceCycles } from '../../hooks/useWorkspaceCycles';
import {
  useWorkspaceDocuments,
  useWorkspaceDocument,
  useWorkspaceDocumentPresence,
  type WorkspaceDocumentTreeNode
} from '../../hooks/useWorkspaceDocuments';
import { CanvasBlockEditor } from '../../components/canvas/CanvasBlockEditor';
import {
  CanvasEditorProvider,
  type CanvasHeadingItem
} from '../../components/canvas/CanvasEditorContext';
import { CanvasAccessModal } from '../../components/canvas/CanvasAccessModal';
import {
  CANVAS_TEMPLATES,
  type CanvasTemplatePreset
} from '../../components/canvas/CanvasTemplatesPool';
import { TasksFeedPage } from '../tasks/TasksFeedPage';
import type { WorkspaceDocument, DocumentStatus } from '@guild/types';

const COVER_PRESETS = [
  { id: 'indigo', name: 'Indigo Horizon', bg: 'bg-gradient-to-r from-indigo-950 via-indigo-600 to-blue-500' },
  { id: 'sunset', name: 'Sunset Aura', bg: 'bg-gradient-to-r from-orange-600 via-rose-600 to-purple-700' },
  { id: 'emerald', name: 'Nordic Emerald', bg: 'bg-gradient-to-r from-teal-900 via-emerald-600 to-cyan-600' },
  { id: 'obsidian', name: 'Obsidian Glass', bg: 'bg-gradient-to-r from-slate-950 via-purple-950 to-indigo-950' },
  { id: 'mesh', name: 'Liquid Mesh', bg: 'bg-gradient-to-tr from-violet-600 via-indigo-500 to-pink-500' },
  { id: 'aurora', name: 'Aurora Sky', bg: 'bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-700' },
  { id: 'cosmic', name: 'Cosmic Violet', bg: 'bg-gradient-to-r from-fuchsia-900 via-purple-700 to-pink-600' },
  { id: 'slate', name: 'Minimal Slate', bg: 'bg-gradient-to-r from-slate-800 via-zinc-700 to-neutral-800' }
];

const LUCIDE_ICONS = [
  { key: 'FileText', label: 'Document', icon: FileText },
  { key: 'Layers', label: 'Canvas', icon: Layers },
  { key: 'Folder', label: 'Folder', icon: Folder },
  { key: 'BookOpen', label: 'Guide', icon: BookOpen },
  { key: 'Table', label: 'Database', icon: TableIcon },
  { key: 'CheckSquare', label: 'Tasks', icon: CheckSquare },
  { key: 'Target', label: 'Sprint', icon: Target },
  { key: 'Milestone', label: 'Milestone', icon: Milestone },
  { key: 'Sparkles', label: 'Magic', icon: Sparkles },
  { key: 'Code', label: 'Code', icon: Code },
  { key: 'Zap', label: 'Action', icon: Zap },
  { key: 'Database', label: 'Data', icon: Database },
  { key: 'Compass', label: 'Roadmap', icon: Compass },
  { key: 'ShieldCheck', label: 'Security', icon: ShieldCheck },
  { key: 'Cpu', label: 'System', icon: Cpu },
  { key: 'Bookmark', label: 'Reference', icon: Bookmark }
] as const;

const EMOJI_ICONS = ['💡', '🚀', '⚡', '🎯', '✨', '🔥', '📊', '🛠️', '📝', '📋', '💎', '🌟'];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Layers,
  Folder,
  BookOpen,
  Table: TableIcon,
  CheckSquare,
  Target,
  Milestone,
  Sparkles,
  Code,
  Zap,
  Database,
  Compass,
  ShieldCheck,
  Cpu,
  Bookmark
};

function DocumentIcon({ icon, className = 'w-4 h-4' }: { icon?: string; className?: string }) {
  if (icon && ICON_MAP[icon]) {
    const Comp = ICON_MAP[icon];
    return <Comp className={className} />;
  }
  if (icon && icon.length <= 4 && !/^[a-zA-Z]+$/.test(icon)) {
    return <span className="inline-block text-center leading-none text-base">{icon}</span>;
  }
  return <FileText className={className} />;
}

// ─── Recursive Sidebar Tree Item ─────────────────────────────────────────────
interface DocumentTreeItemProps {
  node: WorkspaceDocumentTreeNode;
  depth?: number;
  selectedDocId: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onOpenSidePeek: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onToggleFavorite: (doc: WorkspaceDocument) => void;
  onDelete: (id: string) => void;
}

function DocumentTreeItem({
  node,
  depth = 0,
  selectedDocId,
  expandedIds,
  onToggleExpand,
  onSelect,
  onOpenSidePeek,
  onCreateChild,
  onToggleFavorite,
  onDelete
}: DocumentTreeItemProps) {
  const isSelected = selectedDocId === node.id;
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  return (
    <div className="select-none">
      <div
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: `${Math.min(depth * 12, 48) + 6}px` }}
        className={cn(
          'group relative flex items-center justify-between gap-1 pr-2 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all',
          isSelected
            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
            : 'text-foreground/85 hover:bg-secondary/65 hover:text-foreground'
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            className={cn(
              'w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0',
              hasChildren
                ? isSelected
                  ? 'hover:bg-primary-foreground/20 text-primary-foreground'
                  : 'hover:bg-secondary text-muted-foreground'
                : 'opacity-40 hover:opacity-100'
            )}
            title={hasChildren ? (isExpanded ? 'Collapse sub-canvases' : 'Expand sub-canvases') : 'No sub-canvases yet'}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )
            ) : (
              <span className="w-1 h-1 rounded-full bg-current opacity-50" />
            )}
          </button>

          <DocumentIcon
            icon={node.icon}
            className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-primary-foreground' : 'text-primary')}
          />

          <span className="truncate">{node.title || 'Untitled'}</span>
        </div>

        {/* Hover Actions: Add Sub-Canvas, Side Peek, Favorite, Delete */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCreateChild(node.id);
            }}
            className={cn(
              'p-1 rounded-md transition-colors',
              isSelected ? 'hover:bg-primary-foreground/20 text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            )}
            title="Create Sub-Canvas inside"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSidePeek(node.id);
            }}
            className={cn(
              'p-1 rounded-md transition-colors',
              isSelected ? 'hover:bg-primary-foreground/20 text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            )}
            title="Open in Side Peek"
          >
            <PanelRightOpen className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(node);
            }}
            className={cn(
              'p-1 rounded-md transition-colors',
              node.isFavorite
                ? 'text-amber-400 fill-amber-400'
                : isSelected
                ? 'text-primary-foreground/80 hover:text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Favorite"
          >
            <Star className={cn('w-3 h-3', node.isFavorite && 'fill-current')} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            className={cn(
              'p-1 rounded-md hover:bg-rose-500/20 hover:text-rose-400 transition-colors',
              isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}
            title="Delete Canvas"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Recursive Children */}
      {hasChildren && isExpanded && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <DocumentTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedDocId={selectedDocId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onOpenSidePeek={onOpenSidePeek}
              onCreateChild={onCreateChild}
              onToggleFavorite={onToggleFavorite}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Notion "Side Peek" Drawer Editor ────────────────────────────────────────
interface SidePeekDrawerProps {
  docId: string;
  documents: WorkspaceDocument[];
  onClose: () => void;
  onExpandFullPage: (docId: string) => void;
  onSelectDoc: (docId: string) => void;
  onCreateSubCanvas: (params?: {
    parentId?: string | null;
    parentDatabaseRowId?: string | null;
    title?: string;
    icon?: string;
    contentJson?: string;
  }) => Promise<string>;
  onUpdateMeta: (docId: string, patch: Partial<WorkspaceDocument>) => Promise<void>;
}

function SidePeekCanvasDrawer({
  docId,
  documents,
  onClose,
  onExpandFullPage,
  onSelectDoc,
  onCreateSubCanvas,
  onUpdateMeta
}: SidePeekDrawerProps) {
  const { document: peekDoc, loading, saveStatus, saveContent, canEdit } = useWorkspaceDocument(docId);
  const [peekTitle, setPeekTitle] = React.useState('');
  const [peekHeadings, setPeekHeadings] = React.useState<CanvasHeadingItem[]>([]);

  React.useEffect(() => {
    if (peekDoc) {
      setPeekTitle(peekDoc.title || 'Untitled Sub-Canvas');
    }
  }, [peekDoc?.id, peekDoc?.title]);

  const parentDoc = React.useMemo(
    () => (peekDoc?.parentId ? documents.find((d) => d.id === peekDoc.parentId) || null : null),
    [peekDoc?.parentId, documents]
  );

  return (
    <motion.aside
      initial={{ x: '100%', opacity: 0.5 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="h-full w-full sm:w-[480px] lg:w-[580px] border-l border-border dark:border-border-strong bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl shadow-2xl flex flex-col shrink-0 z-30"
    >
      {/* Top Bar */}
      <div className="h-12 px-4 border-b border-border/60 flex items-center justify-between gap-2 shrink-0 select-none">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
          <button
            type="button"
            onClick={() => onExpandFullPage(docId)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/70 hover:bg-secondary text-foreground font-semibold transition-colors cursor-pointer shrink-0"
            title="Expand to Full Page"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
            <span>Open Full Page</span>
          </button>

          {parentDoc && (
            <div className="hidden sm:flex items-center gap-1 truncate text-[11px]">
              <span>in</span>
              <button
                type="button"
                onClick={() => onExpandFullPage(parentDoc.id)}
                className="font-semibold text-foreground hover:text-primary truncate max-w-[140px] cursor-pointer"
              >
                {parentDoc.title || 'Parent'}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground">
            {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            title="Close Side Peek"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
        {loading && !peekDoc ? (
          <div className="py-16 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Loading sub-canvas...</span>
          </div>
        ) : !peekDoc ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            Sub-canvas not found or access restricted.
          </div>
        ) : (
          <CanvasEditorProvider
            value={{
              activeDoc: peekDoc,
              documents,
              canEdit,
              headings: peekHeadings,
              onSelectDoc,
              onOpenSidePeek: () => {},
              createSubCanvas: onCreateSubCanvas
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <DocumentIcon icon={peekDoc.icon} className="w-5 h-5 text-primary" />
              </div>
              <input
                type="text"
                value={peekTitle}
                disabled={!canEdit}
                onChange={(e) => {
                  setPeekTitle(e.target.value);
                  onUpdateMeta(peekDoc.id, { title: e.target.value });
                }}
                placeholder="Untitled Sub-Canvas"
                className="w-full text-2xl font-extrabold text-foreground bg-transparent outline-none tracking-tight"
              />
            </div>

            {peekDoc.parentDatabaseRowId && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary">
                <Database className="w-3 h-3" />
                <span>Database Row Page — Add nested notes, sub-pages, or child databases below</span>
              </div>
            )}

            <div className="pt-2">
              <CanvasBlockEditor
                key={peekDoc.id}
                initialContent={peekDoc.contentJson}
                readOnly={!canEdit}
                onHeadingsChange={setPeekHeadings}
                onChange={(json, html) => {
                  saveContent(json, html, peekTitle);
                }}
              />
            </div>
          </CanvasEditorProvider>
        )}
      </div>
    </motion.aside>
  );
}

// ─── Main WorkspaceCanvasPage ────────────────────────────────────────────────
export function WorkspaceCanvasPage() {
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const currentUserId = user?.uid || userProfile?.uid || '';
  const workspaceData = useWorkspaceData();
  const orgMembers = workspaceData?.members || [];
  const orgProjects = workspaceData?.projects || [];
  const { cycles } = useWorkspaceCycles(orgId);

  const [searchParams, setSearchParams] = useSearchParams();

  // Sub-navigation tab state: 'canvas' | 'tasks'
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = React.useState<'canvas' | 'tasks'>(
    tabParam === 'tasks' ? 'tasks' : 'canvas'
  );

  const handleSwitchTab = (tab: 'canvas' | 'tasks') => {
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'tasks') {
      nextParams.set('tab', 'tasks');
    } else {
      nextParams.delete('tab');
    }
    setSearchParams(nextParams, { replace: true });
  };

  React.useEffect(() => {
    if (tabParam === 'tasks' && activeTab !== 'tasks') {
      setActiveTab('tasks');
    } else if (!tabParam && activeTab !== 'canvas') {
      setActiveTab('canvas');
    }
  }, [tabParam]);

  // Document list, trees & access-scoped operations
  const {
    documents,
    favorites,
    privateTree,
    sharedTree,
    workspaceTree,
    loading: docsLoading,
    createDocument,
    updateMeta,
    deleteDocument,
    upsertCollaborator,
    removeCollaborator,
    setVisibility,
    getBreadcrumbs,
    getChildDocuments,
    getBacklinks
  } = useWorkspaceDocuments(orgId);

  // Selected doc selection
  const paramDocId = searchParams.get('docId');
  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(paramDocId);

  // Auto-select first accessible root document when loaded if none selected
  React.useEffect(() => {
    if (!selectedDocId && documents.length > 0) {
      const firstRoot = documents.find((d) => !d.parentId) || documents[0];
      setSelectedDocId(firstRoot.id);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('docId', firstRoot.id);
      setSearchParams(nextParams, { replace: true });
    }
  }, [selectedDocId, documents, searchParams, setSearchParams]);

  React.useEffect(() => {
    if (paramDocId && paramDocId !== selectedDocId) {
      setSelectedDocId(paramDocId);
    }
  }, [paramDocId]);

  // Current Active Document Hook
  const {
    document: activeDoc,
    loading: docLoading,
    saveStatus,
    saveContent,
    canEdit,
    canManageAccess
  } = useWorkspaceDocument(selectedDocId || undefined);

  // Live Canvas Presence
  const { presenceList } = useWorkspaceDocumentPresence(selectedDocId || undefined);

  // Rail, Tree, Modals & Side Peek State
  const [railCollapsed, setRailCollapsed] = React.useState(false);
  const [docSearch, setDocSearch] = React.useState('');
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [sidePeekDocId, setSidePeekDocId] = React.useState<string | null>(null);
  const [showAccessModal, setShowAccessModal] = React.useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = React.useState(false);
  const [showIconPicker, setShowIconPicker] = React.useState(false);
  const [showCoverPicker, setShowCoverPicker] = React.useState(false);
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);
  const [showBacklinksMenu, setShowBacklinksMenu] = React.useState(false);
  const [newTagInput, setNewTagInput] = React.useState('');
  const [showTagInput, setShowTagInput] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [headings, setHeadings] = React.useState<CanvasHeadingItem[]>([]);

  // Full-Width Fluid Canvas by DEFAULT (fixes wasted left/right whitespace)
  const [isFullWidth, setIsFullWidth] = React.useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('guild_canvas_fullwidth');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [smallText, setSmallText] = React.useState<boolean>(false);
  const [showRightToc, setShowRightToc] = React.useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('guild_canvas_show_toc');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  // Sync per-document display preferences if present
  React.useEffect(() => {
    if (activeDoc) {
      if (typeof activeDoc.smallText === 'boolean') setSmallText(activeDoc.smallText);
    }
  }, [activeDoc?.id]);

  const toggleFullWidth = () => {
    const next = !isFullWidth;
    setIsFullWidth(next);
    try {
      localStorage.setItem('guild_canvas_fullwidth', String(next));
    } catch {
      // Safe catch
    }
    if (activeDoc && canEdit) {
      updateMeta(activeDoc.id, { fullWidth: next });
    }
  };

  const toggleSmallText = () => {
    const next = !smallText;
    setSmallText(next);
    if (activeDoc && canEdit) {
      updateMeta(activeDoc.id, { smallText: next });
    }
  };

  const toggleRightToc = () => {
    const next = !showRightToc;
    setShowRightToc(next);
    try {
      localStorage.setItem('guild_canvas_show_toc', String(next));
    } catch {
      // Safe catch
    }
  };

  // Auto-expand ancestors of selectedDocId in sidebar tree
  React.useEffect(() => {
    if (!selectedDocId) return;
    const crumbs = getBreadcrumbs(selectedDocId);
    if (crumbs.length > 1) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        crumbs.forEach((c) => next.add(c.id));
        return next;
      });
    }
  }, [selectedDocId, getBreadcrumbs]);

  const handleToggleExpand = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Title local edit state
  const [localTitle, setLocalTitle] = React.useState('');

  React.useEffect(() => {
    if (activeDoc) {
      setLocalTitle(activeDoc.title || 'Untitled Canvas');
    }
  }, [activeDoc?.id, activeDoc?.title]);

  // Keyboard shortcut toggle for Document Rail: Cmd+\ or Ctrl+\
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setRailCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSelectDoc = React.useCallback(
    (docId: string) => {
      setSelectedDocId(docId);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('docId', docId);
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleCreateNewCanvas = async (parentId?: string | null) => {
    try {
      const newId = await createDocument({
        title: parentId ? 'Untitled Sub-Canvas' : 'Untitled Canvas',
        icon: parentId ? 'Layers' : 'FileText',
        parentId: parentId || null,
        visibility: 'private'
      });
      if (parentId) {
        setExpandedIds((prev) => new Set(prev).add(parentId));
      }
      handleSelectDoc(newId);
      showToast(parentId ? 'Sub-canvas created (inherits access)' : 'Private canvas created');
    } catch (err) {
      console.error('Failed to create canvas document:', err);
    }
  };

  const handleCreateSubCanvasFromBlock = React.useCallback(
    async (params?: {
      parentId?: string | null;
      parentDatabaseRowId?: string | null;
      title?: string;
      icon?: string;
      contentJson?: string;
    }) => {
      const targetParent = params?.parentId !== undefined ? params.parentId : activeDoc?.id || null;
      const newId = await createDocument({
        title: params?.title || 'Untitled Sub-Canvas',
        icon: params?.icon || 'Layers',
        parentId: targetParent,
        parentDatabaseRowId: params?.parentDatabaseRowId || null,
        contentJson: params?.contentJson
      });
      if (targetParent) {
        setExpandedIds((prev) => new Set(prev).add(targetParent));
      }
      return newId;
    },
    [activeDoc?.id, createDocument]
  );

  const handleApplyTemplate = (tpl: CanvasTemplatePreset) => {
    if (!activeDoc || !canEdit) return;
    setLocalTitle(tpl.title);
    updateMeta(activeDoc.id, {
      title: tpl.title,
      icon: tpl.icon,
      coverUrl: tpl.coverUrl,
      tags: tpl.tags
    });
    saveContent(tpl.contentJson, '', tpl.title);
    setShowTemplatesModal(false);
    showToast(`Applied "${tpl.title}" template`);
  };

  const handleDuplicateCanvas = async () => {
    if (!activeDoc) return;
    try {
      const newId = await createDocument({
        title: `${activeDoc.title || 'Untitled'} (Copy)`,
        icon: activeDoc.icon || 'FileText',
        parentId: activeDoc.parentId || null,
        contentJson: activeDoc.contentJson
      });
      handleSelectDoc(newId);
      setShowMoreMenu(false);
      showToast('Canvas duplicated as private copy');
    } catch (err) {
      console.error('Failed to duplicate canvas:', err);
    }
  };

  const handleTitleChange = (val: string) => {
    if (!canEdit) return;
    setLocalTitle(val);
    if (activeDoc) {
      updateMeta(activeDoc.id, { title: val });
    }
  };

  const handleSetIcon = (iconKey: string) => {
    if (!activeDoc || !canEdit) return;
    updateMeta(activeDoc.id, { icon: iconKey });
    setShowIconPicker(false);
  };

  const handleSetCover = (coverClass: string | null) => {
    if (!activeDoc || !canEdit) return;
    updateMeta(activeDoc.id, { coverUrl: coverClass });
    setShowCoverPicker(false);
  };

  const handleToggleFavorite = (doc: WorkspaceDocument = activeDoc!) => {
    if (!doc) return;
    updateMeta(doc.id, { isFavorite: !doc.isFavorite });
  };

  const handleAddTag = () => {
    if (!activeDoc || !canEdit || !newTagInput.trim()) return;
    const tag = newTagInput.trim();
    const existing = activeDoc.tags || [];
    if (!existing.includes(tag)) {
      updateMeta(activeDoc.id, { tags: [...existing, tag] });
    }
    setNewTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeDoc || !canEdit) return;
    const existing = activeDoc.tags || [];
    updateMeta(activeDoc.id, { tags: existing.filter((t) => t !== tagToRemove) });
  };

  // Export handlers
  const handleCopyMarkdown = () => {
    if (!activeDoc) return;
    const textContent = activeDoc.contentHtml
      ? activeDoc.contentHtml.replace(/<[^>]*>/g, ' ')
      : activeDoc.title || '';
    const markdown = `# ${activeDoc.title || 'Untitled'}\n\n${textContent}`;
    navigator.clipboard.writeText(markdown);
    setShowExportMenu(false);
    showToast('Markdown copied to clipboard!');
  };

  const handleDownloadMarkdown = () => {
    if (!activeDoc) return;
    const textContent = activeDoc.contentHtml
      ? activeDoc.contentHtml.replace(/<[^>]*>/g, ' ')
      : activeDoc.title || '';
    const markdown = `# ${activeDoc.title || 'Untitled'}\n\n${textContent}`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(activeDoc.title || 'canvas').toLowerCase().replace(/\s+/g, '-')}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    showToast('Download started');
  };

  const handlePrintPDF = () => {
    setShowExportMenu(false);
    window.print();
  };

  // Ancestor Breadcrumbs, Child Sub-Canvases, Backlinks
  const breadcrumbs = React.useMemo(
    () => (selectedDocId ? getBreadcrumbs(selectedDocId) : []),
    [selectedDocId, getBreadcrumbs]
  );

  const childCanvases = React.useMemo(
    () => (selectedDocId ? getChildDocuments(selectedDocId) : []),
    [selectedDocId, getChildDocuments]
  );

  const backlinks = React.useMemo(
    () => (selectedDocId ? getBacklinks(selectedDocId) : []),
    [selectedDocId, getBacklinks]
  );

  // Word count and reading time calculation
  const stats = React.useMemo(() => {
    if (!activeDoc?.contentHtml) return { words: 0, readingTime: 1 };
    const text = activeDoc.contentHtml.replace(/<[^>]*>/g, ' ').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return { words, readingTime };
  }, [activeDoc?.contentHtml]);

  // Filtered flat search results when searching sidebar
  const searchResults = React.useMemo(() => {
    if (!docSearch.trim()) return [];
    const q = docSearch.toLowerCase();
    return documents.filter((d) => d.title.toLowerCase().includes(q));
  }, [documents, docSearch]);

  const activeVisibility = activeDoc?.visibility || 'private';
  const collaboratorCount = (activeDoc?.collaborators || []).filter(
    (c) => c.uid !== activeDoc?.createdBy
  ).length;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background select-text">
      {/* ─── Workspace Header Bar (Sub-navigation + Breadcrumbs + Access/Share + Controls) ─── */}
      <header className="h-13 px-4 sm:px-5 border-b border-border/60 bg-surface/85 dark:bg-surface/55 backdrop-blur-2xl flex items-center justify-between gap-3 shrink-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Sub-navigation switcher */}
          <div className="inline-flex items-center p-0.5 rounded-xl bg-secondary/80 dark:bg-secondary/40 border border-border/60 shrink-0">
            <button
              type="button"
              onClick={() => handleSwitchTab('canvas')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer',
                activeTab === 'canvas'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>Canvas</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab('tasks')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer',
                activeTab === 'tasks'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tasks & Requests</span>
            </button>
          </div>

          {activeTab === 'canvas' && railCollapsed && (
            <button
              type="button"
              onClick={() => setRailCollapsed(false)}
              className="p-1.5 rounded-xl border border-border bg-surface/80 hover:bg-secondary text-foreground shadow-xs transition-colors shrink-0 cursor-pointer"
              title="Expand Document Rail (⌘\)"
            >
              <SidebarOpen className="w-4 h-4" />
            </button>
          )}

          {/* Ancestor Breadcrumbs Trail */}
          {activeTab === 'canvas' && activeDoc && (
            <nav
              aria-label="Canvas hierarchy breadcrumbs"
              className="hidden md:flex items-center gap-1 text-xs text-muted-foreground min-w-0 overflow-hidden"
            >
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                    <button
                      type="button"
                      onClick={() => handleSelectDoc(crumb.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg transition-colors truncate max-w-[160px] cursor-pointer',
                        isLast
                          ? 'text-foreground font-semibold bg-secondary/40'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                      )}
                    >
                      <DocumentIcon icon={crumb.icon} className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{crumb.title || 'Untitled'}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Controls: Share/Access Button + Presence + Save Status + Layout Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'canvas' && activeDoc && (
            <>
              {/* Share & Granular Access Control Button */}
              <button
                type="button"
                onClick={() => setShowAccessModal(true)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-xs',
                  activeVisibility === 'private'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15'
                    : activeVisibility === 'shared'
                    ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
                )}
                title="Manage who has access to this canvas"
              >
                {activeVisibility === 'private' ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Private</span>
                  </>
                ) : activeVisibility === 'shared' ? (
                  <>
                    <Users className="w-3.5 h-3.5" />
                    <span>Shared ({1 + collaboratorCount})</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Organization</span>
                  </>
                )}
              </button>

              {/* Live Canvas Presence */}
              {presenceList.length > 0 && (
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface/90 dark:bg-surface/50 border border-border text-xs shadow-xs select-none">
                  <div className="flex items-center -space-x-1.5">
                    {presenceList.slice(0, 4).map((viewer) => (
                      <div
                        key={viewer.userId}
                        title={viewer.userName}
                        className="w-5 h-5 rounded-full border border-surface bg-primary/10 text-primary font-bold text-[9px] flex items-center justify-center overflow-hidden ring-1 ring-border/50"
                      >
                        {viewer.avatarUrl ? (
                          <img src={viewer.avatarUrl} alt={viewer.userName} className="w-full h-full object-cover" />
                        ) : (
                          <span>{(viewer.userName || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              )}

              {/* Auto-save status indicator */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface/80 dark:bg-surface/50 border border-border text-[11px] font-medium text-muted-foreground shadow-xs select-none">
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span>Saving</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Saved</span>
                  </>
                )}
              </div>

              {/* Templates Button */}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setShowTemplatesModal(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-surface/80 hover:bg-secondary text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Apply Starter Template"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden xl:inline">Templates</span>
                </button>
              )}

              {/* Full-Width Toggle */}
              <button
                type="button"
                onClick={toggleFullWidth}
                className={cn(
                  'p-1.5 rounded-xl border transition-colors cursor-pointer',
                  isFullWidth
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-surface/80 hover:bg-secondary text-muted-foreground hover:text-foreground'
                )}
                title={isFullWidth ? 'Full Width Active (Click for Standard Width)' : 'Switch to Full Width'}
              >
                {isFullWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Right TOC Outline Toggle */}
              <button
                type="button"
                onClick={toggleRightToc}
                className={cn(
                  'hidden xl:inline-flex p-1.5 rounded-xl border transition-colors cursor-pointer',
                  showRightToc
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-surface/80 hover:bg-secondary text-muted-foreground hover:text-foreground'
                )}
                title="Toggle Right Outline (Table of Contents)"
              >
                <ListTree className="w-4 h-4" />
              </button>

              {/* Favorite toggle */}
              <button
                type="button"
                onClick={() => handleToggleFavorite(activeDoc)}
                className={cn(
                  'p-1.5 rounded-xl border border-border bg-surface/80 hover:bg-secondary text-muted-foreground transition-colors active:scale-95 cursor-pointer',
                  activeDoc.isFavorite && 'text-amber-500 fill-amber-500 bg-amber-500/10 border-amber-500/30'
                )}
                title={activeDoc.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
              >
                <Star className={cn('w-4 h-4', activeDoc.isFavorite && 'fill-current')} />
              </button>

              {/* More Actions & Display Settings Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-1.5 rounded-xl border border-border bg-surface/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Canvas Display & Export Options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 p-1.5 rounded-2xl bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong shadow-2xl z-40 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 select-none">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Layout & Display
                    </div>
                    <button
                      type="button"
                      onClick={toggleFullWidth}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <span>Full Width Layout</span>
                      <span className={cn('text-[10px] font-bold', isFullWidth ? 'text-primary' : 'text-muted-foreground')}>
                        {isFullWidth ? 'ON' : 'OFF'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleSmallText}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <span>Compact Text Density</span>
                      <span className={cn('text-[10px] font-bold', smallText ? 'text-primary' : 'text-muted-foreground')}>
                        {smallText ? 'ON' : 'OFF'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleRightToc}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <span>Right Outline Rail</span>
                      <span className={cn('text-[10px] font-bold', showRightToc ? 'text-primary' : 'text-muted-foreground')}>
                        {showRightToc ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    <div className="h-px bg-border/60 my-1" />
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Actions & Export
                    </div>
                    <button
                      type="button"
                      onClick={handleDuplicateCanvas}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Duplicate Canvas</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyMarkdown}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Copy Markdown</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadMarkdown}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Download .md</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintPDF}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Print / Export PDF</span>
                    </button>

                    {canManageAccess && (
                      <>
                        <div className="h-px bg-border/60 my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            deleteDocument(activeDoc.id);
                            setSelectedDocId(null);
                            setShowMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Canvas</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong shadow-2xl text-xs font-semibold text-foreground"
          >
            <Check className="w-4 h-4 text-emerald-500" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Share & Access Control Modal ─── */}
      {activeDoc && (
        <CanvasAccessModal
          isOpen={showAccessModal}
          onClose={() => setShowAccessModal(false)}
          document={activeDoc}
          currentUserId={currentUserId}
          canManageAccess={canManageAccess}
          orgMembers={orgMembers}
          childCount={childCanvases.length}
          onUpsertCollaborator={upsertCollaborator}
          onRemoveCollaborator={removeCollaborator}
          onSetVisibility={setVisibility}
        />
      )}

      {/* ─── Starter Templates Modal ─── */}
      <AnimatePresence>
        {showTemplatesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplatesModal(false)}
              className="fixed inset-0 bg-black/45 dark:bg-black/65 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative w-full max-w-xl rounded-3xl bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong shadow-2xl overflow-hidden z-10 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Notion & Linear Canvas Templates
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Populate this canvas with multi-column blocks, databases, and sprint boards in 1 click.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTemplatesModal(false)}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CANVAS_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="group text-left p-4 rounded-2xl border border-border bg-secondary/30 dark:bg-secondary/15 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                        <DocumentIcon icon={tpl.icon} className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {tpl.title}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {tpl.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Main Viewport: Canvas OR Tasks & Requests ─── */}
      {activeTab === 'canvas' ? (
        <div className="flex-1 flex overflow-hidden relative">
          {/* ─── Collapsible Left Hierarchical Document Rail (Cmd+\) ─── */}
          <AnimatePresence initial={false}>
            {!railCollapsed && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 268, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                className="h-full border-r border-border dark:border-border-strong bg-surface/85 dark:bg-surface/55 backdrop-blur-2xl flex flex-col shrink-0 overflow-hidden z-20"
              >
                {/* Rail Header */}
                <div className="p-3 flex items-center justify-between border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                      <FolderOpen className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-foreground tracking-tight">
                      Workspace Pages
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCreateNewCanvas(null)}
                      className="p-1 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      title="New Root Private Canvas"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRailCollapsed(true)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                      title="Collapse Sidebar (⌘\)"
                    >
                      <SidebarClose className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Actions & Filter */}
                <div className="p-2.5 space-y-2 border-b border-border/40">
                  <button
                    type="button"
                    onClick={() => handleCreateNewCanvas(null)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all active:scale-[0.98] shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Private Canvas
                  </button>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter pages & sub-pages..."
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-secondary/60 dark:bg-secondary/30 border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Hierarchical Document Trees (Favorites / Private / Shared / Workspace) */}
                <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
                  {docsLoading ? (
                    <div className="p-4 flex items-center justify-center text-xs text-muted-foreground gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      Loading...
                    </div>
                  ) : docSearch.trim() ? (
                    /* Search Filter Mode */
                    <div>
                      <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Search Matches</span>
                        <span className="font-mono text-[9px] px-1 rounded bg-secondary">
                          {searchResults.length}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => handleSelectDoc(doc.id)}
                            className={cn(
                              'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer',
                              selectedDocId === doc.id
                                ? 'bg-primary text-primary-foreground font-semibold'
                                : 'text-foreground/85 hover:bg-secondary/60'
                            )}
                          >
                            <DocumentIcon
                              icon={doc.icon}
                              className={cn(
                                'w-3.5 h-3.5 shrink-0',
                                selectedDocId === doc.id ? 'text-primary-foreground' : 'text-primary'
                              )}
                            />
                            <span className="truncate flex-1">{doc.title || 'Untitled'}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 1. Favorites Section */}
                      {favorites.length > 0 && (
                        <div>
                          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                              Favorites
                            </span>
                            <span className="font-mono text-[9px] px-1 rounded bg-secondary">
                              {favorites.length}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {favorites.map((doc) => (
                              <button
                                key={`fav-${doc.id}`}
                                type="button"
                                onClick={() => handleSelectDoc(doc.id)}
                                className={cn(
                                  'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer',
                                  selectedDocId === doc.id
                                    ? 'bg-primary/10 text-primary font-bold'
                                    : 'text-foreground/80 hover:bg-secondary/60'
                                )}
                              >
                                <DocumentIcon icon={doc.icon} className="w-3.5 h-3.5 shrink-0 text-primary" />
                                <span className="truncate flex-1">{doc.title || 'Untitled'}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2. Private Canvases Tree (Creator-only by default) */}
                      <div>
                        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-500" />
                            Private
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCreateNewCanvas(null)}
                            className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Add Private Canvas"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        {privateTree.length === 0 ? (
                          <div className="px-2.5 py-2 text-[11px] text-muted-foreground/70">
                            No private canvases yet.
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {privateTree.map((node) => (
                              <DocumentTreeItem
                                key={node.id}
                                node={node}
                                selectedDocId={selectedDocId}
                                expandedIds={expandedIds}
                                onToggleExpand={handleToggleExpand}
                                onSelect={handleSelectDoc}
                                onOpenSidePeek={(id) => setSidePeekDocId(id)}
                                onCreateChild={(parentId) => handleCreateNewCanvas(parentId)}
                                onToggleFavorite={handleToggleFavorite}
                                onDelete={(id) => {
                                  deleteDocument(id);
                                  if (selectedDocId === id) setSelectedDocId(null);
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 3. Shared Canvases Tree (Explicitly shared with selected members) */}
                      {sharedTree.length > 0 && (
                        <div>
                          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-primary" />
                              Shared
                            </span>
                            <span className="font-mono text-[9px] px-1 rounded bg-secondary">
                              {sharedTree.length}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {sharedTree.map((node) => (
                              <DocumentTreeItem
                                key={node.id}
                                node={node}
                                selectedDocId={selectedDocId}
                                expandedIds={expandedIds}
                                onToggleExpand={handleToggleExpand}
                                onSelect={handleSelectDoc}
                                onOpenSidePeek={(id) => setSidePeekDocId(id)}
                                onCreateChild={(parentId) => handleCreateNewCanvas(parentId)}
                                onToggleFavorite={handleToggleFavorite}
                                onDelete={(id) => {
                                  deleteDocument(id);
                                  if (selectedDocId === id) setSelectedDocId(null);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 4. Organization-wide Canvases Tree (if any) */}
                      {workspaceTree.length > 0 && (
                        <div>
                          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-emerald-500" />
                              Organization
                            </span>
                            <span className="font-mono text-[9px] px-1 rounded bg-secondary">
                              {workspaceTree.length}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {workspaceTree.map((node) => (
                              <DocumentTreeItem
                                key={node.id}
                                node={node}
                                selectedDocId={selectedDocId}
                                expandedIds={expandedIds}
                                onToggleExpand={handleToggleExpand}
                                onSelect={handleSelectDoc}
                                onOpenSidePeek={(id) => setSidePeekDocId(id)}
                                onCreateChild={(parentId) => handleCreateNewCanvas(parentId)}
                                onToggleFavorite={handleToggleFavorite}
                                onDelete={(id) => {
                                  deleteDocument(id);
                                  if (selectedDocId === id) setSelectedDocId(null);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Rail Footer */}
                <div className="p-2.5 border-t border-border/40 text-[10px] text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-500" />
                    Private by default
                  </span>
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[9px] font-mono">
                    ⌘\
                  </kbd>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* ─── Fluid Full-Width Document Canvas ─── */}
          <main className="flex-1 h-full overflow-y-auto relative flex flex-col custom-scrollbar">
            {docLoading && !activeDoc ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-sm font-medium">Opening canvas...</span>
              </div>
            ) : !activeDoc ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4 shadow-xl">
                  <Layers className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-foreground tracking-tight mb-2">
                  Private-by-Default Notion & Linear Canvas
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Create private canvases, nest sub-canvases infinitely, build multi-view databases where every row is a page, and invite specific teammates when ready.
                </p>
                <button
                  type="button"
                  onClick={() => handleCreateNewCanvas(null)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-md shadow-primary/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create Private Canvas
                </button>
              </div>
            ) : (
              <CanvasEditorProvider
                value={{
                  activeDoc,
                  documents,
                  canEdit,
                  headings,
                  onSelectDoc: handleSelectDoc,
                  onOpenSidePeek: (id) => setSidePeekDocId(id),
                  createSubCanvas: handleCreateSubCanvasFromBlock
                }}
              >
                <div className="flex-1 flex items-start w-full">
                  {/* Primary Fluid Canvas Container */}
                  <div
                    className={cn(
                      'flex-1 min-w-0 py-6 space-y-5 pb-36 transition-all duration-300',
                      isFullWidth
                        ? 'w-full max-w-none px-5 sm:px-8 lg:px-12'
                        : 'max-w-5xl mx-auto px-5 sm:px-8'
                    )}
                  >
                    {/* Read-Only Notice Banner when user has View-Only permission */}
                    {!canEdit && (
                      <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-600 dark:text-amber-400">
                        <div className="flex items-center gap-2 font-medium">
                          <Eye className="w-4 h-4 shrink-0" />
                          <span>You have view-only access to this canvas.</span>
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider">
                          Read Only
                        </span>
                      </div>
                    )}

                    {/* Optional Slim Cover Banner */}
                    {activeDoc.coverUrl && (
                      <div className="group/cover relative w-full rounded-2xl overflow-hidden transition-all">
                        <div className={cn('w-full h-32 sm:h-40 relative', activeDoc.coverUrl)}>
                          <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-transparent" />
                          {canEdit && (
                            <div className="absolute top-3 right-3 opacity-0 group-hover/cover:opacity-100 flex items-center gap-1.5 transition-opacity">
                              <button
                                type="button"
                                onClick={() => setShowCoverPicker(!showCoverPicker)}
                                className="px-2.5 py-1 rounded-full bg-surface/90 dark:bg-surface/80 backdrop-blur-xl border border-border text-[11px] font-semibold text-foreground shadow-sm hover:bg-secondary cursor-pointer"
                              >
                                Change Cover
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetCover(null)}
                                className="p-1 rounded-full bg-surface/90 dark:bg-surface/80 backdrop-blur-xl border border-border text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                                title="Remove Cover"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cover Picker Popover */}
                    {showCoverPicker && (
                      <div className="relative z-40">
                        <div className="w-80 bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong rounded-2xl shadow-2xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Select Cover Gradient
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowCoverPicker(false)}
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {COVER_PRESETS.map((cov) => (
                              <button
                                key={cov.id}
                                type="button"
                                onClick={() => handleSetCover(cov.bg)}
                                className={cn(
                                  'h-12 rounded-xl relative border border-border/60 overflow-hidden hover:scale-105 active:scale-95 transition-all text-left p-2 flex items-end cursor-pointer',
                                  cov.bg
                                )}
                              >
                                <span className="text-[10px] font-bold text-white drop-shadow-sm">
                                  {cov.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ─── Streamlined Horizontal Icon + Title + Quick Action Strip ─── */}
                    <div className="group/header space-y-2.5">
                      {/* Quick Hover Action Strip */}
                      {canEdit && (
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => handleCreateNewCanvas(activeDoc.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/50 hover:bg-secondary text-foreground/85 hover:text-foreground font-medium transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-primary" />
                            <span>New Sub-Canvas</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowTemplatesModal(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/50 hover:bg-secondary text-foreground/85 hover:text-foreground font-medium transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-primary" />
                            <span>Templates</span>
                          </button>
                          {!activeDoc.coverUrl && (
                            <button
                              type="button"
                              onClick={() => setShowCoverPicker(!showCoverPicker)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>Add Cover</span>
                            </button>
                          )}
                          <span className="text-[10px] text-muted-foreground/60 ml-auto hidden sm:inline font-mono">
                            {stats.words} words · {stats.readingTime} min read
                          </span>
                        </div>
                      )}

                      {/* Inline Icon + Title Row */}
                      <div className="flex items-center gap-3.5 relative">
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => setShowIconPicker(!showIconPicker)}
                            className="w-11 h-11 rounded-2xl bg-surface/90 dark:bg-surface/50 border border-border dark:border-border-strong shadow-xs flex items-center justify-center text-primary hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:cursor-default"
                            title="Change Canvas Icon"
                          >
                            <DocumentIcon icon={activeDoc.icon} className="w-5 h-5 text-primary" />
                          </button>

                          {/* Icon Picker Popover */}
                          {showIconPicker && (
                            <div className="absolute left-0 top-full mt-2 w-72 bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong rounded-2xl shadow-2xl p-3 z-40 space-y-3 select-none">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                  Emoji Presets
                                </span>
                                <div className="grid grid-cols-6 gap-1">
                                  {EMOJI_ICONS.map((em) => (
                                    <button
                                      key={em}
                                      type="button"
                                      onClick={() => handleSetIcon(em)}
                                      className={cn(
                                        'h-8 rounded-lg flex items-center justify-center text-sm border hover:scale-110 active:scale-95 transition-all cursor-pointer',
                                        activeDoc.icon === em
                                          ? 'border-primary bg-primary/10'
                                          : 'border-border/60 hover:bg-secondary'
                                      )}
                                    >
                                      {em}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                  Icons
                                </span>
                                <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto custom-scrollbar">
                                  {LUCIDE_ICONS.map((item) => {
                                    const IconC = item.icon;
                                    const isCurrent = (activeDoc.icon || 'FileText') === item.key;
                                    return (
                                      <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => handleSetIcon(item.key)}
                                        className={cn(
                                          'h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 border transition-all hover:scale-105 active:scale-95 cursor-pointer',
                                          isCurrent
                                            ? 'bg-primary/10 border-primary text-primary font-bold'
                                            : 'border-border/60 hover:bg-secondary text-foreground/80'
                                        )}
                                      >
                                        <IconC className="w-4 h-4" />
                                        <span className="text-[9px] truncate max-w-[50px]">{item.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <input
                          type="text"
                          value={localTitle}
                          disabled={!canEdit}
                          onChange={(e) => handleTitleChange(e.target.value)}
                          placeholder="Untitled Canvas"
                          className="w-full text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground placeholder:text-muted-foreground/30 bg-transparent outline-none tracking-tight transition-colors"
                        />
                      </div>

                      {/* ─── Notion & Linear Properties & Metadata Strip ─── */}
                      <div className="flex items-center gap-2 flex-wrap pt-1 pb-2 border-b border-border/50 text-xs">
                        {/* Status Pill */}
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-secondary/45 dark:bg-secondary/25 border border-border">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Status
                          </span>
                          <select
                            disabled={!canEdit}
                            value={activeDoc.status || 'draft'}
                            onChange={(e) =>
                              updateMeta(activeDoc.id, { status: e.target.value as DocumentStatus })
                            }
                            className="bg-transparent font-semibold text-foreground outline-none cursor-pointer text-xs"
                          >
                            <option value="draft">Draft</option>
                            <option value="review">In Review</option>
                            <option value="published">Published</option>
                          </select>
                        </div>

                        {/* Linked Project Pill */}
                        {orgProjects.length > 0 && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-secondary/45 dark:bg-secondary/25 border border-border">
                            <Briefcase className="w-3 h-3 text-primary" />
                            <select
                              disabled={!canEdit}
                              value={activeDoc.linkedProjectId || ''}
                              onChange={(e) =>
                                updateMeta(activeDoc.id, {
                                  linkedProjectId: e.target.value || null
                                })
                              }
                              className="bg-transparent font-medium text-foreground outline-none cursor-pointer text-xs max-w-[140px] truncate"
                            >
                              <option value="">No Linked Project</option>
                              {orgProjects.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Linked Sprint Cycle Pill */}
                        {cycles.length > 0 && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-secondary/45 dark:bg-secondary/25 border border-border">
                            <RefreshCw className="w-3 h-3 text-emerald-500" />
                            <select
                              disabled={!canEdit}
                              value={activeDoc.linkedCycleId || ''}
                              onChange={(e) =>
                                updateMeta(activeDoc.id, {
                                  linkedCycleId: e.target.value || null
                                })
                              }
                              className="bg-transparent font-medium text-foreground outline-none cursor-pointer text-xs max-w-[140px] truncate"
                            >
                              <option value="">No Sprint Cycle</option>
                              {cycles.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Backlinks Pill */}
                        {backlinks.length > 0 && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowBacklinksMenu(!showBacklinksMenu)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/25 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors cursor-pointer"
                            >
                              <Link2 className="w-3 h-3" />
                              <span>
                                {backlinks.length} Backlink{backlinks.length === 1 ? '' : 's'}
                              </span>
                            </button>
                            {showBacklinksMenu && (
                              <div className="absolute left-0 top-full mt-1.5 w-60 p-2 rounded-2xl bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border shadow-xl z-30 space-y-1">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5">
                                  Referenced By
                                </div>
                                {backlinks.map((bl) => (
                                  <button
                                    key={bl.id}
                                    type="button"
                                    onClick={() => {
                                      setShowBacklinksMenu(false);
                                      handleSelectDoc(bl.id);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary text-left cursor-pointer"
                                  >
                                    <DocumentIcon icon={bl.icon} className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="truncate">{bl.title || 'Untitled'}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tags List */}
                        {(activeDoc.tags || []).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary text-foreground text-[11px] font-medium border border-border"
                          >
                            <Tag className="w-2.5 h-2.5 text-primary" />
                            <span>{tag}</span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="text-muted-foreground hover:text-rose-500 cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </span>
                        ))}

                        {canEdit &&
                          (showTagInput ? (
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="text"
                                autoFocus
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddTag();
                                  if (e.key === 'Escape') setShowTagInput(false);
                                }}
                                placeholder="Tag name..."
                                className="px-2 py-0.5 rounded-lg bg-secondary/70 border border-border text-xs text-foreground outline-none focus:border-primary w-24"
                              />
                              <button
                                type="button"
                                onClick={handleAddTag}
                                className="p-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowTagInput(true)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Tag</span>
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* ─── Child Sub-Canvases Tray (Pages under Pages / Canvas under Canvas) ─── */}
                    {childCanvases.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Layers className="w-3 h-3 text-primary" />
                            Nested Sub-Canvases ({childCanvases.length})
                          </span>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleCreateNewCanvas(activeDoc.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>New Sub-Canvas</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                          {childCanvases.map((child) => (
                            <div
                              key={child.id}
                              onClick={() => handleSelectDoc(child.id)}
                              className="group flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-surface/85 dark:bg-surface/50 border border-border hover:border-primary/40 shadow-2xs hover:shadow-md transition-all cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                                  <DocumentIcon icon={child.icon} className="w-4 h-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                    {child.title || 'Untitled Sub-Canvas'}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    {child.parentDatabaseRowId ? (
                                      <span>Database Row Page</span>
                                    ) : (
                                      <span>Sub-Canvas</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSidePeekDocId(child.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-secondary/80 hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-all cursor-pointer shrink-0"
                                title="Open in Side Peek"
                              >
                                <PanelRightOpen className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ─── TipTap Unified Block Engine ─── */}
                    <div className="pt-1">
                      <CanvasBlockEditor
                        key={activeDoc.id}
                        initialContent={activeDoc.contentJson}
                        readOnly={!canEdit}
                        smallText={smallText}
                        onHeadingsChange={setHeadings}
                        onChange={(json, html) => {
                          saveContent(json, html, localTitle);
                        }}
                      />
                    </div>
                  </div>

                  {/* ─── Right-Hand Docked Table of Contents Outline (Uses Right Margin Productively) ─── */}
                  {showRightToc && !sidePeekDocId && headings.length > 0 && (
                    <aside className="hidden xl:block w-60 shrink-0 sticky top-6 mr-6 p-3.5 rounded-2xl bg-surface/65 dark:bg-surface/40 backdrop-blur-xl border border-border/70 space-y-2.5 select-none">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <ListTree className="w-3.5 h-3.5 text-primary" />
                          On This Canvas
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {headings.length}
                        </span>
                      </div>
                      <nav className="space-y-1 max-h-[65vh] overflow-y-auto custom-scrollbar">
                        {headings.map((h, i) => (
                          <div
                            key={`${h.pos}-${i}`}
                            className={cn(
                              'text-xs text-muted-foreground hover:text-foreground truncate py-0.5 transition-colors',
                              h.level === 1 && 'font-semibold text-foreground',
                              h.level === 2 && 'pl-3',
                              h.level === 3 && 'pl-6 text-[11px]'
                            )}
                            title={h.text}
                          >
                            {h.text}
                          </div>
                        ))}
                      </nav>
                    </aside>
                  )}
                </div>
              </CanvasEditorProvider>
            )}
          </main>

          {/* ─── Notion "Side Peek" Sliding Canvas Drawer ─── */}
          <AnimatePresence>
            {sidePeekDocId && (
              <SidePeekCanvasDrawer
                key={sidePeekDocId}
                docId={sidePeekDocId}
                documents={documents}
                onClose={() => setSidePeekDocId(null)}
                onExpandFullPage={(id) => {
                  setSidePeekDocId(null);
                  handleSelectDoc(id);
                }}
                onSelectDoc={handleSelectDoc}
                onCreateSubCanvas={handleCreateSubCanvasFromBlock}
                onUpdateMeta={updateMeta}
              />
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* ─── Execution Feed View (TasksFeedPage) ─── */
        <div className="flex-1 overflow-y-auto">
          <TasksFeedPage />
        </div>
      )}
    </div>
  );
}

export default WorkspaceCanvasPage;
