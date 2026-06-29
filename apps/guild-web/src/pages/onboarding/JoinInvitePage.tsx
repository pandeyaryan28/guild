import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Loader2, AlertCircle, CheckCircle2, Sun, Moon, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { validateInviteToken, acceptInvite, type Organization } from '../../lib/firestore';

export function JoinInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { mode, toggleMode } = useTheme();

  const [isValidating, setIsValidating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [org, setOrg] = React.useState<Organization | null>(null);

  const [isAccepting, setIsAccepting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Track whether we've already run the token check for the current auth state
  const checkedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    // Wait for Firebase Auth to finish resolving before doing anything
    if (authLoading) return;

    if (!token) {
      setError('No invite token provided.');
      return;
    }

    // ── Case A: User is NOT logged in ────────────────────────────────────────
    // Skip Firestore validation entirely (inviteLinks requires auth).
    // Save the token locally so it survives the login redirect, then surface
    // a friendly "You've been invited" pre-login card.
    if (!user) {
      sessionStorage.setItem('guild_invite_token', token);
      localStorage.setItem('guild_invite_token', token);
      // No Firestore call needed — show the pre-login card below
      return;
    }

    // ── Case B: User IS logged in — validate the token ────────────────────────
    // Avoid re-running if we already validated for this (token + uid) combo
    const cacheKey = `${token}__${user.uid}`;
    if (checkedRef.current === cacheKey) return;
    checkedRef.current = cacheKey;

    async function checkToken() {
      setIsValidating(true);
      setError(null);
      try {
        const res = await validateInviteToken(token!, user?.email ?? undefined);
        if (!res.valid) {
          setError(res.error || 'Invalid invite link.');
          sessionStorage.removeItem('guild_invite_token');
          localStorage.removeItem('guild_invite_token');
        } else {
          setOrg(res.org);
          sessionStorage.setItem('guild_invite_token', token!);
          localStorage.setItem('guild_invite_token', token!);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to validate invite link.');
      } finally {
        setIsValidating(false);
      }
    }

    checkToken();
  }, [token, user, authLoading]);

  const handleAccept = async () => {
    if (!user || !token || !org) return;

    setIsAccepting(true);
    setError(null);
    try {
      if (!userProfile) {
        // User is authenticated but has no Firestore profile yet.
        // Redirect to onboarding so they can complete their profile first.
        // OnboardingRoot will auto-detect the token from localStorage.
        navigate(`/onboarding?token=${token}`, { replace: true });
        return;
      }

      await acceptInvite(user.uid, token, org.id);
      sessionStorage.removeItem('guild_invite_token');
      localStorage.removeItem('guild_invite_token');
      setSuccess(true);
      setTimeout(() => {
        navigate('/', { replace: true });
        window.location.reload(); // Re-fetch global org state
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invite.');
      setIsAccepting(false);
    }
  };

  // ── Render: global loading (Firebase Auth still resolving) ─────────────────
  if (authLoading || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="aether-aurora opacity-50" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="aether-app-container min-h-screen w-full flex flex-col items-center justify-center p-4">
      <div className="aether-aurora opacity-50" />

      {/* Floating Theme Mode Toggle */}
      <div className="absolute top-6 right-8 z-50">
        <button
          onClick={toggleMode}
          className="aether-glass flex h-10 w-10 items-center justify-center rounded-xl hover:scale-105 active:scale-95 transition-all shadow-sm border border-border-default bg-surface/50 text-foreground cursor-pointer"
          title={`Switch to ${mode === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {mode === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5 text-amber-400" />}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-[400px] px-4 flex flex-col items-center"
      >
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shadow bg-white/10">
            <img src="/logo.png" alt="Guild Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            Guild
          </span>
        </div>

        {/* Card */}
        <div className="aether-glass w-full p-8 shadow-xl border border-border-default/30 text-center">
          {error ? (
            /* ── Error state ─────────────────────────────────────────────── */
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 rounded-xl bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/20">
                <AlertCircle className="h-6 w-6 text-rose-500" />
              </div>
              <h1 className="text-lg font-bold text-foreground mb-2">Invite Invalid</h1>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed font-semibold">{error}</p>
              <Link
                to="/"
                className="w-full flex items-center justify-center h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow active:scale-98"
              >
                Go to Login
              </Link>
            </div>
          ) : success ? (
            /* ── Success state ───────────────────────────────────────────── */
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <h1 className="text-lg font-bold text-foreground mb-2">Welcome!</h1>
              <p className="text-xs text-muted-foreground mb-6 leading-normal font-semibold">Joined {org?.name} successfully.</p>
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : !user ? (
            /* ── Pre-login state (unauthenticated) ───────────────────────── */
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20">
                <Sparkles className="h-6 w-6 text-indigo-500" />
              </div>
              <h1 className="text-lg font-bold text-foreground mb-2">You're Invited!</h1>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed max-w-[280px]">
                You have been invited to join a workspace on <strong>Guild</strong>. Log in or create an account to accept.
              </p>
              <div className="w-full flex flex-col gap-3">
                <Link
                  to="/login"
                  state={{ from: `/join/${token}` }}
                  className="w-full flex items-center justify-center h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow active:scale-98"
                >
                  Log In to Accept
                </Link>
                <p className="text-center text-[11px] text-muted-foreground mt-1 font-semibold tracking-wide">
                  New here?{' '}
                  <Link
                    to="/signup"
                    state={{ from: `/join/${token}` }}
                    className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold transition-colors ml-1"
                  >
                    Create an account
                  </Link>
                </p>
              </div>
            </div>
          ) : org ? (
            /* ── Logged-in state with validated org ──────────────────────── */
            <div className="flex flex-col items-center">
              <div className="mb-4">
                <div className="h-14 w-14 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/30 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-lg font-black shadow-inner">
                  {org.name[0].toUpperCase()}
                </div>
              </div>
              <h1 className="text-lg font-bold text-foreground mb-2">Join {org.name}</h1>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed max-w-[280px]">
                You have been invited to join <strong>{org.name}</strong> on Guild.
              </p>
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow active:scale-98 cursor-pointer"
              >
                {isAccepting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  'Accept Invitation'
                )}
              </button>
            </div>
          ) : (
            /* ── Logged in but token not yet validated (shouldn't linger) ── */
            <div className="flex flex-col items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
