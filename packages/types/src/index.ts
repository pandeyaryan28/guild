import type { Timestamp } from 'firebase/firestore';

// ─── Auth / User ──────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'member';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  username: string;
  designation: string;
  employeeId: string;
  age: number;
  organizationId: string;
  role: UserRole;
  createdAt: Timestamp;
  notificationSettings?: {
    dm: boolean;
    mention: boolean;
    taskAssigned: boolean;
    taskCommented: boolean;
    channelInvite: boolean;
  };
  themeId?: ThemeId;
  managerId?: string | null;
  isManager?: boolean;
  focusStatus?: FocusStatus;
}

export interface FocusStatus {
  text: string;
  emoji?: string;
  updatedAt: Timestamp;
}

// ─── Organization ─────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string;
  companySize: string;
  ownerId: string;
  billingPlan?: 'free' | 'premium' | 'enterprise';
  createdAt: Timestamp;
}

export interface OrganizationMember {
  orgId: string;
  userId: string;
  role: UserRole;
  joinedAt: Timestamp;
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  orgId: string;
  name: string;
  description: string;
  managerId: string; // The UID of the manager/team lead
  memberIds: string[]; // List of UIDs of assigned team members
  channelId?: string | null; // Linked team chat channel if any
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export interface OnboardingState {
  uid: string;
  completed: boolean;
  step: number;
  path: 'create' | 'join' | null;
  updatedAt: Timestamp;
}

// ─── Invite ───────────────────────────────────────────────────────────────────

export interface InviteLink {
  token: string;
  orgId: string;
  createdBy: string;
  expiresAt: Timestamp;
  used: boolean;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'mention'
  | 'task_assigned'
  | 'task_commented'
  | 'channel_invite'
  | 'dm_received';

export interface Notification {
  id: string;
  orgId: string;
  recipientId: string;
  type: NotificationType;
  actorId: string;
  actorName: string;
  read: boolean;
  data: {
    taskId?: string;
    taskTitle?: string;
    channelId?: string;
    channelName?: string;
    dmId?: string;
    messagePreview?: string;
    commentPreview?: string;
  };
  createdAt: Timestamp;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface Project {
  id: string;
  orgId: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  status: ProjectStatus;
  startDate: Timestamp | null;
  dueDate: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export type GoalStatus = 'active' | 'completed' | 'cancelled';
export type GoalHorizon = 'short_term' | 'long_term';
export type GoalRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface GoalCycleRecord {
  cycleStart: Timestamp;
  cycleEnd: Timestamp;
  status: 'completed' | 'incomplete';
  completedTasksCount: number;
  totalTasksCount: number;
}

export interface Goal {
  id: string;
  orgId: string;
  title: string;
  description: string;
  ownerId: string;
  status: GoalStatus;
  targetDate: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp | null;

  // Chronology features
  horizon: GoalHorizon;
  recurrence: GoalRecurrence;
  currentCycleStart?: Timestamp | null;
  completedCyclesCount?: number;
  progressRollup?: number;
  cycleHistory?: GoalCycleRecord[];
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  projectId: string;
  orgId: string;
  title: string;
  dueDate: Timestamp | null;
  completed: boolean;
  createdAt: Timestamp;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';
export type ActivityType =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'priority_changed'
  | 'edited'
  | 'commented'
  | 'label_added'
  | 'label_removed'
  | 'due_date_set';

export interface Task {
  id: string;
  orgId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  creatorId: string;
  labelIds: string[];
  dueDate: Timestamp | null;
  orderIndex: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp | null;
  // Execution OS — optional relational fields (backward compatible)
  projectId?: string | null;
  goalId?: string | null;
  parentTaskId?: string | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  orgId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  body: string;
  mentions: string[];
  createdAt: Timestamp;
  editedAt?: Timestamp;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  orgId: string;
  actorId: string;
  actorName: string;
  type: ActivityType;
  payload: Record<string, unknown>;
  createdAt: Timestamp;
}

export interface TaskLabel {
  id: string;
  orgId: string;
  name: string;
  color: string;
  createdAt: Timestamp;
}

export interface ActorInfo {
  uid: string;
  name: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface Channel {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Timestamp;
  memberCount: number;
  lastMessageAt?: Timestamp;
  lastMessagePreview?: string;
  isPrivate?: boolean;
  isRestricted?: boolean;
}

export interface ChannelMember {
  channelId: string;
  userId: string;
  orgId: string;
  joinedAt: Timestamp;
  lastRead?: Timestamp;
}

export interface Message {
  id: string;
  channelId?: string;
  dmId?: string;
  orgId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  body: string;
  mentions: string[];
  createdAt: Timestamp;
  editedAt?: Timestamp;
  deleted?: boolean;
}

export interface DirectMessageThread {
  id: string;
  orgId: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt: Timestamp;
  lastSenderId: string;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export type SearchResultType = 'task' | 'channel' | 'person' | 'message';

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  meta?: string;
  href: string;
  matchedField?: 'title' | 'subtitle';
}

export interface SearchResults {
  tasks: SearchResultItem[];
  channels: SearchResultItem[];
  people: SearchResultItem[];
  messages: SearchResultItem[];
}

// ─── Themes ───────────────────────────────────────────────────────────────────

export type ThemeId =
  | 'midnight'
  | 'purple-haze'
  | 'cobalt'
  | 'slate'
  | 'rose-gold'
  | 'forest'
  | 'light';


export interface AppTheme {
  id: ThemeId;
  name: string;
  description: string;
  swatch: string;
  bgSwatch: string;
  htmlClass: string;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export type ReportDatePreset = '7d' | '30d' | '90d' | 'custom';

export interface ReportFilters {
  datePreset: ReportDatePreset;
  customFrom?: Date | null;
  customTo?: Date | null;
  status: 'all' | TaskStatus;
  priority: 'all' | TaskPriority;
}

export interface KpiMetric {
  label: string;
  value: number | string;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface MemberContribution {
  userId: string;
  name: string;
  assigned: number;
  completed: number;
  overdue: number;
  completionPct: number;
}

export interface MyReportData {
  assigned: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
  goalsTotal: number;
  goalsCompleted: number;
  goalsActive: number;
}

export interface TeamReportData {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalGoals: number;
  completedGoals: number;
  members: MemberContribution[];
}

export interface ProjectReportData {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
  memberIds: string[];
}
