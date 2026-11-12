import * as React from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import {
  CheckCircle2,
  Circle,
  Trash2,
  User,
  Hash,
  ChevronDown,
  Layers
} from 'lucide-react';
import { cn } from '@guild/utils';
import { useAuth } from '../../../hooks/useAuth';
import { useWorkspaceData } from '../../../context/WorkspaceDataContext';
import type { IssueStatus, IssuePriority } from '@guild/types';

const STATUS_OPTIONS: { id: IssueStatus; label: string; dotColor: string }[] = [
  { id: 'todo', label: 'Todo', dotColor: 'bg-indigo-400' },
  { id: 'in_progress', label: 'In Progress', dotColor: 'bg-sky-400' },
  { id: 'in_review', label: 'In Review', dotColor: 'bg-purple-400' },
  { id: 'done', label: 'Done', dotColor: 'bg-emerald-400' },
  { id: 'backlog', label: 'Backlog', dotColor: 'bg-slate-400' },
  { id: 'triage', label: 'Triage', dotColor: 'bg-amber-400' },
  { id: 'canceled', label: 'Canceled', dotColor: 'bg-rose-400' }
];

const PRIORITY_OPTIONS: { id: IssuePriority; label: string; dotColor: string }[] = [
  { id: 'urgent', label: 'Urgent', dotColor: 'bg-rose-500' },
  { id: 'high', label: 'High', dotColor: 'bg-orange-500' },
  { id: 'medium', label: 'Medium', dotColor: 'bg-amber-500' },
  { id: 'low', label: 'Low', dotColor: 'bg-blue-400' },
  { id: 'none', label: 'None', dotColor: 'bg-slate-400' }
];

const POINT_OPTIONS = [1, 2, 3, 5, 8];

