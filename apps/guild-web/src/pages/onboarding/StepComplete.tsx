import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { setOnboardingState } from '../../lib/firestore';
import { useAuth } from '../../hooks/useAuth';

export function StepComplete() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleEnter = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await setOnboardingState(user.uid, { completed: true });
      navigate('/', { replace: true });
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className="w-full max-w-md text-center px-4 flex flex-col items-center select-none relative z-10"
    >
      <div className="w-full p-8 md:p-10 rounded-3xl bg-surface/90 dark:bg-card/75 backdrop-blur-2xl border border-border dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)] flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.1 }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/25 mb-6 text-emerald-500 shadow-xs"
        >
          <CheckCircle2 className="h-8 w-8" />
        </motion.div>

        <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
          You're All Set!
        </h1>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-xs font-medium">
          Your workspace and profile are ready. Welcome to Guild.
        </p>

        <button
          onClick={handleEnter}
          disabled={isLoading}
          className="w-full h-11 mt-8 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer disabled:opacity-60"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
          ) : (
            <>
              Enter Workspace
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
