import * as React from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Loader2, 
  Check, 
  X, 
  Calendar, 
  Inbox, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileText,
  Search,
  User,
  Bell,
  Trash2,
  Stethoscope,
  Home,
  Laptop,
  Receipt,
  ClipboardList,
  ChevronRight,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from '../../../hooks/useAuth';
import { useRequests } from '../../../hooks/useRequests';
import { useOrgMembers } from '../../../hooks/useChat';
import { useTeams } from '../../../hooks/useTeams';
import { 
  createRequest, 
  updateRequestStatus, 
  deleteRequest,
  sendRequestReminder,
  type OrgRequest, 
  type RequestType, 
  type RequestStatus,
  REQUEST_TYPE_LABELS,
  REQUEST_TYPE_ICONS
} from '../../../lib/requests';
import { type UserProfile } from '../../../lib/firestore';
import { cn } from '@/lib/utils';
import { Team } from '@guild/types';
import { avatarHue } from '../../MemberProfileDrawer';
import { RequestDetailDrawer } from '../../tasks/RequestDetailDrawer';

// Category Icon Mapping
const RequestCategoryIconMap: Record<string, typeof ClipboardList> = {
  Stethoscope,
  Home,
  Calendar,
  Laptop,
  Receipt,
  ClipboardList,
};

function RequestCategoryIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const Icon = RequestCategoryIconMap[name] || ClipboardList;
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

