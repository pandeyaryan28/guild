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
  Check, 
  CheckSquare, 
  Square, 
  User, 
  Folder, 
  AlertCircle, 
  X, 
  Clock, 
  Calendar, 
  CalendarDays, 
  SlidersHorizontal,
  Trash2,
  ListTodo,
  TrendingUp,
  BarChart2,
  Activity,
  Sparkles,
  Users,
  Target
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
import { useGoals } from '../../hooks/useGoals';
import { useOrgMembers } from '../../hooks/useChat';
import { useTaskLabels } from '../../hooks/useTasks';
import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { TaskDetailDrawer } from '../../components/tasks/TaskDetailDrawer';

import { moveTask, STATUS_CONFIG, PRIORITY_CONFIG } from '../../lib/tasks';
import type { Task, TaskPriority, TaskStatus } from '../../lib/tasks';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '../../components/SearchableSelect';

// Time Blocking schedule interface with categories
interface TimeBlock {
  id: string;
  dateStr: string;
  hour: string; // e.g. "09:00"
  title: string;
  category: 'focus' | 'meeting' | 'review' | 'routine';
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
  const [newBlockCategory, setNewBlockCategory] = React.useState<'focus' | 'meeting' | 'review' | 'routine'>('focus');

  // Real-time tracker for the current hours (updated every minute)
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Data fetching
  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { projects } = useProjects(orgId);
  const { goals } = useGoals(orgId);
  const members = useOrgMembers(orgId);
  const labels = useTaskLabels(orgId);

  // Sync real-time indicator minute ticker
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

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

  // View-specific calculations (for Analytics)
  const viewScopedTasks = React.useMemo(() => {
    if (activeView === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return filteredTasks.filter((t) => {
        const due = getTaskDate(t);
        return due && due >= monthStart && due <= monthEnd;
      });
    } else if (activeView === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      return filteredTasks.filter((t) => {
        const due = getTaskDate(t);
        return due && due >= weekStart && due <= weekEnd;
      });
    } else {
      return filteredTasks.filter((t) => {
        const due = getTaskDate(t);
        return due && isSameDay(due, currentDate);
      });
    }
  }, [filteredTasks, activeView, currentDate, getTaskDate]);

  const analytics = React.useMemo(() => {
    const total = viewScopedTasks.length;
    const completed = viewScopedTasks.filter((t) => t.status === 'done').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Project distribution
    const projectCounts: { [key: string]: number } = {};
    viewScopedTasks.forEach((t) => {
      if (t.projectId) {
        projectCounts[t.projectId] = (projectCounts[t.projectId] || 0) + 1;
      }
    });

    // High priority distribution
    const highPriorityCount = viewScopedTasks.filter((t) => t.priority === 'high' || t.priority === 'urgent').length;

    // Weekday Heatmap distribution (Mon to Sun)
    const weekdayDistribution = [0, 0, 0, 0, 0, 0, 0];
    viewScopedTasks.forEach((t) => {
      const due = getTaskDate(t);
      if (due) {
        // adjust day of week to start on Monday (0) to Sunday (6)
        let day = due.getDay(); // 0 is Sunday, 1 is Monday
        let adjustedDay = day === 0 ? 6 : day - 1;
        weekdayDistribution[adjustedDay]++;
      }
    });

    return {
      total,
      completed,
      rate,
      projectCounts,
      highPriorityCount,
      weekdayDistribution
    };
  }, [viewScopedTasks, getTaskDate]);

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
    
    // Aesthetic color category assignments
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
        
