import * as React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}

export function FormField({ label, error, children, hint }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-text-muted">{hint}</p>}
      {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}
    </div>
  );
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ElementType;
  suffix?: React.ReactNode;
  isValid?: boolean;
  isChecking?: boolean;
}

export function TextInput({ icon: Icon, suffix, isValid, isChecking, className, ...props }: TextInputProps) {
  return (
    <div className="relative group">
      {Icon && (
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted transition-colors group-focus-within:text-primary" />
      )}
      <input
        {...props}
        className={cn(
          'w-full h-11 rounded-xl aether-glass-input text-sm text-foreground placeholder:text-text-muted/60 transition-all',
          Icon ? 'pl-11' : 'pl-4',
          suffix ? 'pr-10' : 'pr-4',
          isValid === true && 'border-emerald-500/50 bg-emerald-500/5',
          isValid === false && 'border-destructive/50 bg-destructive/5',
          isValid === undefined && 'border-border-default',
          className
        )}
      />
      {suffix && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {suffix}
        </div>
      )}
    </div>
  );
}

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
}

export function SelectInput({ placeholder, children, className, ...props }: SelectInputProps) {
  return (
    <select
      {...props}
      className={cn(
        'w-full h-11 rounded-xl aether-glass-input px-4 text-sm text-foreground transition-all appearance-none',
        className
      )}
    >
      {placeholder && (
        <option value="" disabled className="aether-glass text-muted-foreground">
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
}

// Placeholder - will be replaced by actual component
export function OnboardingCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl aether-glass-elevated p-8 shadow-2xl shadow-black/30">
      {children}
    </div>
  );
}
