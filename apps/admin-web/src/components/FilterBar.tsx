import React from 'react';
import { Search, X, Filter } from 'lucide-react';

interface FilterOption<T> {
  value: T;
  label: string;
}

interface FilterBarProps {
  // Search
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;

  // Custom filters dropdowns (can be passed dynamically)
  filters?: {
    id: string;
    label: string;
    value: string;
    options: FilterOption<string>[];
    onChange: (val: string) => void;
  }[];

  // Date range filters for Overview/HQs
  dateRanges?: {
    value: string;
    label: string;
  }[];
  activeDateRange?: string;
  onDateRangeChange?: (range: string) => void;

  // Clear all button
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}

export function FilterBar({
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  filters = [],
  dateRanges = [],
  activeDateRange = '',
  onDateRangeChange,
  onClearFilters,
  hasActiveFilters = false,
}: FilterBarProps) {
  return (
    <div className="glass rounded-2xl p-4 space-y-3 animate-fade-up">
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search Input */}
        {onSearchChange && (
          <div className="relative w-full md:max-w-xs shrink-0">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[--muted-foreground]">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white/[0.02] dark:bg-white/[0.04] text-[--foreground] border border-white/10 dark:border-white/5 
                         focus:outline-none focus:border-[--primary] focus:ring-1 focus:ring-[--primary] transition-all"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[--muted-foreground] hover:text-[--foreground]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Dropdowns & Date ranges */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto md:justify-end">
          {/* Dynamic Dropdowns */}
          {filters.map(filter => (
            <div key={filter.id} className="relative select-none text-xs">
              <select
                value={filter.value}
                onChange={e => filter.onChange(e.target.value)}
                className="appearance-none bg-white/[0.02] dark:bg-white/[0.04] text-[--foreground] border border-white/10 dark:border-white/5 px-3.5 py-2 pr-8 rounded-xl
                           focus:outline-none focus:border-[--primary] transition-all font-medium min-w-[110px]"
              >
                {filter.options.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[--muted-foreground] opacity-60">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>
          ))}

          {/* Date range filters */}
          {dateRanges.length > 0 && onDateRangeChange && (
            <div className="flex items-center bg-white/[0.02] dark:bg-white/[0.04] border border-white/10 dark:border-white/5 p-0.5 rounded-xl text-[10px] font-semibold">
              {dateRanges.map(range => {
                const active = activeDateRange === range.value;
                return (
                  <button
                    key={range.value}
                    onClick={() => onDateRangeChange(range.value)}
                    className="px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: active ? 'oklch(from var(--primary) l c h / 12%)' : 'transparent',
                      color: active ? 'var(--primary)' : 'var(--muted-foreground)'
                    }}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Reset Filters button */}
          {hasActiveFilters && onClearFilters && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold
                         bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
