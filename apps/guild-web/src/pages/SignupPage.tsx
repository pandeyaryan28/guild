import * as React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, EyeOff, Loader2, Mail, Lock, Zap, Sun, Moon } from 'lucide-react';
import { signUpWithEmail, signInWithGoogle, sendVerificationEmail, GoogleAuthProvider, linkGoogleCredential, signInWithEmail } from '../lib/auth';
import { getAdditionalUserInfo } from 'firebase/auth';
import { setOnboardingState } from '../lib/firestore';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { isValidEmail, isValidPassword } from '../lib/validation';

export function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, onboarding, loading } = useAuth();
  const { mode, toggleMode } = useTheme();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [globalError, setGlobalError] = React.useState('');

  const [pendingCred, setPendingCred] = React.useState<any>(null);
  const [linkingEmail, setLinkingEmail] = React.useState('');
  const [linkPassword, setLinkPassword] = React.useState('');
  const [linking, setLinking] = React.useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (!loading && user) {
      // If the user came from a /join/:token URL, send them back after signup
      const fromState = (location.state as any)?.from;
      const fromPath = typeof fromState === 'string' ? fromState : fromState?.pathname;
      if (fromPath && typeof fromPath === 'string' && fromPath.startsWith('/join/')) {
        navigate(fromState || fromPath, { replace: true });
        return;
      }
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

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!isValidEmail(email)) newErrors.email = 'Enter a valid email address.';
    if (!isValidPassword(password)) newErrors.password = 'Min 8 chars, include a letter and a number.';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const credential = await signUpWithEmail(email, password);
      // Initialize onboarding state
      await setOnboardingState(credential.user.uid, {
        completed: false,
        step: 0,
        path: null,
      });
      // Send verification email immediately
      try {
        await sendVerificationEmail(credential.user);
      } catch (emailErr) {
        console.error('Failed to send verification email on signup:', emailErr);
      }
      navigate('/verify-email', { replace: true });
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setGlobalError('This email is already registered. Try signing in.');
      } else {
        setGlobalError('Failed to create account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGlobalError('');
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
        // useAuth handles redirect
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/account-exists-with-different-credential') {
        const credential = GoogleAuthProvider.credentialFromError(err);
        setPendingCred(credential);
        setLinkingEmail(err.customData?.email || '');
        setGlobalError('An account already exists with this email address. Enter your password below to link Google sign-in.');
      } else {
        setGlobalError('Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkPassword.trim()) {
      setGlobalError('Please enter your password.');
      return;
    }
    setGlobalError('');
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
        setGlobalError('Incorrect password. Please try again.');
      } else {
        setGlobalError('Failed to link account. Please try again.');
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
            Create your account to get started
          </p>
        </div>

        {/* Card */}
        <div className="w-full p-8 rounded-3xl bg-surface/90 dark:bg-card/75 backdrop-blur-2xl border border-border dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
          <div className="mb-6">
            <h1 className="text-base font-bold text-foreground">
              {pendingCred ? 'Link Google Account' : 'Get started'}
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              {pendingCred ? 'Confirm your password to link your accounts' : 'Fill in your details below'}
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
              {globalError && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-2.5">
                  <p className="text-xs font-semibold text-destructive">{globalError}</p>
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
                  setGlobalError('');
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
                    onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                    placeholder="you@company.com"
                    required
                    autoComplete="username"
                    className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] px-4 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200"
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive font-medium pl-1 mt-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="text-xs font-semibold text-foreground/80 pl-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    name="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                    placeholder="Min 8 chars, letters and numbers"
                    required
                    autoComplete="new-password"
                    className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] pl-4 pr-11 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive font-medium pl-1 mt-1">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="text-xs font-semibold text-foreground/80 pl-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })); }}
                    placeholder="Repeat your password"
                    required
                    autoComplete="new-password"
                    className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] pl-4 pr-11 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" tabIndex={-1}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive font-medium pl-1 mt-1">{errors.confirmPassword}</p>}
              </div>

              {/* Global error */}
              {globalError && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-2.5">
                  <p className="text-xs font-semibold text-destructive">{globalError}</p>
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
                  'Create Account'
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
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline transition-all ml-1">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
