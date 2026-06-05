import * as React from 'react';
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
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from '../../../hooks/useAuth';
import { useRequests } from '../../../hooks/useRequests';
import { useOrgMembers } from '../../../hooks/useChat';
import { useTeams } from '../../../hooks/useTeams';
import { 
  createRequest, 
  updateRequestStatus, 
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

export function MobileRequests() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { sent, received, pendingCount, loading } = useRequests(orgId);
  const members = useOrgMembers(orgId);
  const { teams } = useTeams(orgId);

  const [activeTab, setActiveTab] = React.useState<'inbox' | 'sent'>('inbox');
  const [modalOpen, setModalOpen] = React.useState(false);

  if (!userProfile || !orgId) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingReceived = received.filter((r) => r.status === 'pending');
  const historicReceived = received.filter((r) => r.status !== 'pending');

  return (
    <div className="flex flex-col space-y-4 animate-fluid-pop pb-6">
      
      {/* 1. Mobile Top Tab Switches */}
      <div className="aether-glass p-1.5 flex bg-bg-secondary/40 border border-border-subtle shadow-inner" style={{ borderRadius: '18px' }}>
        {[
          { id: 'inbox', label: 'Inbox', count: pendingCount },
          { id: 'sent', label: 'Sent', count: sent.length }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "relative flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer",
                isActive ? "text-white" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="requestsActiveTab"
                  className="absolute inset-0 bg-primary rounded-xl shadow-lg z-0"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-md text-[8px] font-black",
                    isActive ? "bg-white/20 text-white" : "bg-bg-tertiary text-primary"
                  )}>
                    {tab.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Requests Decks */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-bold">Checking inbox...</span>
        </div>
      ) : activeTab === 'inbox' ? (
        <div className="space-y-4">
          {pendingReceived.length === 0 && historicReceived.length === 0 ? (
            <EmptyState icon={Inbox} title="No approvals requested" subtitle="Requests requiring your signature will pop up here." />
          ) : (
            <>
              {pendingReceived.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block px-1">
                    PENDING ACTION ({pendingReceived.length})
                  </span>
                  {pendingReceived.map((r) => (
                    <MobileRequestCard key={r.id} req={r} isSent={false} currentUser={userProfile} orgId={orgId} />
                  ))}
                </div>
              )}

              {historicReceived.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block px-1 pt-3">
                    HISTORY LOGS
                  </span>
                  {historicReceived.map((r) => (
                    <MobileRequestCard key={r.id} req={r} isSent={false} currentUser={userProfile} orgId={orgId} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {sent.length === 0 ? (
            <EmptyState icon={Send} title="Inbox is empty" subtitle="Submit your very first approval request today." />
          ) : (
            sent.map((r) => (
              <MobileRequestCard key={r.id} req={r} isSent currentUser={userProfile} orgId={orgId} />
            ))
          )}
        </div>
      )}

      {/* Floating Action Button for New Request */}
      <div className="fixed bottom-20 right-5 z-30">
        <button
          onClick={() => setModalOpen(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-white shadow-lg shadow-primary/20 active:scale-90 transition-all cursor-pointer border border-border-default"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Create Request Modal */}
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
      </AnimatePresence>

    </div>
  );
}

// Compact Mobile Request Card
function MobileRequestCard({
  req, isSent, currentUser, orgId
}: {
  req: OrgRequest;
  isSent: boolean;
  currentUser: UserProfile;
  orgId: string;
}) {
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [acting, setActing] = React.useState(false);

  async function act(status: 'approved' | 'rejected') {
    setActing(true);
    try {
      await updateRequestStatus(req.id, orgId, status, currentUser.uid, currentUser.fullName, req.creatorId, req.title, note || undefined);
    } catch (err) {
      console.error(err);
    } finally {
      setActing(false);
      setNoteOpen(false);
    }
  }

  const statusIcons = { pending: Clock, approved: CheckCircle2, rejected: XCircle };
  const StatusIcon = statusIcons[req.status];

  const statusColor = (s: RequestStatus) => {
    if (s === 'approved') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    if (s === 'rejected') return 'text-red-400 bg-red-400/10 border-red-400/20';
    return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
  };

  return (
    <div className="aether-glass p-4 bg-bg-secondary/35 border border-border-subtle space-y-3 shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-black text-foreground block truncate leading-tight">{req.title}</span>
          <span className="text-[9px] text-muted-foreground block mt-1 font-semibold">
            {REQUEST_TYPE_LABELS[req.type]} · {isSent ? `Approver: ${req.approverName}` : `From: ${req.creatorName}`}
          </span>
        </div>
        
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border capitalize shrink-0", statusColor(req.status))}>
          <StatusIcon className="h-2.5 w-2.5" />
          <span>{req.status}</span>
        </span>
      </div>

      <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed line-clamp-3 bg-bg-secondary/15 p-2 rounded-lg border border-border-subtle/50">
        {req.description}
      </p>

      {/* Review Actions */}
      {!isSent && req.status === 'pending' && (
        <div className="pt-2 border-t border-border-subtle flex flex-col gap-2">
          {noteOpen ? (
            <div className="flex flex-col gap-2">
              <input
                className="w-full px-3 py-2 rounded-lg border border-border-default bg-bg-secondary text-[10px] text-foreground placeholder:text-muted-foreground outline-none font-bold"
                placeholder="Write a brief review note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => act('approved')} 
                  disabled={acting}
                  className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black shadow-md cursor-pointer active:scale-95"
                >
                  {acting ? 'Syncing...' : 'Approve'}
                </button>
                <button 
                  onClick={() => act('rejected')} 
                  disabled={acting}
                  className="flex-1 py-1.5 rounded-lg bg-red-500/80 text-white text-[10px] font-black shadow-md cursor-pointer active:scale-95"
                >
                  Reject
                </button>
                <button 
                  onClick={() => setNoteOpen(false)} 
                  className="px-3 rounded-lg bg-bg-secondary text-muted-foreground cursor-pointer active:scale-95 text-[10px] font-black border border-border-default"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end">
              <button 
                onClick={() => setNoteOpen(true)}
                className="py-1.5 px-4 rounded-lg bg-primary text-white text-[10px] font-black shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Sign Off / Review
              </button>
            </div>
          )}
        </div>
      )}

      {req.approverNote && (
        <div className="text-[9px] text-muted-foreground bg-bg-secondary/20 border border-border-subtle rounded-lg p-2.5 italic font-semibold">
          "{req.approverNote}"
        </div>
      )}
    </div>
  );
}

// Mobile-first Create Request Dialog
function MobileCreateModal({
  orgId, members, teams, currentUser, onClose
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

  React.useEffect(() => {
    if (currentUser.managerId) {
      const mgr = members.find(m => m.uid === currentUser.managerId);
      if (mgr) setSelectedApprover(mgr);
    }
  }, [currentUser, members]);

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
    if (!selectedApprover) { setError('Approver is required'); return; }
    if (!title.trim()) { setError('Title is required'); return; }
    if (!description.trim()) { setError('Description is required'); return; }
    setSubmitting(true);
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
      setError('Submission failed');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-xs">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full max-h-[92vh] aether-glass rounded-t-[32px] border-x-0 border-b-0 border-t border-border-default px-6 pb-6 pt-3 flex flex-col bg-surface/98 backdrop-blur-3xl overflow-hidden"
      >
        <div className="w-10 h-1.5 rounded-full bg-text-muted/20 mx-auto mb-4 shrink-0" />
        
        <div className="flex items-center justify-between border-b border-border-subtle pb-3 shrink-0">
          <span className="text-xs font-black text-foreground flex items-center gap-2">
            <FileText className="w-4.5 h-4.5 text-primary" />
            <span>SUBMIT NEW APPROVAL</span>
          </span>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-bg-secondary flex items-center justify-center text-muted-foreground cursor-pointer active:scale-90">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto aether-scroll py-4 space-y-4 pr-1">
          {/* Approver select */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">APPROVER SIGNATURE</span>
            <div className="relative">
              {selectedApprover ? (
                <div className="p-3.5 rounded-xl border border-border-subtle bg-bg-secondary/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-[10px] text-white"
                      style={{ background: `hsl(${avatarHue(selectedApprover.uid)} 55% 45%)` }}
                    >
                      {selectedApprover.fullName[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">{selectedApprover.fullName}</span>
                      <span className="text-[9px] text-muted-foreground block font-semibold mt-0.5">@{selectedApprover.username}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedApprover(null)} className="h-6 w-6 rounded-full bg-bg-secondary flex items-center justify-center text-muted-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="w-full py-3 px-4 rounded-xl border border-dashed border-border-default bg-bg-secondary/45 text-left text-xs font-black text-primary cursor-pointer active:scale-98"
                >
                  + SELECT APPROVER MEMBER
                </button>
              )}

              {searchOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs p-6 flex flex-col">
                  <div className="flex items-center justify-between pb-3 shrink-0">
                    <span className="text-xs font-black text-foreground">Select Approver</span>
                    <button onClick={() => setSearchOpen(false)} className="h-7 w-7 rounded-full bg-bg-secondary flex items-center justify-center"><X className="w-4 h-4" /></button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-3 rounded-xl border border-border-default bg-bg-secondary text-xs outline-none focus:border-primary/50 text-foreground font-bold shrink-0"
                  />
                  <div className="flex-1 overflow-y-auto space-y-2 mt-4">
                    {filteredMembers.map(m => (
                      <button 
                        key={m.uid}
                        type="button"
                        onClick={() => { setSelectedApprover(m); setSearchOpen(false); }}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-bg-secondary/40 border border-border-subtle hover:bg-bg-secondary/80 text-left"
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs" style={{ background: `hsl(${avatarHue(m.uid)} 55% 45%)` }}>
                          {m.fullName[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">{m.fullName}</span>
                          <span className="text-[9px] text-muted-foreground block font-semibold">@{m.username}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Type selections */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">REQUEST CATEGORY</span>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(REQUEST_TYPE_LABELS) as [RequestType, string][]).map(([k, label]) => (
                <button
                  key={k} type="button"
                  onClick={() => setType(k)}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer select-none",
                    type === k ? "border-primary bg-primary/10 text-primary" : "border-border-subtle bg-bg-secondary/40 text-muted-foreground"
                  )}
                >
                  <span className="text-xs shrink-0">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">TITLE</span>
            <input 
              type="text" 
              placeholder="e.g. Leave for Family Event"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border-default bg-bg-secondary/55 text-xs text-foreground placeholder:text-muted-foreground outline-none font-bold"
            />
          </div>

          {/* Dates */}
          {['sick_leave', 'work_from_home', 'time_off'].includes(type) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">FROM</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 rounded-xl border border-border-default bg-bg-secondary/55 text-xs text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark]" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">TO</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 rounded-xl border border-border-default bg-bg-secondary/55 text-xs text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark]" />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">DETAILS & DESCRIPTION</span>
            <textarea 
              rows={3}
              placeholder="Please explain the details of your request..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border-default bg-bg-secondary/55 text-xs text-foreground placeholder:text-muted-foreground outline-none font-bold resize-none"
            />
          </div>

          {error && <span className="text-xs text-red-400 font-bold block bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{error}</span>}
        </form>

        <div className="pt-3 border-t border-border-subtle flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-3 text-xs font-black text-muted-foreground rounded-xl border border-border-default cursor-pointer active:scale-95 bg-bg-secondary/40">
            CANCEL
          </button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={submitting}
            className="flex-1 py-3 text-xs font-black text-white bg-primary rounded-xl active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'SUBMIT REQUEST'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="aether-glass p-8 text-center bg-bg-secondary/15 border border-dashed border-border-subtle rounded-2xl py-16">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/25 text-primary mx-auto mb-3 shadow-inner">
        <Icon className="w-5.5 h-5.5" />
      </div>
      <span className="text-xs font-black text-foreground block uppercase tracking-wider">{title}</span>
      <span className="text-[10px] text-muted-foreground mt-1 block max-w-xs mx-auto leading-relaxed">{subtitle}</span>
    </div>
  );
}
