import * as React from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import {
  FileText,
  Layers,
  Folder,
  BookOpen,
  Table as TableIcon,
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
  Bookmark,
  ArrowUpRight,
  PanelRightOpen,
  Trash2,
  Plus,
  Loader2,
  GitBranch
} from 'lucide-react';
import { cn } from '@guild/utils';
import { useCanvasEditorContext } from '../CanvasEditorContext';
import { updateWorkspaceDocumentMeta } from '../../../lib/workspaceDocuments';

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

function RenderDocIcon({ icon, className = 'w-4 h-4' }: { icon?: string; className?: string }) {
  if (icon && ICON_MAP[icon]) {
    const Comp = ICON_MAP[icon];
    return <Comp className={className} />;
  }
  if (icon && icon.length <= 4 && !/^[a-zA-Z]+$/.test(icon)) {
    return <span className="inline-block text-center leading-none text-base">{icon}</span>;
  }
  return <FileText className={className} />;
}

export function SubCanvasBlock({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const {
    documents,
    canEdit,
    onSelectDoc,
    onOpenSidePeek,
    createSubCanvas
  } = useCanvasEditorContext();

  const childDocId: string | null = node.attrs.childDocId || null;
  const fallbackTitle: string = node.attrs.title || 'Untitled Sub-Canvas';
  const fallbackIcon: string = node.attrs.icon || 'FileText';

  const [isCreating, setIsCreating] = React.useState(false);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState(fallbackTitle);
  const creationAttemptedRef = React.useRef(false);

  // Find live child document in workspace documents
  const childDoc = React.useMemo(
    () => (childDocId ? documents.find((d) => d.id === childDocId) || null : null),
    [documents, childDocId]
  );

  // Find grandchildren count (pages nested inside this sub-canvas)
  const nestedCount = React.useMemo(() => {
    if (!childDocId) return 0;
    return documents.filter((d) => d.parentId === childDocId).length;
  }, [documents, childDocId]);

  const displayedTitle = childDoc?.title || fallbackTitle;
  const displayedIcon = childDoc?.icon || fallbackIcon;

  React.useEffect(() => {
    setTitleDraft(displayedTitle);
  }, [displayedTitle]);

  // Auto-provision the linked child WorkspaceDocument when first inserted if childDocId is null
  React.useEffect(() => {
    if (childDocId || creationAttemptedRef.current || !canEdit) return;
    creationAttemptedRef.current = true;
    setIsCreating(true);
    createSubCanvas({
      title: fallbackTitle,
      icon: fallbackIcon
    })
      .then((newId) => {
        if (newId) {
          updateAttributes({ childDocId: newId });
        }
      })
      .catch((err) => {
        console.error('[SubCanvasBlock] Failed to create sub-canvas:', err);
      })
      .finally(() => {
        setIsCreating(false);
      });
  }, [childDocId, canEdit, createSubCanvas, fallbackTitle, fallbackIcon, updateAttributes]);

  const handleCommitTitle = async () => {
    setIsEditingTitle(false);
    const trimmed = titleDraft.trim() || 'Untitled Sub-Canvas';
    updateAttributes({ title: trimmed });
    if (childDocId) {
      try {
        await updateWorkspaceDocumentMeta(childDocId, { title: trimmed });
      } catch (err) {
        console.error('[SubCanvasBlock] Failed to update child doc title:', err);
      }
    }
  };

  const handleOpenFullPage = () => {
    if (childDocId) {
      onSelectDoc(childDocId);
    }
  };

  const handleOpenPeek = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (childDocId && onOpenSidePeek) {
      onOpenSidePeek(childDocId);
    } else if (childDocId) {
      onSelectDoc(childDocId);
    }
  };

  return (
    <NodeViewWrapper className="my-2.5 not-prose">
      <div
        onClick={() => {
          if (!isEditingTitle && childDocId) {
            handleOpenFullPage();
          }
        }}
        className={cn(
          'group/subpage relative flex items-center justify-between gap-3 px-4 py-3 rounded-2xl',
          'bg-surface/85 dark:bg-surface/50 backdrop-blur-xl',
          'border border-border dark:border-border-strong hover:border-primary/40',
          'shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.35)]',
          'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.995]'
        )}
      >
        {/* Left: Icon + Title + Hierarchy Badge */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-xs group-hover/subpage:scale-105 transition-transform">
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <RenderDocIcon icon={displayedIcon} className="w-4 h-4 text-primary" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isEditingTitle && canEdit ? (
                <input
                  type="text"
                  autoFocus
                  value={titleDraft}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleCommitTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCommitTitle();
                    if (e.key === 'Escape') {
                      setTitleDraft(displayedTitle);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="bg-transparent border-b border-primary text-sm font-bold text-foreground outline-none px-1 py-0.5 w-full max-w-md"
                />
              ) : (
                <span
                  onClick={(e) => {
                    if (canEdit) {
                      e.stopPropagation();
                      setIsEditingTitle(true);
                    }
                  }}
                  className="text-sm font-bold text-foreground group-hover/subpage:text-primary transition-colors truncate border-b border-transparent hover:border-border"
                  title={canEdit ? 'Click text to rename, or click card to open sub-canvas' : 'Open sub-canvas'}
                >
                  {displayedTitle}
                </span>
              )}

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary/80 dark:bg-secondary/40 text-muted-foreground border border-border/60 shrink-0">
                <GitBranch className="w-2.5 h-2.5 text-primary" />
                <span>Sub-Canvas</span>
              </span>

              {nestedCount > 0 && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {nestedCount} nested {nestedCount === 1 ? 'item' : 'items'}
                </span>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
              <span>
                {childDoc
                  ? `Last edited by ${childDoc.lastEditedByName || childDoc.creatorName || 'Teammate'}`
                  : 'Nested workspace canvas page'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions: Side Peek, Open Full Page, Delete Block */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 shrink-0"
        >
          {childDocId && onOpenSidePeek && (
            <button
              type="button"
              onClick={handleOpenPeek}
              className="opacity-0 group-hover/subpage:opacity-100 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-secondary/80 hover:bg-secondary border border-border text-[11px] font-semibold text-foreground transition-all active:scale-95 cursor-pointer"
              title="Open in Side Peek Drawer"
            >
              <PanelRightOpen className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Side Peek</span>
            </button>
          )}

          {childDocId && (
            <button
              type="button"
              onClick={handleOpenFullPage}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer"
              title="Open Sub-Canvas"
            >
              <span>Open</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => deleteNode()}
              className="opacity-0 group-hover/subpage:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
              title="Remove Sub-Canvas Block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}
