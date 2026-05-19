import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Loader2, AlertCircle, Building2, CheckCircle2, ArrowRight } from 'lucide-react';
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
        // User hasn't completed onboarding yet. Send them to onboarding to complete profile.
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card border border-border/50 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden"
      >
        {/* Decorative background element */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-primary/5 blur-3xl -z-10 rounded-full" />

        {error ? (
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Invite Invalid</h1>
            <p className="text-muted-foreground mb-8">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all"
            >
              Go Home
            </Link>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to {org?.name}!</h1>
            <p className="text-muted-foreground mb-8">You have successfully joined the organization.</p>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 shadow-inner border border-primary/20">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Join {org?.name}</h1>
            <p className="text-muted-foreground mb-8">
              You've been invited to join <strong>{org?.name}</strong> on Guild.
            </p>

            {user ? (
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
              >
                {isAccepting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Accept Invitation
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            ) : (
              <div className="w-full flex flex-col gap-3">
                <Link
                  to="/login"
                  state={{ from: `/join/${token}` }}
                  className="w-full flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all"
                >
                  Log In to Accept
                </Link>
                <p className="text-sm text-muted-foreground">
                  New here?{' '}
                  <Link to="/signup" className="text-primary font-semibold hover:underline">
                    Create an account
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
