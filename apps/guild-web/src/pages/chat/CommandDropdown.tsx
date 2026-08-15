import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Target, ClipboardList, Sparkles, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CommandItem {
  name: string;
  description: string;
  syntax: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const COMMANDS: CommandItem[] = [
  { 
    name: 'task', 
    description: 'Create & assign an operational task to teammates', 
    syntax: '/task <title> [@users]', 
    badge: 'Task',
    icon: CheckSquare,
    color: 'text-primary bg-primary/10 border-primary/20'
  },
  { 
    name: 'goal', 
    description: 'Set a high-level strategic goal or milestone', 
    syntax: '/goal <title> [@owner]', 
    badge: 'Goal',
    icon: Target,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  },
  { 
    name: 'request', 
    description: 'Submit an approval request to a lead or manager', 
    syntax: '/request <title> @approver', 
    badge: 'Approval',
    icon: ClipboardList,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
  },
];

interface CommandDropdownProps {
  query: string;
  onSelect: (cmdName: string) => void;
  onClose: () => void;
}

export function CommandDropdown({ query, onSelect, onClose }: CommandDropdownProps) {
  const [activeIdx, setActiveIdx] = React.useState(0);

  const filtered = React.useMemo(() => {
    return COMMANDS.filter((cmd) => cmd.name.toLowerCase().startsWith(query.toLowerCase()));
  }, [query]);

  React.useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[activeIdx]) {
          onSelect(filtered[activeIdx].name);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, activeIdx, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-full mb-3 left-4 w-84 rounded-2xl border border-border-default/80 dark:border-white/15 bg-surface/95 dark:bg-surface-elevated/95 backdrop-blur-2xl shadow-2xl overflow-hidden z-50 select-none"
      >
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border-subtle dark:border-white/5 bg-surface-elevated/50 dark:bg-white/[0.02]">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Slash Commands</span>
          </span>
          <span className="text-[9px] font-mono text-muted-foreground">
            ↑↓ navigate · ↵ select
          </span>
        </div>

        <div className="p-1.5 space-y-1 max-h-72 overflow-y-auto">
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon;
            const isSelected = i === activeIdx;

            return (
              <button
                key={cmd.name}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(cmd.name);
                }}
                onMouseEnter={() => setActiveIdx(i)}
                className={cn(
                  'flex w-full items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer',
                  isSelected
                    ? 'bg-primary/10 dark:bg-white/10 shadow-xs'
                    : 'hover:bg-surface-hover dark:hover:bg-white/5'
                )}
              >
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-transform',
                  cmd.color,
                  isSelected && 'scale-105'
                )}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-foreground">
                      /{cmd.name}
                    </span>
                    <span className="text-[9.5px] font-mono text-muted-foreground truncate">
                      {cmd.syntax}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">
                    {cmd.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
