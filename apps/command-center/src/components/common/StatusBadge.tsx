import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  showDot?: boolean;
}

interface StatusConfig {
  label: string;
  classes: string;
  dotColor: string;
  pulse?: boolean;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  active: {
    label: 'ACTIVE',
    classes: 'bg-success/10 text-success border-success/25',
    dotColor: 'bg-success',
    pulse: true,
  },
  trialing: {
    label: 'TRIALING',
    classes: 'bg-info/10 text-info border-info/25',
    dotColor: 'bg-info',
    pulse: false,
  },
  past_due: {
    label: 'PAST DUE',
    classes: 'bg-danger/10 text-danger border-danger/25 font-bold',
    dotColor: 'bg-danger',
    pulse: true,
  },
  cancelled: {
    label: 'CANCELLED',
    classes: 'bg-muted text-muted-foreground border-border',
    dotColor: 'bg-muted-foreground',
    pulse: false,
  },
  banned: {
    label: 'BANNED',
    classes: 'bg-danger/15 text-danger border-danger/30 font-bold',
    dotColor: 'bg-danger',
    pulse: false,
  },
  suspended: {
    label: 'SUSPENDED',
    classes: 'bg-warning/15 text-warning border-warning/30',
    dotColor: 'bg-warning',
    pulse: false,
  },
  deactivated: {
    label: 'DEACTIVATED',
    classes: 'bg-muted text-muted-foreground border-border',
    dotColor: 'bg-muted-foreground',
    pulse: false,
  },
  invited: {
    label: 'INVITED',
    classes: 'bg-secondary text-muted-foreground border-border',
    dotColor: 'bg-muted-foreground',
    pulse: false,
  },
};

export function StatusBadge({ status, className = '', showDot = true }: StatusBadgeProps) {
  const norm = status?.toLowerCase() || 'active';
  const config = STATUS_MAP[norm] || {
    label: status?.toUpperCase() || 'UNKNOWN',
    classes: 'bg-secondary text-muted-foreground border-border',
    dotColor: 'bg-muted-foreground',
    pulse: false,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-mono text-[10px] font-semibold tracking-wider ${config.classes} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${config.dotColor} ${
            config.pulse ? 'animate-pulse' : ''
          }`}
        />
      )}
      {config.label}
    </span>
  );
}
