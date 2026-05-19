import * as React from 'react';
import { motion } from 'motion/react';

interface StepHeaderProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle: string;
}

export function StepHeader({ step, totalSteps, title, subtitle }: StepHeaderProps) {
  const progress = (step / totalSteps) * 100;

  return (
    <div className="w-full">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Step {step} of {totalSteps}
        </span>
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i < step ? 'bg-primary w-6' : 'bg-border/60 w-4'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl font-bold text-foreground tracking-tight"
      >
        {title}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05 }}
        className="text-sm text-muted-foreground mt-1.5 font-medium"
      >
        {subtitle}
      </motion.p>
    </div>
  );
}
