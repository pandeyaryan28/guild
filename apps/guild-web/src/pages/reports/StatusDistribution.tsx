import * as React from 'react';

interface StatusBar {
  label: string;
  count: number;
  color: string;
}

interface Props {
  data: StatusBar[];
  title?: string;
}

export function StatusDistribution({ data, title = 'Status Breakdown' }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  return (
    <div className="rounded-xl border border-border-default bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">{title}</p>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
        {data.map((d) => (
          d.count > 0 && (
            <div
              key={d.label}
              style={{ width: `${(d.count / total) * 100}%`, backgroundColor: d.color }}
              className="rounded-full transition-all duration-500"
              title={`${d.label}: ${d.count}`}
            />
          )
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-muted-foreground">{d.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground tabular-nums">{d.count}</span>
              <span className="text-muted-foreground/60 w-9 text-right">
                {total > 0 ? Math.round((d.count / total) * 100) : 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
