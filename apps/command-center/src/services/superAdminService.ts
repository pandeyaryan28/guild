/**
 * @file superAdminService.ts
 * Real-time telemetry and management service for Guild Command Center.
 * Connects directly to real Firestore data across organizations and users.
 */

import type {
  BillingStatus,
  BillingCurrency,
} from '@guild/types';

export type AdminPlanType =
  | 'free'
  | 'starter'
  | 'pro_monthly'
  | 'pro_annual'
  | 'credit'
  | 'enterprise'
  | 'comped';

export interface CustomQuotas {
  maxProjects?: number;
  maxGoals?: number;
  maxTeams?: number;
  maxChannels?: number;
  storageLimitMb?: number;
}

export interface FeatureFlags {
  aiAssistantEnabled?: boolean;
  customDomainEnabled?: boolean;
  advancedAnalyticsEnabled?: boolean;
  auditLogsExportEnabled?: boolean;
  apiAccessEnabled?: boolean;
  prioritySupport?: boolean;
  dedicatedVpc?: boolean;
}

export interface AdminOrganization {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  industry: string;
  companySize: string;
  plan: AdminPlanType;
  billingStatus: BillingStatus;
  seats: number;
  maxSeats: number;
  storageLimitMb: number;
  currency: BillingCurrency;
  creditBalance: number;
  memberCount: number;
  domainAutoJoin: boolean;
  emailDomain: string;
  createdAt: string;
  updatedAt?: string;
  lastActiveAt?: string;
  nextBillingDate?: string | null;
  customOverrides?: {
    customPlanName?: string;
    seatLimitOverride?: number;
    storageOverrideMb?: number;
    compedReason?: string;
    compedBy?: string;
    compedAt?: string;
    expiresAt?: string | null;
    customQuotas?: CustomQuotas;
    featureFlags?: FeatureFlags;
  };
  photoURL?: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  fullName: string;
  username: string;
  designation: string;
  employeeId: string;
  organizationId: string;
  organizationName: string;
  role: 'owner' | 'admin' | 'manager' | 'member';
  status: 'active' | 'invited' | 'suspended' | 'deactivated' | 'banned';
  createdAt: string;
  lastLoginAt?: string;
  authProvider: 'password' | 'google.com' | 'saml' | 'custom';
  isPlatformAdmin?: boolean;
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string;
  photoURL?: string;
}

export interface SuperAdminAuditLog {
  id: string;
  timestamp: string;
  actorUid: string;
  actorEmail: string;
  actorName: string;
  action:
    | 'PLAN_OVERRIDE'
    | 'SEAT_LIMIT_CHANGE'
    | 'QUOTA_OVERRIDE'
    | 'FEATURE_FLAG_TOGGLE'
    | 'ORG_SUSPENDED'
    | 'ORG_REACTIVATED'
    | 'USER_ROLE_CHANGE'
    | 'USER_BAN_STATUS';
  targetType: 'organization' | 'user' | 'subscription' | 'system';
  targetId: string;
  targetName: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  reason: string;
}

export interface BillingTransaction {
  id: string;
  organizationId: string;
  organizationName: string;
  amount: number;
  currency: BillingCurrency;
  type: 'subscription_charge' | 'credit_topup' | 'refund' | 'manual_credit';
  status: 'succeeded' | 'pending' | 'failed';
  plan?: AdminPlanType;
  seats?: number;
  timestamp: string;
  invoiceId?: string;
  gateway?: 'razorpay' | 'stripe' | 'manual';
}

// ── Real Guild Initial State ───────────────────────────────────────────────────

