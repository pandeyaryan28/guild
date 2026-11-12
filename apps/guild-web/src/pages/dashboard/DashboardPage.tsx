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
  const [priorityTab, setPriorityTab] = React.useState<'today' | 'upcoming'>('today');

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
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* ─── Executive Top Header ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <span>{getGreeting()}, {userFirstName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
              <span>{getFormattedToday()}</span>
              {org?.name && (
                <>
                  <span className="text-border">•</span>
                  <span className="font-medium text-foreground">{org.name}</span>
                </>
              )}
            </p>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-2.5">
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setCreateTaskOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold bg-primary text-primary-foreground shadow-sm hover:opacity-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </motion.button>
          </div>
        </div>

        {/* ─── Apple SwiftUI Quick Stats Chips Bar ────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Chip 1: My Priorities */}
          <div className="p-3.5 rounded-2xl bg-surface/85 dark:bg-surface/55 backdrop-blur-xl border border-border dark:border-border-strong shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-foreground tracking-tight leading-tight">
                {statsValues.activeTasksCount}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium truncate">
                {todaysPriorities.length > 0 ? "Today's Priorities" : 'Active Priorities'}
              </div>
            </div>
          </div>

          {/* Chip 2: Team Active */}
          <div className="p-3.5 rounded-2xl bg-surface/85 dark:bg-surface/55 backdrop-blur-xl border border-border dark:border-border-strong shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-foreground tracking-tight leading-tight">
                {statsValues.activeMembersCount} / {members.length}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium truncate">
                Teammates Active
              </div>
            </div>
          </div>

          {/* Chip 3: Operational Approvals / Requests */}
          <div className="p-3.5 rounded-2xl bg-surface/85 dark:bg-surface/55 backdrop-blur-xl border border-border dark:border-border-strong shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-foreground tracking-tight leading-tight">
                {statsValues.operationalCount}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium truncate">
                {isManagerOrLead ? 'Pending Approvals' : 'Pending Requests'}
              </div>
            </div>
          </div>

          {/* Chip 4: Sprint Velocity (Zero Dummy Data: only shows metrics when cycle exists) */}
          <div className="p-3.5 rounded-2xl bg-surface/85 dark:bg-surface/55 backdrop-blur-xl border border-border dark:border-border-strong shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-foreground tracking-tight leading-tight">
                {currentCycle ? `${percentVelocity}%` : '—'}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium truncate">
                {currentCycle ? `Sprint • ${daysRemaining}d left` : 'No Active Sprint'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Grid: Priorities & Focus Columns ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─── Primary Column: Priorities & Approvals (8 cols) ─────────────── */}
        <div className="lg:col-span-8 space-y-6">
          {/* ─── Section 1: My Priorities ──────────────────────────────────── */}
          <div className="rounded-3xl bg-surface/85 dark:bg-surface/55 backdrop-blur-2xl border border-border dark:border-border-strong p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                    My Priorities
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {priorityTab === 'today'
                      ? 'Urgent and scheduled priorities for today'
                      : 'Upcoming tasks sorted by priority and schedule'}
                  </p>
                </div>
              </div>

              {/* Apple-style Segmented Control */}
              <div className="flex items-center p-1 rounded-xl bg-secondary/60 dark:bg-secondary/40 border border-border dark:border-border-strong text-xs font-medium self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPriorityTab('today')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                    priorityTab === 'today'
                      ? 'bg-surface dark:bg-surface-elevated text-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span>Today</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary text-muted-foreground">
                    {todaysPriorities.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriorityTab('upcoming')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                    priorityTab === 'upcoming'
                      ? 'bg-surface dark:bg-surface-elevated text-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span>Upcoming</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary text-muted-foreground">
                    {upcomingPriorities.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Priorities List */}
            {activePriorities.length > 0 ? (
              <div className="space-y-2">
                {activePriorities.map((item) => {
                  const isTask = item.kind === 'task';
                  const priorityConfig =
                    item.priority === 'urgent'
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      : item.priority === 'high'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : item.priority === 'medium'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      : 'bg-secondary text-muted-foreground border-border';

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
                      whileHover={{ scale: 1.003 }}
                      className="group flex items-center justify-between p-3.5 rounded-2xl bg-surface dark:bg-surface-elevated/40 border border-border/80 dark:border-border-strong hover:border-border-strong hover:shadow-sm transition-all cursor-pointer gap-3.5"
                    >
                      {/* Left: 1-click tactile spring completion checkbox + Type Icon + Title */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 24 }}
                          type="button"
                          onClick={(e) => handleToggleItemComplete(e, item)}
                          className={cn(
                            'w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0',
                            item.isCompleted
                              ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                              : 'border-border/80 hover:border-primary bg-surface/50'
                          )}
                          title={item.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {item.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </motion.button>

                        {/* Clean Object Type Lucide Icon */}
                        <div
                          className="flex-shrink-0"
                          title={isTask ? 'General Task' : `Issue ${item.identifier || ''}`}
                        >
                          {isTask ? (
                            <CheckSquare className="w-4 h-4 text-indigo-500" />
                          ) : (
                            <Layers className="w-4 h-4 text-sky-500" />
                          )}
                        </div>

                        {/* Identifier for Linear-style Issues */}
                        {!isTask && item.identifier && (
                          <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-secondary text-foreground border border-border dark:border-border-strong flex-shrink-0">
                            {item.identifier}
                          </span>
                        )}

                        {/* Title */}
                        <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </span>
                      </div>

                      {/* Right: Priority chip + Due date + Chevron */}
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        {item.priority && item.priority !== 'none' && (
                          <span
                            className={cn(
                              'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                              priorityConfig
                            )}
                          >
                            {item.priority}
                          </span>
                        )}

                        {item.dueDate && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                            <Clock className="w-3 h-3 text-muted-foreground/70" />
                            {new Date(parseTimestamp(item.dueDate)).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}

                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : priorityTab === 'today' ? (
              /* Apple Clean Empty State: No tasks due today */
              <div className="text-center py-10 px-4 rounded-2xl bg-secondary/30 border border-border/60 dark:border-border-strong space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">No tasks due today</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {upcomingPriorities.length > 0
                      ? `You are completely caught up for today! You have ${upcomingPriorities.length} upcoming task${upcomingPriorities.length > 1 ? 's' : ''} scheduled.`
                      : 'You are completely caught up. No active tasks or issues currently assigned to you.'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {upcomingPriorities.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPriorityTab('upcoming')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 border border-border dark:border-border-strong transition-colors cursor-pointer"
                    >
                      <span>View upcoming ({upcomingPriorities.length})</span>
                    </button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setCreateTaskOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create a task</span>
                  </motion.button>
                </div>
              </div>
            ) : (
              /* Apple Clean Empty State: No upcoming tasks */
              <div className="text-center py-10 px-4 rounded-2xl bg-secondary/30 border border-border/60 dark:border-border-strong space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-secondary text-muted-foreground border border-border dark:border-border-strong flex items-center justify-center mx-auto">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">No upcoming tasks</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    No future tasks or issues currently scheduled.
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setCreateTaskOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:opacity-95 transition-opacity cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create a task</span>
                </motion.button>
              </div>
            )}
          </div>

          {/* ─── Section 3: Operational Approvals & Requests ────────────────── */}
          <div className="rounded-3xl bg-surface/85 dark:bg-surface/55 backdrop-blur-2xl border border-border dark:border-border-strong p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shadow-inner">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                    {isManagerOrLead ? 'Pending Approvals' : 'My Requests'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isManagerOrLead
                      ? 'Operational requisitions requiring your sign-off'
                      : 'Status of your leave, expense, and equipment requisitions'}
                  </p>
                </div>
              </div>

              {isManagerOrLead ? (
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-secondary text-muted-foreground border border-border dark:border-border-strong">
                  {pendingApprovals.length} pending
                </span>
              ) : (
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-secondary text-muted-foreground border border-border dark:border-border-strong">
                  {sentRequests.length} submitted
                </span>
              )}
            </div>

            {/* Manager View: Pending Approvals with 1-click Approve / Reject */}
            {isManagerOrLead ? (
              pendingApprovals.length > 0 ? (
                <div className="space-y-2.5">
                  {pendingApprovals.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-surface dark:bg-surface-elevated/40 border border-border/80 dark:border-border-strong space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              {REQUEST_TYPE_LABELS[req.type] || 'Requisition'}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                              from @{req.creatorUsername || req.creatorName}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-foreground line-clamp-1">
                            {req.title}
                          </h4>
                          {req.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {req.description}
                            </p>
                          )}
                        </div>

                        {/* 1-click Approve / Reject Actions with Note Modal */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() =>
                              setApprovalModal({ isOpen: true, request: req, mode: 'approved' })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </motion.button>

                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() =>
                              setApprovalModal({ isOpen: true, request: req, mode: 'rejected' })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 px-4 rounded-2xl bg-secondary/30 border border-border/60 dark:border-border-strong space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">No pending approvals</h4>
                  <p className="text-[11px] text-muted-foreground">
                    All operational requisitions have been reviewed.
                  </p>
                </div>
              )
            ) : (
              /* Member View: My Requests */
              sentRequests.length > 0 ? (
                <div className="space-y-2">
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
                        className="group flex items-center justify-between p-3.5 rounded-2xl bg-surface dark:bg-surface-elevated/40 border border-border/80 dark:border-border-strong hover:border-border-strong hover:shadow-sm transition-all cursor-pointer gap-3"
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <FileCheck2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-foreground truncate block group-hover:text-primary transition-colors">
                              {req.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {REQUEST_TYPE_LABELS[req.type] || 'Requisition'} • Submitted{' '}
                              {formatRelativeTime(req.createdAt)}
                            </span>
                          </div>
                        </div>

                        <span
                          className={cn(
                            'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border capitalize',
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
                <div className="text-center py-8 px-4 rounded-2xl bg-secondary/30 border border-border/60 dark:border-border-strong space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">No active requests</h4>
                  <p className="text-[11px] text-muted-foreground">
                    You have not submitted any leave, expense, or equipment requisitions.
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        {/* ─── Secondary Column: Sprint & Team Focus (4 cols) ──────────────── */}
        <div className="lg:col-span-4 space-y-6">
          {/* ─── Section 4: Active Cycle / Sprint Progress ──────────────────── */}
          {/* Only rendered when a real active cycle exists in Firestore */}
          {currentCycle && (
            <div className="rounded-3xl bg-surface/85 dark:bg-surface/55 backdrop-blur-2xl border border-border dark:border-border-strong p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shadow-inner">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground tracking-tight">
                      {currentCycle.title || 'Active Cycle'}
                    </h3>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                    </span>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => navigate('/workspace')}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="View in Workspace"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Velocity Progress Bar */}
              <div className="p-4 rounded-2xl bg-secondary/40 dark:bg-secondary/20 border border-border/60 dark:border-border-strong space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    Velocity Burn
                  </span>
                  <span className="font-mono text-primary font-bold">{percentVelocity}%</span>
                </div>

                {/* Spring smooth track */}
                <div className="w-full h-2 rounded-full bg-border/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-700 ease-out shadow-xs"
                    style={{ width: `${percentVelocity}%` }}
                  />
                </div>

                {/* Burned vs Total Metric Details */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-xl bg-surface/70 dark:bg-surface/40 border border-border/40 dark:border-border-strong">
                    <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                      Done
                    </div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {completedPoints} pts
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-surface/70 dark:bg-surface/40 border border-border/40 dark:border-border-strong">
                    <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                      Scope
                    </div>
                    <div className="text-xs font-bold text-foreground">{totalPoints} pts</div>
                  </div>
                  <div className="p-2 rounded-xl bg-surface/70 dark:bg-surface/40 border border-border/40 dark:border-border-strong">
                    <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
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

          {/* ─── Section 2: Team Focus ──────────────────────────────────────── */}
          <div className="rounded-3xl bg-surface/85 dark:bg-surface/55 backdrop-blur-2xl border border-border dark:border-border-strong p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-inner">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Team Focus</h3>
                  <p className="text-xs text-muted-foreground">Live availability & priorities</p>
                </div>
              </div>

              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border dark:border-border-strong">
                {teamRoster.length}
              </span>
            </div>

            {/* Teammate Roster */}
            {teamRoster.length > 0 ? (
              <div className="space-y-3">
                {teamRoster.map((teammate) => {
                  const availability = getAvailabilityConfig(teammate.availabilityStatus);
                  const focusText =
                    teammate.focusStatus?.text || 'Available for collaboration';
                  const focusTime = teammate.focusStatus?.updatedAt
                    ? formatRelativeTime(teammate.focusStatus.updatedAt)
                    : null;
                  const initials = (teammate.fullName || teammate.username || 'U')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  const isStartingDM = loadingDmUid === teammate.uid;

                  return (
                    <div
                      key={teammate.uid}
                      className="p-3 rounded-2xl bg-surface dark:bg-surface-elevated/40 border border-border/80 dark:border-border-strong hover:border-border-strong hover:shadow-xs transition-all space-y-2"
                    >
                      {/* Teammate Row */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Avatar with Live Dot */}
                          <div className="relative flex-shrink-0">
                            {teammate.photoURL ? (
                              <img
                                src={teammate.photoURL}
                                alt={teammate.fullName}
                                className="w-8 h-8 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-secondary text-foreground font-semibold flex items-center justify-center text-[10px] border border-border">
                                {initials}
                              </div>
                            )}
                            <span
                              className={cn(
                                'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full',
                                availability.dotClass
                              )}
                              title={availability.label}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">
                              {teammate.fullName || teammate.username}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {teammate.designation ||
                                (teammate.role === 'owner'
                                  ? 'Founder'
                                  : teammate.role === 'admin'
                                  ? 'Lead Admin'
                                  : teammate.role === 'manager'
                                  ? 'Team Lead'
                                  : 'Teammate')}
                            </div>
                          </div>
                        </div>

                        {/* 1-click Direct Message in Chat with Spring feedback and loading state */}
                        <motion.button
                          whileTap={{ scale: isStartingDM ? 1 : 0.94 }}
                          type="button"
                          disabled={!!loadingDmUid}
                          onClick={() => handleStartDM(teammate.uid)}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer',
                            isStartingDM
                              ? 'bg-primary/10 text-primary border border-primary/30 cursor-wait'
                              : 'text-foreground bg-secondary/80 hover:bg-secondary border border-border dark:border-border-strong'
                          )}
                          title={`Message ${teammate.fullName || teammate.username}`}
                        >
                          {isStartingDM ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-primary" />
                              <span>Opening...</span>
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-3 h-3 text-muted-foreground" />
                              <span>DM</span>
                            </>
                          )}
                        </motion.button>
                      </div>

                      {/* Focus Status Text + Relative Time */}
                      <div className="p-2 rounded-xl bg-secondary/30 dark:bg-secondary/15 border border-border/40 dark:border-border-strong text-[11px] text-foreground flex items-center justify-between gap-2">
                        <span className="truncate italic font-medium">{focusText}</span>
                        {focusTime && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {focusTime}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 px-3 rounded-2xl bg-secondary/30 border border-border/60 dark:border-border-strong text-xs text-muted-foreground">
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
