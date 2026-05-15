import * as React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, EyeOff, Loader2, Mail, Lock, Zap } from 'lucide-react';
import { signInWithEmail } from '../lib/auth';
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

  if (loading) return null;

  return (
    <div className="dark min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/6 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-dashboard-grid pointer-events-none opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-lg shadow-primary/30">
            G
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">Guild</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-8 shadow-2xl shadow-black/30">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">
              Sign in to your Guild workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 transition-colors group-focus-within:text-primary" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full h-11 rounded-xl border border-border/40 bg-muted/20 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 transition-colors group-focus-within:text-primary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 rounded-xl border border-border/40 bg-muted/20 pl-11 pr-12 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3"
              >
                <p className="text-xs font-medium text-destructive">{error}</p>
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-primary-foreground text-sm font-bold transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 font-medium">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-primary hover:text-primary/80 font-semibold transition-colors"
          >
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
