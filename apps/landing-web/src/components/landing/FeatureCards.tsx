import { MessageSquare, CheckSquare, FileCheck, ArrowRight } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { useNavigation } from '../../context/NavigationContext';

const features = [
  {
    icon: MessageSquare,
    title: 'Team chat, built for work',
    description:
      'Channels, DMs, and file sharing — without the noise of personal chat apps.',
    color: 'text-violet-500',
    bg: 'bg-violet-50',
  },
  {
    icon: CheckSquare,
    title: 'Visual task boards',
    description:
      'Kanban boards with owners, due dates, and priorities. Simple, not enterprise.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
  },
  {
    icon: FileCheck,
    title: 'Approvals in one click',
    description:
      'Submit requests for purchases, leaves, or admin actions. Managers approve instantly.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-50',
  },
];

export function FeatureCards() {
  const { navigate } = useNavigation();

  return (
    <section className="px-6 py-20">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-ink tracking-tight">
              Everything your team needs
            </h2>
            <p className="mt-3 text-ink-light text-base">
              Three core modules. Zero learning curve.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 0.08}>
              <div className="glass rounded-2xl p-7 h-full hover:scale-[1.015] transition-transform duration-300">
                <div
                  className={`inline-flex items-center justify-center h-10 w-10 rounded-xl ${f.bg} ${f.color} mb-5`}
                >
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-ink-light leading-relaxed">
                  {f.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.3}>
          <div className="text-center mt-10">
            <button
              onClick={() => navigate('/features')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-dark transition-colors cursor-pointer"
            >
              Explore all features
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
