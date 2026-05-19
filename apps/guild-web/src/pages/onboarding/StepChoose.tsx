import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building2, Users, ArrowRight } from 'lucide-react';
import type { OnboardingData } from './OnboardingRoot';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
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
    }, 300);
  };

  return (
    <div className="w-full max-w-xl">
      <StepHeader
        step={1}
        totalSteps={4}
        title="How do you want to get started?"
        subtitle="Set up your organization or join an existing team."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        <motion.button
          onClick={() => choose('create')}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className={`group relative flex flex-col items-start gap-4 rounded-2xl border p-6 text-left transition-all duration-200 ${
            selected === 'create'
              ? 'border-primary/60 bg-primary/10 shadow-lg shadow-primary/10'
              : 'border-border/40 bg-card/50 hover:border-primary/30 hover:bg-card/70'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 border border-primary/20 group-hover:bg-primary/20 transition-colors">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Create Organization</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Set up a new workspace for your team
            </p>
          </div>
          <ArrowRight className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-hover:text-primary/50 group-hover:translate-x-1 transition-all" />
        </motion.button>

        <motion.button
          onClick={() => choose('join')}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className={`group relative flex flex-col items-start gap-4 rounded-2xl border p-6 text-left transition-all duration-200 ${
            selected === 'join'
              ? 'border-primary/60 bg-primary/10 shadow-lg shadow-primary/10'
              : 'border-border/40 bg-card/50 hover:border-primary/30 hover:bg-card/70'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 border border-primary/20 group-hover:bg-primary/20 transition-colors">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Join Organization</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Join a team via org username or invite link
            </p>
          </div>
          <ArrowRight className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-hover:text-primary/50 group-hover:translate-x-1 transition-all" />
        </motion.button>
      </div>
    </div>
  );
}
