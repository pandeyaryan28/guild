import * as React from 'react';
import {
  ClipboardList, Check, X, Clock, ArrowRight,
  CheckCircle2, XCircle, ArrowUpRight, Loader2, UserCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { updateRequestStatus } from '../../../lib/requests';
import { useSearchParams } from 'react-router-dom';

const REQUEST_STATUS_CONFIG: Record<string, { label: string; border: string; bg: string; text: string; dot: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { 
    label: 'Pending Review', 
    border: 'border-amber-400/50 dark:border-amber-500/40', 
    bg: 'bg-amber-50 dark:bg-amber-500/15', 
    text: 'text-amber-700 dark:text-amber-300', 
    dot: 'bg-amber-500', 
    icon: Clock 
  },
  approved: { 
    label: 'Approved', 
    border: 'border-emerald-400/50 dark:border-emerald-500/40', 
    bg: 'bg-emerald-50 dark:bg-emerald-500/15', 
    text: 'text-emerald-700 dark:text-emerald-300', 
    dot: 'bg-emerald-500', 
    icon: CheckCircle2 
  },
  rejected: { 
    label: 'Declined', 
    border: 'border-red-400/50 dark:border-red-500/40', 
    bg: 'bg-red-50 dark:bg-red-500/15', 
    text: 'text-red-700 dark:text-red-300', 
    dot: 'bg-red-500', 
    icon: XCircle 
  },
};

export interface RequestMessageCardProps {
  requestId?: string;
  fallbackTitle?: string;
  fallbackApproverName?: string;
  fallbackApproverId?: string;
  senderId: string;
  currentUser: any;
  orgId?: string;
  members: any[];
}

export function RequestMessageCard({
  requestId,
  fallbackTitle,
  fallbackApproverName,
  fallbackApproverId,
  senderId,
  currentUser,
  orgId,
  members,
}: RequestMessageCardProps) {
  const [request, setRequest] = React.useState<any>(null);
  const [saving, setSaving] = React.useState(false);
  const [, setSearchParams] = useSearchParams();

  React.useEffect(() => {
    if (!requestId) return;
    const unsub = onSnapshot(doc(db, 'requests', requestId), (snap) => {
      if (snap.exists()) {
        setRequest({ id: snap.id, ...snap.data() });
      }
    });
    return () => unsub();
  }, [requestId]);

  const displayTitle = request?.title || fallbackTitle || 'Untitled Request';
  const statusKey = request?.status || 'pending';
  const statusConfig = REQUEST_STATUS_CONFIG[statusKey] || REQUEST_STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const effectiveApproverId = request?.approverId || fallbackApproverId;
  const approverProfile = members.find((m) => m.uid === effectiveApproverId);
  const approverName = request?.approverName || approverProfile?.fullName || fallbackApproverName || 'Approver';

  const requesterProfile = members.find((m) => m.uid === (request?.creatorId || senderId));
  const requesterName = request?.creatorName || requesterProfile?.fullName || 'Requester';

  const isApprover = currentUser && effectiveApproverId === currentUser.uid;
  const isPending = statusKey === 'pending';

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requestId || !orgId || !currentUser || saving) return;
    setSaving(true);
    try {
      await updateRequestStatus(
        requestId,
        orgId,
        'approved',
        currentUser.uid,
        currentUser.displayName || 'Approver',
        senderId,
        displayTitle,
        'Approved via chat discussion.',
      );
    } catch (err: any) {
      console.error('Failed to approve request:', err);
      alert(err.message || 'Failed to approve request.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requestId || !orgId || !currentUser || saving) return;
    setSaving(true);
    try {
      await updateRequestStatus(
        requestId,
        orgId,
        'rejected',
        currentUser.uid,
        currentUser.displayName || 'Approver',
        senderId,
        displayTitle,
        'Declined via chat discussion.',
      );
    } catch (err: any) {
      console.error('Failed to reject request:', err);
      alert(err.message || 'Failed to decline request.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (requestId) {
      setSearchParams({ request: requestId });
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={handleOpenDetail}
      className={cn(
        'mt-2.5 w-full max-w-md rounded-2xl border transition-all cursor-pointer select-none text-left relative overflow-hidden group',
        'bg-surface/90 dark:bg-surface-elevated/80 backdrop-blur-xl shadow-md hover:shadow-xl',
        statusKey === 'approved' && 'border-emerald-400/40 dark:border-emerald-500/30',
        statusKey === 'rejected' && 'border-red-400/40 dark:border-red-500/30',
        statusKey === 'pending' && 'border-amber-400/40 dark:border-amber-500/30 hover:border-amber-500/60'
      )}
    >
      {/* Top Status Accent Bar */}
      <div className={cn(
        'h-1 w-full transition-colors',
        statusKey === 'approved' ? 'bg-emerald-500' :
        statusKey === 'rejected' ? 'bg-red-500' : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300'
      )} />

      <div className="p-4 space-y-3">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border font-bold text-xs transition-colors',
              statusKey === 'approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
              statusKey === 'rejected' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' :
              'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            )}>
              <ClipboardList className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Approval Request
            </span>
          </div>

          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-tight',
            statusConfig.border,
            statusConfig.bg,
            statusConfig.text
          )}>
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </span>
        </div>

        {/* Request Title */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-snug">
            {displayTitle}
          </h4>
        </div>

        {/* Flow visualizer: Requester -> Approver */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-elevated/70 dark:bg-white/5 border border-border-subtle dark:border-white/5 text-xs">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">From:</span>
            <span className="font-semibold text-foreground truncate text-[11px]">{requesterName}</span>
          </div>

          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />

          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">To:</span>
            <span className="font-semibold text-foreground truncate text-[11px]">{approverName}</span>
          </div>
        </div>

        {/* Action Controls for Approver or Status Footer */}
        {isPending && isApprover ? (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleApprove}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 stroke-[3]" />}
              <span>Approve</span>
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5 stroke-[3]" />}
              <span>Decline</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-1 border-t border-border-subtle dark:border-white/5 text-[11px] text-muted-foreground">
            <span>
              {isPending 
                ? `Awaiting review by ${approverName}` 
                : `${statusConfig.label} by ${approverName}`}
            </span>
            <div className="flex items-center gap-0.5 text-primary font-semibold group-hover:translate-x-0.5 transition-transform">
              <span>View</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
