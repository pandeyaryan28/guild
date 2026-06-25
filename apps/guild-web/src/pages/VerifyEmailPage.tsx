import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Loader2, Sun, Moon, LogOut, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { sendVerificationEmail, reloadUser } from '../lib/auth';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const { user, onboarding, logout, loading: authLoading } = useAuth();
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
        const savedToken = sessionStorage.getItem('guild_invite_token');
        if (savedToken) {
          navigate(`/join/${savedToken}`, { replace: true });
        } else {
          navigate(onboarding?.completed ? '/' : '/onboarding', { replace: true });
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVerifiedSuccess, onboarding, navigate]);

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
    <div className="aether-app-container min-h-screen w-full flex flex-col items-center justify-center p-4 select-none">
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
        <div className="aether-glass w-full p-8 shadow-xl border border-border-default/30">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 flex items-center justify-center mb-4 border border-indigo-500/20">
              {isVerifiedSuccess ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : (
                <Mail className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
              )}
            </div>
            <h1 className="text-lg font-bold text-foreground">
              {isVerifiedSuccess ? 'Email Verified' : 'Verify Email'}
            </h1>
            <p className="text-xs text-muted-foreground mt-2 font-medium leading-relaxed">
              {isVerifiedSuccess
                ? 'Your email is verified. Redirecting you now...'
                : 'Click the verification link sent to your inbox to finish signing up.'}
            </p>

            {user?.email && !isVerifiedSuccess && (
              <div className="mt-3 px-3 py-1.5 rounded-lg border border-border-default/40 bg-surface/30 dark:bg-white/5 font-semibold text-[11px] text-foreground font-mono select-text">
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
                  className={`rounded-xl border px-4 py-2.5 flex gap-2 items-start text-xs ${
                    statusMessage.type === 'success'
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
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
                  className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 text-white" />
                      Check Status
                    </>
                  )}
                </button>

                {/* Resend Link */}
                <button
                  onClick={handleResendEmail}
                  disabled={isResending || checkingStatus || resendCooldown > 0}
                  className="w-full h-10 rounded-xl bg-surface/60 border border-border-default hover:bg-surface/80 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 text-foreground text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : resendCooldown > 0 ? (
                    <span>Resend Email ({resendCooldown}s)</span>
                  ) : (
                    'Resend Link'
                  )}
                </button>
              </>
            )}

            {/* Separator */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-default/60 dark:border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="bg-transparent px-3 font-semibold text-muted-foreground uppercase tracking-wider backdrop-blur-sm">
                  Or
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleSignOut}
              className="w-full h-10 rounded-xl bg-surface/30 border border-border-default/40 hover:bg-surface/50 dark:bg-white/3 dark:border-white/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Polling cue */}
        {!isVerifiedSuccess && (
          <p className="text-[10px] text-muted-foreground font-semibold mt-4">
            Checking status automatically in background...
          </p>
        )}
      </motion.div>
    </div>
  );
}
