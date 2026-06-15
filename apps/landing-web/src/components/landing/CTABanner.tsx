import { ArrowRight, Sparkles } from 'lucide-react';
import { APP_URL } from '../../config/landingData';
import { ScrollReveal } from './ScrollReveal';

export function CTABanner() {
  return (
    <section className="px-6 py-24 bg-slate-50/5">
      <ScrollReveal>
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-12 md:p-16 relative overflow-hidden shadow-2xl border border-indigo-900/30">
          {/* Subtle cosmic glows */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-drift" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none animate-drift-reverse" />
          <div className="absolute inset-0 grid-pattern-dark opacity-30 pointer-events-none" />

          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight relative leading-none font-sans">
            Bring your team into orbit.
          </h2>
          <p className="mt-4 text-slate-300 text-sm md:text-base max-w-md mx-auto relative font-medium leading-relaxed">
            Eliminate operational silos, consolidate chats and approvals, and execute tasks with absolute accountability.
          </p>
          <a
            href={`${APP_URL}/signup`}
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-6.5 py-3.5 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.97] hover:-translate-y-0.5 relative cursor-pointer"
          >
            Start free workspace
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </ScrollReveal>
    </section>
  );
}
