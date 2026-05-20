import React from 'react';

interface HqStatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  sub?: string;
  className?: string;
}

export function HqStatCard({ label, value, icon, color, sub, className = '' }: HqStatCardProps) {
  return (
    <div
      className={`glass rounded-2xl p-5 card-hover animate-fade-up border border-[--border] ${className}`}
      style={{
        borderColor: `${color}25`,
        boxShadow: `0 4px 20px -2px oklch(from ${color} 0.1 0.05 h / 8%)`
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
          style={{
            background: `oklch(from ${color} l c h / 14%)`,
            color: color
          }}
        >
          {icon}
        </div>
        <span
          className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase"
          style={{
            background: `oklch(from ${color} l c h / 10%)`,
            color: color
          }}
        >
          Active
        </span>
      </div>
      
      <p className="text-3xl font-extrabold text-[--foreground] tracking-tight tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      
      <p className="text-xs font-medium text-[--muted-foreground] mt-1">{label}</p>
      
      {sub && (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-[--border] opacity-75">
          <p className="text-[10px] font-medium text-[--muted-foreground] truncate">
            {sub}
          </p>
        </div>
      )}
    </div>
  );
}
