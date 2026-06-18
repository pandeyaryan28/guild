import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building2, Users } from 'lucide-react';
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
    }, 300);
  };

  return (
    <div className="w-full max-w-2xl px-4 flex flex-col items-center">
      <StepHeader
        step={1}
        totalSteps={4}
        title="Choose Path"
        subtitle="Create a new workspace or join an existing one."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-8">
        {/* Create Organization */}
        <button
          onClick={() => choose('create')}
          className={`group text-left p-6 rounded-2xl border transition-all duration-200 cursor-pointer aether-glass ${
            selected === 'create'
              ? 'border-indigo-500 bg-indigo-500/10 shadow-lg'
              : 'border-border-default bg-surface/50 hover:bg-surface-hover shadow'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 mb-4">
            <Building2 className="h-6 w-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-foreground">
              Create a new workspace
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-semibold">
              Set up a fresh workspace for your team. You will be able to customize roles and invite members.
            </p>
          </div>
        </button>

        {/* Join Organization */}
        <button
          onClick={() => choose('join')}
          className={`group text-left p-6 rounded-2xl border transition-all duration-200 cursor-pointer aether-glass ${
            selected === 'join'
              ? 'border-indigo-500 bg-indigo-500/10 shadow-lg'
              : 'border-border-default bg-surface/50 hover:bg-surface-hover shadow'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 mb-4">
            <Users className="h-6 w-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-foreground">
              Join an existing workspace
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-semibold">
              Join your team's active workspace using an organization handle or invite link.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
