import React from 'react';

export type BadgeType = 'role' | 'status' | 'priority' | 'health';

interface HealthBadgeProps {
  type: BadgeType;
  value: string;
  className?: string;
}

const PALETTE: Record<string, { bg: string; text: string; label: string; dot?: string }> = {
  // Roles
  owner: { bg: 'oklch(0.65 0.26 300 / 12%)', text: 'oklch(0.65 0.26 300)', label: 'Owner' },
  admin: { bg: 'oklch(0.62 0.18 265 / 12%)', text: 'oklch(0.62 0.18 265)', label: 'Admin' },
  member: { bg: 'oklch(0.62 0.02 265 / 12%)', text: 'oklch(0.62 0.02 265)', label: 'Member' },

  // Task Statuses
  todo: { bg: 'oklch(0.62 0.02 265 / 12%)', text: 'oklch(0.62 0.02 265)', label: 'Todo', dot: 'oklch(0.62 0.02 265)' },
  in_progress: { bg: 'oklch(0.62 0.18 235 / 12%)', text: 'oklch(0.62 0.18 235)', label: 'In Progress', dot: 'oklch(0.62 0.18 235)' },
  review: { bg: 'oklch(0.80 0.18 75 / 12%)', text: 'oklch(0.80 0.18 75)', label: 'Review', dot: 'oklch(0.80 0.18 75)' },
  done: { bg: 'oklch(0.70 0.19 155 / 12%)', text: 'oklch(0.70 0.19 155)', label: 'Done', dot: 'oklch(0.70 0.19 155)' },

  // Goal Statuses
  active: { bg: 'oklch(0.62 0.18 235 / 12%)', text: 'oklch(0.62 0.18 235)', label: 'Active', dot: 'oklch(0.62 0.18 235)' },
  completed: { bg: 'oklch(0.70 0.19 155 / 12%)', text: 'oklch(0.70 0.19 155)', label: 'Completed', dot: 'oklch(0.70 0.19 155)' },
  cancelled: { bg: 'oklch(0.65 0.22 25 / 12%)', text: 'oklch(0.65 0.22 25)', label: 'Cancelled', dot: 'oklch(0.65 0.22 25)' },

  // Priorities
  none: { bg: 'oklch(0.62 0.02 265 / 12%)', text: 'oklch(0.62 0.02 265)', label: 'No Priority' },
  low: { bg: 'oklch(0.68 0.16 235 / 12%)', text: 'oklch(0.68 0.16 235)', label: 'Low' },
  medium: { bg: 'oklch(0.80 0.18 75 / 12%)', text: 'oklch(0.80 0.18 75)', label: 'Medium' },
  high: { bg: 'oklch(0.72 0.20 45 / 12%)', text: 'oklch(0.72 0.20 45)', label: 'High' },
  urgent: { bg: 'oklch(0.65 0.22 25 / 12%)', text: 'oklch(0.65 0.22 25)', label: 'Urgent' },

  // Health
  overdue: { bg: 'oklch(0.65 0.22 25 / 14%)', text: 'oklch(0.65 0.22 25)', label: 'Overdue' },
  stale: { bg: 'oklch(0.72 0.20 45 / 12%)', text: 'oklch(0.72 0.20 45)', label: 'Stale' },
  blocked: { bg: 'oklch(0.65 0.22 25 / 12%)', text: 'oklch(0.65 0.22 25)', label: 'Blocked' },
  healthy: { bg: 'oklch(0.70 0.19 155 / 12%)', text: 'oklch(0.70 0.19 155)', label: 'On Track' },
};

export function HealthBadge({ type, value, className = '' }: HealthBadgeProps) {
  const normValue = value.toLowerCase();
  const config = PALETTE[normValue] || {
    bg: 'oklch(0.62 0.02 265 / 12%)',
    text: 'oklch(0.62 0.02 265)',
    label: value,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide capitalize shrink-0 border border-transparent ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        borderColor: `${config.text}10`
      }}
    >
      {config.dot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: config.dot }}
        />
      )}
      {normValue === 'overdue' && (
        <span className="w-1.5 h-1.5 rounded-full animate-ping bg-[oklch(0.65_0.22_25)] mr-0.5" />
      )}
      {config.label}
    </span>
  );
}
