import * as React from 'react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-surface/97 backdrop-blur-2xl border border-border-default rounded-[24px] shadow-2xl overflow-hidden"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-secondary/40 flex-shrink-0">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" style={{ color: 'var(--accent)' }} /> New Request
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
          </div>

          {/* Fixed Action Footer */}
          <div className="flex gap-3 p-6 border-t border-border-subtle bg-bg-secondary/40 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border-default text-sm font-semibold text-muted-foreground hover:bg-bg-secondary transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
              style={{
                background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.12) c h) 100%)`,
                boxShadow: `0 4px 12px oklch(from var(--accent) l c h / 15%)`
              }}
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Submit Request'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
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
    await updateRequestStatus(req.id, orgId, status, currentUser.uid, currentUser.fullName, req.creatorId, req.title, note || undefined);
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
                    className="px-2 py-1 rounded-lg border border-border-default bg-bg-secondary text-[10px] text-foreground placeholder:text-muted-foreground outline-none w-28 shadow-inner"
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

// ─── Request Detail Drawer ───────────────────────────────────────────────────

function RequestDetailDrawer({
  req,
  isSent,
  currentUser,
  orgId,
  onClose,
}: {
  req: OrgRequest;
  isSent: boolean;
  currentUser: UserProfile;
  orgId: string;
  onClose: () => void;
}) {
  const [note, setNote] = React.useState('');
  const [acting, setActing] = React.useState(false);
  const [reminding, setReminding] = React.useState(false);
  const [reminderSent, setReminderSent] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = React.useState(false);
  const [withdrawing, setWithdrawing] = React.useState(false);

  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const theme = {
    sick_leave: { accent: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    work_from_home: { accent: '#0ea5e9', text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
    time_off: { accent: '#6366f1', text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    equipment: { accent: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    expense: { accent: '#f43f5e', text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    other: { accent: '#a855f7', text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  }[req.type] || { accent: '#8b5cf6', text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' };

  async function act(status: 'approved' | 'rejected') {
    setActing(true);
    await updateRequestStatus(
      req.id,
      orgId,
      status,
      currentUser.uid,
      currentUser.fullName,
      req.creatorId,
      req.title,
      note || undefined
    );
    setActing(false);
    onClose();
  }

  async function handleSendReminder() {
    setReminding(true);
    await sendRequestReminder({
      orgId,
      creatorId: currentUser.uid,
      creatorName: currentUser.fullName,
      approverId: req.approverId,
      title: req.title,
    });
    setReminding(false);
    setReminderSent(true);
    setTimeout(() => setReminderSent(false), 3000);
  }

  async function handleWithdraw() {
    setWithdrawing(true);
    await deleteRequest(req.id);
    setWithdrawing(false);
    onClose();
  }

  function copySummary() {
    const summary = `
