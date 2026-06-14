import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { FAQ_ITEMS } from '../../config/landingData';
import { ScrollReveal } from './ScrollReveal';

export function FAQAccordion() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {FAQ_ITEMS.map((item, i) => (
        <ScrollReveal key={i} delay={i * 0.04}>
          <div className="glass rounded-3xl overflow-hidden hover:scale-[1.005] transition-transform duration-300">
            <button
              onClick={() => setActive(active === i ? null : i)}
              className="w-full px-6 py-5 text-left flex items-center justify-between text-base font-bold text-ink hover:bg-white/30 transition-colors cursor-pointer"
            >
              <span className="pr-4">{item.q}</span>
              <ChevronDown
                className={`h-4 w-4 text-ink-faint shrink-0 transition-transform duration-300 ${
                  active === i ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {active === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="px-6 pb-5 text-sm text-ink-light leading-relaxed border-t border-line/40">
                    <div className="pt-4 font-medium">{item.a}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}
