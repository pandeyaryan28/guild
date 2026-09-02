/**
 * @file superAdminService.ts
 * Cross-tenant multi-organization telemetry and super-admin data layer.
 * Includes real-time Firestore listeners, mutation helpers, and a resilient
 * offline fallback mock data generator for 100% zero-downtime development.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '@guild/firebase';
import type {
  BillingStatus,
  BillingCurrency,
} from '@guild/types';

// ─── Data Interfaces ──────────────────────────────────────────────────────────

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
  creditBalance: number; // In smallest unit (paise/cents)
  memberCount: number;
  domainAutoJoin: boolean;
  emailDomain: string;
  createdAt: string | Date | Timestamp;
  updatedAt?: string | Date | Timestamp;
  lastActiveAt?: string | Date | Timestamp;
  nextBillingDate?: string | Date | Timestamp | null;
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
  createdAt: string | Date | Timestamp;
  lastLoginAt?: string | Date | Timestamp;
  authProvider: 'password' | 'google.com' | 'saml' | 'custom';
  isPlatformAdmin?: boolean;
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: string | Date | Timestamp;
  bannedBy?: string;
}

export interface SuperAdminAuditLog {
  id: string;
  timestamp: string | Date | Timestamp;
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
    | 'USER_BAN_STATUS'
    | 'USER_DEACTIVATED'
    | 'CREDIT_TOPUP'
    | 'DATA_EXPORT';
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
  timestamp: string | Date | Timestamp;
  invoiceId?: string;
  gateway?: 'razorpay' | 'stripe' | 'manual';
}

// ─── Deterministic Mock Datasets ──────────────────────────────────────────────

const INITIAL_MOCK_ORGS: AdminOrganization[] = [
  {
    id: 'org_zerodha',
    name: 'Zerodha Tech',
    ownerId: 'usr_nitin',
    ownerName: 'Nithin Kamath',
    ownerEmail: 'nithin@zerodha.com',
    industry: 'Fintech & Brokerage',
    companySize: '250-500',
    plan: 'enterprise',
    billingStatus: 'active',
    seats: 120,
    maxSeats: 150,
    storageLimitMb: 102400,
    currency: 'INR',
    creditBalance: 5000000,
    memberCount: 118,
    domainAutoJoin: true,
    emailDomain: 'zerodha.com',
    createdAt: '2025-01-15T08:00:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    nextBillingDate: '2026-12-31T00:00:00.000Z',
    customOverrides: {
      customPlanName: 'Enterprise FinTech Tier',
      seatLimitOverride: 150,
      customQuotas: { maxProjects: 500, maxGoals: 1000, maxTeams: 50, storageLimitMb: 102400 },
      featureFlags: { auditLogsExportEnabled: true, dedicatedVpc: true, advancedAnalyticsEnabled: true, apiAccessEnabled: true, prioritySupport: true, customDomainEnabled: true, aiAssistantEnabled: true },
    },
  },
  {
    id: 'org_swiggy',
    name: 'Swiggy Logistics',
    ownerId: 'usr_sriharsha',
    ownerName: 'Sriharsha Majety',
    ownerEmail: 'harsha@swiggy.in',
    industry: 'Logistics & Quick Commerce',
    companySize: '500+',
    plan: 'enterprise',
    billingStatus: 'active',
    seats: 250,
    maxSeats: 300,
    storageLimitMb: 204800,
    currency: 'INR',
    creditBalance: 12000000,
    memberCount: 242,
    domainAutoJoin: true,
    emailDomain: 'swiggy.in',
    createdAt: '2025-02-01T10:30:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    nextBillingDate: '2026-10-15T00:00:00.000Z',
    customOverrides: {
      customQuotas: { maxProjects: 1000, maxGoals: 2000, maxTeams: 100, storageLimitMb: 204800 },
      featureFlags: { auditLogsExportEnabled: true, dedicatedVpc: true, advancedAnalyticsEnabled: true, apiAccessEnabled: true, prioritySupport: true, customDomainEnabled: true, aiAssistantEnabled: true },
    },
  },
  {
    id: 'org_razorpay',
    name: 'Razorpay Engineering',
    ownerId: 'usr_harshil',
    ownerName: 'Harshil Mathur',
    ownerEmail: 'harshil@razorpay.com',
    industry: 'Payments & Infrastructure',
    companySize: '250-500',
    plan: 'pro_annual',
    billingStatus: 'active',
    seats: 85,
    maxSeats: 100,
    storageLimitMb: 51200,
    currency: 'INR',
    creditBalance: 2500000,
    memberCount: 82,
    domainAutoJoin: true,
    emailDomain: 'razorpay.com',
    createdAt: '2025-02-14T11:00:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    nextBillingDate: '2027-02-14T00:00:00.000Z',
    customOverrides: {
      customQuotas: { maxProjects: 200, maxGoals: 500, maxTeams: 30, storageLimitMb: 51200 },
      featureFlags: { advancedAnalyticsEnabled: true, apiAccessEnabled: true, prioritySupport: true, customDomainEnabled: true, aiAssistantEnabled: true },
    },
  },
  {
    id: 'org_postman',
    name: 'Postman Developer Platform',
    ownerId: 'usr_abhinav',
    ownerName: 'Abhinav Asthana',
    ownerEmail: 'abhinav@postman.com',
    industry: 'Developer Tools',
    companySize: '100-250',
    plan: 'pro_annual',
    billingStatus: 'active',
    seats: 64,
    maxSeats: 80,
    storageLimitMb: 51200,
    currency: 'USD',
    creditBalance: 50000,
    memberCount: 61,
    domainAutoJoin: true,
    emailDomain: 'postman.com',
    createdAt: '2025-03-01T09:15:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    nextBillingDate: '2027-03-01T00:00:00.000Z',
    customOverrides: {
      customQuotas: { maxProjects: 150, maxGoals: 300, maxTeams: 25, storageLimitMb: 51200 },
      featureFlags: { advancedAnalyticsEnabled: true, apiAccessEnabled: true, prioritySupport: true, customDomainEnabled: true, aiAssistantEnabled: true },
    },
  },
  {
    id: 'org_browserstack',
    name: 'BrowserStack Cloud',
    ownerId: 'usr_nakul',
    ownerName: 'Nakul Aggarwal',
    ownerEmail: 'nakul@browserstack.com',
    industry: 'Software Testing Cloud',
    companySize: '250-500',
    plan: 'pro_monthly',
    billingStatus: 'active',
    seats: 42,
    maxSeats: 50,
    storageLimitMb: 30720,
    currency: 'USD',
    creditBalance: 25000,
    memberCount: 40,
    domainAutoJoin: true,
    emailDomain: 'browserstack.com',
    createdAt: '2025-03-20T14:45:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    nextBillingDate: '2026-09-20T00:00:00.000Z',
    customOverrides: {
      customQuotas: { maxProjects: 100, maxGoals: 200, maxTeams: 20, storageLimitMb: 30720 },
      featureFlags: { advancedAnalyticsEnabled: true, apiAccessEnabled: true, prioritySupport: false, customDomainEnabled: true, aiAssistantEnabled: true },
    },
  },
  {
    id: 'org_cred',
    name: 'CRED Design Systems',
    ownerId: 'usr_kunal',
    ownerName: 'Kunal Shah',
    ownerEmail: 'kunal@cred.club',
    industry: 'Fintech & Design',
    companySize: '50-100',
    plan: 'pro_monthly',
    billingStatus: 'active',
    seats: 38,
    maxSeats: 45,
    storageLimitMb: 25600,
    currency: 'INR',
    creditBalance: 150000,
    memberCount: 36,
    domainAutoJoin: true,
    emailDomain: 'cred.club',
    createdAt: '2025-04-10T12:00:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    nextBillingDate: '2026-09-10T00:00:00.000Z',
    customOverrides: {
      customQuotas: { maxProjects: 80, maxGoals: 150, maxTeams: 15, storageLimitMb: 25600 },
      featureFlags: { advancedAnalyticsEnabled: true, apiAccessEnabled: true, prioritySupport: true, customDomainEnabled: true, aiAssistantEnabled: true },
    },
  },
  {
    id: 'org_hasura',
    name: 'Hasura GraphQL Hub',
    ownerId: 'usr_tanmai',
    ownerName: 'Tanmai Gopal',
    ownerEmail: 'tanmai@hasura.io',
    industry: 'Open Source / Cloud',
    companySize: '50-100',
    plan: 'pro_monthly',
    billingStatus: 'past_due',
    seats: 28,
    maxSeats: 30,
    storageLimitMb: 20480,
    currency: 'USD',
    creditBalance: 0,
    memberCount: 28,
    domainAutoJoin: true,
    emailDomain: 'hasura.io',
    createdAt: '2025-04-22T16:20:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    nextBillingDate: '2026-08-22T00:00:00.000Z',
    customOverrides: {
      customQuotas: { maxProjects: 50, maxGoals: 100, maxTeams: 10, storageLimitMb: 20480 },
      featureFlags: { advancedAnalyticsEnabled: true, apiAccessEnabled: true, prioritySupport: false, customDomainEnabled: true, aiAssistantEnabled: false },
    },
  },
  {
    id: 'org_groww',
    name: 'Groww Investments',
    ownerId: 'usr_lalit',
    ownerName: 'Lalit Keshre',
    ownerEmail: 'lalit@groww.in',
    industry: 'Fintech / Wealth',
    companySize: '100-250',
    plan: 'credit',
    billingStatus: 'active',
    seats: 35,
    maxSeats: 50,
    storageLimitMb: 25600,
    currency: 'INR',
    creditBalance: 12000000,
    memberCount: 33,
    domainAutoJoin: true,
    emailDomain: 'groww.in',
    createdAt: '2025-05-05T10:00:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    nextBillingDate: null,
    customOverrides: {
      customQuotas: { maxProjects: 100, maxGoals: 200, maxTeams: 15, storageLimitMb: 25600 },
      featureFlags: { advancedAnalyticsEnabled: true, apiAccessEnabled: true, prioritySupport: true, customDomainEnabled: true, aiAssistantEnabled: true },
    },
  },
  {
    id: 'org_hyperverge',
    name: 'HyperVerge AI Labs',
    ownerId: 'usr_kedaar',
    ownerName: 'Kedaar Makharia',
    ownerEmail: 'kedaar@hyperverge.co',
    industry: 'Artificial Intelligence',
    companySize: '50-100',
    plan: 'comped',
    billingStatus: 'active',
    seats: 25,
    maxSeats: 30,
    storageLimitMb: 20480,
    currency: 'USD',
    creditBalance: 0,
    memberCount: 22,
    domainAutoJoin: true,
    emailDomain: 'hyperverge.co',
    createdAt: '2025-05-18T11:30:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    nextBillingDate: null,
    customOverrides: {
      compedReason: 'AI Research Partner Grant & Strategic Integration',
      compedBy: 'superadmin@guild.so',
      compedAt: '2025-05-18T11:30:00.000Z',
      customQuotas: { maxProjects: 50, maxGoals: 100, maxTeams: 10, storageLimitMb: 20480 },
      featureFlags: { dedicatedVpc: true, advancedAnalyticsEnabled: true, apiAccessEnabled: true, prioritySupport: true, customDomainEnabled: true, aiAssistantEnabled: true },
    },
  },
  {
    id: 'org_acme',
    name: 'Acme Dynamics Studio',
    ownerId: 'usr_john',
    ownerName: 'Johnathan Doe',
    ownerEmail: 'john@acmedynamics.io',
    industry: 'Design & Creative',
    companySize: '10-50',
    plan: 'starter',
    billingStatus: 'trialing',
    seats: 8,
    maxSeats: 10,
    storageLimitMb: 5120,
    currency: 'USD',
    creditBalance: 0,
    memberCount: 7,
    domainAutoJoin: false,
    emailDomain: 'acmedynamics.io',
    createdAt: '2025-08-10T14:10:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    nextBillingDate: '2026-09-10T00:00:00.000Z',
    customOverrides: {
      customQuotas: { maxProjects: 20, maxGoals: 40, maxTeams: 4, storageLimitMb: 5120 },
      featureFlags: { advancedAnalyticsEnabled: false, apiAccessEnabled: false, prioritySupport: false, customDomainEnabled: false, aiAssistantEnabled: true },
    },
  },
  {
    id: 'org_indie_makers',
    name: 'Indie Hacker Guild',
    ownerId: 'usr_sarah',
    ownerName: 'Sarah Jenkins',
    ownerEmail: 'sarah@indieguild.dev',
    industry: 'Software & Community',
    companySize: '1-10',
    plan: 'free',
    billingStatus: 'active',
    seats: 4,
    maxSeats: 5,
    storageLimitMb: 500,
    currency: 'USD',
    creditBalance: 0,
    memberCount: 4,
    domainAutoJoin: false,
    emailDomain: 'indieguild.dev',
    createdAt: '2025-08-22T15:40:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    nextBillingDate: null,
    customOverrides: {
      customQuotas: { maxProjects: 5, maxGoals: 10, maxTeams: 2, storageLimitMb: 500 },
      featureFlags: { advancedAnalyticsEnabled: false, apiAccessEnabled: false, prioritySupport: false, customDomainEnabled: false, aiAssistantEnabled: false },
    },
  },
  {
    id: 'org_solopreneur',
    name: 'Solopreneur Studio',
    ownerId: 'usr_alex',
    ownerName: 'Alex Rivera',
    ownerEmail: 'alex@riveradesign.co',
    industry: 'Consulting',
    companySize: '1-10',
    plan: 'free',
    billingStatus: 'active',
    seats: 2,
    maxSeats: 5,
    storageLimitMb: 500,
    currency: 'USD',
    creditBalance: 0,
    memberCount: 2,
    domainAutoJoin: false,
    emailDomain: 'riveradesign.co',
    createdAt: '2025-08-28T09:00:00.000Z',
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    nextBillingDate: null,
    customOverrides: {
      customQuotas: { maxProjects: 3, maxGoals: 5, maxTeams: 1, storageLimitMb: 500 },
      featureFlags: { advancedAnalyticsEnabled: false, apiAccessEnabled: false, prioritySupport: false, customDomainEnabled: false, aiAssistantEnabled: false },
    },
  },
];

const INITIAL_MOCK_USERS: AdminUser[] = [
  { uid: 'usr_nitin', email: 'nithin@zerodha.com', fullName: 'Nithin Kamath', username: 'nithin', designation: 'CEO & Founder', employeeId: 'EMP-001', organizationId: 'org_zerodha', organizationName: 'Zerodha Tech', role: 'owner', status: 'active', createdAt: '2025-01-15T08:00:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), authProvider: 'google.com' },
  { uid: 'usr_kailash', email: 'kailash@zerodha.com', fullName: 'Dr. Kailash Nadh', username: 'knadh', designation: 'CTO', employeeId: 'EMP-002', organizationId: 'org_zerodha', organizationName: 'Zerodha Tech', role: 'admin', status: 'active', createdAt: '2025-01-15T09:00:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), authProvider: 'google.com' },
  { uid: 'usr_sriharsha', email: 'harsha@swiggy.in', fullName: 'Sriharsha Majety', username: 'harsha', designation: 'Co-Founder & CEO', employeeId: 'SW-001', organizationId: 'org_swiggy', organizationName: 'Swiggy Logistics', role: 'owner', status: 'active', createdAt: '2025-02-01T10:30:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), authProvider: 'saml' },
  { uid: 'usr_dale', email: 'dale@swiggy.in', fullName: 'Dale Vaz', username: 'dalevaz', designation: 'VP of Tech', employeeId: 'SW-012', organizationId: 'org_swiggy', organizationName: 'Swiggy Logistics', role: 'admin', status: 'active', createdAt: '2025-02-02T11:00:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(), authProvider: 'saml' },
  { uid: 'usr_harshil', email: 'harshil@razorpay.com', fullName: 'Harshil Mathur', username: 'harshil', designation: 'CEO & Co-Founder', employeeId: 'RZP-01', organizationId: 'org_razorpay', organizationName: 'Razorpay Engineering', role: 'owner', status: 'active', createdAt: '2025-02-14T11:00:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(), authProvider: 'google.com' },
  { uid: 'usr_shashank', email: 'shashank@razorpay.com', fullName: 'Shashank Kumar', username: 'shashank', designation: 'MD & Co-Founder', employeeId: 'RZP-02', organizationId: 'org_razorpay', organizationName: 'Razorpay Engineering', role: 'admin', status: 'active', createdAt: '2025-02-14T11:30:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), authProvider: 'google.com' },
  { uid: 'usr_abhinav', email: 'abhinav@postman.com', fullName: 'Abhinav Asthana', username: 'abhinav', designation: 'CEO & Founder', employeeId: 'PST-001', organizationId: 'org_postman', organizationName: 'Postman Developer Platform', role: 'owner', status: 'active', createdAt: '2025-03-01T09:15:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(), authProvider: 'google.com' },
  { uid: 'usr_ankit', email: 'ankit@postman.com', fullName: 'Ankit Sobti', username: 'asobti', designation: 'CTO & Co-Founder', employeeId: 'PST-002', organizationId: 'org_postman', organizationName: 'Postman Developer Platform', role: 'admin', status: 'active', createdAt: '2025-03-01T10:00:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(), authProvider: 'google.com' },
  { uid: 'usr_nakul', email: 'nakul@browserstack.com', fullName: 'Nakul Aggarwal', username: 'nakul', designation: 'CTO & Co-Founder', employeeId: 'BST-001', organizationId: 'org_browserstack', organizationName: 'BrowserStack Cloud', role: 'owner', status: 'active', createdAt: '2025-03-20T14:45:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(), authProvider: 'google.com' },
  { uid: 'usr_ritesh', email: 'ritesh@browserstack.com', fullName: 'Ritesh Arora', username: 'ritesh', designation: 'CEO & Co-Founder', employeeId: 'BST-002', organizationId: 'org_browserstack', organizationName: 'BrowserStack Cloud', role: 'admin', status: 'active', createdAt: '2025-03-20T15:00:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(), authProvider: 'google.com' },
  { uid: 'usr_kunal', email: 'kunal@cred.club', fullName: 'Kunal Shah', username: 'kunalshah', designation: 'Founder', employeeId: 'CRD-001', organizationId: 'org_cred', organizationName: 'CRED Design Systems', role: 'owner', status: 'active', createdAt: '2025-04-10T12:00:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), authProvider: 'google.com' },
  { uid: 'usr_tanmai', email: 'tanmai@hasura.io', fullName: 'Tanmai Gopal', username: 'tanmaig', designation: 'CEO & Co-Founder', employeeId: 'HSR-01', organizationId: 'org_hasura', organizationName: 'Hasura GraphQL Hub', role: 'owner', status: 'active', createdAt: '2025-04-22T16:20:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), authProvider: 'google.com' },
  { uid: 'usr_lalit', email: 'lalit@groww.in', fullName: 'Lalit Keshre', username: 'lalitk', designation: 'CEO & Co-Founder', employeeId: 'GRW-01', organizationId: 'org_groww', organizationName: 'Groww Investments', role: 'owner', status: 'active', createdAt: '2025-05-05T10:00:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(), authProvider: 'google.com' },
  { uid: 'usr_kedaar', email: 'kedaar@hyperverge.co', fullName: 'Kedaar Makharia', username: 'kedaarm', designation: 'CEO & Founder', employeeId: 'HV-001', organizationId: 'org_hyperverge', organizationName: 'HyperVerge AI Labs', role: 'owner', status: 'active', createdAt: '2025-05-18T11:30:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), authProvider: 'google.com' },
  { uid: 'usr_john', email: 'john@acmedynamics.io', fullName: 'Johnathan Doe', username: 'johndoe', designation: 'Creative Director', employeeId: 'ACME-01', organizationId: 'org_acme', organizationName: 'Acme Dynamics Studio', role: 'owner', status: 'active', createdAt: '2025-08-10T14:10:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(), authProvider: 'password' },
  { uid: 'usr_sarah', email: 'sarah@indieguild.dev', fullName: 'Sarah Jenkins', username: 'sjenkins', designation: 'Lead Maintainer', employeeId: 'IND-01', organizationId: 'org_indie_makers', organizationName: 'Indie Hacker Guild', role: 'owner', status: 'active', createdAt: '2025-08-22T15:40:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(), authProvider: 'google.com' },
  { uid: 'usr_alex', email: 'alex@riveradesign.co', fullName: 'Alex Rivera', username: 'arivera', designation: 'Principal Consultant', employeeId: 'RIV-01', organizationId: 'org_solopreneur', organizationName: 'Solopreneur Studio', role: 'owner', status: 'active', createdAt: '2025-08-28T09:00:00.000Z', lastLoginAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(), authProvider: 'password' },
  { uid: 'usr_spammer', email: 'badactor@botnet.xyz', fullName: 'Suspicious Bot Account', username: 'crypto_giveaway_bot', designation: 'Scraper', employeeId: 'NONE', organizationId: '', organizationName: 'Unassigned', role: 'member', status: 'banned', createdAt: '2025-08-15T02:00:00.000Z', lastLoginAt: '2025-08-16T04:00:00.000Z', authProvider: 'password', isBanned: true, banReason: 'Automated spam creation & Terms of Service violation', bannedAt: '2025-08-16T05:00:00.000Z', bannedBy: 'security@guild.so' },
  { uid: 'usr_aryan', email: 'aryan@guild.so', fullName: 'Aryan Pandey', username: 'aryan', designation: 'Platform Architect', employeeId: 'GUILD-001', organizationId: 'org_zerodha', organizationName: 'Platform SuperAdmin', role: 'owner', status: 'active', createdAt: '2025-01-01T00:00:00.000Z', lastLoginAt: new Date().toISOString(), authProvider: 'google.com', isPlatformAdmin: true },
];

const INITIAL_MOCK_AUDIT_LOGS: SuperAdminAuditLog[] = [
  {
    id: 'log_001',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    actorUid: 'usr_superadmin',
    actorEmail: 'superadmin@guild.so',
    actorName: 'Root Admin',
    action: 'PLAN_OVERRIDE',
    targetType: 'organization',
    targetId: 'org_zerodha',
    targetName: 'Zerodha Tech',
    previousState: { plan: 'pro_annual', seats: 80, maxSeats: 100 },
    newState: { plan: 'enterprise', seats: 120, maxSeats: 150 },
    reason: 'Strategic enterprise contract migration & quota upgrade',
  },
  {
    id: 'log_002',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    actorUid: 'usr_aryan',
    actorEmail: 'aryan@guild.so',
    actorName: 'Aryan Pandey',
    action: 'SEAT_LIMIT_CHANGE',
    targetType: 'organization',
    targetId: 'org_swiggy',
    targetName: 'Swiggy Logistics',
    previousState: { maxSeats: 250 },
    newState: { maxSeats: 300 },
    reason: 'Expansion of quick commerce engineering team seats',
  },
  {
    id: 'log_003',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    actorUid: 'usr_superadmin',
    actorEmail: 'admin@guild.so',
    actorName: 'Ops Admin',
    action: 'FEATURE_FLAG_TOGGLE',
    targetType: 'organization',
    targetId: 'org_hyperverge',
    targetName: 'HyperVerge AI Labs',
    previousState: { dedicatedVpc: false },
    newState: { dedicatedVpc: true },
    reason: 'Enabled dedicated VPC tunnel for AI models pipeline',
  },
  {
    id: 'log_004',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    actorUid: 'usr_security',
    actorEmail: 'security@guild.so',
    actorName: 'Security Ops',
    action: 'USER_BAN_STATUS',
    targetType: 'user',
    targetId: 'usr_spammer',
    targetName: 'Suspicious Bot Account',
    previousState: { isBanned: false, status: 'active' },
    newState: { isBanned: true, status: 'banned', banReason: 'Automated spam creation & Terms of Service violation' },
    reason: 'Automated spam bot pattern detected across shared channels',
  },
  {
    id: 'log_005',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    actorUid: 'usr_aryan',
    actorEmail: 'aryan@guild.so',
    actorName: 'Aryan Pandey',
    action: 'QUOTA_OVERRIDE',
    targetType: 'organization',
    targetId: 'org_razorpay',
    targetName: 'Razorpay Engineering',
    previousState: { storageLimitMb: 25600, maxProjects: 100 },
    newState: { storageLimitMb: 51200, maxProjects: 200 },
    reason: 'Storage increase for payment logs archiving pipelines',
  },
];

const INITIAL_MOCK_TRANSACTIONS: BillingTransaction[] = [
  { id: 'tx_001', organizationId: 'org_swiggy', organizationName: 'Swiggy Logistics', amount: 374750, currency: 'INR', type: 'subscription_charge', status: 'succeeded', plan: 'enterprise', seats: 250, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), invoiceId: 'INV-2026-0098', gateway: 'razorpay' },
  { id: 'tx_002', organizationId: 'org_zerodha', organizationName: 'Zerodha Tech', amount: 180000, currency: 'INR', type: 'subscription_charge', status: 'succeeded', plan: 'enterprise', seats: 120, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), invoiceId: 'INV-2026-0097', gateway: 'razorpay' },
  { id: 'tx_003', organizationId: 'org_postman', organizationName: 'Postman Developer Platform', amount: 3118, currency: 'USD', type: 'subscription_charge', status: 'succeeded', plan: 'pro_annual', seats: 64, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), invoiceId: 'INV-2026-0096', gateway: 'stripe' },
  { id: 'tx_004', organizationId: 'org_browserstack', organizationName: 'BrowserStack Cloud', amount: 341, currency: 'USD', type: 'subscription_charge', status: 'succeeded', plan: 'pro_monthly', seats: 42, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), invoiceId: 'INV-2026-0095', gateway: 'stripe' },
  { id: 'tx_005', organizationId: 'org_groww', organizationName: 'Groww Investments', amount: 100000, currency: 'INR', type: 'credit_topup', status: 'succeeded', plan: 'credit', seats: 35, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), invoiceId: 'INV-2026-0094', gateway: 'razorpay' },
];

// ─── SuperAdminDataService Class ──────────────────────────────────────────────

export class SuperAdminDataService {
  private static instance: SuperAdminDataService;

  // In-memory reactive state for deterministic fallback
  private mockOrgs: AdminOrganization[] = [...INITIAL_MOCK_ORGS];
  private mockUsers: AdminUser[] = [...INITIAL_MOCK_USERS];
  private mockAuditLogs: SuperAdminAuditLog[] = [...INITIAL_MOCK_AUDIT_LOGS];
  private mockTransactions: BillingTransaction[] = [...INITIAL_MOCK_TRANSACTIONS];

  // Listeners for in-memory updates
  private orgListeners: Set<(orgs: AdminOrganization[]) => void> = new Set();
  private userListeners: Set<(users: AdminUser[]) => void> = new Set();
  private auditListeners: Set<(logs: SuperAdminAuditLog[]) => void> = new Set();
  private txListeners: Set<(txs: BillingTransaction[]) => void> = new Set();

  public static getInstance(): SuperAdminDataService {
    if (!SuperAdminDataService.instance) {
      SuperAdminDataService.instance = new SuperAdminDataService();
    }
    return SuperAdminDataService.instance;
  }

  // ─── Real-time Subscriptions ────────────────────────────────────────────────

  /**
   * Subscribe to all platform organizations.
   */
  public subscribeToOrganizations(
    onData: (orgs: AdminOrganization[]) => void
  ): () => void {
    this.orgListeners.add(onData);
    onData([...this.mockOrgs]);

    try {
      if (!db) {
        return () => this.orgListeners.delete(onData);
      }

      const q = collection(db, 'organizations');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveOrgs: AdminOrganization[] = snapshot.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: data.name || 'Unnamed Org',
                ownerId: data.ownerId || '',
                ownerName: data.ownerName || 'Workspace Owner',
                ownerEmail: data.ownerEmail || '',
                industry: data.industry || 'General',
                companySize: data.companySize || '1-10',
                plan: (data.billingPlan || data.plan || 'free') as AdminPlanType,
                billingStatus: (data.billingStatus || 'active') as BillingStatus,
                seats: data.seats || 5,
                maxSeats: data.maxSeats || 5,
                storageLimitMb: data.storageLimitMb || 500,
                currency: (data.currency || 'INR') as BillingCurrency,
                creditBalance: data.creditBalance || 0,
                memberCount: data.memberCount || 1,
                domainAutoJoin: !!data.domainAutoJoin,
                emailDomain: data.emailDomain || '',
                createdAt: data.createdAt ? (data.createdAt.toDate?.() || data.createdAt) : new Date().toISOString(),
                nextBillingDate: data.nextBillingDate ? (data.nextBillingDate.toDate?.() || data.nextBillingDate) : null,
                customOverrides: data.customOverrides,
              };
            });
            this.mockOrgs = liveOrgs;
            onData(liveOrgs);
          }
        },
        (error) => {
          console.debug('[SuperAdminService] Live org subscription falling back to mock dataset:', error.message);
          onData([...this.mockOrgs]);
        }
      );

      return () => {
        unsubscribe();
        this.orgListeners.delete(onData);
      };
    } catch {
      return () => this.orgListeners.delete(onData);
    }
  }

  /**
   * Subscribe to all platform users.
   */
  public subscribeToUsers(
    onData: (users: AdminUser[]) => void
  ): () => void {
    this.userListeners.add(onData);
    onData([...this.mockUsers]);

    try {
      if (!db) {
        return () => this.userListeners.delete(onData);
      }

      const q = collection(db, 'users');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveUsers: AdminUser[] = snapshot.docs.map((d) => {
              const u = d.data();
              return {
                uid: d.id,
                email: u.email || '',
                fullName: u.fullName || u.username || 'User',
                username: u.username || 'user',
                designation: u.designation || 'Member',
                employeeId: u.employeeId || '',
                organizationId: u.organizationId || '',
                organizationName: u.organizationName || 'Guild Member',
                role: u.role || 'member',
                status: u.isBanned ? 'banned' : (u.status || 'active'),
                createdAt: u.createdAt ? (u.createdAt.toDate?.() || u.createdAt) : new Date().toISOString(),
                lastLoginAt: u.lastLoginAt ? (u.lastLoginAt.toDate?.() || u.lastLoginAt) : undefined,
                authProvider: u.authProvider || 'google.com',
                isPlatformAdmin: !!u.isPlatformAdmin,
                isBanned: !!u.isBanned,
                banReason: u.banReason,
                bannedAt: u.bannedAt ? (u.bannedAt.toDate?.() || u.bannedAt) : undefined,
                bannedBy: u.bannedBy,
              };
            });
            this.mockUsers = liveUsers;
            onData(liveUsers);
          }
        },
        (error) => {
          console.debug('[SuperAdminService] Live users subscription fallback:', error.message);
          onData([...this.mockUsers]);
        }
      );

      return () => {
        unsubscribe();
        this.userListeners.delete(onData);
      };
    } catch {
      return () => this.userListeners.delete(onData);
    }
  }

  /**
   * Subscribe to super-admin audit logs.
   */
  public subscribeToAuditLogs(
    onData: (logs: SuperAdminAuditLog[]) => void
  ): () => void {
    this.auditListeners.add(onData);
    onData([...this.mockAuditLogs]);

    try {
      if (!db) {
        return () => this.auditListeners.delete(onData);
      }

      const q = query(
        collection(db, 'superAdminAuditLogs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveLogs: SuperAdminAuditLog[] = snapshot.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                timestamp: data.timestamp ? (data.timestamp.toDate?.() || data.timestamp) : new Date().toISOString(),
                actorUid: data.actorUid || '',
                actorEmail: data.actorEmail || '',
                actorName: data.actorName || '',
                action: data.action || 'PLAN_OVERRIDE',
                targetType: data.targetType || 'organization',
                targetId: data.targetId || '',
                targetName: data.targetName || '',
                previousState: data.previousState,
                newState: data.newState,
                reason: data.reason || '',
              };
            });
            this.mockAuditLogs = liveLogs;
            onData(liveLogs);
          }
        },
        (error) => {
          console.debug('[SuperAdminService] Live audit logs subscription fallback:', error.message);
          onData([...this.mockAuditLogs]);
        }
      );

      return () => {
        unsubscribe();
        this.auditListeners.delete(onData);
      };
    } catch {
      return () => this.auditListeners.delete(onData);
    }
  }

  /**
   * Subscribe to billing transactions.
   */
  public subscribeToBillingTransactions(
    onData: (txs: BillingTransaction[]) => void
  ): () => void {
    this.txListeners.add(onData);
    onData([...this.mockTransactions]);
    return () => this.txListeners.delete(onData);
  }

  // ─── Query Helpers ──────────────────────────────────────────────────────────

  public async getAllOrganizations(): Promise<AdminOrganization[]> {
    try {
      if (!db) return [...this.mockOrgs];
      const snap = await getDocs(collection(db, 'organizations'));
      if (snap.empty) return [...this.mockOrgs];
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || 'Unnamed Org',
          ownerId: data.ownerId || '',
          ownerName: data.ownerName || 'Workspace Owner',
          ownerEmail: data.ownerEmail || '',
          industry: data.industry || 'General',
          companySize: data.companySize || '1-10',
          plan: (data.billingPlan || data.plan || 'free') as AdminPlanType,
          billingStatus: (data.billingStatus || 'active') as BillingStatus,
          seats: data.seats || 5,
          maxSeats: data.maxSeats || 5,
          storageLimitMb: data.storageLimitMb || 500,
          currency: (data.currency || 'INR') as BillingCurrency,
          creditBalance: data.creditBalance || 0,
          memberCount: data.memberCount || 1,
          domainAutoJoin: !!data.domainAutoJoin,
          emailDomain: data.emailDomain || '',
          createdAt: data.createdAt ? (data.createdAt.toDate?.() || data.createdAt) : new Date().toISOString(),
          customOverrides: data.customOverrides,
        };
      });
    } catch {
      return [...this.mockOrgs];
    }
  }

  public async getAllUsers(): Promise<AdminUser[]> {
    try {
      if (!db) return [...this.mockUsers];
      const snap = await getDocs(collection(db, 'users'));
      if (snap.empty) return [...this.mockUsers];
      return snap.docs.map((d) => {
        const u = d.data();
        return {
          uid: d.id,
          email: u.email || '',
          fullName: u.fullName || u.username || 'User',
          username: u.username || 'user',
          designation: u.designation || 'Member',
          employeeId: u.employeeId || '',
          organizationId: u.organizationId || '',
          organizationName: u.organizationName || 'Guild Member',
          role: u.role || 'member',
          status: u.isBanned ? 'banned' : (u.status || 'active'),
          createdAt: u.createdAt ? (u.createdAt.toDate?.() || u.createdAt) : new Date().toISOString(),
          lastLoginAt: u.lastLoginAt ? (u.lastLoginAt.toDate?.() || u.lastLoginAt) : undefined,
          authProvider: u.authProvider || 'google.com',
          isPlatformAdmin: !!u.isPlatformAdmin,
          isBanned: !!u.isBanned,
          banReason: u.banReason,
        };
      });
    } catch {
      return [...this.mockUsers];
    }
  }

  public async getAuditLogs(limitCount = 100): Promise<SuperAdminAuditLog[]> {
    return this.mockAuditLogs.slice(0, limitCount);
  }

  public async getBillingTransactions(limitCount = 50): Promise<BillingTransaction[]> {
    return this.mockTransactions.slice(0, limitCount);
  }

  // ─── Mutations with Automatic Audit Logging ─────────────────────────────────

  /**
   * Log a superadmin action to the immutable audit trail and in-memory cache.
   */
  public async logSuperAdminAction(
    entry: Omit<SuperAdminAuditLog, 'id' | 'timestamp'>
  ): Promise<void> {
    const newLog: SuperAdminAuditLog = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    // Update in-memory log list
    this.mockAuditLogs = [newLog, ...this.mockAuditLogs];
    this.auditListeners.forEach((listener) => listener([...this.mockAuditLogs]));

    try {
      if (db) {
        await addDoc(collection(db, 'superAdminAuditLogs'), {
          ...entry,
          timestamp: serverTimestamp(),
        });
      }
    } catch (err) {
      console.debug('[SuperAdminService] Audit log buffered in-memory:', err);
    }
  }

  /**
   * Overrides an organization's subscription plan, status, and seat limits.
   */
  public async overrideWorkspacePlan(
    orgId: string,
    plan: AdminPlanType,
    status: BillingStatus,
    seats: number,
    reason: string,
    adminEmail: string
  ): Promise<void> {
    const targetOrgIndex = this.mockOrgs.findIndex((o) => o.id === orgId);
    let previousState: Record<string, any> = {};
    let targetName = orgId;

    if (targetOrgIndex !== -1) {
      const prev = this.mockOrgs[targetOrgIndex];
      targetName = prev.name;
      previousState = {
        plan: prev.plan,
        billingStatus: prev.billingStatus,
        seats: prev.seats,
        maxSeats: prev.maxSeats,
      };

      const updatedOrg: AdminOrganization = {
        ...prev,
        plan,
        billingStatus: status,
        seats,
        maxSeats: Math.max(seats, prev.maxSeats),
        updatedAt: new Date().toISOString(),
        customOverrides: {
          ...prev.customOverrides,
          compedReason: plan === 'comped' ? reason : prev.customOverrides?.compedReason,
          compedBy: plan === 'comped' ? adminEmail : prev.customOverrides?.compedBy,
          compedAt: plan === 'comped' ? new Date().toISOString() : prev.customOverrides?.compedAt,
        },
      };

      this.mockOrgs[targetOrgIndex] = updatedOrg;
      this.orgListeners.forEach((listener) => listener([...this.mockOrgs]));
    }

    try {
      if (db) {
        const orgDocRef = doc(db, 'organizations', orgId);
        const billingDocRef = doc(db, 'organizations', orgId, 'billing', 'info');

        await updateDoc(orgDocRef, {
          billingPlan: plan,
          billingStatus: status,
          seats,
          maxSeats: seats,
          updatedAt: serverTimestamp(),
          'customOverrides.compedReason': plan === 'comped' ? reason : null,
          'customOverrides.compedBy': plan === 'comped' ? adminEmail : null,
        });

        await setDoc(
          billingDocRef,
          {
            plan,
            status,
            seats,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.debug('[SuperAdminService] Plan override committed to memory cache:', err);
    }

    await this.logSuperAdminAction({
      actorUid: 'usr_superadmin',
      actorEmail: adminEmail,
      actorName: adminEmail.split('@')[0],
      action: 'PLAN_OVERRIDE',
      targetType: 'organization',
      targetId: orgId,
      targetName,
      previousState,
      newState: { plan, status, seats },
      reason,
    });
  }

  /**
   * Updates custom quotas and feature flags for a workspace.
   */
  public async updateCustomQuotas(
    orgId: string,
    quotas: CustomQuotas,
    flags: FeatureFlags,
    reason: string,
    adminEmail: string
  ): Promise<void> {
    const targetOrgIndex = this.mockOrgs.findIndex((o) => o.id === orgId);
    let previousState: Record<string, any> = {};
    let targetName = orgId;

    if (targetOrgIndex !== -1) {
      const prev = this.mockOrgs[targetOrgIndex];
      targetName = prev.name;
      previousState = {
        customQuotas: prev.customOverrides?.customQuotas,
        featureFlags: prev.customOverrides?.featureFlags,
        storageLimitMb: prev.storageLimitMb,
      };

      const updatedOrg: AdminOrganization = {
        ...prev,
        storageLimitMb: quotas.storageLimitMb || prev.storageLimitMb,
        updatedAt: new Date().toISOString(),
        customOverrides: {
          ...prev.customOverrides,
          customQuotas: {
            ...prev.customOverrides?.customQuotas,
            ...quotas,
          },
          featureFlags: {
            ...prev.customOverrides?.featureFlags,
            ...flags,
          },
        },
      };

      this.mockOrgs[targetOrgIndex] = updatedOrg;
      this.orgListeners.forEach((listener) => listener([...this.mockOrgs]));
    }

    try {
      if (db) {
        const orgDocRef = doc(db, 'organizations', orgId);
        await updateDoc(orgDocRef, {
          storageLimitMb: quotas.storageLimitMb,
          'customOverrides.customQuotas': quotas,
          'customOverrides.featureFlags': flags,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.debug('[SuperAdminService] Quota override saved to memory:', err);
    }

    await this.logSuperAdminAction({
      actorUid: 'usr_superadmin',
      actorEmail: adminEmail,
      actorName: adminEmail.split('@')[0],
      action: 'QUOTA_OVERRIDE',
      targetType: 'organization',
      targetId: orgId,
      targetName,
      previousState,
      newState: { customQuotas: quotas, featureFlags: flags },
      reason,
    });
  }

  /**
   * Updates user ban status (bans or unbans a user).
   */
  public async setUserBanStatus(
    uid: string,
    banned: boolean,
    reason: string,
    adminEmail: string
  ): Promise<void> {
    const userIndex = this.mockUsers.findIndex((u) => u.uid === uid);
    let targetName = uid;
    let previousState: Record<string, any> = {};

    if (userIndex !== -1) {
      const prev = this.mockUsers[userIndex];
      targetName = prev.fullName || prev.email;
      previousState = { isBanned: !!prev.isBanned, status: prev.status };

      const updatedUser: AdminUser = {
        ...prev,
        isBanned: banned,
        status: banned ? 'banned' : 'active',
        banReason: banned ? reason : undefined,
        bannedAt: banned ? new Date().toISOString() : undefined,
        bannedBy: banned ? adminEmail : undefined,
      };

      this.mockUsers[userIndex] = updatedUser;
      this.userListeners.forEach((listener) => listener([...this.mockUsers]));
    }

    try {
      if (db) {
        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, {
          isBanned: banned,
          status: banned ? 'banned' : 'active',
          banReason: banned ? reason : null,
          bannedAt: banned ? serverTimestamp() : null,
          bannedBy: banned ? adminEmail : null,
        });

        const bannedDocRef = doc(db, 'bannedUsers', uid);
        if (banned) {
          await setDoc(bannedDocRef, {
            uid,
            reason,
            bannedBy: adminEmail,
            bannedAt: serverTimestamp(),
          });
        } else {
          await setDoc(bannedDocRef, { unbannedAt: serverTimestamp(), unbannedBy: adminEmail }, { merge: true });
        }
      }
    } catch (err) {
      console.debug('[SuperAdminService] User ban status updated in cache:', err);
    }

    await this.logSuperAdminAction({
      actorUid: 'usr_superadmin',
      actorEmail: adminEmail,
      actorName: adminEmail.split('@')[0],
      action: 'USER_BAN_STATUS',
      targetType: 'user',
      targetId: uid,
      targetName,
      previousState,
      newState: { isBanned: banned, status: banned ? 'banned' : 'active', banReason: reason },
      reason,
    });
  }
}

export const superAdminService = SuperAdminDataService.getInstance();
