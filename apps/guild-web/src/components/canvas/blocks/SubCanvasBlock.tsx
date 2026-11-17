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
    <NodeViewWrapper className="my-1 not-prose block w-full">
      <div
        onClick={() => {
          if (!isEditingTitle && childDocId) {
            handleOpenFullPage();
          }
        }}
        className={cn(
          'group/subpage relative flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-lg',
          'border border-border/40 hover:border-border/70 hover:bg-secondary/40',
          'transition-all duration-150 cursor-pointer active:scale-[0.995]'
        )}
      >
        {/* Left: Icon + Title + Hierarchy Badge */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {isCreating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <RenderDocIcon icon={displayedIcon} className="w-3.5 h-3.5 text-primary" />
            )}
          </div>

          <div className="min-w-0 flex-1 flex items-center gap-2">
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
                className="bg-transparent border-b border-primary text-xs font-semibold text-foreground outline-none px-1 py-0.5 w-full max-w-md"
              />
            ) : (
              <span
                onClick={(e) => {
                  if (canEdit) {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }
                }}
                className="text-xs font-semibold text-foreground group-hover/subpage:text-primary transition-colors truncate"
                title={canEdit ? 'Click to rename, or click card to open sub-canvas' : 'Open sub-canvas'}
              >
                {displayedTitle}
              </span>
            )}

            {nestedCount > 0 && (
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-primary/10 text-primary shrink-0">
                {nestedCount}
              </span>
            )}
          </div>
        </div>

        {/* Right Actions: Side Peek & Delete */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 shrink-0"
        >
          {childDocId && onOpenSidePeek && (
            <button
              type="button"
              onClick={handleOpenPeek}
              className="opacity-0 group-hover/subpage:opacity-100 p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Open in Side Peek"
            >
              <PanelRightOpen className="w-3.5 h-3.5" />
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => deleteNode()}
              className="opacity-0 group-hover/subpage:opacity-100 p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
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
