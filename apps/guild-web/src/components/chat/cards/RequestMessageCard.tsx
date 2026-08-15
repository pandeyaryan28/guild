import * as React from 'react';
import {
  ClipboardList, Check, X, Clock, ArrowRight,
  CheckCircle2, XCircle, ArrowUpRight, Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { updateRequestStatus } from '../../../lib/requests';
import { useSearchParams } from 'react-router-dom';

const REQUEST_STATUS_CONFIG: Record<string, { label: string; border: string; bg: string; text: string; dot: string; icon: typeof Clock }> = {
  pending: { label: 'Pending Review', border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', icon: Clock },
  approved: { label: 'Approved', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500', icon: CheckCircle2 },
  rejected: { label: 'Rejected', border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-500', icon: XCircle },
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
  const approverUsername = request?.approverUsername || approverProfile?.username || 'approver';

  const requesterProfile = members.find((m) => m.uid === (request?.creatorId || senderId));
  const requesterName = request?.creatorName || requesterProfile?.fullName || 'Requester';
  const requesterUsername = request?.creatorUsername || requesterProfile?.username || 'user';

  const isApprover = currentUser && effectiveApproverId === currentUser.uid;
  const isPending = statusKey === 'pending';

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requestId || !orgId || !currentUser) return;
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
    if (!requestId || !orgId || !currentUser) return;
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
        'Rejected via chat discussion.',
      );
    } catch (err: any) {
      console.error('Failed to reject request:', err);
      alert(err.message || 'Failed to reject request.');
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
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      onClick={handleOpenDetail}
      className="mt-2.5 w-full max-w-md rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-surface-elevated/70 dark:to-surface/75 backdrop-blur-xl p-4 shadow-md shadow-black/5 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-all text-left group cursor-pointer relative overflow-hidden"
    >
      {/* Subtle Amber Indicator Bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500/80 group-hover:bg-amber-500 transition-colors" />

      {/* Header Row: Type & Status */}
      <div className="flex items-center justify-between gap-2 mb-2 pl-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ClipboardList className="h-3.5 w-3.5" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
            Request
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
              statusConfig.border,
              statusConfig.bg,
              statusConfig.text,
            )}
          >
            <StatusIcon className="h-2.5 w-2.5" />
            {statusConfig.label}
          </span>
        </div>

        {request?.type && (
          <span className="text-[8.5px] font-bold uppercase px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-muted-foreground shrink-0">
            {request.type.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Request Title */}
      <div className="pl-1 text-sm font-semibold text-foreground group-hover:text-amber-400 transition-colors leading-snug break-words">
        {displayTitle}
      </div>

      {/* Stepper Pipeline Visualizer (Requester -> Approver) */}
      <div className="mt-3 pl-1">
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-[11px]">
          <div className="flex flex-col">
            <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Requester</span>
            <span className="font-semibold text-foreground text-[11px]">@{requesterUsername}</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
          <div className="flex flex-col text-right">
            <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Approver</span>
            <span className="font-semibold text-amber-400 text-[11px]">@{approverUsername}</span>
          </div>
        </div>
      </div>

      {/* Interactive Actions for Approver */}
      {isPending && isApprover && (
        <div className="mt-3 pt-2.5 border-t border-white/5 pl-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleApprove}
            disabled={saving}
            className="flex-1 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            <span>Approve</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReject}
            disabled={saving}
            className="flex-1 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            <span>Reject</span>
          </motion.button>
        </div>
      )}

      {/* Non-approver or completed status footer */}
      {(!isPending || !isApprover) && (
        <div className="mt-3 pt-2 border-t border-white/5 pl-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Approver: <strong className="text-foreground font-medium">{approverName}</strong></span>
          <div className="flex items-center gap-1 text-amber-400 text-[10.5px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View Details</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
