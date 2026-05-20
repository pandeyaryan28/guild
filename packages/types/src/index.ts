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
