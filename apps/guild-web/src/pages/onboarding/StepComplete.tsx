import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2 } from 'lucide-react';
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
    <div className="w-full max-w-md text-center px-4 flex flex-col items-center select-none relative z-10">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 15 }}
        className="flex items-center justify-center mb-6 relative h-20 w-20"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="space-y-2"
      >
        <h1 className="text-xl font-bold text-foreground">
          Setup Complete
        </h1>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-sm mx-auto font-medium">
          Your profile has been created successfully. Welcome to Guild.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 w-full"
      >
        <button
          onClick={handleEnter}
          disabled={isLoading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-bold transition-all shadow active:scale-98 cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            'Go to Dashboard'
          )}
        </button>
      </motion.div>
    </div>
  );
}
