import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Sliders,
  User,
  Building2,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  FileCode,
  Shield,
  Activity,
} from 'lucide-react';
import {
  superAdminService,
  SuperAdminAuditLog,
} from '../services/superAdminService';
import { FilterToolbar, SelectOption } from '../components/common/FilterToolbar';

const ACTION_OPTIONS: SelectOption[] = [
  { value: 'PLAN_OVERRIDE', label: 'Plan Overrides' },
  { value: 'SEAT_LIMIT_CHANGE', label: 'Seat Limit Changes' },
  { value: 'QUOTA_OVERRIDE', label: 'Quota Overrides' },
  { value: 'FEATURE_FLAG_TOGGLE', label: 'Feature Flag Toggles' },
  { value: 'USER_BAN_STATUS', label: 'User Ban / Reactivations' },
  { value: 'USER_ROLE_CHANGE', label: 'User Role Changes' },
  { value: 'CREDIT_TOPUP', label: 'Credit Top-Ups' },
];

export function AuditLogsPage() {
  const [logs, setLogs] = useState<SuperAdminAuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Subscribe to real-time audit logs
  useEffect(() => {
    const unsub = superAdminService.subscribeToAuditLogs((data) => setLogs(data));
    return () => unsub();
  }, []);

  // Filter logic
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          log.actorEmail.toLowerCase().includes(q) ||
          log.actorName.toLowerCase().includes(q) ||
          log.targetName.toLowerCase().includes(q) ||
          log.targetId.toLowerCase().includes(q) ||
          log.reason.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (actionFilter !== 'all' && log.action !== actionFilter) {
        return false;
      }

      return true;
    });
  }, [logs, searchQuery, actionFilter]);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  // Summary counts
  const targetOrgsCount = new Set(logs.filter((l) => l.targetType === 'organization').map((l) => l.targetId)).size;
  const targetUsersCount = new Set(logs.filter((l) => l.targetType === 'user').map((l) => l.targetId)).size;
  const actorsCount = new Set(logs.map((l) => l.actorEmail)).size;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Platform Super-Admin Audit Trail
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable, chronological record of all administrative overrides, plan mutations, and security enforcements.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-accent font-mono text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>IMMUTABLE LEDGER</span>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-surface/80 border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Logged Actions</span>
            <div className="text-lg font-extrabold text-foreground font-mono">{logs.length}</div>
          </div>
          <Activity className="w-5 h-5 text-primary opacity-80" />
        </div>

        <div className="p-3.5 rounded-2xl bg-surface/80 border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Target Workspaces</span>
            <div className="text-lg font-extrabold text-foreground font-mono">{targetOrgsCount}</div>
          </div>
          <Building2 className="w-5 h-5 text-accent opacity-80" />
        </div>

        <div className="p-3.5 rounded-2xl bg-surface/80 border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Target Users</span>
            <div className="text-lg font-extrabold text-foreground font-mono">{targetUsersCount}</div>
          </div>
          <User className="w-5 h-5 text-success opacity-80" />
        </div>

        <div className="p-3.5 rounded-2xl bg-surface/80 border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Acting Super-Admins</span>
            <div className="text-lg font-extrabold text-foreground font-mono">{actorsCount}</div>
          </div>
          <Shield className="w-5 h-5 text-warning opacity-80" />
        </div>
      </div>

      {/* Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search audit events by admin email, target ID, reason..."
        planFilter={actionFilter}
        onPlanFilterChange={setActionFilter}
        planOptions={ACTION_OPTIONS}
        itemCount={filteredLogs.length}
        totalCount={logs.length}
        itemLabel="audit records"
        hasActiveFilters={searchQuery !== '' || actionFilter !== 'all'}
        onClearFilters={() => {
          setSearchQuery('');
          setActionFilter('all');
        }}
      />

      {/* Audit Log Stream Cards */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs divide-y divide-border/60">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto text-muted-foreground opacity-50" />
            <p>No administrative audit logs matched the specified filters.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const dateStr = log.timestamp
              ? new Date(log.timestamp as any).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : 'Unknown';

            return (
              <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  {/* Left: Action Badge + Target + Reason */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="pt-0.5 text-muted-foreground">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-primary" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          {log.action}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {log.targetName}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          ({log.targetId})
                        </span>
                      </div>

                      <p className="text-xs text-foreground/90 font-medium">
                        Reason: <span className="text-foreground">{log.reason}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Actor & Timestamp */}
                  <div className="text-left md:text-right shrink-0 font-mono text-[11px] text-muted-foreground pl-7 md:pl-0">
                    <div className="flex items-center md:justify-end gap-1.5 text-foreground font-semibold">
                      <User className="w-3.5 h-3.5 text-accent" />
                      <span>{log.actorEmail}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {dateStr}
                    </div>
                  </div>
                </div>

                {/* Expanded JSON Diff Inspector */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border/80 pl-7 space-y-3 animate-in fade-in duration-150">
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <FileCode className="w-3.5 h-3.5 text-primary" />
                      <span>State Mutation Diff (Raw Audit Payload)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                      {/* Previous State */}
                      <div className="p-3 rounded-xl bg-secondary/50 border border-border space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                          Previous State
                        </span>
                        <pre className="text-foreground/80 overflow-x-auto whitespace-pre-wrap">
                          {log.previousState && Object.keys(log.previousState).length > 0
                            ? JSON.stringify(log.previousState, null, 2)
                            : '// No previous state recorded'}
                        </pre>
                      </div>

                      {/* New State */}
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                        <span className="text-[10px] font-bold text-primary uppercase block">
                          Applied Mutation
                        </span>
                        <pre className="text-foreground overflow-x-auto whitespace-pre-wrap">
                          {log.newState && Object.keys(log.newState).length > 0
                            ? JSON.stringify(log.newState, null, 2)
                            : '// No mutation payload'}
                        </pre>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1">
                      <span>Log UID: {log.id}</span>
                      <span>Target Class: {log.targetType.toUpperCase()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
