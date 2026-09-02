import React from 'react';
import type { AdminPlanType } from '../../services/superAdminService';

interface PlanBadgeProps {
  plan: AdminPlanType | string;
  className?: string;
  size?: 'sm' | 'md';
  isComped?: boolean;
}

interface PlanConfig {
  label: string;
  classes: string;
}

const PLAN_STYLES: Record<string, PlanConfig> = {
  enterprise: {
    label: 'Enterprise',
    classes:
      'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
  },
  pro_annual: {
    label: 'Pro Annual',
    classes:
      'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
  },
  pro_monthly: {
    label: 'Pro Monthly',
    classes:
      'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  },
  credit: {
    label: 'Credit Wallet',
    classes:
      'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
  },
  free: {
    label: 'Free Tier',
    classes:
      'bg-secondary text-muted-foreground border-border',
  },
};

export function PlanBadge({ plan, className = '', size = 'sm', isComped = false }: PlanBadgeProps) {
  const config = PLAN_STYLES[plan] || {
    label: plan ? plan.toUpperCase().replace('_', ' ') : 'UNKNOWN',
    classes: 'bg-secondary text-muted-foreground border-border',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded-lg border transition-colors ${config.classes} ${sizeClasses} ${className}`}
    >
      {config.label}
      {isComped && (
        <span className="ml-1 px-1 py-0.2 text-[8px] uppercase tracking-wider font-bold rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          VIP
        </span>
      )}
    </span>
  );
}

