import { motion } from 'motion/react';
import { PricingCards } from '../components/landing/PricingCards';
import { CTABanner } from '../components/landing/CTABanner';

export function Pricing() {
  return (
    <div className="pt-28 pb-8">
      {/* Header */}
      <section className="px-6 max-w-3xl mx-auto text-center mb-14">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[clamp(2rem,4vw,3rem)] font-bold text-ink tracking-tight"
        >
          Simple, transparent pricing
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-4 text-lg text-ink-light"
        >
          Free for small teams. Scale when you&apos;re ready.
        </motion.p>
      </section>

      <section className="px-6">
        <PricingCards />
      </section>

      <CTABanner />
    </div>
  );
}