const REAL_INITIAL_ORGS: AdminOrganization[] = [
  {
    id: '167RNZJcBxeMHo1dGUQr',
    name: 'Guild Orbit',
    ownerId: 'fQ6c26dOhcVzhgA5n8jDyaHS5bv2',
    ownerName: 'Aryan Pandey',
    ownerEmail: 'aryan@guildorbit.com',
    industry: 'Technology',
    companySize: '1–10',
    plan: 'pro_annual',
    billingStatus: 'active',
    seats: 5,
    maxSeats: 25,
    storageLimitMb: 51200,
    currency: 'INR',
    creditBalance: 0,
    memberCount: 5,
    domainAutoJoin: true,
    emailDomain: 'guildorbit.com',
    createdAt: '2026-06-14T01:53:25.076Z',
    lastActiveAt: '2026-09-02T12:00:00.000Z',
    customOverrides: {
      customPlanName: 'Guild Orbit Team',
      featureFlags: { aiAssistantEnabled: true, customDomainEnabled: true, advancedAnalyticsEnabled: true, auditLogsExportEnabled: true },
    },
  },
  {
    id: 'vCt1D1UVAXZ9r2C6jbwR',
    name: 'Guild Orbit (Primary)',
    ownerId: 'mD2e3URkzHdNqLrhwPHtRdQrHBn1',
    ownerName: 'Aryan Pandey',
    ownerEmail: 'aaryanpandey28@gmail.com',
    industry: 'Technology',
    companySize: '1–10',
    plan: 'enterprise',
    billingStatus: 'active',
    seats: 1,
    maxSeats: 100,
    storageLimitMb: 102400,
    currency: 'INR',
    creditBalance: 0,
    memberCount: 1,
    domainAutoJoin: false,
    emailDomain: 'gmail.com',
    createdAt: '2026-05-15T12:09:45.239Z',
    lastActiveAt: '2026-09-02T14:30:00.000Z',
    customOverrides: {
      customPlanName: 'Founder Enterprise Tier',
      featureFlags: { aiAssistantEnabled: true, customDomainEnabled: true, advancedAnalyticsEnabled: true, auditLogsExportEnabled: true, prioritySupport: true, dedicatedVpc: true },
    },
  },
  {
    id: 'qBVBLNdba8xwpp65gF8i',
    name: 'Vizitor',
    ownerId: 'gfVUg8TEzLPrlT2Nep4SWqjp4hU2',
    ownerName: 'Gaurav',
    ownerEmail: 'startupkarwaan@gmail.com',
    industry: 'Technology',
    companySize: '1–10',
    plan: 'free',
    billingStatus: 'active',
    seats: 1,
    maxSeats: 5,
    storageLimitMb: 500,
    currency: 'INR',
    creditBalance: 0,
    memberCount: 1,
    domainAutoJoin: false,
    emailDomain: 'gmail.com',
    createdAt: '2026-07-15T13:19:42.733Z',
    lastActiveAt: '2026-08-20T10:15:00.000Z',
  },
  {
    id: 'duWMIXpvbTrrLUaUCjne',
    name: 'Test Team',
    ownerId: 'xTkcdSRUywSO9DlSwOvGDYGyS1s1',
    ownerName: 'Raj Jain',
    ownerEmail: 'rajisded@icloud.com',
    industry: 'Technology',
    companySize: '1–10',
    plan: 'free',
    billingStatus: 'active',
    seats: 1,
    maxSeats: 5,
    storageLimitMb: 500,
    currency: 'INR',
    creditBalance: 0,
    memberCount: 1,
    domainAutoJoin: true,
    emailDomain: 'icloud.com',
    createdAt: '2026-07-12T09:25:46.798Z',
    lastActiveAt: '2026-08-15T16:00:00.000Z',
  },
  {
    id: 'uep6HBb8xtZTHXtkDv1I',
    name: 'Testing Space',
    ownerId: '07n6ufTPVsOMxfWuybvNih1CHZS2',
    ownerName: 'Arun Singh',
    ownerEmail: 'test@guildhq.space',
    industry: 'Other',
    companySize: '1–10',
    plan: 'free',
    billingStatus: 'active',
    seats: 1,
    maxSeats: 5,
    storageLimitMb: 500,
    currency: 'INR',
    creditBalance: 0,
    memberCount: 1,
    domainAutoJoin: false,
    emailDomain: 'guildhq.space',
    createdAt: '2026-05-29T04:20:09.713Z',
    lastActiveAt: '2026-07-01T12:00:00.000Z',
  },
];

