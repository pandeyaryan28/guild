import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Loader2, Sun, Moon, LogOut, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { sendVerificationEmail, reloadUser } from '../lib/auth';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const { user, userProfile, onboarding, logout, loading: authLoading } = useAuth();
  const { mode, toggleMode } = useTheme();

  const [isResending, setIsResending] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const [checkingStatus, setCheckingStatus] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isVerifiedSuccess, setIsVerifiedSuccess] = React.useState(false);

  // Sync initial state if user is already verified
  React.useEffect(() => {
    if (user?.emailVerified) {
      setIsVerifiedSuccess(true);
    }
  }, [user]);

  // Redirect if already verified
  React.useEffect(() => {
    if (isVerifiedSuccess) {
      const timer = setTimeout(() => {
        const savedToken = localStorage.getItem('guild_invite_token') || sessionStorage.getItem('guild_invite_token');
        const isSetupComplete = Boolean(onboarding?.completed || userProfile?.organizationId);
        if (savedToken) {
          navigate(`/join/${savedToken}`, { replace: true });
        } else {
          navigate(isSetupComplete ? '/' : '/onboarding', { replace: true });
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVerifiedSuccess, onboarding, userProfile, navigate]);

  // Redirect if not logged in
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Resend cooldown timer effect
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Automatic verification status polling (every 4 seconds)
  React.useEffect(() => {
    if (!user || user.emailVerified || isVerifiedSuccess) return;

    const pollInterval = setInterval(async () => {
      try {
        await reloadUser(user);
        if (user.emailVerified) {
          clearInterval(pollInterval);
          setIsVerifiedSuccess(true);
          setStatusMessage({ type: 'success', text: 'Email successfully verified. Redirecting...' });
        }
      } catch (err) {
        console.error('Error reloading user status during auto-poll:', err);
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [user, isVerifiedSuccess]);

  const handleCheckStatus = async () => {
    if (!user) return;
    setCheckingStatus(true);
    setStatusMessage(null);
    try {
      await reloadUser(user);
      if (user.emailVerified) {
        setIsVerifiedSuccess(true);
        setStatusMessage({ type: 'success', text: 'Email successfully verified. Redirecting...' });
      } else {
        setStatusMessage({ type: 'error', text: 'Email is not verified yet. Please check your inbox and click the verification link.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to refresh status. Please try again later.' });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleResendEmail = async () => {
    if (!user || resendCooldown > 0) return;
    setIsResending(true);
    setStatusMessage(null);
    try {
      await sendVerificationEmail(user);
      setResendCooldown(60);
      setStatusMessage({ type: 'success', text: 'A fresh verification link has been sent to your email.' });
    } catch (err: any) {
      if (err?.code === 'auth/too-many-requests') {
        setStatusMessage({ type: 'error', text: 'Too many requests. Please wait a bit before requesting another link.' });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to send verification email. Please try again.' });
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  if (authLoading || (!user && !isVerifiedSuccess)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden select-none">
      {/* Floating Theme Mode Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={toggleMode}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary active:scale-[0.95] transition-all shadow-sm border border-border bg-surface/80 backdrop-blur-md text-foreground cursor-pointer"
          title={`Switch to ${mode === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {mode === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
        </button>
      </div>

      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="relative z-10 w-full max-w-[420px] px-4 flex flex-col items-center"
      >
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl p-2.5 mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-border dark:border-white/10 bg-surface/80 dark:bg-white/10 backdrop-blur-md">
            <img src="/logo.png" alt="Guild Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            Guild
          </span>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            Account security verification
          </p>
        </div>

        {/* Card */}
        <div className="w-full p-8 rounded-3xl bg-surface/90 dark:bg-card/75 backdrop-blur-2xl border border-border dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col items-center text-center mb-6">
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-4 border transition-all ${
              isVerifiedSuccess
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                : 'bg-primary/10 border-primary/20 text-primary'
            }`}>
              {isVerifiedSuccess ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              ) : (
                <Mail className="h-7 w-7 text-primary" />
              )}
            </div>
            <h1 className="text-base font-bold text-foreground">
              {isVerifiedSuccess ? 'Email Verified' : 'Check your inbox'}
            </h1>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium leading-relaxed">
              {isVerifiedSuccess
                ? 'Your email is verified. Redirecting you to workspace...'
                : 'Click the verification link sent to your inbox to finish signing up.'}
            </p>

            {user?.email && !isVerifiedSuccess && (
              <div className="mt-4 px-3.5 py-1.5 rounded-full border border-border bg-secondary/50 dark:bg-white/[0.04] font-medium text-xs text-foreground font-mono select-text">
                {user.email}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Status Message Display */}
            <AnimatePresence mode="wait">
              {statusMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={`rounded-2xl border px-4 py-2.5 flex gap-2.5 items-start text-xs ${
                    statusMessage.type === 'success'
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-destructive/20 bg-destructive/10 text-destructive'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <p className="font-semibold leading-normal">{statusMessage.text}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {!isVerifiedSuccess && (
              <>
                {/* Check Status Button */}
                <button
                  onClick={handleCheckStatus}
                  disabled={checkingStatus || isResending}
                  className="w-full h-11 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Check Verification Status
                    </>
                  )}
                </button>

                {/* Resend Link */}
                <button
                  onClick={handleResendEmail}
                  disabled={isResending || checkingStatus || resendCooldown > 0}
                  className="w-full h-11 rounded-2xl bg-secondary/60 hover:bg-secondary dark:bg-white/[0.05] dark:hover:bg-white/[0.08] border border-border text-foreground text-xs font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  {isResending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : resendCooldown > 0 ? (
                    <span>Resend Email ({resendCooldown}s)</span>
                  ) : (
                    'Resend Verification Link'
                  )}
                </button>
              </>
            )}

            {/* Separator */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span className="bg-surface dark:bg-card px-3 font-medium text-muted-foreground tracking-wide">
                  or
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleSignOut}
              className="w-full h-11 rounded-2xl border border-border bg-transparent hover:bg-secondary/60 text-muted-foreground hover:text-foreground text-xs font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Polling cue */}
        {!isVerifiedSuccess && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mt-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Checking status automatically in background…
          </div>
        )}
      </motion.div>
    </div>
  );
}
