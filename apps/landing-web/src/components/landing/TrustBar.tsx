import { Zap, Sparkles, Layers } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

const points = [
  { icon: Zap, label: '5 Minute Setup' },
  { icon: Sparkles, label: 'Zero Learning Curve' },
  { icon: Layers, label: 'Fully Integrated' },
];

export function TrustBar() {
  return (
    <section className="px-6 py-12 relative overflow-hidden">
      <ScrollReveal>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-ink-light font-bold uppercase tracking-wider mb-8">
            Built for teams who want clarity, not complexity
          </p>
          <div className="glass rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row items-center justify-around gap-8 shadow-xl shadow-indigo-100/5 border-white/80 hover:scale-[1.005] transition-all duration-300">
            {points.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 text-ink-light hover:text-ink transition-colors"
              >
                <div className="h-9 w-9 rounded-xl bg-accent-light flex items-center justify-center">
                  <Icon className="h-5 w-5 text-accent" strokeWidth={2.5} />
                </div>
                <span className="text-sm font-bold tracking-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
