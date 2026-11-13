import * as React from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import {
  Table as TableIcon,
  LayoutGrid,
  Kanban,
  List as ListIcon,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Hash,
  Type,
  ListFilter,
  User,
  Calendar,
  CheckSquare,
  X,
  Search,
  ArrowUpDown,
  PanelRightOpen,
  ArrowUpRight,
  FileText,
  Link2,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { cn } from '@guild/utils';
import { useWorkspaceData } from '../../../context/WorkspaceDataContext';
import { useAuth } from '../../../hooks/useAuth';
import { useCanvasEditorContext } from '../CanvasEditorContext';
import { updateWorkspaceDocumentMeta } from '../../../lib/workspaceDocuments';
import type { UserProfile } from '../../../lib/firestore';
import type { DatabaseViewType } from '@guild/types';

export type ColumnType =
  | 'text'
  | 'number'
  | 'status'
  | 'person'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'url';

export interface TableColumn {
  id: string;
  name: string;
  type: ColumnType;
  options?: string[];
  width?: number;
}

export interface TableRow {
  id: string;
  linkedDocId?: string | null;
  [colId: string]: any;
}

const DEFAULT_COLUMNS: TableColumn[] = [
  { id: 'col_1', name: 'Deliverable', type: 'text', width: 240 },
  {
    id: 'col_2',
    name: 'Status',
    type: 'status',
    options: ['Planned', 'In Progress', 'Shipped', 'Blocked'],
    width: 140
  },
  { id: 'col_3', name: 'Owner', type: 'person', width: 175 },
  {
    id: 'col_4',
    name: 'Priority',
    type: 'status',
    options: ['P0', 'P1', 'P2'],
    width: 110
  },
  { id: 'col_5', name: 'Due Date', type: 'date', width: 145 },
  { id: 'col_6', name: 'Verified', type: 'checkbox', width: 90 }
];

const DEFAULT_ROWS: TableRow[] = [];

const STATUS_COLORS: Record<string, string> = {
  Planned: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  'In Progress': 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  Shipped: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Blocked: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  Todo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  Done: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Archived: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  P0: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  P1: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  P2: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
};

interface PersonCellEditorProps {
  value: any;
  onChange: (val: any) => void;
  members: UserProfile[];
  readOnly?: boolean;
}

function PersonCellEditor({ value, onChange, members, readOnly }: PersonCellEditorProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  const initialName =
    typeof value === 'object' && value !== null
      ? value.name || ''
      : typeof value === 'string'
        ? value
        : '';
  const initialAvatar =
    typeof value === 'object' && value !== null ? value.avatarUrl || '' : '';

  const [name, setName] = React.useState(initialName);
  const [avatarUrl, setAvatarUrl] = React.useState(initialAvatar);

  React.useEffect(() => {
    const nextName =
      typeof value === 'object' && value !== null
        ? value.name || ''
        : typeof value === 'string'
          ? value
          : '';
    const nextAvatar =
      typeof value === 'object' && value !== null ? value.avatarUrl || '' : '';
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

  const query = name.startsWith('@')
    ? name.slice(1).toLowerCase().trim()
    : name.toLowerCase().trim();

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
    if (readOnly) return;
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
        readOnly={readOnly}
        value={name}
        onChange={handleInputChange}
        onFocus={() => !readOnly && setIsOpen(true)}
        placeholder="Assign member (@)..."
        className="bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground/40 outline-none w-full min-w-0"
      />

      {isOpen && !readOnly && (
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
                    <img
                      src={photo}
                      alt={displayName}
                      className="w-6 h-6 rounded-full object-cover shrink-0 border border-border"
                    />
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

const VIEW_TABS: { id: DatabaseViewType; label: string; icon: any }[] = [
  { id: 'table', label: 'Table', icon: TableIcon },
  { id: 'board', label: 'Board', icon: Kanban },
  { id: 'gallery', label: 'Gallery', icon: LayoutGrid },
  { id: 'list', label: 'List', icon: ListIcon },
  { id: 'timeline', label: 'Timeline', icon: CalendarIcon }
];

export function DatabaseTableBlock({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const { userProfile } = useAuth();
  const workspace = useWorkspaceData();
  const {
    documents,
    canEdit,
    onSelectDoc,
    onOpenSidePeek,
    createSubCanvas
  } = useCanvasEditorContext();

  const rawMembers = workspace?.members || [];
  const members = rawMembers.length > 0 ? rawMembers : userProfile ? [userProfile] : [];

  const title = node.attrs.title ?? '';
  const initialView: DatabaseViewType = node.attrs.activeView || 'table';
  const rawCols: TableColumn[] =
    node.attrs.columns && node.attrs.columns.length > 0 ? node.attrs.columns : DEFAULT_COLUMNS;
  const rawRows: TableRow[] =
    node.attrs.rows && Array.isArray(node.attrs.rows) ? node.attrs.rows : DEFAULT_ROWS;

  const [columns, setColumns] = React.useState<TableColumn[]>(rawCols);
  const [rows, setRows] = React.useState<TableRow[]>(rawRows);
  const [tableTitle, setTableTitle] = React.useState(title);
  const [activeView, setActiveView] = React.useState<DatabaseViewType>(initialView);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);

  // Filter, Search & Sort state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [sortDir, setSortDir] = React.useState<'none' | 'asc' | 'desc'>('none');
  const [summaryMode, setSummaryMode] = React.useState<'count' | 'done_pct' | 'sum'>('count');
  const [openingRowId, setOpeningRowId] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    if (node.attrs.activeView && node.attrs.activeView !== activeView) {
      setActiveView(node.attrs.activeView);
    }
  }, [node.attrs.activeView]);

  const persistData = (
    cols: TableColumn[],
    rws: TableRow[],
    tTitle = tableTitle,
    view = activeView
  ) => {
    setColumns(cols);
    setRows(rws);
    updateAttributes({
      title: tTitle,
      columns: cols,
      rows: rws,
      activeView: view
    });
  };

  const handleSwitchView = (view: DatabaseViewType) => {
    setActiveView(view);
    updateAttributes({ activeView: view });
  };

  const primaryCol = columns[0] || DEFAULT_COLUMNS[0];
  const statusCol = React.useMemo(
    () => columns.find((c) => c.type === 'status' || c.type === 'select') || null,
    [columns]
  );
  const personCol = React.useMemo(
    () => columns.find((c) => c.type === 'person') || null,
    [columns]
  );
  const dateCol = React.useMemo(
    () => columns.find((c) => c.type === 'date') || null,
    [columns]
  );
  const checkCol = React.useMemo(
    () => columns.find((c) => c.type === 'checkbox') || null,
    [columns]
  );

  const updateCell = (rowId: string, colId: string, value: any) => {
    if (!canEdit) return;
    const updated = rows.map((r) => {
      if (r.id === rowId) {
        const nextRow = { ...r, [colId]: value };
        // If primary title column changed and row has a linked sub-canvas, keep its title synced
        if (colId === primaryCol.id && r.linkedDocId && typeof value === 'string' && value.trim()) {
          updateWorkspaceDocumentMeta(r.linkedDocId, { title: value.trim() }).catch(() => {});
        }
        return nextRow;
      }
      return r;
    });
    persistData(columns, updated);
  };

  const addRow = (initialStatus?: string) => {
    if (!canEdit) return;
    const newRow: TableRow = {
      id: `r-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      linkedDocId: null
    };
    columns.forEach((col) => {
      if (col.type === 'checkbox') newRow[col.id] = false;
      else if ((col.type === 'status' || col.type === 'select') && col.options) {
        newRow[col.id] =
          initialStatus && col.id === statusCol?.id ? initialStatus : col.options[0];
      } else if (col.type === 'number') newRow[col.id] = 0;
      else if (col.type === 'person') newRow[col.id] = { name: '', avatarUrl: '', role: '' };
      else if (col.type === 'date') newRow[col.id] = new Date().toISOString().slice(0, 10);
      else newRow[col.id] = '';
    });

    const updated = [...rows, newRow];
    persistData(columns, updated);
  };

  const deleteRow = (rowId: string) => {
    if (!canEdit) return;
    const updated = rows.filter((r) => r.id !== rowId);
    persistData(columns, updated);
  };

  // Notion "Every Row is a Page": Open or create the child WorkspaceDocument for a row
  const handleOpenRowCanvas = async (row: TableRow, mode: 'peek' | 'full' = 'peek') => {
    const rowTitle = String(row[primaryCol.id] || '').trim() || 'Untitled Database Item';

    if (row.linkedDocId) {
      if (mode === 'peek' && onOpenSidePeek) {
        onOpenSidePeek(row.linkedDocId);
      } else {
        onSelectDoc(row.linkedDocId);
      }
      return;
    }

    if (!canEdit) return;
    setOpeningRowId(row.id);
    try {
      const newDocId = await createSubCanvas({
        title: rowTitle,
        icon: 'Table',
        parentDatabaseRowId: row.id
      });
      if (newDocId) {
        const updatedRows = rows.map((r) =>
          r.id === row.id ? { ...r, linkedDocId: newDocId } : r
        );
        persistData(columns, updatedRows);
        if (mode === 'peek' && onOpenSidePeek) {
          onOpenSidePeek(newDocId);
        } else {
          onSelectDoc(newDocId);
        }
      }
    } catch (err) {
      console.error('[DatabaseTableBlock] Failed to open row sub-canvas:', err);
    } finally {
      setOpeningRowId(null);
    }
  };

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim() || !canEdit) return;

    const colId = `col_${Date.now()}`;
    const newCol: TableColumn = {
      id: colId,
      name: newColName.trim(),
      type: newColType,
      width: 160,
      options:
        newColType === 'status' || newColType === 'select'
          ? ['Todo', 'In Progress', 'Done', 'Blocked']
          : undefined
    };

    const updatedCols = [...columns, newCol];
    persistData(updatedCols, rows);
    setNewColName('');
    setNewColType('text');
    setShowAddColMenu(false);
  };

  const deleteColumn = (colId: string) => {
    if (columns.length <= 1 || !canEdit) return;
    const updatedCols = columns.filter((c) => c.id !== colId);
    persistData(updatedCols, rows);
  };

  const startRenameCol = (col: TableColumn) => {
    if (!canEdit) return;
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
    if (!canEdit || !col.options || col.options.length === 0) return;
    const row = rows.find((r) => r.id === rowId);
    const curr = row ? row[col.id] : '';
    const currentIndex = col.options.indexOf(curr);
    const nextIndex = (currentIndex + 1) % col.options.length;
    updateCell(rowId, col.id, col.options[nextIndex]);
  };

  // Filtered & Sorted rows
  const filteredRows = React.useMemo(() => {
    let list = [...rows];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) =>
        columns.some((c) => {
          const val = r[c.id];
          if (!val) return false;
          if (typeof val === 'object') {
            return String(val.name || '').toLowerCase().includes(q);
          }
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    if (statusFilter !== 'all' && statusCol) {
      list = list.filter((r) => r[statusCol.id] === statusFilter);
    }

    if (sortDir !== 'none') {
      list.sort((a, b) => {
        const va = String(a[primaryCol.id] || '').toLowerCase();
        const vb = String(b[primaryCol.id] || '').toLowerCase();
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }

    return list;
  }, [rows, columns, searchQuery, statusFilter, statusCol, sortDir, primaryCol.id]);

  // Footer Rollup Calculation
  const footerSummaryText = React.useMemo(() => {
    if (summaryMode === 'done_pct') {
      if (checkCol) {
        const checked = rows.filter((r) => Boolean(r[checkCol.id])).length;
        const pct = rows.length > 0 ? Math.round((checked / rows.length) * 100) : 0;
        return `${checked}/${rows.length} Verified (${pct}%)`;
      }
      if (statusCol) {
        const done = rows.filter((r) =>
          ['Shipped', 'Done', 'Completed'].includes(String(r[statusCol.id]))
        ).length;
        const pct = rows.length > 0 ? Math.round((done / rows.length) * 100) : 0;
        return `${done}/${rows.length} Shipped (${pct}%)`;
      }
    }
    if (summaryMode === 'sum') {
      const numCol = columns.find((c) => c.type === 'number');
      if (numCol) {
        const total = rows.reduce((acc, r) => acc + (Number(r[numCol.id]) || 0), 0);
        return `Sum (${numCol.name}): ${total}`;
      }
    }
    return `Count: ${filteredRows.length} ${filteredRows.length === 1 ? 'record' : 'records'}`;
  }, [summaryMode, rows, filteredRows.length, checkCol, statusCol, columns]);

  return (
    <NodeViewWrapper className="my-6 not-prose">
      <div className="relative group/db rounded-2xl border border-border dark:border-border-strong bg-surface/90 dark:bg-surface/55 backdrop-blur-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
        {/* ─── Top Bar: Database Title + View Switcher Tabs + Search & Filters ─── */}
        <div className="p-3.5 sm:px-5 flex flex-col gap-3 border-b border-border/80 bg-secondary/30 dark:bg-secondary/15">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Title + Record Count */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs shrink-0">
                <TableIcon className="w-4 h-4" />
              </div>

              {isEditingTitle && canEdit ? (
                <input
                  type="text"
                  autoFocus
                  placeholder="Database title..."
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
                  onClick={() => canEdit && setIsEditingTitle(true)}
                  className="text-sm font-bold text-foreground hover:text-primary cursor-pointer tracking-tight transition-colors truncate"
                  title="Click to rename database"
                >
                  {tableTitle || (
                    <span className="text-muted-foreground/60 font-semibold">Untitled Database</span>
                  )}
                </h4>
              )}

              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border shrink-0">
                {filteredRows.length} {filteredRows.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Right Controls: View Switcher Pills + Delete */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Notion 5-View Switcher */}
              <div className="inline-flex items-center p-0.5 rounded-xl bg-surface/80 dark:bg-surface/40 border border-border shadow-2xs">
                {VIEW_TABS.map((vt) => {
                  const Icon = vt.icon;
                  const isActive = activeView === vt.id;
                  return (
                    <button
                      key={vt.id}
                      type="button"
                      onClick={() => handleSwitchView(vt.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer active:scale-95',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{vt.label}</span>
                    </button>
                  );
                })}
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => deleteNode()}
                  title="Remove Database Block"
                  className="opacity-0 group-hover/db:opacity-100 p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filter, Sort & Search Sub-Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[200px]">
              {/* Search Input */}
              <div className="relative w-44 sm:w-56">
                <Search className="w-3 h-3 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter records..."
                  className="w-full pl-7 pr-6 py-1 rounded-lg bg-surface/80 dark:bg-surface/40 border border-border text-[11px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Filter Pill */}
              {statusCol && statusCol.options && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-surface/80 dark:bg-surface/40 border border-border text-[11px] font-medium text-foreground outline-none cursor-pointer"
                >
                  <option value="all">All {statusCol.name}</option>
                  {statusCol.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {/* Sort Toggle Button */}
              <button
                type="button"
                onClick={() =>
                  setSortDir((prev) => (prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none'))
                }
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer',
                  sortDir !== 'none'
                    ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                    : 'bg-surface/80 dark:bg-surface/40 border-border text-muted-foreground hover:text-foreground'
                )}
                title="Sort by primary column"
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>
                  Sort {sortDir === 'asc' ? '(A→Z)' : sortDir === 'desc' ? '(Z→A)' : ''}
                </span>
              </button>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => addRow()}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Item</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── VIEW 1: TABLE VIEW ─── */}
        {activeView === 'table' && (
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
                          {(col.type === 'status' || col.type === 'select') && (
                            <ListFilter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                          {col.type === 'person' && <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                          {col.type === 'number' && <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                          {col.type === 'date' && <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                          {col.type === 'checkbox' && (
                            <CheckSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                          {col.type === 'url' && <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}

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

                        {canEdit && columns.length > 1 && (
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

                      <div
                        onMouseDown={(e) => handleStartResize(col.id, col.width, e)}
                        className={cn(
                          'absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 transition-colors z-20',
                          resizingColId === col.id ? 'bg-primary' : 'group-hover/colHeader:bg-border/80'
                        )}
                        title="Drag to resize column"
                      />
                    </th>
                  ))}

                  {canEdit && (
                    <th className="px-3 py-2 w-36 min-w-36 relative select-none">
                      <button
                        type="button"
                        onClick={() => setShowAddColMenu(!showAddColMenu)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-border hover:border-primary text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Property</span>
                      </button>

                      {showAddColMenu && (
                        <form
                          onSubmit={handleAddColumn}
                          className="absolute right-2 top-full mt-1.5 w-60 bg-surface dark:bg-surface/95 backdrop-blur-2xl border border-border dark:border-border-strong rounded-2xl shadow-2xl p-3 z-40 space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                            <span>New Property Column</span>
                            <button
                              type="button"
                              onClick={() => setShowAddColMenu(false)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              autoFocus
                              placeholder="e.g. Priority, Spec URL..."
                              value={newColName}
                              onChange={(e) => setNewColName(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-secondary/80 border border-border text-xs text-foreground outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                              Type
                            </label>
                            <select
                              value={newColType}
                              onChange={(e) => setNewColType(e.target.value as ColumnType)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-secondary/80 border border-border text-xs text-foreground outline-none focus:border-primary cursor-pointer"
                            >
                              <option value="text">Text</option>
                              <option value="status">Status / Select</option>
                              <option value="person">Person</option>
                              <option value="date">Date</option>
                              <option value="number">Number</option>
                              <option value="checkbox">Checkbox</option>
                              <option value="url">URL Link</option>
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
                              Add
                            </button>
                          </div>
                        </form>
                      )}
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 2}
                      className="px-4 py-8 text-center text-xs text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <TableIcon className="w-6 h-6 text-muted-foreground/40" />
                        <p>No records in this view.</p>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => addRow()}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add your first database item
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const hasLinkedPage = Boolean(
                      row.linkedDocId && documents.some((d) => d.id === row.linkedDocId)
                    );
                    const isOpeningThis = openingRowId === row.id;

                    return (
                      <tr
                        key={row.id}
                        className="group/row border-b border-border/50 hover:bg-secondary/30 dark:hover:bg-secondary/15 transition-colors"
                      >
                        <td className="w-10 min-w-10 px-3 py-2 text-center text-muted-foreground font-mono text-[10px] border-r border-border/50 relative">
                          <span className={cn(canEdit && 'group-hover/row:hidden')}>{idx + 1}</span>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => deleteRow(row.id)}
                              className="hidden group-hover/row:inline-block text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>

                        {columns.map((col, colIdx) => {
                          const value = row[col.id];
                          const isPrimaryCol = colIdx === 0;

                          return (
                            <td
                              key={col.id}
                              style={{ width: `${col.width || 160}px`, minWidth: `${col.width || 160}px` }}
                              className="px-3.5 py-2 border-r border-border/50 overflow-visible"
                            >
                              {isPrimaryCol ? (
                                /* Primary Column with Notion "Open as Page / Side Peek" Trigger */
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    {hasLinkedPage && (
                                      <FileText
                                        className="w-3.5 h-3.5 text-primary shrink-0"
                                        title="Has nested sub-canvas page"
                                      />
                                    )}
                                    <input
                                      type="text"
                                      readOnly={!canEdit}
                                      value={value || ''}
                                      onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                                      placeholder="Item title..."
                                      className="w-full bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground/35 outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 py-0.5 font-semibold"
                                    />
                                  </div>

                                  {/* Notion Side Peek & Full Page Row Open Buttons */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRowCanvas(row, 'peek')}
                                      disabled={isOpeningThis}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface dark:bg-surface/90 border border-border hover:border-primary/50 text-[10px] font-bold text-foreground hover:text-primary shadow-2xs transition-all cursor-pointer"
                                      title="Open Row in Side Peek (Add sub-pages or nested databases)"
                                    >
                                      {isOpeningThis ? (
                                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                      ) : (
                                        <PanelRightOpen className="w-3 h-3 text-primary" />
                                      )}
                                      <span>Open</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRowCanvas(row, 'full')}
                                      disabled={isOpeningThis}
                                      className="p-1 rounded-md bg-surface dark:bg-surface/90 border border-border hover:border-primary/50 text-muted-foreground hover:text-primary shadow-2xs transition-all cursor-pointer"
                                      title="Open Row as Full Page Canvas"
                                    >
                                      <ArrowUpRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {col.type === 'text' && (
                                    <input
                                      type="text"
                                      readOnly={!canEdit}
                                      value={value || ''}
                                      onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                                      placeholder="Empty..."
                                      className="w-full bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground/30 outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 py-0.5 font-medium"
                                    />
                                  )}

                                  {col.type === 'url' && (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        readOnly={!canEdit}
                                        value={value || ''}
                                        onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-transparent border-none text-xs text-primary underline placeholder:no-underline placeholder:text-muted-foreground/30 outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 py-0.5"
                                      />
                                      {value && (
                                        <a
                                          href={String(value).startsWith('http') ? value : `https://${value}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-muted-foreground hover:text-primary shrink-0"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  {col.type === 'checkbox' && (
                                    <div className="flex items-center justify-center">
                                      <input
                                        type="checkbox"
                                        disabled={!canEdit}
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
                                      title="Click to cycle option"
                                    >
                                      {value || 'None'}
                                    </button>
                                  )}

                                  {col.type === 'person' && (
                                    <PersonCellEditor
                                      value={value}
                                      readOnly={!canEdit}
                                      onChange={(val) => updateCell(row.id, col.id, val)}
                                      members={members}
                                    />
                                  )}

                                  {col.type === 'date' && (
                                    <input
                                      type="date"
                                      readOnly={!canEdit}
                                      value={value || ''}
                                      onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                                      className="bg-transparent border-none text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 py-0.5"
                                    />
                                  )}

                                  {col.type === 'number' && (
                                    <input
                                      type="number"
                                      readOnly={!canEdit}
                                      value={value ?? 0}
                                      onChange={(e) => updateCell(row.id, col.id, Number(e.target.value))}
                                      className="w-20 bg-transparent border-none text-xs font-mono text-foreground outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 py-0.5"
                                    />
                                  )}
                                </>
                              )}
                            </td>
                          );
                        })}

                        {canEdit && <td className="px-3 py-2" />}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── VIEW 2: KANBAN BOARD VIEW ─── */}
        {activeView === 'board' && (
          <div className="p-4 overflow-x-auto">
            <div className="flex gap-4 min-w-max">
              {(statusCol?.options || ['Planned', 'In Progress', 'Shipped', 'Blocked']).map((groupOpt) => {
                const groupRows = filteredRows.filter((r) =>
                  statusCol ? (r[statusCol.id] || statusCol.options?.[0]) === groupOpt : true
                );

                return (
                  <div
                    key={groupOpt}
                    className="w-72 rounded-2xl bg-secondary/40 dark:bg-secondary/20 border border-border/70 p-3 flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between px-1">
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                          STATUS_COLORS[groupOpt] || 'bg-secondary text-foreground border-border'
                        )}
                      >
                        {groupOpt}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {groupRows.length}
                      </span>
                    </div>

                    <div className="space-y-2 min-h-[80px]">
                      {groupRows.map((row) => {
                        const rowTitle = row[primaryCol.id] || 'Untitled Item';
                        const ownerObj = personCol ? row[personCol.id] : null;
                        const ownerName =
                          typeof ownerObj === 'object' && ownerObj !== null
                            ? ownerObj.name
                            : typeof ownerObj === 'string'
                              ? ownerObj
                              : '';
                        const dueVal = dateCol ? row[dateCol.id] : '';

                        return (
                          <div
                            key={row.id}
                            className="group/card rounded-xl bg-surface dark:bg-surface/80 border border-border hover:border-primary/40 p-3 shadow-xs space-y-2 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <input
                                type="text"
                                readOnly={!canEdit}
                                value={row[primaryCol.id] || ''}
                                placeholder="Item title..."
                                onChange={(e) => updateCell(row.id, primaryCol.id, e.target.value)}
                                className="bg-transparent border-none text-xs font-bold text-foreground outline-none flex-1 min-w-0"
                              />
                              <button
                                type="button"
                                onClick={() => handleOpenRowCanvas(row, 'peek')}
                                className="opacity-0 group-hover/card:opacity-100 p-1 rounded-lg bg-secondary hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all cursor-pointer shrink-0"
                                title="Open Row Page"
                              >
                                <PanelRightOpen className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1 text-[10px] text-muted-foreground">
                              {ownerName ? (
                                <span className="font-medium text-foreground/80 truncate">
                                  @{ownerName}
                                </span>
                              ) : (
                                <span>Unassigned</span>
                              )}
                              {dueVal && <span className="font-mono">{dueVal}</span>}
                            </div>

                            {canEdit && statusCol && (
                              <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
                                <button
                                  type="button"
                                  onClick={() => cycleSelectValue(row.id, statusCol)}
                                  className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                                >
                                  Move status →
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteRow(row.id)}
                                  className="text-muted-foreground hover:text-rose-500 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => addRow(groupOpt)}
                        className="w-full py-1.5 rounded-xl border border-dashed border-border hover:border-primary/40 text-[11px] font-semibold text-muted-foreground hover:text-primary flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New in {groupOpt}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── VIEW 3: GALLERY VIEW ─── */}
        {activeView === 'gallery' && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredRows.map((row) => {
              const statusVal = statusCol ? row[statusCol.id] : null;
              const ownerObj = personCol ? row[personCol.id] : null;
              const ownerName =
                typeof ownerObj === 'object' && ownerObj !== null ? ownerObj.name : '';
              const dueVal = dateCol ? row[dateCol.id] : '';

              return (
                <div
                  key={row.id}
                  className="group/gal rounded-2xl border border-border dark:border-border-strong bg-surface/90 dark:bg-surface/50 p-4 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {statusVal ? (
                        <span
                          onClick={() => statusCol && cycleSelectValue(row.id, statusCol)}
                          className={cn(
                            'px-2 py-0.5 rounded-md border text-[10px] font-bold cursor-pointer',
                            STATUS_COLORS[statusVal] || 'bg-secondary text-foreground border-border'
                          )}
                        >
                          {statusVal}
                        </span>
                      ) : (
                        <span />
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenRowCanvas(row, 'peek')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
                        >
                          <PanelRightOpen className="w-3 h-3" />
                          <span>Open Page</span>
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      readOnly={!canEdit}
                      value={row[primaryCol.id] || ''}
                      placeholder="Card title..."
                      onChange={(e) => updateCell(row.id, primaryCol.id, e.target.value)}
                      className="w-full bg-transparent border-none text-sm font-bold text-foreground outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                    <span>{ownerName || 'No owner'}</span>
                    <span>{dueVal || 'No date'}</span>
                  </div>
                </div>
              );
            })}

            {canEdit && (
              <button
                type="button"
                onClick={() => addRow()}
                className="rounded-2xl border border-dashed border-border hover:border-primary/50 p-6 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer min-h-[120px]"
              >
                <Plus className="w-5 h-5" />
                <span className="text-xs font-semibold">Add Gallery Card</span>
              </button>
            )}
          </div>
        )}

        {/* ─── VIEW 4: LIST VIEW ─── */}
        {activeView === 'list' && (
          <div className="divide-y divide-border/50">
            {filteredRows.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No items in list.</div>
            ) : (
              filteredRows.map((row) => {
                const statusVal = statusCol ? row[statusCol.id] : null;
                const dueVal = dateCol ? row[dateCol.id] : '';
                return (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                      <input
                        type="text"
                        readOnly={!canEdit}
                        value={row[primaryCol.id] || ''}
                        placeholder="Untitled item..."
                        onChange={(e) => updateCell(row.id, primaryCol.id, e.target.value)}
                        className="bg-transparent border-none text-xs font-semibold text-foreground outline-none flex-1 min-w-0"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {statusVal && (
                        <button
                          type="button"
                          onClick={() => statusCol && cycleSelectValue(row.id, statusCol)}
                          className={cn(
                            'px-2 py-0.5 rounded-md border text-[10px] font-semibold cursor-pointer',
                            STATUS_COLORS[statusVal] || 'bg-secondary text-foreground border-border'
                          )}
                        >
                          {statusVal}
                        </button>
                      )}
                      {dueVal && (
                        <span className="text-[10px] font-mono text-muted-foreground">{dueVal}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenRowCanvas(row, 'peek')}
                        className="px-2 py-1 rounded-lg bg-secondary hover:bg-primary/15 text-[10px] font-semibold text-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <PanelRightOpen className="w-3 h-3" />
                        <span>Open</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── VIEW 5: TIMELINE / SCHEDULE VIEW ─── */}
        {activeView === 'timeline' && (
          <div className="p-4 space-y-2">
            {filteredRows.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No scheduled records yet.
              </div>
            ) : (
              filteredRows.map((row, idx) => {
                const statusVal = statusCol ? row[statusCol.id] : 'Planned';
                const dueVal = dateCol ? row[dateCol.id] : 'Unscheduled';

                return (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/25 border border-border/60"
                  >
                    <div className="w-28 shrink-0 text-[11px] font-mono font-semibold text-muted-foreground">
                      {dueVal || `Step ${idx + 1}`}
                    </div>
                    <div className="flex-1 relative h-8 rounded-lg bg-surface dark:bg-surface/70 border border-border px-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground truncate">
                        {row[primaryCol.id] || 'Untitled Deliverable'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-semibold border',
                            STATUS_COLORS[statusVal] || 'bg-secondary text-foreground border-border'
                          )}
                        >
                          {statusVal}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenRowCanvas(row, 'peek')}
                          className="text-primary hover:underline text-[10px] font-bold cursor-pointer"
                        >
                          Open Page →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── Database Footer: Add Row + Rollup Summary Selector ─── */}
        <div className="p-3 px-5 flex items-center justify-between text-xs text-muted-foreground bg-secondary/20 border-t border-border/50">
          {canEdit ? (
            <button
              type="button"
              onClick={() => addRow()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-semibold text-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
          ) : (
            <span className="text-[11px] italic">View-only database</span>
          )}

          {/* Interactive Rollup Calculation Selector */}
          <button
            type="button"
            onClick={() =>
              setSummaryMode((prev) =>
                prev === 'count' ? 'done_pct' : prev === 'done_pct' ? 'sum' : 'count'
              )
            }
            className="px-2.5 py-1 rounded-lg hover:bg-secondary text-[11px] font-mono font-semibold text-foreground/80 transition-colors cursor-pointer"
            title="Click to switch rollup calculation (Count / % Done / Sum)"
          >
            {footerSummaryText}
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
