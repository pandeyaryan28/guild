import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, X, Link2, Copy, Check, Loader2 } from 'lucide-react';
import { createInviteLink } from '../../lib/firestore';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  userId: string;
}

export function InviteModal({ isOpen, onClose, orgId, userId }: InviteModalProps) {
  const [inviteLink, setInviteLink] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setInviteLink(null);
      setCopied(false);
      setError(null);
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const token = await createInviteLink(orgId, userId);
      const url = `${window.location.origin}/join/${token}`;
      setInviteLink(url);
    } catch (err: any) {
      setError(err.message || 'Failed to generate invite link.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-bg-primary backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-card border border-border-default rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
            >
              <div className="p-6 border-b border-border-default flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Invite Member</h2>
                    <p className="text-sm text-muted-foreground">Generate a unique invite link.</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 font-medium">
                    {error}
                  </div>
                )}

                {!inviteLink ? (
                  <div className="flex flex-col items-center justify-center text-center py-6">
                    <div className="p-4 rounded-full bg-primary/5 text-primary/50 mb-4">
                      <Link2 className="h-8 w-8" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
                      Create a secure, single-use invite link that expires in 24 hours.
                    </p>
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        'Generate Link'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                        Shareable Link
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-border-default bg-background">
                        <input
                          readOnly
                          value={inviteLink}
                          className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none font-medium"
                        />
                        <button
                          onClick={handleCopy}
                          className={`flex items-center justify-center h-9 w-9 rounded-lg transition-all ${
                            copied
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-primary text-primary-foreground hover:bg-primary/90'
                          }`}
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center">
                      This link can only be used once and will expire in 24 hours.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