[${REQUEST_TYPE_LABELS[req.type]} Request]
Title: ${req.title}
Status: ${req.status.toUpperCase()}
Creator: ${req.creatorName} (@${req.creatorUsername})
Approver: ${req.approverName} (@${req.approverUsername})
Dates: ${req.startDate ? `${formatDate(req.startDate)}${req.endDate && req.endDate !== req.startDate ? ` to ${formatDate(req.endDate)}` : ''}` : 'N/A'}
Description: ${req.description}
${req.approverNote ? `Review Note: "${req.approverNote}"` : ''}
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

  const duration = getDurationDays(req.startDate, req.endDate);

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
              <RequestIcon name={REQUEST_TYPE_ICONS[req.type]} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground leading-tight truncate tracking-tight">{req.title}</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold uppercase tracking-wider">{REQUEST_TYPE_LABELS[req.type]}</p>
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
                  req.status === 'approved' ? 'bg-emerald-400 animate-pulse' : 
                  req.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'
                )} />
                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
              </p>
            </div>
            <StatusBadge status={req.status} />
          </div>

          {/* Details Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-bg-secondary/35 border border-border-subtle p-3 rounded-xl space-y-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <User className="h-3 w-3" /> Requested By
              </span>
              <p className="text-xs font-bold text-foreground">{req.creatorName}</p>
              <p className="text-[10px] text-muted-foreground">@{req.creatorUsername}</p>
            </div>
            <div className="bg-bg-secondary/35 border border-border-subtle p-3 rounded-xl space-y-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <User className="h-3 w-3" /> Approver
              </span>
              <p className="text-xs font-bold text-foreground">{req.approverName}</p>
              <p className="text-[10px] text-muted-foreground">@{req.approverUsername}</p>
            </div>

            {req.startDate && (
              <div className="bg-bg-secondary/35 border border-border-subtle p-3 rounded-xl col-span-2 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Request Timeline
                  </span>
                  <p className="text-xs font-bold text-foreground">
                    {formatDate(req.startDate)} {req.endDate && req.endDate !== req.startDate ? ` → ${formatDate(req.endDate)}` : ''}
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
                  <p className="text-[10px] text-muted-foreground">Submitted by {req.creatorName} · {timeAgo(req.createdAt)}</p>
                </div>
              </div>

              {/* Step 2: Under Review */}
              <div className="relative">
                <span className={cn(
                  "absolute -left-[30px] top-1 h-4.5 w-4.5 rounded-full border flex items-center justify-center",
                  req.status !== 'pending' 
                    ? 'border-emerald-400 bg-emerald-400/20' 
                    : 'border-amber-400 bg-amber-400/20 animate-pulse'
                )}>
                  {req.status !== 'pending' ? (
                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                  ) : (
                    <Clock className="h-2.5 w-2.5 text-amber-400 animate-spin" />
                  )}
                </span>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Under Manager Review</p>
                  <p className="text-[10px] text-muted-foreground">Assigned to {req.approverName}</p>
                </div>
              </div>

              {/* Step 3: Decision */}
              <div className="relative">
                <span className={cn(
                  "absolute -left-[30px] top-1 h-4.5 w-4.5 rounded-full border flex items-center justify-center",
                  req.status === 'approved' ? 'border-emerald-400 bg-emerald-400/20' :
                  req.status === 'rejected' ? 'border-red-400 bg-red-400/20' :
                  'border-border-default bg-bg-secondary'
                )}>
                  {req.status === 'approved' && <Check className="h-2.5 w-2.5 text-emerald-400" />}
                  {req.status === 'rejected' && <X className="h-2.5 w-2.5 text-red-400" />}
                  {req.status === 'pending' && <span className="h-1.5 w-1.5 rounded-full bg-text-muted/40" />}
                </span>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">
                    {req.status === 'pending' ? 'Final Decision' : `Decision: ${req.status.charAt(0).toUpperCase() + req.status.slice(1)}`}
                  </p>
                  {req.status !== 'pending' && (
                    <p className="text-[10px] text-muted-foreground">
                      Processed by {req.approverName} · {timeAgo(req.updatedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Details & Description
            </h3>
            <div className="p-4 rounded-xl border border-border-default bg-bg-secondary/35 text-xs leading-relaxed text-foreground select-text whitespace-pre-wrap animate-fadeIn">
              {req.description}
            </div>
          </div>

          {/* Review Note Display if exists */}
          {req.approverNote && (
            <div className="space-y-2 animate-fadeIn">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Approver Review Note</h3>
              <div className="p-3 rounded-xl border border-emerald-400/10 bg-emerald-400/5 text-xs italic text-foreground leading-relaxed whitespace-pre-wrap select-text">
                "{req.approverNote}"
              </div>
            </div>
          )}
        </div>

        {/* Action Panel Footer */}
        <div className="p-6 border-t border-border-subtle bg-bg-secondary/40 shrink-0 space-y-4">
          {/* 1. If Approver is Viewing + Pending -> Review Controls */}
          {!isSent && req.status === 'pending' && (
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
          {isSent && req.status === 'pending' && (
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
          {req.status !== 'pending' && (
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export function RequestsPage() {
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { sent, received, pendingCount, loading } = useRequests(orgId);
  const members = useOrgMembers(orgId);
  const { teams } = useTeams(orgId);
  const [tab, setTab] = React.useState<'inbox' | 'sent'>('inbox');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [activeDetailRequest, setActiveDetailRequest] = React.useState<{ req: OrgRequest; isSent: boolean } | null>(null);

  if (!userProfile || !orgId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingReceived = received.filter((r) => r.status === 'pending');
  const historicReceived = received.filter((r) => r.status !== 'pending');

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
      {/* Page Header */}
      <div className="px-8 pt-8 pb-5 border-b border-border-subtle flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Requests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Submit and manage workplace requests
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
          style={{
            background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.12) c h) 100%)`,
            boxShadow: `0 8px 20px oklch(from var(--accent) l c h / 20%)`
          }}
        >
          <Plus className="h-4 w-4" />
          New Request
        </button>
      </div>

      {/* Tabs */}
      <div className="px-8 pt-4 pb-0 flex items-center gap-1.5 shrink-0">
        {[
          { id: 'inbox', label: 'Inbox', count: pendingCount },
          { id: 'sent', label: 'Sent', count: sent.length },
        ].map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setTab(id as any)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer text-muted-foreground hover:text-foreground hover:bg-bg-secondary"
            style={tab === id ? {
              backgroundColor: 'oklch(from var(--accent) l c h / 12%)',
              color: 'var(--accent)'
            } : undefined}
          >
            {label}
            {count > 0 && (
              <span 
                className="px-2 py-0.5 rounded-full text-[9px] font-extrabold transition-all border"
                style={tab === id ? {
                  backgroundColor: 'var(--accent)',
                  borderColor: 'oklch(from var(--accent) l c h / 20%)',
                  color: 'var(--accent-foreground)'
                } : {
                  backgroundColor: 'oklch(from var(--accent) l c h / 8%)',
                  borderColor: 'oklch(from var(--accent) l c h / 12%)',
                  color: 'var(--accent)'
                }}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-5 space-y-5 aether-scroll">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : tab === 'inbox' ? (
          <>
            {pendingReceived.length === 0 && historicReceived.length === 0 && (
              <EmptyState
                icon={Inbox}
                title="No requests yet"
                subtitle="When someone sends you a request for approval, it'll appear here."
              />
            )}
            {pendingReceived.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider max-w-3xl mx-auto">
                  Pending Your Action — {pendingReceived.length}
                </p>
                <div className="max-w-3xl mx-auto space-y-3">
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
              <div className="space-y-3">
                <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mt-4 max-w-3xl mx-auto">
                  Reviewed
                </p>
                <div className="max-w-3xl mx-auto space-y-3">
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
            {sent.length === 0 ? (
              <EmptyState
                icon={Send}
                title="No requests sent"
                subtitle="Submit your first request using the 'New Request' button above."
              />
            ) : (
              <div className="space-y-3">
                <div className="max-w-3xl mx-auto space-y-3">
                  {sent.map((r) => (
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
              </div>
            )}
          </>
        )}
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
            req={activeDetailRequest.req}
            isSent={activeDetailRequest.isSent}
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
