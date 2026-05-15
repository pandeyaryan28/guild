import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { setOnboardingState } from '../../lib/firestore';

export function StepComplete() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleEnter = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await setOnboardingState(user.uid, { completed: true });
      // Brief pause for the state to propagate then hard navigate
      window.location.href = '/';
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="flex items-center justify-center mb-8"
      >
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-3">
          You're all set! 🎉
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto font-medium">
          Your Guild workspace is ready. Let's get your team operational.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-10"
      >
        <button
          onClick={handleEnter}
          disabled={isLoading}
          className="inline-flex items-center gap-2.5 h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-bold transition-all shadow-lg shadow-primary/25"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Enter Guild
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
