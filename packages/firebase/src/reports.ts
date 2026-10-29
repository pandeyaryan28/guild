import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Task,
  Goal,
  TaskActivity,
  UserProfile,
  ReportFilters,
  MyReportData,
  TeamReportData,
  ProjectReportData,
  MemberContribution,
} from '@guild/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(filters: ReportFilters): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  if (filters.datePreset === '7d') from.setDate(from.getDate() - 7);
  else if (filters.datePreset === '30d') from.setDate(from.getDate() - 30);
  else if (filters.datePreset === '90d') from.setDate(from.getDate() - 90);
  else {
    return {
      from: filters.customFrom ?? new Date(0),
      to: filters.customTo ?? to,
    };
  }
  return { from, to };
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  try {
    const due = typeof (task.dueDate as any)?.toDate === 'function'
      ? (task.dueDate as any).toDate()
      : new Date(task.dueDate as any);
    return due < new Date();
  } catch {
    return false;
  }
}

function taskInWindow(task: Task, from: Date, to: Date): boolean {
  // A task is in the window if it was created or updated within the range
  const updated = (task.updatedAt as Timestamp | undefined)?.toDate?.() ?? new Date(0);
  const created = (task.createdAt as Timestamp | undefined)?.toDate?.() ?? new Date(0);
  return (updated >= from && updated <= to) || (created >= from && created <= to);
}

function applyFilters(tasks: Task[], filters: ReportFilters, from: Date, to: Date): Task[] {
  return tasks.filter((t) => {
    if (filters.status !== 'all' && t.status !== filters.status) return false;
    if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
    if (!taskInWindow(t, from, to)) return false;
    return true;
  });
}

// ─── My Report ────────────────────────────────────────────────────────────────

export async function getMyReport(
  orgId: string,
  userId: string,
  filters: ReportFilters,
): Promise<MyReportData> {
  const { from, to } = getDateRange(filters);

  // Fetch tasks assigned to user
  const tasksSnap = await getDocs(
    query(
      collection(db, 'tasks'),
      where('orgId', '==', orgId),
      where('assigneeIds', 'array-contains', userId),
    ),
  );
  const allTasks = tasksSnap.docs.map((d) => d.data() as Task);
  const tasks = applyFilters(allTasks, filters, from, to);

  const completed = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const overdue = allTasks.filter(isOverdue).length; // overdue counts from all assigned tasks
  const assigned = tasks.length;
  const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

  // Fetch goals owned by user
  const goalsSnap = await getDocs(
    query(
      collection(db, 'goals'),
      where('orgId', '==', orgId),
      where('ownerId', '==', userId),
    ),
  );
  const goals = goalsSnap.docs.map((d) => d.data() as Goal);
  const goalsTotal = goals.length;
  const goalsCompleted = goals.filter((g) => g.status === 'completed').length;
  const goalsActive = goals.filter((g) => g.status === 'active').length;

  return { assigned, completed, inProgress, overdue, completionRate, goalsTotal, goalsCompleted, goalsActive };
}

// ─── Team Report (manager only) ───────────────────────────────────────────────

export async function getManagerTeamReport(
  orgId: string,
  managerId: string,
  filters: ReportFilters,
  memberProfiles: UserProfile[],
): Promise<TeamReportData> {
  const { from, to } = getDateRange(filters);

  const memberIds = memberProfiles.map((m) => m.uid);

  // Fetch all org tasks then filter to those assigned to team members
  const tasksSnap = await getDocs(
    query(
      collection(db, 'tasks'),
      where('orgId', '==', orgId),
    ),
  );
  const allOrgTasks = tasksSnap.docs.map((d) => d.data() as Task);

  // Tasks where at least one assignee is a team member
  const teamTasks = allOrgTasks.filter(
    (t) => t.assigneeIds.some((id) => memberIds.includes(id)),
  );
  const windowedTasks = applyFilters(teamTasks, filters, from, to);

  const completedTasks = windowedTasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = windowedTasks.filter((t) => t.status === 'in_progress').length;
  const overdueTasks = teamTasks.filter(isOverdue).length;

  // Goals owned by team members
  const goalsSnap = await getDocs(
    query(
      collection(db, 'goals'),
      where('orgId', '==', orgId),
    ),
  );
  const allGoals = goalsSnap.docs.map((d) => d.data() as Goal);
  const teamGoals = allGoals.filter((g) => memberIds.includes(g.ownerId));
  const completedGoals = teamGoals.filter((g) => g.status === 'completed').length;

  // Per-member contribution
  const members: MemberContribution[] = memberProfiles.map((member) => {
    const memberTasks = allOrgTasks.filter((t) => t.assigneeIds.includes(member.uid));
    const memberWindowed = applyFilters(memberTasks, filters, from, to);
    const mCompleted = memberWindowed.filter((t) => t.status === 'done').length;
    const mAssigned = memberWindowed.length;
    const mOverdue = memberTasks.filter(isOverdue).length;
    const completionPct = mAssigned > 0 ? Math.round((mCompleted / mAssigned) * 100) : 0;
    return {
      userId: member.uid,
      name: member.fullName || member.username,
      assigned: mAssigned,
      completed: mCompleted,
      overdue: mOverdue,
      completionPct,
    };
  });

  return {
    totalTasks: windowedTasks.length,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    totalGoals: teamGoals.length,
    completedGoals,
    members,
  };
}

