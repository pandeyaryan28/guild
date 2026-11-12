import * as React from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import {
  Table as TableIcon,
  Plus,
  Trash2,
  ChevronDown,
  Hash,
  Type,
  ListFilter,
  User,
  Calendar,
  CheckSquare,
  X,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@guild/utils';

export type ColumnType = 'text' | 'number' | 'status' | 'person' | 'date' | 'checkbox' | 'select';

export interface TableColumn {
  id: string;
  name: string;
  type: ColumnType;
  options?: string[];
}

export interface TableRow {
  id: string;
  [colId: string]: any;
}

const DEFAULT_COLUMNS: TableColumn[] = [
  { id: 'name', name: 'Deliverable', type: 'text' },
  { id: 'status', name: 'Status', type: 'status', options: ['Planned', 'In Progress', 'Shipped', 'Blocked'] },
  { id: 'owner', name: 'Owner', type: 'person' },
  { id: 'priority', name: 'Priority', type: 'status', options: ['P0', 'P1', 'P2'] },
  { id: 'dueDate', name: 'Due Date', type: 'date' },
  { id: 'done', name: 'Verified', type: 'checkbox' }
];

const DEFAULT_ROWS: TableRow[] = [];

const STATUS_COLORS: Record<string, string> = {
  'Planned': 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  'In Progress': 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  'Shipped': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'Blocked': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  'Todo': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  'Done': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'Active': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'Pending': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'Archived': 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  'P0': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  'P1': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'P2': 'bg-blue-500/10 text-blue-500 border-blue-500/20'
};

export function DatabaseTableBlock({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const title = node.attrs.title || 'Interactive Workspace Database';
  const rawCols: TableColumn[] = node.attrs.columns && node.attrs.columns.length > 0 ? node.attrs.columns : DEFAULT_COLUMNS;
  const rawRows: TableRow[] = node.attrs.rows && Array.isArray(node.attrs.rows) ? node.attrs.rows : DEFAULT_ROWS;

  const [columns, setColumns] = React.useState<TableColumn[]>(rawCols);
  const [rows, setRows] = React.useState<TableRow[]>(rawRows);
  const [tableTitle, setTableTitle] = React.useState(title);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [showAddColMenu, setShowAddColMenu] = React.useState(false);
  const [newColName, setNewColName] = React.useState('');
  const [newColType, setNewColType] = React.useState<ColumnType>('text');

  const persistData = (cols: TableColumn[], rws: TableRow[], tTitle = tableTitle) => {
    setColumns(cols);
    setRows(rws);
    updateAttributes({
      title: tTitle,
      columns: cols,
      rows: rws
    });
  };

  const updateCell = (rowId: string, colId: string, value: any) => {
    const updated = rows.map((r) => {
      if (r.id === rowId) {
        return { ...r, [colId]: value };
      }
      return r;
    });
    persistData(columns, updated);
  };

  const addRow = () => {
    const newRow: TableRow = {
      id: `r-${Date.now()}`,
      name: ''
    };
    columns.forEach((col) => {
      if (col.type === 'checkbox') newRow[col.id] = false;
      else if ((col.type === 'status' || col.type === 'select') && col.options) newRow[col.id] = col.options[0];
      else if (col.type === 'number') newRow[col.id] = 0;
      else if (col.type === 'person') newRow[col.id] = '';
      else if (col.type === 'date') newRow[col.id] = '';
      else newRow[col.id] = '';
    });

    const updated = [...rows, newRow];
    persistData(columns, updated);
  };

  const deleteRow = (rowId: string) => {
    const updated = rows.filter((r) => r.id !== rowId);
    persistData(columns, updated);
  };

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    const colId = `col_${Date.now()}`;
    const newCol: TableColumn = {
      id: colId,
      name: newColName.trim(),
      type: newColType,
      options: (newColType === 'status' || newColType === 'select') ? ['Todo', 'In Progress', 'Done', 'Blocked'] : undefined
    };

    const updatedCols = [...columns, newCol];
    persistData(updatedCols, rows);
    setNewColName('');
    setNewColType('text');
    setShowAddColMenu(false);
  };

  const deleteColumn = (colId: string) => {
    if (colId === 'name' || columns.length <= 1) return; // Prevent deleting primary col
    const updatedCols = columns.filter((c) => c.id !== colId);
    persistData(updatedCols, rows);
  };

  const cycleSelectValue = (rowId: string, col: TableColumn) => {
    if (!col.options || col.options.length === 0) return;
    const row = rows.find((r) => r.id === rowId);
    const curr = row ? row[col.id] : '';
    const currentIndex = col.options.indexOf(curr);
    const nextIndex = (currentIndex + 1) % col.options.length;
    updateCell(rowId, col.id, col.options[nextIndex]);
  };

  return (
    <NodeViewWrapper className="my-6 not-prose">
      <div className="relative group/db rounded-2xl border border-border dark:border-border-strong bg-surface/90 dark:bg-surface/55 backdrop-blur-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 sm:px-6 flex items-center justify-between gap-3 border-b border-border/80 bg-secondary/30 dark:bg-secondary/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs">
              <TableIcon className="w-4 h-4" />
            </div>

            {isEditingTitle ? (
              <input
                type="text"
                autoFocus
                value={tableTitle}
                onChange={(e) => setTableTitle(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false);
                  persistData(columns, rows, tableTitle);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTitle(false);
                    persistData(columns, rows, tableTitle);
                  }
                }}
                className="bg-transparent border-b border-primary text-sm font-bold text-foreground outline-none px-1"
              />
            ) : (
              <h4
                onClick={() => setIsEditingTitle(true)}
                className="text-sm font-bold text-foreground hover:text-primary cursor-pointer tracking-tight transition-colors"
                title="Click to rename database table"
              >
                {tableTitle}
              </h4>
            )}

            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
              {rows.length} {rows.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddColMenu(!showAddColMenu)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface/80 dark:bg-surface/50 hover:bg-secondary text-foreground text-xs font-semibold transition-all active:scale-[0.98] shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
              Add Column
            </button>

            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all active:scale-[0.98] shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Row
            </button>

            <button
              type="button"
              onClick={() => deleteNode()}
              title="Remove Database Block"
              className="opacity-0 group-hover/db:opacity-100 p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Spreadsheet Table Viewport */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/40 dark:bg-secondary/20 select-none">
                <th className="w-10 px-3 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase border-r border-border/50">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className="group/colHeader px-3.5 py-2.5 font-semibold text-foreground/90 border-r border-border/50 relative"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5">
                        {col.type === 'text' && <Type className="w-3.5 h-3.5 text-muted-foreground" />}
                        {(col.type === 'status' || col.type === 'select') && <ListFilter className="w-3.5 h-3.5 text-muted-foreground" />}
                        {col.type === 'person' && <User className="w-3.5 h-3.5 text-muted-foreground" />}
                        {col.type === 'number' && <Hash className="w-3.5 h-3.5 text-muted-foreground" />}
                        {col.type === 'date' && <Calendar className="w-3.5 h-3.5 text-muted-foreground" />}
                        {col.type === 'checkbox' && <CheckSquare className="w-3.5 h-3.5 text-muted-foreground" />}
                        <span>{col.name}</span>
                      </span>

                      {col.id !== 'name' && (
                        <button
                          type="button"
                          onClick={() => deleteColumn(col.id)}
                          className="opacity-0 group-hover/colHeader:opacity-100 text-muted-foreground hover:text-rose-500 p-0.5 rounded transition-opacity"
                          title="Delete column"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}

                {/* Prominent Add Column Header */}
                <th className="px-3 py-2 w-36 relative">
                  <button
                    type="button"
                    onClick={() => setShowAddColMenu(!showAddColMenu)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-border hover:border-primary text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Column
                  </button>

                  {/* Add Column Popover */}
                  {showAddColMenu && (
                    <form
                      onSubmit={handleAddColumn}
                      className="absolute right-2 top-full mt-1.5 w-60 bg-surface dark:bg-surface/95 backdrop-blur-2xl border border-border dark:border-border-strong rounded-2xl shadow-2xl p-3 z-40 space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>New Column</span>
                        <button
                          type="button"
                          onClick={() => setShowAddColMenu(false)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Column Name</label>
                        <input
                          type="text"
                          autoFocus
                          placeholder="e.g. Priority, Due Date..."
                          value={newColName}
                          onChange={(e) => setNewColName(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-secondary/80 border border-border text-xs text-foreground outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Column Type</label>
                        <select
                          value={newColType}
                          onChange={(e) => setNewColType(e.target.value as ColumnType)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-secondary/80 border border-border text-xs text-foreground outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="status">Status</option>
                          <option value="person">Person</option>
                          <option value="date">Date</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-1.5 pt-1 border-t border-border/50">
                        <button
                          type="button"
                          onClick={() => setShowAddColMenu(false)}
                          className="px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:bg-secondary transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!newColName.trim()}
                          className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
                        >
                          Add Column
                        </button>
                      </div>
                    </form>
                  )}
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="px-4 py-8 text-center text-xs text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <TableIcon className="w-6 h-6 text-muted-foreground/40" />
                      <p>This table is currently empty.</p>
                      <button
                        type="button"
                        onClick={addRow}
                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add your first row
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="group/row border-b border-border/50 hover:bg-secondary/30 dark:hover:bg-secondary/15 transition-colors"
                  >
                    {/* Row index and delete trigger */}
                    <td className="px-3 py-2 text-center text-muted-foreground font-mono text-[10px] border-r border-border/50 relative">
                      <span className="group-hover/row:hidden">{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => deleteRow(row.id)}
                        className="hidden group-hover/row:inline-block text-rose-500 hover:text-rose-600 transition-colors"
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>

                    {/* Render cells */}
                    {columns.map((col) => {
                      const value = row[col.id];

                      return (
                        <td key={col.id} className="px-3.5 py-2 border-r border-border/50">
                          {col.type === 'text' && (
                            <input
                              type="text"
                              value={value || ''}
                              onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                              placeholder="Empty..."
                              className="w-full bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground/30 outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 py-0.5 font-medium"
                            />
                          )}

                          {col.type === 'checkbox' && (
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={Boolean(value)}
                                onChange={(e) => updateCell(row.id, col.id, e.target.checked)}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40 cursor-pointer accent-primary"
                              />
                            </div>
                          )}

                          {(col.type === 'status' || col.type === 'select') && (
                            <button
                              type="button"
                              onClick={() => cycleSelectValue(row.id, col)}
                              className={cn(
                                'px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer',
                                STATUS_COLORS[value] || 'bg-secondary text-foreground border-border'
                              )}
                              title="Click to cycle status"
                            >
                              {value || 'None'}
                            </button>
                          )}

                          {col.type === 'person' && (
                            <div className="flex items-center gap-1.5 text-xs text-foreground">
                              <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[9px] flex items-center justify-center shrink-0">
                                {(value || 'U').charAt(0).toUpperCase()}
                              </div>
                              <input
                                type="text"
                                value={value || ''}
                                onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                                placeholder="Assignee"
                                className="bg-transparent border-none text-xs text-foreground outline-none w-28"
                              />
                            </div>
                          )}

                          {col.type === 'date' && (
                            <input
                              type="date"
                              value={value || ''}
                              onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                              className="bg-transparent border-none text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 py-0.5"
                            />
                          )}

                          {col.type === 'number' && (
                            <input
                              type="number"
                              value={value ?? 0}
                              onChange={(e) => updateCell(row.id, col.id, Number(e.target.value))}
                              className="w-20 bg-transparent border-none text-xs font-mono text-foreground outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 py-0.5"
                            />
                          )}
                        </td>
                      );
                    })}

                    <td className="px-3 py-2" />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 px-6 flex items-center justify-between text-xs text-muted-foreground bg-secondary/20 border-t border-border/50">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>
          <span>Calculate: {rows.length} {rows.length === 1 ? 'row' : 'rows'}</span>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
