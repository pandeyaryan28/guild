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
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@guild/utils';
import { useAuth } from '../../hooks/useAuth';
import {
  useWorkspaceDocuments,
  useWorkspaceDocument,
  useWorkspaceDocumentPresence
} from '../../hooks/useWorkspaceDocuments';
import { CanvasBlockEditor } from '../../components/canvas/CanvasBlockEditor';
import { TasksFeedPage } from '../tasks/TasksFeedPage';
import type { WorkspaceDocument } from '@guild/types';

const COVER_PRESETS = [
  { id: 'indigo', name: 'Indigo Horizon', bg: 'bg-gradient-to-r from-indigo-950 via-indigo-600 to-blue-500' },
  { id: 'sunset', name: 'Sunset Aura', bg: 'bg-gradient-to-r from-orange-600 via-rose-600 to-purple-700' },
  { id: 'emerald', name: 'Nordic Emerald', bg: 'bg-gradient-to-r from-teal-900 via-emerald-600 to-cyan-600' },
  { id: 'obsidian', name: 'Obsidian Glass', bg: 'bg-gradient-to-r from-slate-950 via-purple-950 to-indigo-950' },
  { id: 'mesh', name: 'Liquid Mesh', bg: 'bg-gradient-to-tr from-violet-600 via-indigo-500 to-pink-500' }
];

const ICON_OPTIONS = [
  { key: 'FileText', label: 'Document', icon: FileText },
  { key: 'Layers', label: 'Canvas', icon: Layers },
  { key: 'Folder', label: 'Folder', icon: Folder },
  { key: 'BookOpen', label: 'Guide', icon: BookOpen },
  { key: 'Table', label: 'Database', icon: TableIcon },
  { key: 'CheckSquare', label: 'Tasks', icon: CheckSquare },
  { key: 'Target', label: 'Sprint', icon: Target },
  { key: 'Milestone', label: 'Milestone', icon: Milestone }
] as const;

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Layers,
  Folder,
  BookOpen,
  Table: TableIcon,
  CheckSquare,
  Target,
  Milestone
};

function DocumentIcon({ icon, className = 'w-4 h-4' }: { icon?: string; className?: string }) {
  if (icon && ICON_MAP[icon]) {
    const Comp = ICON_MAP[icon];
    return <Comp className={className} />;
  }
  // If it's a legacy emoji, display it; otherwise fallback to FileText
  if (icon && icon.length <= 4 && !/^[a-zA-Z]+$/.test(icon)) {
    return <span className="inline-block text-center leading-none text-sm">{icon}</span>;
  }
  return <FileText className={className} />;
}

