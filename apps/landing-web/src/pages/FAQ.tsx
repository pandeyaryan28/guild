import { motion } from 'motion/react';
import { FAQAccordion } from '../components/landing/FAQAccordion';

export function FAQ() {
  return (
    <div className="pt-28 pb-20 px-6">
      {/* Header */}
      <section className="max-w-3xl mx-auto text-center mb-14">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[clamp(2rem,4vw,3rem)] font-bold text-ink tracking-tight"
        >
          Questions & answers
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-4 text-lg text-ink-light"
        >
          Everything you need to know about Guild Orbit.
        </motion.p>
      </section>

      <FAQAccordion />
    </div>
  );
}
