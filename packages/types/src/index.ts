import type { Timestamp } from 'firebase/firestore';

// ─── Auth / User ──────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'manager' | 'member';

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
  availabilityStatus?: 'active' | 'focus' | 'away';
  photoURL?: string;
  phoneNumber?: string;
  tourCompleted?: boolean;
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
  industry: string;
  companySize: string;
  ownerId: string;
  billingPlan?: 'free' | 'pro_monthly' | 'pro_annual' | 'credit' | 'enterprise';
  createdAt: Timestamp;
  photoURL?: string;
  domainAutoJoin?: boolean;
  emailDomain?: string;
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
  createdAt: Timestamp;
  expiresAt: Timestamp;
  maxUses: number | null; // e.g. 1 for single-use/email, 5 for shareable, null for unlimited
  useCount: number;
  isActive: boolean;
  role: UserRole;
  email?: string; // present only for direct email invitations
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationCategory = 'inbox' | 'mentions' | 'tasks' | 'requests' | 'system';

export interface Notification {
  id: string;
  orgId: string;
  recipientId: string;
  category: NotificationCategory;
  type: string; // e.g. 'dm', 'mention', 'task_assign', 'task_comment', 'request_pending', 'request_approved', 'request_rejected', 'system'
  urgency: 'low' | 'medium' | 'high';
  actor: {
    id: string;
    name: string;
    avatarUrl?: string;
    initials: string;
  };
  title: string;
  body?: string;
  link: string; // Target URL for navigation (e.g. '/tasks?task=123')
  read: boolean;
  archived: boolean;
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
  teamIds?: string[];
  status: ProjectStatus;
  startDate: Timestamp | null;
  dueDate: Timestamp | null;
  files?: MessageAttachment[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export type GoalStatus = 'active' | 'completed' | 'cancelled';
export type GoalHorizon = 'short_term' | 'long_term';
export type GoalRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

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
  projectId?: string | null;
  files?: MessageAttachment[];

  // Chronology features
  horizon: GoalHorizon;
  recurrence: GoalRecurrence;
  customDays?: number | null;
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
  files?: MessageAttachment[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp | null;
  approved?: boolean;
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
  files?: MessageAttachment[];
  createdAt: Timestamp;
  editedAt?: Timestamp;
}

export interface GoalComment {
  id: string;
  goalId: string;
  orgId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  body: string;
  mentions: string[];
  files?: MessageAttachment[];
  createdAt: Timestamp;
  editedAt?: Timestamp;
}

export interface ProjectComment {
  id: string;
  projectId: string;
  orgId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  body: string;
  mentions: string[];
  files?: MessageAttachment[];
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

export interface MessageAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
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
  files?: MessageAttachment[];
  parentMessageId?: string;
  parentMessage?: {
    id: string;
    senderName: string;
    body: string;
  };
}

export interface DirectMessageThread {
  id: string;
  orgId: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt: Timestamp;
  lastSenderId: string;
}

export interface Canvas {
  id: string;
  orgId: string;
  chatId: string; // channelId or dmId
  title: string;
  content: string;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
  updatedByName: string;
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

// ─── Requests ─────────────────────────────────────────────────────────────────

export type RequestType =
  | 'sick_leave'
  | 'work_from_home'
  | 'time_off'
  | 'equipment'
  | 'expense'
  | 'other';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface OrgRequest {
  id: string;
  orgId: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  approverId: string;
  approverName: string;
  approverUsername: string;
  type: RequestType;
  title: string;
  description: string;
  status: RequestStatus;
  startDate?: string;   // ISO date string e.g. "2024-06-01"
  endDate?: string;
  approverNote?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  sick_leave:     'Sick Leave',
  work_from_home: 'Work From Home',
  time_off:       'Time Off',
  equipment:      'Equipment Request',
  expense:        'Expense Claim',
  other:          'Other',
};

export const REQUEST_TYPE_ICONS: Record<RequestType, string> = {
  sick_leave:     'Stethoscope',
  work_from_home: 'Home',
  time_off:       'Calendar',
  equipment:      'Laptop',
  expense:        'Receipt',
  other:          'ClipboardList',
};

// ─── Billing ──────────────────────────────────────────────────────────────────

export type BillingPlan = 'free' | 'pro_monthly' | 'pro_annual' | 'credit' | 'enterprise';
export type BillingStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';
export type BillingCurrency = 'INR' | 'USD';
export type CreditPackId = 'starter' | 'growth';

/** Stored at organizations/{orgId}/billing (document) */
export interface BillingInfo {
  plan: BillingPlan;
  status: BillingStatus;
  /** Number of seats currently billed (for subscription plans) */
  seats: number;
  currency: BillingCurrency;
  /** For subscription plans: when the next billing cycle starts */
  nextBillingDate?: Timestamp | null;
  /** Razorpay subscription ID (for recurring plans) */
  razorpaySubscriptionId?: string | null;
  /** Credit wallet balance in smallest unit (paise for INR, cents for USD) */
  creditBalance?: number;
  /** When credit balance was last topped up */
  lastTopUpAt?: Timestamp | null;
  /** Whether the annual HR & Accounting bonus has been activated */
  annualBonusActivated?: boolean;
  /** Secret code used to activate the trial, if any */
  trialCodeUsed?: string | null;
  /** Applied promotional coupon code, if any (e.g. Guild99) */
  appliedCoupon?: string | null;
  /** Applied discount percentage, if any (e.g. 99) */
  discountPercent?: number | null;
  updatedAt: Timestamp;
}

/** One entry in organizations/{orgId}/billingTransactions sub-collection */
export interface BillingTransaction {
  id: string;
  orgId: string;
  /** Human-readable label */
  description: string;
  /** Amount in smallest unit (paise / cents) */
  amount: number;
  currency: BillingCurrency;
  type: 'subscription' | 'topup' | 'deduction' | 'refund';
  status: 'success' | 'pending' | 'failed';
  /** Razorpay payment/order ID for traceability */
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  /** Applied promotional coupon code, if any */
  appliedCoupon?: string | null;
  /** Applied discount percentage, if any */
  discountPercent?: number | null;
  createdAt: Timestamp;
}