export function WorkspaceCanvasPage() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
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

  // Sync tab with search param if changed externally
  React.useEffect(() => {
    if (tabParam === 'tasks' && activeTab !== 'tasks') {
      setActiveTab('tasks');
    } else if (!tabParam && activeTab !== 'canvas') {
      setActiveTab('canvas');
    }
  }, [tabParam]);

  // Document list & operations
  const {
    documents,
    favorites,
    loading: docsLoading,
    createDocument,
    updateMeta,
    deleteDocument
  } = useWorkspaceDocuments(orgId);

  // Selected doc selection
  const paramDocId = searchParams.get('docId');
  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(paramDocId);

  // Auto-select first document when loaded if none selected
  React.useEffect(() => {
    if (!selectedDocId && documents.length > 0) {
      const firstId = documents[0].id;
      setSelectedDocId(firstId);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('docId', firstId);
      setSearchParams(nextParams, { replace: true });
    }
  }, [selectedDocId, documents, searchParams, setSearchParams]);

  // Sync selection if search param changes
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
    saveContent
  } = useWorkspaceDocument(selectedDocId || undefined);

  // Live Canvas Presence (heartbeat + viewers)
  const { presenceList } = useWorkspaceDocumentPresence(selectedDocId || undefined);

  // Rail & UI State
  const [railCollapsed, setRailCollapsed] = React.useState(false);
  const [docSearch, setDocSearch] = React.useState('');
  const [showIconPicker, setShowIconPicker] = React.useState(false);
  const [showCoverPicker, setShowCoverPicker] = React.useState(false);

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

  const handleSelectDoc = (docId: string) => {
    setSelectedDocId(docId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('docId', docId);
    setSearchParams(nextParams, { replace: true });
  };

  const handleCreateNewCanvas = async () => {
    try {
      const newId = await createDocument({
        title: 'Untitled Canvas',
        icon: 'FileText'
      });
      setSelectedDocId(newId);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('docId', newId);
      setSearchParams(nextParams);
    } catch (err) {
      console.error('Failed to create canvas document:', err);
    }
  };

  const handleTitleChange = (val: string) => {
    setLocalTitle(val);
    if (activeDoc) {
      updateMeta(activeDoc.id, { title: val });
    }
  };

  const handleSetIcon = (iconKey: string) => {
    if (!activeDoc) return;
    updateMeta(activeDoc.id, { icon: iconKey });
    setShowIconPicker(false);
  };

  const handleSetCover = (coverClass: string | null) => {
    if (!activeDoc) return;
    updateMeta(activeDoc.id, { coverUrl: coverClass });
    setShowCoverPicker(false);
  };

  const handleToggleFavorite = () => {
    if (!activeDoc) return;
    updateMeta(activeDoc.id, { isFavorite: !activeDoc.isFavorite });
  };

  // Filtered documents
  const filteredDocs = React.useMemo(() => {
    if (!docSearch.trim()) return documents;
    const q = docSearch.toLowerCase();
    return documents.filter((d) => d.title.toLowerCase().includes(q));
  }, [documents, docSearch]);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background select-text">
      {/* ─── Workspace Header Bar (Sub-navigation Switcher + Live Presence) ─── */}
      <header className="h-14 px-4 sm:px-6 border-b border-border/60 bg-surface/85 dark:bg-surface/55 backdrop-blur-2xl flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          {/* Sub-navigation switcher */}
          <div className="inline-flex items-center p-1 rounded-xl bg-secondary/80 dark:bg-secondary/40 border border-border/60">
            <button
              type="button"
              onClick={() => handleSwitchTab('canvas')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.98]',
                activeTab === 'canvas'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Canvas</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab('tasks')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.98]',
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
              className="p-1.5 rounded-xl border border-border bg-surface/80 hover:bg-secondary text-foreground shadow-xs transition-colors"
              title="Expand Document Rail (⌘\)"
            >
              <SidebarOpen className="w-4 h-4" />
            </button>
          )}

          {activeTab === 'canvas' && activeDoc && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
              <span className="text-foreground font-semibold truncate max-w-[200px]">
                {localTitle || 'Untitled Canvas'}
              </span>
            </div>
          )}
        </div>

        {/* Right Controls: Presence + Save Status + Favorite */}
        <div className="flex items-center gap-3">
          {activeTab === 'canvas' && activeDoc && (
            <>
              {/* Live Canvas Presence */}
              {presenceList.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/90 dark:bg-surface/50 border border-border dark:border-border-strong text-xs shadow-xs select-none">
                  <div className="flex items-center -space-x-1.5">
                    {presenceList.slice(0, 4).map((viewer) => (
                      <div
                        key={viewer.userId}
                        title={viewer.userName}
                        className="w-6 h-6 rounded-full border-2 border-surface bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center overflow-hidden ring-1 ring-border/50 shadow-xs"
                      >
                        {viewer.avatarUrl ? (
                          <img src={viewer.avatarUrl} alt={viewer.userName} className="w-full h-full object-cover" />
                        ) : (
                          <span>{(viewer.userName || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    ))}
                    {presenceList.length > 4 && (
                      <div className="w-6 h-6 rounded-full border-2 border-surface bg-secondary text-muted-foreground font-semibold text-[9px] flex items-center justify-center">
                        +{presenceList.length - 4}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      Editing now
                    </span>
                  </div>
                </div>
              )}

              {/* Auto-save status indicator */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/80 dark:bg-surface/50 border border-border text-[11px] font-medium text-muted-foreground shadow-xs select-none">
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span>Saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-foreground/80">Saved</span>
                  </>
                )}
                {saveStatus === 'unsaved' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Unsaved changes</span>
                  </>
                )}
              </div>

              {/* Favorite toggle */}
              <button
                type="button"
                onClick={handleToggleFavorite}
                className={cn(
                  'p-2 rounded-xl border border-border bg-surface/80 hover:bg-secondary text-muted-foreground transition-colors',
                  activeDoc.isFavorite && 'text-amber-500 fill-amber-500 bg-amber-500/10 border-amber-500/30'
                )}
                title={activeDoc.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
              >
                <Star className={cn('w-4 h-4', activeDoc.isFavorite && 'fill-current')} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* ─── Main Viewport: Canvas OR Tasks & Requests ─── */}
      {activeTab === 'canvas' ? (
        <div className="flex-1 flex overflow-hidden relative">
          {/* ─── Collapsible Left Document Rail (Cmd+\) ─── */}
          <AnimatePresence initial={false}>
            {!railCollapsed && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                className="h-full border-r border-border dark:border-border-strong bg-surface/85 dark:bg-surface/55 backdrop-blur-2xl flex flex-col shrink-0 overflow-hidden z-20"
              >
                {/* Rail Header */}
                <div className="p-3.5 flex items-center justify-between border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground tracking-tight">Organization Canvases</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setRailCollapsed(true)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                      title="Collapse Sidebar (⌘\)"
                    >
                      <SidebarClose className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Actions & Search */}
                <div className="p-3 space-y-2 border-b border-border/40">
                  <button
                    type="button"
                    onClick={handleCreateNewCanvas}
                    className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all active:scale-[0.98] shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    New Blank Canvas
                  </button>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter canvases..."
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-secondary/60 dark:bg-secondary/30 border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Document Tree / List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
                  {/* Favorites Section (if any) */}
                  {favorites.length > 0 && !docSearch && (
                    <div>
                      <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        Favorites
                      </div>
                      <div className="space-y-0.5">
                        {favorites.map((doc) => (
                          <button
                            key={`fav-${doc.id}`}
                            type="button"
                            onClick={() => handleSelectDoc(doc.id)}
                            className={cn(
                              'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-left group',
                              selectedDocId === doc.id
                                ? 'bg-primary/10 text-primary font-bold shadow-xs'
                                : 'text-foreground/80 hover:bg-secondary/60'
                            )}
                          >
                            <DocumentIcon icon={doc.icon} className="w-4 h-4 shrink-0 text-primary" />
                            <span className="truncate flex-1">{doc.title || 'Untitled'}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All Documents */}
                  <div>
                    <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      All Canvases ({filteredDocs.length})
                    </div>

                    {docsLoading ? (
                      <div className="p-4 flex items-center justify-center text-xs text-muted-foreground gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        Loading...
                      </div>
                    ) : filteredDocs.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No canvases found. Create your first blank canvas above!
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {filteredDocs.map((doc) => {
                          const isSelected = selectedDocId === doc.id;
                          return (
                            <div
                              key={doc.id}
                              onClick={() => handleSelectDoc(doc.id)}
                              className={cn(
                                'group relative flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all select-none',
                                isSelected
                                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                  : 'text-foreground/85 hover:bg-secondary/60 hover:text-foreground'
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <DocumentIcon
                                  icon={doc.icon}
                                  className={cn('w-4 h-4 shrink-0', isSelected ? 'text-primary-foreground' : 'text-primary')}
                                />
                                <span className="truncate">{doc.title || 'Untitled'}</span>
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDocument(doc.id);
                                    if (selectedDocId === doc.id) {
                                      setSelectedDocId(null);
                                    }
                                  }}
                                  className={cn(
                                    'p-1 rounded hover:bg-rose-500/20 hover:text-rose-400 transition-colors',
                                    isSelected ? 'text-white' : 'text-muted-foreground'
                                  )}
                                  title="Delete Canvas"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rail Footer with Shortcut Hint */}
                <div className="p-3 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Toggle Rail</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[10px] font-mono">
                    ⌘\
                  </kbd>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* ─── Infinite Document Canvas ─── */}
          <main className="flex-1 h-full overflow-y-auto relative flex flex-col custom-scrollbar">
            {/* Canvas Body Viewport */}
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
                  Single Blank Canvas Engine
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Create an infinite, collaborative blank canvas unifying documents, Linear-style issue tracking, active sprint velocity, and operational approval requisitions.
                </p>
                <button
                  type="button"
                  onClick={handleCreateNewCanvas}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-md shadow-primary/20"
                >
                  <Plus className="w-4 h-4" />
                  Create Blank Canvas
                </button>
              </div>
            ) : (
              <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6 pb-40">
                {/* ─── Cover Banner Support ─── */}
                <div className="group/cover relative w-full rounded-3xl overflow-hidden transition-all duration-300">
                  {activeDoc.coverUrl ? (
                    <div className={cn('w-full h-44 sm:h-56 relative', activeDoc.coverUrl)}>
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

                      <div className="absolute top-3 right-3 opacity-0 group-hover/cover:opacity-100 flex items-center gap-2 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setShowCoverPicker(!showCoverPicker)}
                          className="px-3 py-1 rounded-full bg-surface/90 dark:bg-surface/80 backdrop-blur-xl border border-border text-xs font-semibold text-foreground shadow-md hover:bg-secondary transition-all"
                        >
                          Change Cover
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetCover(null)}
                          className="p-1 rounded-full bg-surface/90 dark:bg-surface/80 backdrop-blur-xl border border-border text-muted-foreground hover:text-rose-500 transition-colors"
                          title="Remove Cover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="opacity-0 group-hover/cover:opacity-100 transition-opacity pb-2">
                      <button
                        type="button"
                        onClick={() => setShowCoverPicker(!showCoverPicker)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface/80 hover:bg-secondary text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Add Cover Banner
                      </button>
                    </div>
                  )}

                  {/* Cover Banner Selection Drawer */}
                  {showCoverPicker && (
                    <div className="absolute top-12 right-3 w-72 bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong rounded-2xl shadow-2xl p-3 z-40 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Select Mesh Gradient
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {COVER_PRESETS.map((cov) => (
                          <button
                            key={cov.id}
                            type="button"
                            onClick={() => handleSetCover(cov.bg)}
                            className={cn(
                              'h-14 rounded-xl relative border border-border/60 overflow-hidden hover:scale-105 active:scale-95 transition-all text-left p-2 flex items-end',
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
                  )}
                </div>

                {/* ─── Clean Lucide Icon Picker ─── */}
                <div className="relative flex items-center justify-between">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="w-14 h-14 rounded-2xl bg-surface/90 dark:bg-surface/50 border border-border dark:border-border-strong shadow-md flex items-center justify-center text-primary hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      title="Change Document Icon"
                    >
                      <DocumentIcon icon={activeDoc.icon} className="w-7 h-7 text-primary" />
                    </button>

                    {/* Lucide Icon Picker Popover */}
                    {showIconPicker && (
                      <div className="absolute left-0 top-full mt-2 w-64 bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong rounded-2xl shadow-2xl p-3 z-40 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Choose Icon</span>
                          <span className="text-[10px] text-muted-foreground/70">Lucide</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {ICON_OPTIONS.map((item) => {
                            const IconC = item.icon;
                            const isCurrent = (activeDoc.icon || 'FileText') === item.key;
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => handleSetIcon(item.key)}
                                className={cn(
                                  'h-12 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all hover:scale-105 active:scale-95 cursor-pointer',
                                  isCurrent
                                    ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                                    : 'border-border/60 hover:bg-secondary text-foreground/80 hover:text-foreground'
                                )}
                                title={item.label}
                              >
                                <IconC className="w-4 h-4" />
                                <span className="text-[9px] truncate max-w-[50px]">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── Central Document Title ─── */}
                <div>
                  <input
                    type="text"
                    value={localTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Untitled Canvas"
                    className="w-full text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground placeholder:text-muted-foreground/30 bg-transparent outline-none tracking-tight transition-colors"
                  />
                </div>

                {/* ─── TipTap Unified Block Engine ─── */}
                <div className="pt-2">
                  <CanvasBlockEditor
                    key={activeDoc.id}
                    initialContent={activeDoc.contentJson}
                    onChange={(json, html) => {
                      saveContent(json, html, localTitle);
                    }}
                  />
                </div>
              </div>
            )}
          </main>
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
