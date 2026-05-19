import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { type UserProfile } from '../../lib/firestore';
import { cn } from '@/lib/utils';

interface MentionDropdownProps {
  query: string;
  members: UserProfile[];
  onSelect: (member: UserProfile) => void;
  onClose: () => void;
}

export function MentionDropdown({ query, members, onSelect, onClose }: MentionDropdownProps) {
  const [activeIdx, setActiveIdx] = React.useState(0);

  const filtered = React.useMemo(
    () =>
      members
        .filter(
          (m) =>
            m.username.toLowerCase().includes(query.toLowerCase()) ||
            m.fullName.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 6),
    [members, query],
  );

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
        if (filtered[activeIdx]) onSelect(filtered[activeIdx]);
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
        className="absolute bottom-full mb-2 left-0 w-64 rounded-xl border border-border-default bg-popover/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden z-50"
      >
        <div className="px-3 py-2 border-b border-border-default">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Mention a member
          </span>
        </div>
        {filtered.map((m, i) => (
          <button
            key={m.uid}
            onMouseDown={(e) => { e.preventDefault(); onSelect(m); }}
            onMouseEnter={() => setActiveIdx(i)}
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
              i === activeIdx ? 'bg-primary/10' : 'hover:bg-bg-tertiary',
            )}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {m.fullName[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{m.fullName}</p>
              <p className="text-[10px] text-muted-foreground truncate">@{m.username}</p>
            </div>
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
