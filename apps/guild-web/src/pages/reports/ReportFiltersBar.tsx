import * as React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportFiltersState, DatePreset } from './types';

interface Props {
  filters: ReportFiltersState;
  onChange: (f: ReportFiltersState) => void;
}

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: 'Custom', value: 'custom' },
];

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Todo', value: 'todo' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Review', value: 'review' },
  { label: 'Done', value: 'done' },
] as const;

const PRIORITY_OPTIONS = [
  { label: 'All Priorities', value: 'all' },
  { label: 'None', value: 'none' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
] as const;

export function ReportFiltersBar({ filters, onChange }: Props) {
  const set = <K extends keyof ReportFiltersState>(key: K, val: ReportFiltersState[K]) =>
    onChange({ ...filters, [key]: val });

  return (
    <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-border-default bg-background/60 backdrop-blur-sm">
      {/* Date presets */}
      <div className="flex items-center gap-1 rounded-lg border border-border-default bg-card p-1">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => set('datePreset', p.value)}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-medium transition-all',
              filters.datePreset === p.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {filters.datePreset === 'custom' && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border-default bg-card px-3 py-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              className="text-xs bg-transparent text-foreground outline-none"
              value={filters.customFrom ? filters.customFrom.toISOString().split('T')[0] : ''}
              onChange={(e) => set('customFrom', e.target.value ? new Date(e.target.value) : null)}
            />
          </div>
          <span className="text-xs text-muted-foreground">to</span>
          <div className="flex items-center gap-1.5 rounded-lg border border-border-default bg-card px-3 py-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              className="text-xs bg-transparent text-foreground outline-none"
              value={filters.customTo ? filters.customTo.toISOString().split('T')[0] : ''}
              onChange={(e) => set('customTo', e.target.value ? new Date(e.target.value) : null)}
            />
          </div>
        </div>
      )}

      <div className="h-4 w-px bg-border-default" />

      {/* Status filter */}
      <div className="relative">
        <select
          value={filters.status}
          onChange={(e) => set('status', e.target.value as ReportFiltersState['status'])}
          className="appearance-none rounded-lg border border-border-default bg-card pl-3 pr-7 py-1.5 text-xs font-medium text-foreground outline-none cursor-pointer hover:border-primary/50 transition-colors"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
      </div>

      {/* Priority filter */}
      <div className="relative">
        <select
          value={filters.priority}
          onChange={(e) => set('priority', e.target.value as ReportFiltersState['priority'])}
          className="appearance-none rounded-lg border border-border-default bg-card pl-3 pr-7 py-1.5 text-xs font-medium text-foreground outline-none cursor-pointer hover:border-primary/50 transition-colors"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
      </div>
    </div>
  );
}
