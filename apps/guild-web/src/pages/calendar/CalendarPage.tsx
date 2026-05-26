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
  
  // Day Flyout State
  const [activeDayFlyout, setActiveDayFlyout] = React.useState<Date | null>(null);
  
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
    <div className="flex-grow flex flex-col min-h-0 overflow-hidden w-full h-full bg-transparent">
      {/* ── Main Work Area ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden px-4 py-4 md:px-8 md:py-6">
        
        {/* ── Glassmorphic Top Controls Banner ─────────────────────────────── */}
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/2 p-3.5 backdrop-blur-xl md:flex-row md:items-center md:justify-between shadow-lg">
          <div className="flex items-center gap-3">
            {/* View Icons / Indicator */}
            <div className="hidden rounded-xl bg-primary/10 p-2.5 text-primary md:block" style={{ background: 'oklch(from var(--accent) l c h / 10%)', color: 'var(--accent)' }}>
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
            <div className="flex items-center rounded-xl border border-white/5 bg-white/5 p-0.5">
              <button 
                onClick={handlePrev} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all cursor-pointer"
                title="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={handleToday} 
                className="px-3 py-1 text-xs font-semibold text-foreground hover:bg-white/5 rounded-lg transition-all cursor-pointer"
              >
                Today
              </button>
              <button 
                onClick={handleNext} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all cursor-pointer"
                title="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* View Switcher Deck */}
            <div className="flex items-center rounded-xl border border-white/5 bg-white/5 p-0.5">
              {(['month', 'week', 'day'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer",
                    activeView === view 
                      ? "shadow-md shadow-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                  style={activeView === view ? { background: 'var(--accent)', color: 'var(--accent-foreground)' } : {}}
                >
                  {view}
                </button>
              ))}
            </div>

            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer",
                showFilters 
                  ? "border-primary/40 text-primary" 
                  : "border-white/5 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10"
              )}
              style={showFilters ? { background: 'oklch(from var(--accent) l c h / 15%)', borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filters</span>
            </button>

            {/* Quick add task */}
            <button
              onClick={() => handleQuickAddClick(new Date())}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
              style={{
                background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.12) c h) 100%)`,
                boxShadow: `0 8px 20px oklch(from var(--accent) l c h / 20%)`
              }}
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
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden mb-4"
            >
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/5 bg-white/3 p-4 backdrop-blur-xl sm:grid-cols-2 md:grid-cols-5 shadow-lg">
                
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
                    className="w-full rounded-xl border border-white/5 bg-white/5 py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none hover:bg-white/10 hover:border-white/10 focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-2.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Project Filter */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-3 py-1 hover:bg-white/10 hover:border-white/10 focus-within:border-primary/30 transition-all">
                  <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-transparent text-xs text-foreground outline-none border-none py-1.5 cursor-pointer"
                  >
                    <option value="all" className="bg-surface text-foreground">All Projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-surface text-foreground">{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Assignee Filter */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-3 py-1 hover:bg-white/10 hover:border-white/10 focus-within:border-primary/30 transition-all">
                  <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    className="w-full bg-transparent text-xs text-foreground outline-none border-none py-1.5 cursor-pointer"
                  >
                    <option value="all" className="bg-surface text-foreground">All Assignees</option>
                    {members.map((m) => (
                      <option key={m.uid} value={m.uid} className="bg-surface text-foreground">{m.fullName || m.username}</option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-3 py-1 hover:bg-white/10 hover:border-white/10 focus-within:border-primary/30 transition-all">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full bg-transparent text-xs text-foreground outline-none border-none py-1.5 cursor-pointer"
                  >
                    <option value="all" className="bg-surface text-foreground">All Priorities</option>
                    {Object.entries(PRIORITY_CONFIG).map(([key, value]) => (
                      <option key={key} value={key} className="bg-surface text-foreground">{value.label}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-3 py-1 hover:bg-white/10 hover:border-white/10 focus-within:border-primary/30 transition-all">
                  <ListTodo className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-transparent text-xs text-foreground outline-none border-none py-1.5 cursor-pointer"
                  >
                    <option value="all" className="bg-surface text-foreground">All Statuses</option>
                    {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                      <option key={key} value={key} className="bg-surface text-foreground">{value.label}</option>
                    ))}
                  </select>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Calendar Workspaces Grid ──────────────────────────────────────── */}
        <div className="flex-1 min-h-0 aether-glass overflow-hidden shadow-2xl flex flex-col">
          {tasksLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4" style={{ borderColor: 'oklch(from var(--accent) l c h / 10%)', borderTopColor: 'var(--accent)' }} />
                <p className="text-xs text-muted-foreground font-medium animate-pulse">Syncing calendar tasks...</p>
              </div>
            </div>
          ) : (
            <div className="h-full w-full overflow-hidden flex flex-col">
              
              {/* ── MONTH VIEW ── */}
              {activeView === 'month' && (
                <div className="h-full w-full flex flex-col overflow-hidden">
                  {/* Grid Weekday Headers */}
                  <div className="grid grid-cols-7 border-b border-white/5 bg-white/2 text-center py-2.5 px-1">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <span key={day} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Days grid container */}
                  <div className="flex-1 grid grid-cols-7 overflow-y-auto aether-scroll md:grid-rows-6">
                    {(() => {
                      const monthStartDay = startOfMonth(currentDate);
                      const monthEndDay = endOfMonth(monthStartDay);
                      // Start on Monday (weekStartsOn: 1)
                      const gridStartDay = startOfWeek(monthStartDay, { weekStartsOn: 1 });
                      const gridEndDay = endOfWeek(monthEndDay, { weekStartsOn: 1 });
                      const allDays = eachDayOfInterval({ start: gridStartDay, end: gridEndDay });

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
                              setActiveDayFlyout(day);
                            }}
                            className={cn(
                              "relative group min-h-[95px] border-b border-r border-white/5 p-1.5 md:p-2.5 flex flex-col cursor-pointer transition-all duration-300 hover:bg-white/5",
                              !isCurrentMonth && "bg-white/[0.01] opacity-35",
                              isMobileSelected && "bg-white/2"
                            )}
                          >
                            {/* Today's breathing halo pulse overlay */}
                            {isDayToday && (
                              <motion.div 
                                className="absolute inset-0 pointer-events-none z-0"
                                animate={{
                                  boxShadow: [
                                    '0 0 0 0px oklch(from var(--accent) l c h / 10%)',
                                    '0 0 16px 4px oklch(from var(--accent) l c h / 20%)',
                                    '0 0 0 0px oklch(from var(--accent) l c h / 10%)'
                                  ]
                                }}
                                transition={{
                                  duration: 3,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                                style={{
                                  background: `radial-gradient(circle at center, oklch(from var(--accent) l c h / 6%) 0%, transparent 80%)`,
                                  border: '1px solid oklch(from var(--accent) l c h / 30%)',
                                }}
                              />
                            )}

                            {/* Cell Ambient Breathe Highlight on Hover (Only for Today) */}
                            {isDayToday && (
                              <div 
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                style={{
                                  background: `radial-gradient(circle at center, oklch(from var(--accent) l c h / 12%) 0%, transparent 80%)`
                                }}
                              />
                            )}

                            {/* Day number cell header */}
                            <div className="flex items-center justify-between mb-2 z-10">
                              <span
                                className={cn(
                                  "flex h-6 w-6 items-center justify-center text-[11px] font-bold rounded-full transition-all duration-300",
                                  !isDayToday && isCurrentMonth && "text-foreground hover:bg-white/10",
                                  !isDayToday && !isCurrentMonth && "text-muted-foreground",
                                  isMobileSelected && !isDayToday && "bg-white/10 text-foreground font-extrabold"
                                )}
                                style={isDayToday ? {
                                  background: 'var(--accent)',
                                  color: 'var(--accent-foreground)',
                                  boxShadow: `0 0 12px oklch(from var(--accent) l c h / 40%)`
                                } : undefined}
                              >
                                {format(day, 'd')}
                              </span>

                              {/* Hover quick add button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAddClick(day);
                                }}
                                className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-5 w-5 rounded-lg bg-white/10 hover:bg-white/20 text-foreground hover:scale-105 active:scale-95 transition-all duration-200"
                                title="Quick Create Task"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Task item stack inside day cell */}
                            <div className="flex-1 space-y-1 overflow-y-auto aether-scroll pr-0.5 z-10">
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

                              {/* Desktop compact color-coded strips */}
                              <div className="hidden md:block space-y-1">
                                {dayTasks.slice(0, 3).map((task) => {
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
                                        "flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-semibold transition-all duration-200 truncate cursor-pointer hover:brightness-125 select-none",
                                        isDone && "opacity-40 line-through"
                                      )}
                                      style={{
                                        backgroundColor: `${priorityColor}15`,
                                        borderLeft: `2.5px solid ${priorityColor}`,
                                        color: priorityColor,
                                      }}
                                      title={task.title}
                                    >
                                      <span className="truncate flex-grow text-left">{task.title}</span>
                                    </div>
                                  );
                                })}
                                {dayTasks.length > 3 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMobileSelectedDate(day);
                                      setActiveDayFlyout(day);
                                    }}
                                    className="w-full flex items-center justify-center py-0.5 rounded-md border border-white/5 bg-white/5 hover:bg-white/10 text-[9px] font-bold text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
                                  >
                                    +{dayTasks.length - 3} more
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Responsive Mobile Agenda list below the grid */}
                  <div className="block md:hidden border-t border-white/5 bg-white/2 p-4 h-[180px] overflow-y-auto backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Agenda for {format(mobileSelectedDate, 'MMM d, yyyy')}
                      </h4>
                      <button
                        onClick={() => handleQuickAddClick(mobileSelectedDate)}
                        className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                        style={{ color: 'var(--accent)' }}
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
                            <Check className="h-6 w-6 text-muted-foreground/40 mb-1" />
                            <p className="text-[10px] text-muted-foreground font-semibold">No tasks scheduled today.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {agendaTasks.map((task) => (
                            <div
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-white/2 hover:bg-white/5 transition-all shadow-sm"
                            >
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => handleToggleTaskStatus(e, task)}
                                  className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                >
                                  {task.status === 'done' ? (
                                    <CheckSquare className="h-4.5 w-4.5 text-emerald-400" />
                                  ) : (
                                    <Square className="h-4.5 w-4.5" />
                                  )}
                                </button>
                                <span className={cn(
                                  "text-xs font-bold text-foreground",
                                  task.status === 'done' && "line-through text-muted-foreground"
                                )}>
                                  {task.title}
                                </span>
                              </div>
                              <span 
                                className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-lg border"
                                style={{
                                  backgroundColor: 'oklch(from var(--accent) l c h / 10%)',
                                  borderColor: 'oklch(from var(--accent) l c h / 20%)',
                                  color: 'var(--accent)'
                                }}
                              >
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
                <div className="h-full w-full flex flex-col md:flex-row overflow-x-auto overflow-y-hidden custom-scrollbar divide-y md:divide-y-0 md:divide-x divide-white/5 bg-transparent">
                  {(() => {
                    const weekStartDay = startOfWeek(currentDate, { weekStartsOn: 1 });
                    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStartDay, i));

                    return weekDays.map((day) => {
                      const dayTasks = filteredTasks.filter((t) => {
                        const due = getTaskDate(t);
                        return due && isSameDay(due, day);
                      });
                      const isDayToday = isToday(day);
                      const totalTasks = dayTasks.length;
                      const completedTasks = dayTasks.filter(t => t.status === 'done').length;
                      const percentComplete = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                      return (
                        <div 
                          key={day.toString()} 
                          className={cn(
                            "flex-1 min-w-[220px] flex flex-col min-h-[160px] md:h-full overflow-hidden bg-white/[0.01] hover:bg-white/[0.02] transition-colors duration-300"
                          )}
                        >
                          {/* Top Task Progress density line */}
                          <div className="w-full h-1 bg-white/5 relative overflow-hidden flex-shrink-0">
                            {totalTasks > 0 && (
                              <div 
                                className="h-full transition-all duration-500 ease-out" 
                                style={{ 
                                  width: `${percentComplete}%`, 
                                  background: 'linear-gradient(90deg, var(--accent) 0%, oklch(from var(--accent) calc(l + 0.1) c h) 100%)',
                                  boxShadow: `0 0 8px oklch(from var(--accent) l c h / 30%)`
                                }} 
                              />
                            )}
                          </div>

                          {/* Column Header */}
                          <div className={cn(
                            "p-3.5 border-b border-white/5 flex items-center justify-between flex-shrink-0 bg-white/2",
                            isDayToday && "bg-white/5"
                          )}>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-bold text-foreground">{format(day, 'EEEE')}</span>
                              <span className={cn(
                                "text-[10px] font-bold rounded-lg px-2 py-0.5 transition-all duration-300",
                                isDayToday 
                                  ? "text-white font-extrabold shadow-sm" 
                                  : "text-muted-foreground bg-white/5"
                              )}
                              style={isDayToday ? {
                                background: 'var(--accent)',
                                boxShadow: `0 0 8px oklch(from var(--accent) l c h / 35%)`
                              } : undefined}
                              >
                                {format(day, 'MMM d')}
                              </span>
                            </div>
                            <span className="text-[10px] font-extrabold rounded-lg px-2 py-0.5 border border-white/5 bg-white/5 text-muted-foreground">
                              {dayTasks.length}
                            </span>
                          </div>

                          {/* Cards Area */}
                          <div className="flex-1 p-3.5 overflow-y-auto aether-scroll space-y-2.5">
                            {dayTasks.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-12 opacity-35">
                                <Check className="h-6 w-6 text-muted-foreground mb-1.5" />
                                <span className="text-[10px] text-muted-foreground font-semibold">Clear Schedule</span>
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
                                      "group flex flex-col gap-2.5 rounded-2xl border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10 hover:shadow-md p-3.5 text-left hover:scale-[1.02] transition-all duration-300 cursor-pointer",
                                      isDone && "opacity-50"
                                    )}
                                    style={{ borderLeft: `4px solid ${priorityColor}` }}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="flex items-start gap-2.5">
                                        <button
                                          onClick={(e) => handleToggleTaskStatus(e, task)}
                                          className="mt-0.5 text-muted-foreground hover:text-primary transition-colors flex-shrink-0 cursor-pointer"
                                        >
                                          {isDone ? (
                                            <CheckSquare className="h-4 w-4 text-emerald-400" />
                                          ) : (
                                            <Square className="h-4 w-4" />
                                          )}
                                        </button>
                                        <span className={cn(
                                          "text-xs font-bold leading-snug text-foreground tracking-tight",
                                          isDone && "line-through text-muted-foreground"
                                        )}>
                                          {task.title}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Footer items */}
                                    <div className="flex items-center justify-between mt-1 text-[9px] text-muted-foreground border-t border-white/5 pt-2">
                                      <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                                        {projName && (
                                          <span 
                                            className="px-1.5 py-0.5 rounded-md border text-center font-bold truncate max-w-[85px]"
                                            style={{
                                              backgroundColor: 'oklch(from var(--accent) l c h / 10%)',
                                              borderColor: 'oklch(from var(--accent) l c h / 15%)',
                                              color: 'var(--accent)'
                                            }}
                                          >
                                            {projName}
                                          </span>
                                        )}
                                        <span className="capitalize font-semibold">{task.priority}</span>
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
                                                className="h-4.5 w-4.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white ring-1 ring-background"
                                                style={{
                                                  background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)`
                                                }}
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
                          <div className="p-3 border-t border-white/5 flex-shrink-0 bg-white/[0.01]">
                            <button
                              onClick={() => handleQuickAddClick(day)}
                              className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 rounded-xl text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <Plus className="h-3.5 w-3.5" />
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
                <div className="h-full w-full flex flex-col md:flex-row overflow-y-auto md:overflow-hidden custom-scrollbar bg-transparent">
                  
                  {/* Left Column: Detailed Agenda List */}
                  <div className="w-full md:w-1/2 flex flex-col h-[400px] md:h-full border-b md:border-b-0 md:border-r border-white/5 overflow-hidden bg-white/[0.005]">
                    <div className="p-4 border-b border-white/5 bg-white/2 flex-shrink-0 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <ListTodo className="h-4.5 w-4.5 text-primary" style={{ color: 'var(--accent)' }} />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Tasks Due Today</h3>
                      </div>
                      <span 
                        className="text-[10px] font-extrabold rounded-lg px-2.5 py-0.5 border"
                        style={{
                          backgroundColor: 'oklch(from var(--accent) l c h / 10%)',
                          borderColor: 'oklch(from var(--accent) l c h / 20%)',
                          color: 'var(--accent)'
                        }}
                      >
                        {(() => {
                          const todayTasks = filteredTasks.filter((t) => {
                            const due = getTaskDate(t);
                            return due && isSameDay(due, currentDate);
                          });
                          return todayTasks.length;
                        })()}
                      </span>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto aether-scroll space-y-3">
                      {(() => {
                        const todayTasks = filteredTasks.filter((t) => {
                          const due = getTaskDate(t);
                          return due && isSameDay(due, currentDate);
                        });

                        if (todayTasks.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center h-full py-12 opacity-35">
                              <CheckSquare className="h-9 w-9 text-muted-foreground mb-2" />
                              <h4 className="text-xs font-bold text-foreground">All Clear For Today!</h4>
                              <p className="text-[10px] text-muted-foreground text-center max-w-[220px] mt-1 leading-relaxed">
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
                                "flex flex-col gap-3.5 p-4 rounded-2xl border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer",
                                isDone && "opacity-55"
                              )}
                              style={{ borderLeft: `4px solid ${priorityColor}` }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <button
                                    onClick={(e) => handleToggleTaskStatus(e, task)}
                                    className="mt-0.5 text-muted-foreground hover:text-primary transition-colors flex-shrink-0 cursor-pointer"
                                  >
                                    {isDone ? (
                                      <CheckSquare className="h-4.5 w-4.5 text-emerald-400" />
                                    ) : (
                                      <Square className="h-4.5 w-4.5" />
                                    )}
                                  </button>
                                  <div className="text-left">
                                    <h4 className={cn(
                                      "text-xs font-bold leading-snug text-foreground tracking-tight",
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
                              <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-1 text-[9px] text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  {projName && (
                                    <span 
                                      className="px-1.5 py-0.5 rounded-md border font-bold"
                                      style={{
                                        backgroundColor: 'oklch(from var(--accent) l c h / 10%)',
                                        borderColor: 'oklch(from var(--accent) l c h / 15%)',
                                        color: 'var(--accent)'
                                      }}
                                    >
                                      {projName}
                                    </span>
                                  )}
                                  <span className="capitalize font-bold">{task.priority} Priority</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="capitalize font-semibold">{task.status}</span>
                                  {task.assigneeIds.length > 0 && (
                                    <div className="flex gap-0.5">
                                      {task.assigneeIds.map((uid) => {
                                        const aMem = memberMap.get(uid);
                                        return (
                                          <div 
                                            key={uid}
                                            className="h-4.5 w-4.5 rounded-full text-white text-[7px] font-bold flex items-center justify-center ring-1 ring-background shadow-sm"
                                            style={{
                                              background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)`
                                            }}
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
                  <div className="w-full md:w-1/2 flex flex-col h-[500px] md:h-full overflow-hidden bg-white/[0.005]">
                    <div className="p-4 border-b border-white/5 bg-white/2 flex-shrink-0 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Clock className="h-4.5 w-4.5 text-primary" style={{ color: 'var(--accent)' }} />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Hourly Day Schedule</h3>
                      </div>
                      <span 
                        className="text-[10px] font-extrabold rounded-lg px-2.5 py-0.5 border"
                        style={{
                          backgroundColor: 'oklch(from var(--accent) l c h / 10%)',
                          borderColor: 'oklch(from var(--accent) l c h / 20%)',
                          color: 'var(--accent)'
                        }}
                      >
                        Planner
                      </span>
                    </div>

                    {/* Hourly block scroll area */}
                    <div className="flex-1 p-4 overflow-y-auto aether-scroll space-y-3">
                      {hourlyTimelineHours.map((slot) => {
                        const dateStr = format(currentDate, 'yyyy-MM-dd');
                        
                        // Check if an event exists for this slot on active date
                        const block = timeBlocks.find((b) => b.dateStr === dateStr && b.hour === slot.value);
                        const isEditing = editingBlockHour === slot.value;

                        return (
                          <div 
                            key={slot.value} 
                            className="flex items-start gap-4 p-1 rounded-2xl hover:bg-white/[0.02] transition-all duration-300"
                          >
                            {/* Time Label column */}
                            <div className="w-16 pt-2 flex-shrink-0 text-right">
                              <span className="text-[10px] font-bold tracking-tight text-muted-foreground font-mono">
                                {slot.label}
                              </span>
                            </div>

                            {/* Slot timeline grid content */}
                            <div className="flex-1 min-w-0">
                              {block ? (
                                // Planned Hour Event Card
                                <div 
                                  className={cn(
                                    "group/block flex items-center justify-between rounded-2xl border p-3 shadow-md text-left relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
                                  )}
                                  style={{
                                    background: 'oklch(from var(--accent) l c h / 8%)',
                                    borderColor: 'oklch(from var(--accent) l c h / 15%)',
                                    boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.05)'
                                  }}
                                >
                                  <div className="min-w-0 flex-1 pl-1">
                                    <h4 className="text-xs font-bold leading-snug text-foreground tracking-tight truncate">{block.title}</h4>
                                    <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">Scheduled Dayblock</p>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteTimeBlock(block.id)}
                                    className="opacity-0 group-hover/block:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all flex-shrink-0 z-10 cursor-pointer"
                                    title="Delete block"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                  {/* Decorative visual sidebar block */}
                                  <div 
                                    className="absolute left-0 top-0 bottom-0 w-1" 
                                    style={{ backgroundColor: 'var(--accent)' }}
                                  />
                                </div>
                              ) : isEditing ? (
                                // Time-block create Form
                                <div className="p-2 border border-white/10 bg-white/5 rounded-2xl flex items-center gap-2 shadow-inner">
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
                                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none border-none py-1 px-2"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleAddTimeBlock(slot.value)}
                                      className="h-7 px-3 rounded-lg text-[10px] font-bold text-white hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                                      style={{
                                        background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)`,
                                      }}
                                    >
                                      Block
                                    </button>
                                    <button
                                      onClick={() => setEditingBlockHour(null)}
                                      className="h-7 p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
                                  className="w-full text-left py-3 px-3.5 border border-dashed border-white/5 rounded-2xl text-[10px] font-bold text-muted-foreground/50 hover:text-foreground hover:bg-white/5 hover:border-white/10 transition-all flex items-center gap-2 group cursor-pointer"
                                >
                                  <Plus className="h-4.5 w-4.5 opacity-0 group-hover:opacity-100 transition-all duration-300 text-muted-foreground" />
                                  <span>+ Add Timeblock for {slot.label}</span>
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

      {/* ── Day Flyout Agenda Modal (Glassmorphic) ─────────────────────────── */}
      <AnimatePresence>
        {activeDayFlyout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveDayFlyout(null)}
              className="absolute inset-0 bg-black/45 backdrop-blur-[6px]"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md aether-glass overflow-hidden z-10 flex flex-col max-h-[80vh] shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 bg-white/2 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="h-5 w-5 text-primary" style={{ color: 'var(--accent)' }} />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {format(activeDayFlyout, 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      Schedule agenda for this date
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveDayFlyout(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body (Scrollable List) */}
              <div className="flex-grow overflow-y-auto aether-scroll p-5 space-y-3 min-h-[150px]">
                {(() => {
                  const dayTasks = filteredTasks.filter((t) => {
                    const due = getTaskDate(t);
                    return due && isSameDay(due, activeDayFlyout);
                  });

                  if (dayTasks.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <CheckSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <h4 className="text-xs font-semibold text-foreground">All Clear!</h4>
                        <p className="text-[10px] text-muted-foreground max-w-[200px] mt-1">
                          No tasks are scheduled for this day.
                        </p>
                      </div>
                    );
                  }

                  return dayTasks.map((task) => {
                    const isDone = task.status === 'done';
                    const priorityColor = PRIORITY_CONFIG[task.priority]?.color || '#52525b';
                    const projName = task.projectId ? projectMap.get(task.projectId) : null;

                    return (
                      <div
                        key={task.id}
                        onClick={() => {
                          setSelectedTask(task);
                          setActiveDayFlyout(null);
                        }}
                        className={cn(
                          "group/flyout flex flex-col gap-2 p-3.5 rounded-2xl border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10 hover:shadow-lg transition-all duration-300 cursor-pointer",
                          isDone && "opacity-55"
                        )}
                        style={{ borderLeft: `4px solid ${priorityColor}` }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTaskStatus(e, task);
                              }}
                              className="mt-0.5 text-muted-foreground hover:text-primary transition-colors flex-shrink-0 cursor-pointer"
                            >
                              {isDone ? (
                                <CheckSquare className="h-4.5 w-4.5 text-emerald-400" />
                              ) : (
                                <Square className="h-4.5 w-4.5" />
                              )}
                            </button>
                            <div className="text-left">
                              <h4 className={cn(
                                "text-xs font-bold leading-snug text-foreground tracking-tight",
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

                        {/* Badges and Assignees */}
                        <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1 text-[9px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            {projName && (
                              <span
                                className="px-1.5 py-0.5 rounded-md border font-bold"
                                style={{
                                  backgroundColor: 'oklch(from var(--accent) l c h / 10%)',
                                  borderColor: 'oklch(from var(--accent) l c h / 15%)',
                                  color: 'var(--accent)'
                                }}
                              >
                                {projName}
                              </span>
                            )}
                            <span className="capitalize font-bold">{task.priority} Priority</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="capitalize font-semibold">{task.status}</span>
                            {task.assigneeIds.length > 0 && (
                              <div className="flex gap-0.5">
                                {task.assigneeIds.map((uid) => {
                                  const aMem = memberMap.get(uid);
                                  return (
                                    <div
                                      key={uid}
                                      className="h-4.5 w-4.5 rounded-full text-white text-[7px] font-bold flex items-center justify-center ring-1 ring-background shadow-sm"
                                      style={{
                                        background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)`
                                      }}
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

              {/* Footer */}
              <div className="border-t border-white/5 bg-white/2 px-5 py-4 flex items-center justify-end">
                <button
                  onClick={() => {
                    handleQuickAddClick(activeDayFlyout);
                    setActiveDayFlyout(null);
                  }}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.12) c h) 100%)`,
                    boxShadow: `0 8px 20px oklch(from var(--accent) l c h / 20%)`
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Task</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
