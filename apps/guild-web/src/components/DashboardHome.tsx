import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Users, 
  MoreHorizontal,
  Plus,
  Filter,
  Loader2,
  Check,
  Target,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Workflow,
  AlertCircle,
  HelpCircle,
  ThumbsUp,
  RotateCcw,
  Stethoscope,
  Home,
  Calendar,
  Laptop,
  Receipt,
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useChannels, useOrgMembers } from '../hooks/useChat';
import { useNotifications } from '../hooks/useNotifications';
import { useRequests } from '../hooks/useRequests';
import { useTeams } from '../hooks/useTeams';
import { useProjects } from '../hooks/useProjects';
import { useGoals } from '../hooks/useGoals';
import { updateRequestStatus, REQUEST_TYPE_ICONS, REQUEST_TYPE_LABELS, type OrgRequest } from '../lib/requests';
import { type Task, moveTask, createTask } from '../lib/tasks';
import { updateGoal, type Goal } from '../lib/goals';
import { updateUserProfile, type UserProfile } from '../lib/firestore';
import { Timestamp, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MemberProfileDrawer, avatarInitials, avatarHue } from './MemberProfileDrawer';
import type { GoalHorizon, GoalRecurrence, GoalCycleRecord } from '@guild/types';
import { cn } from '@/lib/utils';

const RequestIconMap: Record<string, typeof ClipboardList> = {
  Stethoscope,
  Home,
  Calendar,
  Laptop,
  Receipt,
  ClipboardList,
};

function RequestIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const Icon = RequestIconMap[name] || ClipboardList;
  return <Icon className={className} />;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const MetricCard = ({ title, value, subtitle, icon: Icon, color, delay, loading, rightElement }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -4 }}
    className="group"
  >
    <Card className="overflow-hidden border-border-default bg-surface transition-all hover:bg-surface hover:shadow-2xl hover:shadow-primary/5">
      <CardContent className="p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className={`p-2.5 rounded-xl bg-opacity-10 ${color} shadow-inner`}>
            <Icon className={`h-5 w-5 ${color.replace('bg-', 'text-')}`} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">{title}</p>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <div>
            {loading ? (
              <div className="h-8 w-12 rounded bg-bg-tertiary animate-pulse" />
            ) : (
              <h3 className="text-3xl font-bold tracking-tight text-foreground">{value}</h3>
            )}
            <p className="text-xs text-muted-foreground mt-1 font-medium">{subtitle}</p>
          </div>
          {rightElement}
        </div>
        
        <div className="h-1 w-full bg-bg-tertiary rounded-full overflow-hidden mt-1">
          <div className={`h-full ${color} opacity-60 w-1/3`} />
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-400 border-red-400/30 bg-red-400/5',
  high:   'text-orange-400 border-orange-400/30 bg-orange-400/5',
  medium: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  low:    'text-blue-400 border-blue-400/30 bg-blue-400/5',
  none:   'text-muted-foreground border-border-default bg-bg-tertiary',
};

// ─── Chronology Streaks & Cycles Helpers ─────────────────────────────────────

