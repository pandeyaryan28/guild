import React, { useState } from 'react';
import {
  X,
  Building2,
  Users,
  HardDrive,
  Shield,
  Calendar,
  Mail,
  ExternalLink,
  Sliders,
  CheckCircle2,
  Clock,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import type { AdminOrganization } from '../../services/superAdminService';
import { PlanBadge } from '../common/PlanBadge';
import { StatusBadge } from '../common/StatusBadge';
import { PlanOverrideModal } from '../subscriptions/PlanOverrideModal';
import { formatCurrency } from '../../lib/metricsCalculator';

interface WorkspaceDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  organization: AdminOrganization | null;
  onPlanUpdated?: () => void;
}

export function WorkspaceDetailDrawer({
  isOpen,
  onClose,
  organization,
  onPlanUpdated,
}: WorkspaceDetailDrawerProps) {
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  if (!isOpen || !organization) return null;

  const maxSeats = organization.maxSeats || 5;
  const usedSeats = organization.memberCount || 1;
  const seatRatio = Math.min(100, Math.round((usedSeats / maxSeats) * 100));

  const flags = organization.customOverrides?.featureFlags || {};
  const quotas = organization.customOverrides?.customQuotas || {};

  const createdDateStr = organization.createdAt
    ? new Date(organization.createdAt as any).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown';

  const nextBillingDateStr = organization.nextBillingDate
    ? new Date(organization.nextBillingDate as any).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl cc-glass-elevated border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-border bg-surface/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center font-black shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground truncate">
                {organization.name}
              </h2>
              <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground truncate">
                <span>{organization.id}</span>
                <span>•</span>
                <span>{organization.industry}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Top Quick Badges */}
          <div className="flex items-center justify-between gap-2 p-3.5 rounded-2xl bg-secondary/40 border border-border">
            <div className="flex items-center gap-2 flex-wrap">
              <PlanBadge plan={organization.plan} size="md" />
              <StatusBadge status={organization.billingStatus} />
              {organization.customOverrides?.customPlanName && (
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
                  {organization.customOverrides.customPlanName}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOverrideModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90 transition-all cursor-pointer shrink-0"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Override Plan</span>
            </button>
          </div>

          {/* Seat Capacity Progress */}
          <div className="p-4 rounded-2xl bg-surface/80 border border-border space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Users className="w-4 h-4 text-primary" />
                <span>Seat Utilization</span>
              </div>
              <span className="font-mono font-bold text-foreground">
                {usedSeats} / {maxSeats} seats ({seatRatio}%)
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  seatRatio >= 90
                    ? 'bg-danger'
                    : seatRatio >= 75
                    ? 'bg-warning'
                    : 'bg-primary'
                }`}
                style={{ width: `${seatRatio}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>Allocated: {maxSeats}</span>
              <span>Available: {Math.max(0, maxSeats - usedSeats)}</span>
            </div>
          </div>

          {/* Key Properties Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Storage Limit</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <HardDrive className="w-3.5 h-3.5 text-accent" />
                <span>{(organization.storageLimitMb / 1024).toFixed(1)} GB</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Currency & Wallet</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <CreditCard className="w-3.5 h-3.5 text-success" />
                <span>{organization.currency || 'INR'} (Bal: {formatCurrency(organization.creditBalance || 0, organization.currency || 'INR')})</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Created Date</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{createdDateStr}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Next Renewal</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Clock className="w-3.5 h-3.5 text-warning" />
                <span>{nextBillingDateStr || 'No auto-renewal'}</span>
              </div>
            </div>
          </div>

          {/* Primary Owner Info */}
          <div className="p-4 rounded-2xl bg-secondary/20 border border-border space-y-3">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Workspace Ownership
            </span>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">{organization.ownerName}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{organization.ownerEmail}</p>
              </div>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                OWNER
              </span>
            </div>
            {organization.emailDomain && (
              <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground font-mono flex items-center justify-between">
                <span>Email Domain: @{organization.emailDomain}</span>
                <span>Auto-Join: {organization.domainAutoJoin ? 'ENABLED' : 'DISABLED'}</span>
              </div>
            )}
          </div>

          {/* Custom Overrides & Feature Flags */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Active Capabilities & Flags
            </span>
            <div className="flex flex-wrap gap-1.5">
              {flags.aiAssistantEnabled && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs font-medium">
                  <Sparkles className="w-3 h-3 text-warning" /> AI Copilot
                </span>
              )}
              {flags.customDomainEnabled && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs font-medium">
                  Custom Domain
                </span>
              )}
              {flags.advancedAnalyticsEnabled && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs font-medium">
                  Executive BI
                </span>
              )}
              {flags.auditLogsExportEnabled && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs font-medium">
                  Audit Export
                </span>
              )}
              {flags.apiAccessEnabled && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs font-medium">
                  REST API
                </span>
              )}
              {flags.prioritySupport && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs font-medium">
                  Priority SLA
                </span>
              )}
              {flags.dedicatedVpc && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs font-medium">
                  Dedicated VPC
                </span>
              )}
            </div>
          </div>

          {/* Comped VIP Reason if applicable */}
          {organization.customOverrides?.compedReason && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Comped Lifetime Reason</span>
              </div>
              <p className="text-xs text-foreground/90">
                {organization.customOverrides.compedReason}
              </p>
              <span className="text-[10px] text-muted-foreground font-mono block pt-1">
                Granted by: {organization.customOverrides.compedBy || 'superadmin'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-border bg-surface/70 flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>Guild Platform Core</span>
          <span>Status: SYNCED</span>
        </div>
      </div>

      {/* Plan Override Modal */}
      <PlanOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        organization={organization}
        onSuccess={() => {
          if (onPlanUpdated) onPlanUpdated();
        }}
      />
    </>
  );
}
