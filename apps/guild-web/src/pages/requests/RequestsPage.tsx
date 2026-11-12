import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, CheckCircle2, XCircle, Clock,
  ChevronDown, X, Loader2, FileText, Calendar,
  Stethoscope, Home, Laptop, Receipt, ClipboardList,
  Inbox, Send, Trash2, Bell, Copy, Printer, Check,
  ArrowRight, User, Briefcase, Info, Sparkles,
  ShieldCheck, AlertTriangle, Filter, CheckCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useRequests } from '../../hooks/useRequests';
import { useOrgMembers } from '../../hooks/useChat';
import { useTeams, type Team } from '../../hooks/useTeams';
import {
  createRequest, updateRequestStatus, deleteRequest, sendRequestReminder,
  REQUEST_TYPE_LABELS, REQUEST_TYPE_ICONS,
  type OrgRequest, type RequestType, type RequestStatus,
} from '../../lib/requests';
import { type UserProfile } from '../../lib/firestore';
import { cn } from '@/lib/utils';
import { RequestDetailDrawer } from '../../components/tasks/RequestDetailDrawer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getDurationText(startDate?: string | null, endDate?: string | null): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (diff <= 0) return '1 day';
  return diff === 1 ? '1 day' : `${diff} days`;
}

const AVATAR_COLORS = [
  'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
];

