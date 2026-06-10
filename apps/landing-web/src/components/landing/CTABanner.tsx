import { ArrowRight } from 'lucide-react';
import { APP_URL } from '../../config/landingData';
import { ScrollReveal } from './ScrollReveal';

export function CTABanner() {
  return (
    <section className="px-6 py-20">
      <ScrollReveal>
        <div className="max-w-3xl mx-auto text-center glass rounded-3xl p-12 md:p-16 relative overflow-hidden">
          {/* Subtle accent glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-2xl md:text-3xl font-bold text-ink tracking-tight relative">
            Ready to bring your team together?
          </h2>
          <p className="mt-3 text-ink-light text-base max-w-md mx-auto relative">
            Get started in under five minutes. No credit card required.
          </p>
          <a
            href={`${APP_URL}/signup`}
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark px-6 py-3 rounded-xl transition-all active:scale-[0.97] shadow-lg shadow-accent/20 relative"
          >
            Start for free
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </ScrollReveal>
    </section>
  );
}
