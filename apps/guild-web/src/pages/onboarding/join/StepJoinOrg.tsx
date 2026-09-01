import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
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
    <div className="w-full max-w-[480px] px-4 flex flex-col items-center">
      <StepHeader
        step={2}
        totalSteps={4}
        title={isAutoJoin ? 'Join Workspace' : 'Find Organization'}
        subtitle={
          isAutoJoin
            ? "We found an active workspace matching your company's email domain."
            : 'Enter your invitation link to find and join your organization.'
        }
      />

      <div className="aether-glass w-full p-8 mt-8 shadow-xl border border-border-default/30">
        <div className="space-y-4">
          {/* Method: By Invite Link (Only show if not auto-joining) */}
          {!isAutoJoin && (
            <div className="space-y-1.5">
              <label htmlFor="invite-link" className="text-xs font-semibold text-muted-foreground pl-0.5">
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
                  className="w-full h-10 rounded-xl border border-border-default bg-surface/50 dark:bg-white/5 px-3.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200 flex-1"
                />
                <button
                  type="button"
                  onClick={searchByInvite}
                  disabled={isSearching || !inviteInput}
                  className="h-10 px-3.5 rounded-xl bg-surface border border-border-default hover:bg-surface-hover text-xs font-bold text-foreground transition-all disabled:opacity-40 flex items-center justify-center cursor-pointer active:scale-95 flex-shrink-0 shadow-sm"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                </button>
              </div>
            </div>
          )}

          {/* Validation Alert */}
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 flex gap-2 items-center text-xs">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="font-semibold text-destructive">{error}</p>
            </div>
          )}

          {/* Loading spinner for auto-join lookup */}
          {isSearching && isAutoJoin && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* Org Preview Card */}
          {org && !isSearching && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-4">
              <div className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-sm font-black shadow-inner">
                {org.name[0].toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground truncate">{org.name}</h4>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                  {org.industry} · {org.companySize} employees
                </p>
              </div>
            </div>
          )}

          {/* Submit/Continue Join */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={!org || isSubmitting || isSearching}
            className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : 'Join Workspace'}
          </button>

          {/* Alternate Path Options */}
          <button
            type="button"
            onClick={() => {
              updateData({ path: null, joinOrgId: undefined, joinOrgName: undefined });
              navigate('/onboarding', { replace: true });
            }}
            className="w-full text-center text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mt-4 bg-transparent border-none outline-none cursor-pointer"
          >
            {isAutoJoin ? 'Create a new workspace instead' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
