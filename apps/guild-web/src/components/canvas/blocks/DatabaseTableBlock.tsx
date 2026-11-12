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
  MoreHorizontal,
  Check
} from 'lucide-react';
import { cn } from '@guild/utils';
import { useWorkspaceData } from '../../../context/WorkspaceDataContext';
import { useAuth } from '../../../hooks/useAuth';
import type { UserProfile } from '../../../lib/firestore';

export type ColumnType = 'text' | 'number' | 'status' | 'person' | 'date' | 'checkbox' | 'select';

export interface TableColumn {
  id: string;
  name: string;
  type: ColumnType;
  options?: string[];
  width?: number;
}

export interface TableRow {
  id: string;
  [colId: string]: any;
}

const DEFAULT_COLUMNS: TableColumn[] = [
  { id: 'col_1', name: 'Deliverable', type: 'text', width: 220 },
  { id: 'col_2', name: 'Status', type: 'status', options: ['Planned', 'In Progress', 'Shipped', 'Blocked'], width: 140 },
  { id: 'col_3', name: 'Owner', type: 'person', width: 180 },
  { id: 'col_4', name: 'Priority', type: 'status', options: ['P0', 'P1', 'P2'], width: 120 },
  { id: 'col_5', name: 'Due Date', type: 'date', width: 150 },
  { id: 'col_6', name: 'Verified', type: 'checkbox', width: 90 }
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

interface PersonCellEditorProps {
  value: any;
  onChange: (val: any) => void;
  members: UserProfile[];
}

function PersonCellEditor({ value, onChange, members }: PersonCellEditorProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  const initialName = typeof value === 'object' && value !== null ? value.name || '' : (typeof value === 'string' ? value : '');
  const initialAvatar = typeof value === 'object' && value !== null ? value.avatarUrl || '' : '';

  const [name, setName] = React.useState(initialName);
  const [avatarUrl, setAvatarUrl] = React.useState(initialAvatar);

  React.useEffect(() => {
    const nextName = typeof value === 'object' && value !== null ? value.name || '' : (typeof value === 'string' ? value : '');
    const nextAvatar = typeof value === 'object' && value !== null ? value.avatarUrl || '' : '';
    setName(nextName);
    setAvatarUrl(nextAvatar);
  }, [value]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const query = name.startsWith('@') ? name.slice(1).toLowerCase().trim() : name.toLowerCase().trim();

  const filteredMembers = React.useMemo(() => {
    if (!query) return members;
    return members.filter((m) => {
      const fn = (m.fullName || '').toLowerCase();
      const em = (m.email || '').toLowerCase();
      const un = (m.username || '').toLowerCase();
      const role = (m.designation || m.role || '').toLowerCase();
      return fn.includes(query) || em.includes(query) || un.includes(query) || role.includes(query);
    });
  }, [members, query]);

  const selectMember = (m: UserProfile) => {
    const memberName = m.fullName || m.email || 'Member';
    const memberAvatar = m.photoURL || '';
    const memberRole = m.designation || m.role || '';

    setName(memberName);
    setAvatarUrl(memberAvatar);
    onChange({
      name: memberName,
      avatarUrl: memberAvatar,
      role: memberRole,
      uid: m.uid
    });
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setAvatarUrl('');
    onChange({ name: val, avatarUrl: '', role: '' });
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5 text-xs text-foreground w-full">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-5 h-5 rounded-full object-cover border border-border shrink-0"
        />
      ) : (
        <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[9px] flex items-center justify-center shrink-0">
          {(name || 'U').charAt(0).toUpperCase()}
        </div>
      )}

      <input
        type="text"
        value={name}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder="Assign member (@)..."
        className="bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground/40 outline-none w-full min-w-0"
      />

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-64 max-h-56 overflow-y-auto bg-surface dark:bg-surface/95 backdrop-blur-2xl border border-border dark:border-border-strong rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1 flex items-center justify-between">
            <span>Workspace Members</span>
            <span className="text-[9px] font-normal lowercase">{filteredMembers.length} available</span>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="px-3 py-3 text-center text-xs text-muted-foreground">
              No matching members found
            </div>
          ) : (
            filteredMembers.map((m) => {
              const displayName = m.fullName || m.email || 'Member';
              const roleTitle = m.designation || m.role || 'Member';
              const photo = m.photoURL;

              return (
                <button
                  key={m.uid}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectMember(m);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left hover:bg-secondary dark:hover:bg-secondary/40 transition-colors group/member"
                >
                  {photo ? (
                    <img src={photo} alt={displayName} className="w-6 h-6 rounded-full object-cover shrink-0 border border-border" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-foreground truncate group-hover/member:text-primary transition-colors">
                      {displayName}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {roleTitle} {m.email && `• ${m.email}`}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function DatabaseTableBlock({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const { userProfile } = useAuth();
  const workspace = useWorkspaceData();
  const rawMembers = workspace?.members || [];
  const members = rawMembers.length > 0 ? rawMembers : (userProfile ? [userProfile] : []);

  const title = node.attrs.title ?? '';
  const rawCols: TableColumn[] = node.attrs.columns && node.attrs.columns.length > 0 ? node.attrs.columns : DEFAULT_COLUMNS;
  const rawRows: TableRow[] = node.attrs.rows && Array.isArray(node.attrs.rows) ? node.attrs.rows : DEFAULT_ROWS;

  const [columns, setColumns] = React.useState<TableColumn[]>(rawCols);
  const [rows, setRows] = React.useState<TableRow[]>(rawRows);
  const [tableTitle, setTableTitle] = React.useState(title);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);

  // Column renaming state
  const [editingColId, setEditingColId] = React.useState<string | null>(null);
  const [colNameDraft, setColNameDraft] = React.useState('');

  // Column resizing state
  const [resizingColId, setResizingColId] = React.useState<string | null>(null);
  const resizeStateRef = React.useRef<{ colId: string; startX: number; startWidth: number } | null>(null);

  // Add column menu popover state
  const [showAddColMenu, setShowAddColMenu] = React.useState(false);
  const [newColName, setNewColName] = React.useState('');
  const [newColType, setNewColType] = React.useState<ColumnType>('text');

  React.useEffect(() => {
    setTableTitle(node.attrs.title ?? '');
  }, [node.attrs.title]);

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
      id: `r-${Date.now()}`
    };
    columns.forEach((col) => {
      if (col.type === 'checkbox') newRow[col.id] = false;
      else if ((col.type === 'status' || col.type === 'select') && col.options) newRow[col.id] = col.options[0];
      else if (col.type === 'number') newRow[col.id] = 0;
      else if (col.type === 'person') newRow[col.id] = { name: '', avatarUrl: '', role: '' };
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
      width: 160,
      options: (newColType === 'status' || newColType === 'select') ? ['Todo', 'In Progress', 'Done', 'Blocked'] : undefined
    };

    const updatedCols = [...columns, newCol];
    persistData(updatedCols, rows);
    setNewColName('');
    setNewColType('text');
    setShowAddColMenu(false);
  };

  // Allow deleting ANY column as long as columns.length > 1
  const deleteColumn = (colId: string) => {
    if (columns.length <= 1) return;
    const updatedCols = columns.filter((c) => c.id !== colId);
    persistData(updatedCols, rows);
  };

  // Renaming any column
  const startRenameCol = (col: TableColumn) => {
    setEditingColId(col.id);
    setColNameDraft(col.name);
  };

  const commitRenameCol = (colId: string) => {
    if (colNameDraft.trim()) {
      const updated = columns.map((c) => (c.id === colId ? { ...c, name: colNameDraft.trim() } : c));
      persistData(updated, rows);
    }
    setEditingColId(null);
  };

  // Resizing columns
  const handleStartResize = (colId: string, currentWidth: number | undefined, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const initialWidth = currentWidth || 160;
    resizeStateRef.current = {
      colId,
      startX: e.clientX,
      startWidth: initialWidth
    };
    setResizingColId(colId);

    const onMouseMove = (moveEvt: MouseEvent) => {
      if (!resizeStateRef.current) return;
      const delta = moveEvt.clientX - resizeStateRef.current.startX;
      const newWidth = Math.max(90, resizeStateRef.current.startWidth + delta);
      setColumns((prev) =>
        prev.map((c) => (c.id === resizeStateRef.current?.colId ? { ...c, width: newWidth } : c))
      );
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setResizingColId(null);
      setColumns((latest) => {
        persistData(latest, rows);
        return latest;
      });
      resizeStateRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
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
        {/* Table Header Bar - Clean minimalism, NO duplicate top row/column buttons */}
        <div className="p-4 sm:px-6 flex items-center justify-between gap-3 border-b border-border/80 bg-secondary/30 dark:bg-secondary/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs">
              <TableIcon className="w-4 h-4" />
            </div>

            {isEditingTitle ? (
              <input
                type="text"
                autoFocus
                placeholder="Database table title..."
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
                  if (e.key === 'Escape') {
                    setIsEditingTitle(false);
                  }
                }}
                className="bg-transparent border-b border-primary text-sm font-bold text-foreground placeholder:text-muted-foreground/40 outline-none px-1"
              />
            ) : (
              <h4
                onClick={() => setIsEditingTitle(true)}
                className="text-sm font-bold text-foreground hover:text-primary cursor-pointer tracking-tight transition-colors"
                title="Click to rename database table"
              >
                {tableTitle || <span className="text-muted-foreground/50 italic font-normal">Untitled Database</span>}
              </h4>
            )}

            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
              {rows.length} {rows.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          <div className="flex items-center gap-2">
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
                <th className="w-10 min-w-10 px-3 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase border-r border-border/50">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    style={{ width: `${col.width || 160}px`, minWidth: `${col.width || 160}px` }}
                    className="group/colHeader px-3.5 py-2.5 font-semibold text-foreground/90 border-r border-border/50 relative select-none"
                  >
                    <div className="flex items-center justify-between gap-1.5 pr-2">
                      <span className="flex items-center gap-1.5 min-w-0 flex-1">
                        {col.type === 'text' && <Type className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        {(col.type === 'status' || col.type === 'select') && <ListFilter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        {col.type === 'person' && <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        {col.type === 'number' && <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        {col.type === 'date' && <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        {col.type === 'checkbox' && <CheckSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}

                        {editingColId === col.id ? (
                          <input
                            type="text"
                            autoFocus
                            value={colNameDraft}
                            onChange={(e) => setColNameDraft(e.target.value)}
                            onBlur={() => commitRenameCol(col.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRenameCol(col.id);
                              if (e.key === 'Escape') setEditingColId(null);
                            }}
                            className="w-full bg-secondary/80 border border-primary/50 text-xs font-semibold text-foreground outline-none rounded px-1 py-0.5"
                          />
                        ) : (
                          <span
                            onClick={() => startRenameCol(col)}
                            className="cursor-pointer hover:text-primary transition-colors truncate"
                            title="Click to rename column"
                          >
                            {col.name}
                          </span>
                        )}
                      </span>

                      {/* Allow deleting ANY column if more than 1 column remains */}
                      {columns.length > 1 && (
                        <button
                          type="button"
                          onClick={() => deleteColumn(col.id)}
                          className="opacity-0 group-hover/colHeader:opacity-100 text-muted-foreground hover:text-rose-500 p-0.5 rounded transition-opacity shrink-0"
                          title="Delete column"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Resizing Handle */}
                    <div
                      onMouseDown={(e) => handleStartResize(col.id, col.width, e)}
                      className={cn(
                        "absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 transition-colors z-20",
                        resizingColId === col.id ? "bg-primary" : "group-hover/colHeader:bg-border/80"
                      )}
                      title="Drag to resize column"
                    />
                  </th>
                ))}

                {/* Primary Add Column Header */}
                <th className="px-3 py-2 w-36 min-w-36 relative select-none">
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
                    <td className="w-10 min-w-10 px-3 py-2 text-center text-muted-foreground font-mono text-[10px] border-r border-border/50 relative">
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
                        <td
                          key={col.id}
                          style={{ width: `${col.width || 160}px`, minWidth: `${col.width || 160}px` }}
                          className="px-3.5 py-2 border-r border-border/50 overflow-visible"
                        >
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
                            <PersonCellEditor
                              value={value}
                              onChange={(val) => updateCell(row.id, col.id, val)}
                              members={members}
                            />
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

        {/* Table Footer - Clean Primary Add Row Action */}
        <div className="p-3 px-6 flex items-center justify-between text-xs text-muted-foreground bg-secondary/20 border-t border-border/50">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-semibold text-xs transition-all active:scale-[0.98]"
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
