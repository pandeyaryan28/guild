import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Search, Building2 } from 'lucide-react';
import { StepHeader } from '../../../components/onboarding/StepHeader';
import { validateInviteToken, getOrgById, type Organization } from '../../../lib/firestore';
import { setOnboardingState } from '../../../lib/firestore';
import { useAuth } from '../../../hooks/useAuth';
import type { OnboardingData } from '../../../types/onboarding';

interface Props {
  data: OnboardingData;
  updateData: (patch: Partial<OnboardingData>) => void;
}

export function StepJoinOrg({ data, updateData }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [inviteInput, setInviteInput] = React.useState('');
  const [org, setOrg] = React.useState<Organization | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const queryParams = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const isAutoJoin = queryParams.get('autoJoin') === 'true';

  // Parse invite token from URL if present
  React.useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    if (token) {
      setInviteInput(token);
    }
  }, []);

  // Fetch auto-join organization details
  React.useEffect(() => {
    if (isAutoJoin && data.joinOrgId) {
      setIsSearching(true);
      getOrgById(data.joinOrgId)
        .then((result) => {
          if (result) {
            setOrg(result);
          } else {
            setError('The organization could not be found.');
          }
        })
        .catch(() => {
          setError('Failed to load organization details.');
        })
        .finally(() => {
          setIsSearching(false);
        });
    }
  }, [isAutoJoin, data.joinOrgId]);

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
      const result = await validateInviteToken(token, user?.email ?? undefined);
      if (result.valid && result.org) {
        setOrg(result.org);
        updateData({ inviteToken: token, inviteRole: result.invite?.role ?? 'member' });
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
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className="w-full max-w-[500px] px-4 flex flex-col items-center"
    >
      <StepHeader
        step={2}
        totalSteps={4}
        title={isAutoJoin ? 'Join Workspace' : 'Find Your Workspace'}
        subtitle={
          isAutoJoin
            ? "We found a matching workspace for your verified email domain."
            : 'Enter an invite link or token to locate your organization.'
        }
      />

      <div className="w-full p-8 mt-8 rounded-3xl bg-surface/90 dark:bg-card/75 backdrop-blur-2xl border border-border dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
        <div className="space-y-5">
          {/* Method: By Invite Link (Only show if not auto-joining) */}
          {!isAutoJoin && (
            <div className="space-y-1.5">
              <label htmlFor="invite-link" className="text-xs font-semibold text-foreground/80 pl-1">
                Invite Link or Token
              </label>
              <div className="flex gap-2">
                <input
                  id="invite-link"
                  value={inviteInput}
                  onChange={(e) => {
                    setInviteInput(e.target.value);
                    setOrg(null);
                    setError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && searchByInvite()}
                  placeholder="e.g. guild.app/join/token"
                  className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] px-4 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200 flex-1"
                />
                <button
                  type="button"
                  onClick={searchByInvite}
                  disabled={isSearching || !inviteInput}
                  className="h-11 px-4 rounded-2xl bg-secondary hover:bg-secondary/80 border border-border text-xs font-semibold text-foreground transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] shrink-0"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </button>
              </div>
            </div>
          )}

          {/* Validation Alert */}
          {error && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 flex gap-2.5 items-center text-xs">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="font-semibold text-destructive">{error}</p>
            </div>
          )}

          {/* Loading spinner for auto-join lookup */}
          {isSearching && isAutoJoin && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* Org Preview Card */}
          {org && !isSearching && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-4">
              <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 text-base font-bold shadow-xs">
                {org.photoURL ? (
                  <img src={org.photoURL} alt={org.name} className="h-full w-full object-cover rounded-2xl" />
                ) : (
                  org.name[0].toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground truncate">{org.name}</h4>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  {org.industry} · {org.companySize} employees
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                updateData({ path: null, joinOrgId: undefined, joinOrgName: undefined });
                navigate('/onboarding', { replace: true });
              }}
              className="h-11 px-4 rounded-2xl border border-border bg-transparent hover:bg-secondary/60 text-muted-foreground hover:text-foreground text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={!org || isSubmitting || isSearching}
              className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
              ) : (
                <>
                  Join Workspace
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
