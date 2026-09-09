import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, CheckCircle2, XCircle, Clock,
  ChevronDown, X, Loader2, FileText, Calendar,
  Stethoscope, Home, Laptop, Receipt, ClipboardList,
  Inbox, Send, Trash2, Bell, Copy, Printer, Check,
  ArrowRight, User, Briefcase, Sparkles, Info,
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

// ─── Create Request Modal ─────────────────────────────────────────────────────

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

  // Pre-populate approver with direct line manager or team manager
  React.useEffect(() => {
    if (currentUser.managerId) {
      const directMgr = members.find((m) => m.uid === currentUser.managerId);
      if (directMgr) {
        setSelectedMember(directMgr);
        return;
      }
    }

    // Fallback: Find a team where current user is a member
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

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [error, setError] = React.useState('');

  const filtered = members.filter(
    (m) =>
      m.uid !== currentUser.uid &&
      (m.fullName.toLowerCase().includes(search.toLowerCase()) ||
        m.username.toLowerCase().includes(search.toLowerCase())),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMember) { setError('Please select an approver.'); return; }
    if (!title.trim()) { setError('Please add a title.'); return; }
    if (!description.trim()) { setError('Please describe your request.'); return; }
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
      setError('Failed to submit request. Try again.');
      setSubmitting(false);
    }
  }

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
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-[70] w-full max-w-lg max-h-[88vh] flex flex-col bg-surface/98 dark:bg-surface/95 backdrop-blur-2xl border border-border rounded-[24px] shadow-2xl overflow-hidden pointer-events-auto"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/40 flex-shrink-0">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> New Request
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto aether-scroll p-6 space-y-4">
            {/* Send To */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Send To (Approver)</label>
              <div className="relative">
                <div
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border-default bg-bg-secondary/50 cursor-text focus-within:border-primary/30 transition-all shadow-inner"
                  onClick={() => setShowDropdown(true)}
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {selectedMember ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-sm text-foreground font-semibold truncate">{selectedMember.fullName}</span>
                      <span className="text-xs text-muted-foreground truncate">@{selectedMember.username}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedMember(null); setSearch(''); }}
                        className="ml-auto text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-0.5">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <input
                      className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      placeholder="Search by name or username..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                    />
                  )}
                </div>
                {showDropdown && !selectedMember && (
                  <div className="absolute z-10 top-full mt-1.5 w-full bg-surface border border-border-default rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto aether-scroll backdrop-blur-xl">
                    {filtered.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-4 py-3 text-center">No members found</p>
                    ) : (
                      filtered.map((m) => (
                        <button
                          key={m.uid} type="button"
                          onClick={() => { setSelectedMember(m); setShowDropdown(false); setSearch(''); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-secondary text-left transition-colors cursor-pointer"
                        >
                          <div 
                            className="h-7 w-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)`
                            }}
                          >
                            {m.fullName[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{m.fullName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">@{m.username} · {m.designation}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Request Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(REQUEST_TYPE_LABELS) as [RequestType, string][]).map(([k, label]) => (
                  <button
                    key={k} type="button"
                    onClick={() => setType(k)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition-all duration-300 text-[10px] font-bold cursor-pointer hover:scale-[1.02]",
                      type === k 
                        ? 'border-primary/40 bg-bg-secondary text-foreground' 
                        : 'border-border-subtle bg-bg-secondary/40 text-muted-foreground hover:bg-bg-tertiary'
                    )}
                    style={type === k ? {
                      borderColor: 'var(--accent)',
                      backgroundColor: 'oklch(from var(--accent) l c h / 8%)',
                      color: 'var(--accent)'
                    } : undefined}
                  >
                    <div 
                      className={cn(
                        "p-1 rounded-lg shrink-0 transition-colors",
                        type === k ? "text-primary" : "text-muted-foreground"
                      )}
                      style={type === k ? { color: 'var(--accent)' } : undefined}
                    >
                      <RequestIcon name={REQUEST_TYPE_ICONS[k]} className="h-4 w-4" />
                    </div>
                    <span className="truncate w-full">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Title</label>
              <input
                className="w-full px-3 py-2 rounded-xl border border-border-default bg-bg-secondary/55 text-xs text-foreground placeholder:text-muted-foreground outline-none hover:bg-bg-tertiary hover:border-border-strong focus:border-primary/30 transition-all shadow-inner"
                placeholder="e.g. Sick Leave – 2 days"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Dates (optional) */}
            {['sick_leave', 'work_from_home', 'time_off'].includes(type) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Calendar className="h-3 w-3" />From</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border-default bg-bg-secondary/55 text-xs text-foreground outline-none focus:border-primary/30 transition-all [color-scheme:light] dark:[color-scheme:dark]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Calendar className="h-3 w-3" />To</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border-default bg-bg-secondary/55 text-xs text-foreground outline-none focus:border-primary/30 transition-all [color-scheme:light] dark:[color-scheme:dark]" />
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-border-default bg-bg-secondary/55 text-xs text-foreground placeholder:text-muted-foreground outline-none hover:bg-bg-tertiary hover:border-border-strong focus:border-primary/30 transition-all shadow-inner resize-none"
                placeholder="Describe your request in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 font-semibold">{error}</p>}
            <div className="h-6 shrink-0" />
          </div>

          {/* Fixed Action Footer */}
          <div className="flex gap-3 p-5 border-t border-border bg-secondary/30 flex-shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Submit Request'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  req, isSent, currentUser, orgId, onSelect, onAction,
}: {
  req: OrgRequest;
  isSent: boolean;
  currentUser: UserProfile;
  orgId: string;
  onSelect?: (req: OrgRequest) => void;
  onAction?: () => void;
}) {
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [acting, setActing] = React.useState(false);

  async function act(status: 'approved' | 'rejected') {
    setActing(true);
    await updateRequestStatus(
      req.id,
      orgId,
      status,
      currentUser.uid,
      currentUser.fullName,
      currentUser.username,
      req.creatorId,
      req.title,
      note || undefined
    );
    setActing(false);
    setNoteOpen(false);
    onAction?.();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect?.(req)}
      className="rounded-2xl border bg-bg-secondary/35 p-4 space-y-2.5 hover:bg-bg-secondary/70 hover:shadow-md hover:scale-[1.005] transition-all duration-300 relative overflow-hidden cursor-pointer"
      style={{
        borderColor: 'oklch(from var(--accent) l c h / 18%)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div 
            className="p-2 rounded-xl border shrink-0"
            style={{
              backgroundColor: 'oklch(from var(--accent) l c h / 10%)',
              borderColor: 'oklch(from var(--accent) l c h / 20%)',
              color: 'var(--accent)'
            }}
          >
            <RequestIcon name={REQUEST_TYPE_ICONS[req.type]} className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground leading-snug truncate tracking-tight">{req.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{REQUEST_TYPE_LABELS[req.type]}</p>
          </div>
        </div>
        <StatusBadge status={req.status} />
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{req.description}</p>

      {(req.startDate || req.endDate) && (
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span>{formatDate(req.startDate)}{req.endDate && req.endDate !== req.startDate ? ` → ${formatDate(req.endDate)}` : ''}</span>
        </div>
      )}

      <div className="flex flex-col gap-2.5 pt-2.5 border-t border-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {/* Avatar sphere */}
            <div 
              className="h-4.5 w-4.5 rounded-full text-white text-[8px] font-bold flex items-center justify-center shadow-sm"
              style={{
                background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)`
              }}
            >
              {(isSent ? req.approverName : req.creatorName)[0]?.toUpperCase()}
            </div>
            <span className="font-semibold text-foreground/80 truncate max-w-[100px]">
              {isSent ? req.approverName : req.creatorName}
            </span>
            <span className="opacity-40">·</span>
            <span className="font-mono text-[9px] font-bold">{timeAgo(req.createdAt)}</span>
          </div>

          {/* Approve/Reject – only for received + pending */}
          {!isSent && req.status === 'pending' && (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {noteOpen ? (
                <div className="flex items-center gap-1.5">
                  <input
                    className="px-2.5 py-1.5 rounded-lg border border-border bg-bg-secondary text-xs text-foreground placeholder:text-muted-foreground outline-none w-36 sm:w-48 shadow-inner"
                    placeholder="Review note…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <button onClick={() => act('approved')} disabled={acting}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer">
                    {acting ? '…' : 'Approve'}
                  </button>
                  <button onClick={() => act('rejected')} disabled={acting}
                    className="px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer">
                    Reject
                  </button>
                  <button onClick={() => setNoteOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setNoteOpen(true)}
                  className="px-2.5 py-1 rounded-lg border border-border-default text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-bg-secondary transition-all cursor-pointer">
                  Review
                </button>
              )}
            </div>
          )}
        </div>

        {req.approverNote && (
          <div className="text-[10px] text-muted-foreground bg-bg-secondary/40 border border-border-subtle rounded-lg px-2.5 py-1.5 italic font-medium">
            "{req.approverNote}"
          </div>
        )}
      </div>
    </motion.div>
  );
}

// RequestDetailDrawer has been moved to a reusable component under components/tasks/RequestDetailDrawer.tsx


// ─── Main Page ────────────────────────────────────────────────────────────────

export function RequestsPage() {
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { sent, received, pendingCount, loading } = useRequests(orgId);
  const members = useOrgMembers(orgId);
  const { teams } = useTeams(orgId);
  const [tab, setTab] = React.useState<'inbox' | 'sent'>('inbox');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [activeDetailRequest, setActiveDetailRequest] = React.useState<{ req: OrgRequest; isSent: boolean } | null>(null);

  if (!userProfile || !orgId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Active dataset
  const activeList = tab === 'inbox' ? received : sent;

  // Filtered dataset
  const filteredList = activeList.filter((req) => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = req.title.toLowerCase().includes(q);
      const matchDesc = req.description.toLowerCase().includes(q);
      const matchCreator = req.creatorName.toLowerCase().includes(q);
      const matchApprover = req.approverName.toLowerCase().includes(q);
      const matchCat = REQUEST_TYPE_LABELS[req.type]?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchCreator || matchApprover || matchCat;
    }
    return true;
  });

  const pendingReceived = filteredList.filter((r) => r.status === 'pending');
  const historicReceived = filteredList.filter((r) => r.status !== 'pending');

  // Update activeDetailRequest if the requests list updates in real-time
  React.useEffect(() => {
    if (activeDetailRequest) {
      const list = activeDetailRequest.isSent ? sent : received;
      const found = list.find((x) => x.id === activeDetailRequest.req.id);
      if (found) {
        setActiveDetailRequest({ req: found, isSent: activeDetailRequest.isSent });
      }
    }
  }, [sent, received]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      {/* Page Header - Aligned within max-w-5xl */}
      <div className="border-b border-border/80 bg-surface/60 backdrop-blur-xl shrink-0 print:hidden">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Requests & Approvals</h1>
            <p className="text-xs text-muted-foreground font-semibold mt-1">
              Submit and manage workplace leaves, expenses, and operational approvals
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-black bg-primary hover:bg-primary/90 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Request</span>
          </button>
        </div>
      </div>

      {/* Main Content Area - Aligned to exact same max-w-5xl margins */}
      <div className="flex-1 overflow-y-auto aether-scroll print:hidden">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-6 space-y-6">
          
          {/* Controls Bar: Segmented Tabs + Search + Status Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Segmented Tabs */}
            <div className="p-1 flex rounded-2xl bg-secondary/60 border border-border shrink-0">
              {[
                { id: 'inbox', label: 'Inbox', count: pendingCount },
                { id: 'sent', label: 'Sent', count: sent.length },
              ].map(({ id, label, count }) => (
                <button
                  key={id}
                  onClick={() => {
                    setTab(id as any);
                    setStatusFilter('all');
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2",
                    tab === id 
                      ? "bg-surface text-foreground shadow-xs border border-border/80" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{label}</span>
                  {count > 0 && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-black border",
                      tab === id ? "bg-primary text-primary-foreground border-primary" : "bg-surface text-foreground border-border"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search Input & Status Filter Chips */}
            <div className="flex items-center gap-2 flex-1 sm:justify-end">
              <div className="relative flex items-center w-full sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder={tab === 'inbox' ? "Search by title, requester..." : "Search sent requests..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl pl-8 pr-7 py-2 text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 p-0.5 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'approved', label: 'Approved' },
                  { id: 'rejected', label: 'Rejected' },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setStatusFilter(pill.id as any)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border",
                      statusFilter === pill.id
                        ? "bg-surface text-foreground border-primary/50 shadow-xs"
                        : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cards List */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : tab === 'inbox' ? (
            <>
              {filteredList.length === 0 && (
                <EmptyState
                  icon={Inbox}
                  title={searchQuery || statusFilter !== 'all' ? "No matching requests" : "No requests yet"}
                  subtitle={searchQuery || statusFilter !== 'all' ? "Try adjusting your search query or filter." : "When someone sends you a request for approval, it'll appear here."}
                />
              )}
              {pendingReceived.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    Pending Your Action — {pendingReceived.length}
                  </p>
                  <div className="space-y-3">
                    {pendingReceived.map((r) => (
                      <RequestCard
                        key={r.id}
                        req={r}
                        isSent={false}
                        currentUser={userProfile}
                        orgId={orgId}
                        onSelect={(req) => setActiveDetailRequest({ req, isSent: false })}
                      />
                    ))}
                  </div>
                </div>
              )}
              {historicReceived.length > 0 && (
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    Reviewed & Past History — {historicReceived.length}
                  </p>
                  <div className="space-y-3">
                    {historicReceived.map((r) => (
                      <RequestCard
                        key={r.id}
                        req={r}
                        isSent={false}
                        currentUser={userProfile}
                        orgId={orgId}
                        onSelect={(req) => setActiveDetailRequest({ req, isSent: false })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {filteredList.length === 0 ? (
                <EmptyState
                  icon={Send}
                  title={searchQuery || statusFilter !== 'all' ? "No matching sent requests" : "No requests sent"}
                  subtitle={searchQuery || statusFilter !== 'all' ? "Try clearing your filters to see past requests." : "Submit your first request using the 'New Request' button above."}
                />
              ) : (
                <div className="space-y-3">
                  {filteredList.map((r) => (
                    <RequestCard
                      key={r.id}
                      req={r}
                      isSent
                      currentUser={userProfile}
                      orgId={orgId}
                      onSelect={(req) => setActiveDetailRequest({ req, isSent: true })}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Modal */}
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

      {/* Request Detail Drawer */}
      <AnimatePresence>
        {activeDetailRequest && (
          <RequestDetailDrawer
            request={activeDetailRequest.req}
            currentUser={userProfile}
            orgId={orgId}
            onClose={() => setActiveDetailRequest(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div 
        className="h-14 w-14 rounded-2xl border flex items-center justify-center mb-4 shadow-sm"
        style={{
          backgroundColor: 'oklch(from var(--accent) l c h / 5%)',
          borderColor: 'oklch(from var(--accent) l c h / 10%)',
          color: 'var(--accent)'
        }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-bold text-foreground tracking-tight">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">{subtitle}</p>
    </div>
  );
}
