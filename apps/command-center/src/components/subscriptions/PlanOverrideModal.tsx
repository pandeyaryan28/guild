import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  Check,
  Zap,
  Sliders,
  Flag,
  Server,
  Building2,
  Calendar,
} from 'lucide-react';
import type {
  AdminOrganization,
  AdminPlanType,
  CustomQuotas,
  FeatureFlags,
} from '../../services/superAdminService';
import { superAdminService } from '../../services/superAdminService';
import { useSuperAdminAuth } from '../../context/AuthContext';
import { PlanBadge } from '../common/PlanBadge';

interface PlanOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: AdminOrganization | null;
  onSuccess?: () => void;
}

const AVAILABLE_PLANS: { value: AdminPlanType; label: string; description: string }[] = [
  { value: 'free', label: 'Free Tier', description: 'Default free tier (5 seats, 500MB storage)' },
  { value: 'starter', label: 'Starter', description: 'Early-stage startup tier (10 seats, 5GB storage)' },
  { value: 'pro_monthly', label: 'Pro (Monthly)', description: 'Full features, billed monthly (₹499 / $8.12 per seat)' },
  { value: 'pro_annual', label: 'Pro (Annual)', description: 'Full features, billed annually (₹249.5 / $4.06 per seat)' },
  { value: 'enterprise', label: 'Enterprise Contract', description: 'Dedicated SLA, custom quotas, priority support' },
  { value: 'comped', label: 'Comped Lifetime', description: '100% complimentary VIP lifetime grant' },
  { value: 'credit', label: 'Credit Wallet', description: 'Prepaid usage wallet deduction model' },
];