const REAL_INITIAL_USERS: AdminUser[] = [
  {
    uid: 'mD2e3URkzHdNqLrhwPHtRdQrHBn1',
    email: 'aaryanpandey28@gmail.com',
    fullName: 'Aryan',
    username: 'pandeyaryan28',
    designation: 'Founder',
    employeeId: 'emp01',
    organizationId: 'vCt1D1UVAXZ9r2C6jbwR',
    organizationName: 'Guild Orbit (Primary)',
    role: 'owner',
    status: 'active',
    createdAt: '2026-05-15T12:10:18.725Z',
    authProvider: 'google.com',
    photoURL: 'https://firebasestorage.googleapis.com/v0/b/guild-app-f6c28.firebasestorage.app/o/profileImages%2FmD2e3URkzHdNqLrhwPHtRdQrHBn1%2Fpf.jpg?alt=media&token=d05f3de3-1cd5-4da8-aa55-91b4f6a82394',
    isPlatformAdmin: true,
  },
  {
    uid: 'usr_aryan_pandey',
    email: 'aryan@guildorbit.com',
    fullName: 'Aryan Pandey',
    username: 'pandeyaryan',
    designation: 'Platform Owner',
    employeeId: 'EMP-001',
    organizationId: '167RNZJcBxeMHo1dGUQr',
    organizationName: 'Guild Orbit',
    role: 'owner',
    status: 'active',
    createdAt: '2026-06-14T01:55:00.000Z',
    authProvider: 'password',
    isPlatformAdmin: true,
  },
  {
    uid: 'gfVUg8TEzLPrlT2Nep4SWqjp4hU2',
    email: 'startupkarwaan@gmail.com',
    fullName: 'Gaurav',
    username: 'gaurav',
    designation: 'Director',
    employeeId: 'test',
    organizationId: 'qBVBLNdba8xwpp65gF8i',
    organizationName: 'Vizitor',
    role: 'owner',
    status: 'active',
    createdAt: '2026-07-15T13:19:42.733Z',
    authProvider: 'google.com',
  },
  {
    uid: 'xTkcdSRUywSO9DlSwOvGDYGyS1s1',
    email: 'rajisded@icloud.com',
    fullName: 'Raj Jain',
    username: 'rajisded',
    designation: 'Employee',
    employeeId: 'HJA929',
    organizationId: 'duWMIXpvbTrrLUaUCjne',
    organizationName: 'Test Team',
    role: 'owner',
    status: 'active',
    createdAt: '2026-07-12T09:25:46.798Z',
    authProvider: 'password',
  },
  {
    uid: 'usr_arun_singh',
    email: 'test@guildhq.space',
    fullName: 'Arun Singh',
    username: 'arun',
    designation: 'Member',
    employeeId: 'EMP-005',
    organizationId: 'uep6HBb8xtZTHXtkDv1I',
    organizationName: 'Testing Space',
    role: 'owner',
    status: 'active',
    createdAt: '2026-05-29T04:20:09.713Z',
    authProvider: 'password',
  },
  {
    uid: 'usr_devloper',
    email: 'beingaryanpandey@gmail.com',
    fullName: 'Devloper',
    username: 'dev',
    designation: 'Software Engineer',
    employeeId: 'EMP-002',
    organizationId: '167RNZJcBxeMHo1dGUQr',
    organizationName: 'Guild Orbit',
    role: 'member',
    status: 'active',
    createdAt: '2026-06-20T10:00:00.000Z',
    authProvider: 'google.com',
  },
  {
    uid: 'usr_cto',
    email: 'cto@guildorbit.com',
    fullName: 'CTO',
    username: 'cto',
    designation: 'Chief Technology Officer',
    employeeId: 'EMP-003',
    organizationId: '167RNZJcBxeMHo1dGUQr',
    organizationName: 'Guild Orbit',
    role: 'member',
    status: 'active',
    createdAt: '2026-06-25T14:30:00.000Z',
    authProvider: 'password',
  },
  {
    uid: 'vu0XZOPPYBfksRZuhS0RlE9Zhe93',
    email: 'career@guildorbit.com',
    fullName: 'Career',
    username: 'career',
    designation: 'HR',
    employeeId: 'EMP-004',
    organizationId: '167RNZJcBxeMHo1dGUQr',
    organizationName: 'Guild Orbit',
    role: 'member',
    status: 'active',
    createdAt: '2026-06-30T15:03:34.438Z',
    authProvider: 'password',
  },
  {
    uid: 'usr_hello',
    email: 'hello@guildorbit.com',
    fullName: 'Hello',
    username: 'hello',
    designation: 'Team Member',
    employeeId: 'EMP-006',
    organizationId: '167RNZJcBxeMHo1dGUQr',
    organizationName: 'Guild Orbit',
    role: 'member',
    status: 'active',
    createdAt: '2026-07-01T09:00:00.000Z',
    authProvider: 'password',
  },
];

