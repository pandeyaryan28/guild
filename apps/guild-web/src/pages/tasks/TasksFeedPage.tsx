import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, Check, CheckCircle2, XCircle, Clock,
  Zap, ClipboardList, ListTodo, Calendar as CalendarIcon,
  ChevronDown, ArrowRight, X, AtSign, Loader2,
  UserPlus, RefreshCw, LayoutGrid, List, Route,
  Sparkles, Flame, SlidersHorizontal, ChevronRight, CheckCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspaceData } from '../../context/WorkspaceDataContext';
import { useWorkspaceIssues, ISSUE_STATUS_CONFIG, ISSUE_PRIORITY_CONFIG } from '../../hooks/useWorkspaceIssues';
import { useWorkspaceCycles } from '../../hooks/useWorkspaceCycles';
import { TaskDetailDrawer } from '../../components/tasks/TaskDetailDrawer';
import { RequestDetailDrawer } from '../../components/tasks/RequestDetailDrawer';
import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { StudioCreateIssueModal } from '../studio/StudioCreateIssueModal';
import { IssueDetailDrawer } from './IssueDetailDrawer';
import {
  createTask, moveTask, updateAssignees,
  STATUS_CONFIG, PRIORITY_CONFIG,
  type Task, type TaskStatus, type TaskPriority, type ActorInfo
} from '../../lib/tasks';
import {
  createRequest, updateRequestStatus,
  REQUEST_TYPE_LABELS,
  type OrgRequest, type RequestType, type RequestStatus
} from '../../lib/requests';
import type { WorkspaceIssue, IssueStatus, IssuePriority, UserProfile } from '@guild/types';
import { cn } from '@/lib/utils';

// ─── Filter & View Types ──────────────────────────────────────────────────────

type ViewMode = 'board' | 'list' | 'journey';
type SegmentFilter = 'assigned_to_me' | 'all' | 'completed';
type ObjectTypeFilter = 'all' | 'task' | 'request' | 'issue';
type PriorityFilter = 'all' | 'urgent' | 'high' | 'medium' | 'low';

// ─── Unified Feed Item Representation ──────────────────────────────────────────

interface UnifiedItem {
  id: string;
  type: 'task' | 'issue' | 'request';
  title: string;
  description?: string;
  status: string;
  isCompleted: boolean;
  priority: 'urgent' | 'high' | 'medium' | 'low' | 'none';
  createdAtMs: number;
  updatedAtMs: number;
  // Common relations
  assigneeIds: string[];
  assigneeName?: string;
  assigneeAvatar?: string;
  creatorId?: string;
  creatorName?: string;
  dueDate?: Date | null;
  // Issue specific
  issueIdentifier?: string;
  estimatePoints?: number | null;
  cycleId?: string | null;
  cycleName?: string;
  // Request specific
  requestType?: RequestType;
  approverId?: string;
  approverName?: string;
  approverUsername?: string;
  creatorUsername?: string;
  startDate?: string;
  endDate?: string;
  approverNote?: string | null;
  // Raw backing objects
  rawTask?: Task;
  rawIssue?: WorkspaceIssue;
  rawRequest?: OrgRequest;
}

// ─── Board Column Definitions ─────────────────────────────────────────────────

interface BoardColumn {
  id: 'todo' | 'in_progress' | 'in_review' | 'done';
  title: string;
  subtitle: string;
  accentColor: string;
  bgLight: string;
  bgDark: string;
}

const BOARD_COLUMNS: BoardColumn[] = [
  {
    id: 'todo',
    title: 'To Do',
    subtitle: 'Ready for action',
    accentColor: '#6366f1',
    bgLight: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    bgDark: 'dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30'
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    subtitle: 'Actively in motion',
    accentColor: '#f59e0b',
    bgLight: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    bgDark: 'dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
  },
  {
    id: 'in_review',
    title: 'In Review',
    subtitle: 'Pending verification & approvals',
    accentColor: '#0ea5e9',
    bgLight: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    bgDark: 'dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30'
  },
  {
    id: 'done',
    title: 'Completed',
    subtitle: 'Delivered & verified',
    accentColor: '#10b981',
    bgLight: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    bgDark: 'dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
  }
];

function getItemColumn(item: UnifiedItem): BoardColumn['id'] {
  if (item.isCompleted) return 'done';

  if (item.type === 'task') {
    if (item.status === 'in_progress') return 'in_progress';
    if (item.status === 'review' || item.status === 'in_review') return 'in_review';
    if (item.status === 'done') return 'done';
    return 'todo';
  }

  if (item.type === 'issue') {
    if (item.status === 'in_progress') return 'in_progress';
    if (item.status === 'in_review') return 'in_review';
    if (item.status === 'done' || item.status === 'canceled') return 'done';
    return 'todo';
  }

  if (item.type === 'request') {
    if (item.status === 'pending') return 'in_review';
    return 'done';
  }

  return 'todo';
}

// ─── Avatar Color Helper ──────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
];

