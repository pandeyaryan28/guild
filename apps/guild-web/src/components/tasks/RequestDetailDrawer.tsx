import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Check, Copy, Printer, User, Calendar, Loader2,
  CheckCircle2, XCircle, Trash2, Bell, Clock, ClipboardList,
  Home, Laptop, Receipt, Stethoscope, ArrowRight, Sparkles,
  ShieldCheck, AlertCircle
} from 'lucide-react';
import {
  updateRequestStatus, deleteRequest, sendRequestReminder,
  REQUEST_TYPE_LABELS, REQUEST_TYPE_ICONS,
  type OrgRequest, type RequestType, type RequestStatus,
} from '../../lib/requests';
import { type UserProfile } from '../../lib/firestore';
import { cn } from '@/lib/utils';

// ─── Request Icon Mapping ─────────────────────────────────────────────────────

const RequestIconMap: Record<string, typeof ClipboardList> = {
  Stethoscope,
  Home,
  Calendar,
  Laptop,
  Receipt,
  ClipboardList,
};

function RequestIcon({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
  const Icon = RequestIconMap[name] || ClipboardList;
  return <Icon className={className} />;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RequestStatus }) {
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider',
        isApproved && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-xs',
        isRejected && 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-xs',
        !isApproved && !isRejected && 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-xs'
      )}
    >
      {isApproved ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      ) : isRejected ? (
        <XCircle className="h-3.5 w-3.5 text-rose-500" />
      ) : (
        <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
      )}
      <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
    </span>
  );
}

// ─── Date Formatter Helpers ───────────────────────────────────────────────────

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

// ─── Printable PDF Component for Official Corporate Audit Records ─────────────

interface RequestPrintPDFProps {
  request: OrgRequest;
  duration: string | null;
}

