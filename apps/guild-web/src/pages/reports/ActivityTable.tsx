import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Zap } from 'lucide-react';
import type { RecentActivityItem } from '../../lib/reports';

const ACTIVITY_LABELS: Record<string, string> = {
  created:          'created a task',
  status_changed:   'changed status',
  assigned:         'assigned a task',
  unassigned:       'unassigned a task',
  priority_changed: 'changed priority',
  edited:           'edited a task',
  commented:        'commented',
  label_added:      'added a label',
  label_removed:    'removed a label',
  due_date_set:     'set a due date',
};

interface Props {
  activities: RecentActivityItem[];
  loading?: boolean;
  emptyText?: string;
}

export function ActivityTable({ activities, loading, emptyText = 'No recent activity' }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border-default bg-card p-5 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-7 w-7 rounded-full bg-accent/30" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-3/4 rounded bg-accent/30" />
              <div className="h-2.5 w-1/3 rounded bg-accent/20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-border-default bg-card p-8 flex flex-col items-center gap-2">
        <Zap className="h-5 w-5 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-default bg-card divide-y divide-border-default overflow-hidden">
      {activities.map((a) => {
        const label = ACTIVITY_LABELS[a.type] ?? a.type.replace(/_/g, ' ');
        const payload = a.payload as Record<string, unknown>;
        let detail = '';
        if (a.type === 'status_changed' && payload.from && payload.to) {
          detail = `${payload.from} → ${payload.to}`;
        } else if (a.type === 'priority_changed' && payload.from && payload.to) {
          detail = `${payload.from} → ${payload.to}`;
        } else if ((a.type === 'created' || a.type === 'edited') && payload.title) {
          detail = String(payload.title).slice(0, 40);
        } else if (a.type === 'commented' && payload.preview) {
          detail = `"${String(payload.preview).slice(0, 40)}"`;
        }

        const timeAgo = a.createdAt?.toDate
          ? formatDistanceToNow(a.createdAt.toDate(), { addSuffix: true })
          : '';

        return (
          <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/10 transition-colors">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">
              {a.actorName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground">
                <span className="font-medium">{a.actorName}</span>{' '}
                <span className="text-muted-foreground">{label}</span>
                {detail && (
                  <span className="text-muted-foreground"> &mdash; <em>{detail}</em></span>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{timeAgo}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
