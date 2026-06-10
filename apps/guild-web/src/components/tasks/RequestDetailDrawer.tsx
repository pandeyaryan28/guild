import * as React from 'react';
import { motion } from 'motion/react';
import {
  X, Check, Copy, Printer, User, Calendar, Loader2,
  CheckCircle2, XCircle, Trash2, Bell, Clock, ClipboardList,
  Home, Laptop, Receipt, Stethoscope
} from 'lucide-react';
import {
  updateRequestStatus, deleteRequest, sendRequestReminder,
  REQUEST_TYPE_LABELS, REQUEST_TYPE_ICONS,
  type OrgRequest, type RequestType, type RequestStatus,
} from '../../lib/requests';
import { type UserProfile } from '../../lib/firestore';
import { cn } from '@/lib/utils';

// Helper Maps & Components
const RequestIconMap: Record<string, typeof ClipboardList> = {
  Stethoscope,
  Home,
  Calendar,
  Laptop,
  Receipt,
  ClipboardList,
};

function RequestIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const Icon = RequestIconMap[name] || ClipboardList;
  return <Icon className={className} />;
}

function statusColor(s: RequestStatus) {
  if (s === 'approved') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  if (s === 'rejected') return 'text-red-400 bg-red-400/10 border-red-400/20';
  return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const icons = { pending: Clock, approved: CheckCircle2, rejected: XCircle };
  const Icon = icons[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor(status)}`}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(ts: any) {
  if (!ts) return '';
  const ms = ts.toMillis ? ts.toMillis() : Number(ts);
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface RequestDetailDrawerProps {
  request: OrgRequest | null;
  onClose: () => void;
  orgId: string;
  currentUser: UserProfile;
  inline?: boolean;
}

export function RequestDetailDrawer({
  request,
  onClose,
  orgId,
  currentUser,
  inline = false,
}: RequestDetailDrawerProps) {
  const [note, setNote] = React.useState('');
  const [acting, setActing] = React.useState(false);
  const [reminding, setReminding] = React.useState(false);
  const [reminderSent, setReminderSent] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = React.useState(false);
  const [withdrawing, setWithdrawing] = React.useState(false);

  React.useEffect(() => {
    if (inline) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [inline]);

  if (!request) return null;

  const isSent = request.creatorId === currentUser.uid;

  const theme = {
    sick_leave: { accent: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    work_from_home: { accent: '#0ea5e9', text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
    time_off: { accent: '#6366f1', text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    equipment: { accent: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    expense: { accent: '#f43f5e', text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    other: { accent: '#a855f7', text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  }[request.type] || { accent: '#8b5cf6', text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' };

  async function act(status: 'approved' | 'rejected') {
    if (!request) return;
    setActing(true);
    await updateRequestStatus(
      request.id,
      orgId,
      status,
      currentUser.uid,
      currentUser.fullName,
      request.creatorId,
      request.title,
      note || undefined
    );
    setActing(false);
    onClose();
  }

  async function handleSendReminder() {
    if (!request) return;
    setReminding(true);
    await sendRequestReminder({
      orgId,
      creatorId: currentUser.uid,
      creatorName: currentUser.fullName,
      approverId: request.approverId,
      title: request.title,
    });
    setReminding(false);
    setReminderSent(true);
    setTimeout(() => setReminderSent(false), 3000);
  }

  async function handleWithdraw() {
    if (!request) return;
    setWithdrawing(true);
    await deleteRequest(request.id);
    setWithdrawing(false);
    onClose();
  }

  function copySummary() {
    if (!request) return;
    const summary = `
[${REQUEST_TYPE_LABELS[request.type]} Request]
Title: ${request.title}
Status: ${request.status.toUpperCase()}
Creator: ${request.creatorName} (@${request.creatorUsername})
Approver: ${request.approverName} (@${request.approverUsername})
Dates: ${request.startDate ? `${formatDate(request.startDate)}${request.endDate && request.endDate !== request.startDate ? ` to ${formatDate(request.endDate)}` : ''}` : 'N/A'}
Description: ${request.description}
${request.approverNote ? `Review Note: "${request.approverNote}"` : ''}
    `.trim();
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getDurationDays(start?: string, end?: string) {
    if (!start) return null;
    const s = new Date(start);
    const e = end ? new Date(end) : s;
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays === 1 ? '1 Day' : `${diffDays} Days`;
  }

  const duration = getDurationDays(request.startDate, request.endDate);

  if (inline) {
    return (
      <div className="h-full border-l border-white/10 dark:border-white/5 bg-surface/95 dark:bg-zinc-950/60 backdrop-blur-xl flex flex-col z-30 overflow-hidden absolute inset-y-0 right-0 w-full sm:w-[420px] lg:relative shadow-2xl lg:shadow-none shrink-0 animate-in slide-in-from-right duration-200">
        <div className="w-full sm:w-[420px] h-full flex flex-col min-h-0">
          
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-border-subtle bg-bg-secondary/40 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn("p-2.5 rounded-xl border shrink-0", theme.bg, theme.border, theme.text)}
                style={{ color: theme.accent, borderColor: `${theme.accent}30` }}
              >
                <RequestIcon name={REQUEST_TYPE_ICONS[request.type]} className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-foreground leading-tight truncate tracking-tight">{request.title}</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold uppercase tracking-wider">{REQUEST_TYPE_LABELS[request.type]}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={copySummary}
                title="Copy details summary"
                className="p-2 rounded-xl border border-border-default bg-bg-secondary hover:bg-bg-tertiary hover:text-foreground text-muted-foreground transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => window.print()}
                title="Print request details"
                className="p-2 rounded-xl border border-border-default bg-bg-secondary hover:bg-bg-tertiary hover:text-foreground text-muted-foreground transition-all cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto aether-scroll p-6 space-y-6">
            {/* Status Large Block */}
            <div className={cn("p-4 rounded-2xl border flex items-center justify-between relative overflow-hidden bg-bg-secondary/35 border-border-subtle")}>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Status</p>
                <p className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                  <span className={cn("h-2.5 w-2.5 rounded-full", 
                    request.status === 'approved' ? 'bg-emerald-400 animate-pulse' : 
                    request.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'
                  )} />
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </p>
              </div>
              <StatusBadge status={request.status} />
            </div>

            {/* Details Metadata Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bg-secondary/35 border border-border-subtle p-3 rounded-xl space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <User className="h-3 w-3" /> Requested By
                </span>
                <p className="text-xs font-bold text-foreground">{request.creatorName}</p>
                <p className="text-[10px] text-muted-foreground">@{request.creatorUsername}</p>
              </div>
              <div className="bg-bg-secondary/35 border border-border-subtle p-3 rounded-xl space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <User className="h-3 w-3" /> Approver
                </span>
                <p className="text-xs font-bold text-foreground">{request.approverName}</p>
                <p className="text-[10px] text-muted-foreground">@{request.approverUsername}</p>
              </div>

              {request.startDate && (
                <div className="bg-bg-secondary/35 border border-border-subtle p-3 rounded-xl col-span-2 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Request Timeline
                    </span>
                    <p className="text-xs font-bold text-foreground">
                      {formatDate(request.startDate)} {request.endDate && request.endDate !== request.startDate ? ` → ${formatDate(request.endDate)}` : ''}
                    </p>
                  </div>
                  {duration && (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-bg-tertiary text-foreground border border-border-default shrink-0">
                      {duration}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Request Timeline Visualization */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status Progress</h3>
              <div className="relative pl-6 space-y-4 border-l border-border-subtle ml-3">
                {/* Step 1: Created */}
                <div className="relative">
                  <span className="absolute -left-[30px] top-1 h-4.5 w-4.5 rounded-full border border-emerald-400 bg-emerald-400/20 flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Request Created</p>
                    <p className="text-[10px] text-muted-foreground">Submitted by {request.creatorName} · {timeAgo(request.createdAt)}</p>
                  </div>
                </div>

                {/* Step 2: Under Review */}
                <div className="relative">
                  <span className={cn(
                    "absolute -left-[30px] top-1 h-4.5 w-4.5 rounded-full border flex items-center justify-center",
                    request.status !== 'pending' 
                      ? 'border-emerald-400 bg-emerald-400/20' 
                      : 'border-amber-400 bg-amber-400/20 animate-pulse'
                  )}>
                    {request.status !== 'pending' ? (
                      <Check className="h-2.5 w-2.5 text-emerald-400" />
                    ) : (
                      <Clock className="h-2.5 w-2.5 text-amber-400 animate-spin" />
                    )}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Under Manager Review</p>
                    <p className="text-[10px] text-muted-foreground">Assigned to {request.approverName}</p>
                  </div>
                </div>

                {/* Step 3: Decision */}
                <div className="relative">
                  <span className={cn(
                    "absolute -left-[30px] top-1 h-4.5 w-4.5 rounded-full border flex items-center justify-center",
                    request.status === 'approved' ? 'border-emerald-400 bg-emerald-400/20' :
                    request.status === 'rejected' ? 'border-red-400 bg-red-400/20' :
                    'border-border-default bg-bg-secondary'
                  )}>
                    {request.status === 'approved' && <Check className="h-2.5 w-2.5 text-emerald-400" />}
                    {request.status === 'rejected' && <X className="h-2.5 w-2.5 text-red-400" />}
                    {request.status === 'pending' && <span className="h-1.5 w-1.5 rounded-full bg-text-muted/40" />}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">
                      {request.status === 'pending' ? 'Final Decision' : `Decision: ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}`}
                    </p>
                    {request.status !== 'pending' && (
                      <p className="text-[10px] text-muted-foreground">
                        Processed by {request.approverName} · {timeAgo(request.updatedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-2.5">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <ClipboardList className="h-3.5 w-3.5" /> Details & Description
              </h3>
              <div className="p-4 rounded-xl border border-border-default bg-bg-secondary/35 text-xs leading-relaxed text-foreground select-text whitespace-pre-wrap">
                {request.description}
              </div>
            </div>

            {/* Review Note Display if exists */}
            {request.approverNote && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Approver Review Note</h3>
                <div className="p-3 rounded-xl border border-emerald-400/10 bg-emerald-400/5 text-xs italic text-foreground leading-relaxed whitespace-pre-wrap select-text">
                  "{request.approverNote}"
                </div>
              </div>
            )}
          </div>

          {/* Action Panel Footer */}
          <div className="p-6 border-t border-border-subtle bg-bg-secondary/40 shrink-0 space-y-4">
            {/* 1. If Approver is Viewing + Pending -> Review Controls */}
            {!isSent && request.status === 'pending' && (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Add Decision Notes (Optional)</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-border-default bg-bg-secondary text-xs text-foreground placeholder:text-muted-foreground outline-none hover:bg-bg-tertiary focus:border-primary/30 transition-all resize-none shadow-inner"
                    placeholder="Provide comments or leave empty..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => act('rejected')}
                    disabled={acting}
                    className="flex-1 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    Reject
                  </button>
                  <button
                    onClick={() => act('approved')}
                    disabled={acting}
                    className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    style={{
                      background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.12) c h) 100%)`,
                      boxShadow: `0 4px 12px oklch(from var(--accent) l c h / 15%)`
                    }}
                  >
                    {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Approve Request
                  </button>
                </div>
              </div>
            )}

            {/* 2. If Sender is Viewing + Pending -> Sender Controls (Reminder & Withdraw) */}
            {isSent && request.status === 'pending' && (
              <div className="space-y-3">
                {showWithdrawConfirm ? (
                  <div className="bg-red-500/10 border border-red-500/25 p-4 rounded-xl space-y-3">
                    <p className="text-xs font-bold text-foreground text-center">Are you sure you want to withdraw this request?</p>
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => setShowWithdrawConfirm(false)}
                        disabled={withdrawing}
                        className="flex-1 py-2 rounded-lg bg-bg-secondary border border-border-default hover:bg-bg-tertiary text-xs font-bold text-muted-foreground transition-all cursor-pointer"
                      >
                        Keep Request
                      </button>
                      <button
                        onClick={handleWithdraw}
                        disabled={withdrawing}
                        className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {withdrawing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Yes, Withdraw
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowWithdrawConfirm(true)}
                      className="flex-1 py-2.5 rounded-xl border border-border-default bg-bg-secondary hover:bg-bg-tertiary hover:border-red-500/25 hover:text-red-400 text-xs font-bold text-muted-foreground transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Withdraw Request
                    </button>
                    <button
                      onClick={handleSendReminder}
                      disabled={reminding || reminderSent}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer border",
                        reminderSent 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'border-border-default bg-bg-secondary text-foreground hover:bg-bg-tertiary'
                      )}
                    >
                      {reminding ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : reminderSent ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Bell className="h-3.5 w-3.5" />
                      )}
                      {reminderSent ? 'Reminder Sent' : 'Send Reminder'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. If Decided -> Close / Finished Info */}
            {request.status !== 'pending' && (
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-border-default hover:bg-bg-secondary text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                Close Details
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="relative w-full max-w-lg h-full bg-surface/97 backdrop-blur-2xl border-l border-border-default shadow-2xl flex flex-col overflow-hidden select-text z-10"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-border-subtle bg-bg-secondary/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn("p-2.5 rounded-xl border shrink-0", theme.bg, theme.border, theme.text)}
              style={{ color: theme.accent, borderColor: `${theme.accent}30` }}
            >
              <RequestIcon name={REQUEST_TYPE_ICONS[request.type]} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground leading-tight truncate tracking-tight">{request.title}</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold uppercase tracking-wider">{REQUEST_TYPE_LABELS[request.type]}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={copySummary}
              title="Copy details summary"
              className="p-2 rounded-xl border border-border-default bg-bg-secondary hover:bg-bg-tertiary hover:text-foreground text-muted-foreground transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={() => window.print()}
              title="Print request details"
              className="p-2 rounded-xl border border-border-default bg-bg-secondary hover:bg-bg-tertiary hover:text-foreground text-muted-foreground transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto aether-scroll p-6 space-y-6">
          {/* Status Large Block */}
          <div className={cn("p-4 rounded-2xl border flex items-center justify-between relative overflow-hidden bg-bg-secondary/35 border-border-subtle")}>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Status</p>
              <p className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-full", 
                  request.status === 'approved' ? 'bg-emerald-400 animate-pulse' : 
                  request.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'
                )} />
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </p>
            </div>
            <StatusBadge status={request.status} />
          </div>

          {/* Details Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-bg-secondary/35 border border-border-subtle p-3 rounded-xl space-y-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <User className="h-3 w-3" /> Requested By
              </span>
              <p className="text-xs font-bold text-foreground">{request.creatorName}</p>
              <p className="text-[10px] text-muted-foreground">@{request.creatorUsername}</p>
            </div>
            <div className="bg-bg-secondary/35 border border-border-subtle p-3 rounded-xl space-y-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <User className="h-3 w-3" /> Approver
              </span>
              <p className="text-xs font-bold text-foreground">{request.approverName}</p>
              <p className="text-[10px] text-muted-foreground">@{request.approverUsername}</p>
            </div>

            {request.startDate && (
              <div className="bg-bg-secondary/35 border border-border-subtle p-3 rounded-xl col-span-2 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Request Timeline
                  </span>
                  <p className="text-xs font-bold text-foreground">
                    {formatDate(request.startDate)} {request.endDate && request.endDate !== request.startDate ? ` → ${formatDate(request.endDate)}` : ''}
                  </p>
                </div>
                {duration && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-bg-tertiary text-foreground border border-border-default shrink-0">
                    {duration}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Request Timeline Visualization */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status Progress</h3>
            <div className="relative pl-6 space-y-4 border-l border-border-subtle ml-3">
              {/* Step 1: Created */}
              <div className="relative">
                <span className="absolute -left-[30px] top-1 h-4.5 w-4.5 rounded-full border border-emerald-400 bg-emerald-400/20 flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-emerald-400" />
                </span>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Request Created</p>
                  <p className="text-[10px] text-muted-foreground">Submitted by {request.creatorName} · {timeAgo(request.createdAt)}</p>
                </div>
              </div>

              {/* Step 2: Under Review */}
              <div className="relative">
                <span className={cn(
                  "absolute -left-[30px] top-1 h-4.5 w-4.5 rounded-full border flex items-center justify-center",
                  request.status !== 'pending' 
                    ? 'border-emerald-400 bg-emerald-400/20' 
                    : 'border-amber-400 bg-amber-400/20 animate-pulse'
                )}>
                  {request.status !== 'pending' ? (
                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                  ) : (
                    <Clock className="h-2.5 w-2.5 text-amber-400 animate-spin" />
                  )}
                </span>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Under Manager Review</p>
                  <p className="text-[10px] text-muted-foreground">Assigned to {request.approverName}</p>
                </div>
              </div>

              {/* Step 3: Decision */}
              <div className="relative">
                <span className={cn(
                  "absolute -left-[30px] top-1 h-4.5 w-4.5 rounded-full border flex items-center justify-center",
                  request.status === 'approved' ? 'border-emerald-400 bg-emerald-400/20' :
                  request.status === 'rejected' ? 'border-red-400 bg-red-400/20' :
                  'border-border-default bg-bg-secondary'
                )}>
                  {request.status === 'approved' && <Check className="h-2.5 w-2.5 text-emerald-400" />}
                  {request.status === 'rejected' && <X className="h-2.5 w-2.5 text-red-400" />}
                  {request.status === 'pending' && <span className="h-1.5 w-1.5 rounded-full bg-text-muted/40" />}
                </span>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">
                    {request.status === 'pending' ? 'Final Decision' : `Decision: ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}`}
                  </p>
                  {request.status !== 'pending' && (
                    <p className="text-[10px] text-muted-foreground">
                      Processed by {request.approverName} · {timeAgo(request.updatedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <ClipboardList className="h-3.5 w-3.5" /> Details & Description
            </h3>
            <div className="p-4 rounded-xl border border-border-default bg-bg-secondary/35 text-xs leading-relaxed text-foreground select-text whitespace-pre-wrap">
              {request.description}
            </div>
          </div>

          {/* Review Note Display if exists */}
          {request.approverNote && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Approver Review Note</h3>
              <div className="p-3 rounded-xl border border-emerald-400/10 bg-emerald-400/5 text-xs italic text-foreground leading-relaxed whitespace-pre-wrap select-text">
                "{request.approverNote}"
              </div>
            </div>
          )}
        </div>

        {/* Action Panel Footer */}
        <div className="p-6 border-t border-border-subtle bg-bg-secondary/40 shrink-0 space-y-4">
          {/* 1. If Approver is Viewing + Pending -> Review Controls */}
          {!isSent && request.status === 'pending' && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Add Decision Notes (Optional)</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-border-default bg-bg-secondary text-xs text-foreground placeholder:text-muted-foreground outline-none hover:bg-bg-tertiary focus:border-primary/30 transition-all resize-none shadow-inner"
                  placeholder="Provide comments or leave empty..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => act('rejected')}
                  disabled={acting}
                  className="flex-1 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Reject
                </button>
                <button
                  onClick={() => act('approved')}
                  disabled={acting}
                  className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  style={{
                    background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.12) c h) 100%)`,
                    boxShadow: `0 4px 12px oklch(from var(--accent) l c h / 15%)`
                  }}
                >
                  {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Approve Request
                </button>
              </div>
            </div>
          )}

          {/* 2. If Sender is Viewing + Pending -> Sender Controls (Reminder & Withdraw) */}
          {isSent && request.status === 'pending' && (
            <div className="space-y-3">
              {showWithdrawConfirm ? (
                <div className="bg-red-500/10 border border-red-500/25 p-4 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-foreground text-center">Are you sure you want to withdraw this request?</p>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => setShowWithdrawConfirm(false)}
                      disabled={withdrawing}
                      className="flex-1 py-2 rounded-lg bg-bg-secondary border border-border-default hover:bg-bg-tertiary text-xs font-bold text-muted-foreground transition-all cursor-pointer"
                    >
                      Keep Request
                    </button>
                    <button
                      onClick={handleWithdraw}
                      disabled={withdrawing}
                      className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {withdrawing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Yes, Withdraw
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowWithdrawConfirm(true)}
                    className="flex-1 py-2.5 rounded-xl border border-border-default bg-bg-secondary hover:bg-bg-tertiary hover:border-red-500/25 hover:text-red-400 text-xs font-bold text-muted-foreground transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Withdraw Request
                  </button>
                  <button
                    onClick={handleSendReminder}
                    disabled={reminding || reminderSent}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer border",
                      reminderSent 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'border-border-default bg-bg-secondary text-foreground hover:bg-bg-tertiary'
                    )}
                  >
                    {reminding ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : reminderSent ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Bell className="h-3.5 w-3.5" />
                    )}
                    {reminderSent ? 'Reminder Sent' : 'Send Reminder'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. If Decided -> Close / Finished Info */}
          {request.status !== 'pending' && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-border-default hover:bg-bg-secondary text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              Close Details
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
