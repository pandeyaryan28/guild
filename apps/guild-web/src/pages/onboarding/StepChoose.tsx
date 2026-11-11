import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building2, Users, ArrowRight } from 'lucide-react';
import type { OnboardingData } from '../../types/onboarding';
import { StepHeader } from '../../components/onboarding/StepHeader';

interface Props {
  data: OnboardingData;
  updateData: (patch: Partial<OnboardingData>) => void;
}

export function StepChoose({ data, updateData }: Props) {
  const navigate = useNavigate();
  const [selected, setSelected] = React.useState<'create' | 'join' | null>(null);

  const choose = (path: 'create' | 'join') => {
    setSelected(path);
    updateData({ path });
    setTimeout(() => {
      if (path === 'create') navigate('/onboarding/create/org');
      else navigate('/onboarding/join/find');
    }, 250);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className="w-full max-w-2xl px-4 flex flex-col items-center"
    >
      <StepHeader
        step={1}
        totalSteps={4}
        title="Get Started"
        subtitle="Create a new workspace for your organization or join an existing team."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full mt-8">
        {/* Create Organization */}
        <button
          onClick={() => choose('create')}
          className={`group text-left p-7 rounded-3xl border transition-all duration-200 cursor-pointer active:scale-[0.98] relative overflow-hidden backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)] ${
            selected === 'create'
              ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/25'
              : 'border-border dark:border-white/10 bg-surface/90 dark:bg-card/75 hover:border-primary/50'
          }`}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="h-8 w-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-foreground">
              Create a new workspace
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-medium">
              Set up a fresh workspace for your team. You'll be able to invite teammates and configure organization roles.
            </p>
          </div>
        </button>

        {/* Join Organization */}
        <button
          onClick={() => choose('join')}
          className={`group text-left p-7 rounded-3xl border transition-all duration-200 cursor-pointer active:scale-[0.98] relative overflow-hidden backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)] ${
            selected === 'join'
              ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/25'
              : 'border-border dark:border-white/10 bg-surface/90 dark:bg-card/75 hover:border-primary/50'
          }`}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div className="h-8 w-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-foreground">
              Join existing workspace
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-medium">
              Join an existing workspace using your company email domain, invite link, or workspace handle.
            </p>
          </div>
        </button>
      </div>
    </motion.div>
  );
}
