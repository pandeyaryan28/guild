import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, Link2, Building2, Loader2, CheckCircle2, XCircle, ChevronRight, AlertTriangle } from 'lucide-react';
import { StepHeader } from '../../../components/onboarding/StepHeader';
import { FormField, TextInput, OnboardingCard } from '../../../components/onboarding/FormComponents';
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
    <div className="w-full max-w-lg">
      <StepHeader
        step={2}
        totalSteps={4}
        title="Find your organization"
        subtitle="Search by username or paste your invite link."
      />

      <OnboardingCard>
        {/* Method toggle */}
        <div className="flex rounded-xl border border-border-default bg-bg-tertiary p-1 mb-6">
          <button
            onClick={() => { setMethod('slug'); setOrg(null); setError(''); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-bold transition-all',
              method === 'slug' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Search className="h-3.5 w-3.5" />
            By Username
          </button>
          <button
            onClick={() => { setMethod('invite'); setOrg(null); setError(''); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-bold transition-all',
              method === 'invite' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Link2 className="h-3.5 w-3.5" />
            By Invite Link
          </button>
        </div>

        {/* Search form */}
        <div className="space-y-4">
          {method === 'slug' ? (
            <FormField label="Organization Username">
              <div className="flex gap-2">
                <div className="relative group flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted">guild.app/</span>
                  <input
                    value={slugInput}
                    onChange={(e) => { setSlugInput(e.target.value); setOrg(null); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && searchBySlug()}
                    placeholder="acme-corp"
                    className="w-full h-11 rounded-xl border border-border-default bg-bg-tertiary pl-[72px] pr-4 text-sm font-mono text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={searchBySlug}
                  disabled={isSearching || !slugInput}
                  className="h-11 px-4 rounded-xl bg-bg-tertiary border border-border-default hover:bg-bg-tertiary text-sm font-bold text-foreground transition-all disabled:opacity-40 flex items-center gap-2"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
          ) : (
            <FormField label="Invite Link or Token" hint="Paste the full invite URL or just the token.">
              <div className="flex gap-2">
                <TextInput
                  icon={Link2}
                  value={inviteInput}
                  onChange={(e) => { setInviteInput(e.target.value); setOrg(null); setError(''); }}
                  onKeyDown={(e: any) => e.key === 'Enter' && searchByInvite()}
                  placeholder="https://guild.app/join?token=..."
                />
                <button
                  type="button"
                  onClick={searchByInvite}
                  disabled={isSearching || !inviteInput}
                  className="h-11 px-4 rounded-xl bg-bg-tertiary border border-border-default hover:bg-bg-tertiary text-sm font-bold text-foreground transition-all disabled:opacity-40 flex items-center gap-2"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3"
            >
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-xs font-medium text-destructive">{error}</p>
            </motion.div>
          )}

          {/* Org preview */}
          {org && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-4"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-base font-black text-primary-foreground shadow-lg shadow-primary/20">
                {org.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground truncate">{org.name}</h4>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {org.industry} · {org.companySize} employees
                </p>
              </div>
            </motion.div>
          )}

          {/* Continue */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={!org || isSubmitting}
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Join {org?.name || 'Organization'} <ChevronRight className="h-4 w-4" /></>}
          </button>
        </div>
      </OnboardingCard>
    </div>
  );
}