function getAvatarColor(id: string = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function parseDateMs(val: any): number {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (val.seconds) return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function isToday(date: Date | null | undefined): boolean {
  if (!date) return false;
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function isOverdue(date: Date | null | undefined): boolean {
  if (!date) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target.getTime() < now.getTime();
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TasksFeedPage() {
  const { user, userProfile } = useAuth();
  const workspace = useWorkspaceData();

  const orgId = userProfile?.organizationId || workspace?.orgId || '';
  const currentUserId = user?.uid || userProfile?.uid || '';

  // Workspace Data
  const allTasks = workspace?.allTasks || [];
  const tasksLoading = workspace?.tasksLoading ?? false;
  const sentRequests = workspace?.sentRequests || [];
  const receivedRequests = workspace?.receivedRequests || [];
  const requestsLoading = workspace?.requestsLoading ?? false;
  const members = workspace?.members || [];
  const projects = workspace?.projects || [];
  const goals = workspace?.goals || [];
  const labels = workspace?.labels || [];
  const org = workspace?.org || null;

  // Issues & Cycles
  const {
    issues,
    loading: issuesLoading,
    updateIssue,
    createIssue
  } = useWorkspaceIssues(orgId);

  const { cycles } = useWorkspaceCycles(orgId);

  // Cycle & Member maps
  const cycleMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cycles) {
      map.set(c.id, c.title || 'Cycle');
    }
    return map;
  }, [cycles]);

  const memberMap = React.useMemo(() => {
    const map = new Map<string, UserProfile>();
    for (const m of members) {
      map.set(m.uid, m);
    }
    return map;
  }, [members]);

  // Actor info for tasks
  const currentUsername = userProfile?.username || user?.email?.split('@')[0] || 'user';
  const actor: ActorInfo = React.useMemo(() => ({
    uid: userProfile?.uid || user?.uid || '',
    name: userProfile?.fullName || user?.displayName || 'Teammate',
  }), [user, userProfile]);

  // Can approve requests (direct approver OR org owner/admin/manager)
  const isManagerOrAdmin = React.useMemo(() => {
    if (!userProfile) return false;
    return (
      userProfile.role === 'owner' ||
      userProfile.role === 'admin' ||
      userProfile.role === 'manager' ||
      userProfile.isManager === true ||
      org?.ownerId === userProfile.uid
    );
  }, [userProfile, org]);

  // ─── View & Filter States ──────────────────────────────────────────────────
  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('guild_tasks_view_mode');
      if (saved === 'board' || saved === 'list' || saved === 'journey') return saved;
    } catch {}
    return 'board';
  });

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('guild_tasks_view_mode', mode);
    } catch {}
  };

  const [activeSegment, setActiveSegment] = React.useState<SegmentFilter>('assigned_to_me');
  const [objectFilter, setObjectFilter] = React.useState<ObjectTypeFilter>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<PriorityFilter>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // ─── Inline Quick-Add State ──────────────────────────────────────────────────
  const [quickTitle, setQuickTitle] = React.useState('');
  const [quickType, setQuickType] = React.useState<'task' | 'request'>('task');
  const [quickPriority, setQuickPriority] = React.useState<TaskPriority>('none');
  const [quickRequestType, setQuickRequestType] = React.useState<RequestType>('other');
  const [quickAssignee, setQuickAssignee] = React.useState<UserProfile | null>(null);
  const [deadlineMode, setDeadlineMode] = React.useState<'today' | 'tomorrow' | 'custom' | null>(null);
  const [customDateStr, setCustomDateStr] = React.useState('');
  const [assigneePickerOpen, setAssigneePickerOpen] = React.useState(false);
  const [requestTypePickerOpen, setRequestTypePickerOpen] = React.useState(false);
  const [priorityPickerOpen, setPriorityPickerOpen] = React.useState(false);
  const [memberSearch, setMemberSearch] = React.useState('');
  const [isSubmittingQuick, setIsSubmittingQuick] = React.useState(false);
  const [quickSubmitSuccess, setQuickSubmitSuccess] = React.useState(false);

  const quickInputRef = React.useRef<HTMLInputElement>(null);
  const assigneePickerRef = React.useRef<HTMLDivElement>(null);
  const requestTypeRef = React.useRef<HTMLDivElement>(null);
  const priorityPickerRef = React.useRef<HTMLDivElement>(null);
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  // ─── Direct Decision State ───────────────────────────────────────────────────
  const [approvingId, setApprovingId] = React.useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = React.useState<string | null>(null);
  const [rejectNote, setRejectNote] = React.useState('');
  const rejectPopoverRef = React.useRef<HTMLDivElement>(null);

  // Click-outside listener
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (assigneePickerRef.current && !assigneePickerRef.current.contains(e.target as Node)) {
        setAssigneePickerOpen(false);
      }
      if (requestTypeRef.current && !requestTypeRef.current.contains(e.target as Node)) {
        setRequestTypePickerOpen(false);
      }
      if (priorityPickerRef.current && !priorityPickerRef.current.contains(e.target as Node)) {
        setPriorityPickerOpen(false);
      }
      if (rejectPopoverRef.current && !rejectPopoverRef.current.contains(e.target as Node)) {
        setRejectTargetId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Drawers & Modals State ──────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [selectedRequest, setSelectedRequest] = React.useState<OrgRequest | null>(null);
  const [selectedIssue, setSelectedIssue] = React.useState<WorkspaceIssue | null>(null);
  const [createIssueOpen, setCreateIssueOpen] = React.useState(false);
  const [createTaskOpen, setCreateTaskOpen] = React.useState(false);

  // Reassign popover state
  const [reassignTarget, setReassignTarget] = React.useState<{
    isOpen: boolean;
    item: UnifiedItem | null;
  }>({
    isOpen: false,
    item: null
  });

  // ─── Aggregate & Normalize All Items ─────────────────────────────────────────

  const aggregatedRequests = React.useMemo(() => {
    const map = new Map<string, OrgRequest>();
    for (const r of receivedRequests) map.set(r.id, r);
    for (const r of sentRequests) map.set(r.id, r);
    return Array.from(map.values());
  }, [receivedRequests, sentRequests]);

  const unifiedItems: UnifiedItem[] = React.useMemo(() => {
    const list: UnifiedItem[] = [];

    // 1. Tasks
    for (const t of allTasks) {
      if (t.parentTaskId) continue; // exclude subtasks
      const isDone = t.status === 'done';
      const assigneeName = t.assigneeIds?.[0]
        ? memberMap.get(t.assigneeIds[0])?.fullName
        : undefined;
      const assigneeAvatar = t.assigneeIds?.[0]
        ? memberMap.get(t.assigneeIds[0])?.photoURL
        : undefined;

      list.push({
        id: `task_${t.id}`,
        type: 'task',
        title: t.title,
        description: t.description,
        status: t.status,
        isCompleted: isDone,
        priority: (t.priority as any) || 'none',
        createdAtMs: parseDateMs(t.createdAt),
        updatedAtMs: parseDateMs(t.updatedAt || t.createdAt),
        assigneeIds: t.assigneeIds || [],
        assigneeName,
        assigneeAvatar,
        creatorId: t.creatorId,
        creatorName: memberMap.get(t.creatorId)?.fullName,
        dueDate: t.dueDate ? new Date(parseDateMs(t.dueDate)) : null,
        rawTask: t
      });
    }

    // 2. Workspace Issues (Linear-style)
    for (const i of issues) {
      const isDone = i.status === 'done' || i.status === 'canceled';
      list.push({
        id: `issue_${i.id}`,
        type: 'issue',
        title: i.title,
        description: i.descriptionHtml,
        status: i.status,
        isCompleted: isDone,
        priority: i.priority || 'none',
        createdAtMs: parseDateMs(i.createdAt),
        updatedAtMs: parseDateMs(i.updatedAt || i.createdAt),
        assigneeIds: i.assigneeId ? [i.assigneeId] : [],
        assigneeName: i.assigneeName || (i.assigneeId ? memberMap.get(i.assigneeId)?.fullName : undefined),
        assigneeAvatar: i.assigneeAvatar || (i.assigneeId ? memberMap.get(i.assigneeId)?.photoURL : undefined),
        creatorId: i.creatorId,
        creatorName: i.creatorName,
        dueDate: i.dueDate ? new Date(parseDateMs(i.dueDate)) : null,
        issueIdentifier: i.identifier,
        estimatePoints: i.estimatePoints,
        cycleId: i.cycleId,
        cycleName: i.cycleId ? cycleMap.get(i.cycleId) : undefined,
        rawIssue: i
      });
    }

    // 3. Operational Requests
    for (const r of aggregatedRequests) {
      const isDone = r.status === 'approved' || r.status === 'rejected';
      list.push({
        id: `request_${r.id}`,
        type: 'request',
        title: r.title,
        description: r.description,
        status: r.status,
        isCompleted: isDone,
        priority: 'none',
        createdAtMs: parseDateMs(r.createdAt),
        updatedAtMs: parseDateMs(r.updatedAt || r.createdAt),
        assigneeIds: [r.approverId],
        assigneeName: r.approverName,
        creatorId: r.creatorId,
        creatorName: r.creatorName,
        creatorUsername: r.creatorUsername,
        requestType: r.type,
        approverId: r.approverId,
        approverName: r.approverName,
        approverUsername: r.approverUsername,
        startDate: r.startDate,
        endDate: r.endDate,
        approverNote: r.approverNote,
        rawRequest: r
      });
    }

    return list;
  }, [allTasks, issues, aggregatedRequests, memberMap, cycleMap]);

  // ─── Metrics & Journey Progress ──────────────────────────────────────────────

  const journeyStats = React.useMemo(() => {
    let completedCount = 0;
    let inFlightCount = 0;
    let urgentCount = 0;
    let myCount = 0;

    for (const item of unifiedItems) {
      if (item.isCompleted) {
        completedCount++;
      } else {
        inFlightCount++;
        if (item.priority === 'urgent' || item.priority === 'high') {
          urgentCount++;
        }
        if (
          (item.type === 'task' && item.assigneeIds.includes(currentUserId)) ||
          (item.type === 'issue' && item.assigneeIds.includes(currentUserId)) ||
          (item.type === 'request' && (item.approverId === currentUserId || item.creatorId === currentUserId))
        ) {
          myCount++;
        }
      }
    }

    const total = completedCount + inFlightCount;
    const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return {
      completedCount,
      inFlightCount,
      urgentCount,
      myCount,
      progressPercent
    };
  }, [unifiedItems, currentUserId]);

  // ─── Segment Counts (Personalized Counters) ───────────────────────────────────

  const segmentCounts = React.useMemo(() => {
    let all = 0;
    let assigned = 0;
    let completed = 0;

    for (const item of unifiedItems) {
      if (item.isCompleted) {
        completed++;
        continue;
      }

      all++;

      if (item.type === 'task' && item.assigneeIds.includes(currentUserId)) {
        assigned++;
      } else if (item.type === 'issue' && item.assigneeIds.includes(currentUserId)) {
        assigned++;
      } else if (item.type === 'request') {
        if (item.approverId === currentUserId || item.creatorId === currentUserId) {
          assigned++;
        }
      }
    }

    return { all, assigned, completed };
  }, [unifiedItems, currentUserId]);

  // ─── Object Type Counts for Current Segment ───────────────────────────────────

  const typeCounts = React.useMemo(() => {
    let task = 0;
    let request = 0;
    let issue = 0;

    for (const item of unifiedItems) {
      if (activeSegment === 'completed' && !item.isCompleted) continue;
      if (activeSegment !== 'completed' && item.isCompleted) continue;
      if (activeSegment === 'assigned_to_me') {
        if (item.type === 'task' && !item.assigneeIds.includes(currentUserId)) continue;
        if (item.type === 'issue' && !item.assigneeIds.includes(currentUserId)) continue;
        if (item.type === 'request' && item.approverId !== currentUserId && item.creatorId !== currentUserId) continue;
      }

      if (item.type === 'task') task++;
      else if (item.type === 'request') request++;
      else if (item.type === 'issue') issue++;
    }

    return {
      all: task + request + issue,
      task,
      request,
      issue
    };
  }, [unifiedItems, activeSegment, currentUserId]);

  // ─── Filtered Items ──────────────────────────────────────────────────────────

  const filteredItems = React.useMemo(() => {
    return unifiedItems.filter((item) => {
      // 1. Segment filter
      if (activeSegment === 'assigned_to_me') {
        if (item.isCompleted) return false;
        if (item.type === 'task' && !item.assigneeIds.includes(currentUserId)) return false;
        if (item.type === 'issue' && !item.assigneeIds.includes(currentUserId)) return false;
        if (
          item.type === 'request' &&
          item.approverId !== currentUserId &&
          item.creatorId !== currentUserId
        ) {
          return false;
        }
      } else if (activeSegment === 'all') {
        if (item.isCompleted) return false;
      } else if (activeSegment === 'completed') {
        if (!item.isCompleted) return false;
      }

      // 2. Object Type filter
      if (objectFilter !== 'all' && item.type !== objectFilter) {
        return false;
      }

      // 3. Priority filter
      if (priorityFilter !== 'all') {
        if (item.priority !== priorityFilter) return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesIdent = item.issueIdentifier?.toLowerCase().includes(q);
        const matchesAssignee = item.assigneeName?.toLowerCase().includes(q);
        const matchesCreator = item.creatorName?.toLowerCase().includes(q);
        const matchesType = item.requestType ? REQUEST_TYPE_LABELS[item.requestType]?.toLowerCase().includes(q) : false;

        if (!matchesTitle && !matchesDesc && !matchesIdent && !matchesAssignee && !matchesCreator && !matchesType) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const priorityWeights: Record<string, number> = {
        urgent: 4,
        high: 3,
        medium: 2,
        low: 1,
        none: 0,
      };

      if (!a.isCompleted && !b.isCompleted) {
        const aNeedsMyApproval = a.type === 'request' && a.status === 'pending' && (a.approverId === currentUserId || isManagerOrAdmin);
        const bNeedsMyApproval = b.type === 'request' && b.status === 'pending' && (b.approverId === currentUserId || isManagerOrAdmin);
        if (aNeedsMyApproval && !bNeedsMyApproval) return -1;
        if (!aNeedsMyApproval && bNeedsMyApproval) return 1;

        const pDiff = (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
        if (pDiff !== 0) return pDiff;
      }

      return b.updatedAtMs - a.updatedAtMs;
    });
  }, [unifiedItems, activeSegment, objectFilter, priorityFilter, searchQuery, currentUserId, isManagerOrAdmin]);

  // Grouped items for Kanban Board
  const boardGroupedItems = React.useMemo(() => {
    const groups: Record<BoardColumn['id'], UnifiedItem[]> = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: []
    };

    for (const item of filteredItems) {
      const col = getItemColumn(item);
      groups[col].push(item);
    }

    return groups;
  }, [filteredItems]);

  // Grouped items for Journey / Timeline feed
  const journeyGroupedItems = React.useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfWeek = startOfToday - 86400000 * 6;

    const groups: {
      id: string;
      title: string;
      subtitle: string;
      items: UnifiedItem[];
    }[] = [
      { id: 'today', title: "Today's Journey", subtitle: 'Active today & recent moves', items: [] },
      { id: 'yesterday', title: 'Yesterday', subtitle: 'Previous day progress', items: [] },
      { id: 'this_week', title: 'Earlier This Week', subtitle: 'Paced sprint accomplishments', items: [] },
      { id: 'older', title: 'Journey Archives', subtitle: 'Foundational deliveries', items: [] }
    ];

    for (const item of filteredItems) {
      const ts = item.updatedAtMs || item.createdAtMs;
      if (ts >= startOfToday) {
        groups[0].items.push(item);
      } else if (ts >= startOfYesterday) {
        groups[1].items.push(item);
      } else if (ts >= startOfWeek) {
        groups[2].items.push(item);
      } else {
        groups[3].items.push(item);
      }
    }

    return groups.filter((g) => g.items.length > 0);
  }, [filteredItems]);

  // ─── Filtered Teammates for Assignee Picker ───────────────────────────────────

  const filteredMembers = React.useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  // ─── Inline Quick-Create Submission ──────────────────────────────────────────

  const handleQuickSubmit = async () => {
    if (!quickTitle.trim() || isSubmittingQuick) return;
    setIsSubmittingQuick(true);

    try {
      let derivedDueDate: Date | null = null;
      if (deadlineMode === 'today') {
        derivedDueDate = new Date();
        derivedDueDate.setHours(23, 59, 59, 999);
      } else if (deadlineMode === 'tomorrow') {
        derivedDueDate = new Date();
        derivedDueDate.setDate(derivedDueDate.getDate() + 1);
        derivedDueDate.setHours(23, 59, 59, 999);
      } else if (deadlineMode === 'custom' && customDateStr) {
        const [y, m, d] = customDateStr.split('-').map(Number);
        derivedDueDate = new Date(y, m - 1, d, 23, 59, 59, 999);
      }

      if (quickType === 'task') {
        await createTask({
          orgId,
          title: quickTitle.trim(),
          priority: quickPriority,
          dueDate: derivedDueDate,
          assigneeIds: quickAssignee ? [quickAssignee.uid] : [],
          actor
        });
      } else {
        let approver = quickAssignee;
        if (!approver && userProfile?.managerId) {
          approver = memberMap.get(userProfile.managerId) || null;
        }
        if (!approver && org?.ownerId && org.ownerId !== currentUserId) {
          approver = memberMap.get(org.ownerId) || null;
        }
        if (!approver) {
          approver = members.find((m) => m.uid !== currentUserId && (m.role === 'admin' || m.role === 'owner' || m.role === 'manager' || m.isManager)) || null;
        }
        if (!approver) {
          approver = members.find((m) => m.uid !== currentUserId) || null;
        }
        if (!approver) {
          approver = userProfile || null;
        }

        const dateIso = derivedDueDate ? derivedDueDate.toISOString().split('T')[0] : undefined;

        await createRequest({
          orgId,
          creatorId: currentUserId,
          creatorName: actor.name,
          creatorUsername: currentUsername,
          approverId: approver?.uid || currentUserId,
          approverName: approver?.fullName || actor.name,
          approverUsername: approver?.username || currentUsername,
          type: quickRequestType,
          title: quickTitle.trim(),
          description: '',
          startDate: dateIso,
          endDate: dateIso
        });
      }

      setQuickTitle('');
      setDeadlineMode(null);
      setCustomDateStr('');
      setQuickAssignee(null);
      setQuickPriority('none');
      setQuickSubmitSuccess(true);
      setTimeout(() => setQuickSubmitSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to create item via quick-add:', err);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  // ─── Inline Actions ──────────────────────────────────────────────────────────

  // 1. Toggle Complete
  const handleToggleComplete = async (e: React.MouseEvent, item: UnifiedItem) => {
    e.stopPropagation();

    if (item.type === 'task' && item.rawTask) {
      const newStatus: TaskStatus = item.isCompleted ? 'todo' : 'done';
      try {
        await moveTask(item.rawTask.id, orgId, newStatus, item.rawTask.orderIndex, item.rawTask.status, actor);
      } catch (err) {
        console.error('Failed to update task status:', err);
      }
    } else if (item.type === 'issue' && item.rawIssue) {
      const nextStatus: IssueStatus = item.isCompleted ? 'todo' : 'done';
      try {
        await updateIssue(item.rawIssue.id, {
          status: nextStatus,
          completedAt: nextStatus === 'done' ? (new Date() as any) : null
        });
      } catch (err) {
        console.error('Failed to update issue status:', err);
      }
    }
  };

  // 2. Advance Status in Kanban Board
  const handleAdvanceStatus = async (e: React.MouseEvent, item: UnifiedItem, nextColumn: BoardColumn['id']) => {
    e.stopPropagation();

    if (item.type === 'task' && item.rawTask) {
      let targetStatus: TaskStatus = 'todo';
      if (nextColumn === 'in_progress') targetStatus = 'in_progress';
      else if (nextColumn === 'in_review') targetStatus = 'review';
      else if (nextColumn === 'done') targetStatus = 'done';

      try {
        await moveTask(item.rawTask.id, orgId, targetStatus, item.rawTask.orderIndex, item.rawTask.status, actor);
      } catch (err) {
        console.error('Failed to advance task status:', err);
      }
    } else if (item.type === 'issue' && item.rawIssue) {
      let targetIssueStatus: IssueStatus = 'todo';
      if (nextColumn === 'in_progress') targetIssueStatus = 'in_progress';
      else if (nextColumn === 'in_review') targetIssueStatus = 'in_review';
      else if (nextColumn === 'done') targetIssueStatus = 'done';

      try {
        await updateIssue(item.rawIssue.id, {
          status: targetIssueStatus,
          completedAt: targetIssueStatus === 'done' ? (new Date() as any) : null
        });
      } catch (err) {
        console.error('Failed to advance issue status:', err);
      }
    }
  };

  // 3. Direct 1-Click Approve for Requests
  const handleDirectApprove = async (e: React.MouseEvent, req: OrgRequest) => {
    e.stopPropagation();
    setApprovingId(req.id);
    try {
      await updateRequestStatus(
        req.id,
        orgId,
        'approved',
        userProfile?.uid || currentUserId,
        userProfile?.fullName || 'Approver',
        userProfile?.username || 'approver',
        req.creatorId,
        req.title
      );
    } catch (err) {
      console.error('Failed to approve request:', err);
    } finally {
      setApprovingId(null);
    }
  };

  // 4. Direct Reject with Optional Note
  const handleDirectReject = async (req: OrgRequest, note?: string) => {
    try {
      await updateRequestStatus(
        req.id,
        orgId,
        'rejected',
        userProfile?.uid || currentUserId,
        userProfile?.fullName || 'Approver',
        userProfile?.username || 'approver',
        req.creatorId,
        req.title,
        note?.trim() || undefined
      );
      setRejectTargetId(null);
      setRejectNote('');
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  // 5. Reassign Member
  const handleReassignMember = async (member: UserProfile | null) => {
    const item = reassignTarget.item;
    if (!item) return;

    if (item.type === 'task' && item.rawTask) {
      const newIds = member ? [member.uid] : [];
      try {
        await updateAssignees(
          item.rawTask.id,
          orgId,
          newIds,
          item.rawTask.assigneeIds || [],
          actor,
          item.rawTask.title
        );
      } catch (err) {
        console.error('Failed to update task assignees:', err);
      }
    } else if (item.type === 'issue' && item.rawIssue) {
      try {
        await updateIssue(item.rawIssue.id, {
          assigneeId: member ? member.uid : null,
          assigneeName: member ? member.fullName : null,
          assigneeAvatar: member ? (member.photoURL || null) : null
        });
      } catch (err) {
        console.error('Failed to update issue assignee:', err);
      }
    }

    setReassignTarget({ isOpen: false, item: null });
  };

  // ─── Card Click ──────────────────────────────────────────────────────────────

  const handleCardClick = (item: UnifiedItem) => {
    if (item.type === 'task' && item.rawTask) {
      setSelectedTask(item.rawTask);
    } else if (item.type === 'request' && item.rawRequest) {
      setSelectedRequest(item.rawRequest);
    } else if (item.type === 'issue' && item.rawIssue) {
      setSelectedIssue(item.rawIssue);
    }
  };

  const isLoading = tasksLoading || issuesLoading || requestsLoading;

  return (
    <div className="min-h-full w-full bg-background text-foreground flex flex-col antialiased selection:bg-primary/20 selection:text-primary">
      {/* ── Page Header: Apple SwiftUI Radical Minimalism ───────────────────── */}
      <div className="pt-8 pb-4 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                Execution Journey
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {org?.name || 'Workspace'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Tasks & Execution Journey
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Personal focus, operational requests, and workspace issues integrated into an uncluttered journey.
            </p>
          </div>

          {/* Header Controls: Progress Capsule & Quick Actions */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Journey Accomplishment Capsule */}
            <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-surface/80 dark:bg-surface/50 border border-border dark:border-border-strong shadow-xs">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Accomplishment Rate
                </span>
                <span className="text-xs font-extrabold text-foreground">
                  {journeyStats.completedCount} delivered · {journeyStats.inFlightCount} in flight
                </span>
              </div>
              <div className="w-10 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${journeyStats.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <button
              type="button"
              onClick={() => {
                quickInputRef.current?.focus();
                quickInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="px-3.5 py-2 rounded-2xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95 transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-sm shadow-primary/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Capture</span>
            </button>

            <button
              type="button"
              onClick={() => setCreateTaskOpen(true)}
              className="px-3.5 py-2 rounded-2xl text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground border border-border transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
              <span>Full Task</span>
            </button>

            <button
              type="button"
              onClick={() => setCreateIssueOpen(true)}
              className="px-3.5 py-2 rounded-2xl text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground border border-border transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Issue</span>
            </button>
          </div>
        </div>

        {/* ── Apple Minimalist Quick-Add Task & Request Bar ───────────────────── */}
        <div className="mt-6 rounded-3xl bg-surface/90 dark:bg-surface/50 backdrop-blur-2xl border border-border dark:border-border-strong p-3.5 sm:p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_12px_40px_rgb(0,0,0,0.45)] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-2xl bg-secondary/80 flex items-center justify-center shrink-0 text-muted-foreground">
              {quickType === 'task' ? (
                <ListTodo className="w-4 h-4 text-indigo-500" />
              ) : (
                <ClipboardList className="w-4 h-4 text-sky-500" />
              )}
            </div>

            <input
              ref={quickInputRef}
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleQuickSubmit();
                }
              }}
              placeholder={
                quickType === 'task'
                  ? 'Add a task or issue... (Press Enter to capture)'
                  : 'Add an operational request (e.g. Work from home Friday)... (Press Enter)'
              }
              className="flex-1 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 bg-transparent outline-none font-medium"
            />

            <button
              type="button"
              disabled={!quickTitle.trim() || isSubmittingQuick}
              onClick={handleQuickSubmit}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] cursor-pointer flex items-center gap-1.5 shadow-sm shadow-primary/20 shrink-0',
                quickTitle.trim() && !isSubmittingQuick
                  ? 'bg-primary text-primary-foreground hover:bg-primary/95'
                  : 'bg-muted text-muted-foreground/60 cursor-not-allowed opacity-60'
              )}
            >
              {isSubmittingQuick ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : quickSubmitSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>{quickSubmitSuccess ? 'Captured!' : '+ Capture'}</span>
            </button>
          </div>

          {/* Quick-Add Accessory Attributes */}
          <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap items-center gap-2 text-xs">
            {/* Quick Type switcher */}
            <div className="inline-flex p-0.5 rounded-full bg-secondary/80 dark:bg-secondary/40 border border-border/60">
              <button
                type="button"
                onClick={() => setQuickType('task')}
                className={cn(
                  'px-3 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-[0.98] cursor-pointer',
                  quickType === 'task'
                    ? 'bg-surface text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Task
              </button>
              <button
                type="button"
                onClick={() => setQuickType('request')}
                className={cn(
                  'px-3 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-[0.98] cursor-pointer',
                  quickType === 'request'
                    ? 'bg-surface text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Request
              </button>
            </div>

            {/* If Request: Category Picker */}
            {quickType === 'request' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRequestTypePickerOpen(!requestTypePickerOpen)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-border/60 bg-secondary/60 hover:bg-secondary text-foreground flex items-center gap-1 active:scale-[0.98] cursor-pointer"
                >
                  <ClipboardList className="w-3 h-3 text-sky-500" />
                  <span>{REQUEST_TYPE_LABELS[quickRequestType]}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
                </button>

                {requestTypePickerOpen && (
                  <div
                    ref={requestTypeRef}
                    className="absolute left-0 top-full mt-2 w-48 bg-surface/95 dark:bg-surface/90 border border-border dark:border-border-strong rounded-2xl shadow-xl p-1.5 z-50 backdrop-blur-2xl"
                  >
                    {(Object.keys(REQUEST_TYPE_LABELS) as RequestType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setQuickRequestType(t);
                          setRequestTypePickerOpen(false);
                        }}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between cursor-pointer transition-colors',
                          quickRequestType === t ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-secondary'
                        )}
                      >
                        <span>{REQUEST_TYPE_LABELS[t]}</span>
                        {quickRequestType === t && <Check className="w-3 h-3 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Priority Selector for Task */}
            {quickType === 'task' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPriorityPickerOpen(!priorityPickerOpen)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 active:scale-[0.98] cursor-pointer',
                    quickPriority !== 'none'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold'
                      : 'bg-secondary/60 hover:bg-secondary border-border/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Flame className="w-3 h-3" />
                  <span className="capitalize">{quickPriority !== 'none' ? quickPriority : 'Priority'}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
                </button>

                {priorityPickerOpen && (
                  <div
                    ref={priorityPickerRef}
                    className="absolute left-0 top-full mt-2 w-36 bg-surface/95 dark:bg-surface/90 border border-border dark:border-border-strong rounded-2xl shadow-xl p-1.5 z-50 backdrop-blur-2xl"
                  >
                    {(['none', 'low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setQuickPriority(p);
                          setPriorityPickerOpen(false);
                        }}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between cursor-pointer capitalize transition-colors',
                          quickPriority === p ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-secondary'
                        )}
                      >
                        <span>{p}</span>
                        {quickPriority === p && <Check className="w-3 h-3 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <span className="w-1 h-1 rounded-full bg-border" />

            {/* Quick Assignee / Approver Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAssigneePickerOpen(!assigneePickerOpen)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1.5 active:scale-[0.98] cursor-pointer',
                  quickAssignee
                    ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                    : 'bg-secondary/60 hover:bg-secondary border-border/60 text-muted-foreground hover:text-foreground'
                )}
              >
                <AtSign className="w-3 h-3" />
                {quickAssignee ? (
                  <>
                    <span>@{quickAssignee.fullName.split(' ')[0]}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickAssignee(null);
                      }}
                      className="p-0.5 hover:text-foreground cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </span>
                  </>
                ) : (
                  <span>{quickType === 'request' ? 'Approver' : 'Assignee'}</span>
                )}
              </button>

              {assigneePickerOpen && (
                <div
                  ref={assigneePickerRef}
                  className="absolute left-0 top-full mt-2 w-64 bg-surface/95 dark:bg-surface/90 border border-border dark:border-border-strong rounded-2xl shadow-xl p-2 z-50 backdrop-blur-2xl"
                >
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Select {quickType === 'request' ? 'Approver' : 'Assignee'}
                  </div>
                  <div className="p-1 border-b border-border/40 mb-1">
                    <input
                      type="text"
                      placeholder="Filter members..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="w-full text-xs bg-secondary/50 rounded-lg px-2 py-1 outline-none text-foreground placeholder:text-muted-foreground"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAssignee(null);
                        setAssigneePickerOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:bg-secondary flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Unassigned</span>
                    </button>
                    {filteredMembers.map((m) => (
                      <button
                        key={m.uid}
                        type="button"
                        onClick={() => {
                          setQuickAssignee(m);
                          setAssigneePickerOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-foreground hover:bg-secondary flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[8px] shrink-0',
                              getAvatarColor(m.uid)
                            )}
                          >
                            {m.fullName[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-xs leading-none truncate">{m.fullName}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">@{m.username}</p>
                          </div>
                        </div>
                        {quickAssignee?.uid === m.uid && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <span className="w-1 h-1 rounded-full bg-border" />

            {/* Quick Deadline Pills */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (deadlineMode === 'today') {
                    setDeadlineMode(null);
                  } else {
                    setDeadlineMode('today');
                    setCustomDateStr('');
                  }
                }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all active:scale-[0.98] cursor-pointer',
                  deadlineMode === 'today'
                    ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                    : 'bg-secondary/60 hover:bg-secondary border-border/60 text-muted-foreground hover:text-foreground'
                )}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => {
                  if (deadlineMode === 'tomorrow') {
                    setDeadlineMode(null);
                  } else {
                    setDeadlineMode('tomorrow');
                    setCustomDateStr('');
                  }
                }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all active:scale-[0.98] cursor-pointer',
                  deadlineMode === 'tomorrow'
                    ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                    : 'bg-secondary/60 hover:bg-secondary border-border/60 text-muted-foreground hover:text-foreground'
                )}
              >
                Tomorrow
              </button>

              <input
                ref={dateInputRef}
                type="date"
                value={customDateStr}
                onChange={(e) => {
                  setCustomDateStr(e.target.value);
                  setDeadlineMode(e.target.value ? 'custom' : null);
                }}
                className="sr-only"
              />

              <button
                type="button"
                onClick={() => {
                  try {
                    dateInputRef.current?.showPicker();
                  } catch {
                    dateInputRef.current?.focus();
                  }
                }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 active:scale-[0.98] cursor-pointer',
                  deadlineMode === 'custom' && customDateStr
                    ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                    : 'bg-secondary/60 hover:bg-secondary border-border/60 text-muted-foreground hover:text-foreground'
                )}
              >
                <CalendarIcon className="w-3 h-3" />
                <span>
                  {deadlineMode === 'custom' && customDateStr
                    ? new Date(customDateStr + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : 'Calendar'}
                </span>
                {deadlineMode === 'custom' && customDateStr && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomDateStr('');
                      setDeadlineMode(null);
                    }}
                    className="p-0.5 hover:text-foreground cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Apple Segmented Control Bar & Multi-View Switcher ─────────────────── */}
        <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Segment Filter (My Focus / All / Completed) */}
          <div className="relative inline-flex p-1 bg-secondary/70 dark:bg-secondary/40 backdrop-blur-xl border border-border rounded-2xl self-start overflow-x-auto max-w-full shadow-xs">
            {(
              [
                { id: 'assigned_to_me', label: 'My Focus', count: segmentCounts.assigned },
                { id: 'all', label: 'All Work', count: segmentCounts.all },
                { id: 'completed', label: 'Accomplished', count: segmentCounts.completed },
              ] as const
            ).map((tab) => {
              const isActive = activeSegment === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSegment(tab.id)}
                  className={cn(
                    'relative px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer z-10 flex items-center gap-2',
                    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="segmented-filter-pill"
                      className="absolute inset-0 bg-surface rounded-xl shadow-xs border border-border/80 dark:border-white/10 -z-10"
                      transition={{ type: 'spring', damping: 26, stiffness: 380 }}
                    />
                  )}
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.2 rounded-full transition-colors',
                      isActive
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted/70 text-muted-foreground'
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Controls: View Switcher (Board / List / Journey) + Search */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* View Switcher Pills */}
            <div className="relative inline-flex p-1 bg-secondary/70 dark:bg-secondary/40 backdrop-blur-xl border border-border rounded-2xl shrink-0 shadow-xs">
              {(
                [
                  { id: 'board', label: 'Board', icon: LayoutGrid },
                  { id: 'list', label: 'List', icon: List },
                  { id: 'journey', label: 'Journey', icon: Route },
                ] as const
              ).map((v) => {
                const isSelected = viewMode === v.id;
                const IconComponent = v.icon;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSetViewMode(v.id)}
                    className={cn(
                      'relative px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer z-10 flex items-center gap-1.5',
                      isSelected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                    title={`${v.label} View`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="view-mode-pill"
                        className="absolute inset-0 bg-surface rounded-xl shadow-xs border border-border/80 dark:border-white/10 -z-10"
                        transition={{ type: 'spring', damping: 26, stiffness: 380 }}
                      />
                    )}
                    <IconComponent className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search journey..."
                className="w-full text-xs rounded-2xl bg-surface border border-border pl-8.5 pr-8 py-2 text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Sub-Filters: Object Type & Priority Filter Bar ───────────────────── */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs">
          {/* Object Type Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
              Filter:
            </span>
            {(
              [
                { id: 'all', label: 'All', count: typeCounts.all },
                { id: 'task', label: 'Tasks', count: typeCounts.task },
                { id: 'request', label: 'Requests', count: typeCounts.request },
                { id: 'issue', label: 'Issues', count: typeCounts.issue },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setObjectFilter(t.id)}
                className={cn(
                  'px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                  objectFilter === t.id
                    ? 'bg-foreground text-background shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                )}
              >
                <span>{t.label}</span>
                <span
                  className={cn(
                    'text-[10px] font-bold px-1 rounded-full',
                    objectFilter === t.id ? 'bg-background/20 text-background' : 'text-muted-foreground'
                  )}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Priority Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
              Priority:
            </span>
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'urgent', label: 'Urgent' },
                { id: 'high', label: 'High' },
                { id: 'medium', label: 'Med' },
                { id: 'low', label: 'Low' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPriorityFilter(p.id)}
                className={cn(
                  'px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer',
                  priorityFilter === p.id
                    ? 'bg-foreground text-background shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                )}
              >
                {p.label}
              </button>
            ))}

            {(objectFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setObjectFilter('all');
                  setPriorityFilter('all');
                  setSearchQuery('');
                }}
                className="ml-2 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Dynamic View Canvas ─────────────────────────────────────────── */}
      <div className="flex-1 px-4 sm:px-8 pb-16 max-w-7xl mx-auto w-full">
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground font-medium tracking-wide">
              Loading execution journey…
            </p>
          </div>
        )}

        {!isLoading && filteredItems.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-surface/60 border border-border/80 dark:border-border/40 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-3">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-base font-bold text-foreground">All clear in this view</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5">
              {searchQuery
                ? 'No items match your search and filter criteria.'
                : activeSegment === 'assigned_to_me'
                ? 'You have no pending tasks, requests, or issues assigned to you. Enjoy the focus!'
                : 'No items recorded in this segment yet.'}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  quickInputRef.current?.focus();
                  quickInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
              >
                Capture Item
              </button>
              <button
                type="button"
                onClick={() => setCreateIssueOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-all cursor-pointer"
              >
                New Issue
              </button>
            </div>
          </div>
        )}

        {/* ── VIEW 1: KANBAN BOARD VIEW ───────────────────────────────────────── */}
        {!isLoading && filteredItems.length > 0 && viewMode === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {BOARD_COLUMNS.map((col) => {
              const colItems = boardGroupedItems[col.id];
              return (
                <div
                  key={col.id}
                  className="rounded-3xl bg-surface/50 dark:bg-surface/30 border border-border/80 dark:border-border-strong/70 p-3.5 flex flex-col min-h-[480px] shadow-xs"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: col.accentColor }}
                      />
                      <h3 className="text-xs font-bold text-foreground tracking-tight">
                        {col.title}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground">
                      {colItems.length}
                    </span>
                  </div>

                  {/* Column Cards */}
                  <div className="space-y-3 flex-1">
                    {colItems.length === 0 ? (
                      <div className="h-32 border border-dashed border-border/60 rounded-2xl flex items-center justify-center text-[11px] text-muted-foreground/60 font-medium">
                        No {col.title.toLowerCase()} items
                      </div>
                    ) : (
                      colItems.map((item) => {
                        const isIssue = item.type === 'issue';
                        const isRequest = item.type === 'request';
                        const isTask = item.type === 'task';
                        const canActOnRequest =
                          isRequest &&
                          item.status === 'pending' &&
                          (item.approverId === currentUserId || isManagerOrAdmin);

                        return (
                          <motion.div
                            key={item.id}
                            layout="position"
                            onClick={() => handleCardClick(item)}
                            whileHover={{ y: -2 }}
                            transition={{ duration: 0.15 }}
                            className={cn(
                              'group relative rounded-2xl p-3.5 transition-all cursor-pointer',
                              'bg-surface/90 dark:bg-surface/50 border border-border/80 dark:border-border/60',
                              'shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-border',
                              item.isCompleted && 'opacity-65'
                            )}
                          >
                            {/* Card Badges Row */}
                            <div className="flex items-center justify-between gap-1.5 mb-2">
                              <div className="flex items-center gap-1.5 truncate">
                                {isIssue && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    <Zap className="w-2.5 h-2.5" />
                                    {item.issueIdentifier || 'ISSUE'}
                                  </span>
                                )}
                                {isRequest && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                    <ClipboardList className="w-2.5 h-2.5" />
                                    {item.requestType ? REQUEST_TYPE_LABELS[item.requestType] : 'Request'}
                                  </span>
                                )}
                                {isTask && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    <ListTodo className="w-2.5 h-2.5" />
                                    Task
                                  </span>
                                )}
                              </div>

                              {/* Priority Dot/Pill */}
                              {item.priority !== 'none' && (
                                <span
                                  className={cn(
                                    'px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider',
                                    item.priority === 'urgent' && 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
                                    item.priority === 'high' && 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
                                    item.priority === 'medium' && 'bg-sky-500/10 text-sky-500 border border-sky-500/20',
                                    item.priority === 'low' && 'bg-secondary text-muted-foreground'
                                  )}
                                >
                                  {item.priority}
                                </span>
                              )}
                            </div>

                            {/* Card Title */}
                            <h4
                              className={cn(
                                'text-xs font-semibold text-foreground leading-snug line-clamp-2 mb-2',
                                item.isCompleted && 'line-through text-muted-foreground'
                              )}
                            >
                              {item.title}
                            </h4>

                            {/* Card Footer: Assignee & Due Date */}
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/40">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className={cn(
                                    'w-4.5 h-4.5 rounded-full border flex items-center justify-center font-bold text-[8px] shrink-0',
                                    getAvatarColor(item.assigneeIds[0] || 'none')
                                  )}
                                >
                                  {item.assigneeName ? item.assigneeName[0].toUpperCase() : '?'}
                                </div>
                                <span className="truncate max-w-[80px]">
                                  {item.assigneeName ? item.assigneeName.split(' ')[0] : 'Unassigned'}
                                </span>
                              </div>

                              {item.dueDate && (
                                <span
                                  className={cn(
                                    'font-mono text-[9px]',
                                    isOverdue(item.dueDate) && !item.isCompleted ? 'text-rose-500 font-bold' : '',
                                    isToday(item.dueDate) && !item.isCompleted ? 'text-amber-500 font-bold' : ''
                                  )}
                                >
                                  {item.dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>

                            {/* Fast Column Advance Actions on Hover */}
                            <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between gap-1">
                              {/* 1-Click Complete */}
                              {!isRequest && (
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleComplete(e, item)}
                                  className="text-[10px] text-muted-foreground hover:text-emerald-500 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>{item.isCompleted ? 'Reopen' : 'Done'}</span>
                                </button>
                              )}

                              {/* Direct Approve for Request */}
                              {canActOnRequest && (
                                <button
                                  type="button"
                                  disabled={approvingId === item.rawRequest?.id}
                                  onClick={(e) => item.rawRequest && handleDirectApprove(e, item.rawRequest)}
                                  className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 cursor-pointer hover:underline disabled:opacity-50"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Approve</span>
                                </button>
                              )}

                              {/* Advance Stage button */}
                              {col.id === 'todo' && !isRequest && (
                                <button
                                  type="button"
                                  onClick={(e) => handleAdvanceStatus(e, item, 'in_progress')}
                                  className="text-[10px] text-primary font-semibold flex items-center gap-0.5 ml-auto cursor-pointer hover:underline"
                                >
                                  <span>Start</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}

                              {col.id === 'in_progress' && !isRequest && (
                                <button
                                  type="button"
                                  onClick={(e) => handleAdvanceStatus(e, item, 'in_review')}
                                  className="text-[10px] text-primary font-semibold flex items-center gap-0.5 ml-auto cursor-pointer hover:underline"
                                >
                                  <span>Review</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}

                              {col.id === 'in_review' && !isRequest && (
                                <button
                                  type="button"
                                  onClick={(e) => handleAdvanceStatus(e, item, 'done')}
                                  className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5 ml-auto cursor-pointer hover:underline"
                                >
                                  <span>Finish</span>
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── VIEW 2: COMPACT & RADICAL MINIMALIST LIST VIEW ───────────────────── */}
        {!isLoading && filteredItems.length > 0 && viewMode === 'list' && (
          <div className="space-y-2.5">
            {filteredItems.map((item) => {
              const isIssue = item.type === 'issue';
              const isRequest = item.type === 'request';
              const isTask = item.type === 'task';

              const issueStatusCfg = isIssue ? ISSUE_STATUS_CONFIG[item.status as IssueStatus] : null;
              const issuePriorityCfg = isIssue ? ISSUE_PRIORITY_CONFIG[item.priority as IssuePriority] : null;
              const taskPriorityCfg = isTask && item.priority !== 'none' ? PRIORITY_CONFIG[item.priority as TaskPriority] : null;
              const taskStatusCfg = isTask ? STATUS_CONFIG[item.status as TaskStatus] : null;

              const canActOnRequest =
                isRequest &&
                item.status === 'pending' &&
                (item.approverId === currentUserId || isManagerOrAdmin);

              return (
                <motion.div
                  key={item.id}
                  layout="position"
                  onClick={() => handleCardClick(item)}
                  whileHover={{ y: -1 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'group relative rounded-2xl px-4 py-3 sm:py-3.5 transition-all cursor-pointer flex items-center justify-between gap-3',
                    'bg-surface/90 dark:bg-surface/50 border border-border/80 dark:border-border/60',
                    'shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] hover:border-border',
                    item.isCompleted && 'opacity-65 bg-surface/50 dark:bg-surface/30'
                  )}
                >
                  {/* Left: Checkbox + Title + Identifier */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Squircle Checkbox */}
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isRequest ? (
                        <div
                          className={cn(
                            'w-5 h-5 rounded-lg flex items-center justify-center border text-[10px]',
                            item.status === 'approved' && 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                            item.status === 'rejected' && 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                            item.status === 'pending' && 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          )}
                        >
                          {item.status === 'approved' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : item.status === 'rejected' ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleToggleComplete(e, item)}
                          className={cn(
                            'w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer',
                            item.isCompleted
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-border/80 hover:border-primary/60 bg-secondary/40 text-transparent hover:text-muted-foreground'
                          )}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </button>
                      )}
                    </div>

                    {/* Tag badge */}
                    {isIssue && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {item.issueIdentifier || 'ISSUE'}
                      </span>
                    )}

                    {isRequest && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                        {item.requestType ? REQUEST_TYPE_LABELS[item.requestType] : 'Request'}
                      </span>
                    )}

                    {/* Title */}
                    <span
                      className={cn(
                        'text-xs sm:text-sm font-semibold text-foreground truncate',
                        item.isCompleted && 'line-through text-muted-foreground'
                      )}
                    >
                      {item.title}
                    </span>
                  </div>

                  {/* Right Metadata & Inline Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Priority Indicator */}
                    {item.priority !== 'none' && (
                      <span
                        className={cn(
                          'hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                          item.priority === 'urgent' && 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
                          item.priority === 'high' && 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
                          item.priority === 'medium' && 'bg-sky-500/10 text-sky-500 border border-sky-500/20',
                          item.priority === 'low' && 'bg-secondary text-muted-foreground'
                        )}
                      >
                        {item.priority}
                      </span>
                    )}

                    {/* Due Date */}
                    {item.dueDate && (
                      <span
                        className={cn(
                          'hidden md:inline-block text-[11px] font-mono text-muted-foreground',
                          isOverdue(item.dueDate) && !item.isCompleted && 'text-rose-500 font-bold',
                          isToday(item.dueDate) && !item.isCompleted && 'text-amber-500 font-bold'
                        )}
                      >
                        {item.dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}

                    {/* Direct 1-Click Approve for Requests */}
                    {canActOnRequest && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={approvingId === item.rawRequest?.id}
                          onClick={(e) => item.rawRequest && handleDirectApprove(e, item.rawRequest)}
                          className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1 active:scale-[0.97]"
                        >
                          {approvingId === item.rawRequest?.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          <span>Approve</span>
                        </button>
                      </div>
                    )}

                    {/* Assignee Avatar */}
                    {(isTask || isIssue) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReassignTarget({ isOpen: true, item });
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-medium border border-border/60 hover:bg-secondary/60 cursor-pointer transition-colors"
                        title="Click to reassign"
                      >
                        <div
                          className={cn(
                            'w-4.5 h-4.5 rounded-full border flex items-center justify-center font-bold text-[8px] shrink-0',
                            getAvatarColor(item.assigneeIds[0] || 'none')
                          )}
                        >
                          {item.assigneeName ? item.assigneeName[0].toUpperCase() : <UserPlus className="w-2.5 h-2.5" />}
                        </div>
                        <span className="hidden sm:inline truncate max-w-[70px]">
                          {item.assigneeName ? item.assigneeName.split(' ')[0] : 'Assign'}
                        </span>
                      </button>
                    )}

                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── VIEW 3: JOURNEY & TIMELINE STREAM ──────────────────────────────── */}
        {!isLoading && filteredItems.length > 0 && viewMode === 'journey' && (
          <div className="space-y-8">
            {journeyGroupedItems.map((group) => (
              <div key={group.id} className="relative">
                {/* Milestone Section Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center shrink-0" />
                  <div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      {group.title}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {group.subtitle}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground ml-auto">
                    {group.items.length} events
                  </span>
                </div>

                {/* Milestone Connecting Timeline Line */}
                <div className="relative pl-6 space-y-3.5 border-l-2 border-border/60 ml-1.5">
                  {group.items.map((item) => {
                    const isIssue = item.type === 'issue';
                    const isRequest = item.type === 'request';
                    const isTask = item.type === 'task';
                    const canActOnRequest =
                      isRequest &&
                      item.status === 'pending' &&
                      (item.approverId === currentUserId || isManagerOrAdmin);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleCardClick(item)}
                        className="relative group rounded-2xl p-4 bg-surface/90 dark:bg-surface/50 border border-border/80 dark:border-border/60 hover:border-border transition-all cursor-pointer shadow-xs"
                      >
                        {/* Timeline Node Point */}
                        <span
                          className={cn(
                            'absolute -left-[31px] top-4.5 w-3.5 h-3.5 rounded-full border-2 bg-surface',
                            item.isCompleted ? 'border-emerald-500' : 'border-primary'
                          )}
                        />

                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isIssue && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  <Zap className="w-2.5 h-2.5" />
                                  {item.issueIdentifier}
                                </span>
                              )}
                              {isRequest && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                  <ClipboardList className="w-2.5 h-2.5" />
                                  {item.requestType ? REQUEST_TYPE_LABELS[item.requestType] : 'Request'}
                                </span>
                              )}
                              {isTask && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                  <ListTodo className="w-2.5 h-2.5" />
                                  Task
                                </span>
                              )}

                              <span
                                className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider',
                                  item.isCompleted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground'
                                )}
                              >
                                {item.status}
                              </span>
                            </div>

                            <h4
                              className={cn(
                                'text-sm font-semibold text-foreground leading-snug',
                                item.isCompleted && 'line-through text-muted-foreground'
                              )}
                            >
                              {item.title}
                            </h4>

                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {item.description.replace(/<[^>]*>/g, '')}
                              </p>
                            )}

                            {isRequest && (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                                <span className="font-semibold text-foreground">
                                  @{item.creatorUsername || item.creatorName}
                                </span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
                                <span className="font-semibold text-foreground">
                                  @{item.approverUsername || item.approverName}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Quick Right Action */}
                          <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {canActOnRequest && (
                              <button
                                type="button"
                                disabled={approvingId === item.rawRequest?.id}
                                onClick={(e) => item.rawRequest && handleDirectApprove(e, item.rawRequest)}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                            )}

                            {!isRequest && (
                              <button
                                type="button"
                                onClick={(e) => handleToggleComplete(e, item)}
                                className={cn(
                                  'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5',
                                  item.isCompleted
                                    ? 'bg-secondary text-muted-foreground border-border'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                )}
                              >
                                <Check className="w-3 h-3" />
                                <span>{item.isCompleted ? 'Completed' : 'Mark Done'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Reassign Member Popover / Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {reassignTarget.isOpen && reassignTarget.item && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden p-5"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
                <h4 className="text-xs font-bold text-foreground">
                  Reassign “{reassignTarget.item.title}”
                </h4>
                <button
                  type="button"
                  onClick={() => setReassignTarget({ isOpen: false, item: null })}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => handleReassignMember(null)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Unassigned</span>
                </button>

                {members.map((m) => (
                  <button
                    key={m.uid}
                    type="button"
                    onClick={() => handleReassignMember(m)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full border flex items-center justify-center font-bold text-[9px] shrink-0',
                          getAvatarColor(m.uid)
                        )}
                      >
                        {m.fullName[0]}
                      </div>
                      <div>
                        <p className="font-semibold">{m.fullName}</p>
                        <p className="text-[10px] text-muted-foreground">@{m.username}</p>
                      </div>
                    </div>
                    {reassignTarget.item?.assigneeIds.includes(m.uid) && (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Drawers & Full Modals ──────────────────────────────────────────────── */}

      {/* 1. Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask ? allTasks.find((t) => t.id === selectedTask.id) || selectedTask : null}
        onClose={() => setSelectedTask(null)}
        orgId={orgId}
        actor={actor}
        members={members}
        projects={projects}
        goals={goals}
      />

      {/* 2. Request Detail Drawer */}
      {selectedRequest && userProfile && (
        <RequestDetailDrawer
          request={selectedRequest}
          currentUser={userProfile}
          orgId={orgId}
          onClose={() => setSelectedRequest(null)}
        />
      )}

      {/* 3. Issue Detail Drawer */}
      <IssueDetailDrawer
        issue={selectedIssue ? issues.find((i) => i.id === selectedIssue.id) || selectedIssue : null}
        onClose={() => setSelectedIssue(null)}
        members={members}
        cycles={cycles}
        onIssueUpdated={(id, patch) => updateIssue(id, patch)}
      />

      {/* 4. Full Create Task Modal */}
      <CreateTaskModal
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        orgId={orgId}
        actor={actor}
        labels={labels}
      />

      {/* 5. Create Issue Modal */}
      <StudioCreateIssueModal
        isOpen={createIssueOpen}
        onClose={() => setCreateIssueOpen(false)}
        onSubmit={async (data) => {
          await createIssue({
            title: data.title,
            descriptionHtml: data.descriptionHtml,
            status: data.status,
            priority: data.priority,
            estimatePoints: data.estimatePoints,
            assigneeId: data.assigneeId,
            assigneeName: data.assigneeName
          });
          setCreateIssueOpen(false);
        }}
      />
    </div>
  );
}

export default TasksFeedPage;
