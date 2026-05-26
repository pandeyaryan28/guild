import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Loader2, AlertCircle, Building2, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { validateInviteToken, acceptInvite, type Organization } from '../../lib/firestore';

export function JoinInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  
  const [isValidating, setIsValidating] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [org, setOrg] = React.useState<Organization | null>(null);
  
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    async function checkToken() {
      if (!token) {
        setError('No invite token provided.');
        setIsValidating(false);
        return;
      }
      
      try {
        const res = await validateInviteToken(token);
        if (!res.valid) {
          setError(res.error || 'Invalid invite link.');
        } else {
          setOrg(res.org);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to validate invite link.');
      } finally {
        setIsValidating(false);
      }
    }
    
    checkToken();
  }, [token]);

  const handleAccept = async () => {
    if (!user || !token || !org) return;
    
    setIsAccepting(true);
    setError(null);
    try {
      if (!userProfile) {
        // User hasn't completed onboarding yet. Redirect them to onboarding to complete profile, passing the token.
        // OnboardingRoot will auto-detect the token and skip search steps.
        navigate(`/onboarding?token=${token}`, { replace: true });
        return;
      }

      await acceptInvite(user.uid, token, org.id);
      setSuccess(true);
      setTimeout(() => {
        navigate('/', { replace: true });
        window.location.reload(); // Refresh to re-fetch global org state
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invite.');
      setIsAccepting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden select-none">
        <div className="aether-aurora opacity-50" />
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="aether-app-container dark min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* 1. Shifting Aurora Mesh Layer */}
      <div className="aether-aurora opacity-75" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px] px-2 flex flex-col items-center"
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 mb-8 cursor-default group">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-black text-white shadow-xl shadow-indigo-500/25 transition-all duration-300">
            G
          </div>
          <span className="text-2xl font-black text-gradient uppercase bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 tracking-wider">
            Guild
          </span>
        </div>

        {/* Card */}
        <div className="aether-glass w-full p-8 shadow-2xl relative overflow-hidden border border-white/10 text-center">
          <div className="absolute inset-0 bg-dashboard-grid opacity-20 pointer-events-none" />

          {error ? (
            <div className="flex flex-col items-center relative z-10">
              <div className="h-16 w-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20 shadow-lg shadow-rose-500/5">
                <AlertCircle className="h-8 w-8 text-rose-400 animate-pulse" />
              </div>
              <h1 className="text-lg font-black text-white tracking-tight uppercase leading-none mb-2">Invite Invalid</h1>
              <p className="text-xs text-text-muted mb-8 leading-relaxed max-w-[280px] font-semibold">{error}</p>
              <Link
                to="/"
                className="w-full flex items-center justify-center h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 active:scale-98"
              >
                Go Home Command
              </Link>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center relative z-10">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <h1 className="text-lg font-black text-white tracking-tight uppercase leading-none mb-2">Welcome!</h1>
              <p className="text-xs text-text-muted mb-8 leading-normal font-semibold">You have successfully joined <strong>{org?.name}</strong>.</p>
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            </div>
          ) : (
            <div className="flex flex-col items-center relative z-10">
              {/* Organization Circle Avatar Preview with glowing halo */}
              <div className="relative mb-6 select-none">
                <div className="teammate-halo active text-indigo-500">
                  <div className="h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/30 text-indigo-400 border border-indigo-500/35 text-xl font-black shadow-xl">
                    {org?.name[0].toUpperCase()}
                  </div>
                </div>
              </div>

              <h1 className="text-xl font-black text-white tracking-tight uppercase leading-none mb-2">Join {org?.name}</h1>
              <p className="text-xs text-text-muted mb-8 leading-relaxed max-w-[300px] font-semibold">
                You've been invited to coordinate operations with <strong>{org?.name}</strong> on Guild.
              </p>

              {user ? (
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 active:scale-98 cursor-pointer"
                >
                  {isAccepting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <>
                      Accept Invitation Ticket
                      <ArrowRight className="h-4 w-4 text-white" />
                    </>
                  )}
                </button>
              ) : (
                <div className="w-full flex flex-col gap-3">
                  <Link
                    to="/login"
                    state={{ from: `/join/${token}` }}
                    className="w-full flex items-center justify-center h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 active:scale-98"
                  >
                    Log In to Accept
                  </Link>
                  <p className="text-[11px] text-text-muted mt-2 font-semibold tracking-wide">
                    New here?{' '}
                    <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors ml-1">
                      Create an account
                    </Link>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
