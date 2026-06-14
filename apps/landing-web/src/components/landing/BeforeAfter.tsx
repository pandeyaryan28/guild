import { X, Check } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

const without = [
  'Scattered chat threads',
  'Outdated spreadsheets',
  'Stalled email approvals',
];

const withGuild = [
  'Centralized channels',
  'Real-time task boards',
  'One-click approval chains',
];

export function BeforeAfter() {
  return (
    <section className="px-6 py-20 relative">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal>
          <h2 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight text-center mb-12">
            The Operational Shift
          </h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Without */}
          <ScrollReveal delay={0.08}>
            <div className="glass rounded-3xl p-8 border border-red-500/10 h-full shadow-lg shadow-red-500/[0.01] hover:scale-[1.01] transition-transform duration-300">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-red-500/10">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider">
                  The Chaos
                </h3>
              </div>
              <ul className="space-y-4">
                {without.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm text-ink-light font-medium"
                  >
                    <X className="h-4 w-4 text-red-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          {/* With */}
          <ScrollReveal delay={0.16}>
            <div className="glass rounded-3xl p-8 border border-emerald-500/10 h-full shadow-lg shadow-emerald-500/[0.01] hover:scale-[1.01] transition-transform duration-300">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-emerald-500/10">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider">
                  Guild Orbit
                </h3>
              </div>
              <ul className="space-y-4">
                {withGuild.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm text-ink-light font-medium"
                  >
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