function getAvatarColor(id: string = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Journey Tab Types ────────────────────────────────────────────────────────

type JourneySection = 'pending_approvals' | 'approved_history' | 'created_by_me' | 'all';

// ─── Create Request Modal (Apple macOS / iOS Sheet Style) ──────────────────────

function CreateRequestModal({
  orgId, members, teams, currentUser, onClose,
}: {
  orgId: string;
  members: UserProfile[];
  teams: Team[];
  currentUser: UserProfile;
  onClose: () => void;
}) {
  const [search, setSearch] = React.useState('');
  const [selectedMember, setSelectedMember] = React.useState<UserProfile | null>(null);
  const [type, setType] = React.useState<RequestType>('sick_leave');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [error, setError] = React.useState('');

  // Pre-populate approver with direct line manager or team manager
  React.useEffect(() => {
    if (currentUser.managerId) {
      const directMgr = members.find((m) => m.uid === currentUser.managerId);
      if (directMgr) {
        setSelectedMember(directMgr);
        return;
      }
    }

    const myTeam = teams.find((t) => t.memberIds.includes(currentUser.uid));
    if (myTeam) {
      const teamMgr = members.find((m) => m.uid === myTeam.managerId);
      if (teamMgr) {
        setSelectedMember(teamMgr);
      }
    }
  }, [currentUser.managerId, currentUser.uid, members, teams]);

  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const filtered = members.filter(
    (m) =>
      m.uid !== currentUser.uid &&
      (m.fullName.toLowerCase().includes(search.toLowerCase()) ||
        m.username.toLowerCase().includes(search.toLowerCase())),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMember) { setError('Please choose an approver.'); return; }
    if (!title.trim()) { setError('Please enter a request title.'); return; }
    if (!description.trim()) { setError('Please include context and details.'); return; }
    setSubmitting(true);
    try {
      await createRequest({
        orgId,
        creatorId: currentUser.uid,
        creatorName: currentUser.fullName,
        creatorUsername: currentUser.username,
        approverId: selectedMember.uid,
        approverName: selectedMember.fullName,
        approverUsername: selectedMember.username,
        type,
        title: title.trim(),
        description: description.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      onClose();
    } catch (err) {
      setError('Failed to submit request. Please try again.');
      setSubmitting(false);
    }
  }

  const calculatedDuration = getDurationText(startDate, endDate);

  const modalContent = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs z-[65] pointer-events-auto"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="relative z-[70] w-full max-w-lg max-h-[90vh] flex flex-col bg-surface/98 dark:bg-surface/95 backdrop-blur-2xl border border-border dark:border-border-strong rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-border bg-secondary/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Initiate Operational Request</h2>
              <p className="text-[10px] text-muted-foreground">Submit for executive review and sign-off</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4.5">
            {/* Request Type Category Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(REQUEST_TYPE_LABELS) as [RequestType, string][]).map(([k, label]) => {
                  const isSelected = type === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setType(k)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition-all cursor-pointer active:scale-[0.98]',
                        isSelected
                          ? 'border-primary/50 bg-primary/10 text-primary font-bold shadow-xs'
                          : 'border-border/70 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                      )}
                    >
                      <div className={cn('p-1 rounded-xl', isSelected ? 'text-primary' : 'text-muted-foreground')}>
                        <RequestIcon name={REQUEST_TYPE_ICONS[k]} className="h-4 w-4" />
                      </div>
                      <span className="text-[11px] leading-tight truncate w-full">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Approver Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Assigned Approver
              </label>
              <div className="relative">
                <div
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border border-border bg-secondary/50 cursor-text focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs"
                  onClick={() => setShowDropdown(true)}
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {selectedMember ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[8px] shrink-0',
                          getAvatarColor(selectedMember.uid)
                        )}
                      >
                        {selectedMember.fullName[0]}
                      </div>
                      <span className="text-xs font-bold text-foreground truncate">{selectedMember.fullName}</span>
                      <span className="text-[11px] text-muted-foreground truncate">@{selectedMember.username}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMember(null);
                          setSearch('');
                        }}
                        className="ml-auto text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <input
                      className="flex-1 bg-transparent text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
                      placeholder="Search manager or approver by name..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                    />
                  )}
                </div>

                {showDropdown && !selectedMember && (
                  <div className="absolute z-20 top-full mt-1.5 w-full bg-surface border border-border dark:border-border-strong rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar backdrop-blur-2xl p-1">
                    {filtered.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-4 py-3 text-center">No teammates found</p>
                    ) : (
                      filtered.map((m) => (
                        <button
                          key={m.uid}
                          type="button"
                          onClick={() => {
                            setSelectedMember(m);
                            setShowDropdown(false);
                            setSearch('');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary text-left transition-colors cursor-pointer"
                        >
                          <div
                            className={cn(
                              'h-6 w-6 rounded-full border text-[9px] font-bold flex items-center justify-center shrink-0',
                              getAvatarColor(m.uid)
                            )}
                          >
                            {m.fullName[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{m.fullName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">@{m.username}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Request Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Title & Objective
              </label>
              <input
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-secondary/50 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
                placeholder="e.g. Sick Leave — 2 days, or MacBook Pro battery replacement"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
              />
            </div>

            {/* Date Window */}
            {['sick_leave', 'work_from_home', 'time_off'].includes(type) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-primary" /> Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/50 text-xs text-foreground outline-none focus:border-primary/40 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-primary" /> End Date
                    </label>
                    {calculatedDuration && (
                      <span className="text-[10px] font-bold text-primary">{calculatedDuration}</span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/50 text-xs text-foreground outline-none focus:border-primary/40 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>
            )}

            {/* Details Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Context & Business Justification
              </label>
              <textarea
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-secondary/50 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all shadow-xs resize-none leading-relaxed"
                placeholder="Explain the necessity, handover plan, or expense receipts…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 font-semibold">
                {error}
              </p>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex gap-3 p-5 border-t border-border bg-secondary/30 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-primary/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting…</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

// ─── Executive Request Card ───────────────────────────────────────────────────

function ExecutiveRequestCard({
  req,
  isSent,
  currentUser,
  orgId,
  onSelect,
  onAction,
}: {
  req: OrgRequest;
  isSent: boolean;
  currentUser: UserProfile;
  orgId: string;
  onSelect?: (req: OrgRequest) => void;
  onAction?: () => void;
}) {
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectNote, setRejectNote] = React.useState('');
  const [acting, setActing] = React.useState(false);

  const duration = getDurationText(req.startDate, req.endDate);

  const isPending = req.status === 'pending';
  const isApproved = req.status === 'approved';
  const isRejected = req.status === 'rejected';

  // Can current user approve/reject this?
  const canDecide = !isSent && isPending;

  async function handleApprove(e: React.MouseEvent) {
    e.stopPropagation();
    setActing(true);
    try {
      await updateRequestStatus(
        req.id,
        orgId,
        'approved',
        currentUser.uid,
        currentUser.fullName,
        currentUser.username,
        req.creatorId,
        req.title
      );
      onAction?.();
    } catch (err) {
      console.error('Failed to approve request:', err);
    } finally {
      setActing(false);
    }
  }

  async function handleReject(e: React.MouseEvent) {
    e.stopPropagation();
    setActing(true);
    try {
      await updateRequestStatus(
        req.id,
        orgId,
        'rejected',
        currentUser.uid,
        currentUser.fullName,
        currentUser.username,
        req.creatorId,
        req.title,
        rejectNote.trim() || undefined
      );
      setRejectOpen(false);
      setRejectNote('');
      onAction?.();
    } catch (err) {
      console.error('Failed to reject request:', err);
    } finally {
      setActing(false);
    }
  }

  return (
    <motion.div
      layout="position"
      onClick={() => onSelect?.(req)}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'group relative rounded-2xl p-4 sm:p-5 transition-all cursor-pointer',
        'bg-surface/90 dark:bg-surface/50 border border-border/80 dark:border-border/60',
        'shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-border'
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        {/* Left: Icon + Title + Metadata */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center text-primary shrink-0 shadow-xs">
            <RequestIcon name={REQUEST_TYPE_ICONS[req.type]} className="h-4.5 w-4.5" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                {REQUEST_TYPE_LABELS[req.type]}
              </span>

              {duration && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-secondary text-muted-foreground border border-border/60">
                  {duration}
                </span>
              )}

              {(req.startDate || req.endDate) && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                  <Calendar className="h-3 w-3 text-muted-foreground/60" />
                  <span>
                    {formatDate(req.startDate)}
                    {req.endDate && req.endDate !== req.startDate ? ` → ${formatDate(req.endDate)}` : ''}
                  </span>
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-foreground leading-snug tracking-tight">
              {req.title}
            </h3>

            {req.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {req.description}
              </p>
            )}

            {/* Requester -> Approver trail */}
            <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'w-4.5 h-4.5 rounded-full border flex items-center justify-center font-bold text-[8px] shrink-0',
                    getAvatarColor(req.creatorId)
                  )}
                >
                  {req.creatorName?.[0] || 'U'}
                </div>
                <span className="font-semibold text-foreground">
                  @{req.creatorUsername || req.creatorName}
                </span>
              </div>

              <ArrowRight className="w-3 h-3 text-muted-foreground/60" />

              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'w-4.5 h-4.5 rounded-full border flex items-center justify-center font-bold text-[8px] shrink-0',
                    getAvatarColor(req.approverId)
                  )}
                >
                  {req.approverName?.[0] || 'A'}
                </div>
                <span className="font-semibold text-foreground">
                  @{req.approverUsername || req.approverName}
                </span>
              </div>

              <span className="opacity-40">·</span>
              <span className="font-mono text-[10px]">{timeAgo(req.createdAt)}</span>
            </div>

            {/* Approver Note Display if decided */}
            {req.approverNote && (
              <div className="mt-2 p-2.5 rounded-xl bg-secondary/50 border border-border/60 text-[11px] italic text-muted-foreground">
                “{req.approverNote}”
              </div>
            )}
          </div>
        </div>

        {/* Right: Status Pill & Rapid Decision Controls */}
        <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-start gap-2.5 shrink-0 pt-2 sm:pt-0">
          {/* Status Badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider',
              isApproved && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-xs',
              isRejected && 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-xs',
              isPending && 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-xs'
            )}
          >
            {isApproved ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : isRejected ? (
              <XCircle className="h-3.5 w-3.5 text-rose-500" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            )}
            <span>{req.status}</span>
          </span>

          {/* 1-Click Approve / Reject for Approver */}
          {canDecide && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                disabled={acting}
                onClick={handleApprove}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1 active:scale-[0.97] shadow-xs disabled:opacity-50"
              >
                {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Approve</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRejectOpen(!rejectOpen)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1 active:scale-[0.97] shadow-xs"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>

                {rejectOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-64 p-3.5 bg-surface border border-border dark:border-border-strong rounded-2xl shadow-2xl z-50 backdrop-blur-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs font-bold text-foreground mb-1.5">Reject this request?</p>
                    <input
                      type="text"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Reason for rejection (optional)..."
                      className="w-full text-xs bg-secondary/60 rounded-xl px-2.5 py-1.5 outline-none text-foreground placeholder:text-muted-foreground mb-2.5 border border-border"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectOpen(false);
                          setRejectNote('');
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={acting}
                        onClick={handleReject}
                        className="px-3 py-1 text-xs font-semibold bg-rose-500 text-white rounded-xl hover:bg-rose-600 active:scale-[0.97] cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {acting ? 'Rejecting…' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main RequestsPage Component ──────────────────────────────────────────────

export function RequestsPage() {
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { sent, received, pendingCount, loading } = useRequests(orgId);
  const members = useOrgMembers(orgId);
  const { teams } = useTeams(orgId);

  const [activeSection, setActiveSection] = React.useState<JourneySection>('pending_approvals');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [activeDetailRequest, setActiveDetailRequest] = React.useState<OrgRequest | null>(null);

  if (!userProfile || !orgId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Combined unique requests for organizational oversight
  const allRequests = React.useMemo(() => {
    const map = new Map<string, OrgRequest>();
    for (const r of received) map.set(r.id, r);
    for (const r of sent) map.set(r.id, r);
    return Array.from(map.values()).sort((a, b) => {
      const aMs = a.createdAt?.toMillis ? a.createdAt.toMillis() : Number(a.createdAt || 0);
      const bMs = b.createdAt?.toMillis ? b.createdAt.toMillis() : Number(b.createdAt || 0);
      return bMs - aMs;
    });
  }, [received, sent]);

  // Executive Overview Metrics
  const overviewStats = React.useMemo(() => {
    const pendingToDecide = received.filter((r) => r.status === 'pending').length;
    const myInFlight = sent.filter((r) => r.status === 'pending').length;
    const totalResolved = allRequests.filter((r) => r.status === 'approved' || r.status === 'rejected').length;
    const totalApproved = allRequests.filter((r) => r.status === 'approved').length;
    const approvalRate = totalResolved > 0 ? Math.round((totalApproved / totalResolved) * 100) : 100;

    return {
      pendingToDecide,
      myInFlight,
      totalResolved,
      approvalRate
    };
  }, [received, sent, allRequests]);

  // Active dataset based on selected Journey Section
  const datasetForSection = React.useMemo(() => {
    if (activeSection === 'pending_approvals') {
      return received.filter((r) => r.status === 'pending');
    }
    if (activeSection === 'approved_history') {
      return allRequests.filter((r) => r.status === 'approved' || r.status === 'rejected');
    }
    if (activeSection === 'created_by_me') {
      return sent;
    }
    return allRequests;
  }, [activeSection, received, sent, allRequests]);

  // Filtered dataset by search & status
  const filteredList = React.useMemo(() => {
    return datasetForSection.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (req.title || '').toLowerCase().includes(q);
        const matchDesc = (req.description || '').toLowerCase().includes(q);
        const matchCreator = (req.creatorName || '').toLowerCase().includes(q);
        const matchApprover = (req.approverName || '').toLowerCase().includes(q);
        const matchCat = REQUEST_TYPE_LABELS[req.type]?.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchCreator || matchApprover || matchCat;
      }
      return true;
    });
  }, [datasetForSection, statusFilter, searchQuery]);

  return (
    <div className="min-h-full w-full bg-background text-foreground flex flex-col antialiased selection:bg-primary/20 selection:text-primary">
      {/* ── Top Header: Apple SwiftUI Design ─────────────────────────────────── */}
      <div className="pt-8 pb-4 px-4 sm:px-8 max-w-7xl mx-auto w-full print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 shadow-xs">
                <ShieldCheck className="w-3 h-3 text-primary" />
                Executive Approval Stream
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                Workspace Governance
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Requests & Executive Sign-offs
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Streamlined leaves, operational permissions, hardware, and expense approvals with verified audit trails.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-2xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95 transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 shadow-sm shadow-primary/20 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Request</span>
          </button>
        </div>

        {/* ── Executive Journey Overview Deck (3 Metric Cards) ────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6">
          {/* Card 1: Action Required */}
          <div
            onClick={() => setActiveSection('pending_approvals')}
            className={cn(
              'p-4.5 rounded-3xl border transition-all cursor-pointer active:scale-[0.99] flex items-center justify-between shadow-xs',
              activeSection === 'pending_approvals'
                ? 'bg-amber-500/10 border-amber-500/40'
                : 'bg-surface/80 dark:bg-surface/50 border-border/80 dark:border-border-strong hover:border-amber-500/30'
            )}
          >
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Action Required
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {overviewStats.pendingToDecide}
                </span>
                <span className="text-xs text-amber-500 font-semibold">Pending Decisions</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Awaiting your executive sign-off</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          {/* Card 2: My In-Flight */}
          <div
            onClick={() => setActiveSection('created_by_me')}
            className={cn(
              'p-4.5 rounded-3xl border transition-all cursor-pointer active:scale-[0.99] flex items-center justify-between shadow-xs',
              activeSection === 'created_by_me'
                ? 'bg-primary/10 border-primary/40'
                : 'bg-surface/80 dark:bg-surface/50 border-border/80 dark:border-border-strong hover:border-primary/30'
            )}
          >
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                My In-Flight
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {overviewStats.myInFlight}
                </span>
                <span className="text-xs text-primary font-semibold">Submissions</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Actively under manager review</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
              <Send className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Approval Rate & Turnaround */}
          <div
            onClick={() => setActiveSection('approved_history')}
            className={cn(
              'p-4.5 rounded-3xl border transition-all cursor-pointer active:scale-[0.99] flex items-center justify-between shadow-xs',
              activeSection === 'approved_history'
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-surface/80 dark:bg-surface/50 border-border/80 dark:border-border-strong hover:border-emerald-500/30'
            )}
          >
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Audit & History
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {overviewStats.totalResolved}
                </span>
                <span className="text-xs text-emerald-500 font-semibold">
                  {overviewStats.approvalRate}% rate
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Resolved requests recorded</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* ── Segmented Journey Navigation Bar ───────────────────────────────── */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative inline-flex p-1 bg-secondary/70 dark:bg-secondary/40 backdrop-blur-xl border border-border rounded-2xl self-start overflow-x-auto max-w-full shadow-xs">
            {(
              [
                { id: 'pending_approvals', label: 'Pending Approvals', count: overviewStats.pendingToDecide },
                { id: 'approved_history', label: 'Approved History', count: overviewStats.totalResolved },
                { id: 'created_by_me', label: 'Created by Me', count: sent.length },
                { id: 'all', label: 'All Requests', count: allRequests.length },
              ] as const
            ).map((tab) => {
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(tab.id);
                    setStatusFilter('all');
                  }}
                  className={cn(
                    'relative px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer z-10 flex items-center gap-2',
                    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="requests-segment-pill"
                      className="absolute inset-0 bg-surface rounded-xl shadow-xs border border-border/80 dark:border-white/10 -z-10"
                      transition={{ type: 'spring', damping: 26, stiffness: 380 }}
                    />
                  )}
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.2 rounded-full transition-colors',
                        isActive
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted/70 text-muted-foreground'
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, requester, reason..."
              className="w-full text-xs rounded-2xl bg-surface border border-border pl-8.5 pr-8 py-2 text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status Filters if in History or All */}
        {(activeSection === 'approved_history' || activeSection === 'all') && (
          <div className="mt-3.5 flex items-center gap-1.5 pt-3 border-t border-border/40 text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
              Status:
            </span>
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'approved', label: 'Approved' },
                { id: 'rejected', label: 'Rejected' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setStatusFilter(p.id)}
                className={cn(
                  'px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer',
                  statusFilter === p.id
                    ? 'bg-foreground text-background shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Main Stream Content ─────────────────────────────────────────────── */}
      <div className="flex-1 px-4 sm:px-8 pb-16 max-w-7xl mx-auto w-full print:hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground font-medium tracking-wide">
              Loading approval streams…
            </p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-surface/60 border border-border/80 dark:border-border/40 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              {activeSection === 'pending_approvals'
                ? 'Zero Pending Approvals'
                : 'No requests recorded'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5">
              {activeSection === 'pending_approvals'
                ? 'You have addressed all pending items requiring your sign-off. Great velocity!'
                : activeSection === 'created_by_me'
                ? "You haven't submitted any requests yet. Tap New Request to start."
                : 'No requests match your current search and filter settings.'}
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
            >
              New Request
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredList.map((req) => (
              <ExecutiveRequestCard
                key={req.id}
                req={req}
                isSent={req.creatorId === userProfile.uid}
                currentUser={userProfile}
                orgId={orgId}
                onSelect={(r) => setActiveDetailRequest(r)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Create Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <CreateRequestModal
            orgId={orgId}
            members={members}
            teams={teams}
            currentUser={userProfile}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Request Detail Drawer ────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeDetailRequest && (
          <RequestDetailDrawer
            request={activeDetailRequest}
            currentUser={userProfile}
            orgId={orgId}
            onClose={() => setActiveDetailRequest(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default RequestsPage;
