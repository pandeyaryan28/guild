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
  const { user, onboarding, loading } = useAuth();
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

  const from = (location.state as any)?.from?.pathname || '/';

  // Redirect if already authenticated
  React.useEffect(() => {
    if (!loading && user) {
      if (onboarding?.completed) {
        navigate('/', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [user, onboarding, loading, navigate]);

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
        navigate('/onboarding', { replace: true });
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
          <div className="mb-6">
            <h1 className="text-lg font-bold text-foreground">
              {pendingCred ? 'Link Google Account' : 'Sign In'}
            </h1>
          </div>

          {pendingCred ? (
            <form onSubmit={handleLinkAccount} className="space-y-4">
              <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] rounded-xl font-bold leading-relaxed">
                An account already exists with the email <span className="underline">{linkingEmail}</span>. Enter your password to link Google sign-in to this existing account.
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="link-password" className="text-xs font-semibold text-muted-foreground pl-0.5">
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
                    className="w-full h-10 aether-glass-input pl-3.5 pr-10 text-xs font-semibold placeholder:text-muted-foreground/60 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5">
                  <p className="text-[11px] font-semibold text-destructive">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={linking}
                className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {linking ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
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
                className="w-full h-10 rounded-xl border border-border-default/60 hover:bg-surface/50 text-foreground text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-1"
              >
                Cancel
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-muted-foreground pl-0.5">
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
                    className="w-full h-10 aether-glass-input px-3.5 text-xs font-semibold placeholder:text-muted-foreground/60 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between pl-0.5">
                  <label htmlFor="current-password" className="text-xs font-semibold text-muted-foreground">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
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
                    className="w-full h-10 aether-glass-input pl-3.5 pr-10 text-xs font-semibold placeholder:text-muted-foreground/60 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5">
                  <p className="text-[11px] font-semibold text-destructive">{error}</p>
                </div>
              )}

              {/* Success */}
              {successMessage && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5">
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{successMessage}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  'Sign In'
                )}
              </button>

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

              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full h-10 aether-glass border border-white/10 hover:bg-white/5 text-foreground text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <svg className="h-3.5 w-3.5" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Continue with Google
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground mt-5 font-semibold tracking-wide">
          New here?{' '}
          <Link
            to="/signup"
            className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold transition-colors ml-1"
          >
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
