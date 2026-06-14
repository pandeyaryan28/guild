import { ArrowRight } from 'lucide-react';
import { APP_URL } from '../../config/landingData';
import { ScrollReveal } from './ScrollReveal';

export function CTABanner() {
  return (
    <section className="px-6 py-20">
      <ScrollReveal>
        <div className="max-w-3xl mx-auto text-center glass rounded-3xl p-12 md:p-16 relative overflow-hidden shadow-2xl shadow-indigo-100/10 border-white/80">
          {/* Subtle dynamic accent glows */}
          <div className="absolute -top-20 left-1/4 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none animate-drift" />
          <div className="absolute -bottom-20 right-1/4 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none animate-drift-reverse" />

          <h2 className="text-2xl md:text-4xl font-extrabold text-ink tracking-tight relative">
            Bring your team into orbit.
          </h2>
          <p className="mt-4 text-ink-light text-base max-w-md mx-auto relative font-medium">
            Get started in five minutes. No credit card required.
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
