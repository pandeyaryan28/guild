import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building2, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { OnboardingData } from './OnboardingRoot';
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
    }, 400);
  };

  const createBenefits = [
    'Dynamic channel bootstrapping',
    'Custom team settings control',
    'Full administrative privileges',
  ];

  const joinBenefits = [
    'Teammate directory lookup',
    'Immediate shared boards access',
    'Centralized chat sync',
  ];

  return (
    <div className="w-full max-w-2xl px-4 flex flex-col items-center">
      <StepHeader
        step={1}
        totalSteps={4}
        title="Let's build your space"
        subtitle="Every great operation starts with a single coordination point."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-8">
        {/* Create Organization */}
        <motion.button
          onClick={() => choose('create')}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          className={`group text-left p-6.5 rounded-3xl border relative transition-all duration-300 cursor-pointer overflow-hidden aether-glass ${
            selected === 'create'
              ? 'border-indigo-500 bg-indigo-500/10 shadow-2xl shadow-indigo-500/15'
              : 'border-border-default/80 bg-surface/50 hover:border-border-strong hover:bg-surface-hover shadow-lg'
          }`}
          style={{ backdropFilter: 'blur(20px)' }}
        >
          {/* Decorative subtle background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/25 group-hover:bg-indigo-500/25 group-hover:scale-110 transition-all duration-300 mb-5 text-indigo-500 dark:text-indigo-400">
            <Building2 className="h-6 w-6" />
          </div>

          <div>
            <h3 className="text-lg font-black text-foreground leading-none uppercase tracking-tight flex items-center gap-2">
              Create Space
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:translate-x-1.5 transition-all duration-300" />
            </h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-medium">
              Provision a clean, customized operation hub for your company or department.
            </p>
          </div>

          {/* Benefits checklist */}
          <ul className="mt-6 space-y-2 border-t border-border-default/60 dark:border-white/5 pt-5">
            {createBenefits.map((b) => (
              <li key={b} className="flex items-center gap-2 text-[11px] text-foreground/80 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </motion.button>

        {/* Join Organization */}
        <motion.button
          onClick={() => choose('join')}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          className={`group text-left p-6.5 rounded-3xl border relative transition-all duration-300 cursor-pointer overflow-hidden aether-glass ${
            selected === 'join'
              ? 'border-indigo-500 bg-indigo-500/10 shadow-2xl shadow-indigo-500/15'
              : 'border-border-default/80 bg-surface/50 hover:border-border-strong hover:bg-surface-hover shadow-lg'
          }`}
          style={{ backdropFilter: 'blur(20px)' }}
        >
          {/* Decorative subtle background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/25 group-hover:bg-indigo-500/25 group-hover:scale-110 transition-all duration-300 mb-5 text-indigo-500 dark:text-indigo-400">
            <Users className="h-6 w-6" />
          </div>

          <div>
            <h3 className="text-lg font-black text-foreground leading-none uppercase tracking-tight flex items-center gap-2">
              Join Team
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:translate-x-1.5 transition-all duration-300" />
            </h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-medium">
              Step into an active workspace using an invite token or organization slug.
            </p>
          </div>

          {/* Benefits checklist */}
          <ul className="mt-6 space-y-2 border-t border-border-default/60 dark:border-white/5 pt-5">
            {joinBenefits.map((b) => (
              <li key={b} className="flex items-center gap-2 text-[11px] text-foreground/80 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </motion.button>
      </div>
    </div>
  );
}
