import { X, Check } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

const without = [
  'Scattered WhatsApp groups for every project',
  'Spreadsheets with conflicting versions',
  'Email approval chains that take days',
];

const withGuild = [
  'One chat platform with dedicated channels',
  'Visual task boards with real-time updates',
  'Instant approvals with full audit trails',
];

export function BeforeAfter() {
  return (
    <section className="px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal>
          <h2 className="text-2xl md:text-3xl font-bold text-ink tracking-tight text-center mb-12">
            The shift your team needs
          </h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Without */}
          <ScrollReveal delay={0.08}>
            <div className="glass rounded-2xl p-8 border border-red-200/40 h-full">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-red-100/40">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <h3 className="text-sm font-semibold text-red-600">
                  Without Guild Orbit
                </h3>
              </div>
              <ul className="space-y-4">
                {without.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-ink-light"
                  >
                    <X className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          {/* With */}
          <ScrollReveal delay={0.16}>
            <div className="glass rounded-2xl p-8 border border-emerald-200/40 h-full">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-emerald-100/40">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-semibold text-emerald-600">
                  With Guild Orbit
                </h3>
              </div>
              <ul className="space-y-4">
                {withGuild.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-ink-light"
                  >
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
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