function calculateStreak(goal: Goal): number {
  if (!goal.cycleHistory || goal.cycleHistory.length === 0) return 0;
  // Sort in descending order to count backwards from the most recent cycle
  const history = [...goal.cycleHistory].sort((a, b) => b.cycleEnd.toDate().getTime() - a.cycleEnd.toDate().getTime());
  
  let streak = 0;
  for (const record of history) {
    if (record.status === 'completed') {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function isCycleExpired(recurrence: GoalRecurrence, currentCycleStart: Timestamp | null | undefined): boolean {
  if (!currentCycleStart || recurrence === 'none') return false;
  const startDate = currentCycleStart.toDate();
  const now = new Date();
  
  if (recurrence === 'daily') {
    return startDate.getDate() !== now.getDate() ||
           startDate.getMonth() !== now.getMonth() ||
           startDate.getFullYear() !== now.getFullYear();
  }
  if (recurrence === 'weekly') {
    const currentMonday = new Date(now);
    const day = currentMonday.getDay();
    const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
    currentMonday.setDate(diff);
    currentMonday.setHours(0, 0, 0, 0);
    
    return startDate < currentMonday;
  }
  if (recurrence === 'monthly') {
    return startDate.getMonth() !== now.getMonth() ||
           startDate.getFullYear() !== now.getFullYear();
  }
  return false;
}

// ─── Chronology Board Subcomponents ──────────────────────────────────────────

interface SupportingGoalTaskItemProps {
  task: Task;
  orgId: string | undefined;
  actor: { uid: string; name: string };
  memberMap: Map<string, { fullName: string }>;
}

const SupportingGoalTaskItem = ({ task, orgId, actor, memberMap }: SupportingGoalTaskItemProps) => {
  const [updating, setUpdating] = React.useState(false);
  const priorityClass = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.none;
  const assigneeId = task.assigneeIds[0];
  const assigneeName = assigneeId ? (memberMap.get(assigneeId)?.fullName ?? 'Unknown') : '';

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!orgId || updating) return;
    setUpdating(true);
    try {
      const nextStatus = task.status === 'done' ? 'todo' : 'done';
      await moveTask(task.id, orgId, nextStatus, task.orderIndex, task.status, actor);
    } catch (err) {
      console.error('Failed to toggle task completion:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-border-default/30 last:border-0 hover:bg-bg-tertiary/40 px-3 rounded-lg transition-all group/task">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={handleToggleComplete}
          disabled={updating}
          className={cn(
            "h-4 w-4 rounded border flex items-center justify-center transition-all relative shrink-0 disabled:opacity-50",
            task.status === 'done' 
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" 
              : "border-border-default/80 hover:border-primary hover:bg-primary/5 text-transparent"
          )}
        >
          {updating ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />
          ) : task.status === 'done' ? (
            <Check className="h-2.5 w-2.5 stroke-[3px]" />
          ) : (
            <Check className="h-2.5 w-2.5 opacity-0 group-hover/task:opacity-100 group-hover/task:text-primary transition-opacity" />
          )}
        </button>
        <span className={cn(
          "text-[12px] font-medium text-foreground transition-all line-clamp-1",
          task.status === 'done' && "line-through text-muted-foreground opacity-60"
        )}>
          {task.title}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.priority !== 'none' && (
          <Badge variant="outline" className={cn("h-4 text-[8px] px-1.5 font-bold uppercase tracking-wider", priorityClass)}>
            {task.priority}
          </Badge>
        )}
        {assigneeName && (
          <div
            title={assigneeName}
            className="h-5 w-5 rounded-md flex items-center justify-center text-[7px] font-bold text-white shadow"
            style={{ background: `hsl(${avatarHue(assigneeId || '')} 60% 45%)` }}
          >
            {avatarInitials(assigneeName)}
          </div>
        )}
      </div>
    </div>
  );
};

interface GoalDashboardCardProps {
  goal: Goal;
  supportingTasks: Task[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  inlineTaskTitle: string;
  onInlineTaskTitleChange: (val: string) => void;
  onAddInlineTask: () => void;
  orgId: string | undefined;
  actor: { uid: string; name: string };
  memberMap: Map<string, { fullName: string }>;
}

const GoalDashboardCard = ({
  goal,
  supportingTasks,
  isExpanded,
  onToggleExpand,
  inlineTaskTitle,
  onInlineTaskTitleChange,
  onAddInlineTask,
  orgId,
  actor,
  memberMap,
}: GoalDashboardCardProps) => {
  const streak = React.useMemo(() => calculateStreak(goal), [goal]);
  
  const isVision = goal.horizon === 'long_term';
  const horizonLabel = isVision ? 'Vision' : 'Milestone';
  const horizonClass = isVision 
    ? 'text-violet-400 border-violet-500/20 bg-violet-500/5' 
    : 'text-sky-400 border-sky-500/20 bg-sky-500/5';

  const recurrenceLabel = goal.recurrence && goal.recurrence !== 'none'
    ? goal.recurrence.charAt(0).toUpperCase() + goal.recurrence.slice(1)
    : null;

  const recurrenceClass = goal.recurrence === 'daily'
    ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
    : goal.recurrence === 'weekly'
    ? 'text-amber-400 border-amber-500/20 bg-amber-500/5'
    : 'text-rose-400 border-rose-500/20 bg-rose-500/5';

  const historyDots = React.useMemo(() => {
    const dots: ('completed' | 'incomplete' | 'empty')[] = [];
    const history = goal.cycleHistory || [];
    const recentHistory = [...history]
      .sort((a, b) => a.cycleEnd.toDate().getTime() - b.cycleEnd.toDate().getTime())
      .slice(-5);
    
    const emptyCount = 5 - recentHistory.length;
    for (let i = 0; i < emptyCount; i++) {
      dots.push('empty');
    }
    for (const h of recentHistory) {
      dots.push(h.status);
    }
    return dots;
  }, [goal.cycleHistory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAddInlineTask();
    }
  };

  return (
    <div 
      className={cn(
        "rounded-xl border border-border-default/60 bg-surface/50 backdrop-blur-md p-4 transition-all duration-300",
        "hover:border-primary/45 hover:shadow-xl hover:shadow-primary/5",
        isExpanded && "border-primary/30 shadow-lg shadow-black/10 bg-surface/80"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border', horizonClass)}>
              {horizonLabel}
            </span>
            {recurrenceLabel && (
              <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border', recurrenceClass)}>
                {recurrenceLabel}
              </span>
            )}
            {goal.recurrence !== 'none' && streak > 0 && (
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5 animate-pulse-subtle">
                ⚡ {streak} streak
              </span>
            )}
          </div>

          <h4 
            onClick={onToggleExpand}
            className="text-[13px] font-bold text-foreground hover:text-primary transition-colors cursor-pointer leading-snug line-clamp-2"
          >
            {goal.title}
          </h4>

          {goal.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">
              {goal.description}
            </p>
          )}
        </div>

        <button 
          onClick={onToggleExpand}
          className="h-7 w-7 rounded-lg hover:bg-bg-tertiary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {goal.recurrence !== 'none' && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">CYCLE HISTORY</span>
          <div className="flex items-center gap-1.5">
            {historyDots.map((status, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-2 w-2 rounded-full border shadow-inner transition-all duration-300",
                  status === 'completed' && "bg-emerald-500 border-emerald-400/40 shadow-emerald-500/20 glow-sm",
                  status === 'incomplete' && "bg-red-500 border-red-400/40 shadow-red-500/20",
                  status === 'empty' && "bg-transparent border-border-default/50"
                )}
                title={
                  status === 'completed' 
                    ? "Completed Cycle" 
                    : status === 'incomplete' 
                    ? "Incomplete Cycle" 
                    : "Upcoming Cycle"
                }
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1 font-semibold">
          <span>COMPLETION RATE</span>
          <span className="font-bold text-foreground">{goal.progressRollup ?? 0}%</span>
        </div>
        <div className="h-1.5 w-full bg-bg-tertiary rounded-full overflow-hidden shadow-inner">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out shadow-sm",
              isVision ? "bg-gradient-to-r from-violet-500 to-indigo-500 shadow-violet-500/30" : "bg-gradient-to-r from-sky-500 to-blue-500 shadow-sky-500/30"
            )}
            style={{ width: `${goal.progressRollup ?? 0}%` }}
          />
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-4 pt-3 border-t border-border-default/45 space-y-3"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">SUPPORTING TASKS</p>
              {supportingTasks.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic py-1">No active supporting tasks. Add one below!</p>
              ) : (
                <div className="space-y-1 bg-bg-primary/30 p-1.5 rounded-lg border border-border-default/20">
                  {supportingTasks.map((t) => (
                    <SupportingGoalTaskItem
                      key={t.id}
                      task={t}
                      orgId={orgId}
                      actor={actor}
                      memberMap={memberMap}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a supporting task..."
                value={inlineTaskTitle}
                onChange={(e) => onInlineTaskTitleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 rounded-lg border border-border-default bg-bg-primary px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-all shadow-inner"
              />
              <Button
                size="sm"
                disabled={!inlineTaskTitle.trim()}
                onClick={onAddInlineTask}
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-white border-none shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TaskItem = ({ 
  task, 
  memberMap,
  orgId,
  actor,
}: { 
  task: Task; 
  memberMap: Map<string, { fullName: string }>;
  orgId: string | undefined;
  actor: { uid: string; name: string };
}) => {
  const [completing, setCompleting] = React.useState(false);
  const firstAssignee = task.assigneeIds[0];
  const assigneeName = firstAssignee ? (memberMap.get(firstAssignee)?.fullName ?? 'Unknown') : '—';
  const dueStr = task.dueDate ? task.dueDate.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No due date';
  const priorityClass = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.none;

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (completing || !orgId) return;
    setCompleting(true);
    try {
      const newStatus = task.creatorId !== actor.uid ? 'review' : 'done';
      await moveTask(task.id, orgId, newStatus, task.orderIndex, task.status, actor);
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="group flex items-center justify-between py-4 border-b border-border-default last:border-0 hover:bg-bg-tertiary px-4 -mx-4 rounded-xl transition-all cursor-pointer">
      <div className="flex items-center gap-4">
        <button
          onClick={handleComplete}
          disabled={completing}
          className="h-5 w-5 rounded-full border border-border-default/80 flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-all relative shrink-0 disabled:opacity-50"
        >
          {completing ? (
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          ) : (
            <Check className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
        <div>
          <h4 className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">{task.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`h-4 text-[9px] px-1.5 font-bold uppercase tracking-wider ${priorityClass}`}>
              {task.priority}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{dueStr}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="h-6 w-6 rounded-lg flex items-center justify-center text-[8px] font-bold text-white shadow"
          style={{ background: `hsl(${avatarHue(firstAssignee || '')} 60% 45%)` }}
        >
          {avatarInitials(assigneeName)}
        </div>
        <MoreHorizontal className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};

// ─── Pending Request Card (for dashboard) ─────────────────────────────────────

const PendingRequestCard = ({
  req, currentUid, currentName, orgId,
}: { req: OrgRequest; currentUid: string; currentName: string; orgId: string }) => {
  const [acting, setActing] = React.useState(false);

  async function act(status: 'approved' | 'rejected') {
    setActing(true);
    await updateRequestStatus(req.id, orgId, status, currentUid, currentName, req.creatorId, req.title);
    setActing(false);
  }

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 space-y-2.5 hover:bg-amber-400/8 transition-colors">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-500 shrink-0">
          <RequestIcon name={REQUEST_TYPE_ICONS[req.type]} className="h-4 w-4" />
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-foreground truncate">{req.title}</p>
          <p className="text-[10px] text-muted-foreground">{REQUEST_TYPE_LABELS[req.type]} · from {req.creatorName}</p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">{req.description}</p>
      <div className="flex gap-2 pt-1">
        <button
          disabled={acting}
          onClick={() => act('approved')}
          className="flex-1 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
        >
          {acting ? '…' : '✓ Approve'}
        </button>
        <button
          disabled={acting}
          onClick={() => act('rejected')}
          className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[11px] font-bold hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          ✕ Reject
        </button>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function DashboardHome() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { goals, loading: goalsLoading } = useGoals(orgId);
  const [expandedGoalId, setExpandedGoalId] = React.useState<string | null>(null);
  const [inlineTaskTitles, setInlineTaskTitles] = React.useState<Record<string, string>>({});
  const { channels, hasUnread } = useChannels(orgId);
  const { teams } = useTeams(orgId);
  const { projects } = useProjects(orgId);
  const members = useOrgMembers(orgId);
  const { unreadCount, loading: notifsLoading } = useNotifications(orgId);
  const { received: receivedRequests } = useRequests(orgId);
  const pendingRequests = receivedRequests.filter((r) => r.status === 'pending').slice(0, 3);

  // Focus status state
  const [focusInput, setFocusInput] = React.useState(userProfile?.focusStatus?.text || '');
  const [savingFocus, setSavingFocus] = React.useState(false);
  const [focusSavedNotif, setFocusSavedNotif] = React.useState(false);

  // Selected teammate profile drawer state
  const [selectedMember, setSelectedMember] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    if (userProfile?.focusStatus?.text) {
      setFocusInput(userProfile.focusStatus.text);
    }
  }, [userProfile?.focusStatus?.text]);

  const memberMap = React.useMemo(() => {
    const m = new Map<string, UserProfile>();
    members.forEach((mem) => m.set(mem.uid, mem));
    return m;
  }, [members]);

  const actor = React.useMemo(() => ({
    uid: userProfile?.uid ?? '',
    name: userProfile?.fullName || 'Unknown',
  }), [userProfile]);

  // Check access to profiles in slide-over drawer
  const hasAccessToProfile = React.useCallback((memberUid: string) => {
    if (!userProfile) return false;
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    if (userProfile.uid === memberUid) return true;
    const isManagerForThisUser = teams.some(t => 
      t.managerId === userProfile.uid && t.memberIds?.includes(memberUid)
    );
    return isManagerForThisUser;
  }, [userProfile, teams]);

  // Handle focus status update
  const handleSaveFocus = async () => {
    if (!userProfile?.uid) return;
    setSavingFocus(true);
    try {
      await updateUserProfile(userProfile.uid, {
        focusStatus: {
          text: focusInput,
          updatedAt: Timestamp.now()
        }
      });
      setFocusSavedNotif(true);
      setTimeout(() => setFocusSavedNotif(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingFocus(false);
    }
  };

  const handleAddInlineTask = async (goalId: string) => {
    const title = inlineTaskTitles[goalId]?.trim();
    if (!title || !orgId) return;
    try {
      await createTask({
        orgId,
        title,
        status: 'todo',
        goalId,
        actor,
      });
      setInlineTaskTitles(prev => ({ ...prev, [goalId]: '' }));
    } catch (err) {
      console.error('Failed to create inline task:', err);
    }
  };

  // Background Auto-Reset Engine
  React.useEffect(() => {
    const checkAndResetCycles = async () => {
      if (!goals || goals.length === 0 || !orgId || tasksLoading) return;
      
      for (const goal of goals) {
        if (goal.recurrence === 'none' || goal.status !== 'active') continue;
        
        if (isCycleExpired(goal.recurrence, goal.currentCycleStart)) {
          try {
            const supportingTasks = tasks.filter(t => t.goalId === goal.id);
            const completedTasksCount = supportingTasks.filter(t => t.status === 'done').length;
            const totalTasksCount = supportingTasks.length;
            const cycleStatus = (goal.progressRollup ?? 0) >= 100 ? 'completed' : 'incomplete';
            
            const record: GoalCycleRecord = {
              cycleStart: goal.currentCycleStart || Timestamp.now(),
              cycleEnd: Timestamp.now(),
              status: cycleStatus,
              completedTasksCount,
              totalTasksCount,
            };
            
            const newHistory = [...(goal.cycleHistory || []), record];
            const completedIncrement = cycleStatus === 'completed' ? 1 : 0;
            
            console.log(`Resetting goal cycle for "${goal.title}"`, record);
            
            await updateGoal(goal.id, {
              currentCycleStart: Timestamp.now(),
              completedCyclesCount: (goal.completedCyclesCount || 0) + completedIncrement,
              progressRollup: 0,
              cycleHistory: newHistory,
            });
            
            for (const task of supportingTasks) {
              await updateDoc(doc(db, 'tasks', task.id), {
                status: 'todo',
                completedAt: null,
                updatedAt: serverTimestamp(),
              });
            }
          } catch (err) {
            console.error('Error resetting goal cycle:', err);
          }
        }
      }
    };
    checkAndResetCycles();
  }, [goals, tasks, orgId, actor, tasksLoading]);

  const visionGoals = React.useMemo(() => 
    goals.filter(g => g.horizon === 'long_term' && g.recurrence === 'none' && g.status === 'active'),
    [goals]
  );

  const milestoneGoals = React.useMemo(() => 
    goals.filter(g => g.horizon === 'short_term' && g.recurrence === 'none' && g.status === 'active'),
    [goals]
  );

  const routineGoals = React.useMemo(() => 
    goals.filter(g => g.recurrence !== 'none' && g.status === 'active'),
    [goals]
  );

  // Determine user's squad teammates
  const mySquads = React.useMemo(() => {
    if (!userProfile?.uid) return [];
    return teams.filter(t => t.memberIds?.includes(userProfile.uid) || t.managerId === userProfile.uid);
  }, [teams, userProfile?.uid]);

  const squadMemberIds = React.useMemo(() => {
    const ids = new Set<string>();
    mySquads.forEach(t => {
      t.memberIds?.forEach(id => ids.add(id));
      ids.add(t.managerId);
    });
    return Array.from(ids);
  }, [mySquads]);

  const squadTeammates = React.useMemo(() => {
    return members.filter(m => squadMemberIds.includes(m.uid) && m.uid !== userProfile?.uid);
  }, [members, squadMemberIds, userProfile?.uid]);

  const displayedTeammates = squadTeammates.length > 0 ? squadTeammates : members.filter(m => m.uid !== userProfile?.uid);

  // Task metrics & Weekly Sprint Velocity
  const myTasks = React.useMemo(() => {
    if (!userProfile?.uid) return [];
    return tasks.filter((t) => t.assigneeIds.includes(userProfile.uid) && t.status !== 'done' && t.status !== 'review');
  }, [tasks, userProfile?.uid]);

  const todayTasks = React.useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return myTasks.filter((t) => t.dueDate && t.dueDate.toDate() <= today);
  }, [myTasks]);

  const inProgressTasks = React.useMemo(() => myTasks.filter((t) => t.status === 'in_progress'), [myTasks]);

  // Calculate Sprint Velocity metrics (tasks due in current calendar week)
  const sprintTasks = React.useMemo(() => {
    if (!userProfile?.uid) return [];
    
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    endOfWeek.setHours(23, 59, 59, 999);

    const weekTasks = tasks.filter(t => {
      const isAssignee = t.assigneeIds.includes(userProfile.uid);
      if (!isAssignee) return false;
      if (!t.dueDate) return false;
      const due = t.dueDate.toDate();
      return due >= startOfWeek && due <= endOfWeek;
    });

    // Fallback: If no tasks are specifically due this week, count all tasks assigned to user currently
    if (weekTasks.length === 0) {
      return tasks.filter(t => t.assigneeIds.includes(userProfile.uid));
    }
    return weekTasks;
  }, [tasks, userProfile?.uid]);

  const sprintCompletedCount = React.useMemo(() => {
    return sprintTasks.filter(t => t.status === 'done').length;
  }, [sprintTasks]);

  const sprintPercentage = React.useMemo(() => {
    if (sprintTasks.length === 0) return 0;
    return Math.round((sprintCompletedCount / sprintTasks.length) * 100);
  }, [sprintTasks, sprintCompletedCount]);

  // Sprint Velocity circular SVG element
  const sprintRingRadius = 24;
  const sprintRingCircumference = 2 * Math.PI * sprintRingRadius;
  const sprintRingStrokeDashoffset = sprintRingCircumference - (sprintPercentage / 100) * sprintRingCircumference;

  const sprintArcWidget = (
    <div className="relative h-14 w-14 flex items-center justify-center shrink-0 select-none">
      <svg className="h-full w-full transform -rotate-90">
        <circle
          cx="28"
          cy="28"
          r={sprintRingRadius}
          className="stroke-bg-tertiary"
          strokeWidth="4"
          fill="transparent"
        />
        <motion.circle
          cx="28"
          cy="28"
          r={sprintRingRadius}
          className="stroke-emerald-500"
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={sprintRingCircumference}
          initial={{ strokeDashoffset: sprintRingCircumference }}
          animate={{ strokeDashoffset: sprintRingStrokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xs font-bold text-foreground">{sprintPercentage}%</span>
      </div>
    </div>
  );

  // Direct Report Reviews feed for Managers
  const isManager = React.useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.role === 'owner' || userProfile.role === 'admin' || userProfile.isManager) return true;
    return teams.some(t => t.managerId === userProfile.uid);
  }, [userProfile, teams]);

  const managedTeammateUids = React.useMemo(() => {
    if (!userProfile || !isManager) return new Set<string>();
    const ids = new Set<string>();
    
    // Squad member UIDs managed by user
    teams.forEach(t => {
      if (t.managerId === userProfile.uid) {
        t.memberIds?.forEach(id => ids.add(id));
      }
    });

    // Direct reports UIDs
    members.forEach(m => {
      if (m.managerId === userProfile.uid) {
        ids.add(m.uid);
      }
    });

    return ids;
  }, [userProfile, isManager, teams, members]);

  const reviewTasksForTeam = React.useMemo(() => {
    if (!isManager || managedTeammateUids.size === 0) return [];
    return tasks.filter(t => 
      t.status === 'review' && 
      t.assigneeIds.some(id => managedTeammateUids.has(id))
    );
  }, [isManager, managedTeammateUids, tasks]);

  // Handle in-line review actions
  const handleReviewAction = async (task: Task, action: 'approve' | 'reject') => {
    if (!orgId) return;
    try {
      const newStatus = action === 'approve' ? 'done' : 'in_progress';
      await moveTask(task.id, orgId, newStatus, task.orderIndex, task.status, actor);
    } catch (err) {
      console.error(err);
    }
  };

  const [taskTab, setTaskTab] = React.useState<'all' | 'today' | 'progress'>('all');

  const displayedTasks = React.useMemo(() => {
    const base = taskTab === 'today'    ? todayTasks
               : taskTab === 'progress' ? inProgressTasks
               : myTasks;
    return base.slice(0, 5);
  }, [taskTab, myTasks, todayTasks, inProgressTasks]);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = userProfile?.fullName?.split(' ')[0] ?? 'there';

  // Org name
  const [orgName, setOrgName] = React.useState('your organization');
  React.useEffect(() => {
    if (!orgId) return;
    import('../lib/firestore').then(({ getOrgById }) =>
      getOrgById(orgId).then((org) => { if (org) setOrgName(org.name); })
    );
  }, [orgId]);

  // Channels with unread badge — take top 4 with most recent activity
  const recentChannels = React.useMemo(() => {
    return [...channels]
      .sort((a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0))
      .slice(0, 3);
  }, [channels]);

  function relTime(ts: any): string {
    if (!ts?.toDate) return '';
    const diff = Date.now() - ts.toDate().getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <div className="space-y-6 sm:space-y-10 p-4 sm:p-6 md:p-10 pb-20">
      {/* Hero & Focus Input */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-default/45 pb-6">
        <div className="space-y-3">
          <div className="space-y-1">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl font-bold tracking-tight text-foreground"
            >
              {greeting}, {displayName}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground text-sm font-medium"
            >
              Welcome to the premium command center for {orgName}.
            </motion.p>
          </div>
          
          {/* Daily Focus status Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center gap-3"
          >
            <div className="relative flex items-center gap-2 p-2 px-3 rounded-xl border border-border-default/60 bg-bg-tertiary w-full sm:w-[380px] group transition-all focus-within:border-primary/50 shadow-inner">
              <Target className="h-4 w-4 text-primary shrink-0 animate-pulse-subtle" />
              <input
                type="text"
                placeholder="What is your focus today?..."
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveFocus();
                }}
                className="flex-1 bg-transparent border-none text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 p-0"
              />
              <AnimatePresence>
                {focusInput !== (userProfile?.focusStatus?.text || '') && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={handleSaveFocus}
                    disabled={savingFocus}
                    className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/95 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {savingFocus ? 'Saving...' : 'Set'}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            
            {focusSavedNotif && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5"
              >
                <Sparkles className="h-3 w-3" /> Focus synced with squad
              </motion.span>
            )}
          </motion.div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="outline" className="h-10 bg-bg-tertiary border-border-default text-xs font-bold gap-2">
            <Filter className="h-3.5 w-3.5" /> Filter
          </Button>
          <Button
            className="h-10 shadow-lg shadow-primary/20 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground border-none"
            onClick={() => navigate('/tasks')}
          >
            <Plus className="h-4 w-4" /> New Task
          </Button>
        </div>
      </section>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Sprint Progress" 
          value={sprintTasks.length > 0 ? `${sprintCompletedCount}/${sprintTasks.length}` : '0/0'} 
          subtitle="Tasks completed this week"
          icon={TrendingUp} 
          color="bg-emerald-500" 
          delay={0.2}
          loading={tasksLoading}
          rightElement={sprintArcWidget}
        />
        <MetricCard 
          title="My Active Tasks" 
          value={myTasks.length} 
          subtitle={`${todayTasks.length} due today`}
          icon={CheckCircle2} 
          color="bg-indigo-500" 
          delay={0.3}
          loading={tasksLoading}
        />
        <MetricCard 
          title="Active Focuses" 
          value={displayedTeammates.filter(m => m.focusStatus?.text).length}
          subtitle="Teammates with active focus"
          icon={Target} 
          color="bg-amber-500" 
          delay={0.4}
          loading={false}
        />
        <MetricCard 
          title="Pending Inbox" 
          value={notifsLoading ? '—' : unreadCount}
          subtitle="Notifications pending"
          icon={MessageSquare} 
          color="bg-blue-500" 
          delay={0.5}
          loading={notifsLoading}
        />
      </div>

      {/* Pending Approvals & Teammate Reviews Stream */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Pending Request / Approvals */}
        {pendingRequests.length > 0 && (
          <div className="xl:col-span-1 flex flex-col gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Pending Approvals</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Requests waiting for your action</p>
            </div>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <PendingRequestCard
                  key={req.id}
                  req={req}
                  currentUid={userProfile!.uid}
                  currentName={userProfile!.fullName}
                  orgId={orgId!}
                />
              ))}
            </div>
          </div>
        )}

        {/* Teammate Review Stream (For Managers only) */}
        {isManager && reviewTasksForTeam.length > 0 && (
          <div className={`${pendingRequests.length > 0 ? 'xl:col-span-2' : 'xl:col-span-3'} flex flex-col gap-3`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Direct Report Reviews Feed</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Tasks submitted by your squad for completion approval</p>
              </div>
              <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold">
                {reviewTasksForTeam.length} Review Pending
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewTasksForTeam.map((task) => {
                const assigneeName = task.assigneeIds.map(id => memberMap.get(id)?.fullName).filter(Boolean).join(', ');
                const assigneeId = task.assigneeIds[0] || '';
                return (
                  <motion.div 
                    layoutId={task.id}
                    key={task.id}
                    className="p-4 rounded-2xl border border-border-default/60 bg-surface flex flex-col justify-between gap-4 shadow-sm hover:border-border-default transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="h-6 w-6 rounded-lg flex items-center justify-center text-[9px] font-bold text-white shrink-0 shadow"
                            style={{ background: `hsl(${avatarHue(assigneeId)} 60% 45%)` }}
                          >
                            {avatarInitials(assigneeName)}
                          </div>
                          <span className="text-[11px] font-semibold text-foreground truncate">{assigneeName}</span>
                        </div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">In Review</span>
                      </div>
                      <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-2">{task.title}</h4>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReviewAction(task, 'approve')}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/25 transition-colors flex items-center justify-center gap-1"
                      >
                        <ThumbsUp className="h-3 w-3" /> Approve & Done
                      </button>
                      <button
                        onClick={() => handleReviewAction(task, 'reject')}
                        className="flex-1 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 text-[10px] font-bold hover:bg-orange-500/20 transition-colors flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" /> Needs Changes
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* My Focus Objectives & Routines Board */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> My Focus Objectives & Routines
            </h2>
            <p className="text-xs text-muted-foreground font-medium">Align your daily actions with high-level vision and recurring schedules</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vision (Long-term) Column */}
          <div className="rounded-2xl border border-border-default/50 bg-surface/20 backdrop-blur-md p-5 space-y-4 shadow-xl shadow-black/5 flex flex-col">
            <div className="flex items-center justify-between border-b border-border-default/30 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-violet-400 glow-sm" />
                <h3 className="text-sm font-bold text-foreground tracking-wide uppercase">VISION</h3>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground bg-bg-tertiary px-2 py-0.5 rounded-full border border-border-default/40">
                {visionGoals.length} ACTIVE
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1 flex-1">
              {goalsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                </div>
              ) : visionGoals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border-default/55 rounded-xl bg-bg-tertiary/20">
                  <Sparkles className="h-6 w-6 text-text-muted mb-2 opacity-50" />
                  <p className="text-xs text-muted-foreground font-medium">No long-term visions</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 max-w-[150px]">Define a core purpose or major multi-month goal.</p>
                </div>
              ) : (
                visionGoals.map((goal) => (
                  <GoalDashboardCard
                    key={goal.id}
                    goal={goal}
                    supportingTasks={tasks.filter(t => t.goalId === goal.id)}
                    isExpanded={expandedGoalId === goal.id}
                    onToggleExpand={() => setExpandedGoalId(expandedGoalId === goal.id ? null : goal.id)}
                    inlineTaskTitle={inlineTaskTitles[goal.id] || ''}
                    onInlineTaskTitleChange={(val) => setInlineTaskTitles(prev => ({ ...prev, [goal.id]: val }))}
                    onAddInlineTask={() => handleAddInlineTask(goal.id)}
                    orgId={orgId}
                    actor={actor}
                    memberMap={memberMap}
                  />
                ))
              )}
            </div>
          </div>

          {/* Milestones (Short-term) Column */}
          <div className="rounded-2xl border border-border-default/50 bg-surface/20 backdrop-blur-md p-5 space-y-4 shadow-xl shadow-black/5 flex flex-col">
            <div className="flex items-center justify-between border-b border-border-default/30 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-sky-400 glow-sm" />
                <h3 className="text-sm font-bold text-foreground tracking-wide uppercase">MILESTONES</h3>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground bg-bg-tertiary px-2 py-0.5 rounded-full border border-border-default/40">
                {milestoneGoals.length} ACTIVE
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1 flex-1">
              {goalsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                </div>
              ) : milestoneGoals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border-default/55 rounded-xl bg-bg-tertiary/20">
                  <Target className="h-6 w-6 text-text-muted mb-2 opacity-50" />
                  <p className="text-xs text-muted-foreground font-medium">No short-term milestones</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 max-w-[150px]">Define immediate high-priority objectives to strive for.</p>
                </div>
              ) : (
                milestoneGoals.map((goal) => (
                  <GoalDashboardCard
                    key={goal.id}
                    goal={goal}
                    supportingTasks={tasks.filter(t => t.goalId === goal.id)}
                    isExpanded={expandedGoalId === goal.id}
                    onToggleExpand={() => setExpandedGoalId(expandedGoalId === goal.id ? null : goal.id)}
                    inlineTaskTitle={inlineTaskTitles[goal.id] || ''}
                    onInlineTaskTitleChange={(val) => setInlineTaskTitles(prev => ({ ...prev, [goal.id]: val }))}
                    onAddInlineTask={() => handleAddInlineTask(goal.id)}
                    orgId={orgId}
                    actor={actor}
                    memberMap={memberMap}
                  />
                ))
              )}
            </div>
          </div>

          {/* Routines Column */}
          <div className="rounded-2xl border border-border-default/50 bg-surface/20 backdrop-blur-md p-5 space-y-4 shadow-xl shadow-black/5 flex flex-col">
            <div className="flex items-center justify-between border-b border-border-default/30 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 glow-sm" />
                <h3 className="text-sm font-bold text-foreground tracking-wide uppercase">ROUTINES</h3>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground bg-bg-tertiary px-2 py-0.5 rounded-full border border-border-default/40">
                {routineGoals.length} ACTIVE
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1 flex-1">
              {goalsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                </div>
              ) : routineGoals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border-default/55 rounded-xl bg-bg-tertiary/20">
                  <Calendar className="h-6 w-6 text-text-muted mb-2 opacity-50" />
                  <p className="text-xs text-muted-foreground font-medium">No active routines</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 max-w-[150px]">Create daily, weekly, or monthly recurring goals to track streaks.</p>
                </div>
              ) : (
                routineGoals.map((goal) => (
                  <GoalDashboardCard
                    key={goal.id}
                    goal={goal}
                    supportingTasks={tasks.filter(t => t.goalId === goal.id)}
                    isExpanded={expandedGoalId === goal.id}
                    onToggleExpand={() => setExpandedGoalId(expandedGoalId === goal.id ? null : goal.id)}
                    inlineTaskTitle={inlineTaskTitles[goal.id] || ''}
                    onInlineTaskTitleChange={(val) => setInlineTaskTitles(prev => ({ ...prev, [goal.id]: val }))}
                    onAddInlineTask={() => handleAddInlineTask(goal.id)}
                    orgId={orgId}
                    actor={actor}
                    memberMap={memberMap}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Grid Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Tasks Section */}
        <Card className="border-border-default bg-surface backdrop-blur-sm shadow-xl shadow-black/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-foreground">My Tasks</CardTitle>
              <CardDescription className="text-xs font-medium">Daily tasks assigned to you</CardDescription>
            </div>
            <Button
              variant="ghost" size="sm"
              className="h-8 text-[11px] font-bold text-primary hover:bg-primary/5"
              onClick={() => navigate('/tasks')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs value={taskTab} onValueChange={(v) => setTaskTab(v as any)} className="w-full">
              <TabsList className="bg-bg-tertiary border border-border-default h-8 p-1 mb-4">
                <TabsTrigger value="all"      className="text-[10px] font-bold px-4 h-6">ALL ({myTasks.length})</TabsTrigger>
                <TabsTrigger value="today"    className="text-[10px] font-bold px-4 h-6">DUE TODAY ({todayTasks.length})</TabsTrigger>
                <TabsTrigger value="progress" className="text-[10px] font-bold px-4 h-6">IN PROGRESS ({inProgressTasks.length})</TabsTrigger>
              </TabsList>
              <div className="mt-4">
                {tasksLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                  </div>
                ) : displayedTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <CheckCircle2 className="h-8 w-8 text-text-muted mb-2" />
                    <p className="text-xs text-muted-foreground">No tasks here</p>
                  </div>
                ) : (
                  displayedTasks.map((task) => (
                    <TaskItem key={task.id} task={task} memberMap={memberMap} orgId={orgId} actor={actor} />
                  ))
                )}
              </div>
              <Button
                variant="ghost"
                className="w-full mt-4 h-10 border-dashed border border-border-default text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-bg-tertiary transition-all"
                onClick={() => navigate('/tasks')}
              >
                <Plus className="h-3.5 w-3.5 mr-2" /> Add new task
              </Button>
            </Tabs>
          </CardContent>
        </Card>

        {/* Squad Focus & Co-Presence Hub (Replaces static list) */}
        <Card className="border-border-default bg-surface backdrop-blur-sm shadow-xl shadow-black/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-foreground">Squad Focus & Co-Presence</CardTitle>
              <CardDescription className="text-xs font-medium">
                {squadTeammates.length > 0 ? "Daily focuses from your active squad mates" : `Everyone in ${orgName}`}
              </CardDescription>
            </div>
            {squadTeammates.length > 0 && (
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold px-2 py-0.5">
                Active Squad
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {displayedTeammates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="h-8 w-8 text-text-muted mb-2" />
                <p className="text-xs text-muted-foreground">No other members in this workspace yet.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                {displayedTeammates.map((member) => {
                  const hasFocus = !!member.focusStatus?.text;
                  const isTeammateOnline = hasFocus; // Soft real-time status: online if focus updated recently or set
                  const hue = avatarHue(member.uid);
                  const initials = avatarInitials(member.fullName || member.username || '?');
                  const targetProfileAccess = hasAccessToProfile(member.uid);
                  
                  return (
                    <motion.div 
                      key={member.uid} 
                      whileHover={{ scale: 1.01, x: 2 }}
                      onClick={() => {
                        if (targetProfileAccess) {
                          setSelectedMember(member);
                        }
                      }}
                      className={`group flex items-start justify-between p-3.5 border border-border-default/45 rounded-2xl bg-bg-tertiary/20 hover:bg-bg-tertiary transition-all ${targetProfileAccess ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Avatar with Co-Presence pulsing ring */}
                        <div className="relative shrink-0 mt-0.5">
                          <div
                            className="h-9 w-9 rounded-2xl flex items-center justify-center text-xs font-bold text-white shadow-inner"
                            style={{ background: `hsl(${hue} 60% 45%)` }}
                          >
                            {initials}
                          </div>
                          
                          {/* Pulsing indicator */}
                          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-surface border-2 border-surface flex items-center justify-center">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isTeammateOnline ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isTeammateOnline ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                            </span>
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[13px] font-bold text-foreground truncate group-hover:text-primary transition-colors leading-tight">
                              {member.fullName}
                            </p>
                            <span className="text-[9px] font-semibold text-muted-foreground/85 truncate">
                              · {member.designation || member.role}
                            </span>
                          </div>

                          {/* Focus text */}
                          {hasFocus ? (
                            <p className="text-[11px] text-foreground font-semibold mt-1 flex items-center gap-1">
                              <Target className="h-3 w-3 text-primary shrink-0" />
                              <span className="line-clamp-1 italic">{member.focusStatus!.text}</span>
                            </p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground italic mt-1 leading-relaxed">
                              No focus status set today
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {targetProfileAccess ? (
                          <ArrowRight className="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <HelpCircle className="h-3.5 w-3.5 text-border-default opacity-40" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Strategic Goals & High-Level Milestones */}
        <Card className="border-border-default bg-surface backdrop-blur-sm shadow-xl shadow-black/5 xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-foreground">Strategic Projects Progress</CardTitle>
              <CardDescription className="text-xs font-medium">Real-time status of active workspace projects</CardDescription>
            </div>
            <Button
              variant="ghost" size="sm"
              className="h-8 text-[11px] font-bold text-primary hover:bg-primary/5"
              onClick={() => navigate('/projects')}
            >
              Projects Page
            </Button>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Target className="h-8 w-8 text-text-muted mb-2" />
                <p className="text-xs text-muted-foreground">No active projects yet. Add one in the Projects module.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.slice(0, 3).map((proj) => {
                  const projTasks = tasks.filter(t => t.projectId === proj.id);
                  const completedProjTasks = projTasks.filter(t => t.status === 'done');
                  const percentage = projTasks.length > 0 ? Math.round((completedProjTasks.length / projTasks.length) * 100) : 0;
                  
                  return (
                    <div key={proj.id} className="space-y-2 border border-border-default/45 p-3 rounded-2xl bg-bg-tertiary/15 hover:bg-bg-tertiary/30 transition-colors">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Workflow className="h-3.5 w-3.5 text-primary" />
                          <span className="font-bold text-foreground">{proj.name}</span>
                        </div>
                        <Badge variant="outline" className="h-4 text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold">
                          {percentage}% Done
                        </Badge>
                      </div>
                      
                      <div className="h-1.5 w-full bg-bg-tertiary rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-violet-500 to-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, delay: 0.1 }}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>{completedProjTasks.length} / {projTasks.length} tasks completed</span>
                        {proj.dueDate && (
                          <span>Due {proj.dueDate.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Channels */}
        <Card className="border-border-default bg-surface backdrop-blur-sm shadow-xl shadow-black/5 xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-foreground">Recent Channels</CardTitle>
              <CardDescription className="text-xs font-medium">Latest active workspace discussions</CardDescription>
            </div>
            <Button
              variant="ghost" size="sm"
              className="h-8 text-[11px] font-bold text-primary hover:bg-primary/5"
              onClick={() => navigate('/chat')}
            >
              Open Chat
            </Button>
          </CardHeader>
          <CardContent>
            {recentChannels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <MessageSquare className="h-8 w-8 text-text-muted mb-2" />
                <p className="text-xs text-muted-foreground">No channels yet. Go to Chat to get started.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentChannels.map((ch) => {
                  const unread = hasUnread(ch);
                  return (
                    <div
                      key={ch.id}
                      onClick={() => navigate(`/chat/c/${ch.id}`)}
                      className="group relative flex items-center justify-between py-4 border-b border-border-default last:border-0 hover:bg-bg-tertiary px-4 -mx-4 rounded-xl transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-bg-tertiary flex items-center justify-center border border-border-default shrink-0">
                          <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="space-y-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">#{ch.name}</span>
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                            <span className="text-[10px] text-muted-foreground font-medium">{ch.memberCount} members</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                            {ch.lastMessagePreview ?? ch.description ?? 'No messages yet'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[10px] text-text-muted">
                          {ch.lastMessageAt ? relTime(ch.lastMessageAt) : ''}
                        </span>
                        {unread && (
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shared Slide-over Drawer for Member Profiles */}
      <AnimatePresence>
        {selectedMember && (
          <MemberProfileDrawer
            isOpen={!!selectedMember}
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
            tasks={tasks}
            teams={teams}
            members={members}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