function RequestPrintPDF({ request, duration }: RequestPrintPDFProps) {
  const printedDate = React.useMemo(() => {
    try {
      return new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return new Date().toLocaleString();
    }
  }, []);

  const submissionDate = React.useMemo(() => {
    if (!request.createdAt) return 'N/A';
    try {
      const date = request.createdAt.toDate ? request.createdAt.toDate() : new Date(Number(request.createdAt));
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  }, [request.createdAt]);

  const updateDate = React.useMemo(() => {
    if (!request.updatedAt) return null;
    try {
      const date = request.updatedAt.toDate ? request.updatedAt.toDate() : new Date(Number(request.updatedAt));
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return null;
    }
  }, [request.updatedAt]);

  return (
    <div className="hidden print:block printable-request-pdf w-full text-black bg-white p-8 font-sans space-y-6">
      {/* Header Banner */}
      <div className="flex justify-between items-start border-b-2 border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-800">GUILD WORKSPACE</h1>
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mt-1">
            Official Request & Approval Record
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 border border-neutral-300">
            Status: {request.status.toUpperCase()}
          </span>
          <p className="text-[10px] text-neutral-400 mt-1.5 font-mono">Ref ID: {request.id}</p>
        </div>
      </div>

      {/* Request Title & Type */}
      <div className="space-y-1">
        <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Request Title & Type</span>
        <h2 className="text-xl font-bold text-neutral-800 leading-tight">{request.title}</h2>
        <p className="text-xs text-neutral-600 font-medium">Type: {REQUEST_TYPE_LABELS[request.type]}</p>
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-2 gap-6 border-t border-b border-neutral-200 py-4">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold block mb-1">Requested By</span>
          <p className="text-sm font-bold text-neutral-800">{request.creatorName}</p>
          <p className="text-xs text-neutral-500">@{request.creatorUsername}</p>
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold block mb-1">Assigned Approver</span>
          <p className="text-sm font-bold text-neutral-800">{request.approverName}</p>
          <p className="text-xs text-neutral-500">@{request.approverUsername}</p>
        </div>
      </div>

      {/* Timeline Grid */}
      {request.startDate && (
        <div className="space-y-1.5">
          <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold block">Proposed Dates & Duration</span>
          <div className="flex items-center justify-between bg-neutral-50 p-3 border border-neutral-200">
            <p className="text-xs font-bold text-neutral-700">
              {formatDate(request.startDate)} {request.endDate && request.endDate !== request.startDate ? ` → ${formatDate(request.endDate)}` : ''}
            </p>
            {duration && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-200 text-neutral-800 border border-neutral-300">
                {duration}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Description Section */}
      <div className="space-y-1.5">
        <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold block">Details & Description</span>
        <div className="p-4 bg-white border border-neutral-200 text-xs leading-relaxed text-neutral-800 whitespace-pre-wrap min-h-[100px] rounded-sm">
          {request.description}
        </div>
      </div>

      {/* Approver Note */}
      {request.approverNote && (
        <div className="space-y-1.5">
          <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold block">Approver Review Note</span>
          <div className="p-3 bg-neutral-50 border border-neutral-200 text-xs italic text-neutral-800 whitespace-pre-wrap rounded-sm">
            "{request.approverNote}"
          </div>
        </div>
      )}

      {/* Approval Status History */}
      <div className="space-y-2">
        <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold block">Approval Status History</span>
        <div className="space-y-3 pl-4 border-l border-neutral-300 ml-2">
          <div className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <p className="text-xs font-bold text-neutral-800">Submitted</p>
            <p className="text-[10px] text-neutral-500">by {request.creatorName} on {submissionDate}</p>
          </div>
          <div className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-amber-500" />
            <p className="text-xs font-bold text-neutral-800">Under Review</p>
            <p className="text-[10px] text-neutral-500">Assigned to {request.approverName}</p>
          </div>
          {request.status !== 'pending' && (
            <div className="relative">
              <span className={cn('absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full', request.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500')} />
              <p className="text-xs font-bold text-neutral-800">
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </p>
              {updateDate && (
                <p className="text-[10px] text-neutral-500">
                  Processed by {request.approverName} on {updateDate}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Signature Section */}
      <div className="pt-8 grid grid-cols-2 gap-12">
        <div className="space-y-4">
          <div className="border-b border-neutral-400 h-8" />
          <p className="text-[9px] text-center text-neutral-500 font-bold uppercase tracking-wider">Requested By (Signature)</p>
        </div>
        <div className="space-y-4">
          <div className="border-b border-neutral-400 h-8" />
          <p className="text-[9px] text-center text-neutral-500 font-bold uppercase tracking-wider">Approver (Signature)</p>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-8 text-center text-[9px] text-neutral-400 border-t border-neutral-100 flex justify-between items-center">
        <span>Generated via Guild Workspace</span>
        <span>Printed on: {printedDate}</span>
      </div>
    </div>
  );
}

// ─── Main Drawer Component ────────────────────────────────────────────────────

export interface RequestDetailDrawerProps {
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
  const [withdrawing, setWithdrawing] = React.useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Lock body scroll when drawer is open as a modal
  React.useEffect(() => {
    if (!request || inline) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [request, inline]);

  if (!request) return null;

  const isSent = request.creatorId === currentUser.uid;
  const isApprover = request.approverId === currentUser.uid;
  const isManagerOrAdmin =
    currentUser.role === 'owner' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'manager' ||
    currentUser.isManager === true;
  const canApproveOrReject = !isSent && (isApprover || isManagerOrAdmin);

  // Calculate Duration
  const duration = React.useMemo(() => {
    if (!request.startDate) return null;
    const start = new Date(request.startDate);
    const end = request.endDate ? new Date(request.endDate) : start;
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays <= 0) return '1 day';
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  }, [request.startDate, request.endDate]);

  // Handle Approve / Reject
  async function act(status: 'approved' | 'rejected') {
    if (!request) return;
    setActing(true);
    try {
      await updateRequestStatus(
        request.id,
        orgId,
        status,
        currentUser.uid,
        currentUser.fullName,
        currentUser.username,
        request.creatorId,
        request.title,
        note.trim() || undefined
      );
      onClose();
    } catch (err) {
      console.error('Failed to update request status:', err);
    } finally {
      setActing(false);
    }
  }

  // Handle Send Reminder
  async function handleSendReminder() {
    if (!request || reminding || reminderSent) return;
    setReminding(true);
    try {
      await sendRequestReminder({
        orgId,
        creatorId: currentUser.uid,
        creatorName: currentUser.fullName,
        approverId: request.approverId,
        title: request.title,
      });
      setReminderSent(true);
      setTimeout(() => setReminderSent(false), 5000);
    } catch (err) {
      console.error('Failed to send reminder:', err);
    } finally {
      setReminding(false);
    }
  }

  // Handle Withdraw Request
  async function handleWithdraw() {
    if (!request || withdrawing) return;
    setWithdrawing(true);
    try {
      await deleteRequest(request.id);
      onClose();
    } catch (err) {
      console.error('Failed to withdraw request:', err);
    } finally {
      setWithdrawing(false);
    }
  }

  // Copy Summary to Clipboard
  function copySummary() {
    if (!request) return;
    const lines = [
      `Request: ${request.title}`,
      `Type: ${REQUEST_TYPE_LABELS[request.type]}`,
      `Status: ${request.status.toUpperCase()}`,
      `Requested By: ${request.creatorName} (@${request.creatorUsername})`,
      `Approver: ${request.approverName} (@${request.approverUsername})`,
      request.startDate ? `Dates: ${request.startDate}${request.endDate ? ` to ${request.endDate}` : ''}` : null,
      request.description ? `Details: ${request.description}` : null,
      request.approverNote ? `Decision Note: "${request.approverNote}"` : null,
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Reusable Main Body Content
  const panelContent = (
    <div className="flex flex-col h-full bg-surface text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4.5 border-b border-border bg-secondary/40 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
            <RequestIcon name={REQUEST_TYPE_ICONS[request.type]} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground leading-tight truncate tracking-tight">
              {request.title}
            </h2>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
              {REQUEST_TYPE_LABELS[request.type]}
            </p>
          </div>
        </div>

        {/* Top Action Pills */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copySummary}
            title="Copy summary"
            className="p-2 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold active:scale-[0.97]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            title="Print request document"
            className="p-2 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-[0.97]"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {/* Status Hero Card */}
        <div className="p-4 rounded-3xl bg-secondary/50 dark:bg-secondary/30 border border-border dark:border-border-strong flex items-center justify-between shadow-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Current Executive Status
            </span>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  request.status === 'approved' && 'bg-emerald-500',
                  request.status === 'rejected' && 'bg-rose-500',
                  request.status === 'pending' && 'bg-amber-500 animate-pulse'
                )}
              />
              <span className="text-sm font-extrabold text-foreground capitalize">
                {request.status}
              </span>
            </div>
          </div>
          <StatusBadge status={request.status} />
        </div>

        {/* Stakeholders & Timeline Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Requester */}
          <div className="p-3.5 rounded-2xl bg-surface border border-border/80 dark:border-border-strong space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3 w-3 text-primary" /> Requested By
            </span>
            <p className="text-xs font-bold text-foreground leading-snug">{request.creatorName}</p>
            <p className="text-[10px] text-muted-foreground">@{request.creatorUsername}</p>
          </div>

          {/* Approver */}
          <div className="p-3.5 rounded-2xl bg-surface border border-border/80 dark:border-border-strong space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-primary" /> Approver
            </span>
            <p className="text-xs font-bold text-foreground leading-snug">{request.approverName}</p>
            <p className="text-[10px] text-muted-foreground">@{request.approverUsername}</p>
          </div>

          {/* Proposed Dates */}
          {request.startDate && (
            <div className="sm:col-span-2 p-3.5 rounded-2xl bg-surface border border-border/80 dark:border-border-strong flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-primary" /> Proposed Window
                </span>
                <p className="text-xs font-semibold text-foreground">
                  {formatDate(request.startDate)} {request.endDate && request.endDate !== request.startDate ? ` → ${formatDate(request.endDate)}` : ''}
                </p>
              </div>
              {duration && (
                <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-secondary text-foreground border border-border">
                  {duration}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Visual 3-Step Journey Timeline */}
        <div className="space-y-3 pt-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Approval Stream Journey
          </span>
          <div className="relative pl-6 space-y-4 border-l-2 border-border/70 ml-2">
            {/* Step 1: Created */}
            <div className="relative">
              <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-emerald-500 bg-surface flex items-center justify-center">
                <Check className="h-2.5 w-2.5 text-emerald-500" />
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Request Submitted</p>
                <p className="text-[10px] text-muted-foreground">
                  By {request.creatorName} · {timeAgo(request.createdAt)}
                </p>
              </div>
            </div>

            {/* Step 2: Under Review */}
            <div className="relative">
              <span
                className={cn(
                  'absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 bg-surface flex items-center justify-center',
                  request.status !== 'pending' ? 'border-emerald-500' : 'border-amber-500'
                )}
              >
                {request.status !== 'pending' ? (
                  <Check className="h-2.5 w-2.5 text-emerald-500" />
                ) : (
                  <Clock className="h-2.5 w-2.5 text-amber-500 animate-spin" />
                )}
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Executive Review</p>
                <p className="text-[10px] text-muted-foreground">
                  Assigned to {request.approverName}
                </p>
              </div>
            </div>

            {/* Step 3: Decision */}
            <div className="relative">
              <span
                className={cn(
                  'absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 bg-surface flex items-center justify-center',
                  request.status === 'approved' && 'border-emerald-500 text-emerald-500',
                  request.status === 'rejected' && 'border-rose-500 text-rose-500',
                  request.status === 'pending' && 'border-border text-muted-foreground'
                )}
              >
                {request.status === 'approved' && <Check className="h-2.5 w-2.5" />}
                {request.status === 'rejected' && <X className="h-2.5 w-2.5" />}
                {request.status === 'pending' && <span className="h-1.5 w-1.5 rounded-full bg-border" />}
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">
                  {request.status === 'pending'
                    ? 'Awaiting Decision'
                    : `Decision: ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}`}
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

        {/* Details & Description */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardList className="h-3 w-3 text-primary" /> Request Context & Details
          </span>
          <div className="p-4 rounded-2xl bg-secondary/40 border border-border/80 text-xs text-foreground leading-relaxed whitespace-pre-wrap select-text">
            {request.description || 'No additional details provided.'}
          </div>
        </div>

        {/* Approver Decision Note */}
        {request.approverNote && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Approver Feedback Note
            </span>
            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-xs italic text-foreground leading-relaxed whitespace-pre-wrap">
              “{request.approverNote}”
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-5 border-t border-border bg-secondary/30 shrink-0 space-y-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
        {/* Approver Controls */}
        {canApproveOrReject && request.status === 'pending' && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Add Decision Note (Optional)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Include feedback or approval details…"
                className="w-full text-xs bg-surface border border-border rounded-xl px-3 py-2 outline-none text-foreground placeholder:text-muted-foreground/60 resize-none shadow-xs"
              />
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => act('rejected')}
                disabled={acting}
                className="flex-1 py-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
              >
                {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                Reject
              </button>
              <button
                type="button"
                onClick={() => act('approved')}
                disabled={acting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Approve Request
              </button>
            </div>
          </div>
        )}

        {/* Sender Controls: Reminder & Withdraw */}
        {isSent && request.status === 'pending' && (
          <div>
            {showWithdrawConfirm ? (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2.5">
                <p className="text-xs font-bold text-foreground text-center">
                  Withdraw this request permanently?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawConfirm(false)}
                    disabled={withdrawing}
                    className="flex-1 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={withdrawing}
                    className="flex-1 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 cursor-pointer flex items-center justify-center gap-1"
                  >
                    {withdrawing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Confirm Withdraw
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowWithdrawConfirm(true)}
                  className="flex-1 py-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-rose-500 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Withdraw
                </button>
                <button
                  type="button"
                  onClick={handleSendReminder}
                  disabled={reminding || reminderSent}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 border',
                    reminderSent
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                      : 'bg-primary text-primary-foreground hover:bg-primary/95 border-primary shadow-xs'
                  )}
                >
                  {reminding ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : reminderSent ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Bell className="h-3.5 w-3.5" />
                  )}
                  <span>{reminderSent ? 'Reminder Sent' : 'Send Reminder'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Decided / Historical: Close Details */}
        {request.status !== 'pending' && (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-xs font-bold text-foreground transition-all cursor-pointer"
          >
            Close Details
          </button>
        )}
      </div>

      <RequestPrintPDF request={request} duration={duration} />
    </div>
  );

  // If inline, return inline component
  if (inline) {
    return (
      <div className="w-full rounded-3xl border border-border overflow-hidden bg-surface shadow-lg">
        {panelContent}
      </div>
    );
  }

  // Otherwise, render full slide-over drawer in Portal
  const drawerModal = (
    <div className="fixed inset-0 z-[70] flex justify-end pointer-events-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs z-[65] pointer-events-auto"
      />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="relative z-[70] w-full max-w-lg h-full bg-surface/98 dark:bg-surface/95 backdrop-blur-2xl border-l border-border shadow-2xl flex flex-col overflow-hidden select-text pointer-events-auto print:hidden"
      >
        {panelContent}
      </motion.div>
      <RequestPrintPDF request={request} duration={duration} />
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawerModal, document.body) : drawerModal;
}