function getDurationDays(start?: string, end?: string) {
  if (!start) return null;
  const s = new Date(start);
  const e = end ? new Date(end) : s;
  const diffTime = Math.abs(e.getTime() - s.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays === 1 ? '1 Day' : `${diffDays} Days`;
}

function getCategoryTheme(type: RequestType) {
  switch (type) {
    case 'sick_leave':
      return { text: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' };
    case 'work_from_home':
      return { text: 'text-sky-500 dark:text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/25' };
    case 'time_off':
      return { text: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/25' };
    case 'equipment':
      return { text: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25' };
    case 'expense':
      return { text: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/25' };
    default:
      return { text: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/25' };
  }
}

function getStatusBadge(status: RequestStatus) {
  switch (status) {
    case 'approved':
      return {
        icon: CheckCircle2,
        label: 'Approved',
        className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
      };
    case 'rejected':
      return {
        icon: XCircle,
        label: 'Rejected',
        className: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/25'
      };
    default:
      return {
        icon: Clock,
        label: 'Pending',
        className: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25'
      };
  }
}

export function MobileRequests() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { sent, received, pendingCount, loading } = useRequests(orgId);
  const members = useOrgMembers(orgId);
  const { teams } = useTeams(orgId);

  const [activeTab, setActiveTab] = React.useState<'inbox' | 'sent'>('inbox');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedRequest, setSelectedRequest] = React.useState<OrgRequest | null>(null);

  if (!userProfile || !orgId) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Active dataset
  const activeList = activeTab === 'inbox' ? received : sent;

  // Filtered dataset
  const filteredList = activeList.filter((req) => {
    // Status filter
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = req.title.toLowerCase().includes(q);
      const matchDesc = req.description.toLowerCase().includes(q);
      const matchCreator = req.creatorName.toLowerCase().includes(q);
      const matchApprover = req.approverName.toLowerCase().includes(q);
      const matchCategory = REQUEST_TYPE_LABELS[req.type]?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchCreator || matchApprover || matchCategory;
    }
    return true;
  });

  const pendingReceived = filteredList.filter((r) => r.status === 'pending');
  const historicReceived = filteredList.filter((r) => r.status !== 'pending');

  return (
    <div className="flex flex-col space-y-4 animate-fluid-pop pb-8 max-w-2xl mx-auto w-full">
      
      {/* 1. Header with Page Title & Aligned "+ New Request" Action */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight">Approvals & Requests</h1>
          <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
            Manage leaves, expenses, and approvals
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer shrink-0 border border-primary/20"
        >
          <Plus className="w-4 h-4" />
          <span>New</span>
        </button>
      </div>

      {/* 2. Mobile Segmented Tab Switcher */}
      <div className="p-1 flex rounded-2xl bg-secondary/60 border border-border shadow-xs">
        {[
          { id: 'inbox', label: 'Inbox', count: pendingCount },
          { id: 'sent', label: 'Sent', count: sent.length }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setStatusFilter('all');
              }}
              className={cn(
                "relative flex-1 py-2.5 text-center text-xs font-black rounded-xl transition-all cursor-pointer",
                isActive ? "text-primary-foreground font-black" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="mobileRequestsActiveTab"
                  className="absolute inset-0 bg-primary rounded-xl shadow-sm z-0"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-2">
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-md text-[9px] font-black",
                    isActive ? "bg-primary-foreground/25 text-primary-foreground" : "bg-surface text-foreground border border-border"
                  )}>
                    {tab.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="space-y-2.5">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder={activeTab === 'inbox' ? "Search by title, requester, or category..." : "Search your sent requests..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto aether-scroll pb-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
          ].map((pill) => {
            const isSelected = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 border",
                  isSelected
                    ? "bg-surface text-foreground border-primary/50 shadow-xs"
                    : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground hover:bg-secondary/80"
                )}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Requests List Deck */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-bold">Checking requests...</span>
        </div>
      ) : activeTab === 'inbox' ? (
        <div className="space-y-4">
          {filteredList.length === 0 ? (
            <EmptyState 
              icon={Inbox} 
              title={searchQuery || statusFilter !== 'all' ? "No matching requests" : "No approvals requested"} 
              subtitle={searchQuery || statusFilter !== 'all' ? "Try adjusting your search query or filter tags." : "Requests requiring your signature will appear here."} 
            />
          ) : (
            <>
              {pendingReceived.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>PENDING ACTION ({pendingReceived.length})</span>
                    </span>
                  </div>
                  {pendingReceived.map((r) => (
                    <MobileRequestCard 
                      key={r.id} 
                      req={r} 
                      isSent={false} 
                      currentUser={userProfile} 
                      orgId={orgId}
                      onOpenDrawer={() => setSelectedRequest(r)}
                    />
                  ))}
                </div>
              )}

              {historicReceived.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>HISTORY & REVIEWED ({historicReceived.length})</span>
                    </span>
                  </div>
                  {historicReceived.map((r) => (
                    <MobileRequestCard 
                      key={r.id} 
                      req={r} 
                      isSent={false} 
                      currentUser={userProfile} 
                      orgId={orgId}
                      onOpenDrawer={() => setSelectedRequest(r)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredList.length === 0 ? (
            <EmptyState 
              icon={Send} 
              title={searchQuery || statusFilter !== 'all' ? "No matching sent requests" : "No sent requests"} 
              subtitle={searchQuery || statusFilter !== 'all' ? "Try clearing your filters to see past requests." : "Submit your very first approval request today."} 
            />
          ) : (
            filteredList.map((r) => (
              <MobileRequestCard 
                key={r.id} 
                req={r} 
                isSent={true} 
                currentUser={userProfile} 
                orgId={orgId}
                onOpenDrawer={() => setSelectedRequest(r)}
              />
            ))
          )}
        </div>
      )}

      {/* 5. Mobile Create Request Bottom Sheet Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {modalOpen && (
            <MobileCreateModal 
              orgId={orgId}
              members={members}
              teams={teams}
              currentUser={userProfile}
              onClose={() => setModalOpen(false)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 6. Request Detail Drawer */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedRequest && (
            <RequestDetailDrawer
              request={selectedRequest}
              currentUser={userProfile}
              orgId={orgId}
              onClose={() => setSelectedRequest(null)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}

// Compact, Highly Aligned Mobile Request Card
function MobileRequestCard({
  req, 
  isSent, 
  currentUser, 
  orgId,
  onOpenDrawer
}: {
  req: OrgRequest;
  isSent: boolean;
  currentUser: UserProfile;
  orgId: string;
  onOpenDrawer: () => void;
}) {
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [acting, setActing] = React.useState(false);

  async function act(e: React.MouseEvent, status: 'approved' | 'rejected') {
    e.stopPropagation();
    setActing(true);
    try {
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
    } catch (err) {
      console.error('Failed to update request status:', err);
    } finally {
      setActing(false);
      setNoteOpen(false);
    }
  }

  const categoryTheme = getCategoryTheme(req.type);
  const statusInfo = getStatusBadge(req.status);
  const StatusIcon = statusInfo.icon;
  const duration = getDurationDays(req.startDate, req.endDate);

  const displayPerson = isSent ? req.approverName : req.creatorName;
  const personRoleLabel = isSent ? 'Approver' : 'Requested by';
  const personUid = isSent ? req.approverId : req.creatorId;

  return (
    <div 
      onClick={onOpenDrawer}
      className="aether-glass p-4 bg-surface/95 dark:bg-surface/55 border border-border hover:border-primary/40 rounded-2xl space-y-3 shadow-xs active:scale-[0.99] transition-all cursor-pointer select-none"
    >
      {/* Top Row: Category Icon + Title + Status Badge */}
      <div className="flex items-start gap-3">
        {/* Category Icon */}
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-colors",
          categoryTheme.bg,
          categoryTheme.border,
          categoryTheme.text
        )}>
          <RequestCategoryIcon name={REQUEST_TYPE_ICONS[req.type]} className="w-4.5 h-4.5" />
        </div>

        {/* Title and Category */}
        <div className="min-w-0 flex-1">
          <span className="text-xs font-black text-foreground block truncate leading-tight">
            {req.title}
          </span>
          <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5">
            {REQUEST_TYPE_LABELS[req.type]}
          </span>
        </div>

        {/* Status Badge */}
        <span className={cn(
          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border capitalize shrink-0 shadow-2xs",
          statusInfo.className
        )}>
          <StatusIcon className="h-3 w-3" />
          <span>{statusInfo.label}</span>
        </span>
      </div>

      {/* Description Snippet */}
      {req.description && (
        <p className="text-[11px] text-foreground/80 dark:text-muted-foreground font-semibold leading-relaxed line-clamp-2 bg-secondary/40 p-2.5 rounded-xl border border-border/70">
          {req.description}
        </p>
      )}

      {/* Timeline row (if dates exist) */}
      {(req.startDate || req.endDate) && (
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/30 border border-border/60 text-[10px] font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">
              {formatDate(req.startDate)}
              {req.endDate && req.endDate !== req.startDate ? ` → ${formatDate(req.endDate)}` : ''}
            </span>
          </div>
          {duration && (
            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-surface text-foreground border border-border shrink-0">
              {duration}
            </span>
          )}
        </div>
      )}

      {/* Person & Timestamp Row */}
      <div className="flex items-center justify-between pt-1 border-t border-border/70 text-[10px]">
        <div className="flex items-center gap-2 min-w-0">
          <div 
            className="w-5 h-5 rounded-full flex items-center justify-center font-black text-[9px] text-white shadow-2xs shrink-0"
            style={{ background: `hsl(${avatarHue(personUid || 'default')} 55% 45%)` }}
          >
            {(displayPerson?.[0] || 'U').toUpperCase()}
          </div>
          <span className="text-muted-foreground truncate">
            <span className="opacity-70">{personRoleLabel}: </span>
            <b className="text-foreground font-bold">{displayPerson}</b>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground/80 shrink-0 font-medium text-[9px]">
          <Clock className="w-3 h-3 opacity-60" />
          <span>{timeAgo(req.createdAt)}</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-40 ml-0.5" />
        </div>
      </div>

      {/* Reviewer Note Quote (if already completed) */}
      {req.approverNote && (
        <div className="text-[10px] text-foreground/85 dark:text-muted-foreground bg-secondary/50 border border-border rounded-xl p-2.5 italic font-semibold">
          "{req.approverNote}"
        </div>
      )}

      {/* Quick Action Footer for Received & Pending */}
      {!isSent && req.status === 'pending' && (
        <div 
          className="pt-2 border-t border-border flex flex-col gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {noteOpen ? (
            <div className="space-y-2">
              <input
                className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/60 text-xs text-foreground placeholder:text-muted-foreground outline-none font-bold focus:border-primary/50 shadow-inner"
                placeholder="Optional review note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex gap-2">
                <button 
                  onClick={(e) => act(e, 'approved')} 
                  disabled={acting}
                  className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-md cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Approve</span>
                </button>
                <button 
                  onClick={(e) => act(e, 'rejected')} 
                  disabled={acting}
                  className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black shadow-md cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Reject</span>
                </button>
                <button 
                  onClick={() => setNoteOpen(false)} 
                  className="px-3 py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground cursor-pointer active:scale-95 text-xs font-black border border-border"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setNoteOpen(true)}
                className="flex-1 py-2 px-3 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground text-xs font-black border border-border shadow-2xs active:scale-95 transition-all cursor-pointer text-center"
              >
                Add Note & Review
              </button>
              <button 
                onClick={(e) => act(e, 'approved')}
                disabled={acting}
                className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Mobile-first Create Request Modal / Bottom Sheet
function MobileCreateModal({
  orgId, 
  members, 
  teams, 
  currentUser, 
  onClose
}: {
  orgId: string;
  members: UserProfile[];
  teams: Team[];
  currentUser: UserProfile;
  onClose: () => void;
}) {
  const [selectedApprover, setSelectedApprover] = React.useState<UserProfile | null>(null);
  const [type, setType] = React.useState<RequestType>('sick_leave');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Pre-populate approver with direct line manager or team manager
  React.useEffect(() => {
    if (currentUser.managerId) {
      const mgr = members.find(m => m.uid === currentUser.managerId);
      if (mgr) {
        setSelectedApprover(mgr);
        return;
      }
    }

    const myTeam = teams.find((t) => t.memberIds.includes(currentUser.uid));
    if (myTeam && myTeam.managerId) {
      const teamMgr = members.find((m) => m.uid === myTeam.managerId);
      if (teamMgr) {
        setSelectedApprover(teamMgr);
      }
    }
  }, [currentUser, members, teams]);

  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const filteredMembers = members.filter(
    m => m.uid !== currentUser.uid &&
    (m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || m.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApprover) { setError('Please select an approver member.'); return; }
    if (!title.trim()) { setError('Please provide a title for the request.'); return; }
    if (!description.trim()) { setError('Please describe your request details.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await createRequest({
        orgId,
        creatorId: currentUser.uid,
        creatorName: currentUser.fullName,
        creatorUsername: currentUser.username,
        approverId: selectedApprover.uid,
        approverName: selectedApprover.fullName,
        approverUsername: selectedApprover.username,
        type,
        title: title.trim(),
        description: description.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Create request error:', err);
      setError('Failed to submit request. Please check connection and try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs z-[65] pointer-events-auto"
      />

      {/* Sliding Bottom Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed inset-x-0 bottom-0 z-[70] w-full max-h-[92dvh] rounded-t-[32px] border-t border-border flex flex-col bg-surface/98 dark:bg-surface/95 backdrop-blur-3xl shadow-2xl overflow-hidden pointer-events-auto"
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto my-3 shrink-0" />
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 pb-3 shrink-0">
          <span className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-wider">
            <FileText className="w-4 h-4 text-primary" />
            <span>SUBMIT NEW REQUEST</span>
          </span>
          <button 
            type="button"
            onClick={onClose} 
            className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer active:scale-90 border border-border"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Form Body with generous scroll clearance above bottom elements */}
          <div className="flex-1 overflow-y-auto aether-scroll overscroll-contain px-5 py-4 space-y-4 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]">
            
            {/* Approver Selection */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">
                APPROVER MEMBER *
              </span>
              
              {selectedApprover ? (
                <div className="p-3 rounded-xl border border-border bg-secondary/40 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white shadow-xs shrink-0"
                      style={{ background: `hsl(${avatarHue(selectedApprover.uid)} 55% 45%)` }}
                    >
                      {selectedApprover.fullName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground block truncate">{selectedApprover.fullName}</span>
                      <span className="text-[10px] text-muted-foreground block font-semibold truncate">@{selectedApprover.username} · {selectedApprover.designation || 'Member'}</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedApprover(null)} 
                    className="h-7 w-7 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer ml-2 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button 
                    type="button"
                    onClick={() => setSearchOpen(!searchOpen)}
                    className="w-full py-3 px-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-left text-xs font-black text-primary cursor-pointer active:scale-98 transition-all flex items-center justify-between"
                  >
                    <span>+ SELECT APPROVER MEMBER</span>
                    <Search className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  {searchOpen && (
                    <div className="p-3 rounded-2xl bg-secondary/50 border border-border space-y-2 animate-in fade-in">
                      <input 
                        type="text" 
                        placeholder="Search member by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-border bg-surface text-xs outline-none focus:border-primary text-foreground font-bold shrink-0 shadow-2xs"
                      />
                      <div className="max-h-40 overflow-y-auto aether-scroll space-y-1.5 pr-1">
                        {filteredMembers.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2 text-center">No members found</p>
                        ) : (
                          filteredMembers.map(m => (
                            <button 
                              key={m.uid}
                              type="button"
                              onClick={() => { setSelectedApprover(m); setSearchOpen(false); setSearchQuery(''); }}
                              className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-surface border border-border hover:border-primary/50 text-left cursor-pointer transition-all shadow-2xs"
                            >
                              <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0" style={{ background: `hsl(${avatarHue(m.uid)} 55% 45%)` }}>
                                {m.fullName[0].toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-foreground block truncate">{m.fullName}</span>
                                <span className="text-[9px] text-muted-foreground block font-semibold truncate">@{m.username}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Category selection */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">
                REQUEST CATEGORY *
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.entries(REQUEST_TYPE_LABELS) as [RequestType, string][]).map(([k, label]) => {
                  const isSelected = type === k;
                  const theme = getCategoryTheme(k);
                  return (
                    <button
                      key={k} 
                      type="button"
                      onClick={() => setType(k)}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer select-none shadow-2xs",
                        isSelected 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center border shrink-0",
                        theme.bg,
                        theme.border,
                        theme.text
                      )}>
                        <RequestCategoryIcon name={REQUEST_TYPE_ICONS[k]} className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-bold truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">
                TITLE *
              </span>
              <input 
                type="text" 
                required
                placeholder="e.g. Leave for Family Event"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/50 focus:bg-surface text-xs text-foreground placeholder:text-muted-foreground outline-none font-bold focus:border-primary/50 transition-all shadow-xs"
              />
            </div>

            {/* Dates (for leave, time-off, WFH) */}
            {['sick_leave', 'work_from_home', 'time_off'].includes(type) && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-primary" />
                    <span>FROM</span>
                  </span>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full p-2.5 rounded-xl border border-border bg-secondary/50 focus:bg-surface text-xs text-foreground outline-none focus:border-primary/50 transition-all [color-scheme:light] dark:[color-scheme:dark] font-bold shadow-xs" 
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-primary" />
                    <span>TO</span>
                  </span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    className="w-full p-2.5 rounded-xl border border-border bg-secondary/50 focus:bg-surface text-xs text-foreground outline-none focus:border-primary/50 transition-all [color-scheme:light] dark:[color-scheme:dark] font-bold shadow-xs" 
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">
                DETAILS & DESCRIPTION *
              </span>
              <textarea 
                rows={3}
                required
                placeholder="Detail reasons, deliverables, or handover plans..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[90px] px-3.5 py-2.5 rounded-xl border border-border bg-secondary/50 focus:bg-surface text-xs font-bold text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-all shadow-xs resize-none leading-relaxed"
              />
            </div>

            {error && (
              <div className="text-xs text-red-500 font-bold block bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Bottom spacer so user can scroll way above bottom buttons and bottom dock */}
            <div className="h-8 shrink-0" />
          </div>

          {/* Sticky Action Footer */}
          <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border bg-surface/95 dark:bg-surface/90 backdrop-blur-md shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
            <button 
              type="button"
              onClick={onClose} 
              className="flex-1 py-3 text-xs font-black text-muted-foreground hover:text-foreground rounded-xl border border-border cursor-pointer active:scale-95 bg-secondary/50 transition-all"
            >
              CANCEL
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="flex-1 py-3 text-xs font-black text-primary-foreground bg-primary rounded-xl active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>SUBMIT REQUEST</span>
            </button>
          </div>

        </form>
      </motion.div>
    </>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="aether-glass p-8 text-center bg-secondary/25 border border-dashed border-border rounded-2xl py-14 my-2">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/10 border border-primary/20 text-primary mx-auto mb-3 shadow-inner">
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-xs font-black text-foreground block uppercase tracking-wider">{title}</span>
      <span className="text-[11px] text-muted-foreground mt-1 block max-w-xs mx-auto leading-relaxed font-semibold">{subtitle}</span>
    </div>
  );
}
