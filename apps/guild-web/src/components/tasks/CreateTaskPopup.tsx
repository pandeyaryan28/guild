import * as React from 'react';
import { X, Calendar, Clock, User, AlignLeft, ChevronRight, Sun, Sunset } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Popup Glass Panel */}
      <motion.div
        ref={popupRef}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        className="relative z-10 w-full max-w-[520px] rounded-3xl border border-white/10 bg-surface/95 dark:bg-surface/90 backdrop-blur-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        {/* Title Bar */}
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-start gap-3.5">
            {/* Checkbox mock */}
            <div className="mt-1 flex-shrink-0 h-5 w-5 rounded-full border-[1.5px] border-white/20 opacity-60" />
            <div className="flex-1 min-w-0">
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What task needs sync?"
                className="w-full bg-transparent text-[16px] font-black text-foreground placeholder:text-muted-foreground/60 outline-none tracking-wide"
              />
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 mt-1 h-6 w-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Description toggle / field */}
          <div className="pl-8 mt-2.5">
            {showDesc ? (
              <textarea
                autoFocus
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What details or checklists belong to this task?"
                rows={3}
                className="w-full resize-none bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-violet-500/50 hover:border-white/10 transition-all shadow-inner leading-relaxed"
              />
            ) : (
              <button
                onClick={() => setShowDesc(true)}
                className="flex items-center gap-2 text-xs font-bold text-muted-foreground/70 hover:text-foreground transition-all cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-xl px-3 py-1.5"
              >
                <AlignLeft className="h-3.5 w-3.5" />
                <span>Add description</span>
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 mx-6 mt-4.5" />

        {/* Due Date Section */}
        <div className="px-6 py-3.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 mr-1.5">Due Date</span>

            {/* Today */}
            <button
              onClick={() => handleQuickDate('today')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer',
                quickDate === 'today'
                  ? 'bg-violet-500/10 border-violet-500/25 text-violet-400 shadow-sm'
                  : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:border-violet-500/20 hover:text-foreground',
              )}
            >
              <Sun className="h-3.5 w-3.5 shrink-0" />
              Today
            </button>

            {/* Tomorrow */}
            <button
              onClick={() => handleQuickDate('tomorrow')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer',
                quickDate === 'tomorrow'
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-400 shadow-sm'
                  : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:border-amber-500/20 hover:text-foreground',
              )}
            >
              <Sunset className="h-3.5 w-3.5 shrink-0" />
              Tomorrow
            </button>

            {/* Calendar picker */}
            <div className="relative">
              <button
                onClick={handleCalendarClick}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer',
                  quickDate === 'custom' && customDate
                    ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400 shadow-sm'
                    : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:border-cyan-500/20 hover:text-foreground',
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                {quickDate === 'custom' && customDate
                  ? new Date(customDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Pick Date'}
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
                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer',
                    customTime
                      ? 'bg-sky-500/10 border-sky-500/25 text-sky-400 shadow-sm'
                      : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:border-sky-500/20 hover:text-foreground',
                  )}
                >
                  <Clock className="h-3.5 w-3.5" />
                  {customTime || 'Add Time'}
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
        <div className="h-px bg-white/5 mx-6" />

        {/* Assignees Section */}
        <div className="px-6 py-3.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 mr-1.5">Assign</span>

            {/* Selected assignees */}
            {assigneeIds.map((uid) => {
              const m = members.find((x) => x.uid === uid);
              const name = m?.fullName || m?.username || uid;
              return (
                <button
                  key={uid}
                  onClick={() => toggleAssignee(uid)}
                  title="Click to remove"
                  className="inline-flex items-center gap-1.5 rounded-xl pl-1.5 pr-3 py-1 text-[10px] font-black uppercase tracking-wider bg-violet-500/10 border border-violet-500/25 text-violet-400 hover:bg-red-500/10 hover:border-red-500/25 hover:text-red-400 transition-all cursor-pointer shadow-sm"
                >
                  <div className="h-4.5 w-4.5 rounded-full bg-violet-500/20 flex items-center justify-center text-[7px] font-extrabold text-violet-400">
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
                  'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer',
                  showAssignees
                    ? 'border-violet-500/30 text-violet-400 bg-violet-500/10'
                    : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:border-violet-500/20 hover:text-foreground',
                )}
              >
                <User className="h-3.5 w-3.5" />
                {assigneeIds.length === 0 ? 'Assign to' : 'Add more'}
              </button>

              {showAssignees && members.length > 0 && (
                <div className="absolute bottom-full mb-2 left-0 z-20 w-52 rounded-2xl border border-white/10 bg-surface/95 backdrop-blur shadow-2xl overflow-hidden p-1">
                  <div className="py-1">
                    {members.map((m) => {
                      const name = m.fullName || m.username || m.uid;
                      const selected = assigneeIds.includes(m.uid);
                      return (
                        <button
                          key={m.uid}
                          onClick={() => toggleAssignee(m.uid)}
                          className={cn(
                            'flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer',
                            selected
                              ? 'bg-violet-500/10 text-violet-400'
                              : 'text-foreground/80 hover:bg-white/5',
                          )}
                        >
                          <div className={cn(
                            'h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0 shadow-sm border border-white/5',
                            selected ? 'bg-violet-500 text-white border-transparent' : 'bg-white/[0.04] text-muted-foreground',
                          )}>
                            {name[0].toUpperCase()}
                          </div>
                          <span className="flex-1 text-left font-black tracking-wide text-[10px] uppercase truncate">{name}</span>
                          {selected && (
                            <svg className="h-3 w-3 text-violet-400" fill="none" viewBox="0 0 12 12">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
        <div className="h-px bg-white/5 mx-6" />

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/[0.01]">
          {/* Summary pill */}
          <div className="flex items-center gap-2.5 text-[9px] font-black tracking-wider uppercase text-muted-foreground/80">
            {hasDue && (
              <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 bg-white/[0.03] border border-white/5 text-muted-foreground font-mono">
                <Calendar className="h-3 w-3" />
                {dueLabel}
                {customTime && <span>· {customTime}</span>}
              </span>
            )}
            {assigneeIds.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 bg-white/[0.03] border border-white/5 text-muted-foreground">
                <User className="h-3 w-3" />
                {assigneeIds.length === 1
                  ? members.find((m) => m.uid === assigneeIds[0])?.fullName || 'Assigned'
                  : `${assigneeIds.length} members`}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground font-black text-[10px] tracking-wider uppercase hover:bg-white/5 rounded-xl px-4 py-2 h-9 cursor-pointer border border-transparent transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || saving}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all h-9 cursor-pointer border-0 shadow-lg active:scale-95',
                title.trim() && !saving
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white hover:shadow-violet-500/20'
                  : 'bg-white/[0.04] border border-white/5 text-muted-foreground/50 cursor-not-allowed opacity-50 shadow-none',
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Syncing…
                </>
              ) : (
                <>
                  Create task
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
