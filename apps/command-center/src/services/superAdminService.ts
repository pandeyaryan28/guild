/**
 * @file superAdminService.ts
 * Real-time telemetry and management service for Guild Command Center.
 * Connects directly to real Firestore data across organizations and users.
 */

import type {
  BillingStatus,
  BillingCurrency,
  BillingPlan,
} from '@guild/types';

export type AdminPlanType = BillingPlan | 'starter' | 'comped';

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
  annualBonusActivated?: boolean;
  appliedCoupon?: string | null;
  discountPercent?: number | null;
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
  type: 'subscription' | 'topup' | 'deduction' | 'refund';
  status: 'success' | 'pending' | 'failed';
  plan?: AdminPlanType;
  seats?: number;
  timestamp: string;
  invoiceId?: string;
  description?: string;
  appliedCoupon?: string | null;
  discountPercent?: number | null;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
}

export type DemoRequestStatus = 'pending' | 'contacted' | 'scheduled' | 'completed' | 'archived';
export type DemoRequestPriority = 'low' | 'medium' | 'high';

export interface AdminDemoRequest {
  id: string;
  name: string;
  email: string;
  company?: string;
  teamSize?: string;
  message?: string;
  source: 'demo_page' | 'contact_page' | 'website' | 'command_center';
  formType?: 'demo' | 'inquiry';
  status: DemoRequestStatus;
  priority: DemoRequestPriority;
  notes?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
}

// ── SuperAdminDataService Class ───────────────────────────────────────────────

export class SuperAdminDataService {
  private static instance: SuperAdminDataService;

  private orgs: AdminOrganization[] = [];
  private users: AdminUser[] = [];
  private auditLogs: SuperAdminAuditLog[] = [];
  private transactions: BillingTransaction[] = [];
  private demoRequests: AdminDemoRequest[] = [];

  private isInitialLoading = true;
  private isPolling = false;
  private isSyncing = false;
  private lastSyncedAt: Date = new Date();

  private orgListeners: Set<(orgs: AdminOrganization[]) => void> = new Set();
  private userListeners: Set<(users: AdminUser[]) => void> = new Set();
  private auditListeners: Set<(logs: SuperAdminAuditLog[]) => void> = new Set();
  private txListeners: Set<(txs: BillingTransaction[]) => void> = new Set();
  private demoListeners: Set<(demos: AdminDemoRequest[]) => void> = new Set();
  private syncListeners: Set<(state: { isSyncing: boolean; lastSyncedAt: Date }) => void> = new Set();

  public static getInstance(): SuperAdminDataService {
    if (!SuperAdminDataService.instance) {
      SuperAdminDataService.instance = new SuperAdminDataService();
      SuperAdminDataService.instance.startDataSync();
    }
    return SuperAdminDataService.instance;
  }

  public getIsLoading(): boolean {
    return this.isInitialLoading;
  }

