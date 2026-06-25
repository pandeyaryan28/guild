import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, X, Link2, Copy, Check, Loader2, Mail, ShieldAlert, Sparkles } from 'lucide-react';
import { createInviteLink } from '../../lib/firestore';
import { cn } from '@/lib/utils';
import { isValidEmail } from '../../lib/validation';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  userId: string;
}

type InviteTab = 'email' | 'link';

export function InviteModal({ isOpen, onClose, orgId, userId }: InviteModalProps) {
  const [activeTab, setActiveTab] = React.useState<InviteTab>('email');
  
  // Tab: Email
  const [emailInput, setEmailInput] = React.useState('');
  const [emailLink, setEmailLink] = React.useState<string | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = React.useState(false);

  // Tab: Shareable Link
  const [maxUses, setMaxUses] = React.useState<string>('5');
  const [expiresDays, setExpiresDays] = React.useState<string>('7');
  const [shareableLink, setShareableLink] = React.useState<string | null>(null);
  const [isGeneratingShareable, setIsGeneratingShareable] = React.useState(false);

  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setEmailInput('');
      setEmailLink(null);
      setShareableLink(null);
      setCopied(false);
      setError(null);
      setMaxUses('5');
      setExpiresDays('7');
    }
  }, [isOpen]);

  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    
    if (!isValidEmail(emailInput.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsGeneratingEmail(true);
    setError(null);
    setEmailLink(null);
    try {
      const token = await createInviteLink(orgId, userId, {
        email: emailInput.trim(),
        maxUses: 1,
        expiresDays: 7,
        role: 'member'
      });
      setEmailLink(`${window.location.origin}/join/${token}`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate direct email invite.');
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleGenerateShareable = async () => {
    setIsGeneratingShareable(true);
    setError(null);
    setShareableLink(null);
    try {
      const limit = maxUses === 'unlimited' ? null : Number(maxUses);
      const token = await createInviteLink(orgId, userId, {
        maxUses: limit,
        expiresDays: Number(expiresDays),
        role: 'member'
      });
      setShareableLink(`${window.location.origin}/join/${token}`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate shareable invite link.');
    } finally {
      setIsGeneratingShareable(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="aether-glass w-full max-w-md shadow-2xl relative overflow-hidden pointer-events-auto border border-border-default/30 p-0"
              style={{ borderRadius: '28px' }}
            >
              <div className="absolute inset-0 bg-dashboard-grid opacity-20 pointer-events-none" />

              {/* Header */}
              <div className="p-6 border-b border-border-default/60 dark:border-white/5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-foreground leading-none uppercase tracking-tight">Invite Teammates</h2>
                    <p className="text-[10px] text-muted-foreground mt-1 font-semibold leading-none">Add new members to your workspace.</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Navigation Subtabs */}
              <div className="px-6 pt-4 relative z-10 flex border-b border-border-default/60 dark:border-white/5 bg-surface/20 dark:bg-black/20 gap-1.5">
                <button
                  onClick={() => { setActiveTab('email'); setError(null); }}
                  className={cn(
                    'px-3 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer leading-none',
                    activeTab === 'email' ? 'border-indigo-500 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  Invite by Email
                </button>
                <button
                  onClick={() => { setActiveTab('link'); setError(null); }}
                  className={cn(
                    'px-3 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer leading-none',
                    activeTab === 'link' ? 'border-indigo-500 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  Shareable Link
                </button>
              </div>

              {/* Content Panel */}
              <div className="p-6 relative z-10">
                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-semibold flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Tab: Direct Email Invite */}
                {activeTab === 'email' && (
                  <div className="space-y-4">
                    {!emailLink ? (
                      <form onSubmit={handleEmailInvite} className="space-y-4">
                        <p className="text-[11px] text-muted-foreground font-semibold leading-normal">
                          Authorize a specific colleague by email. They must log in with this email to join. The link is single-use and valid for 7 days.
                        </p>
                        
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                            Teammate Email
                          </label>
                          <div className="relative group">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-indigo-500" />
                            <input
                              type="email"
                              value={emailInput}
                              onChange={(e) => { setEmailInput(e.target.value); setError(null); }}
                              placeholder="jane@company.com"
                              required
                              className="w-full h-10 rounded-xl border border-border-default/60 bg-surface/50 dark:bg-white/5 pl-10 pr-4 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isGeneratingEmail || !emailInput}
                          className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-2"
                        >
                          {isGeneratingEmail ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : 'Pre-Authorize Colleague'}
                        </button>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 dark:text-emerald-400 font-semibold leading-relaxed">
                          Successfully pre-authorized {emailInput}! Share this unique link with them so they can claim their account.
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                            Unique Invitation URL
                          </label>
                          <div className="flex items-center gap-2 p-1 rounded-xl border border-border-default/60 dark:border-white/5 bg-surface/80 dark:bg-black/35 shadow-sm">
                            <input
                              readOnly
                              value={emailLink}
                              className="flex-1 bg-transparent px-3 py-2 text-xs font-semibold text-foreground outline-none font-mono truncate"
                            />
                            <button
                              onClick={() => handleCopy(emailLink)}
                              className={cn(
                                'flex items-center justify-center h-8 w-8 rounded-lg transition-all cursor-pointer flex-shrink-0 active:scale-95',
                                copied ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/25' : 'bg-indigo-600 text-white shadow shadow-indigo-600/10 hover:bg-indigo-500'
                              )}
                            >
                              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setEmailLink(null);
                            setEmailInput('');
                          }}
                          className="w-full h-10 rounded-xl border border-border-default hover:bg-surface-hover text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                        >
                          Invite Another Colleague
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Shareable Link */}
                {activeTab === 'link' && (
                  <div className="space-y-4">
                    {!shareableLink ? (
                      <div className="space-y-4">
                        <p className="text-[11px] text-muted-foreground font-semibold leading-normal">
                          Create a multi-use or single-use invitation link that you can share with your team.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                              Max Uses
                            </label>
                            <select
                              value={maxUses}
                              onChange={(e) => setMaxUses(e.target.value)}
                              className="w-full h-10 rounded-xl border border-border-default/60 bg-surface/50 dark:bg-white/5 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200 cursor-pointer"
                            >
                              <option value="1">1 Use</option>
                              <option value="5">5 Uses</option>
                              <option value="10">10 Uses</option>
                              <option value="50">50 Uses</option>
                              <option value="unlimited">Unlimited</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                              Expires In
                            </label>
                            <select
                              value={expiresDays}
                              onChange={(e) => setExpiresDays(e.target.value)}
                              className="w-full h-10 rounded-xl border border-border-default/60 bg-surface/50 dark:bg-white/5 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200 cursor-pointer"
                            >
                              <option value="1">1 Day</option>
                              <option value="7">7 Days</option>
                              <option value="30">30 Days</option>
                            </select>
                          </div>
                        </div>

                        <button
                          onClick={handleGenerateShareable}
                          disabled={isGeneratingShareable}
                          className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98 mt-2"
                        >
                          {isGeneratingShareable ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : 'Generate Shareable Link'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          <Sparkles className="h-4 w-4 flex-shrink-0" />
                          Shareable invite link generated. Copy the URL below.
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                            Invitation URL
                          </label>
                          <div className="flex items-center gap-2 p-1 rounded-xl border border-border-default/60 dark:border-white/5 bg-surface/80 dark:bg-black/35 shadow-sm">
                            <input
                              readOnly
                              value={shareableLink}
                              className="flex-1 bg-transparent px-3 py-2 text-xs font-semibold text-foreground outline-none font-mono truncate"
                            />
                            <button
                              onClick={() => handleCopy(shareableLink)}
                              className={cn(
                                'flex items-center justify-center h-8 w-8 rounded-lg transition-all cursor-pointer flex-shrink-0 active:scale-95',
                                copied ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/25' : 'bg-indigo-600 text-white shadow shadow-indigo-600/10 hover:bg-indigo-500'
                              )}
                            >
                              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setShareableLink(null);
                          }}
                          className="w-full h-10 rounded-xl border border-border-default hover:bg-surface-hover text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                        >
                          Create Another Link
                        </button>
                      </div>
                    )}
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
