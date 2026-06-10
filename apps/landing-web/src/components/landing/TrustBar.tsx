import { Rocket, Palette, Truck, Monitor, Factory, Settings } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

const industries = [
  { icon: Rocket, label: 'Startups' },
  { icon: Palette, label: 'Agencies' },
  { icon: Truck, label: 'Logistics' },
  { icon: Monitor, label: 'IT Services' },
  { icon: Factory, label: 'Manufacturing' },
  { icon: Settings, label: 'Operations' },
];

export function TrustBar() {
  return (
    <section className="px-6 py-16">
      <ScrollReveal>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-ink-faint font-medium mb-8">
            Built for teams who want clarity, not complexity
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
            {industries.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 text-ink-faint hover:text-ink-light transition-colors"
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
