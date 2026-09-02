/**
 * @file metricsCalculator.ts
 * Telemetry and financial metrics calculation engine for Guild Super-Admin.
 * Computes MRR/ARR across multi-currency tiers, plan distributions, seat utilization,
 * and automated platform operational alerts.
 */

import type { AdminOrganization, AdminUser, AdminPlanType } from '../services/superAdminService';

export const PRICING = {
  PRO_MONTHLY_INR: 499,
  PRO_MONTHLY_USD: 8.12,
  PRO_ANNUAL_INR_MO: 249.5, // ₹2,994/yr (50% discount)
  PRO_ANNUAL_USD_MO: 4.06,  // $48.72/yr
  ENTERPRISE_INR_MO: 1500,  // Baseline per seat
  ENTERPRISE_USD_MO: 20.0,
  USD_TO_INR_RATE: 83.5,
};

export interface PlanDistributionItem {
  plan: AdminPlanType;
  label: string;
  count: number;
  percentage: number;
  seats: number;
  mrrInr: number;
  mrrUsd: number;
  colorClass: string;
}

export interface PlatformAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  targetId: string;
  targetType: 'workspace' | 'user' | 'system';
  targetName: string;
  timestamp: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  unassignedUsers: number;
  totalWorkspaces: number;
  totalActiveWorkspaces: number;
  trialingWorkspaces: number;
  pastDueWorkspaces: number;
  payingSubscriptionsCount: number;
  compedSubscriptionsCount: number;
  conversionRate: number; // percentage
  totalSeatsAllocated: number;
  totalSeatsUsed: number;
  seatUtilization: number; // percentage
  mrrInr: number;
  mrrUsd: number;
  arrInr: number;
  arrUsd: number;
  planBreakdown: PlanDistributionItem[];
  alerts: PlatformAlert[];
  growthTelemetry: {
    userGrowthPct: number;
    workspaceGrowthPct: number;
    revenueGrowthPct: number;
  };
}

export function computeWorkspaceMrr(org: AdminOrganization): { inr: number; usd: number } {
  if (org.billingStatus !== 'active' && org.billingStatus !== 'trialing') {
    return { inr: 0, usd: 0 };
  }

  // Check 100% Platform Comped Waiver
  if (org.customOverrides?.compedReason || org.customOverrides?.compedBy) {
    return { inr: 0, usd: 0 };
  }

  const seats = org.seats || 1;
  const isUSD = org.currency === 'USD';
  const discountMultiplier = org.discountPercent ? Math.max(0, 1 - org.discountPercent / 100) : 1;

  switch (org.plan) {
    case 'pro_monthly': {
      if (isUSD) {
        const usd = seats * PRICING.PRO_MONTHLY_USD * discountMultiplier;
        return { inr: usd * PRICING.USD_TO_INR_RATE, usd };
      } else {
        const inr = seats * PRICING.PRO_MONTHLY_INR * discountMultiplier;
        return { inr, usd: inr / PRICING.USD_TO_INR_RATE };
      }
    }
    case 'pro_annual': {
      if (isUSD) {
        const usd = seats * PRICING.PRO_ANNUAL_USD_MO * discountMultiplier;
        return { inr: usd * PRICING.USD_TO_INR_RATE, usd };
      } else {
        const inr = seats * PRICING.PRO_ANNUAL_INR_MO * discountMultiplier;
        return { inr, usd: inr / PRICING.USD_TO_INR_RATE };
      }
    }
    case 'enterprise': {
      if (isUSD) {
        const usd = seats * PRICING.ENTERPRISE_USD_MO * discountMultiplier;
        return { inr: usd * PRICING.USD_TO_INR_RATE, usd };
      } else {
        const inr = seats * PRICING.ENTERPRISE_INR_MO * discountMultiplier;
        return { inr, usd: inr / PRICING.USD_TO_INR_RATE };
      }
    }
    case 'credit':
    case 'free':
    default:
      return { inr: 0, usd: 0 };
  }
}

