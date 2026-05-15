import * as React from 'react';
import { cn } from '@/lib/utils';
import { type TaskLabel } from '../../lib/tasks';

interface LabelBadgeProps {
  label: TaskLabel;
  className?: string;
  onRemove?: () => void;
}

export function LabelBadge({ label, className, onRemove }: LabelBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
        'border border-white/10 bg-white/5',
        className,
      )}
      style={{ borderColor: `${label.color}40`, backgroundColor: `${label.color}18`, color: label.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: label.color }}
      />
      {label.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 rounded-full opacity-60 hover:opacity-100 transition-opacity leading-none"
        >
          ×
        </button>
      )}
    </span>
  );
}
