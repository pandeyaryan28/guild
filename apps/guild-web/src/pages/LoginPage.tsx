import * as React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, EyeOff, Loader2, Mail, Lock, Zap, Sun, Moon } from 'lucide-react';
import { signInWithEmail, signInWithGoogle, GoogleAuthProvider, linkGoogleCredential, sendPasswordReset } from '../lib/auth';
import { getAdditionalUserInfo } from 'firebase/auth';
import { setOnboardingState } from '../lib/firestore';
import { isValidEmail } from '../lib/validation';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { cn } from '@/lib/utils';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, onboarding, loading } = useAuth();
  const { mode, toggleMode } = useTheme();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');

  const [pendingCred, setPendingCred] = React.useState<any>(null);
  const [linkingEmail, setLinkingEmail] = React.useState('');
  const [linkPassword, setLinkPassword] = React.useState('');
  const [linking, setLinking] = React.useState(false);

  const fromState = (location.state as any)?.from;
  const fromPath = typeof fromState === 'string' ? fromState : fromState?.pathname;
  const from = fromPath || '/';

  // Redirect if already authenticated
  React.useEffect(() => {
    if (!loading && user) {
      // 1. Honor the `from` state set by JoinInvitePage (or any other page that
      //    sent the user here). If they came from a /join/:token URL, send them
      //    back there so the invite validation + accept flow can complete.
      const currentFromState = (location.state as any)?.from;
      const currentFromPath = typeof currentFromState === 'string' ? currentFromState : currentFromState?.pathname;
      if (currentFromPath && typeof currentFromPath === 'string' && currentFromPath.startsWith('/join/')) {
        // Extract and persist the token so OnboardingRoot can pick it up too
        const tokenFromPath = currentFromPath.split('/join/')[1];
        if (tokenFromPath) {
          localStorage.setItem('guild_invite_token', tokenFromPath);
          sessionStorage.setItem('guild_invite_token', tokenFromPath);
        }
        navigate(currentFromState || currentFromPath, { replace: true });
        return;
      }

      // 2. Fall back to any token saved in storage (e.g. from a prior session)
      const savedToken = localStorage.getItem('guild_invite_token') || sessionStorage.getItem('guild_invite_token');
      const isSetupComplete = Boolean(onboarding?.completed || userProfile?.organizationId);
      if (savedToken) {
        navigate(`/join/${savedToken}`, { replace: true });
      } else if (isSetupComplete) {
        navigate('/', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [user, userProfile, onboarding, loading, navigate, location.state]);

  const handleForgotPassword = async () => {
    setError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setError('Please enter your email address first to reset your password.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      await sendPasswordReset(email);
      setSuccessMessage('Password reset email sent! Check your inbox for instructions.');
    } catch (err: any) {
      console.error('Password reset error:', err);
      const code = err?.code || '';
      if (code === 'auth/user-not-found') {
        setError('No user found with this email address.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many requests. Please try again later.');
      } else {
        setError('Failed to send password reset email. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      await signInWithEmail(email, password);
      // Navigation handled by useEffect above
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const credential = await signInWithGoogle();
      const additionalInfo = getAdditionalUserInfo(credential);
      if (additionalInfo?.isNewUser) {
        // Initialize onboarding state
        await setOnboardingState(credential.user.uid, {
          completed: false,
          step: 0,
          path: null,
        });
        const savedToken = localStorage.getItem('guild_invite_token') || sessionStorage.getItem('guild_invite_token');
        if (savedToken) {
          navigate(`/join/${savedToken}`, { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
      } else {
        // Navigation handled by useEffect above
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/account-exists-with-different-credential') {
        const credential = GoogleAuthProvider.credentialFromError(err);
        setPendingCred(credential);
        setLinkingEmail(err.customData?.email || '');
        setError('An account already exists with this email address. Enter your password below to link Google sign-in.');
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkPassword.trim()) {
      setError('Please enter your password.');
      return;
    }
    setError('');
    setLinking(true);
    try {
      // 1. Sign in with existing credentials
      const credential = await signInWithEmail(linkingEmail, linkPassword);
      // 2. Link the Google credential
      await linkGoogleCredential(credential.user, pendingCred);
      // Navigation is handled by useEffect
    } catch (err: any) {
      console.error('Failed to link account:', err);
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else {
        setError('Failed to link account. Please try again.');
      }
    } finally {
      setLinking(false);
    }
  };

  if (loading) return null;

  return (
    <div className="aether-app-container min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background">
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
            Sign in to your team workspace
          </p>
        </div>

        {/* Card */}
        <div className="w-full p-8 rounded-3xl bg-surface/90 dark:bg-card/75 backdrop-blur-2xl border border-border dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
          <div className="mb-6">
            <h1 className="text-base font-bold text-foreground">
              {pendingCred ? 'Link Google Account' : 'Welcome back'}
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              {pendingCred ? 'Confirm your password to link your accounts' : 'Enter your credentials to continue'}
            </p>
          </div>

          {pendingCred ? (
            <form onSubmit={handleLinkAccount} className="space-y-4">
              <div className="p-3.5 bg-primary/10 border border-primary/20 text-primary text-xs rounded-2xl font-medium leading-relaxed">
                An account already exists with the email <span className="font-semibold underline">{linkingEmail}</span>. Enter your password to link Google sign-in to this existing account.
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="link-password" className="text-xs font-semibold text-foreground/80 pl-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="link-password"
                    type={showPassword ? 'text' : 'password'}
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] pl-4 pr-11 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-2.5">
                  <p className="text-xs font-semibold text-destructive">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={linking}
                className="w-full h-11 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {linking ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                ) : (
                  'Link & Sign In'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPendingCred(null);
                  setLinkingEmail('');
                  setLinkPassword('');
                  setError('');
                }}
                className="w-full h-11 rounded-2xl border border-border bg-transparent hover:bg-secondary/60 text-foreground text-xs font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer mt-1"
              >
                Cancel
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-foreground/80 pl-1">
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoComplete="username"
                    className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] px-4 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label htmlFor="current-password" className="text-xs font-semibold text-foreground/80">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-medium text-primary hover:underline transition-all cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="current-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] pl-4 pr-11 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-2.5">
                  <p className="text-xs font-semibold text-destructive">{error}</p>
                </div>
              )}

              {/* Success */}
              {successMessage && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{successMessage}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                ) : (
                  'Sign In'
                )}
              </button>

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

              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full h-11 rounded-2xl bg-secondary/60 hover:bg-secondary dark:bg-white/[0.05] dark:hover:bg-white/[0.08] border border-border text-foreground text-xs font-semibold transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <svg className="h-4 w-4" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Continue with Google
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 font-medium">
          New here?{' '}
          <Link
            to="/signup"
            className="text-primary font-semibold hover:underline transition-all ml-1"
          >
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