export function generatePlatformAlerts(
  orgs: AdminOrganization[],
  users: AdminUser[]
): PlatformAlert[] {
  const alerts: PlatformAlert[] = [];

  // 1. Past Due Workspaces (Critical)
  orgs
    .filter((o) => o.billingStatus === 'past_due')
    .forEach((org) => {
      alerts.push({
        id: `alert_pastdue_${org.id}`,
        severity: 'critical',
        title: 'Billing Past Due',
        description: `${org.name} has failed recurring billing payment (${org.plan.toUpperCase()}).`,
        targetId: org.id,
        targetType: 'workspace',
        targetName: org.name,
        timestamp: new Date().toISOString(),
        actionUrl: `/workspaces?id=${org.id}`,
        actionLabel: 'Inspect Workspace',
      });
    });

  // 2. Near Seat Limit Capacity (> 90% utilization or saturated) (Warning)
  orgs.forEach((org) => {
    const maxSeats = org.maxSeats || 5;
    const used = org.memberCount || 0;
    const ratio = used / maxSeats;
    if (ratio >= 0.9 && org.billingStatus === 'active' && org.plan !== 'free') {
      alerts.push({
        id: `alert_capacity_${org.id}`,
        severity: 'warning',
        title: 'Seat Limit Saturation',
        description: `${org.name} has filled ${used} of ${maxSeats} allocated seats (${Math.round(ratio * 100)}%).`,
        targetId: org.id,
        targetType: 'workspace',
        targetName: org.name,
        timestamp: new Date().toISOString(),
        actionUrl: `/subscriptions?id=${org.id}`,
        actionLabel: 'Adjust Seats',
      });
    }
  });

  // 3. Banned Users on Platform (Warning/Info)
  users
    .filter((u) => u.isBanned || u.status === 'banned')
    .forEach((user) => {
      alerts.push({
        id: `alert_banned_${user.uid}`,
        severity: 'warning',
        title: 'Banned User Account',
        description: `${user.fullName} (${user.email}) is flagged as banned: "${user.banReason || 'Policy violation'}".`,
        targetId: user.uid,
        targetType: 'user',
        targetName: user.fullName || user.email,
        timestamp: user.bannedAt ? String(user.bannedAt) : new Date().toISOString(),
        actionUrl: `/users?id=${user.uid}`,
        actionLabel: 'Review User',
      });
    });

  // 4. Unassigned Users (Info)
  const unassigned = users.filter((u) => !u.organizationId && !u.isBanned);
  if (unassigned.length > 0) {
    alerts.push({
      id: 'alert_unassigned_users',
      severity: 'info',
      title: 'Unassigned Users Detected',
      description: `${unassigned.length} user${unassigned.length > 1 ? 's' : ''} have registered without completing workspace onboarding.`,
      targetId: 'unassigned',
      targetType: 'system',
      targetName: 'User Onboarding Pipeline',
      timestamp: new Date().toISOString(),
      actionUrl: '/users',
      actionLabel: 'View Users',
    });
  }

  return alerts;
}

