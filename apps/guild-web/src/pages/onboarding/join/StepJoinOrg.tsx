import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, Link2, Building2, Loader2, CheckCircle2, XCircle, ChevronRight, AlertTriangle, User } from 'lucide-react';
import { StepHeader } from '../../../components/onboarding/StepHeader';
import { getOrgBySlug, validateInviteToken, type Organization } from '../../../lib/firestore';
import { setOnboardingState } from '../../../lib/firestore';
import { useAuth } from '../../../hooks/useAuth';
import type { OnboardingData } from '../OnboardingRoot';
import { cn } from '@/lib/utils';

type JoinMethod = 'slug' | 'invite';

interface Props {
  data: OnboardingData;
  updateData: (patch: Partial<OnboardingData>) => void;
}

export function StepJoinOrg({ data, updateData }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [method, setMethod] = React.useState<JoinMethod>('slug');
  const [slugInput, setSlugInput] = React.useState('');
  const [inviteInput, setInviteInput] = React.useState('');
  const [org, setOrg] = React.useState<Organization | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Parse invite token from URL if present
  React.useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    if (token) {
      setInviteInput(token);
      setMethod('invite');
    }
  }, []);

  const searchBySlug = async () => {
    if (!slugInput.trim()) return;
    setIsSearching(true);
    setError('');
    setOrg(null);
    try {
      const found = await getOrgBySlug(slugInput.trim().toLowerCase());
      if (found) {
        setOrg(found);
      } else {
        setError('No organization found with that username.');
      }
    } catch {
      setError('Failed to search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const searchByInvite = async () => {
    if (!inviteInput.trim()) return;
    setIsSearching(true);
    setError('');
    setOrg(null);

    // Support full URL or just token
    let token = inviteInput.trim();
    try {
      const url = new URL(token);
      token = url.searchParams.get('token') || token;
    } catch {}

    try {
      const result = await validateInviteToken(token);
      if (result.valid && result.org) {
        setOrg(result.org);
        updateData({ inviteToken: token });
      } else {
        setError(result.error || 'Invalid invite link.');
      }
    } catch {
      setError('Failed to validate invite link. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleContinue = async () => {
    if (!org || !user) return;
    setIsSubmitting(true);
    try {
      await setOnboardingState(user.uid, { step: 2, path: 'join' });
      updateData({ joinOrgId: org.id, joinOrgName: org.name });
      navigate('/onboarding/join/profile');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[500px] px-4 flex flex-col items-center">
      <StepHeader
        step={2}
        totalSteps={4}
        title="Find your team"
        subtitle="Connect with your organization's operational workspace."
      />

      <div className="aether-glass w-full p-8 mt-8 shadow-2xl relative overflow-hidden border border-white/10">
        <div className="absolute inset-0 bg-dashboard-grid opacity-20 pointer-events-none" />

        {/* Method Toggle Buttons */}
        <div className="flex rounded-xl border border-white/5 bg-black/40 p-1 mb-6 relative z-10">
          <button
            onClick={() => { setMethod('slug'); setOrg(null); setError(''); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer',
              method === 'slug' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-text-muted hover:text-white'
            )}
          >
            <Search className="h-3.5 w-3.5" />
            By Handle
          </button>
          <button
            onClick={() => { setMethod('invite'); setOrg(null); setError(''); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer',
              method === 'invite' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'text-text-muted hover:text-white'
            )}
          >
            <Link2 className="h-3.5 w-3.5" />
            By Invite Link
          </button>
        </div>

        <div className="space-y-5 relative z-10">
          {/* Method: By Slug */}
          {method === 'slug' ? (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                Workspace Handle
              </label>
              <div className="flex gap-2">
                <div className="relative group flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted select-none">guild.app/</span>
                  <input
                    value={slugInput}
                    onChange={(e) => { setSlugInput(e.target.value.toLowerCase()); setOrg(null); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && searchBySlug()}
                    placeholder="acme-corp"
                    className="w-full h-10 rounded-xl border border-white/5 bg-white/5 pl-18 pr-4 text-xs font-mono text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 focus:bg-white/10 transition-all duration-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={searchBySlug}
                  disabled={isSearching || !slugInput}
                  className="h-10 px-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center cursor-pointer active:scale-95 flex-shrink-0"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ) : (
            /* Method: By Invite Link */
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                Invite Token or Link
              </label>
              <div className="flex gap-2">
                <div className="relative group flex-1">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted transition-colors group-focus-within:text-indigo-400" />
                  <input
                    value={inviteInput}
                    onChange={(e) => { setInviteInput(e.target.value); setOrg(null); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && searchByInvite()}
                    placeholder="https://guild.app/join/token"
                    className="w-full h-10 rounded-xl border border-white/5 bg-white/5 pl-10 pr-4 text-xs font-semibold text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 focus:bg-white/10 transition-all duration-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={searchByInvite}
                  disabled={isSearching || !inviteInput}
                  className="h-10 px-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center cursor-pointer active:scale-95 flex-shrink-0"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Validation Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3"
            >
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-[11px] font-semibold text-destructive">{error}</p>
            </motion.div>
          )}

          {/* Majestic Org Preview Card */}
          {org && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4.5 flex items-center gap-4 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-dashboard-grid opacity-10 pointer-events-none" />
              
              {/* Teammate presence visual logo representation */}
              <div className="relative flex-shrink-0 select-none">
                <div className="teammate-halo active text-emerald-500">
                  <div className="h-11 w-11 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/30 text-emerald-400 border border-emerald-500/30 text-sm font-black shadow-lg">
                    {org.name[0].toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-white truncate uppercase tracking-tight">{org.name}</h4>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                </div>
                <p className="text-[10px] text-text-muted mt-0.5 font-bold uppercase tracking-wider">
                  {org.industry} · {org.companySize} employees
                </p>
              </div>
            </motion.div>
          )}

          {/* Submit/Continue Join */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={!org || isSubmitting}
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <>
                Join {org?.name || 'Organization'}
                <ChevronRight className="h-4 w-4 text-white" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
