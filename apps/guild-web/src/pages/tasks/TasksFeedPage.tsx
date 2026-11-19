import { getTeamWorkScope } from '../workspace/teamWork';
import { useSearchParams } from 'react-router-dom';
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
type SegmentFilter = 'assigned_to_me' | 'my_teams' | 'all' | 'completed';
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

  const [params, setParams] = useSearchParams();
  const scope = params.get('scope');
  const activeSegment: SegmentFilter = scope === 'my_teams' || scope === 'all' || scope === 'completed'
    ? scope : 'assigned_to_me';
  const setActiveSegment = (segment: SegmentFilter) => {
    const next = new URLSearchParams(params);
    if (segment === 'assigned_to_me') next.delete('scope');
    else next.set('scope', segment);
    setParams(next);
  };
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
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);
  const filterMenuRef = React.useRef<HTMLDivElement>(null);
  const [newMenuOpen, setNewMenuOpen] = React.useState(false);
  const newMenuRef = React.useRef<HTMLDivElement>(null);

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
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setFilterMenuOpen(false);
      }
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setNewMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Drawers & Modals State ──────────────────────────────────────────────────
  const linkedTaskId = params.get('task');
  const openTask = linkedTaskId ? allTasks.find((task) => task.id === linkedTaskId) : null;
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

  const teams = workspace?.teams;
  const teamScope = React.useMemo(
    () => getTeamWorkScope(teams || [], projects, currentUserId),
    [teams, projects, currentUserId]
  );

  const matchesSegment = React.useCallback((item: UnifiedItem, segment: SegmentFilter) => {
    if (segment === 'completed') return item.isCompleted;
    if (item.isCompleted) return false;
    if (segment === 'all') return true;
    if (segment === 'assigned_to_me') {
      return item.assigneeIds.includes(currentUserId) ||
        (item.type === 'request' && item.creatorId === currentUserId);
    }
    return teamScope.includesTask(item.rawTask) || teamScope.includesIssue(item.rawIssue);
  }, [currentUserId, teamScope]);

  const segmentCounts = React.useMemo(() => ({
    assigned: unifiedItems.filter((item) => matchesSegment(item, 'assigned_to_me')).length,
    teams: unifiedItems.filter((item) => matchesSegment(item, 'my_teams')).length,
    all: unifiedItems.filter((item) => matchesSegment(item, 'all')).length,
    completed: unifiedItems.filter((item) => matchesSegment(item, 'completed')).length,
  }), [unifiedItems, matchesSegment]);

  const typeCounts = React.useMemo(() => {
    const counts = { all: 0, task: 0, request: 0, issue: 0 };
    for (const item of unifiedItems) {
      if (!matchesSegment(item, activeSegment)) continue;
      counts.all++;
      counts[item.type]++;
    }
    return counts;
  }, [unifiedItems, activeSegment, matchesSegment]);

  // ─── Filtered Items ──────────────────────────────────────────────────────────

  const filteredItems = React.useMemo(() => {
    return unifiedItems.filter((item) => {
      if (!matchesSegment(item, activeSegment)) return false;

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
        const matchesAssignee = item.assigneeIds.some((id) => memberMap.get(id)?.fullName.toLowerCase().includes(q)) ||
          item.assigneeName?.toLowerCase().includes(q);
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
  }, [unifiedItems, activeSegment, objectFilter, priorityFilter, searchQuery, currentUserId, isManagerOrAdmin, matchesSegment, memberMap]);

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
      const next = new URLSearchParams(params);
      next.set('task', item.rawTask.id);
      setParams(next);
    } else if (item.type === 'request' && item.rawRequest) {
      setSelectedRequest(item.rawRequest);
    } else if (item.type === 'issue' && item.rawIssue) {
      setSelectedIssue(item.rawIssue);
    }
  };

  const isLoading = tasksLoading || issuesLoading || requestsLoading;

  return (
    <div className="min-h-full w-full bg-background text-foreground flex flex-col antialiased selection:bg-primary/20 selection:text-primary">
      {/* ── Compact 40px Command Toolbar Row ──────────────────────────────────── */}
      <div className="min-h-10 py-1 px-2 sm:px-6 border-b border-border/40 bg-surface/85 dark:bg-surface/55 backdrop-blur-2xl flex flex-wrap items-center justify-between gap-2 shrink-0 z-20 select-none">
        {/* Status Segments */}
        <div className="inline-flex max-w-full overflow-x-auto p-0.5 rounded-lg bg-secondary/80 dark:bg-secondary/40 border border-border/40 shrink-0">
          {(
            [
              { id: 'assigned_to_me', label: 'My Work', count: segmentCounts.assigned },
              { id: 'my_teams', label: 'My Teams', count: segmentCounts.teams },
              { id: 'all', label: 'All Available', count: segmentCounts.all },
              { id: 'completed', label: 'Completed', count: segmentCounts.completed },
            ] as const
          ).map((tab) => {
            const isActive = activeSegment === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSegment(tab.id)}
                className={cn(
                  'whitespace-nowrap px-2.5 py-0.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                  isActive
                    ? 'bg-surface text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'text-[10px] font-bold px-1 rounded-full',
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

        {/* Right Controls: Search + Filter + View Switcher + Single '+ New' Button */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search work…"
              className="w-32 sm:w-44 lg:w-56 h-7 text-xs rounded-lg bg-secondary/50 dark:bg-secondary/30 border border-border/40 pl-7 pr-6 text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Popover */}
          <div className="relative" ref={filterMenuRef}>
            <button
              type="button"
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
              className={cn(
                'h-7 px-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer',
                objectFilter !== 'all' || priorityFilter !== 'all'
                  ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
                  : 'border-border/50 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
              title="Filter items"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span className="hidden sm:inline">Filter</span>
              {(objectFilter !== 'all' || priorityFilter !== 'all') && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>

            {filterMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-surface/95 dark:bg-surface/90 border border-border dark:border-border-strong rounded-xl shadow-xl p-2.5 z-50 backdrop-blur-2xl space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Type
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'task', label: 'Tasks' },
                        { id: 'request', label: 'Requests' },
                        { id: 'issue', label: 'Issues' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setObjectFilter(t.id)}
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                          objectFilter === t.id
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-secondary/60 hover:bg-secondary text-foreground'
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Priority
                  </div>
                  <div className="flex flex-wrap gap-1">
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
                          'px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                          priorityFilter === p.id
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-secondary/60 hover:bg-secondary text-foreground'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(objectFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
                  <div className="pt-1.5 border-t border-border/40 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setObjectFilter('all');
                        setPriorityFilter('all');
                        setSearchQuery('');
                      }}
                      className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Reset filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* View Switcher (Board / List / Journey) */}
          <div className="inline-flex p-0.5 rounded-lg bg-secondary/80 dark:bg-secondary/40 border border-border/40 shrink-0">
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
                    'px-2 py-0.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1',
                    isSelected
                      ? 'bg-surface text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title={`${v.label} View`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{v.label}</span>
                </button>
              );
            })}
          </div>

          {/* Single '+ New' Button with Dropdown */}
          <div className="relative" ref={newMenuRef}>
            <button
              type="button"
              onClick={() => setNewMenuOpen(!newMenuOpen)}
              className="h-7 px-2.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95 transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {newMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-40 bg-surface/95 dark:bg-surface/90 border border-border dark:border-border-strong rounded-xl shadow-xl p-1 z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setNewMenuOpen(false);
                    setCreateTaskOpen(true);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-secondary flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
                  <span>New Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewMenuOpen(false);
                    setCreateIssueOpen(true);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-secondary flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>New Issue</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Dynamic View Canvas ─────────────────────────────────────────── */}
      <div className="flex-1 px-4 sm:px-6 py-4 pb-16 w-full overflow-y-auto">
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
                onClick={() => setCreateTaskOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
              >
                New Task
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
            {BOARD_COLUMNS.map((col) => {
              const colItems = boardGroupedItems[col.id];
              return (
                <div
                  key={col.id}
                  className="rounded-xl p-2 bg-secondary/35 border border-border/30 min-h-[420px] flex flex-col shadow-xs"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1.5 py-1 mb-1.5 border-b border-border/20">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: col.accentColor }}
                      />
                      <h3 className="text-xs font-bold text-foreground tracking-tight">
                        {col.title}
                      </h3>
                    </div>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground">
                      {colItems.length}
                    </span>
                  </div>

                  {/* Column Cards */}
                  <div className="space-y-2 flex-1">
                    {colItems.length === 0 ? (
                      <div className="h-28 border border-dashed border-border/40 rounded-lg flex items-center justify-center text-[11px] text-muted-foreground/60 font-medium">
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
                            whileHover={{ y: -1 }}
                            transition={{ duration: 0.12 }}
                            className={cn(
                              'group relative rounded-lg p-2.5 transition-all cursor-pointer',
                              'bg-surface dark:bg-card border border-border/40 hover:border-border shadow-2xs',
                              item.isCompleted && 'opacity-65'
                            )}
                          >
                            {/* Card Title */}
                            <h4
                              className={cn(
                                'text-xs font-semibold text-foreground leading-snug line-clamp-2 mb-2',
                                item.isCompleted && 'line-through text-muted-foreground'
                              )}
                            >
                              {item.title}
                            </h4>

                            {/* Inline Flowing Metadata Row: mini-avatar (w-5 h-5), priority dot, due date text, identifier chip */}
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
                              {/* Mini Avatar */}
                              <div
                                title={item.assigneeName || 'Unassigned'}
                                className={cn(
                                  'w-5 h-5 rounded-full border border-border/40 flex items-center justify-center font-bold text-[8px] shrink-0',
                                  getAvatarColor(item.assigneeIds[0] || 'none')
                                )}
                              >
                                {item.assigneeName ? item.assigneeName[0].toUpperCase() : '?'}
                              </div>

                              {/* Priority Dot */}
                              {item.priority !== 'none' && (
                                <span
                                  title={`Priority: ${item.priority}`}
                                  className={cn(
                                    'w-2 h-2 rounded-full shrink-0',
                                    item.priority === 'urgent' && 'bg-rose-500 ring-2 ring-rose-500/20',
                                    item.priority === 'high' && 'bg-amber-500 ring-2 ring-amber-500/20',
                                    item.priority === 'medium' && 'bg-sky-500 ring-2 ring-sky-500/20',
                                    item.priority === 'low' && 'bg-muted-foreground/50'
                                  )}
                                />
                              )}

                              {/* Identifier Chip */}
                              {isIssue && (
                                <span className="font-mono text-[9px] font-bold text-amber-600 dark:text-amber-400 px-1 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">
                                  {item.issueIdentifier || 'ISSUE'}
                                </span>
                              )}
                              {isRequest && (
                                <span className="text-[9px] font-semibold text-sky-600 dark:text-sky-400 px-1 py-0.2 rounded bg-sky-500/10 border border-sky-500/20">
                                  {item.requestType ? REQUEST_TYPE_LABELS[item.requestType] : 'Req'}
                                </span>
                              )}

                              {/* Due Date Text */}
                              {item.dueDate && (
                                <span
                                  className={cn(
                                    'font-mono text-[9px] ml-auto shrink-0',
                                    isOverdue(item.dueDate) && !item.isCompleted ? 'text-rose-500 font-bold' : '',
                                    isToday(item.dueDate) && !item.isCompleted ? 'text-amber-500 font-bold' : ''
                                  )}
                                >
                                  {item.dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>

                            {/* Fast Column Advance Actions on Hover */}
                            <div className="mt-2 pt-1.5 border-t border-border/20 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        task={openTask ?? null}
        onClose={() => {
          const next = new URLSearchParams(params);
          next.delete('task');
          setParams(next, { replace: true });
        }}
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
