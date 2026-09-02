import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  CreditCard,
  TrendingUp,
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Radio,
  ArrowRight,
  Sparkles,
  Sliders,
  DollarSign,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  superAdminService,
  AdminOrganization,
  AdminUser,
  SuperAdminAuditLog,
} from '../services/superAdminService';
import {
  calculatePlatformMetrics,
  formatCurrency,
  formatNumber,
  formatPercent,
  PlatformMetrics,
} from '../lib/metricsCalculator';
import { KpiCard } from '../components/common/KpiCard';
import { PlanBadge } from '../components/common/PlanBadge';
import { StatusBadge } from '../components/common/StatusBadge';

export function OverviewPage() {
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<SuperAdminAuditLog[]>([]);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Real-time subscriptions
  useEffect(() => {
    const unsubOrgs = superAdminService.subscribeToOrganizations((data) => setOrgs(data));
    const unsubUsers = superAdminService.subscribeToUsers((data) => setUsers(data));
    const unsubLogs = superAdminService.subscribeToAuditLogs((data) => setAuditLogs(data));

    return () => {
      unsubOrgs();
      unsubUsers();
      unsubLogs();
    };
  }, []);

  const metrics: PlatformMetrics = calculatePlatformMetrics(orgs, users);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    const [fetchedOrgs, fetchedUsers, fetchedLogs] = await Promise.all([
      superAdminService.getAllOrganizations(),
      superAdminService.getAllUsers(),
      superAdminService.getAuditLogs(20),
    ]);
    setOrgs(fetchedOrgs);
    setUsers(fetchedUsers);
    setAuditLogs(fetchedLogs);
    setLastRefreshed(new Date());
    setTimeout(() => setIsRefreshing(false), 300);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Telemetry Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Platform Command & Telemetry
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time cross-tenant telemetry, subscription metrics, and operational health.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Currency Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-secondary/60 border border-border">
            <button
              type="button"
              onClick={() => setCurrency('INR')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                currency === 'INR'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              INR (₹)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                currency === 'USD'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              USD ($)
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            title="Refresh platform telemetry"
            className="p-2 rounded-xl border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-border-strong transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          </button>

          {/* Live Cluster Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>LIVE_STREAM</span>
          </div>
        </div>
      </div>

      {/* 6 Core KPI Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <KpiCard
          title="Total Users"
          value={formatNumber(metrics.totalUsers)}
          subtitle={`${metrics.activeUsers} active • ${metrics.bannedUsers} banned`}
          delta={{ value: metrics.growthTelemetry.userGrowthPct }}
          icon={Users}
          iconColorClass="text-primary"
          iconBgClass="bg-primary/10 border-primary/20"
        />

        <KpiCard
          title="Active Workspaces"
          value={formatNumber(metrics.totalActiveWorkspaces)}
          subtitle={`${metrics.totalWorkspaces} total created`}
          delta={{ value: metrics.growthTelemetry.workspaceGrowthPct }}
          icon={Building2}
          iconColorClass="text-accent"
          iconBgClass="bg-accent/10 border-accent/20"
        />

        <KpiCard
          title="Paid Accounts"
          value={formatNumber(metrics.payingSubscriptionsCount)}
          subtitle={`${metrics.conversionRate}% conversion rate`}
          delta={{ value: 15.2 }}
          icon={CreditCard}
          iconColorClass="text-success"
          iconBgClass="bg-success/10 border-success/20"
        />

        <KpiCard
          title="Monthly Run-Rate (MRR)"
          value={formatCurrency(
            currency === 'INR' ? metrics.mrrInr : metrics.mrrUsd,
            currency,
            true
          )}
          subtitle={currency === 'INR' ? `≈ $${formatNumber(metrics.mrrUsd)}/mo` : `≈ ₹${formatNumber(metrics.mrrInr)}/mo`}
          delta={{ value: metrics.growthTelemetry.revenueGrowthPct }}
          icon={TrendingUp}
          iconColorClass="text-indigo-500"
          iconBgClass="bg-indigo-500/10 border-indigo-500/20"
        />

        <KpiCard
          title="Annualized ARR"
          value={formatCurrency(
            currency === 'INR' ? metrics.arrInr : metrics.arrUsd,
            currency,
            true
          )}
          subtitle="Estimated run-rate"
          delta={{ value: metrics.growthTelemetry.revenueGrowthPct }}
          icon={DollarSign}
          iconColorClass="text-purple-500"
          iconBgClass="bg-purple-500/10 border-purple-500/20"
        />

        <KpiCard
          title="Seat Utilization"
          value={`${metrics.seatUtilization}%`}
          subtitle={`${metrics.totalSeatsUsed} of ${metrics.totalSeatsAllocated} seats`}
          icon={Layers}
          iconColorClass="text-warning"
          iconBgClass="bg-warning/10 border-warning/20"
        />
      </div>

      {/* Analytics Matrix: Plan Breakdown & Platform Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 cols: Plan Distribution Breakdown */}
        <div className="lg:col-span-7 cc-glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Subscription Plan Distribution
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/subscriptions')}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Manage Tiers <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Segmented Distribution Density Bar */}
          <div className="space-y-1.5">
            <div className="h-3.5 w-full rounded-full bg-secondary overflow-hidden flex shadow-inner">
              {metrics.planBreakdown.map((item) => (
                <div
                  key={item.plan}
                  title={`${item.label}: ${item.count} orgs (${item.percentage}%)`}
                  className={`${item.colorClass} transition-all duration-300 hover:opacity-90`}
                  style={{ width: `${Math.max(item.percentage, item.count > 0 ? 3 : 0)}%` }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>0% Free</span>
              <span>100% Platform Workspaces</span>
            </div>
          </div>

          {/* Plan Breakdown Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  <th className="pb-2">Plan Tier</th>
                  <th className="pb-2 text-right">Workspaces</th>
                  <th className="pb-2 text-right">Share</th>
                  <th className="pb-2 text-right">Seats</th>
                  <th className="pb-2 text-right">MRR ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {metrics.planBreakdown.map((item) => (
                  <tr key={item.plan} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.colorClass}`} />
                      <span className="font-sans font-semibold text-foreground">{item.label}</span>
                    </td>
                    <td className="py-2 text-right text-foreground font-bold">{item.count}</td>
                    <td className="py-2 text-right text-muted-foreground">{item.percentage}%</td>
                    <td className="py-2 text-right text-foreground">{item.seats}</td>
                    <td className="py-2 text-right text-foreground font-bold">
                      {formatCurrency(
                        currency === 'INR' ? item.mrrInr : item.mrrUsd,
                        currency
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5 cols: Platform Operational Alerts */}
        <div className="lg:col-span-5 cc-glass rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h2 className="text-sm font-bold text-foreground">Operational Alerts</h2>
              </div>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
                {metrics.alerts.length} Active
              </span>
            </div>

            <div className="mt-3 space-y-2.5 max-h-[290px] overflow-y-auto scrollbar-thin pr-1">
              {metrics.alerts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <ShieldCheck className="w-8 h-8 text-success mx-auto mb-2 opacity-80" />
                  All platform services and tenant subscriptions operating normally.
                </div>
              ) : (
                metrics.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-xl border transition-all ${
                      alert.severity === 'critical'
                        ? 'bg-danger/10 border-danger/25 text-danger'
                        : alert.severity === 'warning'
                        ? 'bg-warning/10 border-warning/25 text-warning'
                        : 'bg-secondary/40 border-border text-foreground'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>{alert.title}</span>
                          <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-background/60 border border-border">
                            {alert.targetType}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {alert.description}
                        </p>
                      </div>

                      {alert.actionUrl && (
                        <button
                          type="button"
                          onClick={() => navigate(alert.actionUrl!)}
                          className="px-2 py-1 rounded-lg bg-surface text-foreground hover:bg-surface-hover border border-border text-[10px] font-bold shrink-0 cursor-pointer shadow-xs"
                        >
                          {alert.actionLabel || 'Inspect'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>Automated Telemetry Engine</span>
            <span>Refreshed: {lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Audit Trail & Fast Action Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Audit Trail Stream (8 cols) */}
        <div className="lg:col-span-8 cc-glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-bold text-foreground">Recent Super-Admin Audit Actions</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/audit-logs')}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Full Audit Trail <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {auditLogs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {log.action}
                    </span>
                    <span className="text-xs font-bold text-foreground truncate">
                      {log.targetName}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    Reason: {log.reason}
                  </p>
                </div>

                <div className="text-right shrink-0 font-mono text-[11px] text-muted-foreground">
                  <p className="text-foreground font-medium truncate max-w-[120px]">{log.actorEmail.split('@')[0]}</p>
                  <p className="text-[10px]">
                    {new Date(log.timestamp as any).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Launch Dock (4 cols) */}
        <div className="lg:col-span-4 cc-glass rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Administrative Shortcuts</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Direct access to multi-tenant directories and entitlement controls.
            </p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => navigate('/workspaces')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/70 text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> Workspaces Directory
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/users')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/70 text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent" /> Platform Users
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/subscriptions')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/70 text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-success" /> Entitlements & Overrides
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/audit-logs')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/70 text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-warning" /> Immutable Audit Logs
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-muted-foreground font-mono">
            Zero Web Discoverability: ENFORCED
          </div>
        </div>
      </div>
    </div>
  );
}
