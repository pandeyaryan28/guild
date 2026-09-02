import React, { useState } from 'react';
import {
  X,
  User,
  Shield,
  Building2,
  Calendar,
  Mail,
  Key,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import type { AdminUser } from '../../services/superAdminService';
import { superAdminService } from '../../services/superAdminService';
import { useSuperAdminAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';

interface UserDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onUserUpdated?: () => void;
}

export function UserDetailDrawer({
  isOpen,
  onClose,
  user: selectedUser,
  onUserUpdated,
}: UserDetailDrawerProps) {
  const { adminProfile, user: currentAdmin } = useSuperAdminAuth();
  const adminEmail = adminProfile?.email || currentAdmin?.email || 'admin@guild.so';

  const [isBanning, setIsBanning] = useState<boolean>(false);
  const [banReason, setBanReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen || !selectedUser) return null;

  const isBanned = selectedUser.isBanned || selectedUser.status === 'banned';

  const createdDateStr = selectedUser.createdAt
    ? new Date(selectedUser.createdAt as any).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown';

  const lastLoginStr = selectedUser.lastLoginAt
    ? new Date(selectedUser.lastLoginAt as any).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  const handleToggleBan = async () => {
    if (!isBanned && !banReason.trim()) {
      setErrorMsg('A reason is required to ban a user.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await superAdminService.setUserBanStatus(
        selectedUser.uid,
        !isBanned,
        isBanned ? 'Unbanned by superadmin' : banReason.trim(),
        adminEmail
      );

      setIsBanning(false);
      setBanReason('');
      if (onUserUpdated) onUserUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update ban status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg cc-glass-elevated border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent border border-accent/25 flex items-center justify-center font-black shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground truncate">
                {selectedUser.fullName}
              </h2>
              <p className="font-mono text-[11px] text-muted-foreground truncate">
                @{selectedUser.username} • {selectedUser.uid}
              </p>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Status Chip Strip */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border">
            <div className="flex items-center gap-2">
              <StatusBadge status={isBanned ? 'banned' : selectedUser.status} />
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 uppercase">
                {selectedUser.role}
              </span>
              {selectedUser.isPlatformAdmin && (
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  PLATFORM ADMIN
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsBanning(!isBanning);
                setErrorMsg('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isBanned
                  ? 'bg-success/10 text-success border border-success/25 hover:bg-success/20'
                  : 'bg-danger/10 text-danger border border-danger/25 hover:bg-danger/20'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{isBanned ? 'Unban User' : 'Ban User'}</span>
            </button>
          </div>

          {/* Ban Confirmation Inline Card */}
          {isBanning && (
            <div className="p-4 rounded-2xl bg-danger/5 border border-danger/25 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-danger text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>{isBanned ? 'Confirm Account Reactivation' : 'Ban User Account'}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isBanned
                  ? 'Reactivating this user will restore their workspace access and sign-in permissions.'
                  : 'Banning will immediately revoke user sessions, disallow login, and lock cross-tenant permissions.'}
              </p>

              {!isBanned && (
                <div>
                  <label className="block text-[11px] font-bold text-foreground uppercase mb-1">
                    Ban Reason (Audit Log) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Repeated terms violation, spam bot, chargeback"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-danger"
                  />
                </div>
              )}

              {errorMsg && (
                <p className="text-xs text-danger font-medium">{errorMsg}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsBanning(false)}
                  className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleToggleBan}
                  disabled={isSubmitting}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer ${
                    isBanned ? 'bg-success hover:bg-success/90' : 'bg-danger hover:bg-danger/90'
                  }`}
                >
                  {isSubmitting ? 'Processing...' : isBanned ? 'Confirm Unban' : 'Confirm Ban'}
                </button>
              </div>
            </div>
          )}

          {/* Active Ban Details if banned */}
          {isBanned && selectedUser.banReason && (
            <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/25 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-danger">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Banned Account Record</span>
              </div>
              <p className="text-xs text-foreground/90 font-mono">
                {selectedUser.banReason}
              </p>
              <span className="text-[10px] text-muted-foreground font-mono block pt-1">
                Banned by: {selectedUser.bannedBy || 'Platform SuperAdmin'}
              </span>
            </div>
          )}

          {/* User Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
                <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{selectedUser.email}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Designation</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
                <User className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="truncate">{selectedUser.designation || 'Member'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Auth Provider</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Key className="w-3.5 h-3.5 text-success shrink-0" />
                <span>{selectedUser.authProvider}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Employee ID</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <span className="font-mono">{selectedUser.employeeId || 'N/A'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Member Since</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>{createdDateStr}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Last Active</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{lastLoginStr}</span>
              </div>
            </div>
          </div>

          {/* Organization Association */}
          <div className="p-4 rounded-2xl bg-secondary/20 border border-border space-y-2">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Workspace Membership
            </span>
            {selectedUser.organizationId ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface/70 border border-border">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs font-bold text-foreground">{selectedUser.organizationName}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{selectedUser.organizationId}</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-secondary text-foreground border border-border uppercase">
                  {selectedUser.role}
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-warning text-xs">
                No active workspace linked. User has not completed organization onboarding.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-border bg-surface/70 flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>UID: {selectedUser.uid}</span>
          <span>Security Level: L1</span>
        </div>
      </div>
    </>
  );
}
