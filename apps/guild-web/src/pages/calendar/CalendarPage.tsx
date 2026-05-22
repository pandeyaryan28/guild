/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Filter, 
  Check, 
  CheckSquare, 
  Square, 
  User, 
  Folder, 
  Tag, 
  AlertCircle, 
  X, 
  Clock, 
  Calendar, 
  CalendarDays, 
  SlidersHorizontal,
  Layers,
  Trash2,
  ListTodo
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
import { useAuth } from '../../hooks/useAuth';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { useOrgMembers } from '../../hooks/useChat';
import { useTaskLabels } from '../../hooks/useTasks';
import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { TaskDetailPanel } from '../tasks/TaskDetailPanel';
import { moveTask, STATUS_CONFIG, PRIORITY_CONFIG } from '../../lib/tasks';
import type { Task, TaskPriority, TaskStatus } from '../../lib/tasks';
import { cn } from '@/lib/utils';

// Time Blocking schedule interface
interface TimeBlock {
  id: string;
  dateStr: string;
  hour: string; // e.g. "09:00"
  title: string;
  description?: string;
  color?: string;
}

export function CalendarPage() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const actor = React.useMemo(() => ({
    uid: userProfile?.uid || '',
    name: userProfile?.fullName || 'Anonymous',
  }), [userProfile]);
  const actorName = userProfile?.username || 'user';

  // State
  const [activeView, setActiveView] = React.useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [mobileSelectedDate, setMobileSelectedDate] = React.useState<Date>(new Date());
  
  // Modals & Drawers
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [createModalDate, setCreateModalDate] = React.useState<string>('');

  // Filters State
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedProjectId, setSelectedProjectId] = React.useState('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = React.useState('all');
  const [selectedPriority, setSelectedPriority] = React.useState('all');
  const [selectedStatus, setSelectedStatus] = React.useState('all');
  const [showFilters, setShowFilters] = React.useState(false);

  // Hourly Time-Blocking Schedule State
  const [timeBlocks, setTimeBlocks] = React.useState<TimeBlock[]>([]);
  const [editingBlockHour, setEditingBlockHour] = React.useState<string | null>(null);
  const [newBlockTitle, setNewBlockTitle] = React.useState('');

  // Data fetching
  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { projects } = useProjects(orgId);
  const members = useOrgMembers(orgId);
  const labels = useTaskLabels(orgId);

  // Load Time Blocks from LocalStorage on mount & org change
  React.useEffect(() => {
    if (!orgId) return;
    const key = `guild_calendar_timeblocks_${orgId}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setTimeBlocks(JSON.parse(stored));
      } else {
        setTimeBlocks([]);
      }
    } catch (e) {
      console.error('Failed to load timeblocks', e);
    }
  }, [orgId]);

  // Save Time Blocks helper
  const saveTimeBlocks = (blocks: TimeBlock[]) => {
    if (!orgId) return;
    const key = `guild_calendar_timeblocks_${orgId}`;
    try {
      localStorage.setItem(key, JSON.stringify(blocks));
      setTimeBlocks(blocks);
    } catch (e) {
      console.error('Failed to save timeblocks', e);
    }
  };

  // Helper: Retrieve Task's actual Date object safely
  const getTaskDate = React.useCallback((task: Task): Date | null => {
    if (!task.dueDate) return null;
    if (typeof task.dueDate.toDate === 'function') {
      return task.dueDate.toDate();
    }
    if (task.dueDate instanceof Date) return task.dueDate;
    if ((task.dueDate as any).seconds) return new Date((task.dueDate as any).seconds * 1000);
    return new Date(task.dueDate as any);
  }, []);

  // Filter Tasks
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) {
        return false;
      }
      if (selectedAssigneeId !== 'all' && !t.assigneeIds.includes(selectedAssigneeId)) {
        return false;
      }
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) {
        return false;
      }
      if (selectedStatus !== 'all' && t.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [tasks, searchQuery, selectedProjectId, selectedAssigneeId, selectedPriority, selectedStatus]);

  // Navigate Date
  const handlePrev = () => {
    if (activeView === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (activeView === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (activeView === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (activeView === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setMobileSelectedDate(now);
  };

  // Toggle status checkbox handler
  const handleToggleTaskStatus = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (!orgId) return;
    const oldStatus = task.status;
    const newStatus: TaskStatus = oldStatus === 'done' ? 'todo' : 'done';
    try {
      await moveTask(task.id, orgId, newStatus, task.orderIndex || 1000, oldStatus, actor);
    } catch (err) {
      console.error('Failed to toggle task status', err);
    }
  };

  // Open task creator modal with due date set
  const handleQuickAddClick = (date: Date) => {
    const formatted = format(date, 'yyyy-MM-dd');
    setCreateModalDate(formatted);
    setCreateModalOpen(true);
  };

  // Time-Blocking hourly planner handles
  const handleAddTimeBlock = (hour: string) => {
    if (!newBlockTitle.trim() || !orgId) return;
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    
    // Aesthetic color selection based on hours to diversify look
    const colors = [
      'bg-blue-500/10 border-blue-500/30 text-blue-400',
      'bg-purple-500/10 border-purple-500/30 text-purple-400',
      'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
      'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      'bg-pink-500/10 border-pink-500/30 text-pink-400',
      'bg-amber-500/10 border-amber-500/30 text-amber-400',
    ];
    const hourInt = parseInt(hour.split(':')[0]);
    const chosenColor = colors[hourInt % colors.length];

    const newBlock: TimeBlock = {
      id: Math.random().toString(36).substring(2, 9),
      dateStr,
      hour,
      title: newBlockTitle.trim(),
      color: chosenColor,
    };

    saveTimeBlocks([...timeBlocks, newBlock]);
    setNewBlockTitle('');
    setEditingBlockHour(null);
  };

  const handleDeleteTimeBlock = (id: string) => {
    saveTimeBlocks(timeBlocks.filter((b) => b.id !== id));
  };

  // Render variables
  const projectMap = React.useMemo(() => {
    const m = new Map<string, string>();
    projects.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [projects]);

  const memberMap = React.useMemo(() => {
    const m = new Map<string, any>();
    members.forEach((mem) => m.set(mem.uid, mem));
    return m;
  }, [members]);

  // Hourly timeline slots
  const hourlyTimelineHours = Array.from({ length: 13 }, (_, i) => {
    const hr = i + 8; // 8:00 to 20:00 (8 AM to 8 PM)
    const formatted = hr < 10 ? `0${hr}:00` : `${hr}:00`;
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr > 12 ? hr - 12 : hr;
    return {
      value: formatted,
      label: `${displayHr}:00 ${ampm}`,
    };
  });

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-background">
      {/* ── Main Work Area ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden px-4 py-4 md:px-8 md:py-6">
        
        {/* ── Glassmorphic Top Controls Banner ─────────────────────────────── */}
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border-default/40 bg-surface/50 p-4 backdrop-blur-md md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {/* View Icons / Indicator */}
            <div className="hidden rounded-xl bg-primary/10 p-2.5 text-primary md:block">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {activeView === 'month' && format(currentDate, 'MMMM yyyy')}
                {activeView === 'week' && `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`}
                {activeView === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h1>
              <p className="text-xs text-muted-foreground">
                Real-time task scheduling & interactive agenda planner
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Navigation button deck */}
            <div className="flex items-center rounded-xl border border-border-default bg-bg-secondary p-1">
              <button 
                onClick={handlePrev} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground transition-all"
                title="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={handleToday} 
                className="px-3 py-1 text-xs font-semibold text-foreground hover:bg-surface rounded-lg transition-all"
              >
                Today
              </button>
              <button 
                onClick={handleNext} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground transition-all"
                title="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* View Switcher Deck */}
            <div className="flex items-center rounded-xl border border-border-default bg-bg-secondary p-1">
              {(['month', 'week', 'day'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all",
                    activeView === view 
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {view}
                </button>
              ))}
            </div>

            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all",
                showFilters 
                  ? "border-primary/50 bg-primary/10 text-primary" 
                  : "border-border-default bg-bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filters</span>
            </button>

            {/* Quick add task */}
            <button
              onClick={() => handleQuickAddClick(new Date())}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/15 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* ── Filters Expandable Bar ───────────────────────────────────────── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border-default/40 bg-surface/30 p-4 backdrop-blur-sm sm:grid-cols-2 md:grid-cols-5">
                
                {/* Search query */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-bg-secondary py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-2.5 flex items-center text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Project Filter */}
                <div className="flex items-center gap-1.5 rounded-xl border border-border-default bg-bg-secondary px-2.5 py-1">
                  <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-transparent text-xs text-foreground outline-none border-none py-1 cursor-pointer"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Assignee Filter */}
                <div className="flex items-center gap-1.5 rounded-xl border border-border-default bg-bg-secondary px-2.5 py-1">
                  <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    className="w-full bg-transparent text-xs text-foreground outline-none border-none py-1 cursor-pointer"
                  >
                    <option value="all">All Assignees</option>
                    {members.map((m) => (
                      <option key={m.uid} value={m.uid}>{m.fullName || m.username}</option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="flex items-center gap-1.5 rounded-xl border border-border-default bg-bg-secondary px-2.5 py-1">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full bg-transparent text-xs text-foreground outline-none border-none py-1 cursor-pointer"
                  >
                    <option value="all">All Priorities</option>
                    {Object.entries(PRIORITY_CONFIG).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 rounded-xl border border-border-default bg-bg-secondary px-2.5 py-1">
                  <ListTodo className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-transparent text-xs text-foreground outline-none border-none py-1 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Calendar Workspaces Grid ──────────────────────────────────────── */}
        <div className="flex-1 min-h-0 bg-surface/20 rounded-3xl border border-border-default/40 overflow-hidden shadow-inner">
          {tasksLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-xs text-muted-foreground font-medium animate-pulse">Syncing calendar tasks...</p>
              </div>
            </div>
          ) : (
            <div className="h-full w-full overflow-hidden">
              
              {/* ── MONTH VIEW ── */}
              {activeView === 'month' && (
                <div className="h-full w-full flex flex-col overflow-hidden">
                  {/* Grid Weekday Headers */}
                  <div className="grid grid-cols-7 border-b border-border-default bg-bg-secondary/40 text-center py-2 px-1">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <span key={day} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Days grid container */}
                  <div className="flex-1 grid grid-cols-7 overflow-y-auto custom-scrollbar md:grid-rows-6">
                    {(() => {
                      const monthStartDay = startOfMonth(currentDate);
                      const monthEndDay = endOfMonth(monthStartDay);
                      // Start on Monday (weekStartsOn: 1)
                      const gridStartDay = startOfWeek(monthStartDay, { weekStartsOn: 1 });
                      const gridEndDay = endOfWeek(monthEndDay, { weekStartsOn: 1 });
                      const allDays = eachDayOfInterval({ start: gridStartDay, end: gridEndDay });

                      // On mobile we also render a horizontal selector or micro-grid. 
                      // Let's implement full desktop calendar cells, which compress elegantly.
                      return allDays.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isDayToday = isToday(day);
                        const isMobileSelected = isSameDay(day, mobileSelectedDate);
                        
                        // Filter tasks matching this day's due date
                        const dayTasks = filteredTasks.filter((t) => {
                          const due = getTaskDate(t);
                          return due && isSameDay(due, day);
                        });

                        return (
                          <div
                            key={day.toString()}
                            onClick={() => {
                              setMobileSelectedDate(day);
                              // On double click we can open, or just click on mobile
                              if (window.innerWidth < 768) {
                                setMobileSelectedDate(day);
                              }
                            }}
                            className={cn(
                              "relative group min-h-[90px] border-b border-r border-border-default/40 p-1 md:p-2 flex flex-col cursor-pointer transition-all hover:bg-bg-secondary/20",
                              !isCurrentMonth && "bg-bg-primary/10 opacity-30",
                              isDayToday && "bg-primary/5 shadow-inner",
                              isMobileSelected && "ring-2 ring-primary ring-inset md:ring-0 bg-primary/5"
                            )}
                          >
                            {/* Day number cell header */}
                            <div className="flex items-center justify-between mb-1.5">
                              <span
                                className={cn(
                                  "flex h-5 w-5 items-center justify-center text-[11px] font-bold rounded-full transition-all",
                                  isDayToday && "bg-primary text-primary-foreground",
                                  !isDayToday && isCurrentMonth && "text-foreground",
                                  !isDayToday && !isCurrentMonth && "text-muted-foreground",
                                  isMobileSelected && !isDayToday && "bg-primary/20 text-primary font-extrabold"
                                )}
                              >
                                {format(day, 'd')}
                              </span>

                              {/* Hover quick add button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAddClick(day);
                                }}
                                className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-4.5 w-4.5 rounded bg-bg-secondary hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-all duration-200"
                                title="Quick Create Task"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            {/* Task item stack inside day cell */}
                            <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-0.5">
                              {/* Mobile view dots indicator (to avoid massive squeeze on tiny phones) */}
                              <div className="flex md:hidden flex-wrap gap-0.5 justify-center mt-1">
                                {dayTasks.slice(0, 3).map((t) => (
                                  <span 
                                    key={t.id} 
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: STATUS_CONFIG[t.status]?.dot || '#a1a1aa' }} 
                                  />
                                ))}
                                {dayTasks.length > 3 && (
                                  <span className="text-[7px] text-muted-foreground font-bold font-mono">+</span>
                                )}
                              </div>

                              {/* Desktop detailed cards */}
                              <div className="hidden md:block space-y-1">
                                {dayTasks.map((task) => {
                                  const isDone = task.status === 'done';
                                  const priorityColor = PRIORITY_CONFIG[task.priority]?.color || '#52525b';
                                  
                                  return (
                                    <div
                                      key={task.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTask(task);
                                      }}
                                      className={cn(
                                        "group/card flex items-center justify-between rounded-lg border border-border-default/60 bg-card p-1.5 text-left transition-all hover:bg-bg-secondary hover:border-border-default hover:shadow-sm",
                                        isDone && "opacity-55"
                                      )}
                                      style={{ borderLeft: `3px solid ${priorityColor}` }}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <button
                                          onClick={(e) => handleToggleTaskStatus(e, task)}
                                          className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                                        >
                                          {isDone ? (
                                            <CheckSquare className="h-3 w-3 text-emerald-400" />
                                          ) : (
                                            <Square className="h-3 w-3" />
                                          )}
                                        </button>
                                        <span className={cn(
                                          "truncate text-[10px] font-medium text-foreground",
                                          isDone && "line-through text-muted-foreground"
                                        )}>
                                          {task.title}
                                        </span>
                                      </div>

                                      {/* Assignee miniature initials */}
                                      {task.assigneeIds.length > 0 && (
                                        <div className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-[7px] font-bold text-primary">
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
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Responsive Mobile Agenda list below the grid */}
                  <div className="block md:hidden border-t border-border-default bg-bg-secondary/30 p-3 h-[180px] overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Agenda for {format(mobileSelectedDate, 'MMM d, yyyy')}
                      </h4>
                      <button
                        onClick={() => handleQuickAddClick(mobileSelectedDate)}
                        className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                      >
                        <Plus className="h-3 w-3" /> Add Task
                      </button>
                    </div>

                    {(() => {
                      const agendaTasks = filteredTasks.filter((t) => {
                        const due = getTaskDate(t);
                        return due && isSameDay(due, mobileSelectedDate);
                      });

                      if (agendaTasks.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-6">
                            <Check className="h-5 w-5 text-muted-foreground/60 mb-1" />
                            <p className="text-[10px] text-muted-foreground">No tasks scheduled today.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {agendaTasks.map((task) => (
                            <div
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className="flex items-center justify-between p-2.5 rounded-xl border border-border-default/60 bg-card hover:bg-bg-secondary transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => handleToggleTaskStatus(e, task)}
                                  className="text-muted-foreground hover:text-primary"
                                >
                                  {task.status === 'done' ? (
                                    <CheckSquare className="h-4.5 w-4.5 text-emerald-400" />
                                  ) : (
                                    <Square className="h-4.5 w-4.5" />
                                  )}
                                </button>
                                <span className={cn(
                                  "text-xs font-medium text-foreground",
                                  task.status === 'done' && "line-through text-muted-foreground"
                                )}>
                                  {task.title}
                                </span>
                              </div>
                              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-bg-secondary text-muted-foreground">
                                {task.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* ── WEEK VIEW ── */}
              {activeView === 'week' && (
                <div className="h-full w-full flex flex-col md:flex-row overflow-x-auto overflow-y-hidden custom-scrollbar divide-y md:divide-y-0 md:divide-x divide-border-default/40">
                  {(() => {
                    const weekStartDay = startOfWeek(currentDate, { weekStartsOn: 1 });
                    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStartDay, i));

                    return weekDays.map((day) => {
                      const dayTasks = filteredTasks.filter((t) => {
                        const due = getTaskDate(t);
                        return due && isSameDay(due, day);
                      });
                      const isDayToday = isToday(day);

                      return (
                        <div 
                          key={day.toString()} 
                          className={cn(
                            "flex-1 min-w-[200px] flex flex-col min-h-[140px] md:h-full bg-surface/5 overflow-hidden",
                            isDayToday && "bg-primary/[0.02]"
                          )}
                        >
                          {/* Column Header */}
                          <div className={cn(
                            "p-3 border-b border-border-default/40 flex items-center justify-between flex-shrink-0 bg-bg-secondary/20",
                            isDayToday && "bg-primary/5"
                          )}>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs font-bold text-foreground">{format(day, 'EEEE')}</span>
                              <span className={cn(
                                "text-[10px] font-semibold rounded px-1.5 py-0.2",
                                isDayToday ? "bg-primary text-primary-foreground font-extrabold" : "text-muted-foreground"
                              )}>
                                {format(day, 'MMM d')}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground/60 rounded bg-bg-secondary px-1.5">
                              {dayTasks.length}
                            </span>
                          </div>

                          {/* Cards Area */}
                          <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-2">
                            {dayTasks.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                <Check className="h-5 w-5 text-muted-foreground mb-1" />
                                <span className="text-[10px] text-muted-foreground font-medium">Clear schedule</span>
                              </div>
                            ) : (
                              dayTasks.map((task) => {
                                const isDone = task.status === 'done';
                                const priorityColor = PRIORITY_CONFIG[task.priority]?.color || '#52525b';
                                const projName = task.projectId ? projectMap.get(task.projectId) : null;
                                
                                return (
                                  <div
                                    key={task.id}
                                    onClick={() => setSelectedTask(task)}
                                    className={cn(
                                      "group flex flex-col gap-2 rounded-xl border border-border-default/60 bg-card p-3 text-left transition-all hover:bg-bg-secondary hover:border-border-default hover:shadow-sm cursor-pointer",
                                      isDone && "opacity-50"
                                    )}
                                    style={{ borderLeft: `4px solid ${priorityColor}` }}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="flex items-start gap-2">
                                        <button
                                          onClick={(e) => handleToggleTaskStatus(e, task)}
                                          className="mt-0.5 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                                        >
                                          {isDone ? (
                                            <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                                          ) : (
                                            <Square className="h-3.5 w-3.5" />
                                          )}
                                        </button>
                                        <span className={cn(
                                          "text-xs font-semibold leading-tight text-foreground",
                                          isDone && "line-through text-muted-foreground"
                                        )}>
                                          {task.title}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Footer items */}
                                    <div className="flex items-center justify-between mt-1 text-[9px] text-muted-foreground">
                                      <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                                        {projName && (
                                          <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary truncate max-w-[80px]">
                                            {projName}
                                          </span>
                                        )}
                                        <span className="capitalize">{task.priority}</span>
                                      </div>

                                      {/* Assignees avatars list */}
                                      {task.assigneeIds.length > 0 && (
                                        <div className="flex gap-0.5">
                                          {task.assigneeIds.slice(0, 2).map((uid) => {
                                            const aMem = memberMap.get(uid);
                                            const initials = (aMem?.fullName || aMem?.username || '?')[0].toUpperCase();
                                            return (
                                              <div 
                                                key={uid} 
                                                className="h-4.5 w-4.5 rounded-full bg-primary/20 flex items-center justify-center text-[7px] font-bold text-primary ring-1 ring-background"
                                                title={aMem?.fullName || aMem?.username}
                                              >
                                                {initials}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Quick create button at bottom of col */}
                          <div className="p-2 border-t border-border-default/40 flex-shrink-0 bg-bg-secondary/10">
                            <button
                              onClick={() => handleQuickAddClick(day)}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-border-default/80 rounded-lg text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-bg-secondary hover:border-border-default transition-all"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add Task</span>
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* ── DAY VIEW & TIME BLOCKING AGENDA ── */}
              {activeView === 'day' && (
                <div className="h-full w-full flex flex-col md:flex-row overflow-y-auto md:overflow-hidden custom-scrollbar">
                  
                  {/* Left Column: Detailed Agenda List */}
                  <div className="w-full md:w-1/2 flex flex-col h-[400px] md:h-full border-b md:border-b-0 md:border-r border-border-default/40 overflow-hidden bg-bg-primary/5">
                    <div className="p-4 border-b border-border-default/40 bg-bg-secondary/20 flex-shrink-0 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ListTodo className="h-4.5 w-4.5 text-primary" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Tasks Due Today</h3>
                      </div>
                      <span className="text-[10px] font-extrabold rounded-full px-2 py-0.5 bg-primary/10 text-primary">
                        {(() => {
                          const todayTasks = filteredTasks.filter((t) => {
                            const due = getTaskDate(t);
                            return due && isSameDay(due, currentDate);
                          });
                          return todayTasks.length;
                        })()}
                      </span>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
                      {(() => {
                        const todayTasks = filteredTasks.filter((t) => {
                          const due = getTaskDate(t);
                          return due && isSameDay(due, currentDate);
                        });

                        if (todayTasks.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center h-48 opacity-45">
                              <CheckSquare className="h-8 w-8 text-muted-foreground mb-2" />
                              <h4 className="text-xs font-semibold text-foreground">All clear for today!</h4>
                              <p className="text-[10px] text-muted-foreground text-center max-w-[200px] mt-0.5">
                                No workspace tasks are due on this date. Block out hours on the planner!
                              </p>
                            </div>
                          );
                        }

                        return todayTasks.map((task) => {
                          const isDone = task.status === 'done';
                          const priorityColor = PRIORITY_CONFIG[task.priority]?.color || '#52525b';
                          const projName = task.projectId ? projectMap.get(task.projectId) : null;
                          
                          return (
                            <div
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className={cn(
                                "flex flex-col gap-2 p-3.5 rounded-2xl border border-border-default/60 bg-card hover:bg-bg-secondary/40 transition-all cursor-pointer",
                                isDone && "opacity-55"
                              )}
                              style={{ borderLeft: `4px solid ${priorityColor}` }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                  <button
                                    onClick={(e) => handleToggleTaskStatus(e, task)}
                                    className="mt-0.5 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                                  >
                                    {isDone ? (
                                      <CheckSquare className="h-4 w-4 text-emerald-400" />
                                    ) : (
                                      <Square className="h-4 w-4" />
                                    )}
                                  </button>
                                  <div className="text-left">
                                    <h4 className={cn(
                                      "text-xs font-semibold leading-normal text-foreground",
                                      isDone && "line-through text-muted-foreground"
                                    )}>
                                      {task.title}
                                    </h4>
                                    {task.description && (
                                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Footer details */}
                              <div className="flex items-center justify-between border-t border-border-default/20 pt-2 mt-1 text-[9px] text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  {projName && (
                                    <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-medium">
                                      {projName}
                                    </span>
                                  )}
                                  <span className="capitalize font-semibold">{task.priority} Priority</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span className="capitalize">{task.status}</span>
                                  {task.assigneeIds.length > 0 && (
                                    <div className="flex gap-0.5">
                                      {task.assigneeIds.map((uid) => {
                                        const aMem = memberMap.get(uid);
                                        return (
                                          <div 
                                            key={uid}
                                            className="h-4.5 w-4.5 rounded-full bg-primary/25 text-primary text-[7px] font-bold flex items-center justify-center ring-1 ring-background"
                                            title={aMem?.fullName || aMem?.username}
                                          >
                                            {(aMem?.fullName || aMem?.username || '?')[0].toUpperCase()}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Time-Blocking Hourly Planner */}
                  <div className="w-full md:w-1/2 flex flex-col h-[500px] md:h-full overflow-hidden bg-surface/5">
                    <div className="p-4 border-b border-border-default/40 bg-bg-secondary/20 flex-shrink-0 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4.5 w-4.5 text-indigo-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Hourly Day Schedule</h3>
                      </div>
                      <span className="text-[10px] font-extrabold rounded-full px-2 py-0.5 bg-indigo-500/10 text-indigo-400">
                        Planner
                      </span>
                    </div>

                    {/* Hourly block scroll area */}
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
                      {hourlyTimelineHours.map((slot) => {
                        const dateStr = format(currentDate, 'yyyy-MM-dd');
                        
                        // Check if an event exists for this slot on active date
                        const block = timeBlocks.find((b) => b.dateStr === dateStr && b.hour === slot.value);
                        const isEditing = editingBlockHour === slot.value;

                        return (
                          <div 
                            key={slot.value} 
                            className="flex items-start gap-4 p-1 rounded-xl hover:bg-bg-secondary/15 transition-all"
                          >
                            {/* Time Label column */}
                            <div className="w-16 pt-1 flex-shrink-0 text-right">
                              <span className="text-[10px] font-bold tracking-tight text-muted-foreground font-mono">
                                {slot.label}
                              </span>
                            </div>

                            {/* Slot timeline grid content */}
                            <div className="flex-1 min-w-0">
                              {block ? (
                                // Planned Hour Event Card
                                <div className={cn(
                                  "group/block flex items-center justify-between rounded-xl border p-2.5 shadow-sm text-left relative overflow-hidden transition-all hover:shadow-md",
                                  block.color || 'bg-bg-secondary border-border-default text-foreground'
                                )}>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-bold leading-tight truncate">{block.title}</h4>
                                    <p className="text-[9px] opacity-70 mt-0.5">Scheduled Dayblock</p>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteTimeBlock(block.id)}
                                    className="opacity-0 group-hover/block:opacity-100 p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all flex-shrink-0 z-10"
                                    title="Delete block"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                  {/* Decorative visual sidebar block */}
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400 opacity-60" />
                                </div>
                              ) : isEditing ? (
                                // Time-block create Form
                                <div className="p-2 border border-primary/50 bg-bg-secondary rounded-xl flex items-center gap-2">
                                  <input
                                    autoFocus
                                    type="text"
                                    placeholder="Enter schedule detail (e.g. Design sync)..."
                                    value={newBlockTitle}
                                    onChange={(e) => setNewBlockTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleAddTimeBlock(slot.value);
                                      if (e.key === 'Escape') setEditingBlockHour(null);
                                    }}
                                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none border-none py-0.5"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleAddTimeBlock(slot.value)}
                                      className="h-6 px-2.5 rounded bg-primary text-[10px] font-bold text-primary-foreground hover:bg-primary/95 transition-all"
                                    >
                                      Block
                                    </button>
                                    <button
                                      onClick={() => setEditingBlockHour(null)}
                                      className="h-6 p-1 text-muted-foreground hover:text-foreground"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // Blank Slot button trigger
                                <button
                                  onClick={() => {
                                    setNewBlockTitle('');
                                    setEditingBlockHour(slot.value);
                                  }}
                                  className="w-full text-left py-3 px-3.5 border border-dashed border-border-default/40 rounded-xl text-[10px] font-bold text-muted-foreground/60 hover:text-primary hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center gap-1.5 group"
                                >
                                  <Plus className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <span>+ Add Timeblock</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}
        </div>

      </div>

      {/* ── Task Details sliding panel ──────────────────────────────────────── */}
      <div
        className={cn(
          'border-border-default bg-card overflow-hidden transition-all duration-300 ease-in-out border-l flex-shrink-0 z-40',
          'fixed inset-y-0 right-0 md:relative md:inset-auto',
          selectedTask 
            ? 'w-full translate-x-0 md:w-[420px] md:translate-x-0' 
            : 'w-0 translate-x-full md:w-0 md:translate-x-0'
        )}
      >
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            orgId={orgId}
            actor={actor}
            authorUsername={actorName}
          />
        )}
      </div>

      {/* ── Create Task dialog modal ───────────────────────────────────────── */}
      <CreateTaskModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        orgId={orgId || ''}
        actor={actor}
        labels={labels}
        defaultDueDate={createModalDate}
      />

    </div>
  );
}
