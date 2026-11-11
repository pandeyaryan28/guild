import * as React from 'react';
import { motion } from 'motion/react';

interface StepHeaderProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle: string;
}

export function StepHeader({ step, totalSteps, title, subtitle }: StepHeaderProps) {
  const percent = Math.round((step / totalSteps) * 100);

  return (
    <div className="w-full text-left">
      {/* Step indicator and smooth progress track */}
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2.5">
        <span className="tracking-wide">
          Step {step} of {totalSteps}
        </span>
        <span className="text-[11px] font-mono text-muted-foreground/80 font-medium">{percent}%</span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-secondary/80 dark:bg-white/10 overflow-hidden mb-6">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: 'spring', stiffness: 240, damping: 24 }}
        />
      </div>

      {/* Title & Subtitle */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      >
        <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
          {title}
        </h1>
        <p className="text-xs text-muted-foreground mt-1 font-medium leading-relaxed">
          {subtitle}
        </p>
      </motion.div>
    </div>
  );
}
