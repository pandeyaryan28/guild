import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  superAdminService,
  AdminOrganization,
} from '../services/superAdminService';
import { FilterToolbar, SelectOption } from '../components/common/FilterToolbar';
import { PlanBadge } from '../components/common/PlanBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { WorkspaceDetailDrawer } from '../components/workspaces/WorkspaceDetailDrawer';
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

type SortField = 'name' | 'plan' | 'seats' | 'members' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export function WorkspacesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrgId = searchParams.get('id');

  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Selected for Drawer
  const [selectedOrg, setSelectedOrg] = useState<AdminOrganization | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Selected for Direct Modal Override
  const [modalOrg, setModalOrg] = useState<AdminOrganization | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsub = superAdminService.subscribeToOrganizations((data) => {
      setOrgs(data);
      if (initialOrgId) {
        const found = data.find((o) => o.id === initialOrgId);
        if (found) {
          setSelectedOrg(found);
          setIsDrawerOpen(true);
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

  // Filter & Search Logic
  const filteredOrgs = useMemo(() => {
    return orgs.filter((org) => {
      // Search query across name, id, ownerEmail, ownerName, domain
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          org.name.toLowerCase().includes(q) ||
          org.id.toLowerCase().includes(q) ||
          org.ownerEmail.toLowerCase().includes(q) ||
          org.ownerName.toLowerCase().includes(q) ||
          org.emailDomain.toLowerCase().includes(q) ||
          org.industry.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Plan filter
      if (planFilter !== 'all' && org.plan !== planFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && org.billingStatus !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [orgs, searchQuery, planFilter, statusFilter]);

  // Sorting Logic
  const sortedOrgs = useMemo(() => {
    return [...filteredOrgs].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'members') {
        valA = a.memberCount || 0;
        valB = b.memberCount || 0;
      } else if (sortField === 'seats') {
        valA = a.maxSeats || 5;
        valB = b.maxSeats || 5;
      } else if (sortField === 'createdAt') {
        valA = new Date(a.createdAt as any).getTime();
        valB = new Date(b.createdAt as any).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrgs, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleRowClick = (org: AdminOrganization) => {
    setSelectedOrg(org);
    setIsDrawerOpen(true);
  };

  const handleOpenOverride = (e: React.MouseEvent, org: AdminOrganization) => {
    e.stopPropagation();
    setModalOrg(org);
    setIsModalOpen(true);
  };

  // Summary Metrics
  const totalSeats = orgs.reduce((acc, o) => acc + (o.maxSeats || 5), 0);
  const totalUsed = orgs.reduce((acc, o) => acc + (o.memberCount || 1), 0);
  const activeCount = orgs.filter((o) => o.billingStatus === 'active').length;
  const isCompedOrg = (o: AdminOrganization) => !!o.customOverrides?.compedReason || !!o.customOverrides?.compedBy;
  const paidCount = orgs.filter((o) => o.billingStatus === 'active' && o.plan !== 'free' && !isCompedOrg(o)).length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Platform Workspaces Directory
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-tenant inspection, member capacity tracking, and plan override controls.
          </p>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Workspaces</span>
            <div className="text-lg font-extrabold text-foreground font-mono">{orgs.length}</div>
          </div>
          <Building2 className="w-5 h-5 text-primary opacity-80" />
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Active Tenancies</span>
            <div className="text-lg font-extrabold text-foreground font-mono">{activeCount}</div>
          </div>
          <StatusBadge status="active" />
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Paid Subscriptions</span>
            <div className="text-lg font-extrabold text-success font-mono">{paidCount}</div>
          </div>
          <span className="font-mono text-xs font-bold text-success">
            {orgs.length > 0 ? Math.round((paidCount / orgs.length) * 100) : 0}%
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Seat Capacity</span>
            <div className="text-lg font-extrabold text-foreground font-mono">
              {totalUsed} / {totalSeats}
            </div>
          </div>
          <Users className="w-5 h-5 text-accent opacity-80" />
        </div>
      </div>

      {/* Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search workspaces by name, ID, owner email, domain..."
        planFilter={planFilter}
        onPlanFilterChange={setPlanFilter}
        planOptions={PLAN_OPTIONS}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={STATUS_OPTIONS}
        itemCount={sortedOrgs.length}
        totalCount={orgs.length}
        itemLabel="workspaces"
        hasActiveFilters={searchQuery !== '' || planFilter !== 'all' || statusFilter !== 'all'}
        onClearFilters={() => {
          setSearchQuery('');
          setPlanFilter('all');
          setStatusFilter('all');
        }}
      />

      {/* High-Density Workspaces Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono select-none">
                <th
                  onClick={() => toggleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Organization</span>
                    {sortField === 'name' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="py-3 px-4">Owner & Domain</th>
                <th
                  onClick={() => toggleSort('plan')}
                  className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Plan Tier</span>
                    {sortField === 'plan' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="py-3 px-4">Billing Status</th>
                <th
                  onClick={() => toggleSort('members')}
                  className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Seat Usage</span>
                    {sortField === 'members' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="py-3 px-4">Storage</th>
                <th
                  onClick={() => toggleSort('createdAt')}
                  className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Created</span>
                    {sortField === 'createdAt' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-sans">
              {sortedOrgs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-muted-foreground">
                    No workspaces matched the specified search and filter criteria.
                  </td>
                </tr>
              ) : (
                sortedOrgs.map((org) => {
                  const maxSeats = org.maxSeats || 5;
                  const used = org.memberCount || 1;
                  const ratio = Math.min(100, Math.round((used / maxSeats) * 100));

                  const dateStr = org.createdAt
                    ? new Date(org.createdAt as any).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—';

                  const isComped = isCompedOrg(org);

                  return (
                    <tr
                      key={org.id}
                      onClick={() => handleRowClick(org)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      {/* Organization Name & ID */}
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
                              {org.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner & Domain */}
                      <td className="py-3 px-4">
                        <div className="min-w-[140px]">
                          <div className="font-medium text-foreground truncate">{org.ownerName}</div>
                          <div className="font-mono text-[10px] text-muted-foreground truncate">
                            {org.ownerEmail}
                          </div>
                        </div>
                      </td>

                      {/* Plan Tier Badge */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <PlanBadge plan={org.plan} size="sm" isComped={isComped} />
                          {org.customOverrides?.customPlanName && (
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-accent/10 text-accent border border-accent/20">
                              CUSTOM
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <StatusBadge status={org.billingStatus} />
                      </td>

                      {/* Seat Usage */}
                      <td className="py-3 px-4">
                        <div className="min-w-[110px] space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold text-foreground">
                              {used} / {maxSeats}
                            </span>
                            <span className="text-muted-foreground">{ratio}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                ratio >= 90
                                   ? 'bg-danger'
                                  : ratio >= 75
                                  ? 'bg-warning'
                                  : 'bg-primary'
                              }`}
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Storage */}
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        {(org.storageLimitMb / 1024).toFixed(1)} GB
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => handleOpenOverride(e, org)}
                          className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground border border-border text-[11px] font-semibold transition-all cursor-pointer shadow-xs shrink-0"
                        >
                          Override
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

      {/* Workspace Detail Drawer */}
      <WorkspaceDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        organization={selectedOrg}
      />

      {/* Direct Override Modal */}
      <PlanOverrideModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        organization={modalOrg}
      />
    </div>
  );
}

