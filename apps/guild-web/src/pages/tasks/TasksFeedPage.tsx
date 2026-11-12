import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, Check, CheckCircle2, XCircle, Clock,
  Zap, ClipboardList, ListTodo, Calendar as CalendarIcon,
  ChevronDown, ArrowRight, X, AtSign, Loader2,
  UserPlus, RefreshCw, Layers
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspaceData } from '../../context/WorkspaceDataContext';
import { useWorkspaceIssues, ISSUE_STATUS_CONFIG, ISSUE_PRIORITY_CONFIG } from '../../hooks/useWorkspaceIssues';
import { useWorkspaceCycles } from '../../hooks/useWorkspaceCycles';
import { TaskDetailDrawer } from '../../components/tasks/TaskDetailDrawer';
import { RequestDetailDrawer } from '../../components/tasks/RequestDetailDrawer';
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

// ─── Filter Types ─────────────────────────────────────────────────────────────

type SegmentFilter = 'all' | 'assigned_to_me' | 'completed';
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

  // ─── Inline Quick-Add State ──────────────────────────────────────────────────
  const [quickTitle, setQuickTitle] = React.useState('');
  const [quickType, setQuickType] = React.useState<'task' | 'request'>('task');
  const [quickRequestType, setQuickRequestType] = React.useState<RequestType>('other');
  const [quickAssignee, setQuickAssignee] = React.useState<UserProfile | null>(null);
  const [deadlineMode, setDeadlineMode] = React.useState<'today' | 'tomorrow' | 'custom' | null>(null);
  const [customDateStr, setCustomDateStr] = React.useState('');
  const [assigneePickerOpen, setAssigneePickerOpen] = React.useState(false);
  const [requestTypePickerOpen, setRequestTypePickerOpen] = React.useState(false);
  const [memberSearch, setMemberSearch] = React.useState('');
  const [isSubmittingQuick, setIsSubmittingQuick] = React.useState(false);
  const [quickSubmitSuccess, setQuickSubmitSuccess] = React.useState(false);

  const quickInputRef = React.useRef<HTMLInputElement>(null);
  const assigneePickerRef = React.useRef<HTMLDivElement>(null);
  const requestTypeRef = React.useRef<HTMLDivElement>(null);
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
      if (rejectPopoverRef.current && !rejectPopoverRef.current.contains(e.target as Node)) {
        setRejectTargetId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Filter States ───────────────────────────────────────────────────────────
  const [activeSegment, setActiveSegment] = React.useState<SegmentFilter>('assigned_to_me');
  const [objectFilter, setObjectFilter] = React.useState<ObjectTypeFilter>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<PriorityFilter>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // ─── Drawers & Modals State ──────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [selectedRequest, setSelectedRequest] = React.useState<OrgRequest | null>(null);
  const [selectedIssue, setSelectedIssue] = React.useState<WorkspaceIssue | null>(null);
  const [createIssueOpen, setCreateIssueOpen] = React.useState(false);

  // Reassign popover state
  const [reassignTarget, setReassignTarget] = React.useState<{
    isOpen: boolean;
    item: UnifiedItem | null;
  }>({
    isOpen: false,
    item: null
  });

  // ─── Aggregate & Normalize All Items ─────────────────────────────────────────

  // Merge unique requests from sent + received
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

      // Active items
      all++;

      // Assigned to Me / Involving Me
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
      // Sort priority rank
      const priorityWeights: Record<string, number> = {
        urgent: 4,
        high: 3,
        medium: 2,
        low: 1,
        none: 0,
      };

      if (!a.isCompleted && !b.isCompleted) {
        // Pending requests for current user to approve first
        const aNeedsMyApproval = a.type === 'request' && a.status === 'pending' && (a.approverId === currentUserId || isManagerOrAdmin);
        const bNeedsMyApproval = b.type === 'request' && b.status === 'pending' && (b.approverId === currentUserId || isManagerOrAdmin);
        if (aNeedsMyApproval && !bNeedsMyApproval) return -1;
        if (!aNeedsMyApproval && bNeedsMyApproval) return 1;

        // Then priority weight
        const pDiff = (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
        if (pDiff !== 0) return pDiff;
      }

      // Otherwise most recently updated
      return b.updatedAtMs - a.updatedAtMs;
    });
  }, [unifiedItems, activeSegment, objectFilter, priorityFilter, searchQuery, currentUserId, isManagerOrAdmin]);

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
      // Compute due date
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
          dueDate: derivedDueDate,
          assigneeIds: quickAssignee ? [quickAssignee.uid] : [],
          actor
        });
      } else {
        // Resolve Approver for request
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

  // 2. Direct 1-Click Approve for Requests
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

  // 3. Direct Reject with Optional Note
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

  // 4. Reassign Member
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
      {/* ── Page Header: Apple SwiftUI Style ─────────────────────────────────── */}
      <div className="pt-8 pb-4 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                Execution Hub
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {org?.name || 'Workspace'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Tasks & Unified Feed
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Personal tasks, operational requests, and workspace issues integrated in one seamless stream.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                quickInputRef.current?.focus();
                quickInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="px-3.5 py-2 rounded-2xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95 transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-sm shadow-primary/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Add</span>
            </button>

            <button
              type="button"
              onClick={() => setCreateIssueOpen(true)}
              className="px-3.5 py-2 rounded-2xl text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground border border-border transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>New Issue</span>
            </button>
          </div>
        </div>

        {/* ── Apple Minimalist Quick-Add Task & Request Bar ───────────────────── */}
        <div className="mt-6 rounded-3xl bg-surface/90 dark:bg-surface/50 backdrop-blur-2xl border border-border dark:border-border-strong p-3.5 sm:p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_12px_40px_rgb(0,0,0,0.45)] transition-all">
          {/* Main Input Row */}
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
                  ? 'Write a task or request... (Press Enter to add)'
                  : 'Write a request (e.g. Work from home Friday)... (Press Enter to add)'
              }
              className="flex-1 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 bg-transparent outline-none font-medium"
            />

            {/* Quick Add Button */}
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
              <span>{quickSubmitSuccess ? 'Added!' : '+ Add'}</span>
            </button>
          </div>

          {/* Accessory Controls Row */}
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

              {/* Member Picker Popover */}
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

              {/* Native Calendar Picker Input */}
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

        {/* ── Apple Segmented Control Bar (Unified Tasks & Requests) ───────────── */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative inline-flex p-1 bg-secondary/70 dark:bg-secondary/40 backdrop-blur-xl border border-border rounded-2xl self-start overflow-x-auto max-w-full">
            {(
              [
                { id: 'all', label: 'All Work', count: segmentCounts.all },
                { id: 'assigned_to_me', label: 'Assigned to Me', count: segmentCounts.assigned },
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

          {/* Quick Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, requests, issues..."
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

      {/* ── Main Unified Object Feed ────────────────────────────────────────── */}
      <div className="flex-1 px-4 sm:px-8 pb-16 max-w-7xl mx-auto w-full">
        {isLoading && (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground font-medium tracking-wide">
              Loading execution feed…
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
                ? 'You have no pending tasks, requests, or issues assigned to you. Enjoy the momentum!'
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
                Add Task or Request
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

        {/* ── Feed List ──────────────────────────────────────────────────────── */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isIssue = item.type === 'issue';
              const isRequest = item.type === 'request';
              const isTask = item.type === 'task';

              const issueStatusCfg = isIssue ? ISSUE_STATUS_CONFIG[item.status as IssueStatus] : null;
              const issuePriorityCfg = isIssue ? ISSUE_PRIORITY_CONFIG[item.priority as IssuePriority] : null;
              const taskPriorityCfg = isTask && item.priority !== 'none' ? PRIORITY_CONFIG[item.priority as TaskPriority] : null;
              const taskStatusCfg = isTask ? STATUS_CONFIG[item.status as TaskStatus] : null;

              // Manager/Approver can act on pending requests
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
                    'group relative rounded-2xl p-4 sm:p-4.5 transition-all cursor-pointer',
                    'bg-surface/90 dark:bg-surface/50 border border-border/80 dark:border-border/60',
                    'shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-border',
                    item.isCompleted && 'opacity-65 bg-surface/50 dark:bg-surface/30'
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Checkbox / Status Circle */}
                    <div className="pt-0.5 shrink-0">
                      {isRequest ? (
                        <div
                          className={cn(
                            'w-5 h-5 rounded-lg flex items-center justify-center border text-[10px]',
                            item.status === 'approved' && 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                            item.status === 'rejected' && 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                            item.status === 'pending' && 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          )}
                          title={`Request status: ${item.status}`}
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
                          title={item.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </button>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="flex-1 min-w-0">
                      {/* Top Badges Row */}
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {/* ⚡ Issue Type Badge */}
                        {isIssue && (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Zap className="w-2.5 h-2.5" />
                              {item.issueIdentifier || 'ISSUE'}
                            </span>

                            {issuePriorityCfg && (
                              <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-semibold', issuePriorityCfg.color)}>
                                {issuePriorityCfg.label}
                              </span>
                            )}

                            {item.estimatePoints != null && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-secondary text-muted-foreground border border-border/60">
                                {item.estimatePoints} pts
                              </span>
                            )}

                            {item.cycleName && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-secondary/80 text-foreground border border-border/40">
                                <RefreshCw className="w-2.5 h-2.5 text-muted-foreground" />
                                <span>{item.cycleName}</span>
                              </span>
                            )}

                            {issueStatusCfg && (
                              <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-semibold', issueStatusCfg.color)}>
                                {issueStatusCfg.label}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Request Type Badge */}
                        {isRequest && (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                              <ClipboardList className="w-2.5 h-2.5" />
                              {item.requestType ? REQUEST_TYPE_LABELS[item.requestType] : 'Request'}
                            </span>

                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                                item.status === 'approved' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
                                item.status === 'rejected' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
                                item.status === 'pending' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              )}
                            >
                              {item.status}
                            </span>

                            {(item.startDate || item.endDate) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono text-muted-foreground bg-secondary/60">
                                <CalendarIcon className="w-2.5 h-2.5 text-muted-foreground" />
                                <span>{item.startDate} {item.endDate && item.endDate !== item.startDate ? `→ ${item.endDate}` : ''}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* ☑ Task Type Badge */}
                        {isTask && (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              <ListTodo className="w-2.5 h-2.5" />
                              Task
                            </span>

                            {taskStatusCfg && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-secondary text-foreground border border-border/40">
                                {taskStatusCfg.label}
                              </span>
                            )}

                            {taskPriorityCfg && (
                              <span
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                                style={{ backgroundColor: `${taskPriorityCfg.color}15`, color: taskPriorityCfg.color }}
                              >
                                {taskPriorityCfg.label}
                              </span>
                            )}

                            {item.dueDate && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-muted-foreground bg-secondary/60">
                                Due {item.dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Title & Preview */}
                      <h3
                        className={cn(
                          'text-sm font-semibold text-foreground leading-snug line-clamp-1',
                          item.isCompleted && 'line-through text-muted-foreground'
                        )}
                      >
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {item.description.replace(/<[^>]*>/g, '')}
                        </p>
                      )}

                      {/* Request Requester & Approver summary */}
                      {isRequest && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">
                            @{item.creatorUsername || item.creatorName || 'requester'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
                          <span className="font-medium text-foreground">
                            @{item.approverUsername || item.approverName || 'approver'}
                          </span>
                          {item.approverNote && (
                            <span className="italic text-muted-foreground/80 line-clamp-1 ml-2">
                              “{item.approverNote}”
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right-Side Inline Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-center">
                      {/* Direct 1-Click Approve / Reject for managers */}
                      {canActOnRequest && (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={approvingId === item.rawRequest?.id}
                            onClick={(e) => item.rawRequest && handleDirectApprove(e, item.rawRequest)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1 active:scale-[0.97] shadow-xs disabled:opacity-50"
                            title="1-Click Approve"
                          >
                            {approvingId === item.rawRequest?.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Approve</span>
                          </button>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setRejectTargetId(rejectTargetId === item.rawRequest?.id ? null : (item.rawRequest?.id || null))}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1 active:scale-[0.97] shadow-xs"
                              title="Reject request"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>

                            {/* Sleek Micro-Popover for Reject */}
                            {rejectTargetId === item.rawRequest?.id && (
                              <div
                                ref={rejectPopoverRef}
                                className="absolute right-0 top-full mt-2 w-64 p-3.5 bg-surface border border-border dark:border-border-strong rounded-2xl shadow-2xl z-50 backdrop-blur-2xl"
                              >
                                <p className="text-xs font-bold text-foreground mb-1.5">Reject this request?</p>
                                <input
                                  type="text"
                                  value={rejectNote}
                                  onChange={(e) => setRejectNote(e.target.value)}
                                  placeholder="Reason (optional)..."
                                  className="w-full text-xs bg-secondary/60 rounded-xl px-2.5 py-1.5 outline-none text-foreground placeholder:text-muted-foreground mb-2.5 border border-border/60"
                                  autoFocus
                                />
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectTargetId(null);
                                      setRejectNote('');
                                    }}
                                    className="px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => item.rawRequest && handleDirectReject(item.rawRequest, rejectNote)}
                                    className="px-3 py-1 text-xs font-semibold bg-rose-500 text-white rounded-xl hover:bg-rose-600 active:scale-[0.97] transition-all cursor-pointer shadow-xs"
                                  >
                                    Confirm Reject
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Reassign @username button */}
                      {(isTask || isIssue) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReassignTarget({ isOpen: true, item });
                          }}
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border border-border/60 transition-colors cursor-pointer',
                            item.assigneeName
                              ? 'bg-secondary/60 hover:bg-secondary text-foreground'
                              : 'bg-transparent hover:bg-secondary/60 text-muted-foreground'
                          )}
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
                          <span className="truncate max-w-[80px]">
                            {item.assigneeName ? item.assigneeName.split(' ')[0] : 'Assign'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
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

      {/* ── Drawers ───────────────────────────────────────────────────────────── */}

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

      {/* 4. Create Issue Modal */}
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
