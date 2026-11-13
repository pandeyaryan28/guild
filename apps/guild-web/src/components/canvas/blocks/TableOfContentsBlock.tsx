import * as React from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { ListTree, Trash2, Hash } from 'lucide-react';
import { cn } from '@guild/utils';
import { useCanvasEditorContext } from '../CanvasEditorContext';

export function TableOfContentsBlock({ deleteNode }: NodeViewProps) {
  const { headings, canEdit, scrollToPos } = useCanvasEditorContext();

  return (
    <NodeViewWrapper className="my-3 not-prose">
      <div className="group/toc relative rounded-2xl border border-border dark:border-border-strong bg-surface/85 dark:bg-surface/45 backdrop-blur-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <ListTree className="w-3.5 h-3.5 text-primary" />
            <span>Table of Contents</span>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => deleteNode()}
              className="opacity-0 group-hover/toc:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
              title="Remove Table of Contents"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {headings.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Add headings (H1, H2, H3) to your canvas to automatically populate this outline.
          </p>
        ) : (
          <div className="space-y-1">
            {headings.map((h, idx) => (
              <button
                key={`${h.id}-${idx}`}
                type="button"
                onClick={() => scrollToPos?.(h.pos)}
                style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
                className={cn(
                  'w-full flex items-center gap-2 py-1 px-2 rounded-lg text-left text-xs transition-colors hover:bg-secondary/70 hover:text-primary cursor-pointer',
                  h.level === 1 && 'font-bold text-foreground',
                  h.level === 2 && 'font-semibold text-foreground/85',
                  h.level === 3 && 'font-normal text-muted-foreground'
                )}
              >
                <Hash className="w-3 h-3 text-primary/60 shrink-0" />
                <span className="truncate">{h.text || 'Untitled Section'}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
