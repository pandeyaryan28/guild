import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, X, Link2, Copy, Check, Loader2, Mail, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { createInviteLink, createPendingEmailInvite, getOrCreateGlobalInviteLink, resetGlobalInviteLink } from '../../lib/firestore';
import { cn } from '@/lib/utils';
import { isValidEmail } from '../../lib/validation';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  userId: string;
}

type InviteTab = 'email' | 'global' | 'single';

export function InviteModal({ isOpen, onClose, orgId, userId }: InviteModalProps) {
  const [activeTab, setActiveTab] = React.useState<InviteTab>('email');
  
  // Tab: Email
  const [emailInput, setEmailInput] = React.useState('');
  const [roleInput, setRoleInput] = React.useState<'member' | 'admin'>('member');
  const [isInviting, setIsInviting] = React.useState(false);
  const [emailSuccess, setEmailSuccess] = React.useState<string | null>(null);

  // Tab: Global Link
  const [globalLink, setGlobalLink] = React.useState<string | null>(null);
  const [isFetchingGlobal, setIsFetchingGlobal] = React.useState(false);
  
  // Tab: Single Use
  const [singleLink, setSingleLink] = React.useState<string | null>(null);
  const [isGeneratingSingle, setIsGeneratingSingle] = React.useState(false);

  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setEmailInput('');
      setEmailSuccess(null);
      setGlobalLink(null);
      setSingleLink(null);
      setCopied(false);
      setError(null);
    } else {
      // Auto-load global link if active
      if (activeTab === 'global') {
        loadGlobalLink();
      }
    }
  }, [isOpen, activeTab]);

  const loadGlobalLink = async () => {
    setIsFetchingGlobal(true);
    setError(null);
    try {
      const token = await getOrCreateGlobalInviteLink(orgId, userId);
      setGlobalLink(`${window.location.origin}/join/${token}`);
    } catch (err: any) {
      setError(err.message || 'Failed to load permanent invite link.');
    } finally {
      setIsFetchingGlobal(false);
    }
  };

  const handleResetGlobal = async () => {
    if (!confirm('Are you sure you want to reset this permanent link? All previously shared copies of this specific link will be instantly invalidated.')) {
      return;
    }
    setIsFetchingGlobal(true);
    setError(null);
    setCopied(false);
    try {
      const token = await resetGlobalInviteLink(orgId, userId);
      setGlobalLink(`${window.location.origin}/join/${token}`);
    } catch (err: any) {
      setError(err.message || 'Failed to reset permanent link.');
    } finally {
      setIsFetchingGlobal(false);
    }
  };

  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    
    if (!isValidEmail(emailInput.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsInviting(true);
    setError(null);
    setEmailSuccess(null);
    try {
      await createPendingEmailInvite(emailInput.trim(), orgId, roleInput, userId);
      setEmailSuccess(`Successfully invited ${emailInput.trim()}! When they sign up, they will automatically join your organization.`);
      setEmailInput('');
    } catch (err: any) {
      setError(err.message || 'Failed to send direct email invitation.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleGenerateSingle = async () => {
    setIsGeneratingSingle(true);
    setError(null);
    try {
      const token = await createInviteLink(orgId, userId, false);
      setSingleLink(`${window.location.origin}/join/${token}`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate single-use invite link.');
    } finally {
      setIsGeneratingSingle(false);
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
                    <p className="text-[10px] text-muted-foreground mt-1 font-semibold leading-none">Add new members to your operational command.</p>
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
                  Email Invite
                </button>
                <button
                  onClick={() => { setActiveTab('global'); setError(null); }}
                  className={cn(
                    'px-3 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer leading-none',
                    activeTab === 'global' ? 'border-indigo-500 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  Permanent Link
                </button>
                <button
                  onClick={() => { setActiveTab('single'); setError(null); }}
                  className={cn(
                    'px-3 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer leading-none',
                    activeTab === 'single' ? 'border-indigo-500 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  Secure Code
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
                  <form onSubmit={handleEmailInvite} className="space-y-4">
                    {emailSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 dark:text-emerald-400 font-semibold leading-relaxed">
                        {emailSuccess}
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                        Teammate Email
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-indigo-500" />
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => { setEmailInput(e.target.value); setError(null); setEmailSuccess(null); }}
                          placeholder="jane@company.com"
                          required
                          className="w-full h-10 rounded-xl border border-border-default/60 bg-surface/50 dark:bg-white/5 pl-10 pr-4 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                        Workspace Access Role
                      </label>
                      <select
                        value={roleInput}
                        onChange={(e) => setRoleInput(e.target.value as any)}
                        className="w-full h-10 rounded-xl border border-border-default/60 bg-surface/50 dark:bg-white/5 px-4.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200 cursor-pointer appearance-none [&>option]:bg-surface [&>option]:text-foreground"
                      >
                        <option value="member" className="text-foreground bg-surface">Regular Member (Tasks, chat, requests)</option>
                        <option value="admin" className="text-foreground bg-surface">Administrator (Settings, teammate management)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isInviting || !emailInput}
                      className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-2"
                    >
                      {isInviting ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : 'Pre-Authorize Colleague'}
                    </button>
                  </form>
                )}

                {/* Tab: Permanent Org-wide Invite Link */}
                {activeTab === 'global' && (
                  <div className="space-y-4">
                    {isFetchingGlobal ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Syncing permanent token...</span>
                      </div>
                    ) : globalLink ? (
                      <div className="space-y-4">
                        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          <Sparkles className="h-4 w-4 flex-shrink-0" />
                          Multi-use permanent link: Share with your entire team.
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                            Teammate Invitation URL
                          </label>
                          <div className="flex items-center gap-2 p-1 rounded-xl border border-border-default/60 dark:border-white/5 bg-surface/80 dark:bg-black/35 shadow-sm">
                            <input
                              readOnly
                              value={globalLink}
                              className="flex-1 bg-transparent px-3 py-2 text-xs font-semibold text-foreground outline-none font-mono truncate"
                            />
                            <button
                              onClick={() => handleCopy(globalLink)}
                              className={cn(
                                'flex items-center justify-center h-8 w-8 rounded-lg transition-all cursor-pointer flex-shrink-0 active:scale-95',
                                copied ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/25' : 'bg-indigo-600 text-white shadow shadow-indigo-600/10 hover:bg-indigo-500'
                              )}
                            >
                              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="border-t border-border-default pt-4 mt-2 flex items-center justify-between gap-4">
                          <div className="text-[10px] text-muted-foreground leading-tight font-semibold">
                            Accidentally posted publicly?<br />Revoke and generate a new token link.
                          </div>
                          <button
                            onClick={handleResetGlobal}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-widest text-rose-500 dark:text-rose-400 transition-all cursor-pointer active:scale-95 flex-shrink-0"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Reset Link
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={loadGlobalLink}
                        className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        Generate Permanent Workspace Link
                      </button>
                    )}
                  </div>
                )}

                {/* Tab: Single-Use Secure Invite Code */}
                {activeTab === 'single' && (
                  <div className="space-y-4">
                    {!singleLink ? (
                      <div className="flex flex-col items-center justify-center text-center py-4">
                        <div className="p-4 rounded-full bg-indigo-500/5 border border-indigo-500/10 text-indigo-500/55 mb-3">
                          <Link2 className="h-7 w-7" />
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-4 max-w-[280px] font-semibold leading-normal">
                          Generates a secure, single-use registration URL that instantly expires once a single member claims it.
                        </p>
                        <button
                          onClick={handleGenerateSingle}
                          disabled={isGeneratingSingle}
                          className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                        >
                          {isGeneratingSingle ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : 'Generate Secure Ticket'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                            Single-Use Secure URL
                          </label>
                          <div className="flex items-center gap-2 p-1 rounded-xl border border-border-default/60 dark:border-white/5 bg-surface/80 dark:bg-black/35 shadow-sm">
                            <input
                              readOnly
                              value={singleLink}
                              className="flex-1 bg-transparent px-3 py-2 text-xs font-semibold text-foreground outline-none font-mono truncate"
                            />
                            <button
                              onClick={() => handleCopy(singleLink)}
                              className={cn(
                                'flex items-center justify-center h-8 w-8 rounded-lg transition-all cursor-pointer flex-shrink-0 active:scale-95',
                                copied ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/25' : 'bg-indigo-600 text-white shadow shadow-indigo-600/10 hover:bg-indigo-500'
                              )}
                            >
                              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-wider mt-2.5">
                          This url can be claimed once and expires in 24 hours.
                        </p>
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