        {/* ── Premium Glassmorphic Top Controls Banner ─────────────────────────────── */}
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-secondary/40 p-3.5 backdrop-blur-xl md:flex-row md:items-center md:justify-between shadow-xl">
          <div className="flex items-center gap-3">
            {/* View Icon Container */}
            <div className="hidden rounded-xl p-2.5 text-accent shadow-inner border border-border/60" style={{ background: 'oklch(from var(--accent) l c h / 8%)' }}>
              <Calendar className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                {activeView === 'month' && format(currentDate, 'MMMM yyyy')}
                {activeView === 'week' && `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`}
                {activeView === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h1>
              <p className="text-[10px] font-medium text-muted-foreground">
                Dynamic workload tracking & task allocation dashboard
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Navigation button deck */}
            <div className="flex items-center rounded-xl border border-border bg-secondary/40 dark:bg-surface/60 p-1 shadow-inner backdrop-blur-md">
              <button 
                onClick={handlePrev} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all cursor-pointer"
                title="Previous"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={handleToday} 
                className="px-3 py-1 text-[11px] font-semibold text-foreground hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              >
                Today
              </button>
              <button 
                onClick={handleNext} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all cursor-pointer"
                title="Next"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Premium Sliding View Switcher Deck */}
            <div className="flex items-center rounded-xl border border-border bg-secondary/40 dark:bg-surface/60 p-1 shadow-inner relative backdrop-blur-md">
              {(['month', 'week', 'day'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={cn(
                    "relative rounded-lg px-3.5 py-1.5 text-[11px] font-bold capitalize transition-all duration-300 z-10 cursor-pointer",
                    activeView === view 
                      ? "text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {activeView === view && (
                    <motion.div
                      layoutId="activeViewPill"
                      className="absolute inset-0 bg-accent rounded-lg shadow-lg"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                  {view}
                </button>
              ))}
            </div>

            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-inner",
                showFilters 
                  ? "border-accent/40 text-accent bg-accent/[0.08]" 
                  : "border-border bg-secondary/40 dark:bg-surface/60 text-muted-foreground hover:text-foreground"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
            </button>

            {/* Quick add task */}
            <button
              onClick={() => handleQuickAddClick(new Date())}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11px] font-bold text-white hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-accent/20 cursor-pointer"
              style={{
                background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.12) c h) 100%)`,
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
              className="overflow-hidden mb-4 animate-fluid-pop"
            >
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-gradient-to-b from-white/[0.02] to-white/[0.005] p-4 backdrop-blur-2xl sm:grid-cols-2 md:grid-cols-5 shadow-inner">
                
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
                    className="w-full rounded-xl border border-border bg-secondary/40 dark:bg-surface/60 py-2 pl-9 pr-3 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all font-semibold"
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
                <div className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 dark:bg-surface/60 px-3 py-1 hover:border-white/20 focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/10 transition-all">
                  <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-bold text-foreground outline-none border-none py-1.5 cursor-pointer"
                  >
                    <option value="all" className="bg-surface text-foreground font-bold">All Projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-surface text-foreground font-bold">{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 dark:bg-surface/60 px-2 py-0.5 hover:border-white/20 focus-within:border-accent/40 transition-all w-full md:w-auto min-w-[150px]">
                  <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 ml-1" />
                  <SearchableSelect
                    value={selectedAssigneeId}
                    onChange={setSelectedAssigneeId}
                    options={[
                      { value: 'all', label: 'All Assignees' },
                      ...members.map((m) => ({
                        value: m.uid,
                        label: m.fullName || m.username,
                        detail: m.designation || 'Member',
                        photoURL: m.photoURL,
                      })),
                    ]}
                    placeholder="All Assignees"
                    triggerClassName="border-none bg-transparent hover:bg-transparent focus:ring-0 shadow-none px-1 py-1 text-[11px] font-bold"
                  />
                </div>

                {/* Priority Filter */}
                <div className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 dark:bg-surface/60 px-3 py-1 hover:border-white/20 focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/10 transition-all">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-bold text-foreground outline-none border-none py-1.5 cursor-pointer"
                  >
                    <option value="all" className="bg-surface text-foreground font-bold">All Priorities</option>
                    {Object.entries(PRIORITY_CONFIG).map(([key, value]) => (
                      <option key={key} value={key} className="bg-surface text-foreground font-bold">{value.label}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 dark:bg-surface/60 px-3 py-1 hover:border-white/20 focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/10 transition-all">
                  <ListTodo className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-bold text-foreground outline-none border-none py-1.5 cursor-pointer"
                  >
                    <option value="all" className="bg-surface text-foreground font-bold">All Statuses</option>
                    {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                      <option key={key} value={key} className="bg-surface text-foreground font-bold">{value.label}</option>
                    ))}
                  </select>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main Split Canvas Grid (Views + Insights Panel) ─────────────────── */}
        <div className="flex-1 flex gap-5 overflow-hidden min-h-0 relative">
          
          {/* Main View Container */}
          <div className="flex-1 min-h-0 aether-glass overflow-hidden shadow-2xl flex flex-col z-10">
            {tasksLoading ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4" style={{ borderColor: 'oklch(from var(--accent) l c h / 10%)', borderTopColor: 'var(--accent)' }} />
                  <p className="text-[11px] text-muted-foreground font-semibold tracking-wide animate-pulse">Synchronizing workspace tasks...</p>
                </div>
              </div>
            ) : (
              <div className="h-full w-full overflow-hidden flex flex-col">
                
                {/* ── MONTH VIEW ── */}
                {activeView === 'month' && (
                  <div className="h-full w-full flex flex-col overflow-hidden">
                    {/* Grid Weekday Headers Overhaul */}
                    <div className="grid grid-cols-7 border-b border-border/60 bg-surface/60 text-center py-4 px-1.5 backdrop-blur-md">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <span key={day} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 font-heading">
                          {day}
                        </span>
                      ))}
                    </div>

                    {/* Days grid container - Overhauled to Floating Grid */}
                    <div className="flex-1 grid grid-cols-7 gap-2 p-2.5 overflow-y-auto aether-scroll md:grid-rows-6">
                      {(() => {
                        const monthStartDay = startOfMonth(currentDate);
                        const monthEndDay = endOfMonth(monthStartDay);
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

                          // Daily progress calculation
                          const dailyTotal = dayTasks.length;
                          const dailyCompleted = dayTasks.filter(t => t.status === 'done').length;
                          const dailyProgressPercent = dailyTotal > 0 ? (dailyCompleted / dailyTotal) * 100 : 0;

                          return (
                            <motion.div
                              key={day.toString()}
                              whileHover={isCurrentMonth ? { y: -3, scale: 1.01 } : undefined}
                              transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              onClick={() => {
                                setMobileSelectedDate(day);
                                setActiveDayFlyout(day);
                              }}
                              className={cn(
                                "relative group p-2.5 md:p-3 flex flex-col rounded-2xl border transition-all duration-300 select-none overflow-hidden h-full",
                                isCurrentMonth 
                                  ? "border-border/60 bg-surface/60 hover:border-accent/30 dark:bg-white/[0.003] dark:hover:bg-white/[0.015] shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)]" 
                                  : "opacity-15 border-white/[0.02] bg-white/[0.005] hover:opacity-25",
                                isMobileSelected && isCurrentMonth && "bg-white/[0.03] border-accent/40 shadow-[inset_0_0_0_1px_oklch(from_var(--accent)_l_c_h_/_20%)] backdrop-blur-sm",
                                isDayToday && "border-accent/40 ring-1 ring-accent/20 bg-gradient-to-br from-accent/[0.06] to-indigo-500/[0.01]"
                              )}
                            >
                              {/* Day number cell header */}
                              <div className="flex items-center justify-between mb-3 z-10">
                                <span
                                  className={cn(
                                    "text-[10px] font-bold tracking-tight flex items-center justify-center rounded-full h-5 w-5 shrink-0",
                                    isDayToday 
                                      ? "bg-accent text-white" 
                                      : "text-foreground/80"
                                  )}
                                >
                                  {format(day, 'd')}
                                </span>

                                {/* Quick create action button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickAddClick(day);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-5 w-5 rounded-lg border border-border/60 bg-white/5 hover:bg-white/10 hover:border-white/20 text-foreground hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm"
                                  title="Schedule task"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>

                              {/* Task item stack inside day cell */}
                              <div className="flex-1 space-y-2 overflow-y-auto aether-scroll pr-0.5 z-10">
                                {/* Mobile dots */}
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

                                {/* Premium desktop capsule strips */}
                                <div className="hidden md:block space-y-1.5">
                                  {dayTasks.slice(0, 3).map((task) => {
                                    const isDone = task.status === 'done';
                                    const priorityColor = PRIORITY_CONFIG[task.priority]?.color || '#52525b';
                                    const projName = task.projectId ? projectMap.get(task.projectId) : null;
                                    const projInitials = projName ? projName.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '';
                                    
                                    return (
                                      <div
                                        key={task.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedTask(task);
                                        }}
                                        className={cn(
                                          "group/task-strip flex items-center justify-between rounded-xl border p-2 text-[9px] transition-all duration-300 select-none cursor-pointer",
                                          isDone 
                                            ? "border-border/60 bg-surface/60 opacity-35 line-through hover:opacity-50" 
                                            : "hover:translate-x-0.5 bg-secondary/40 border-border/60 hover:border-accent/20 hover:bg-white/[0.05] hover:shadow-md"
                                        )}
                                        style={!isDone ? {
                                          borderLeft: `3px solid ${priorityColor}`,
                                          boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.02)`
                                        } : {
                                          borderLeft: `3px solid rgba(255, 255, 255, 0.1)`
                                        }}
                                        title={task.title}
                                      >
                                        <div className="flex items-center gap-2 min-w-0 flex-grow">
                                          {/* Direct check click toggle */}
                                          <div 
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              await handleToggleTaskStatus(e, task);
                                            }}
                                            className={cn(
                                              "h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 cursor-pointer",
                                              isDone 
                                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 animate-fluid-pop" 
                                                : "border-white/20 bg-secondary/40 hover:border-accent/50 hover:bg-accent/5"
                                            )}
                                          >
                                            {isDone ? (
                                              <Check className="h-2 w-2" />
                                            ) : (
                                              <div className="h-1 w-1 rounded-full bg-transparent group-hover/task-strip:bg-accent/40" />
                                            )}
                                          </div>

                                          <span className={cn(
                                            "truncate tracking-tight leading-none text-foreground/90 font-semibold transition-colors duration-200",
                                            isDone && "text-muted-foreground/60"
                                          )}>
                                            {task.title}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                                          {projInitials && (
                                            <span 
                                              className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-border/60 bg-white/5"
                                              style={{ 
                                                color: 'oklch(from var(--accent) calc(l + 0.12) c h)',
                                                lineHeight: '1'
                                              }}
                                              title={`Project: ${projName}`}
                                            >
                                              {projInitials}
                                            </span>
                                          )}

                                          {task.assigneeIds.length > 0 && (
                                            <div 
                                              className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] font-black text-white shadow ring-1 ring-white/10 relative overflow-hidden shrink-0"
                                              style={{
                                                background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)`,
                                              }}
                                            >
                                              <span className="absolute top-0 left-0 right-0 h-[45%] bg-white/10 rounded-t-full pointer-events-none" />
                                              {(() => {
                                                const aMem = memberMap.get(task.assigneeIds[0]);
                                                return (aMem?.fullName || aMem?.username || '?')[0].toUpperCase();
                                              })()}
                                            </div>
                                          )}
                                        </div>
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
                                      className="w-full flex items-center justify-center gap-1 py-1 rounded-xl border border-border/60 bg-white/5 hover:bg-white/10 text-[8px] font-bold text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm select-none backdrop-blur-md"
                                    >
                                      <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0 animate-pulse" />
                                      <span>+{dayTasks.length - 3} more tasks</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Daily Completion Progress Line */}
                              {dailyTotal > 0 && (
                                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5 pointer-events-none">
                                  <div 
                                    className="h-full transition-all duration-500 ease-out"
                                    style={{ 
                                      width: `${dailyProgressPercent}%`,
                                      background: `linear-gradient(90deg, var(--accent) 0%, oklch(from var(--accent) calc(l + 0.1) c h) 100%)`,
                                    }}
                                  />
                                </div>
                              )}
                            </motion.div>
                          );
                        });
                      })()}
                    </div>

                    {/* Responsive Mobile Agenda list below the grid */}
                    <div className="block md:hidden border-t border-border/60 bg-surface/60 p-4 h-[180px] overflow-y-auto backdrop-blur-xl">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          Agenda for {format(mobileSelectedDate, 'MMM d, yyyy')}
                        </h4>
                        <button
                          onClick={() => handleQuickAddClick(mobileSelectedDate)}
                          className="flex items-center gap-1 text-[10px] font-bold text-accent hover:underline"
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
                              <Check className="h-5 w-5 text-muted-foreground/35 mb-1" />
                              <p className="text-[10px] text-muted-foreground font-bold">No tasks scheduled on this date</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-2">
                            {agendaTasks.map((task) => (
                              <div
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-secondary/40 hover:bg-white/[0.05] transition-all shadow-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => handleToggleTaskStatus(e, task)}
                                    className="text-muted-foreground hover:text-accent transition-colors cursor-pointer"
                                  >
                                    {task.status === 'done' ? (
                                      <CheckSquare className="h-4 w-4 text-emerald-400" />
                                    ) : (
                                      <Square className="h-4 w-4" />
                                    )}
                                  </button>
                                  <span className={cn(
                                    "text-[11px] font-bold text-foreground",
                                    task.status === 'done' && "line-through text-muted-foreground"
                                  )}>
                                    {task.title}
                                  </span>
                                </div>
                                <span 
                                  className="text-[8px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded border"
                                  style={{
                                    backgroundColor: 'oklch(from var(--accent) l c h / 10%)',
                                    borderColor: 'oklch(from var(--accent) l c h / 18%)',
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
                            className="flex-1 min-w-[230px] flex flex-col min-h-[160px] md:h-full overflow-hidden bg-white/[0.005] hover:bg-white/[0.015] transition-colors duration-300"
                          >
                            {/* Top Task Progress Density bar */}
                            <div className="w-full h-1 bg-white/5 relative overflow-hidden flex-shrink-0">
                              {totalTasks > 0 && (
                                <div 
                                  className="h-full transition-all duration-500 ease-out" 
                                  style={{ 
                                    width: `${percentComplete}%`, 
                                    background: 'linear-gradient(90deg, var(--accent) 0%, oklch(from var(--accent) calc(l + 0.1) c h) 100%)',
                                  }} 
                                />
                              )}
                            </div>

                            {/* Column Header */}
                            <div className={cn(
                              "p-3.5 border-b border-border/60 flex items-center justify-between flex-shrink-0 bg-surface/60",
                              isDayToday && "bg-white/[0.03]"
                            )}>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[10px] font-bold tracking-tight flex items-center justify-center rounded-full h-5 w-5 shrink-0",
                                  isDayToday 
                                    ? "bg-accent text-white" 
                                    : "text-foreground/80"
                                )}>
                                  {format(day, 'd')}
                                </span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-foreground leading-none">{format(day, 'EEEE')}</span>
                                  <span className="text-[9px] text-muted-foreground font-bold leading-none mt-0.5">{format(day, 'MMM d')}</span>
                                </div>
                              </div>
                              <span className="text-[9px] font-extrabold rounded-md px-1.5 py-0.5 border border-border/60 bg-white/5 text-muted-foreground">
                                {dayTasks.length}
                              </span>
                            </div>

                            {/* Cards Area */}
                            <div className="flex-1 p-3.5 overflow-y-auto aether-scroll space-y-2.5">
                              {dayTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 opacity-30">
                                  <Check className="h-5 w-5 text-muted-foreground mb-1.5" />
                                  <span className="text-[9px] text-muted-foreground font-bold">Clear Schedule</span>
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
                                        "group flex flex-col gap-2 rounded-xl border border-border/60 bg-secondary/40 hover:bg-white/[0.05] hover:border-border hover:shadow-lg hover:scale-[1.01] p-3 text-left transition-all duration-300 cursor-pointer",
                                        isDone && "opacity-50"
                                      )}
                                      style={{ borderLeft: `3px solid ${priorityColor}` }}
                                    >
                                      <div className="flex items-start justify-between gap-1">
                                        <div className="flex items-start gap-2">
                                          <button
                                            onClick={(e) => handleToggleTaskStatus(e, task)}
                                            className="mt-0.5 text-muted-foreground hover:text-accent transition-colors flex-shrink-0 cursor-pointer"
                                          >
                                            {isDone ? (
                                              <CheckSquare className="h-4 w-4 text-emerald-400" />
                                            ) : (
                                              <Square className="h-4 w-4" />
                                            )}
                                          </button>
                                          <span className={cn(
                                            "text-[11px] font-bold leading-snug text-foreground tracking-tight",
                                            isDone && "line-through text-muted-foreground"
                                          )}>
                                            {task.title}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Card details */}
                                      <div className="flex items-center justify-between mt-1 text-[9px] text-muted-foreground border-t border-border/60 pt-2">
                                        <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                                          {projName && (
                                            <span 
                                              className="px-1.5 py-0.5 rounded border text-center font-bold truncate max-w-[85px]"
                                              style={{
                                                backgroundColor: 'oklch(from var(--accent) l c h / 10%)',
                                                borderColor: 'oklch(from var(--accent) l c h / 15%)',
                                                color: 'var(--accent)'
                                              }}
                                            >
                                              {projName}
                                            </span>
                                          )}
                                          <span className="capitalize font-bold text-[8px]">{task.priority}</span>
                                        </div>

                                        {task.assigneeIds.length > 0 && (
                                          <div className="flex gap-0.5">
                                            {task.assigneeIds.slice(0, 2).map((uid) => {
                                              const aMem = memberMap.get(uid);
                                              const initials = (aMem?.fullName || aMem?.username || '?')[0].toUpperCase();
                                              return (
                                                <div 
                                                  key={uid} 
                                                  className="h-4 w-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white ring-1 ring-background"
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

                            {/* Column action trigger */}
                            <div className="p-3 border-t border-border/60 flex-shrink-0 bg-white/[0.005]">
                              <button
                                onClick={() => handleQuickAddClick(day)}
                                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-border hover:border-white/20 hover:bg-white/5 rounded-xl text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
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
                    <div className="w-full md:w-1/2 flex flex-col h-[280px] md:h-full border-b md:border-b-0 md:border-r border-border/60 overflow-hidden bg-white/[0.005]">
                      <div className="p-4 border-b border-border/60 bg-surface/60 flex-shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <ListTodo className="h-4 w-4 text-accent" />
                          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-foreground">Tasks Due Today</h3>
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
                                <CheckSquare className="h-8 w-8 text-muted-foreground mb-2" />
                                <h4 className="text-[11px] font-bold text-foreground">All Clear For Today</h4>
                                <p className="text-[9px] text-muted-foreground text-center max-w-[200px] mt-1 leading-relaxed">
                                  No workspace tasks are scheduled on this date
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
                                  "flex flex-col gap-3 p-4 rounded-xl border border-border/60 bg-secondary/40 hover:bg-white/[0.05] hover:border-border hover:shadow-lg hover:scale-[1.01] transition-all duration-300 cursor-pointer",
                                  isDone && "opacity-55"
                                )}
                                style={{ borderLeft: `3px solid ${priorityColor}` }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <button
                                      onClick={(e) => handleToggleTaskStatus(e, task)}
                                      className="mt-0.5 text-muted-foreground hover:text-accent transition-colors flex-shrink-0 cursor-pointer"
                                    >
                                      {isDone ? (
                                        <CheckSquare className="h-4.5 w-4.5 text-emerald-400" />
                                      ) : (
                                        <Square className="h-4.5 w-4.5" />
                                      )}
                                    </button>
                                    <div className="text-left">
                                      <h4 className={cn(
                                        "text-[11px] font-bold leading-snug text-foreground tracking-tight",
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
                                <div className="flex items-center justify-between border-t border-border/60 pt-2.5 mt-1 text-[9px] text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    {projName && (
                                      <span 
                                        className="px-1.5 py-0.5 rounded border font-bold"
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
                                              className="h-4 w-4 rounded-full text-white text-[7px] font-bold flex items-center justify-center ring-1 ring-background shadow-sm"
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

                    {/* Right Column: Time-Blocking Hourly Planner with Live Tracker Line */}
                    <div className="w-full md:w-1/2 flex flex-col h-[400px] md:h-full overflow-hidden bg-white/[0.005]">
                      <div className="p-4 border-b border-border/60 bg-surface/60 flex-shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Clock className="h-4 w-4 text-accent" />
                          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-foreground">Hourly Day Schedule</h3>
                        </div>
                        <span 
                          className="text-[10px] font-extrabold rounded-lg px-2.5 py-0.5 border"
                          style={{
                            backgroundColor: 'oklch(from var(--accent) l c h / 10%)',
                            borderColor: 'oklch(from var(--accent) l c h / 20%)',
                            color: 'var(--accent)'
                          }}
                        >
                          Dayblocks
                        </span>
                      </div>

                      {/* Hourly block scroll area */}
                      <div className="flex-1 p-4 overflow-y-auto aether-scroll space-y-3 relative">
                        
                        {hourlyTimelineHours.map((slot) => {
                          const dateStr = format(currentDate, 'yyyy-MM-dd');
                          
                          // Check if an event exists for this slot on active date
                          const block = timeBlocks.find((b) => b.dateStr === dateStr && b.hour === slot.value);
                          const isEditing = editingBlockHour === slot.value;

                          // Real-time slot hour time calculations
                          const slotHour = parseInt(slot.value.split(':')[0], 10);
                          const isCurrentHour = isSameDay(currentDate, new Date()) && currentTime.getHours() === slotHour;
                          const currentMins = currentTime.getMinutes();

                          return (
                            <div 
                              key={slot.value} 
                              className="flex items-start gap-4 p-1 rounded-xl hover:bg-surface/60 transition-all duration-300 relative"
                            >

                              {/* Time Label column */}
                              <div className="w-16 pt-2.5 flex-shrink-0 text-right">
                                <span className="text-[9px] font-extrabold tracking-tight text-muted-foreground font-mono">
                                  {slot.label}
                                </span>
                              </div>

                              {/* Slot timeline grid content */}
                              <div className="flex-1 min-w-0">
                                {block ? (
                                  // Planned Hour Event Card
                                  <div 
                                    className="group/block flex items-center justify-between rounded-xl border p-3 shadow-md text-left relative overflow-hidden transition-all duration-300 hover:shadow-lg"
                                    style={{
                                      background: block.color || 'oklch(from var(--accent) l c h / 6%)',
                                      borderColor: 'oklch(from var(--accent) l c h / 12%)',
                                      boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.02)'
                                    }}
                                  >
                                    <div className="min-w-0 flex-1 pl-1">
                                      <h4 className="text-[11px] font-bold leading-snug text-foreground tracking-tight truncate">{block.title}</h4>
                                      <p className="text-[8px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">{block.category || 'Focus'}</p>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteTimeBlock(block.id)}
                                      className="opacity-0 group-hover/block:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all flex-shrink-0 z-10 cursor-pointer"
                                      title="Delete Dayblock"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                    {/* Accent strip bar */}
                                    <div 
                                      className="absolute left-0 top-0 bottom-0 w-1" 
                                      style={{ backgroundColor: 'var(--accent)' }}
                                    />
                                  </div>
                                ) : isEditing ? (
                                  // Time-block create Form with Category Selection
                                  <div className="p-3 border border-border bg-white/5 rounded-xl flex flex-col gap-2 shadow-inner">
                                    <input
                                      autoFocus
                                      type="text"
                                      placeholder="Schedule detail (e.g. Design sync)..."
                                      value={newBlockTitle}
                                      onChange={(e) => setNewBlockTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddTimeBlock(slot.value);
                                        if (e.key === 'Escape') setEditingBlockHour(null);
                                      }}
                                      className="w-full bg-transparent text-[11px] font-semibold text-foreground placeholder:text-muted-foreground outline-none border-none py-1 px-1"
                                    />
                                    
                                    {/* Category Select Toggles */}
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {(['focus', 'meeting', 'review', 'routine'] as const).map((cat) => (
                                        <button
                                          key={cat}
                                          type="button"
                                          onClick={() => setNewBlockCategory(cat)}
                                          className={cn(
                                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border cursor-pointer transition-all",
                                            newBlockCategory === cat
                                              ? "border-accent/40 bg-accent/20 text-accent font-black"
                                              : "border-border/60 bg-white/5 text-muted-foreground hover:text-foreground"
                                          )}
                                        >
                                          {cat}
                                        </button>
                                      ))}
                                    </div>

                                    <div className="flex gap-1.5 justify-end mt-2">
                                      <button
                                        onClick={() => setEditingBlockHour(null)}
                                        className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleAddTimeBlock(slot.value)}
                                        className="px-3 py-1 rounded-lg text-[10px] font-bold text-white hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md"
                                        style={{
                                          background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)`,
                                        }}
                                      >
                                        Block Hour
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  // Blank Slot trigger
                                  <button
                                    onClick={() => {
                                      setNewBlockTitle('');
                                      setNewBlockCategory('focus');
                                      setEditingBlockHour(slot.value);
                                    }}
                                    className="w-full text-left py-2.5 px-3.5 border border-dashed border-border/60 hover:border-border rounded-xl text-[10px] font-bold text-muted-foreground/40 hover:text-foreground hover:bg-white/5 transition-all flex items-center gap-2 group cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all duration-300 text-muted-foreground" />
                                    <span>Allocate Hour {slot.label}</span>
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
              <div className="flex items-center justify-between border-b border-border/60 bg-white/2 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="h-5 w-5 text-accent" />
                  <div>
                    <h3 className="text-xs font-black text-foreground">
                      {format(activeDayFlyout, 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <p className="text-[9px] text-muted-foreground">
                      Workspace schedule overview
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
                        <h4 className="text-xs font-semibold text-foreground">All Clear</h4>
                        <p className="text-[10px] text-muted-foreground max-w-[200px] mt-1">
                          No tasks scheduled on this day
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
                          "group/flyout flex flex-col gap-2 p-3.5 rounded-xl border border-border/60 bg-white/2 hover:bg-white/5 hover:border-border hover:shadow-lg transition-all duration-300 cursor-pointer",
                          isDone && "opacity-55"
                        )}
                        style={{ borderLeft: `3px solid ${priorityColor}` }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTaskStatus(e, task);
                              }}
                              className="mt-0.5 text-muted-foreground hover:text-accent transition-colors flex-shrink-0 cursor-pointer"
                            >
                              {isDone ? (
                                <CheckSquare className="h-4.5 w-4.5 text-emerald-400" />
                              ) : (
                                <Square className="h-4.5 w-4.5" />
                              )}
                            </button>
                            <div className="text-left">
                              <h4 className={cn(
                                "text-[11px] font-bold leading-snug text-foreground tracking-tight",
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
                        <div className="flex items-center justify-between border-t border-border/60 pt-2 mt-1 text-[9px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            {projName && (
                              <span
                                className="px-1.5 py-0.5 rounded border font-bold"
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
                                      className="h-4 w-4 rounded-full text-white text-[7px] font-bold flex items-center justify-center ring-1 ring-background shadow-sm"
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
              <div className="border-t border-border/60 bg-white/2 px-5 py-4 flex items-center justify-end">
                <button
                  onClick={() => {
                    handleQuickAddClick(activeDayFlyout);
                    setActiveDayFlyout(null);
                  }}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.12) c h) 100%)`,
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

      {/* ── Task Detail Drawer ─────────────────────────────────────────────── */}
      <TaskDetailDrawer
        task={selectedTask ? (tasks.find((t) => t.id === selectedTask.id) || selectedTask) : null}
        onClose={() => setSelectedTask(null)}
        orgId={orgId || ''}
        actor={actor}
        members={members}
        projects={projects}
        goals={goals}
      />

    </div>
  );
}
