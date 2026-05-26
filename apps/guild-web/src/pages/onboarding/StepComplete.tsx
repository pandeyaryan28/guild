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
    <div className="w-full max-w-md text-center px-4 flex flex-col items-center select-none">
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="flex items-center justify-center mb-8 relative"
      >
        {/* Shimmering backdrop glow */}
        <div className="absolute inset-[-15px] rounded-full bg-indigo-500/10 blur-xl animate-pulse" />
        
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/35 border border-indigo-500/30 shadow-xl shadow-indigo-500/10">
          <CheckCircle2 className="h-12 w-12 text-indigo-400" />
          <div className="absolute inset-0 rounded-full bg-indigo-500/5 animate-ping" style={{ animationDuration: '2.5s' }} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6 }}
      >
        <h1 className="text-2xl font-black text-white tracking-tight uppercase flex items-center justify-center gap-2">
          Setup Complete!
          <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
        </h1>
        <p className="text-xs text-text-muted mt-2.5 leading-relaxed max-w-sm mx-auto font-medium">
          Your Guild workspace credentials have been mapped. Let's step into the operations deck.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mt-8 w-full"
      >
        <button
          onClick={handleEnter}
          disabled={isLoading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 h-11 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-98 cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <>
              Enter Workspace Command
              <ArrowRight className="h-4 w-4 text-white" />
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
