import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, CheckCircle2, XCircle, Clock,
  ChevronDown, X, Loader2, FileText, Calendar,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useRequests } from '../../hooks/useRequests';
import { useOrgMembers } from '../../hooks/useChat';
import {
  createRequest, updateRequestStatus,
  REQUEST_TYPE_LABELS, REQUEST_TYPE_ICONS,
  type OrgRequest, type RequestType, type RequestStatus,
} from '../../lib/requests';
import { type UserProfile } from '../../lib/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  orgId, members, currentUser, onClose,
}: {
  orgId: string;
  members: UserProfile[];
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
        className="w-full max-w-lg bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-muted/10">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> New Request
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted/30 text-muted-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Send To */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Send To (Approver)</label>
            <div className="relative">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 bg-background/50 cursor-text focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20"
                onClick={() => setShowDropdown(true)}
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {selectedMember ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-sm text-foreground">{selectedMember.fullName}</span>
                    <span className="text-xs text-muted-foreground">@{selectedMember.username}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedMember(null); setSearch(''); }}
                      className="ml-auto text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <input
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    placeholder="Search by name or username..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                  />
                )}
              </div>
              {showDropdown && !selectedMember && (
                <div className="absolute z-10 top-full mt-1 w-full bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-4 py-3 text-center">No members found</p>
                  ) : (
                    filtered.map((m) => (
                      <button
                        key={m.uid} type="button"
                        onClick={() => { setSelectedMember(m); setShowDropdown(false); setSearch(''); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 text-left transition-colors"
                      >
                        <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                          {m.fullName[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{m.fullName}</p>
                          <p className="text-[11px] text-muted-foreground">@{m.username} · {m.designation}</p>
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
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Request Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(REQUEST_TYPE_LABELS) as [RequestType, string][]).map(([k, label]) => (
                <button
                  key={k} type="button"
                  onClick={() => setType(k)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-center transition-all text-xs font-medium
                    ${type === k ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border/30 bg-muted/10 text-muted-foreground hover:bg-muted/20'}`}
                >
                  <span className="text-lg leading-none">{REQUEST_TYPE_ICONS[k]}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</label>
            <input
              className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background/50 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
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
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Calendar className="h-3 w-3" />From</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background/50 text-sm text-foreground outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Calendar className="h-3 w-3" />To</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background/50 text-sm text-foreground outline-none focus:border-primary/50" />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-border/50 bg-background/50 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none"
              placeholder="Describe your request in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm font-medium text-muted-foreground hover:bg-muted/20 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
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
  req, isSent, currentUser, orgId, onAction,
}: {
  req: OrgRequest;
  isSent: boolean;
  currentUser: UserProfile;
  orgId: string;
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
      className="rounded-2xl border border-border/40 bg-card/50 p-5 space-y-3 hover:bg-card/70 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none mt-0.5">{REQUEST_TYPE_ICONS[req.type]}</span>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">{req.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{REQUEST_TYPE_LABELS[req.type]}</p>
          </div>
        </div>
        <StatusBadge status={req.status} />
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{req.description}</p>

      {(req.startDate || req.endDate) && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(req.startDate)}{req.endDate && req.endDate !== req.startDate ? ` → ${formatDate(req.endDate)}` : ''}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-border/20">
        <div className="text-[11px] text-muted-foreground">
          {isSent
            ? <>To: <span className="text-foreground/70 font-medium">{req.approverName}</span></>
            : <>From: <span className="text-foreground/70 font-medium">{req.creatorName}</span></>
          }
          <span className="mx-1.5 opacity-40">·</span>
          {timeAgo(req.createdAt)}
        </div>

        {/* Approve/Reject – only for received + pending */}
        {!isSent && req.status === 'pending' && (
          <div className="flex items-center gap-2">
            {noteOpen ? (
              <div className="flex items-center gap-2">
                <input
                  className="px-2 py-1 rounded-lg border border-border/50 bg-background text-xs text-foreground placeholder:text-muted-foreground/50 outline-none w-36"
                  placeholder="Optional note…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <button onClick={() => act('approved')} disabled={acting}
                  className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50">
                  {acting ? '…' : 'Approve'}
                </button>
                <button onClick={() => act('rejected')} disabled={acting}
                  className="px-3 py-1 rounded-lg bg-red-500/80 text-white text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-50">
                  Reject
                </button>
                <button onClick={() => setNoteOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button onClick={() => setNoteOpen(true)}
                className="px-3 py-1 rounded-lg border border-border/40 text-xs font-medium text-muted-foreground hover:bg-muted/20 hover:text-foreground transition-colors">
                Review
              </button>
            )}
          </div>
        )}
      </div>

      {req.approverNote && (
        <div className="text-[11px] text-muted-foreground bg-muted/20 rounded-lg px-3 py-2 italic">
          "{req.approverNote}"
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function RequestsPage() {
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { sent, received, pendingCount, loading } = useRequests(orgId);
  const members = useOrgMembers(orgId);
  const [tab, setTab] = React.useState<'inbox' | 'sent'>('inbox');
  const [modalOpen, setModalOpen] = React.useState(false);

  if (!userProfile || !orgId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingReceived = received.filter((r) => r.status === 'pending');
  const historicReceived = received.filter((r) => r.status !== 'pending');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <div className="px-8 pt-8 pb-5 border-b border-border/20 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Requests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Submit and manage workplace requests
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4" />
          New Request
        </button>
      </div>

      {/* Tabs */}
      <div className="px-8 pt-4 pb-0 flex items-center gap-1 shrink-0">
        {[
          { id: 'inbox', label: 'Inbox', count: pendingCount },
          { id: 'sent', label: 'Sent', count: sent.length },
        ].map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${tab === id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'}`}
          >
            {label}
            {count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                ${tab === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-5 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tab === 'inbox' ? (
          <>
            {pendingReceived.length === 0 && historicReceived.length === 0 && (
              <EmptyState
                emoji="📥"
                title="No requests yet"
                subtitle="When someone sends you a request for approval, it'll appear here."
              />
            )}
            {pendingReceived.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Pending Your Action — {pendingReceived.length}
                </p>
                {pendingReceived.map((r) => (
                  <RequestCard key={r.id} req={r} isSent={false} currentUser={userProfile} orgId={orgId} />
                ))}
              </div>
            )}
            {historicReceived.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                  Reviewed
                </p>
                {historicReceived.map((r) => (
                  <RequestCard key={r.id} req={r} isSent={false} currentUser={userProfile} orgId={orgId} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {sent.length === 0 ? (
              <EmptyState
                emoji="📤"
                title="No requests sent"
                subtitle="Submit your first request using the 'New Request' button above."
              />
            ) : (
              <div className="space-y-3">
                {sent.map((r) => (
                  <RequestCard key={r.id} req={r} isSent currentUser={userProfile} orgId={orgId} />
                ))}
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
            currentUser={userProfile}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">{emoji}</span>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">{subtitle}</p>
    </div>
  );
}
