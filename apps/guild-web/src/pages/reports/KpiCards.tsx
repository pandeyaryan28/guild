import * as React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KpiCardData {
  label: string;
  value: number | string;
  sub?: string;
  icon?: React.ElementType;
  accent?: 'emerald' | 'blue' | 'amber' | 'red' | 'violet' | 'default';
  trend?: 'up' | 'down' | 'neutral';
}

const ACCENT_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', ring: 'ring-emerald-500/20' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    ring: 'ring-blue-500/20'    },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   ring: 'ring-amber-500/20'   },
  red:     { bg: 'bg-red-500/10',     text: 'text-red-400',     ring: 'ring-red-500/20'     },
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  ring: 'ring-violet-500/20'  },
  default: { bg: 'bg-primary/10',     text: 'text-primary',     ring: 'ring-primary/20'     },
};

function KpiCard({ card, delay }: { card: KpiCardData; delay: number }) {
  const accent = ACCENT_STYLES[card.accent ?? 'default'];
  const Icon = card.icon;
  const TrendIcon = card.trend === 'up' ? TrendingUp : card.trend === 'down' ? TrendingDown : Minus;
  const trendColor = card.trend === 'up' ? 'text-emerald-400' : card.trend === 'down' ? 'text-red-400' : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="relative rounded-xl border border-border-default bg-card p-5 hover:border-primary/30 hover:bg-surface transition-all duration-200 hover:shadow-lg hover:shadow-black/10 group"
    >
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg ring-1', accent.bg, accent.ring)}>
            <Icon className={cn('h-4 w-4', accent.text)} />
          </div>
        )}
        {card.trend && (
          <TrendIcon className={cn('h-3.5 w-3.5', trendColor)} />
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{card.value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-0.5">{card.label}</p>
      {card.sub && (
        <p className="text-[10px] text-muted-foreground/60 mt-1">{card.sub}</p>
      )}
    </motion.div>
  );
}

export function KpiCards({ cards }: { cards: KpiCardData[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <KpiCard key={card.label} card={card} delay={i * 0.05} />
      ))}
    </div>
  );
}
