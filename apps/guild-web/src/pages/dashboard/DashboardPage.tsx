/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DashboardPage — Version 1.0.1
 * Dedicated Executive & Operational Dashboard for Guild.
 * Grounded in Apple & Jony Ive design standards:
 * - Radical minimalism, purposeful decluttering, zero visual noise
 * - Strict dual-theme parity (Neutral Dark Mode & crisp Light Mode)
 * - Section 1: "My Priorities" (Today's Priorities or Upcoming Tasks with 1-click tactile completion)
 * - Section 2: "Team Focus" (Roster with live availability, custom focus, and 1-click DM with loading state)
 * - Section 3: "Operational Approvals & Requests" (Pending Approvals for leads, My Requests for members)
 * - Section 4: "Active Cycle / Sprint Progress" (Only rendered when a real cycle exists in Firestore; zero dummy data)
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  Layers,
  FileCheck2,
  Users,
  Zap,
  Calendar,
  MessageSquare,
  Clock,
  Check,
  X,
  Plus,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  TrendingUp,
  Flame,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspaceData } from '../../context/WorkspaceDataContext';
import { useOrgMembers } from '../../hooks/useChat';
import { useWorkspaceIssues } from '../../hooks/useWorkspaceIssues';
import { useWorkspaceCycles } from '../../hooks/useWorkspaceCycles';
import { getOrCreateDM } from '../../lib/chat';
import {
  moveTask,
  type Task,
  type TaskStatus,
  type TaskPriority,
  type ActorInfo,
} from '../../lib/tasks';
import {
  updateRequestStatus,
  REQUEST_TYPE_LABELS,
  type OrgRequest,
  type RequestType,
} from '../../lib/requests';
import type { WorkspaceIssue, IssueStatus, UserProfile, WorkspaceCycle } from '@guild/types';
import { TaskDetailDrawer } from '../../components/tasks/TaskDetailDrawer';
import { RequestDetailDrawer } from '../../components/tasks/RequestDetailDrawer';
import { IssueDetailDrawer } from '../tasks/IssueDetailDrawer';
import { ApprovalActionModal } from '../tasks/ApprovalActionModal';
import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTimestamp(ts: any): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (ts.seconds) return ts.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  const n = new Date(ts).getTime();
  return isNaN(n) ? 0 : n;
}

function formatRelativeTime(ts: any): string {
  const ms = parseTimestamp(ts);
  if (!ms) return 'recently';
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedToday(): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
}

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

// ─── Unified Priority Item ─────────────────────────────────────────────────────

interface UnifiedPriorityItem {
  id: string;
  kind: 'task' | 'issue';
  title: string;
  status: string;
  isCompleted: boolean;
  priority: 'urgent' | 'high' | 'medium' | 'low' | 'none';
  dueDate?: any;
  identifier?: string;
  estimatePoints?: number | null;
  rawTask?: Task;
  rawIssue?: WorkspaceIssue;
}

function isDueTodayOrOverdueOrUrgent(item: UnifiedPriorityItem): boolean {
  if (item.priority === 'urgent') return true;
  if (!item.dueDate) return false;
  const dueMs = parseTimestamp(item.dueDate);
  if (!dueMs) return false;
  const now = new Date();
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  ).getTime();
  return dueMs <= endOfToday;
}

