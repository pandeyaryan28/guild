import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Building2,
  Sliders,
  Sparkles,
  AlertCircle,
  Gift,
} from 'lucide-react';
import {
  superAdminService,
  AdminOrganization,
} from '../services/superAdminService';
import {
  computeWorkspaceMrr,
  formatCurrency,
} from '../lib/metricsCalculator';
import { FilterToolbar, SelectOption } from '../components/common/FilterToolbar';
import { PlanBadge } from '../components/common/PlanBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { PlanOverrideModal } from '../components/subscriptions/PlanOverrideModal';

const PLAN_OPTIONS: SelectOption[] = [
  { value: 'free', label: 'Free Tier' },
  { value: 'pro_monthly', label: 'Pro (Monthly)' },
  { value: 'pro_annual', label: 'Pro (Annual)' },
  { value: 'credit', label: 'Credit Wallet' },
  { value: 'enterprise', label: 'Enterprise' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'trialing', label: 'Trialing' },
  { value: 'past_due', label: 'Past Due' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function SubscriptionsPage() {
  const [searchParams] = useSearchParams();
  const initialOrgId = searchParams.get('id');

  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  // Selected for Plan Override Modal
  const [selectedOrg, setSelectedOrg] = useState<AdminOrganization | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsub = superAdminService.subscribeToOrganizations((data) => {
      setOrgs(data);
      if (initialOrgId) {
        const found = data.find((o) => o.id === initialOrgId);
        if (found) {
          setSelectedOrg(found);
          setIsModalOpen(true);
        }
      }
    });
    return () => unsub();
  }, [initialOrgId]);

  // Keep selectedOrg in sync with updated data
  useEffect(() => {
    if (selectedOrg) {
      const updated = orgs.find((o) => o.id === selectedOrg.id);
      if (updated) setSelectedOrg(updated);
    }
  }, [orgs]);

  // Filter logic
  const filteredOrgs = useMemo(() => {
    return orgs.filter((org) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          org.name.toLowerCase().includes(q) ||
          org.id.toLowerCase().includes(q) ||
          org.ownerEmail.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (planFilter !== 'all' && org.plan !== planFilter) {
        return false;
      }

      if (statusFilter !== 'all' && org.billingStatus !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [orgs, searchQuery, planFilter, statusFilter]);

  // Financial Rollup
  let totalMrrInr = 0;
  let totalMrrUsd = 0;
  let payingCount = 0;
  let compedCount = 0;
  let pastDueCount = 0;

  orgs.forEach((o) => {
    const isCompedOrg = !!o.customOverrides?.compedReason || !!o.customOverrides?.compedBy;
    const { inr, usd } = computeWorkspaceMrr(o);
    totalMrrInr += inr;
    totalMrrUsd += usd;
    if (o.billingStatus === 'active' && o.plan !== 'free' && !isCompedOrg) {
      payingCount++;
    }
    if (isCompedOrg) compedCount++;
    if (o.billingStatus === 'past_due') pastDueCount++;
  });

  const handleOpenOverride = (org: AdminOrganization) => {
    setSelectedOrg(org);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Subscription & Entitlement Manager
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Grant, upgrade, downgrade, or comp workspace tiers with quota overrides and feature flags.
          </p>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-secondary/60 border border-border shrink-0">
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
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Estimated MRR</span>
            <div className="text-lg font-extrabold text-foreground font-mono">
              {formatCurrency(currency === 'INR' ? totalMrrInr : totalMrrUsd, currency, true)}
            </div>
          </div>
          <CreditCard className="w-5 h-5 text-primary opacity-80" />
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Paying Subscriptions</span>
            <div className="text-lg font-extrabold text-success font-mono">{payingCount}</div>
          </div>
          <span className="font-mono text-xs font-bold text-success">
            {orgs.length > 0 ? Math.round((payingCount / orgs.length) * 100) : 0}%
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Comped / Sponsored</span>
            <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              {compedCount}
            </div>
          </div>
          <Gift className="w-5 h-5 text-amber-500 opacity-80" />
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Past Due Overdue</span>
            <div className={`text-lg font-extrabold font-mono ${pastDueCount > 0 ? 'text-danger' : 'text-foreground'}`}>
              {pastDueCount}
            </div>
          </div>
          <AlertCircle className={`w-5 h-5 opacity-80 ${pastDueCount > 0 ? 'text-danger' : 'text-muted-foreground'}`} />
        </div>
      </div>

      {/* Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Filter subscriptions by workspace name, ID, owner..."
        planFilter={planFilter}
        onPlanFilterChange={setPlanFilter}
        planOptions={PLAN_OPTIONS}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={STATUS_OPTIONS}
        itemCount={filteredOrgs.length}
        totalCount={orgs.length}
        itemLabel="entitlements"
        hasActiveFilters={searchQuery !== '' || planFilter !== 'all' || statusFilter !== 'all'}
        onClearFilters={() => {
          setSearchQuery('');
          setPlanFilter('all');
          setStatusFilter('all');
        }}
      />

      {/* High-Density Subscriptions & Entitlements Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono select-none">
                <th className="py-3 px-4">Workspace</th>
                <th className="py-3 px-4">Current Tier</th>
                <th className="py-3 px-4">Billing Status</th>
                <th className="py-3 px-4">Seats Limit</th>
                <th className="py-3 px-4">Run-Rate MRR</th>
                <th className="py-3 px-4">Custom Overrides</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-sans">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">
                    No workspaces matched the subscription filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const { inr, usd } = computeWorkspaceMrr(org);
                  const mrrValue = currency === 'INR' ? inr : usd;
                  const maxSeats = org.maxSeats || 5;
                  const used = org.memberCount || 1;

                  const isCompedOrg = !!org.customOverrides?.compedReason || !!org.customOverrides?.compedBy;
                  const hasCustomOverrides =
                    !!org.customOverrides?.customPlanName ||
                    !!org.customOverrides?.seatLimitOverride ||
                    isCompedOrg;

                  return (
                    <tr
                      key={org.id}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      {/* Workspace */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-[180px]">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black shrink-0 border border-primary/20">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                              {org.name}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground truncate">
                              {org.ownerEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Tier */}
                      <td className="py-3 px-4">
                        <PlanBadge plan={org.plan} size="sm" isComped={isCompedOrg} />
                      </td>

                      {/* Billing Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={org.billingStatus} />
                      </td>

                      {/* Seats Limit */}
                      <td className="py-3 px-4 font-mono text-[11px] text-foreground font-semibold">
                        {used} / {maxSeats} seats
                      </td>

                      {/* Calculated MRR */}
                      <td className="py-3 px-4 font-mono text-[11px] font-bold text-foreground">
                        {formatCurrency(mrrValue, currency)}
                        {org.appliedCoupon && (
                          <span className="ml-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-normal">
                            ({org.appliedCoupon})
                          </span>
                        )}
                      </td>

                      {/* Overrides Status */}
                      <td className="py-3 px-4">
                        {isCompedOrg ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            <Gift className="w-3 h-3 text-amber-500" />
                            <span>VIP COMPED</span>
                          </span>
                        ) : hasCustomOverrides ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            <span>CUSTOM QUOTA</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Standard Tier
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenOverride(org)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90 transition-all cursor-pointer shrink-0 ml-auto"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Override Plan</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Override Modal */}
      <PlanOverrideModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        organization={selectedOrg}
      />
    </div>
  );
}

