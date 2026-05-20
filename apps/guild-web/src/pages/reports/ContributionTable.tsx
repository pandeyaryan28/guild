import * as React from 'react';
import { cn } from '@/lib/utils';
import type { MemberContribution } from '../../lib/reports';

interface Props {
  members: MemberContribution[];
  loading?: boolean;
}

export function ContributionTable({ members, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border-default bg-card overflow-hidden">
        <div className="p-5 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 rounded bg-accent/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-border-default bg-card p-8 text-center">
        <p className="text-xs text-muted-foreground">No team member data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-default bg-card overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-default">
            {['Member', 'Assigned', 'Completed', 'Overdue', 'Completion %'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left font-semibold text-muted-foreground text-[10px] uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <tr
              key={m.userId}
              className={cn(
                'border-b border-border-default/50 hover:bg-accent/10 transition-colors',
                i === members.length - 1 && 'border-b-0',
              )}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-bold text-primary flex-shrink-0">
                    {m.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="font-medium text-foreground truncate">{m.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 tabular-nums text-foreground">{m.assigned}</td>
              <td className="px-4 py-3 tabular-nums text-emerald-400 font-medium">{m.completed}</td>
              <td className="px-4 py-3 tabular-nums">
                <span className={m.overdue > 0 ? 'text-red-400 font-medium' : 'text-muted-foreground'}>
                  {m.overdue}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-border-default overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${m.completionPct}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      'tabular-nums font-semibold w-8 text-right',
                      m.completionPct >= 80
                        ? 'text-emerald-400'
                        : m.completionPct >= 50
                        ? 'text-amber-400'
                        : 'text-red-400',
                    )}
                  >
                    {m.completionPct}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
