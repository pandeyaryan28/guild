import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Search, HelpCircle } from 'lucide-react';
import { FAQ_ITEMS } from '../config/landingData';

export function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setActiveFAQ(activeFAQ === index ? null : index);
  };

  const filteredFAQs = FAQ_ITEMS.filter(item => 
    item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pt-28 pb-16 px-6 max-w-[850px] mx-auto space-y-16">
      {/* Header */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-black text-text-primary tracking-tight uppercase">
          Frequently Asked Questions
        </h1>
        <p className="text-sm md:text-base text-text-secondary font-medium leading-relaxed">
          Need details about security, limits, or configuration? Find answers below.
        </p>
      </section>

      {/* Search Input */}
      <section className="relative max-w-[500px] mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
        <input 
          type="text" 
          placeholder="Search questions (e.g. security, pricing, seats)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 aether-glass-input text-sm font-semibold shadow-sm focus:outline-none"
        />
      </section>

      {/* FAQ Accordion List */}
      <section className="space-y-4">
        {filteredFAQs.length > 0 ? (
          filteredFAQs.map((item, index) => (
            <div 
              key={index}
              className="aether-glass border border-border-default/60 overflow-hidden transition-all duration-300 rounded-[20px]"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-text-primary uppercase tracking-wide hover:bg-black/[0.01] active:scale-[0.99] transition-all"
              >
                <span className="pr-4">{item.q}</span>
                {activeFAQ === index ? (
                  <ChevronDown className="h-5 w-5 text-indigo-500 shrink-0 transform rotate-180 transition-transform duration-300" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-text-muted shrink-0 transition-transform duration-300" />
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
                    <div className="px-6 pb-6 pt-1 text-xs sm:text-sm text-text-secondary font-medium leading-relaxed border-t border-border-default/20 bg-black/[0.005]">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        ) : (
          <div className="text-center py-12 space-y-3 aether-glass border border-dashed border-border-default bg-white/5">
            <HelpCircle className="h-10 w-10 text-text-muted mx-auto" />
            <p className="text-sm font-bold text-text-secondary">No matching questions found.</p>
            <p className="text-xs text-text-muted">Try searching other operational keywords.</p>
          </div>
        )}
      </section>
    </div>
  );
}