function getAvailabilityConfig(status?: 'active' | 'focus' | 'away') {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        dotClass: 'bg-emerald-500 ring-2 ring-surface',
        badgeClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      };
    case 'focus':
      return {
        label: 'Focusing',
        dotClass: 'bg-indigo-500 ring-2 ring-surface',
        badgeClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      };
    case 'away':
      return {
        label: 'Away',
        dotClass: 'bg-amber-500 ring-2 ring-surface',
        badgeClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
      };
    default:
      return {
        label: 'Active',
        dotClass: 'bg-emerald-500 ring-2 ring-surface',
        badgeClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const workspace = useWorkspaceData();

  const orgId = userProfile?.organizationId || workspace?.orgId || '';
  const currentUserId = user?.uid || userProfile?.uid || '';

  // Workspace Data
  const allTasks = workspace?.allTasks || [];
  const sentRequests = workspace?.sentRequests || [];
  const receivedRequests = workspace?.receivedRequests || [];
  const projects = workspace?.projects || [];
  const goals = workspace?.goals || [];
  const labels = workspace?.labels || [];
  const org = workspace?.org || null;

  // Org Members
  const members = useOrgMembers(orgId);

  // Issues & Cycles
  const { issues, updateIssue } = useWorkspaceIssues(orgId);
  const { cycles, activeCycle } = useWorkspaceCycles(orgId);

  // Actor
  const actor: ActorInfo = React.useMemo(
    () => ({
      uid: currentUserId,
      name: userProfile?.fullName || 'Teammate',
      username: userProfile?.username || 'user',
    }),
    [currentUserId, userProfile]
  );

  // Manager or Lead Check
  const isManagerOrLead = React.useMemo(() => {
    const role = userProfile?.role;
    return role === 'owner' || role === 'admin' || role === 'manager' || !!userProfile?.isManager;
  }, [userProfile]);

  // Drawer & Modal States
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [selectedIssue, setSelectedIssue] = React.useState<WorkspaceIssue | null>(null);
  const [selectedRequest, setSelectedRequest] = React.useState<OrgRequest | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = React.useState(false);
  const [approvalModal, setApprovalModal] = React.useState<{
    isOpen: boolean;
    request: OrgRequest | null;
    mode: 'approved' | 'rejected';
  }>({ isOpen: false, request: null, mode: 'approved' });

  // Priority Tab State: 'today' | 'upcoming'
  // Auto-surface upcoming tasks if today is empty and upcoming has tasks
  const [priorityTab, setPriorityTab] = React.useState<'today' | 'upcoming'>('today');

  // Sync initial tab when priorities load if today is empty
  React.useEffect(() => {
    if (todaysPriorities.length === 0 && upcomingPriorities.length > 0 && priorityTab === 'today') {
      setPriorityTab('upcoming');
    }
  }, [todaysPriorities.length, upcomingPriorities.length]);

  // Loading state for 1-click DM opening
  const [loadingDmUid, setLoadingDmUid] = React.useState<string | null>(null);

  // ─── Section 1: Aggregated My Priorities ──────────────────────────────────────

  const myUnifiedItems = React.useMemo<UnifiedPriorityItem[]>(() => {
    const items: UnifiedPriorityItem[] = [];

    // 1. Tasks assigned to current user (active)
    for (const t of allTasks) {
      const isAssigned =
        (t.assigneeIds && t.assigneeIds.includes(currentUserId)) ||
        (t.creatorId === currentUserId && (!t.assigneeIds || t.assigneeIds.length === 0));

      if (isAssigned && t.status !== 'done') {
        items.push({
          id: t.id,
          kind: 'task',
          title: t.title,
          status: t.status,
          isCompleted: false,
          priority: t.priority || 'none',
          dueDate: t.dueDate,
          rawTask: t,
        });
      }
    }

    // 2. Issues assigned to current user (active)
    for (const i of issues) {
      if (i.assigneeId === currentUserId && i.status !== 'done' && i.status !== 'canceled') {
        items.push({
          id: i.id,
          kind: 'issue',
          title: i.title,
          status: i.status,
          isCompleted: false,
          priority: i.priority || 'none',
          dueDate: i.dueDate,
          identifier: i.identifier || undefined,
          estimatePoints: i.estimatePoints,
          rawIssue: i,
        });
      }
    }

    return items;
  }, [allTasks, issues, currentUserId]);

  // Priority categorization: Today's Priorities vs Upcoming Tasks
  const { todaysPriorities, upcomingPriorities } = React.useMemo(() => {
    const todayList: UnifiedPriorityItem[] = [];
    const upcomingList: UnifiedPriorityItem[] = [];

    for (const item of myUnifiedItems) {
      if (isDueTodayOrOverdueOrUrgent(item)) {
        todayList.push(item);
      } else {
        upcomingList.push(item);
      }
    }

    const sortFn = (a: UnifiedPriorityItem, b: UnifiedPriorityItem) => {
      const pDiff = (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      const dueA = parseTimestamp(a.dueDate);
      const dueB = parseTimestamp(b.dueDate);
      if (dueA && dueB) return dueA - dueB;
      if (dueA) return -1;
      if (dueB) return 1;
      return 0;
    };

    todayList.sort(sortFn);
    upcomingList.sort(sortFn);

    return {
      todaysPriorities: todayList,
      upcomingPriorities: upcomingList,
    };
  }, [myUnifiedItems]);

  // Active priorities for currently selected tab
  const activePriorities = priorityTab === 'today' ? todaysPriorities : upcomingPriorities;

  // 1-Click Complete Toggle with Spring Feedback
  const handleToggleItemComplete = async (e: React.MouseEvent, item: UnifiedPriorityItem) => {
    e.stopPropagation();

    if (item.kind === 'task' && item.rawTask) {
      try {
        await moveTask(
          item.rawTask.id,
          orgId,
          'done',
          item.rawTask.orderIndex || 0,
          item.rawTask.status,
          actor
        );
      } catch (err) {
        console.error('Failed to complete task:', err);
      }
    } else if (item.kind === 'issue' && item.rawIssue) {
      try {
        await updateIssue(item.rawIssue.id, {
          status: 'done',
          completedAt: new Date() as any,
        });
      } catch (err) {
        console.error('Failed to complete issue:', err);
      }
    }
  };

  // ─── Section 2: Team Focus & DM ──────────────────────────────────────────────

  const teamRoster = React.useMemo(() => {
    return members.filter((m) => m.uid !== currentUserId);
  }, [members, currentUserId]);

  const handleStartDM = async (targetUid: string) => {
    if (!currentUserId || !orgId || loadingDmUid) return;
    try {
      setLoadingDmUid(targetUid);
      const dmId = await getOrCreateDM(currentUserId, targetUid, orgId);
      if (dmId) {
        navigate(`/chat/dm/${dmId}`);
      }
    } catch (err) {
      console.error('Failed to open DM:', err);
    } finally {
      setLoadingDmUid(null);
    }
  };

  // ─── Section 3: Operational Approvals & Requests ─────────────────────────────

  const pendingApprovals = React.useMemo(() => {
    return receivedRequests.filter((r) => r.status === 'pending');
  }, [receivedRequests]);

  const handleConfirmApprovalDecision = async (
    requestId: string,
    status: 'approved' | 'rejected',
    note?: string
  ) => {
    const req = receivedRequests.find((r) => r.id === requestId);
    if (!req) return;

    await updateRequestStatus(
      requestId,
      orgId,
      status,
      userProfile?.uid || currentUserId,
      userProfile?.fullName || 'Approver',
      userProfile?.username || 'approver',
      req.creatorId,
      req.title,
      note || undefined
    );
  };

  // ─── Section 4: Sprint / Cycle Progress (Zero Dummy Data) ────────────────────

  // Only consider a cycle active if it genuinely exists in Firestore with active status
  const currentCycle: WorkspaceCycle | null = React.useMemo(() => {
    return (
      cycles.find((c) => c.status === 'active') ||
      (activeCycle && activeCycle.status === 'active' ? activeCycle : null) ||
      null
    );
  }, [activeCycle, cycles]);

  const cycleIssues = React.useMemo(() => {
    if (!currentCycle) return [];
    return issues.filter((i) => i.cycleId === currentCycle.id);
  }, [currentCycle, issues]);

  const { totalPoints, completedPoints, percentVelocity, daysRemaining, burnRate } =
    React.useMemo(() => {
      if (!currentCycle) {
        return {
          totalPoints: 0,
          completedPoints: 0,
          percentVelocity: 0,
          daysRemaining: 0,
          burnRate: '0.0',
        };
      }

      let total = 0;
      let completed = 0;

      if (cycleIssues.length > 0) {
        total = cycleIssues.reduce((sum, i) => sum + (i.estimatePoints || 1), 0);
        completed = cycleIssues
          .filter((i) => i.status === 'done')
          .reduce((sum, i) => sum + (i.estimatePoints || 1), 0);
      } else {
        total = currentCycle.totalPoints || 0;
        completed = currentCycle.completedPoints || 0;
      }

      const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

      let remainingDays = 0;
      if (currentCycle.endDate) {
        const endMs = parseTimestamp(currentCycle.endDate);
        if (endMs) {
          const diff = Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24));
          remainingDays = Math.max(0, diff);
        }
      }

      let rate = '0.0';
      if (currentCycle.startDate) {
        const startMs = parseTimestamp(currentCycle.startDate);
        const daysElapsed = Math.max(1, Math.floor((Date.now() - startMs) / (1000 * 60 * 60 * 24)));
        rate = completed > 0 ? (completed / daysElapsed).toFixed(1) : '0.0';
      } else {
        rate = completed > 0 ? (completed / Math.max(1, 14 - remainingDays)).toFixed(1) : '0.0';
      }

      return {
        totalPoints: total,
        completedPoints: completed,
        percentVelocity: percent,
        daysRemaining: remainingDays,
        burnRate: rate,
      };
    }, [cycleIssues, currentCycle]);

  // ─── Stats Chip Values ────────────────────────────────────────────────────────

  const statsValues = React.useMemo(() => {
    const activeTasksCount = todaysPriorities.length > 0 ? todaysPriorities.length : myUnifiedItems.length;
    const activeMembersCount = members.filter(
      (m) => m.availabilityStatus === 'active' || m.availabilityStatus === 'focus'
    ).length;
    const operationalCount = isManagerOrLead
      ? pendingApprovals.length
      : sentRequests.filter((r) => r.status === 'pending').length;

    return {
      activeTasksCount,
      activeMembersCount,
      operationalCount,
    };
  }, [todaysPriorities.length, myUnifiedItems.length, members, isManagerOrLead, pendingApprovals.length, sentRequests]);

  // User First Name
  const userFirstName = React.useMemo(() => {
    const full = userProfile?.fullName || '';
    return full.split(' ')[0] || userProfile?.username || 'Teammate';
  }, [userProfile]);

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto space-y-4 pb-8">
      {/* ─── Streamlined Top Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
            {getGreeting()}, {userFirstName}
          </h1>
          <span className="text-border/60 hidden sm:inline">•</span>
          <p className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0" />
            <span>{getFormattedToday()}</span>
          </p>
        </div>

        {/* Quick Action Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setCreateTaskOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-xs hover:opacity-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </motion.button>
        </div>
      </div>

      {/* ─── Compact Stat Ribbon ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Chip 1: My Priorities */}
        <div className="p-3 rounded-2xl bg-surface/80 dark:bg-card/45 border border-border/40 dark:border-border/30 backdrop-blur-xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-foreground tracking-tight leading-none">
              {statsValues.activeTasksCount}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
              {todaysPriorities.length > 0 ? "Today's Priorities" : 'Active Priorities'}
            </div>
          </div>
        </div>

        {/* Chip 2: Team Active */}
        <div className="p-3 rounded-2xl bg-surface/80 dark:bg-card/45 border border-border/40 dark:border-border/30 backdrop-blur-xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-foreground tracking-tight leading-none">
              {statsValues.activeMembersCount} / {members.length}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
              Teammates Active
            </div>
          </div>
        </div>

        {/* Chip 3: Operational Approvals / Requests */}
        <div className="p-3 rounded-2xl bg-surface/80 dark:bg-card/45 border border-border/40 dark:border-border/30 backdrop-blur-xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-foreground tracking-tight leading-none">
              {statsValues.operationalCount}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
              {isManagerOrLead ? 'Pending Approvals' : 'Pending Requests'}
            </div>
          </div>
        </div>

        {/* Chip 4: Sprint Velocity or Rhythm */}
        <div className="p-3 rounded-2xl bg-surface/80 dark:bg-card/45 border border-border/40 dark:border-border/30 backdrop-blur-xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-foreground tracking-tight leading-none">
              {currentCycle ? `${percentVelocity}%` : `${allTasks.filter((t) => t.status === 'done').length}`}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
              {currentCycle ? `Sprint • ${daysRemaining}d left` : 'Completed Tasks'}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Grid: Priorities & Focus Columns ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ─── Primary Column: Priorities & Approvals (8 cols) ─────────────── */}
        <div className="lg:col-span-8 space-y-5">
          {/* ─── Section 1: My Priorities (De-containerized) ──────────────────── */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 min-w-0">
                <CheckSquare className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                  My Priorities
                </h2>
              </div>

              {/* Compact Segmented Control */}
              <div className="flex items-center p-0.5 rounded-lg bg-secondary/60 dark:bg-secondary/40 border border-border/50 text-xs font-medium flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setPriorityTab('today')}
                  className={cn(
                    'px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs',
                    priorityTab === 'today'
                      ? 'bg-surface dark:bg-card text-foreground font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span>Today</span>
                  <span className="text-[10px] px-1 py-0.1 rounded-full bg-secondary text-muted-foreground">
                    {todaysPriorities.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriorityTab('upcoming')}
                  className={cn(
                    'px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs',
                    priorityTab === 'upcoming'
                      ? 'bg-surface dark:bg-card text-foreground font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span>Upcoming</span>
                  <span className="text-[10px] px-1 py-0.1 rounded-full bg-secondary text-muted-foreground">
                    {upcomingPriorities.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Priorities List: Compact py-2 px-2.5 rows */}
            {activePriorities.length > 0 ? (
              <div className="space-y-1.5">
                {activePriorities.map((item) => {
                  const isTask = item.kind === 'task';
                  const priorityConfig =
                    item.priority === 'urgent'
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      : item.priority === 'high'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : item.priority === 'medium'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      : 'bg-secondary text-muted-foreground border-border/40';

                  return (
                    <motion.div
                      key={item.id}
                      onClick={() => {
                        if (isTask && item.rawTask) {
                          setSelectedTask(item.rawTask);
                        } else if (!isTask && item.rawIssue) {
                          setSelectedIssue(item.rawIssue);
                        }
                      }}
                      whileHover={{ scale: 1.002 }}
                      className="group flex items-center justify-between py-2 px-2.5 rounded-xl bg-surface/70 dark:bg-card/50 border border-border/40 hover:border-border hover:bg-surface dark:hover:bg-card hover:shadow-2xs transition-all cursor-pointer gap-2.5"
                    >
                      {/* Left: 1-click tactile spring completion checkbox + Type Icon + Title */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 24 }}
                          type="button"
                          onClick={(e) => handleToggleItemComplete(e, item)}
                          className={cn(
                            'w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0',
                            item.isCompleted
                              ? 'bg-primary border-primary text-primary-foreground shadow-2xs'
                              : 'border-border/80 hover:border-primary bg-surface/50'
                          )}
                          title={item.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {item.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                        </motion.button>

                        {/* Clean Object Type Lucide Icon */}
                        <div
                          className="flex-shrink-0"
                          title={isTask ? 'General Task' : `Issue ${item.identifier || ''}`}
                        >
                          {isTask ? (
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                          ) : (
                            <Layers className="w-3.5 h-3.5 text-sky-500" />
                          )}
                        </div>

                        {/* Identifier for Linear-style Issues */}
                        {!isTask && item.identifier && (
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-secondary text-foreground border border-border/50 flex-shrink-0">
                            {item.identifier}
                          </span>
                        )}

                        {/* Title */}
                        <span className="text-xs sm:text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </span>
                      </div>

                      {/* Right: Priority chip + Due date + Chevron */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.priority && item.priority !== 'none' && (
                          <span
                            className={cn(
                              'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md border',
                              priorityConfig
                            )}
                          >
                            {item.priority}
                          </span>
                        )}

                        {item.dueDate && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                            <Clock className="w-3 h-3 text-muted-foreground/70" />
                            {new Date(parseTimestamp(item.dueDate)).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}

                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : priorityTab === 'today' ? (
              /* Apple Clean Minimal Status: No tasks due today */
              <div className="py-3 px-4 rounded-2xl bg-surface/80 dark:bg-card/45 border border-border/40 backdrop-blur-xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-xs text-foreground font-medium truncate">
                    {upcomingPriorities.length > 0
                      ? `Caught up for today! You have ${upcomingPriorities.length} upcoming task${upcomingPriorities.length > 1 ? 's' : ''}.`
                      : 'You are completely caught up! No active tasks due today.'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {upcomingPriorities.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPriorityTab('upcoming')}
                      className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/15 transition-colors cursor-pointer"
                    >
                      View Upcoming ({upcomingPriorities.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCreateTaskOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Task</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Apple Clean Minimal Status: No upcoming tasks */
              <div className="py-3 px-4 rounded-2xl bg-surface/80 dark:bg-card/45 border border-border/40 backdrop-blur-xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground font-medium truncate">
                    No future tasks or issues currently scheduled.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateTaskOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-xs cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create Task</span>
                </button>
              </div>
            )}
          </div>

          {/* ─── Section 3: Operational Approvals & Requests (De-containerized) ─ */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 min-w-0">
                <FileCheck2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                  {isManagerOrLead ? 'Pending Approvals' : 'My Requests'}
                </h2>
              </div>

              {isManagerOrLead ? (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50">
                  {pendingApprovals.length} pending
                </span>
              ) : (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50">
                  {sentRequests.length} submitted
                </span>
              )}
            </div>

            {/* Manager View: Pending Approvals with 1-click Approve / Reject */}
            {isManagerOrLead ? (
              pendingApprovals.length > 0 ? (
                <div className="space-y-1.5">
                  {pendingApprovals.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-xl bg-surface/70 dark:bg-card/50 border border-border/50 hover:border-border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {REQUEST_TYPE_LABELS[req.type] || 'Requisition'}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            from @{req.creatorUsername || req.creatorName}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1">
                          {req.title}
                        </h4>
                        {req.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {req.description}
                          </p>
                        )}
                      </div>

                      {/* 1-click Approve / Reject Actions with Note Modal */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-auto">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() =>
                            setApprovalModal({ isOpen: true, request: req, mode: 'approved' })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve</span>
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() =>
                            setApprovalModal({ isOpen: true, request: req, mode: 'rejected' })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          <span>Reject</span>
                        </motion.button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-3 px-4 rounded-2xl bg-surface/80 dark:bg-card/45 border border-border/40 backdrop-blur-xl flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-medium text-foreground">
                      All operational requisitions have been reviewed.
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground/60">0 pending</span>
                </div>
              )
            ) : (
              /* Member View: My Requests */
              sentRequests.length > 0 ? (
                <div className="space-y-1.5">
                  {sentRequests.slice(0, 5).map((req) => {
                    const statusConfig =
                      req.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : req.status === 'rejected'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';

                    return (
                      <div
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className="group flex items-center justify-between py-2 px-2.5 rounded-xl bg-surface/70 dark:bg-card/50 border border-border/40 hover:border-border hover:bg-surface dark:hover:bg-card transition-all cursor-pointer gap-2.5"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <FileCheck2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-medium text-foreground truncate block group-hover:text-primary transition-colors">
                              {req.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {REQUEST_TYPE_LABELS[req.type] || 'Requisition'} • Submitted{' '}
                              {formatRelativeTime(req.createdAt)}
                            </span>
                          </div>
                        </div>

                        <span
                          className={cn(
                            'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md border capitalize',
                            statusConfig
                          )}
                        >
                          {req.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-3 px-4 rounded-2xl bg-surface/80 dark:bg-card/45 border border-border/40 backdrop-blur-xl flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <FileCheck2 className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs font-medium text-foreground">
                      No active leave or expense requisitions submitted.
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground/60">0 submitted</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* ─── Secondary Column: Sprint & Team Focus (4 cols) ──────────────── */}
        <div className="lg:col-span-4 space-y-5">
          {/* ─── Section 4: Active Cycle / Sprint Progress (De-containerized) ─ */}
          {currentCycle && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/40">
                <div className="flex items-center gap-2 min-w-0">
                  <Zap className="w-4 h-4 text-sky-500 flex-shrink-0" />
                  <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate">
                    {currentCycle.title || 'Active Cycle'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3" />
                    {daysRemaining}d left
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => navigate('/workspace')}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="View in Workspace"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>

              {/* Velocity Progress Bar */}
              <div className="p-3 rounded-xl bg-surface/70 dark:bg-card/50 border border-border/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    Velocity Burn
                  </span>
                  <span className="font-mono text-primary font-bold">{percentVelocity}%</span>
                </div>

                {/* Spring smooth track */}
                <div className="w-full h-1.5 rounded-full bg-border/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-700 ease-out shadow-xs"
                    style={{ width: `${percentVelocity}%` }}
                  />
                </div>

                {/* Burned vs Total Metric Details */}
                <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-center">
                  <div className="p-1.5 rounded-lg bg-secondary/50 border border-border/40">
                    <div className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider">
                      Done
                    </div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {completedPoints} pts
                    </div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-secondary/50 border border-border/40">
                    <div className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider">
                      Scope
                    </div>
                    <div className="text-xs font-bold text-foreground">{totalPoints} pts</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-secondary/50 border border-border/40">
                    <div className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider">
                      Velocity
                    </div>
                    <div className="text-xs font-bold text-sky-600 dark:text-sky-400">
                      {burnRate}/d
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Section 2: Team Focus (De-containerized High-Density Roster) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">Team Focus</h3>
              </div>

              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50">
                {teamRoster.length} members
              </span>
            </div>

            {/* High-density roster grid (avatar, name, status dot, tactile 1-click DM card) */}
            {teamRoster.length > 0 ? (
              <div className="grid grid-cols-1 gap-1.5">
                {teamRoster.map((teammate) => {
                  const availability = getAvailabilityConfig(teammate.availabilityStatus);
                  const focusText =
                    teammate.focusStatus?.text || '';
                  const initials = (teammate.fullName || teammate.username || 'U')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  const isStartingDM = loadingDmUid === teammate.uid;

                  return (
                    <motion.div
                      key={teammate.uid}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: isStartingDM ? 1 : 0.99 }}
                      onClick={() => !loadingDmUid && handleStartDM(teammate.uid)}
                      className={cn(
                        'py-2.5 px-3 rounded-2xl bg-surface/75 dark:bg-card/45 border border-border/40 hover:border-border hover:bg-surface dark:hover:bg-card hover:shadow-xs transition-all flex items-center justify-between gap-3 group cursor-pointer',
                        isStartingDM && 'opacity-70 cursor-wait'
                      )}
                      title={`Message ${teammate.fullName || teammate.username}`}
                    >
                      {/* Left: Avatar with Live Status Dot + Name + Focus snippet */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="relative flex-shrink-0">
                          {teammate.photoURL ? (
                            <img
                              src={teammate.photoURL}
                              alt={teammate.fullName}
                              className="w-7 h-7 rounded-full object-cover border border-border/60"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-secondary text-foreground font-semibold flex items-center justify-center text-[10px] border border-border/60">
                              {initials}
                            </div>
                          )}
                          <span
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full',
                              availability.dotClass
                            )}
                            title={availability.label}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {teammate.fullName || teammate.username}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                              @{teammate.username}
                            </span>
                          </div>
                          {focusText ? (
                            <p className="text-[10px] text-muted-foreground truncate italic">
                              "{focusText}"
                            </p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {teammate.designation ||
                                (teammate.role === 'owner'
                                  ? 'Founder'
                                  : teammate.role === 'admin'
                                  ? 'Lead Admin'
                                  : teammate.role === 'manager'
                                  ? 'Team Lead'
                                  : 'Teammate')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Smooth Hover DM Icon or Loading Spinner */}
                      <div className="flex items-center shrink-0">
                        {isStartingDM ? (
                          <div className="flex items-center gap-1 text-[10px] text-primary font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                            <span className="hidden sm:inline">Opening...</span>
                          </div>
                        ) : (
                          <div className="p-1 rounded-lg text-muted-foreground/40 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                            <MessageSquare className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 px-3 rounded-2xl bg-surface/75 dark:bg-card/45 border border-border/40 text-xs text-muted-foreground">
                No teammates registered in this organization yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Detail Drawers & Modals ────────────────────────────────────────── */}

      {/* 1. Task Detail Drawer */}
      {selectedTask && (
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

      {/* 2. Issue Detail Drawer */}
      {selectedIssue && (
        <IssueDetailDrawer
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          members={members}
          cycles={cycles}
          onIssueUpdated={(issueId, patch) => {
            updateIssue(issueId, patch);
          }}
        />
      )}

      {/* 3. Request Detail Drawer */}
      {selectedRequest && userProfile && (
        <RequestDetailDrawer
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          orgId={orgId}
          currentUser={userProfile}
        />
      )}

      {/* 4. Approval Action Modal for Manager */}
      {approvalModal.isOpen && approvalModal.request && (
        <ApprovalActionModal
          isOpen={approvalModal.isOpen}
          request={approvalModal.request}
          mode={approvalModal.mode}
          onClose={() => setApprovalModal({ isOpen: false, request: null, mode: 'approved' })}
          onConfirm={handleConfirmApprovalDecision}
        />
      )}

      {/* 5. Create Task Modal */}
      {createTaskOpen && (
        <CreateTaskModal
          open={createTaskOpen}
          onClose={() => setCreateTaskOpen(false)}
          orgId={orgId}
          actor={actor}
          labels={labels}
        />
      )}
    </div>
  );
}

export default DashboardPage;
