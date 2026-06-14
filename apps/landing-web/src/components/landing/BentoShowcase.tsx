import { Zap, Search, Shield } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

const highlights = [
  {
    icon: Zap,
    title: 'Instant Setup',
    description: 'Ready in 5 minutes.',
    accent: 'bg-amber-500/10 text-amber-600',
  },
  {
    icon: Search,
    title: 'Unified Search',
    description: 'Find anything instantly.',
    accent: 'bg-violet-500/10 text-violet-600',
  },
  {
    icon: Shield,
    title: 'Secure Workspaces',
    description: 'Encrypted and isolated.',
    accent: 'bg-emerald-500/10 text-emerald-600',
  },
];

export function BentoShowcase() {
  return (
    <section className="px-6 py-20 relative">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight">
              Built for Visual Clarity
            </h2>
            <p className="mt-3 text-ink-light text-base font-medium">
              Eliminate information silos, instantly.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Large product image */}
          <ScrollReveal className="md:col-span-3">
            <div className="glass rounded-3xl overflow-hidden h-full min-h-[320px] p-2 hover:scale-[1.01] transition-transform duration-300 shadow-xl shadow-indigo-100/10 border-white/80">
              <img
                src="/guild_hero_mockup.png"
                alt="Guild Orbit dashboard overview"
                className="w-full h-full object-cover object-top rounded-2xl"
                loading="lazy"
              />
            </div>
          </ScrollReveal>

          {/* Highlight cards */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {highlights.map((h, i) => (
              <ScrollReveal key={h.title} delay={0.08 + i * 0.06}>
                <div className="glass rounded-2xl p-6 hover:scale-[1.015] transition-transform duration-300">
                  <div
                    className={`inline-flex items-center justify-center h-10 w-10 rounded-xl ${h.accent} mb-4`}
                  >
                    <h.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-ink mb-1">
                    {h.title}
                  </h3>
                  <p className="text-xs text-ink-light leading-relaxed font-medium">
                    {h.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* Secondary image row */}
        <ScrollReveal className="mt-6">
          <div className="glass rounded-3xl overflow-hidden p-2 shadow-xl shadow-indigo-100/10 border-white/80 hover:scale-[1.005] transition-transform duration-300">
            <img
              src="/guild_feature_showcase.png"
              alt="Guild Orbit feature showcase"
              className="w-full object-cover max-h-[300px] rounded-2xl"
              loading="lazy"
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
