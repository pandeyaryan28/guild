import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Target, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CommandItem {
  name: string;
  description: string;
  syntax: string;
  icon: React.ComponentType<{ className?: string }>;
}

const COMMANDS: CommandItem[] = [
  { name: 'task', description: 'Create and assign a task', syntax: '/task <title> [@users]', icon: CheckSquare },
  { name: 'goal', description: 'Create a personal or team goal', syntax: '/goal <title>', icon: Target },
  { name: 'request', description: 'Submit a request to an approver', syntax: '/request <title> @approver', icon: ClipboardList },
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
        initial={{ opacity: 0, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-full mb-2 left-0 w-80 rounded-xl border border-border-default bg-popover/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="px-3.5 py-2.5 border-b border-border-default bg-surface/50">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
            <span>✨</span> Slash Commands
          </span>
        </div>
        <div className="py-1 max-h-72 overflow-y-auto">
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.name}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(cmd.name);
                }}
                onMouseEnter={() => setActiveIdx(i)}
                className={cn(
                  'flex w-full items-start gap-3.5 px-4 py-3 text-left transition-colors border-b border-white/[0.02] last:border-0',
                  i === activeIdx ? 'bg-primary/10' : 'hover:bg-bg-tertiary',
                )}
              >
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                  i === activeIdx 
                    ? 'bg-primary/20 text-primary border-primary/20' 
                    : 'bg-primary/5 text-primary border-primary/10'
                )}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-foreground">/{cmd.name}</p>
                    <p className="text-[10px] font-mono text-text-muted">{cmd.syntax}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed truncate">
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
