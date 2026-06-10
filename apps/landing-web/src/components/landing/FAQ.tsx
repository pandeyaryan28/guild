import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { FAQ_ITEMS } from '../../config/landingData';

export function FAQ() {
  const [activeFAQ, setActiveFAQ] = React.useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setActiveFAQ(activeFAQ === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 px-6 max-w-[800px] mx-auto scroll-mt-20">
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-3.5xl font-black text-text-primary tracking-tight uppercase">
          Frequently Asked Questions
        </h2>
        <p className="text-xs text-text-secondary mt-3 font-medium">
          Have questions about how Guild Orbit works? We've compiled the answers below.
        </p>
      </div>

      <div className="space-y-4">
        {FAQ_ITEMS.map((item, index) => (
          <div 
            key={index}
            className="aether-glass border border-border-default/60 overflow-hidden transition-all duration-300 rounded-[20px]"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full px-6 py-4.5 text-left flex items-center justify-between text-xs font-bold text-text-primary uppercase tracking-wide hover:bg-black/[0.02] active:scale-99 transition-all"
            >
              <span>{item.q}</span>
              {activeFAQ === index ? (
                <ChevronDown className="h-4.5 w-4.5 text-indigo-500 shrink-0 transform rotate-180 transition-transform duration-300" />
              ) : (
                <ChevronDown className="h-4.5 w-4.5 text-text-muted shrink-0 transition-transform duration-300" />
              )}
            </button>
            
            <AnimatePresence>
              {activeFAQ === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="px-6 pb-5 pt-1 text-xs text-text-secondary font-medium leading-relaxed border-t border-border-default/20 bg-black/[0.01]">
                    {item.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}