  public getLastSyncedAt(): Date {
    return this.lastSyncedAt;
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  private async fetchLiveFirestoreData() {
    this.isSyncing = true;
    this.notifySyncListeners();
    try {
      const res = await fetch('/api/command-center/data');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.organizations)) {
            this.orgs = data.organizations;
            this.notifyOrgListeners();
          }
          if (Array.isArray(data.users)) {
            this.users = data.users;
            this.notifyUserListeners();
          }
          if (Array.isArray(data.auditLogs)) {
            this.auditLogs = data.auditLogs;
            this.notifyAuditListeners();
          }
          if (Array.isArray(data.transactions)) {
            this.transactions = data.transactions;
            this.notifyTxListeners();
          }
          if (Array.isArray(data.demoRequests)) {
            this.demoRequests = data.demoRequests;
            this.notifyDemoListeners();
          }
          this.isInitialLoading = false;
          this.lastSyncedAt = new Date();
        }
      }
    } catch (err) {
      console.warn('[superAdminService] Live sync fetch error:', err);
    } finally {
      this.isSyncing = false;
      this.notifySyncListeners();
    }
  }

  private startDataSync() {
    if (this.isPolling) return;
    this.isPolling = true;
    this.fetchLiveFirestoreData();

    if (typeof window !== 'undefined') {
      // Periodic background polling every 4 seconds for live telemetry
      window.setInterval(() => {
        this.fetchLiveFirestoreData();
      }, 4000);

      // Instant refresh on tab focus / visibility return
      window.addEventListener('focus', () => {
        this.fetchLiveFirestoreData();
      });

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            this.fetchLiveFirestoreData();
          }
        });
      }
    }
  }

  public async refresh(): Promise<void> {
    await this.fetchLiveFirestoreData();
  }

  public async getAllOrganizations(): Promise<AdminOrganization[]> {
    if (this.orgs.length === 0) {
      await this.fetchLiveFirestoreData();
    }
    return [...this.orgs];
  }

  public async getAllUsers(): Promise<AdminUser[]> {
    if (this.users.length === 0) {
      await this.fetchLiveFirestoreData();
    }
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

  public subscribeToDemoRequests(callback: (demos: AdminDemoRequest[]) => void): () => void {
    this.demoListeners.add(callback);
    callback([...this.demoRequests]);
    return () => this.demoListeners.delete(callback);
  }

  public subscribeToSyncStatus(callback: (state: { isSyncing: boolean; lastSyncedAt: Date }) => void): () => void {
    this.syncListeners.add(callback);
    callback({ isSyncing: this.isSyncing, lastSyncedAt: this.lastSyncedAt });
    return () => this.syncListeners.delete(callback);
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

  private notifyDemoListeners() {
    const copy = [...this.demoRequests];
    this.demoListeners.forEach((cb) => cb(copy));
  }

  private notifySyncListeners() {
    const state = { isSyncing: this.isSyncing, lastSyncedAt: this.lastSyncedAt };
    this.syncListeners.forEach((cb) => cb(state));
  }

  public async getAllDemoRequests(): Promise<AdminDemoRequest[]> {
    if (this.demoRequests.length === 0) {
      await this.fetchLiveFirestoreData();
    }
    return [...this.demoRequests];
  }

  public async updateDemoRequestStatus(
    id: string,
    status: DemoRequestStatus,
    notes?: string,
    priority?: DemoRequestPriority,
    assignedTo?: string,
    actorEmail: string = 'pandeyaryan28@gmail.com'
  ): Promise<void> {
    const idx = this.demoRequests.findIndex((d) => d.id === id);
    const prev = idx !== -1 ? this.demoRequests[idx] : null;

    if (idx !== -1 && prev) {
      this.demoRequests[idx] = {
        ...prev,
        status,
        ...(notes !== undefined ? { notes } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(assignedTo !== undefined ? { assignedTo } : {}),
        updatedAt: new Date().toISOString(),
      };
      this.notifyDemoListeners();
    }

    try {
      await fetch('/api/command-center/demo-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          notes,
          priority,
          assignedTo,
          adminEmail: actorEmail,
          leadName: prev?.name,
        }),
      });
      await this.refresh();
    } catch (err) {
      console.error('[superAdminService] Failed to update demo request:', err);
    }
  }

  public async deleteDemoRequest(id: string, actorEmail: string = 'pandeyaryan28@gmail.com'): Promise<void> {
    this.demoRequests = this.demoRequests.filter((d) => d.id !== id);
    this.notifyDemoListeners();

    try {
      await fetch('/api/command-center/demo-request', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, adminEmail: actorEmail }),
      });
      await this.refresh();
    } catch (err) {
      console.error('[superAdminService] Failed to delete demo request:', err);
    }
  }

  public async createDemoRequest(data: {
    name: string;
    email: string;
    company?: string;
    teamSize?: string;
    message?: string;
    priority?: DemoRequestPriority;
    actorEmail?: string;
  }): Promise<void> {
    try {
      await fetch('/api/command-center/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await this.refresh();
    } catch (err) {
      console.error('[superAdminService] Failed to create demo request:', err);
    }
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
          creditBalance?: number;
          billingStatus?: BillingStatus;
          customQuotas?: CustomQuotas;
          featureFlags?: FeatureFlags;
          compedReason?: string;
          reason: string;
          actorEmail?: string;
        },
    seatsParam?: number,
    reasonParam?: string,
    actorEmailParam?: string
  ): Promise<void> {
    const orgIndex = this.orgs.findIndex((o) => o.id === orgId);
    const prevOrg = orgIndex !== -1 ? this.orgs[orgIndex] : null;

    let billingStatus: BillingStatus = prevOrg?.billingStatus || 'active';
    let seats: number = prevOrg?.seats || 5;
    let maxSeats: number = prevOrg?.maxSeats || 5;
    let storageLimitMb: number = prevOrg?.storageLimitMb || 500;
    let creditBalance: number | undefined = prevOrg?.creditBalance;
    let reason = 'Manual platform plan modification';
    let actorEmail = 'pandeyaryan28@gmail.com';
    let customQuotas = prevOrg?.customOverrides?.customQuotas;
    let featureFlags = prevOrg?.customOverrides?.featureFlags;
    let compedReason = prevOrg?.customOverrides?.compedReason;

    if (typeof overridesOrStatus === 'object' && overridesOrStatus !== null) {
      if (overridesOrStatus.billingStatus) billingStatus = overridesOrStatus.billingStatus;
      if (overridesOrStatus.seats !== undefined) seats = overridesOrStatus.seats;
      if (overridesOrStatus.maxSeats !== undefined) maxSeats = overridesOrStatus.maxSeats;
      if (overridesOrStatus.storageLimitMb !== undefined) storageLimitMb = overridesOrStatus.storageLimitMb;
      if (overridesOrStatus.creditBalance !== undefined) creditBalance = overridesOrStatus.creditBalance;
      if (overridesOrStatus.reason) reason = overridesOrStatus.reason;
      if (overridesOrStatus.actorEmail) actorEmail = overridesOrStatus.actorEmail;
      if (overridesOrStatus.customQuotas) customQuotas = overridesOrStatus.customQuotas;
      if (overridesOrStatus.featureFlags) featureFlags = overridesOrStatus.featureFlags;
      if (overridesOrStatus.compedReason !== undefined) compedReason = overridesOrStatus.compedReason;
    } else {
      if (overridesOrStatus) billingStatus = overridesOrStatus as BillingStatus;
      if (seatsParam !== undefined) {
        seats = seatsParam;
        maxSeats = seatsParam;
      }
      if (reasonParam) reason = reasonParam;
      if (actorEmailParam) actorEmail = actorEmailParam;
    }

    const updatedCustomOverrides = {
      ...prevOrg?.customOverrides,
      customQuotas,
      featureFlags,
      compedReason,
      compedBy: compedReason ? actorEmail : undefined,
      compedAt: compedReason ? (prevOrg?.customOverrides?.compedAt || new Date().toISOString()) : undefined,
    };

    if (orgIndex !== -1 && prevOrg) {
      const updatedOrg: AdminOrganization = {
        ...prevOrg,
        plan: newPlan,
        billingStatus,
        seats,
        maxSeats,
        storageLimitMb,
        creditBalance: creditBalance !== undefined ? creditBalance : prevOrg.creditBalance,
        customOverrides: updatedCustomOverrides,
        updatedAt: new Date().toISOString(),
      };
      this.orgs[orgIndex] = updatedOrg;
      this.notifyOrgListeners();
    }

    const auditEntry: SuperAdminAuditLog = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorUid: 'usr_superadmin',
      actorEmail,
      actorName: 'Aryan Pandey (Platform SuperAdmin)',
      action: 'PLAN_OVERRIDE',
      targetType: 'organization',
      targetId: orgId,
      targetName: prevOrg?.name || orgId,
      previousState: { plan: prevOrg?.plan, maxSeats: prevOrg?.maxSeats, billingStatus: prevOrg?.billingStatus },
      newState: { plan: newPlan, maxSeats, billingStatus, storageLimitMb, compedReason },
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
          organizationName: prevOrg?.name,
          plan: newPlan,
          billingStatus,
          seats,
          maxSeats,
          storageLimitMb,
          creditBalance,
          customOverrides: updatedCustomOverrides,
          reason,
          adminEmail: actorEmail,
          previousState: auditEntry.previousState,
        }),
      });
      await this.refresh();
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
    const prevOrg = orgIndex !== -1 ? this.orgs[orgIndex] : null;
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

    const updatedCustomOverrides = {
      ...prevOrg?.customOverrides,
      customQuotas: {
        ...prevOrg?.customOverrides?.customQuotas,
        ...quotas,
      },
      featureFlags: flags || prevOrg?.customOverrides?.featureFlags,
    };

    if (orgIndex !== -1 && prevOrg) {
      this.orgs[orgIndex] = {
        ...prevOrg,
        storageLimitMb: quotas.storageLimitMb ?? prevOrg.storageLimitMb,
        customOverrides: updatedCustomOverrides,
        updatedAt: new Date().toISOString(),
      };
      this.notifyOrgListeners();
    }

    const auditEntry: SuperAdminAuditLog = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorUid: 'usr_superadmin',
      actorEmail,
      actorName: 'Aryan Pandey (Platform SuperAdmin)',
      action: 'QUOTA_OVERRIDE',
      targetType: 'organization',
      targetId: orgId,
      targetName: prevOrg?.name || orgId,
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
          organizationName: prevOrg?.name,
          storageLimitMb: quotas.storageLimitMb,
          customOverrides: updatedCustomOverrides,
          reason,
          adminEmail: actorEmail,
        }),
      });
      await this.refresh();
    } catch (err) {
      console.warn('[superAdminService] Quota API sync error:', err);
    }
  }

  public async setUserBanStatus(
    uid: string,
    isBanned: boolean,
    reason: string,
    actorEmail?: string
  ): Promise<void> {
    const userIndex = this.users.findIndex((u) => u.uid === uid);
    const prevUser = userIndex !== -1 ? this.users[userIndex] : null;

    if (userIndex !== -1 && prevUser) {
      this.users[userIndex] = {
        ...prevUser,
        isBanned,
        status: isBanned ? 'banned' : 'active',
        banReason: isBanned ? reason : undefined,
        bannedAt: isBanned ? new Date().toISOString() : undefined,
        bannedBy: isBanned ? (actorEmail || 'Platform SuperAdmin') : undefined,
      };
      this.notifyUserListeners();
    }

    const auditEntry: SuperAdminAuditLog = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorUid: 'usr_superadmin',
      actorEmail: actorEmail || 'pandeyaryan28@gmail.com',
      actorName: 'Aryan Pandey (Platform SuperAdmin)',
      action: 'USER_BAN_STATUS',
      targetType: 'user',
      targetId: uid,
      targetName: prevUser?.fullName || prevUser?.email || uid,
      previousState: { isBanned: prevUser?.isBanned, status: prevUser?.status },
      newState: { isBanned, status: isBanned ? 'banned' : 'active' },
      reason,
    };

    this.auditLogs.unshift(auditEntry);
    this.notifyAuditListeners();

    try {
      await fetch('/api/command-center/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          action: isBanned ? 'ban' : 'unban',
          isBanned,
          reason,
          adminEmail: actorEmail || 'pandeyaryan28@gmail.com',
          userName: prevUser?.fullName || prevUser?.email,
        }),
      });
      await this.refresh();
    } catch (err) {
      console.warn('[superAdminService] User ban status API sync error:', err);
    }
  }
}

export const superAdminService = SuperAdminDataService.getInstance();