// ─── Project Report ───────────────────────────────────────────────────────────

export async function getProjectReport(
  orgId: string,
  projectId: string,
  filters: ReportFilters,
): Promise<ProjectReportData> {
  const { from, to } = getDateRange(filters);

  const tasksSnap = await getDocs(
    query(
      collection(db, 'tasks'),
      where('orgId', '==', orgId),
      where('projectId', '==', projectId),
    ),
  );
  const allTasks = tasksSnap.docs.map((d) => d.data() as Task);
  const tasks = applyFilters(allTasks, filters, from, to);

  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const overdueTasks = allTasks.filter(isOverdue).length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const memberIdSet = new Set<string>();
  allTasks.forEach((t) => t.assigneeIds.forEach((id) => memberIdSet.add(id)));

  return {
    totalTasks: tasks.length,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    completionRate,
    memberIds: Array.from(memberIdSet),
  };
}

// ─── Recent Activity ──────────────────────────────────────────────────────────

export interface RecentActivityItem {
  id: string;
  taskId: string;
  actorId: string;
  actorName: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: Timestamp;
}

export async function getRecentActivity(
  orgId: string,
  scope: 'user' | 'team' | 'project',
  scopeId: string, // userId, teamId (unused for team — use memberIds), or projectId
  memberIds?: string[],
  limit?: number,
): Promise<RecentActivityItem[]> {
  const maxResults = limit ?? 20;
  let items: RecentActivityItem[] = [];

  if (scope === 'user') {
    const snap = await getDocs(
      query(
        collection(db, 'taskActivities'),
        where('orgId', '==', orgId),
        where('actorId', '==', scopeId),
        orderBy('createdAt', 'desc'),
      ),
    );
    items = snap.docs.map((d) => d.data() as RecentActivityItem).slice(0, maxResults);
  } else if (scope === 'project') {
    // Get task IDs in project first, then fetch their activities
    const tasksSnap = await getDocs(
      query(
        collection(db, 'tasks'),
        where('orgId', '==', orgId),
        where('projectId', '==', scopeId),
      ),
    );
    const taskIds = tasksSnap.docs.map((d) => d.id);
    if (taskIds.length === 0) return [];
    // Firestore 'in' supports up to 30 values — chunk if needed
    const chunks: string[][] = [];
    for (let i = 0; i < taskIds.length; i += 30) chunks.push(taskIds.slice(i, i + 30));
    const allActivities: RecentActivityItem[] = [];
    await Promise.all(
      chunks.map(async (chunk) => {
        const snap = await getDocs(
          query(
            collection(db, 'taskActivities'),
            where('orgId', '==', orgId),
            where('taskId', 'in', chunk),
            orderBy('createdAt', 'desc'),
          ),
        );
        snap.docs.forEach((d) => allActivities.push(d.data() as RecentActivityItem));
      }),
    );
    allActivities.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    items = allActivities.slice(0, maxResults);
  } else if (scope === 'team' && memberIds && memberIds.length > 0) {
    // Fetch activities per member actor (chunked for 'in' limit)
    const chunks: string[][] = [];
    for (let i = 0; i < memberIds.length; i += 30) chunks.push(memberIds.slice(i, i + 30));
    const allActivities: RecentActivityItem[] = [];
    await Promise.all(
      chunks.map(async (chunk) => {
        const snap = await getDocs(
          query(
            collection(db, 'taskActivities'),
            where('orgId', '==', orgId),
            where('actorId', 'in', chunk),
            orderBy('createdAt', 'desc'),
          ),
        );
        snap.docs.forEach((d) => allActivities.push(d.data() as RecentActivityItem));
      }),
    );
    allActivities.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    items = allActivities.slice(0, maxResults);
  }

  return items;
}

export type { ReportFilters, MyReportData, TeamReportData, ProjectReportData, MemberContribution };