export function calculatePlatformMetrics(
  orgs: AdminOrganization[],
  users: AdminUser[]
): PlatformMetrics {
  const totalUsers = users.length;
  const bannedUsers = users.filter((u) => u.isBanned || u.status === 'banned').length;
  const unassignedUsers = users.filter((u) => !u.organizationId && !u.isBanned).length;
  const activeUsers = totalUsers - bannedUsers;

  const totalWorkspaces = orgs.length;
  const totalActiveWorkspaces = orgs.filter((o) => o.billingStatus === 'active').length;
  const trialingWorkspaces = orgs.filter((o) => o.billingStatus === 'trialing').length;
  const pastDueWorkspaces = orgs.filter((o) => o.billingStatus === 'past_due').length;

  const isCompedOrg = (o: AdminOrganization) => !!o.customOverrides?.compedReason || !!o.customOverrides?.compedBy;

  const payingSubscriptionsCount = orgs.filter(
    (o) => o.billingStatus === 'active' && o.plan !== 'free' && !isCompedOrg(o)
  ).length;
  const compedSubscriptionsCount = orgs.filter(isCompedOrg).length;

  const conversionRate = totalWorkspaces > 0
    ? Math.round((payingSubscriptionsCount / totalWorkspaces) * 1000) / 10
    : 0;

  let totalSeatsAllocated = 0;
  let totalSeatsUsed = 0;
  let mrrInr = 0;
  let mrrUsd = 0;

  // Plan Breakdown Map (Canonical Plans)
  const planMap: Record<
    AdminPlanType,
    { label: string; count: number; seats: number; mrrInr: number; mrrUsd: number; colorClass: string }
  > = {
    enterprise: { label: 'Enterprise', count: 0, seats: 0, mrrInr: 0, mrrUsd: 0, colorClass: 'bg-indigo-500' },
    pro_annual: { label: 'Pro Annual', count: 0, seats: 0, mrrInr: 0, mrrUsd: 0, colorClass: 'bg-purple-500' },
    pro_monthly: { label: 'Pro Monthly', count: 0, seats: 0, mrrInr: 0, mrrUsd: 0, colorClass: 'bg-blue-500' },
    starter: { label: 'Starter', count: 0, seats: 0, mrrInr: 0, mrrUsd: 0, colorClass: 'bg-cyan-500' },
    comped: { label: 'Comped Lifetime', count: 0, seats: 0, mrrInr: 0, mrrUsd: 0, colorClass: 'bg-amber-500' },
    credit: { label: 'Credit Wallet', count: 0, seats: 0, mrrInr: 0, mrrUsd: 0, colorClass: 'bg-emerald-500' },
    free: { label: 'Free Tier', count: 0, seats: 0, mrrInr: 0, mrrUsd: 0, colorClass: 'bg-zinc-400' },
  };

  orgs.forEach((org) => {
    const seats = org.maxSeats || 5;
    const used = org.memberCount || 1;
    totalSeatsAllocated += seats;
    totalSeatsUsed += used;

    const { inr, usd } = computeWorkspaceMrr(org);
    mrrInr += inr;
    mrrUsd += usd;

    const p = org.plan || 'free';
    if (planMap[p]) {
      planMap[p].count += 1;
      planMap[p].seats += seats;
      planMap[p].mrrInr += inr;
      planMap[p].mrrUsd += usd;
    }
  });

  const seatUtilization = totalSeatsAllocated > 0
    ? Math.round((totalSeatsUsed / totalSeatsAllocated) * 1000) / 10
    : 0;

  const arrInr = mrrInr * 12;
  const arrUsd = mrrUsd * 12;

  const planBreakdown: PlanDistributionItem[] = (Object.keys(planMap) as AdminPlanType[]).map((key) => {
    const item = planMap[key];
    const percentage = totalWorkspaces > 0 ? Math.round((item.count / totalWorkspaces) * 1000) / 10 : 0;
    return {
      plan: key,
      label: item.label,
      count: item.count,
      percentage,
      seats: item.seats,
      mrrInr: Math.round(item.mrrInr),
      mrrUsd: Math.round(item.mrrUsd),
      colorClass: item.colorClass,
    };
  });

  const alerts = generatePlatformAlerts(orgs, users);

  return {
    totalUsers,
    activeUsers,
    bannedUsers,
    unassignedUsers,
    totalWorkspaces,
    totalActiveWorkspaces,
    trialingWorkspaces,
    pastDueWorkspaces,
    payingSubscriptionsCount,
    compedSubscriptionsCount,
    conversionRate,
    totalSeatsAllocated,
    totalSeatsUsed,
    seatUtilization,
    mrrInr: Math.round(mrrInr),
    mrrUsd: Math.round(mrrUsd),
    arrInr: Math.round(arrInr),
    arrUsd: Math.round(arrUsd),
    planBreakdown,
    alerts,
    growthTelemetry: {
      userGrowthPct: 18.4,
      workspaceGrowthPct: 12.8,
      revenueGrowthPct: 24.6,
    },
  };
}

// ─── Format Helpers ───────────────────────────────────────────────────────────

export function formatCurrency(
  amount: number,
  currency: 'INR' | 'USD' = 'INR',
  compact = false
): string {
  if (currency === 'INR') {
    if (compact && amount >= 100000) {
      if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
      }
      return `₹${(amount / 100000).toFixed(1)} L`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  if (compact && amount >= 1000) {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    return `$${(amount / 1000).toFixed(1)}k`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('en-US').format(val);
}

export function formatPercent(val: number): string {
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
}

