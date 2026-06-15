import { MessageSquare, CheckSquare, FileCheck, ArrowRight } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { useNavigation } from '../../context/NavigationContext';

const features = [
  {
    icon: MessageSquare,
    title: 'Contextual Chat',
    description: 'Discuss, share, and unblock in real-time.',
    color: 'text-violet-600',
    bg: 'bg-violet-500/10',
    path: '/features/team-chat',
  },
  {
    icon: CheckSquare,
    title: 'Visual Kanban',
    description: 'Assign, track, and complete tasks effortlessly.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-500/10',
    path: '/features/work-tracking',
  },
  {
    icon: FileCheck,
    title: 'Instant Approvals',
    description: 'Submit, review, and track admin requests in a click.',
    color: 'text-cyan-600',
    bg: 'bg-cyan-500/10',
    path: '/features/approvals',
  },
];

export function FeatureCards() {
  const { navigate } = useNavigation();

  return (
    <section className="px-6 py-20 relative">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight">
              One Workspace.
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 0.08}>
              <div 
                onClick={() => navigate(f.path)}
                className="glass rounded-2xl p-7 h-full hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 cursor-pointer hover:border-slate-300"
              >
                <div
                  className={`inline-flex items-center justify-center h-12 w-12 rounded-2xl ${f.bg} ${f.color} mb-6`}
                >
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-ink mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-ink-light leading-relaxed font-medium">
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
