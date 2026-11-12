import * as React from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import {
  FileCheck2,
  Check,
  X,
  Clock,
  Trash2,
  DollarSign,
  Briefcase,
  Laptop,
  KeyRound,
  Calendar,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { cn } from '@guild/utils';
import { useAuth } from '../../../hooks/useAuth';
import { updateRequestStatus } from '../../../lib/requests';

type RequisitionType = 'expense' | 'equipment' | 'leave' | 'access';

const TYPE_CONFIG: Record<RequisitionType, { label: string; icon: any; color: string }> = {
  equipment: {
    label: 'Equipment & Hardware',
    icon: Laptop,
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
  },
  expense: {
    label: 'Expense Reimbursement',
    icon: DollarSign,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  },
  leave: {
    label: 'Leave of Absence',
    icon: Calendar,
    color: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20'
  },
  access: {
    label: 'System Access Grant',
    icon: KeyRound,
    color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20'
  }
};

export function InlineRequestBlock({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const { userProfile } = useAuth();

  const requestId = node.attrs.requestId || null;
  const reqType: RequisitionType = (node.attrs.type as RequisitionType) || 'equipment';
  const title = node.attrs.title ?? '';
  const amount = node.attrs.amount ?? '';
  const department = node.attrs.department || 'Engineering';
  const status: 'pending' | 'approved' | 'rejected' = node.attrs.status || 'pending';
  const requesterName = node.attrs.requesterName || (userProfile?.fullName || 'Requester');
  const requesterAvatar = node.attrs.requesterAvatar || '';
  const reviewerName = node.attrs.reviewerName || '';
  const reviewerNotes = node.attrs.reviewerNotes || '';
  const submittedAt = node.attrs.submittedAt || 'Today';

  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState(title);
  const [isEditingAmount, setIsEditingAmount] = React.useState(false);
  const [amountDraft, setAmountDraft] = React.useState(amount);

  React.useEffect(() => {
    setTitleDraft(node.attrs.title ?? '');
  }, [node.attrs.title]);

  React.useEffect(() => {
    setAmountDraft(node.attrs.amount ?? '');
  }, [node.attrs.amount]);

  const [managerNote, setManagerNote] = React.useState(reviewerNotes);
  const [showNoteInput, setShowNoteInput] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const typeConfig = TYPE_CONFIG[reqType] || TYPE_CONFIG.equipment;
  const TypeIcon = typeConfig.icon;

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    setIsSubmitting(true);
    const reviewer = userProfile?.fullName || 'Manager';
    try {
      if (requestId && userProfile?.organizationId && userProfile?.uid) {
        await updateRequestStatus(
          requestId,
          userProfile.organizationId,
          decision,
          userProfile.uid,
          reviewer,
          userProfile.username || 'manager',
          node.attrs.creatorId || '',
          title,
          managerNote.trim() || undefined
        );
      }
    } catch (err) {
      console.warn('[InlineRequestBlock] Firestore sync warning:', err);
    } finally {
      updateAttributes({
        status: decision,
        reviewerName: reviewer,
        reviewerNotes: managerNote.trim() || null,
        decidedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setIsSubmitting(false);
      setShowNoteInput(false);
    }
  };

  const handleReset = () => {
    updateAttributes({
      status: 'pending',
      reviewerName: '',
      reviewerNotes: null
    });
  };

  return (
    <NodeViewWrapper className="my-5 not-prose">
      <div className="relative group/req rounded-2xl border border-border dark:border-border-strong bg-surface/90 dark:bg-surface/55 backdrop-blur-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
        {/* Specular status glow bar */}
        <div
          className={cn(
            'h-1 w-full transition-colors duration-300',
            status === 'approved' && 'bg-emerald-500',
            status === 'rejected' && 'bg-rose-500',
            status === 'pending' && 'bg-amber-500'
          )}
        />

        <div className="p-5 sm:p-6 space-y-4">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/80 dark:bg-secondary/40 border border-border flex items-center justify-center text-primary shadow-xs">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1', typeConfig.color)}>
                    <TypeIcon className="w-3 h-3" />
                    {typeConfig.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {department}
                  </span>
                </div>

                {isEditingTitle ? (
                  <input
                    type="text"
                    autoFocus
                    placeholder="Requisition title..."
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={() => {
                      setIsEditingTitle(false);
                      updateAttributes({ title: titleDraft.trim() });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsEditingTitle(false);
                        updateAttributes({ title: titleDraft.trim() });
                      }
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    className="bg-transparent border-b border-primary text-base font-bold text-foreground placeholder:text-muted-foreground/40 outline-none px-1 mt-0.5"
                  />
                ) : (
                  <h3
                    onClick={() => setIsEditingTitle(true)}
                    className="text-base font-bold text-foreground hover:text-primary cursor-pointer tracking-tight mt-0.5 transition-colors"
                    title="Click to edit requisition title"
                  >
                    {title || <span className="text-muted-foreground/50 italic font-normal">Requisition title...</span>}
                  </h3>
                )}
              </div>
            </div>

            {/* Status Pill & Delete Button */}
            <div className="flex items-center gap-2 shrink-0">
              {status === 'pending' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Pending Review
                </span>
              )}
              {status === 'approved' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Approved
                </span>
              )}
              {status === 'rejected' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold">
                  <X className="w-3.5 h-3.5 text-rose-500" />
                  Declined
                </span>
              )}

              <button
                type="button"
                onClick={() => deleteNode()}
                title="Remove Requisition Block"
                className="opacity-0 group-hover/req:opacity-100 p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Details & Amount Box */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/50 dark:bg-secondary/25 border border-border/70 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                {(requesterName || 'R').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-foreground">Requested by {requesterName}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {submittedAt}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Amount / Scope</div>
              {isEditingAmount ? (
                <input
                  type="text"
                  autoFocus
                  placeholder="$0.00 USD"
                  value={amountDraft}
                  onChange={(e) => setAmountDraft(e.target.value)}
                  onBlur={() => {
                    setIsEditingAmount(false);
                    updateAttributes({ amount: amountDraft.trim() });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingAmount(false);
                      updateAttributes({ amount: amountDraft.trim() });
                    }
                    if (e.key === 'Escape') setIsEditingAmount(false);
                  }}
                  className="bg-transparent border-b border-primary text-sm font-bold font-mono text-foreground placeholder:text-muted-foreground/40 outline-none px-1 text-right w-28"
                />
              ) : (
                <div
                  onClick={() => setIsEditingAmount(true)}
                  className="text-sm font-bold font-mono text-foreground hover:text-primary cursor-pointer transition-colors"
                  title="Click to edit amount"
                >
                  {amount || <span className="text-muted-foreground/50 italic font-normal text-xs font-sans">$0.00 USD</span>}
                </div>
              )}
            </div>
          </div>

          {/* Reviewer Note if already decided */}
          {reviewerName && (
            <div className="p-3 rounded-xl bg-surface/70 dark:bg-surface/30 border border-border text-xs flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">
                  Reviewed by <span className="text-primary font-bold">{reviewerName}</span>
                </div>
                {reviewerNotes && (
                  <p className="text-muted-foreground text-[11px] mt-0.5 italic">
                    "{reviewerNotes}"
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-muted-foreground hover:text-foreground font-medium underline"
              >
                Reset
              </button>
            </div>
          )}

          {/* Manager Action Bar (When Pending) */}
          {status === 'pending' && (
            <div className="pt-1 space-y-2.5">
              {showNoteInput && (
                <div className="flex items-center gap-2 animate-in fade-in duration-200">
                  <input
                    type="text"
                    placeholder="Add approval condition or budget code note..."
                    value={managerNote}
                    onChange={(e) => setManagerNote(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-surface dark:bg-surface/90 border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNoteInput(false)}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowNoteInput(!showNoteInput)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {showNoteInput ? 'Hide note' : 'Add manager note'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleDecision('rejected')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-all active:scale-[0.98]"
                  >
                    <X className="w-3.5 h-3.5" />
                    Decline
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleDecision('approved')}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve Requisition
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}
