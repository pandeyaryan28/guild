import * as React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Check, 
  Clock, 
  Calendar as CalendarIcon, 
  SlidersHorizontal,
  Trash2,
  ListTodo,
  User,
  Folder,
  AlertCircle
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  isToday, 
  addDays, 
  subDays, 
  addWeeks, 
  subWeeks 
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../../hooks/useAuth';
import { useTasks } from '../../../hooks/useTasks';
import { useProjects } from '../../../hooks/useProjects';
import { useGoals } from '../../../hooks/useGoals';
import { useOrgMembers } from '../../../hooks/useChat';
import { CreateTaskModal } from '../../tasks/CreateTaskModal';
import { TaskDetailDrawer } from '../../tasks/TaskDetailDrawer';
import { moveTask, STATUS_CONFIG, PRIORITY_CONFIG } from '../../../lib/tasks';
import type { Task, TaskPriority, TaskStatus } from '../../../lib/tasks';
import { cn } from '@/lib/utils';

interface TimeBlock {
  id: string;
  dateStr: string;
  hour: string;
  title: string;
  category: 'focus' | 'meeting' | 'review' | 'routine';
  color?: string;
}

export function MobileCalendar() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const actor = React.useMemo(() => ({
    uid: userProfile?.uid || '',
    name: userProfile?.fullName || 'Anonymous',
  }), [userProfile]);

  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [createModalDate, setCreateModalDate] = React.useState<string>('');

  // Local schedule states
  const [timeBlocks, setTimeBlocks] = React.useState<TimeBlock[]>([]);
  const [editingBlockHour, setEditingBlockHour] = React.useState<string | null>(null);
  const [newBlockTitle, setNewBlockTitle] = React.useState('');
  const [newBlockCategory, setNewBlockCategory] = React.useState<'focus' | 'meeting' | 'review' | 'routine'>('focus');

  // Load and fetch standard monorepo hooks
  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { projects } = useProjects(orgId);
  const { goals } = useGoals(orgId);
  const members = useOrgMembers(orgId);

  React.useEffect(() => {
    if (!orgId) return;
    const key = `guild_calendar_timeblocks_${orgId}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) setTimeBlocks(JSON.parse(stored));
      else setTimeBlocks([]);
    } catch (e) {
      console.error(e);
    }
  }, [orgId]);

  const saveTimeBlocks = (blocks: TimeBlock[]) => {
    if (!orgId) return;
    const key = `guild_calendar_timeblocks_${orgId}`;
    try {
      localStorage.setItem(key, JSON.stringify(blocks));
      setTimeBlocks(blocks);
    } catch (e) {
      console.error(e);
    }
  };

  const getTaskDate = React.useCallback((task: Task): Date | null => {
    if (!task.dueDate) return null;
    if (typeof task.dueDate.toDate === 'function') return task.dueDate.toDate();
    if (task.dueDate instanceof Date) return task.dueDate;
    if ((task.dueDate as any).seconds) return new Date((task.dueDate as any).seconds * 1000);
    return new Date(task.dueDate as any);
  }, []);

  const handlePrevWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const handleToggleTaskStatus = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (!orgId) return;
    const oldStatus = task.status;
    const newStatus: TaskStatus = oldStatus === 'done' ? 'todo' : 'done';
    try {
      await moveTask(task.id, orgId, newStatus, task.orderIndex || 1000, oldStatus, actor);
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickAddClick = (date: Date) => {
    setCreateModalDate(format(date, 'yyyy-MM-dd'));
    setCreateModalOpen(true);
  };

  const handleAddTimeBlock = (hour: string) => {
    if (!newBlockTitle.trim() || !orgId) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    const categoryColors = {
      focus: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
      meeting: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      review: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      routine: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
    };

    const newBlock: TimeBlock = {
      id: Math.random().toString(36).substring(2, 9),
      dateStr,
      hour,
      title: newBlockTitle.trim(),
      category: newBlockCategory,
      color: categoryColors[newBlockCategory],
    };

    saveTimeBlocks([...timeBlocks, newBlock]);
    setNewBlockTitle('');
    setEditingBlockHour(null);
  };

  const handleDeleteTimeBlock = (id: string) => {
    saveTimeBlocks(timeBlocks.filter((b) => b.id !== id));
  };

  // Get days of currently focused week
  const weekDays = React.useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  // Daily Tasks
  const selectedDayTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      const due = getTaskDate(t);
      return due && isSameDay(due, selectedDate);
    });
  }, [tasks, selectedDate, getTaskDate]);

  // Hourly schedule timelines (8 AM to 7 PM)
  const hours = Array.from({ length: 12 }, (_, i) => {
    const hr = i + 8;
    const formatted = hr < 10 ? `0${hr}:00` : `${hr}:00`;
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr > 12 ? hr - 12 : hr;
    return { value: formatted, label: `${displayHr}:00 ${ampm}` };
  });

  const memberMap = React.useMemo(() => {
    const m = new Map<string, any>();
    members.forEach((mem) => m.set(mem.uid, mem));
    return m;
  }, [members]);

  const projectMap = React.useMemo(() => {
    const m = new Map<string, string>();
    projects.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [projects]);

  return (
    <div className="flex flex-col space-y-5 animate-fluid-pop pb-6">
      
      {/* 1. Scrolling Weekly Header Card */}
      <div className="aether-glass p-4 bg-surface/85 dark:bg-surface/50 border border-border dark:border-border-strong space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 shrink-0">
            <CalendarIcon className="w-4.5 h-4.5 text-primary shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest text-foreground">
              {format(currentDate, 'MMMM yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button 
              onClick={handlePrevWeek} 
              className="h-8 w-8 rounded-xl border border-border bg-secondary hover:bg-secondary/80 flex items-center justify-center text-foreground cursor-pointer active:scale-90 transition-transform shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={handleToday} 
              className="px-3.5 py-1.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-[10px] font-black uppercase tracking-widest text-foreground cursor-pointer active:scale-95 shadow-xs"
            >
              Today
            </button>
            <button 
              onClick={handleNextWeek} 
              className="h-8 w-8 rounded-xl border border-border bg-secondary hover:bg-secondary/80 flex items-center justify-center text-foreground cursor-pointer active:scale-90 transition-transform shadow-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 7 Days of Selected Week */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {weekDays.map((day) => {
            const isSel = isSameDay(day, selectedDate);
            const isTday = isToday(day);
            const hasTasks = tasks.some((t) => {
              const due = getTaskDate(t);
              return due && isSameDay(due, day);
            });

            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "relative flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-2xl border transition-all cursor-pointer select-none",
                  isSel
                    ? "bg-primary border-primary/30 text-white shadow-md shadow-primary/20"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                )}
              >
                <span className="text-[9px] font-black tracking-widest uppercase mb-1">{format(day, 'eee').slice(0, 1)}</span>
                <span className={cn(
                  "text-xs font-black h-6 w-6 rounded-full flex items-center justify-center",
                  isTday && !isSel ? "bg-primary/15 text-primary" : ""
                )}>
                  {format(day, 'd')}
                </span>
                
                {/* Micro indicator dot for tasks */}
                {hasTasks && (
                  <span className={cn(
                    "absolute bottom-1.5 h-1 w-1 rounded-full",
                    isSel ? "bg-white" : "bg-primary"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Tasks Agenda stream */}
      <div className="aether-glass p-4 sm:p-5 space-y-4 bg-surface/85 dark:bg-surface/50 border border-border dark:border-border-strong shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Agenda for {format(selectedDate, 'MMM d, yyyy')}
          </span>
          <button
            onClick={() => handleQuickAddClick(selectedDate)}
            className="flex items-center gap-1 px-2.5 py-1.5 h-7 text-[9px] font-black uppercase tracking-widest rounded-xl border border-primary/30 bg-primary/10 text-primary cursor-pointer active:scale-95"
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
            <span>Schedule</span>
          </button>
        </div>

        {tasksLoading ? (
          <div className="flex py-6 justify-center items-center gap-2">
            <span className="w-4 h-4 rounded-full border border-t-transparent animate-spin border-primary" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Syncing agenda...</span>
          </div>
        ) : selectedDayTasks.length === 0 ? (
          <div className="py-8 text-center bg-secondary/25 border border-dashed border-border rounded-xl">
            <span className="text-xs font-bold text-foreground block">Agenda is completely clear</span>
            <span className="text-[9px] text-muted-foreground mt-0.5 block">No tasks scheduled for this day.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayTasks.map((task) => {
              const isDone = task.status === 'done';
              const priorityColor = PRIORITY_CONFIG[task.priority]?.color || '#52525b';
              const projName = task.projectId ? projectMap.get(task.projectId) : null;
              
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs",
                    isDone 
                      ? "border-border bg-secondary/20 opacity-50 line-through" 
                      : "bg-surface/90 dark:bg-surface/50 border-border hover:border-primary/30 hover:bg-secondary/40"
                  )}
                  style={!isDone ? { borderLeft: `3px solid ${priorityColor}` } : undefined}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={(e) => handleToggleTaskStatus(e, task)}
                      className={cn(
                        "h-5 w-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                        isDone ? "border-emerald-500 bg-emerald-500/15 text-emerald-500" : "border-border bg-secondary"
                      )}
                    >
                      {isDone && <Check className="h-3 w-3 stroke-[2.5]" />}
                    </button>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-foreground block truncate">{task.title}</span>
                      {projName && (
                        <span className="text-[8px] font-black text-primary uppercase mt-0.5 block tracking-widest">
                          {projName}
                        </span>
                      )}
                    </div>
                  </div>

                  {task.assigneeIds.length > 0 && (
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[8px] text-white shrink-0 border border-border-default/40"
                      style={{
                        background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)`,
                      }}
                    >
                      {(() => {
                        const aMem = memberMap.get(task.assigneeIds[0]);
                        return (aMem?.fullName || aMem?.username || '?')[0].toUpperCase();
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Daily Hourly Time Blocks scheduler widget */}
      <div className="aether-glass p-4 sm:p-5 space-y-4 bg-surface/85 dark:bg-surface/50 border border-border dark:border-border-strong shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-2.5">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Day Schedule Blocking
          </span>
        </div>

        <div className="divide-y divide-border space-y-0.5">
          {hours.map(({ value, label }) => {
            const block = timeBlocks.find(
              (b) => b.dateStr === format(selectedDate, 'yyyy-MM-dd') && b.hour === value
            );
            const isEditing = editingBlockHour === value;

            return (
              <div key={value} className="flex items-center gap-3.5 py-3.5 first:pt-1">
                <span className="w-14 text-[9px] font-black text-muted-foreground tracking-wider text-right uppercase shrink-0">
                  {label}
                </span>

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex flex-col gap-2 bg-secondary/50 border border-border p-2.5 rounded-xl shadow-xs">
                      <input
                        type="text"
                        placeholder="Block title..."
                        value={newBlockTitle}
                        onChange={(e) => setNewBlockTitle(e.target.value)}
                        className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground font-bold focus:outline-none focus:border-primary"
                      />
                      <div className="flex gap-1">
                        {['focus', 'meeting', 'review', 'routine'].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setNewBlockCategory(cat as any)}
                            className={cn(
                              "flex-1 py-1 rounded border text-[8px] font-black uppercase tracking-wider capitalize",
                              newBlockCategory === cat 
                                ? "border-primary bg-primary/10 text-primary" 
                                : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1.5 justify-end mt-1.5">
                        <button
                          onClick={() => setEditingBlockHour(null)}
                          className="px-2.5 py-1 rounded text-[8px] font-black text-muted-foreground hover:text-foreground cursor-pointer bg-secondary border border-border"
                        >
                          CANCEL
                        </button>
                        <button
                          onClick={() => handleAddTimeBlock(value)}
                          className="px-3 py-1 rounded bg-primary text-white text-[8px] font-black cursor-pointer shadow-md"
                        >
                          SAVE
                        </button>
                      </div>
                    </div>
                  ) : block ? (
                    <div className={cn("px-3.5 py-2 rounded-xl border flex items-center justify-between shadow-xs animate-fluid-pop", block.color)}>
                      <div className="min-w-0">
                        <span className="text-xs font-black block leading-none">{block.title}</span>
                        <span className="text-[8px] font-bold block uppercase tracking-widest mt-1 opacity-80">
                          {block.category} block
                        </span>
                      </div>
                      <button 
                        onClick={() => handleDeleteTimeBlock(block.id)}
                        className="h-6 w-6 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 dark:text-red-400 cursor-pointer hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingBlockHour(value);
                        setNewBlockTitle('');
                      }}
                      className="w-full py-2.5 text-center text-[9px] font-black text-muted-foreground border border-dashed border-border bg-transparent hover:bg-secondary/40 hover:text-foreground transition-all rounded-xl cursor-pointer"
                    >
                      + ADD TIME BLOCK SLOT
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Creation Modal */}
      {createModalOpen && orgId && (
        <CreateTaskModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          orgId={orgId}
          actor={actor}
          defaultDueDate={createModalDate}
        />
      )}

      {/* Task Detail Slide-up Sheet */}
      {selectedTask && orgId && (
        <TaskDetailDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          orgId={orgId}
          actor={actor}
          members={members}
          projects={projects}
          goals={goals}
        />
      )}

    </div>
  );
}
export default MobileCalendar;
