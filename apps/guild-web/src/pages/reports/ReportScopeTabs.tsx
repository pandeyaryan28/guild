import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ReportScope } from './types';

interface Tab {
  id: ReportScope;
  label: string;
}

interface Props {
  tabs: Tab[];
  active: ReportScope;
  onChange: (scope: ReportScope) => void;
}

export function ReportScopeTabs({ tabs, active, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 border-b border-border-default px-6 flex-shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative px-4 py-3 text-sm font-medium transition-all duration-150',
            active === tab.id
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
          {active === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-primary" />
          )}
        </button>
      ))}
    </div>
  );
}
