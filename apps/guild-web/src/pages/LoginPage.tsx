import * as React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, EyeOff, Loader2, Mail, Lock, Zap } from 'lucide-react';
import { signInWithEmail, signInWithGoogle } from '../lib/auth';
import { getAdditionalUserInfo } from 'firebase/auth';
import { setOnboardingState } from '../lib/firestore';
import { useAuth } from '../hooks/useAuth';
import { cn } from '@/lib/utils';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, onboarding, loading } = useAuth();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

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
        {/* Logo / Brand header */}
        <div className="flex items-center gap-3 mb-8 cursor-default group">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-black text-white shadow-xl shadow-indigo-500/25 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
            G
          </div>
          <span className="text-2xl font-black text-gradient uppercase bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 tracking-wider">
            Guild
          </span>
        </div>

        {/* Card */}
        <div className="aether-glass w-full p-8 shadow-2xl relative overflow-hidden border border-white/10">
          {/* Subtle inside grid accent */}
          <div className="absolute inset-0 bg-dashboard-grid opacity-20 pointer-events-none" />

          <div className="mb-6 relative z-10">
            <h1 className="text-xl font-black text-white tracking-tight leading-none uppercase">
              Welcome back
            </h1>
            <p className="text-xs text-text-muted mt-1.5 font-medium leading-relaxed">
              Access your collaborative operations center
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted transition-colors group-focus-within:text-indigo-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full h-10 rounded-xl border border-white/5 bg-white/5 pl-10 pr-4 text-xs font-semibold text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 focus:bg-white/10 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between pl-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  Password
                </label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted transition-colors group-focus-within:text-indigo-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-10 rounded-xl border border-white/5 bg-white/5 pl-10 pr-10 text-xs font-semibold text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 focus:bg-white/10 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-destructive/20 bg-destructive/10 px-4.5 py-3"
              >
                <p className="text-[11px] font-semibold text-destructive">{error}</p>
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <>
                  <Zap className="h-4 w-4 text-white" />
                  Sign In to Workspace
                </>
              )}
            </button>

            {/* Separator */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="bg-transparent px-3 font-semibold text-text-muted uppercase tracking-widest backdrop-blur-sm">
                  Or
                </span>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5 text-white" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Continue with Google
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-text-muted mt-6 font-semibold tracking-wide">
          New here?{' '}
          <Link
            to="/signup"
            className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors ml-1"
          >
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
