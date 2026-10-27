import * as React from 'react';
import {
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  FileText,
  Sparkles,
  Zap,
  Target,
  Inbox,
  Layers,
  Star,
  MoreHorizontal,
  Trash2,
  Edit2,
  FolderPlus,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { WorkspaceDocument, WorkspaceCycle, WorkspaceIssue } from '@guild/types';
import type { DocumentTreeNode } from '../../hooks/useWorkspaceDocuments';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface StudioSidebarProps {
  tree: DocumentTreeNode[];
  favorites: WorkspaceDocument[];
  cycles: WorkspaceCycle[];
  activeCycle: WorkspaceCycle | null;
  selectedDocId: string | null;
  selectedView: 'doc' | 'cycle' | 'issues' | 'triage' | 'backlog';
  onSelectDoc: (docId: string) => void;
  onSelectView: (view: 'cycle' | 'issues' | 'triage' | 'backlog') => void;
  onCreateDoc: (parentId?: string | null) => void;
  onDeleteDoc: (docId: string) => void;
  onToggleFavorite: (doc: WorkspaceDocument) => void;
  onOpenCommandPalette: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function StudioSidebar({
  tree,
  favorites,
  cycles,
  activeCycle,
  selectedDocId,
  selectedView,
  onSelectDoc,
  onSelectView,
  onCreateDoc,
  onDeleteDoc,
  onToggleFavorite,
  onOpenCommandPalette,
  collapsed,
  onToggleCollapse
}: StudioSidebarProps) {
  const [expandedNodes, setExpandedNodes] = React.useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderTreeNode = (node: DocumentTreeNode, level: number = 0) => {
    const isSelected = selectedView === 'doc' && selectedDocId === node.id;
    const isExpanded = expandedNodes[node.id] ?? false;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => onSelectDoc(node.id)}
          style={{ paddingLeft: `${12 + level * 14}px` }}
          className={cn(
            'group relative flex items-center justify-between py-1.5 pr-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-200',
            isSelected
              ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
              : 'text-foreground/75 hover:bg-secondary/70 hover:text-foreground'
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(node.id, e)}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
              >
                <ChevronRight
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-200',
                    isExpanded && 'rotate-90'
                  )}
                />
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}

            <span className="text-sm shrink-0">{node.icon || '📄'}</span>
            <span className="truncate">{node.title || 'Untitled Document'}</span>
          </div>

          {/* Quick Actions Hover Pill */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
              isSelected ? 'opacity-100 text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            <button
              onClick={() => onCreateDoc(node.id)}
              title="Add subpage"
              className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 outline-none">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-surface/95 backdrop-blur-xl border-border">
                <DropdownMenuItem
                  onClick={() => onToggleFavorite(node)}
                  className="gap-2 text-xs font-medium"
                >
                  <Star className={cn('w-3.5 h-3.5', node.isFavorite && 'fill-amber-400 text-amber-400')} />
                  {node.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onCreateDoc(node.id)}
                  className="gap-2 text-xs font-medium"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  Add Subpage
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteDoc(node.id)}
                  className="gap-2 text-xs font-medium text-rose-500 focus:text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Nested Children */}
        {hasChildren && isExpanded && (
          <div className="mt-0.5">
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4 px-2 border-r border-border bg-surface/40 backdrop-blur-xl shrink-0 w-16 select-none">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 mb-4"
          title="Expand Studio Navigation"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
        <button
          onClick={onOpenCommandPalette}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 mb-3"
          title="Search (Cmd+K)"
        >
          <Search className="w-5 h-5" />
        </button>
        <button
          onClick={() => onCreateDoc(null)}
          className="p-2 rounded-xl text-primary bg-primary/10 hover:bg-primary/20"
          title="New Document"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-r border-border bg-surface/50 dark:bg-surface/30 backdrop-blur-2xl w-64 shrink-0 overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-border/80">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-foreground">Studio</span>
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          title="Collapse Sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Search Button (Linear Cmd+K trigger) */}
      <div className="px-3 pt-3">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-surface/70 hover:bg-secondary/50 text-xs text-muted-foreground transition-all duration-200 group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 group-hover:text-foreground transition-colors" />
            <span className="font-medium group-hover:text-foreground">Jump or Search...</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 border border-border text-foreground/70">
            ⌘K
          </span>
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* LINEAR SECTION: CYCLES & ISSUES */}
        <div>
          <div className="px-2 pb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Sprint & Issues
            </span>
          </div>

          <div className="space-y-0.5">
            <button
              onClick={() => onSelectView('cycle')}
              className={cn(
                'w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                selectedView === 'cycle'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-foreground/80 hover:bg-secondary/70 hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>{activeCycle?.title || 'Active Cycle'}</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">2w</span>
            </button>

            <button
              onClick={() => onSelectView('issues')}
              className={cn(
                'w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                selectedView === 'issues'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-foreground/80 hover:bg-secondary/70 hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>All Issues Board</span>
              </div>
            </button>

            <button
              onClick={() => onSelectView('triage')}
              className={cn(
                'w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                selectedView === 'triage'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-foreground/80 hover:bg-secondary/70 hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-sky-400" />
                <span>Triage Inbox</span>
              </div>
            </button>
          </div>
        </div>

        {/* NOTION SECTION: FAVORITES (IF ANY) */}
        {favorites.length > 0 && (
          <div>
            <div className="px-2 pb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Favorites
              </span>
            </div>
            <div className="space-y-0.5">
              {favorites.map((fav) => {
                const isSelected = selectedView === 'doc' && selectedDocId === fav.id;
                return (
                  <div
                    key={`fav-${fav.id}`}
                    onClick={() => onSelectDoc(fav.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all',
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                        : 'text-foreground/80 hover:bg-secondary/70 hover:text-foreground'
                    )}
                  >
                    <span className="text-sm">{fav.icon || '📄'}</span>
                    <span className="truncate">{fav.title || 'Untitled Document'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* NOTION SECTION: DOCUMENTS TREE */}
        <div>
          <div className="px-2 pb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Documents & Specs
            </span>
            <button
              onClick={() => onCreateDoc(null)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              title="Add root page"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {tree.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">No documents yet</p>
              <button
                onClick={() => onCreateDoc(null)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Page
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">{tree.map((node) => renderTreeNode(node, 0))}</div>
          )}
        </div>
      </div>
    </div>
  );
}
