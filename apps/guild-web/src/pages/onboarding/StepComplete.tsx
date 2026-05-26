import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2, Sparkles, ArrowRight, Sun, Star } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { setOnboardingState } from '../../lib/firestore';

export function StepComplete() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTheme } = useTheme();
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
    <div className="w-full max-w-md text-center px-4 flex flex-col items-center select-none relative z-10">
      {/* Dynamic Ambient Orbit Ceremony */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 15 }}
        className="flex items-center justify-center mb-8 relative h-36 w-36"
      >
        {/* Shimmering backdrop glow */}
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl animate-pulse" />
        
        {/* Outer rotating accent dashed ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
          className="absolute inset-0 rounded-full border border-dashed border-primary/20 p-2"
        />

        {/* Floating background particle icons */}
        <motion.div
          animate={{ y: [0, -10, 0], opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="absolute top-2 left-2 text-primary"
        >
          <Sparkles className="h-4.5 w-4.5" />
        </motion.div>
        
        <motion.div
          animate={{ y: [0, 8, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-4 right-2 text-primary/80"
        >
          <Star className="h-3.5 w-3.5 fill-current" />
        </motion.div>

        {/* Concentric Halo Ring */}
        <div className="relative flex h-26 w-26 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 via-primary/25 to-primary/5 dark:from-primary/20 dark:via-primary/35 dark:to-primary/10 border border-primary/40 shadow-2xl shadow-primary/20 dark:shadow-primary/40 backdrop-blur-md">
          <CheckCircle2 className="h-13 w-13 text-primary animate-fluid-pop" />
          <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping" style={{ animationDuration: '3s' }} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6 }}
        className="space-y-2"
      >
        <h1 className="text-2xl font-black text-foreground tracking-tight uppercase flex items-center justify-center gap-2">
          Setup Complete!
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        </h1>
        <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed max-w-sm mx-auto font-medium">
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
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 h-11 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/35 active:scale-98 cursor-pointer hover:scale-102"
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
