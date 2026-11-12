import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Loader2, X, Calendar } from 'lucide-react';
import type { OrgRequest } from '@guild/types';
import { REQUEST_TYPE_LABELS } from '../../lib/requests';

interface ApprovalActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: OrgRequest | null;
  mode: 'approved' | 'rejected';
  onConfirm: (requestId: string, status: 'approved' | 'rejected', note?: string) => Promise<void>;
}

export function ApprovalActionModal({
  isOpen,
  onClose,
  request,
  mode,
  onConfirm,
}: ApprovalActionModalProps) {
  const [note, setNote] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setNote('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !request) return null;

  const isApprove = mode === 'approved';

  const handleAction = async () => {
    setLoading(true);
    try {
      await onConfirm(request.id, mode, note.trim() || undefined);
      onClose();
    } catch (err) {
      console.error('Failed to submit decision:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="w-full max-w-md bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden p-6 relative"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isApprove
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {isApprove ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {isApprove ? 'Approve Request' : 'Reject Request'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {REQUEST_TYPE_LABELS[request.type] || 'Request'} from @{request.creatorUsername || request.creatorName}
              </p>
            </div>
          </div>

          {/* Request summary box */}
          <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/60 mb-4 text-xs">
            <p className="font-semibold text-foreground mb-1 line-clamp-1">{request.title}</p>
            {request.description && (
              <p className="text-muted-foreground line-clamp-2">{request.description}</p>
            )}
            {(request.startDate || request.endDate) && (
              <div className="mt-2 text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span>{request.startDate} {request.endDate ? `→ ${request.endDate}` : ''}</span>
              </div>
            )}
          </div>

          {/* Note Input */}
          <div className="space-y-1.5 mb-5">
            <label className="text-xs font-semibold text-foreground">
              Decision Note <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isApprove ? 'Add an approval note or instruction...' : 'Reason for rejection...'}
              rows={3}
              className="w-full text-xs rounded-xl bg-background border border-border px-3 py-2 text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAction}
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                isApprove
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]'
                  : 'bg-rose-600 hover:bg-rose-700 active:scale-[0.98]'
              } disabled:opacity-50`}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
