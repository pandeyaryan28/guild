import React from 'react';
import { Search, X, Filter, RotateCcw } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface FilterToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  planFilter?: string;
  onPlanFilterChange?: (plan: string) => void;
  planOptions?: SelectOption[];
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  statusOptions?: SelectOption[];
  roleFilter?: string;
  onRoleFilterChange?: (role: string) => void;
  roleOptions?: SelectOption[];
  itemCount: number;
  totalCount: number;
  itemLabel?: string;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  extraActions?: React.ReactNode;
}

export function FilterToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  planFilter,
  onPlanFilterChange,
  planOptions,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  roleFilter,
  onRoleFilterChange,
  roleOptions,
  itemCount,
  totalCount,
  itemLabel = 'records',
  onClearFilters,
  hasActiveFilters,
  extraActions,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl bg-surface/80 dark:bg-surface/50 border border-border backdrop-blur-md">
      {/* Left controls: Search + Dropdowns */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
        {/* Search Input Box */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-border bg-secondary/50 dark:bg-secondary/30 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Plan Filter Select */}
        {planOptions && onPlanFilterChange && (
          <div className="relative">
            <select
              value={planFilter || 'all'}
              onChange={(e) => onPlanFilterChange(e.target.value)}
              className="pl-3 pr-8 py-1.5 rounded-xl border border-border bg-secondary/50 dark:bg-secondary/30 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all cursor-pointer appearance-none font-medium"
            >
              <option value="all">All Plans</option>
              {planOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Filter className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}

        {/* Status Filter Select */}
        {statusOptions && onStatusFilterChange && (
          <div className="relative">
            <select
              value={statusFilter || 'all'}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="pl-3 pr-8 py-1.5 rounded-xl border border-border bg-secondary/50 dark:bg-secondary/30 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all cursor-pointer appearance-none font-medium"
            >
              <option value="all">All Statuses</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Filter className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}

        {/* Role Filter Select */}
        {roleOptions && onRoleFilterChange && (
          <div className="relative">
            <select
              value={roleFilter || 'all'}
              onChange={(e) => onRoleFilterChange(e.target.value)}
              className="pl-3 pr-8 py-1.5 rounded-xl border border-border bg-secondary/50 dark:bg-secondary/30 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all cursor-pointer appearance-none font-medium"
            >
              <option value="all">All Roles</option>
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Filter className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Right controls: Counter badge + Extra actions */}
      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
        <div className="font-mono text-xs text-muted-foreground">
          Showing <span className="text-foreground font-bold">{itemCount}</span> of{' '}
          <span className="text-foreground font-bold">{totalCount}</span> {itemLabel}
        </div>

        {extraActions && <div className="flex items-center gap-2">{extraActions}</div>}
      </div>
    </div>
  );
}
