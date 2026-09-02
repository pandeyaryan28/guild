import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: {
    value: number; // e.g. +14.2
    label?: string; // e.g. "vs last month"
  };
  icon: React.ComponentType<{ className?: string }>;
  iconColorClass?: string;
  iconBgClass?: string;
  className?: string;
  badge?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  delta,
  icon: Icon,
  iconColorClass = 'text-primary',
  iconBgClass = 'bg-primary/10 border-primary/20',
  className = '',
  badge,
}: KpiCardProps) {
  const isPositive = delta ? delta.value > 0 : false;
  const isNegative = delta ? delta.value < 0 : false;
  const isZero = delta ? delta.value === 0 : true;

  return (
    <div
      className={`cc-glass cc-card-interactive rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group ${className}`}
    >
      {/* Top row: Title + Icon */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </span>
            {badge && (
              <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border">
                {badge}
              </span>
            )}
          </div>
        </div>

        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-transform duration-200 group-hover:scale-105 shrink-0 ${iconBgClass}`}
        >
          <Icon className={`w-4 h-4 ${iconColorClass}`} />
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="mt-3 space-y-1">
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
          {value}
        </div>

        {/* Bottom row: Delta & Subtitle */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          {delta && (
            <div
              className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-md border ${
                isPositive
                  ? 'bg-success/10 text-success border-success/20'
                  : isNegative
                  ? 'bg-danger/10 text-danger border-danger/20'
                  : 'bg-secondary text-muted-foreground border-border'
              }`}
            >
              {isPositive && <ArrowUpRight className="w-3 h-3" />}
              {isNegative && <ArrowDownRight className="w-3 h-3" />}
              {isZero && <Minus className="w-3 h-3" />}
              <span>{Math.abs(delta.value).toFixed(1)}%</span>
            </div>
          )}

          {subtitle && (
            <span className="text-[11px] text-muted-foreground truncate">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