export function PlanOverrideModal({
  isOpen,
  onClose,
  organization,
  onSuccess,
}: PlanOverrideModalProps) {
  const { adminProfile, user } = useSuperAdminAuth();
  const adminEmail = adminProfile?.email || user?.email || 'admin@guild.so';

  const [activeTab, setActiveTab] = useState<'plan' | 'quotas' | 'flags'>('plan');
  const [selectedPlan, setSelectedPlan] = useState<AdminPlanType>('free');
  const [billingStatus, setBillingStatus] = useState<any>('active');
  const [seats, setSeats] = useState<number>(5);
  const [storageLimitMb, setStorageLimitMb] = useState<number>(500);

  // Quotas
  const [maxProjects, setMaxProjects] = useState<number>(20);
  const [maxGoals, setMaxGoals] = useState<number>(50);
  const [maxTeams, setMaxTeams] = useState<number>(10);

  // Feature Flags
  const [flags, setFlags] = useState<FeatureFlags>({
    aiAssistantEnabled: true,
    customDomainEnabled: false,
    advancedAnalyticsEnabled: false,
    auditLogsExportEnabled: false,
    apiAccessEnabled: false,
    prioritySupport: false,
    dedicatedVpc: false,
  });

  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Sync state when organization opens
  useEffect(() => {
    if (organization) {
      setSelectedPlan(organization.plan || 'free');
      setBillingStatus(organization.billingStatus || 'active');
      setSeats(organization.maxSeats || organization.seats || 5);
      setStorageLimitMb(organization.storageLimitMb || 500);

      const customQuotas = organization.customOverrides?.customQuotas;
      if (customQuotas) {
        setMaxProjects(customQuotas.maxProjects ?? 20);
        setMaxGoals(customQuotas.maxGoals ?? 50);
        setMaxTeams(customQuotas.maxTeams ?? 10);
      } else {
        setMaxProjects(20);
        setMaxGoals(50);
        setMaxTeams(10);
      }

      const customFlags = organization.customOverrides?.featureFlags;
      if (customFlags) {
        setFlags({
          aiAssistantEnabled: !!customFlags.aiAssistantEnabled,
          customDomainEnabled: !!customFlags.customDomainEnabled,
          advancedAnalyticsEnabled: !!customFlags.advancedAnalyticsEnabled,
          auditLogsExportEnabled: !!customFlags.auditLogsExportEnabled,
          apiAccessEnabled: !!customFlags.apiAccessEnabled,
          prioritySupport: !!customFlags.prioritySupport,
          dedicatedVpc: !!customFlags.dedicatedVpc,
        });
      } else {
        setFlags({
          aiAssistantEnabled: true,
          customDomainEnabled: organization.plan === 'enterprise',
          advancedAnalyticsEnabled: organization.plan === 'enterprise' || organization.plan.startsWith('pro'),
          auditLogsExportEnabled: organization.plan === 'enterprise',
          apiAccessEnabled: organization.plan === 'enterprise' || organization.plan.startsWith('pro'),
          prioritySupport: organization.plan === 'enterprise',
          dedicatedVpc: organization.plan === 'enterprise',
        });
      }

      setReason('');
      setErrorMsg('');
    }
  }, [organization]);

  if (!isOpen || !organization) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('A mandatory audit reason is required for super-admin changes.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Override Plan & Status
      await superAdminService.overrideWorkspacePlan(
        organization.id,
        selectedPlan,
        billingStatus,
        seats,
        reason.trim(),
        adminEmail
      );

      // 2. Update Custom Quotas & Feature Flags
      const quotas: CustomQuotas = {
        maxProjects,
        maxGoals,
        maxTeams,
        storageLimitMb,
      };

      await superAdminService.updateCustomQuotas(
        organization.id,
        quotas,
        flags,
        reason.trim(),
        adminEmail
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update plan overrides.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFlag = (key: keyof FeatureFlags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="cc-glass-elevated rounded-2xl w-full max-w-2xl overflow-hidden border border-border shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center font-black shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Override Workspace Entitlements
                </h2>
                <PlanBadge plan={organization.plan} size="sm" />
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate max-w-md">
                Target: <span className="text-foreground font-semibold">{organization.name}</span> ({organization.id})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-border bg-secondary/30">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'plan'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Plan & Seats</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quotas')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'quotas'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Resource Quotas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('flags')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'flags'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Feature Flags</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: Plan & Seats */}
          {activeTab === 'plan' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                  Subscription Tier Override
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_PLANS.map((p) => {
                    const isSelected = selectedPlan === p.value;
                    return (
                      <div
                        key={p.value}
                        onClick={() => setSelectedPlan(p.value)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                            : 'bg-secondary/40 border-border hover:border-border-strong hover:bg-secondary/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{p.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                          {p.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Billing Status
                  </label>
                  <select
                    value={billingStatus}
                    onChange={(e) => setBillingStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/50 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium"
                  >
                    <option value="active">Active (Good Standing)</option>
                    <option value="trialing">Trialing (Evaluation Period)</option>
                    <option value="past_due">Past Due (Payment Overdue)</option>
                    <option value="cancelled">Cancelled (Subscription Ended)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Max Allocated Seats
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={seats}
                    onChange={(e) => setSeats(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/50 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    Currently utilized: {organization.memberCount} members
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Resource Quotas */}
          {activeTab === 'quotas' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Set custom workspace storage and resource thresholds to override tier defaults.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Storage Quota (MB)
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={10000000}
                    step={500}
                    value={storageLimitMb}
                    onChange={(e) => setStorageLimitMb(parseInt(e.target.value, 10) || 500)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/50 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {(storageLimitMb / 1024).toFixed(1)} GB
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Max Projects Allowed
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={maxProjects}
                    onChange={(e) => setMaxProjects(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/50 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Max OKR Goals
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={maxGoals}
                    onChange={(e) => setMaxGoals(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/50 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Max Teams & Squads
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={maxTeams}
                    onChange={(e) => setMaxTeams(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/50 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Feature Flags */}
          {activeTab === 'flags' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Toggle individual platform capabilities and beta feature flags for this workspace.
              </p>

              <div className="space-y-2">
                {[
                  { key: 'aiAssistantEnabled', title: 'AI Copilot & Assistant', desc: 'Enable platform AI assistant for all workspace members' },
                  { key: 'customDomainEnabled', title: 'Custom Domain & SSO', desc: 'Allow white-labeling domain and SAML authentication' },
                  { key: 'advancedAnalyticsEnabled', title: 'Executive Analytics & BI', desc: 'Access to velocity metrics, cross-team workloads and BI exports' },
                  { key: 'auditLogsExportEnabled', title: 'Audit Trail Data Export', desc: 'Allow downloading raw security & compliance audit logs' },
                  { key: 'apiAccessEnabled', title: 'Developer REST / Webhook API', desc: 'Issue API tokens for external CI/CD integrations' },
                  { key: 'prioritySupport', title: '24/7 Priority Support SLA', desc: 'Dedicated Slack channel and guaranteed 1-hour response SLA' },
                  { key: 'dedicatedVpc', title: 'Dedicated VPC Tunnel', desc: 'Direct enterprise network peering and IP allowlisting' },
                ].map((item) => {
                  const flagKey = item.key as keyof FeatureFlags;
                  const isChecked = !!flags[flagKey];
                  return (
                    <div
                      key={item.key}
                      onClick={() => toggleFlag(flagKey)}
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <span>{item.title}</span>
                          {isChecked && <Zap className="w-3 h-3 text-warning shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
                      </div>

                      <div
                        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                          isChecked ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.75 ${
                            isChecked ? 'right-1' : 'left-1'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mandatory Audit Reason */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-2">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
              Super-Admin Change Reason <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Enterprise expansion agreement signed; upgraded to 150 seats."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>Logged by: {adminEmail}</span>
              <span>Audit Trail: IMMUTABLE</span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface/60 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-border bg-secondary/50 text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                <span>Committing Changes...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Apply Entitlements</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
