import * as React from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { ChevronRight, Trash2, Plus, CheckSquare } from 'lucide-react';
import { cn } from '@guild/utils';
import { useCanvasEditorContext } from '../CanvasEditorContext';

export function ToggleBlock({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const { canEdit } = useCanvasEditorContext();

  const title: string = node.attrs.title ?? '';
  const body: string = node.attrs.body ?? '';
  const isOpen: boolean = node.attrs.isOpen ?? true;

  const [localTitle, setLocalTitle] = React.useState(title);
  const [localBody, setLocalBody] = React.useState(body);

  React.useEffect(() => {
    setLocalTitle(node.attrs.title ?? '');
  }, [node.attrs.title]);

  React.useEffect(() => {
    setLocalBody(node.attrs.body ?? '');
  }, [node.attrs.body]);

  const toggleOpen = () => {
    updateAttributes({ isOpen: !isOpen });
  };

  return (
    <NodeViewWrapper className="my-2.5 not-prose">
      <div className="group/toggle relative rounded-2xl border border-border/80 dark:border-border-strong bg-surface/80 dark:bg-surface/45 backdrop-blur-xl transition-all duration-200 overflow-hidden">
        {/* Toggle Header */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={toggleOpen}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all cursor-pointer shrink-0"
              title={isOpen ? 'Collapse section' : 'Expand section'}
            >
              <ChevronRight
                className={cn(
                  'w-4 h-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  isOpen && 'rotate-90 text-primary'
                )}
              />
            </button>

            <input
              type="text"
              readOnly={!canEdit}
              value={localTitle}
              placeholder="Toggle section heading..."
              onChange={(e) => {
                setLocalTitle(e.target.value);
                updateAttributes({ title: e.target.value });
              }}
              className="flex-1 bg-transparent border-none text-sm font-bold text-foreground placeholder:text-muted-foreground/45 outline-none"
            />
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => deleteNode()}
              className="opacity-0 group-hover/toggle:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer shrink-0"
              title="Delete Toggle Block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Collapsible Content Area */}
        {isOpen && (
          <div className="pl-11 pr-4 pb-3.5 pt-1 border-t border-border/40 bg-secondary/20 dark:bg-secondary/10">
            <textarea
              readOnly={!canEdit}
              rows={Math.max(2, (localBody.match(/\n/g)?.length || 0) + 1)}
              value={localBody}
              placeholder="Add collapsible details, notes, or implementation steps..."
              onChange={(e) => {
                setLocalBody(e.target.value);
                updateAttributes({ body: e.target.value });
              }}
              className="w-full bg-transparent border-none text-xs leading-relaxed text-foreground/90 placeholder:text-muted-foreground/40 outline-none resize-y"
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