// ── SuperAdminDataService Class ───────────────────────────────────────────────

export class SuperAdminDataService {
  private static instance: SuperAdminDataService;

  private orgs: AdminOrganization[] = [...REAL_INITIAL_ORGS];
  private users: AdminUser[] = [...REAL_INITIAL_USERS];
  private auditLogs: SuperAdminAuditLog[] = [];
  private transactions: BillingTransaction[] = [];

  private orgListeners: Set<(orgs: AdminOrganization[]) => void> = new Set();
  private userListeners: Set<(users: AdminUser[]) => void> = new Set();
  private auditListeners: Set<(logs: SuperAdminAuditLog[]) => void> = new Set();
  private txListeners: Set<(txs: BillingTransaction[]) => void> = new Set();

  private isPolling = false;

  public static getInstance(): SuperAdminDataService {
    if (!SuperAdminDataService.instance) {
      SuperAdminDataService.instance = new SuperAdminDataService();
      SuperAdminDataService.instance.startDataSync();
    }
    return SuperAdminDataService.instance;
  }

  private async fetchLiveFirestoreData() {
    try {
      const res = await fetch('/api/command-center/data');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.organizations) && data.organizations.length > 0) {
          this.orgs = data.organizations;
          this.notifyOrgListeners();
        }
        if (data.success && Array.isArray(data.users) && data.users.length > 0) {
          this.users = data.users;
          this.notifyUserListeners();
        }
        if (data.success && Array.isArray(data.auditLogs)) {
          this.auditLogs = data.auditLogs;
          this.notifyAuditListeners();
        }
      }
    } catch (err) {
      console.warn('[superAdminService] Live sync fetch error:', err);
    }
  }

  private startDataSync() {
    if (this.isPolling) return;
    this.isPolling = true;
    this.fetchLiveFirestoreData();

    if (typeof window !== 'undefined') {
      window.setInterval(() => {
        this.fetchLiveFirestoreData();
      }, 15000);
    }
  }

  public async refresh(): Promise<void> {
    await this.fetchLiveFirestoreData();
  }

  public async getAllOrganizations(): Promise<AdminOrganization[]> {
    return [...this.orgs];
  }

  public async getAllUsers(): Promise<AdminUser[]> {
    return [...this.users];
  }

  public async getAuditLogs(limitCount: number = 20): Promise<SuperAdminAuditLog[]> {
    return this.auditLogs.slice(0, limitCount);
  }

  public async getTransactions(limitCount: number = 20): Promise<BillingTransaction[]> {
    return this.transactions.slice(0, limitCount);
  }

  public subscribeToOrganizations(callback: (orgs: AdminOrganization[]) => void): () => void {
    this.orgListeners.add(callback);
    callback([...this.orgs]);
    return () => this.orgListeners.delete(callback);
  }

  public subscribeToUsers(callback: (users: AdminUser[]) => void): () => void {
    this.userListeners.add(callback);
    callback([...this.users]);
    return () => this.userListeners.delete(callback);
  }

  public subscribeToAuditLogs(callback: (logs: SuperAdminAuditLog[]) => void): () => void {
    this.auditListeners.add(callback);
    callback([...this.auditLogs]);
    return () => this.auditListeners.delete(callback);
  }

  public subscribeToTransactions(callback: (txs: BillingTransaction[]) => void): () => void {
    this.txListeners.add(callback);
    callback([...this.transactions]);
    return () => this.txListeners.delete(callback);
  }

  private notifyOrgListeners() {
    const copy = [...this.orgs];
    this.orgListeners.forEach((cb) => cb(copy));
  }

  private notifyUserListeners() {
    const copy = [...this.users];
    this.userListeners.forEach((cb) => cb(copy));
  }

  private notifyAuditListeners() {
    const copy = [...this.auditLogs];
    this.auditListeners.forEach((cb) => cb(copy));
  }

  private notifyTxListeners() {
    const copy = [...this.transactions];
    this.txListeners.forEach((cb) => cb(copy));
  }

  public async overrideWorkspacePlan(
    orgId: string,
    newPlan: AdminPlanType,
    overridesOrStatus?:
      | BillingStatus
      | {
          seats?: number;
          maxSeats?: number;
          storageLimitMb?: number;
          billingStatus?: BillingStatus;
          customQuotas?: CustomQuotas;
          featureFlags?: FeatureFlags;
          reason: string;
          actorEmail?: string;
        },
    seatsParam?: number,
    reasonParam?: string,
    actorEmailParam?: string
  ): Promise<void> {
    const orgIndex = this.orgs.findIndex((o) => o.id === orgId);
    if (orgIndex === -1) throw new Error(`Organization ${orgId} not found`);

    const prevOrg = this.orgs[orgIndex];

    let billingStatus: BillingStatus = prevOrg.billingStatus;
    let seats: number = prevOrg.seats;
    let maxSeats: number = prevOrg.maxSeats;
    let storageLimitMb: number = prevOrg.storageLimitMb;
    let reason = 'Manual platform plan modification';
    let actorEmail = 'pandeyaryan28@gmail.com';
    let customQuotas = prevOrg.customOverrides?.customQuotas;
    let featureFlags = prevOrg.customOverrides?.featureFlags;

    if (typeof overridesOrStatus === 'object' && overridesOrStatus !== null) {
      if (overridesOrStatus.billingStatus) billingStatus = overridesOrStatus.billingStatus;
      if (overridesOrStatus.seats !== undefined) seats = overridesOrStatus.seats;
      if (overridesOrStatus.maxSeats !== undefined) maxSeats = overridesOrStatus.maxSeats;
      if (overridesOrStatus.storageLimitMb !== undefined) storageLimitMb = overridesOrStatus.storageLimitMb;
      if (overridesOrStatus.reason) reason = overridesOrStatus.reason;
      if (overridesOrStatus.actorEmail) actorEmail = overridesOrStatus.actorEmail;
      if (overridesOrStatus.customQuotas) customQuotas = overridesOrStatus.customQuotas;
      if (overridesOrStatus.featureFlags) featureFlags = overridesOrStatus.featureFlags;
    } else {
      if (overridesOrStatus) billingStatus = overridesOrStatus as BillingStatus;
      if (seatsParam !== undefined) {
        seats = seatsParam;
        maxSeats = seatsParam;
      }
      if (reasonParam) reason = reasonParam;
      if (actorEmailParam) actorEmail = actorEmailParam;
    }

    const updatedOrg: AdminOrganization = {
      ...prevOrg,
      plan: newPlan,
      billingStatus,
      seats,
      maxSeats,
      storageLimitMb,
      customOverrides: {
        ...prevOrg.customOverrides,
        customQuotas,
        featureFlags,
        compedAt: newPlan === 'comped' ? new Date().toISOString() : prevOrg.customOverrides?.compedAt,
        compedBy: newPlan === 'comped' ? actorEmail : prevOrg.customOverrides?.compedBy,
        compedReason: newPlan === 'comped' ? reason : prevOrg.customOverrides?.compedReason,
      },
      updatedAt: new Date().toISOString(),
    };

    this.orgs[orgIndex] = updatedOrg;
    this.notifyOrgListeners();

    const auditEntry: SuperAdminAuditLog = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorUid: 'usr_superadmin',
      actorEmail,
      actorName: 'Aryan Pandey (Platform SuperAdmin)',
      action: 'PLAN_OVERRIDE',
      targetType: 'organization',
      targetId: orgId,
      targetName: prevOrg.name,
      previousState: { plan: prevOrg.plan, maxSeats: prevOrg.maxSeats },
      newState: { plan: newPlan, maxSeats: updatedOrg.maxSeats },
      reason,
    };

    this.auditLogs.unshift(auditEntry);
    this.notifyAuditListeners();

    try {
      await fetch('/api/command-center/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          plan: newPlan,
          billingStatus: updatedOrg.billingStatus,
          seats: updatedOrg.seats,
          maxSeats: updatedOrg.maxSeats,
          storageLimitMb: updatedOrg.storageLimitMb,
          customOverrides: updatedOrg.customOverrides,
          reason,
          adminEmail: actorEmail,
        }),
      });
    } catch (err) {
      console.warn('[superAdminService] Failed to persist subscription to Firestore API:', err);
    }
  }

  public async updateCustomQuotas(
    orgId: string,
    quotas: CustomQuotas,
    flagsOrReason?: FeatureFlags | string,
    reasonParam?: string,
    actorEmailParam?: string
  ): Promise<void> {
    const orgIndex = this.orgs.findIndex((o) => o.id === orgId);
    if (orgIndex === -1) throw new Error(`Organization ${orgId} not found`);

    const prevOrg = this.orgs[orgIndex];
    let flags: FeatureFlags | undefined = undefined;
    let reason = 'Custom quota modification';
    let actorEmail = 'pandeyaryan28@gmail.com';

    if (typeof flagsOrReason === 'object' && flagsOrReason !== null) {
      flags = flagsOrReason;
      if (reasonParam) reason = reasonParam;
      if (actorEmailParam) actorEmail = actorEmailParam;
    } else if (typeof flagsOrReason === 'string') {
      reason = flagsOrReason;
      if (reasonParam) actorEmail = reasonParam;
    }

    this.orgs[orgIndex] = {
      ...prevOrg,
      storageLimitMb: quotas.storageLimitMb ?? prevOrg.storageLimitMb,
      customOverrides: {
        ...prevOrg.customOverrides,
        customQuotas: {
          ...prevOrg.customOverrides?.customQuotas,
          ...quotas,
        },
        featureFlags: flags || prevOrg.customOverrides?.featureFlags,
      },
      updatedAt: new Date().toISOString(),
    };
    this.notifyOrgListeners();

    const auditEntry: SuperAdminAuditLog = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorUid: 'usr_superadmin',
      actorEmail,
      actorName: 'Aryan Pandey (Platform SuperAdmin)',
      action: 'QUOTA_OVERRIDE',
      targetType: 'organization',
      targetId: orgId,
      targetName: prevOrg.name,
      reason,
    };
    this.auditLogs.unshift(auditEntry);
    this.notifyAuditListeners();
  }

  public async setUserBanStatus(
    uid: string,
    isBanned: boolean,
    reason: string,
    actorEmail?: string
  ): Promise<void> {
    const userIndex = this.users.findIndex((u) => u.uid === uid);
    if (userIndex === -1) throw new Error(`User ${uid} not found`);

    const prevUser = this.users[userIndex];
    this.users[userIndex] = {
      ...prevUser,
      isBanned,
      status: isBanned ? 'banned' : 'active',
      banReason: isBanned ? reason : undefined,
      bannedAt: isBanned ? new Date().toISOString() : undefined,
      bannedBy: isBanned ? (actorEmail || 'Platform SuperAdmin') : undefined,
    };
    this.notifyUserListeners();

    const auditEntry: SuperAdminAuditLog = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorUid: 'usr_superadmin',
      actorEmail: actorEmail || 'pandeyaryan28@gmail.com',
      actorName: 'Aryan Pandey (Platform SuperAdmin)',
      action: 'USER_BAN_STATUS',
      targetType: 'user',
      targetId: uid,
      targetName: prevUser.fullName || prevUser.email,
      previousState: { isBanned: prevUser.isBanned, status: prevUser.status },
      newState: { isBanned, status: isBanned ? 'banned' : 'active' },
      reason,
    };

    this.auditLogs.unshift(auditEntry);
    this.notifyAuditListeners();
  }
}

export const superAdminService = SuperAdminDataService.getInstance();