export function InlineIssueBlock({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const { userProfile } = useAuth();
  const workspace = useWorkspaceData();
  const members = workspace?.members || [];

  const identifier = node.attrs.identifier || 'ORB-108';
  const title = node.attrs.title || 'Interactive UI Task';
  const status: IssueStatus = node.attrs.status || 'todo';
  const priority: IssuePriority = node.attrs.priority || 'medium';
  const estimatePoints: number | null = node.attrs.estimatePoints ?? 3;
  const assigneeName = node.attrs.assigneeName || (userProfile?.fullName || 'Assignee');
  const assigneeAvatar = node.attrs.assigneeAvatar || '';

  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleValue, setTitleValue] = React.useState(title);

  const [openStatusMenu, setOpenStatusMenu] = React.useState(false);
  const [openPriorityMenu, setOpenPriorityMenu] = React.useState(false);
  const [openPointsMenu, setOpenPointsMenu] = React.useState(false);
  const [openAssigneeMenu, setOpenAssigneeMenu] = React.useState(false);

  const isDone = status === 'done';

  const toggleDone = () => {
    const nextStatus: IssueStatus = isDone ? 'todo' : 'done';
    updateAttributes({ status: nextStatus });
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleValue.trim()) {
      updateAttributes({ title: titleValue.trim() });
    } else {
      setTitleValue(title);
    }
  };

  const currentPriority = PRIORITY_OPTIONS.find((p) => p.id === priority) || PRIORITY_OPTIONS[2];
  const currentStatus = STATUS_OPTIONS.find((s) => s.id === status) || STATUS_OPTIONS[0];

  return (
    <NodeViewWrapper className="my-3 not-prose inline-block w-full">
      <div className="group/issue relative flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl border border-border dark:border-border-strong bg-surface/90 dark:bg-surface/50 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-200">
        {/* Left side: checkbox + identifier + title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={toggleDone}
            className="text-muted-foreground hover:text-emerald-500 transition-colors shrink-0 cursor-pointer"
            title={isDone ? 'Mark as Incomplete' : 'Mark as Done'}
          >
            {isDone ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
          </button>

          <span className="shrink-0 font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-secondary/80 dark:bg-secondary/40 border border-border text-foreground/80 shadow-xs">
            {identifier}
          </span>

          {/* Editable Title */}
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTitleValue(title);
                  setIsEditingTitle(false);
                }
              }}
              className="flex-1 bg-transparent border-b border-primary text-xs font-semibold text-foreground outline-none px-1 py-0.5"
            />
          ) : (
            <span
              onClick={() => setIsEditingTitle(true)}
              className={cn(
                'text-xs font-semibold text-foreground hover:text-primary cursor-pointer truncate transition-colors',
                isDone && 'line-through text-muted-foreground'
              )}
              title="Click to edit title"
            >
              {title}
            </span>
          )}
        </div>

        {/* Right side: status, priority, points, assignee, delete */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenStatusMenu(!openStatusMenu);
                setOpenPriorityMenu(false);
                setOpenPointsMenu(false);
                setOpenAssigneeMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-secondary/60 hover:bg-secondary border border-border text-[11px] font-semibold text-foreground transition-all active:scale-[0.98]"
            >
              <span className={cn('w-2 h-2 rounded-full', currentStatus.dotColor)} />
              <span>{currentStatus.label}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground opacity-60" />
            </button>

            {openStatusMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-36 bg-surface dark:bg-surface/95 backdrop-blur-2xl border border-border dark:border-border-strong rounded-xl shadow-xl p-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      updateAttributes({ status: opt.id });
                      setOpenStatusMenu(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-lg text-left transition-colors',
                      status === opt.id ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-secondary'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', opt.dotColor)} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenPriorityMenu(!openPriorityMenu);
                setOpenStatusMenu(false);
                setOpenPointsMenu(false);
                setOpenAssigneeMenu(false);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-secondary/60 hover:bg-secondary border border-border text-[11px] font-medium text-foreground transition-all active:scale-[0.98]"
              title={`Priority: ${currentPriority.label}`}
            >
              <span className={cn('w-2 h-2 rounded-full', currentPriority.dotColor)} />
              <span className="hidden sm:inline text-[11px]">{currentPriority.label}</span>
            </button>

            {openPriorityMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-32 bg-surface dark:bg-surface/95 backdrop-blur-2xl border border-border dark:border-border-strong rounded-xl shadow-xl p-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      updateAttributes({ priority: opt.id });
                      setOpenPriorityMenu(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-lg text-left transition-colors',
                      priority === opt.id ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-secondary'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', opt.dotColor)} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fibonacci Points Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenPointsMenu(!openPointsMenu);
                setOpenStatusMenu(false);
                setOpenPriorityMenu(false);
                setOpenAssigneeMenu(false);
              }}
              className="px-2 py-1 rounded-xl bg-secondary/60 hover:bg-secondary border border-border text-[11px] font-mono font-semibold text-foreground transition-all active:scale-[0.98]"
              title="Estimate Points"
            >
              {estimatePoints ? `${estimatePoints} pts` : '– pts'}
            </button>

            {openPointsMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-24 bg-surface dark:bg-surface/95 backdrop-blur-2xl border border-border dark:border-border-strong rounded-xl shadow-xl p-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                {POINT_OPTIONS.map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => {
                      updateAttributes({ estimatePoints: pts });
                      setOpenPointsMenu(false);
                    }}
                    className={cn(
                      'w-full text-center px-2 py-1 text-xs font-mono font-semibold rounded-lg transition-colors',
                      estimatePoints === pts ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'
                    )}
                  >
                    {pts} pts
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assignee @username Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenAssigneeMenu(!openAssigneeMenu);
                setOpenStatusMenu(false);
                setOpenPriorityMenu(false);
                setOpenPointsMenu(false);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-secondary/60 hover:bg-secondary border border-border text-[11px] font-medium text-foreground transition-all active:scale-[0.98]"
            >
              <div className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                {assigneeName.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[70px] truncate text-muted-foreground font-mono">
                @{assigneeName.split(' ')[0].toLowerCase()}
              </span>
            </button>

            {openAssigneeMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-surface dark:bg-surface/95 backdrop-blur-2xl border border-border dark:border-border-strong rounded-xl shadow-xl p-1 z-30 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  Assign To
                </div>
                {(members.length > 0 ? members : [
                  { uid: 'm1', fullName: 'Alex Chen', email: 'alex@company.com' },
                  { uid: 'm2', fullName: 'Elena Rostova', email: 'elena@company.com' },
                  { uid: 'm3', fullName: 'Aryan Pandey', email: 'aryan@company.com' }
                ]).map((m) => (
                  <button
                    key={m.uid}
                    type="button"
                    onClick={() => {
                      updateAttributes({ assigneeName: m.fullName || m.email });
                      setOpenAssigneeMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg text-left text-foreground hover:bg-secondary transition-colors"
                  >
                    <div className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">
                      {(m.fullName || m.email).charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{m.fullName || m.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delete Block Button */}
          <button
            type="button"
            onClick={() => deleteNode()}
            title="Delete Issue Block"
            className="opacity-0 group-hover/issue:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
