import { Zap, Search, Shield } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

const highlights = [
  {
    icon: Zap,
    title: 'Ready in 5 minutes',
    description: 'Create workspace → invite team → start working.',
    accent: 'bg-amber-50 text-amber-500',
  },
  {
    icon: Search,
    title: 'Everything searchable',
    description: 'Messages, tasks, files, and people — all indexed.',
    accent: 'bg-violet-50 text-violet-500',
  },
  {
    icon: Shield,
    title: 'Secure by default',
    description: 'Encrypted data, isolated workspaces, role-based access.',
    accent: 'bg-emerald-50 text-emerald-500',
  },
];

export function BentoShowcase() {
  return (
    <section className="px-6 py-20">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-ink tracking-tight">
              See it in action
            </h2>
            <p className="mt-3 text-ink-light text-base">
              A single workspace that replaces the chaos.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-5 gap-4">
          {/* Large product image */}
          <ScrollReveal className="md:col-span-3">
            <div className="glass rounded-2xl overflow-hidden h-full min-h-[300px]">
              <img
                src="/guild_hero_mockup.png"
                alt="Guild Orbit dashboard overview"
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            </div>
          </ScrollReveal>

          {/* Highlight cards */}
          <div className="md:col-span-2 flex flex-col gap-4">
            {highlights.map((h, i) => (
              <ScrollReveal key={h.title} delay={0.08 + i * 0.06}>
                <div className="glass rounded-2xl p-6">
                  <div
                    className={`inline-flex items-center justify-center h-9 w-9 rounded-xl ${h.accent} mb-3`}
                  >
                    <h.icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-ink mb-1">
                    {h.title}
                  </h3>
                  <p className="text-xs text-ink-light leading-relaxed">
                    {h.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* Secondary image row */}
        <ScrollReveal className="mt-4">
          <div className="glass rounded-2xl overflow-hidden">
            <img
              src="/guild_feature_showcase.png"
              alt="Guild Orbit feature showcase"
              className="w-full object-cover max-h-[300px]"
              loading="lazy"
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
