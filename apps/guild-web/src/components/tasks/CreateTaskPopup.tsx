import * as React from 'react';
import { X, Calendar, Clock, User, AlignLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createTask,
  type TaskStatus, type ActorInfo,
} from '../../lib/tasks';
import { useOrgMembers } from '../../hooks/useChat';

interface CreateTaskPopupProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  actor: ActorInfo;
  defaultStatus?: TaskStatus;
  defaultProjectId?: string | null;
  defaultGoalId?: string | null;
}

type QuickDate = 'today' | 'tomorrow' | 'custom' | null;

function getDateLabel(d: QuickDate, customDate: string): string {
  if (d === 'today') return 'Today';
  if (d === 'tomorrow') return 'Tomorrow';
  if (d === 'custom' && customDate) {
    const dt = new Date(customDate + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return '';
}

export function CreateTaskPopup({
  open,
  onClose,
  orgId,
  actor,
  defaultStatus = 'todo',
  defaultProjectId = null,
  defaultGoalId = null,
}: CreateTaskPopupProps) {
  const members = useOrgMembers(orgId);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [showDesc, setShowDesc] = React.useState(false);
  const [quickDate, setQuickDate] = React.useState<QuickDate>(null);
  const [customDate, setCustomDate] = React.useState('');
  const [customTime, setCustomTime] = React.useState('');
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [showTime, setShowTime] = React.useState(false);
  const [assigneeIds, setAssigneeIds] = React.useState<string[]>([]);
  const [showAssignees, setShowAssignees] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const titleRef = React.useRef<HTMLInputElement>(null);
  const calendarRef = React.useRef<HTMLInputElement>(null);
  const timeRef = React.useRef<HTMLInputElement>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setShowDesc(false);
      setQuickDate(null);
      setCustomDate('');
      setCustomTime('');
      setShowCalendar(false);
      setShowTime(false);
      setAssigneeIds([]);
      setShowAssignees(false);
      setSaving(false);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  // Escape to close
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    setTimeout(() => window.addEventListener('mousedown', handler), 100);
    return () => window.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  const getFinalDueDate = (): Date | null => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);

    let base: Date | null = null;
    if (quickDate === 'today') base = todayStart;
    else if (quickDate === 'tomorrow') base = tomorrowStart;
    else if (quickDate === 'custom' && customDate) base = new Date(customDate + 'T00:00:00');

    if (!base) return null;

    if (customTime) {
      const [h, m] = customTime.split(':').map(Number);
      base.setHours(h, m, 0, 0);
    }

    return base;
  };

  const handleSubmit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await createTask({
        orgId,
        title: title.trim(),
        description,
        status: defaultStatus,
        priority: 'none',
        assigneeIds,
        labelIds: [],
        dueDate: getFinalDueDate(),
        actor,
        projectId: defaultProjectId ?? null,
        goalId: defaultGoalId ?? null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !showDesc) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleAssignee = (uid: string) => {
    setAssigneeIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleQuickDate = (d: QuickDate) => {
    if (quickDate === d) {
      setQuickDate(null);
    } else {
      setQuickDate(d);
      if (d !== 'custom') {
        setCustomDate('');
        setShowCalendar(false);
      }
    }
  };

  const handleCalendarClick = () => {
    setShowCalendar(true);
    setTimeout(() => calendarRef.current?.showPicker?.(), 50);
  };

  const handleTimeClick = () => {
    setShowTime(true);
    setTimeout(() => timeRef.current?.showPicker?.(), 50);
  };

  const hasDue = quickDate !== null;
  const dueLabel = getDateLabel(quickDate, customDate);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Popup */}
      <div
        ref={popupRef}
        className="relative z-10 w-full max-w-[520px] mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Title Bar */}
        <div className="px-5 pt-5 pb-0">
          <div className="flex items-start gap-3">
            {/* Checkbox mock */}
            <div className="mt-1 flex-shrink-0 h-5 w-5 rounded-full border-2 border-border-default opacity-50" />
            <div className="flex-1 min-w-0">
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Task name"
                className="w-full bg-transparent text-[17px] font-medium text-foreground placeholder:text-text-muted outline-none"
              />
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 mt-1 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Description toggle / field */}
          <div className="pl-8 mt-2">
            {showDesc ? (
              <textarea
                autoFocus
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description…"
                rows={3}
                className="w-full resize-none bg-transparent text-sm text-foreground/80 placeholder:text-text-muted outline-none leading-relaxed"
              />
            ) : (
              <button
                onClick={() => setShowDesc(true)}
                className="flex items-center gap-1.5 text-sm text-text-muted hover:text-foreground/70 transition-colors"
              >
                <AlignLeft className="h-3.5 w-3.5" />
                <span>Add description</span>
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border-default mx-5 mt-4" />

        {/* Due Date Section */}
        <div className="px-5 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted font-medium mr-1">Due</span>

            {/* Today */}
            <button
              onClick={() => handleQuickDate('today')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all',
                quickDate === 'today'
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'border-border-default text-muted-foreground hover:border-primary/30 hover:text-foreground',
              )}
            >
              <span className="text-[10px]">☀️</span>
              Today
            </button>

            {/* Tomorrow */}
            <button
              onClick={() => handleQuickDate('tomorrow')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all',
                quickDate === 'tomorrow'
                  ? 'bg-orange-500/15 border-orange-400/40 text-orange-400'
                  : 'border-border-default text-muted-foreground hover:border-orange-400/30 hover:text-foreground',
              )}
            >
              <span className="text-[10px]">🌅</span>
              Tomorrow
            </button>

            {/* Calendar picker */}
            <div className="relative">
              <button
                onClick={handleCalendarClick}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all',
                  quickDate === 'custom' && customDate
                    ? 'bg-violet-500/15 border-violet-400/40 text-violet-400'
                    : 'border-border-default text-muted-foreground hover:border-violet-400/30 hover:text-foreground',
                )}
              >
                <Calendar className="h-3 w-3" />
                {quickDate === 'custom' && customDate
                  ? new Date(customDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Pick date'}
              </button>
              <input
                ref={calendarRef}
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setQuickDate('custom');
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                tabIndex={-1}
              />
            </div>

            {/* Time picker */}
            {hasDue && (
              <div className="relative">
                <button
                  onClick={handleTimeClick}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all',
                    customTime
                      ? 'bg-sky-500/15 border-sky-400/40 text-sky-400'
                      : 'border-border-default text-muted-foreground hover:border-sky-400/30 hover:text-foreground',
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {customTime || 'Add time'}
                </button>
                <input
                  ref={timeRef}
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  tabIndex={-1}
                />
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border-default mx-5" />

        {/* Assignees Section */}
        <div className="px-5 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted font-medium mr-1">Assign</span>

            {/* Selected assignees */}
            {assigneeIds.map((uid) => {
              const m = members.find((x) => x.uid === uid);
              const name = m?.fullName || m?.username || uid;
              return (
                <button
                  key={uid}
                  onClick={() => toggleAssignee(uid)}
                  title="Click to remove"
                  className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 text-[11px] font-medium bg-primary/15 border border-primary/30 text-primary hover:bg-red-500/15 hover:border-red-400/30 hover:text-red-400 transition-all"
                >
                  <div className="h-4 w-4 rounded-full bg-primary/30 flex items-center justify-center text-[8px] font-bold">
                    {name[0].toUpperCase()}
                  </div>
                  {name}
                </button>
              );
            })}

            {/* Assignee picker trigger */}
            <div className="relative">
              <button
                onClick={() => setShowAssignees(!showAssignees)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all',
                  showAssignees
                    ? 'border-primary/40 text-primary bg-primary/10'
                    : 'border-border-default text-muted-foreground hover:border-primary/30 hover:text-foreground',
                )}
              >
                <User className="h-3 w-3" />
                {assigneeIds.length === 0 ? 'Assign to' : 'Add more'}
              </button>

              {showAssignees && members.length > 0 && (
                <div className="absolute bottom-full mb-2 left-0 z-20 w-52 rounded-xl border border-border-default bg-popover/95 backdrop-blur shadow-2xl overflow-hidden">
                  <div className="py-1.5">
                    {members.map((m) => {
                      const name = m.fullName || m.username || m.uid;
                      const selected = assigneeIds.includes(m.uid);
                      return (
                        <button
                          key={m.uid}
                          onClick={() => toggleAssignee(m.uid)}
                          className={cn(
                            'flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors',
                            selected
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground/80 hover:bg-accent/40',
                          )}
                        >
                          <div className={cn(
                            'h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0',
                            selected ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground',
                          )}>
                            {name[0].toUpperCase()}
                          </div>
                          <span className="flex-1 text-left font-medium">{name}</span>
                          {selected && (
                            <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 12 12">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border-default mx-5" />

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3">
          {/* Summary pill */}
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            {hasDue && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-accent/50 text-foreground/60">
                <Calendar className="h-2.5 w-2.5" />
                {dueLabel}
                {customTime && <span>· {customTime}</span>}
              </span>
            )}
            {assigneeIds.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-accent/50 text-foreground/60">
                <User className="h-2.5 w-2.5" />
                {assigneeIds.length === 1
                  ? members.find((m) => m.uid === assigneeIds[0])?.fullName || 'Assigned'
                  : `${assigneeIds.length} people`}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || saving}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all',
                title.trim() && !saving
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                  : 'bg-accent text-muted-foreground cursor-not-allowed opacity-50',
              )}
            >
              {saving ? (
                <>
                  <div className="h-3 w-3 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  Create task
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
