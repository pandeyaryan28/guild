import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { type UserProfile } from '../../lib/firestore';
import { cn } from '@/lib/utils';
import { Users, AtSign } from 'lucide-react';
import { avatarInitials, avatarHue } from '../../components/MemberProfileDrawer';

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
            m.username?.toLowerCase().includes(query.toLowerCase()) ||
            m.fullName?.toLowerCase().includes(query.toLowerCase()),
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
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-full mb-3 left-4 w-76 rounded-2xl border border-border-default/80 dark:border-white/15 bg-surface/95 dark:bg-surface-elevated/95 backdrop-blur-2xl shadow-2xl overflow-hidden z-50 select-none"
      >
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border-subtle dark:border-white/5 bg-surface-elevated/50 dark:bg-white/[0.02]">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <AtSign className="h-3.5 w-3.5 text-primary" />
            <span>Mention Teammate</span>
          </span>
          <span className="text-[9px] font-mono text-muted-foreground">
            ↑↓ navigate
          </span>
        </div>

        <div className="p-1.5 space-y-1 max-h-64 overflow-y-auto">
          {filtered.map((m, i) => {
            const isSelected = i === activeIdx;
            const initials = avatarInitials(m.fullName || m.username || '?');

            return (
              <button
                key={m.uid}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(m);
                }}
                onMouseEnter={() => setActiveIdx(i)}
                className={cn(
                  'flex w-full items-center gap-3 p-2 rounded-xl text-left transition-all cursor-pointer',
                  isSelected
                    ? 'bg-primary/10 dark:bg-white/10 shadow-xs'
                    : 'hover:bg-surface-hover dark:hover:bg-white/5'
                )}
              >
                {/* User Avatar with status dot */}
                <div className="relative h-8 w-8 shrink-0">
                  {m.photoURL ? (
                    <img src={m.photoURL} alt={m.fullName} className="h-8 w-8 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white border border-white/15"
                      style={{ background: `hsl(${avatarHue(m.uid)} 55% 45%)` }}
                    >
                      {initials}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-surface flex items-center justify-center shadow-xs">
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      m.availabilityStatus === 'focus' ? "bg-red-500" :
                      m.availabilityStatus === 'away' ? "bg-amber-500" :
                      m.availabilityStatus === 'active' ? "bg-emerald-500" : "bg-zinc-400"
                    )} />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-foreground truncate">
                      {m.fullName}
                    </p>
                    {m.role && (
                      <span className="text-[9px] font-semibold text-muted-foreground uppercase px-1.5 py-0.5 rounded bg-surface-elevated dark:bg-white/5">
                        {m.role}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    @{m.username}
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
