import * as React from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Columns2, Columns3, Plus, Trash2 } from 'lucide-react';
import { cn } from '@guild/utils';
import { useCanvasEditorContext } from '../CanvasEditorContext';

export interface ColumnCellData {
  id: string;
  heading: string;
  body: string;
  tint?: 'default' | 'indigo' | 'emerald' | 'amber';
}

const TINT_CLASSES: Record<string, string> = {
  default: 'bg-surface/85 dark:bg-surface/50 border-border dark:border-border-strong',
  indigo: 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/20',
  emerald: 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20',
  amber: 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20'
};

export function ColumnsBlock({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const { canEdit } = useCanvasEditorContext();
  const columnCount: 2 | 3 = node.attrs.columnCount === 3 ? 3 : 2;

  const defaultCols: ColumnCellData[] = React.useMemo(() => {
    const count = columnCount;
    return Array.from({ length: count }, (_, idx) => ({
      id: `col-${idx + 1}`,
      heading: idx === 0 ? 'Column 1' : idx === 1 ? 'Column 2' : 'Column 3',
      body: '',
      tint: 'default'
    }));
  }, [columnCount]);

  const rawItems: ColumnCellData[] =
    Array.isArray(node.attrs.items) && node.attrs.items.length > 0 ? node.attrs.items : defaultCols;

  const [items, setItems] = React.useState<ColumnCellData[]>(rawItems);

  React.useEffect(() => {
    if (Array.isArray(node.attrs.items) && node.attrs.items.length > 0) {
      setItems(node.attrs.items);
    }
  }, [node.attrs.items]);

  const updateColumn = (idx: number, patch: Partial<ColumnCellData>) => {
    const next = items.map((item, i) => (i === idx ? { ...item, ...patch } : item));
    setItems(next);
    updateAttributes({ items: next });
  };

  const toggleColumnCount = () => {
    if (!canEdit) return;
    if (columnCount === 2) {
      const nextItems: ColumnCellData[] = [
        ...items.slice(0, 2),
        items[2] || { id: 'col-3', heading: 'Column 3', body: '', tint: 'default' }
      ];
      setItems(nextItems);
      updateAttributes({ columnCount: 3, items: nextItems });
    } else {
      const nextItems = items.slice(0, 2);
      setItems(nextItems);
      updateAttributes({ columnCount: 2, items: nextItems });
    }
  };

  return (
    <NodeViewWrapper className="my-4 not-prose">
      <div className="group/cols relative space-y-2">
        {/* Subtle Top Control Bar on Hover */}
        {canEdit && (
          <div className="flex items-center justify-between opacity-0 group-hover/cols:opacity-100 transition-opacity px-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {columnCount === 3 ? <Columns3 className="w-3.5 h-3.5 text-primary" /> : <Columns2 className="w-3.5 h-3.5 text-primary" />}
              <span>{columnCount}-Column Split Layout</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleColumnCount}
                className="px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary border border-border text-[11px] font-semibold text-foreground transition-colors cursor-pointer"
              >
                Switch to {columnCount === 2 ? '3 Columns' : '2 Columns'}
              </button>
              <button
                type="button"
                onClick={() => deleteNode()}
                className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Delete Columns Block"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Responsive Side-by-Side Columns Grid */}
        <div
          className={cn(
            'grid gap-4 w-full',
            columnCount === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
          )}
        >
          {items.slice(0, columnCount).map((col, idx) => (
            <div
              key={col.id || idx}
              className={cn(
                'rounded-2xl p-4 backdrop-blur-xl border shadow-xs transition-all flex flex-col gap-2',
                TINT_CLASSES[col.tint || 'default']
              )}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                <input
                  type="text"
                  readOnly={!canEdit}
                  value={col.heading}
                  placeholder={`Column ${idx + 1} title...`}
                  onChange={(e) => updateColumn(idx, { heading: e.target.value })}
                  className="bg-transparent border-none text-xs font-bold text-foreground placeholder:text-muted-foreground/45 outline-none flex-1 min-w-0"
                />

                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    {(['default', 'indigo', 'emerald', 'amber'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateColumn(idx, { tint: t })}
                        className={cn(
                          'w-2.5 h-2.5 rounded-full border transition-transform hover:scale-125 cursor-pointer',
                          t === 'default' && 'bg-zinc-400 border-zinc-500',
                          t === 'indigo' && 'bg-indigo-500 border-indigo-600',
                          t === 'emerald' && 'bg-emerald-500 border-emerald-600',
                          t === 'amber' && 'bg-amber-500 border-amber-600',
                          (col.tint || 'default') === t && 'ring-2 ring-primary/50 scale-110'
                        )}
                        title={`Tint: ${t}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <textarea
                readOnly={!canEdit}
                rows={Math.max(4, (col.body.match(/\n/g)?.length || 0) + 1)}
                value={col.body}
                placeholder="Write notes, bullet points, or key metrics in this column..."
                onChange={(e) => updateColumn(idx, { body: e.target.value })}
                className="w-full bg-transparent border-none text-xs leading-relaxed text-foreground/90 placeholder:text-muted-foreground/40 outline-none resize-y"
              />
            </div>
          ))}
        </div>
      </div>
    </NodeViewWrapper>
  );
}
