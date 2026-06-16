import { motion } from 'motion/react';
import { 
  MessageSquare, 
  CheckSquare, 
  FileCheck, 
  Shield, 
  ArrowRight, 
  Terminal,
  Clock,
  Users,
  Check
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { useNavigation } from '../../context/NavigationContext';

const features = [
  {
    icon: MessageSquare,
    title: 'Real-time Chat',
    description: 'Centralize communication in department channels, secure DMs, and task comments.',
    bullets: ['Department #channels', 'Contextual task comments', 'Type `/task` command shortcut'],
    color: 'text-cyan-600',
    bg: 'bg-cyan-55 bg-cyan-50 border border-cyan-100/30',
    hoverBorder: 'hover:border-cyan-300',
    path: '/features/team-chat',
  },
  {
    icon: CheckSquare,
    title: 'Work Tracking',
    description: 'Track operations with transparent Kanban boards, assigned task owners, and real-time statuses.',
    bullets: ['Lightweight Kanban boards', 'Assigned owners & due dates', 'Auditable priority triage'],
    color: 'text-indigo-650',
    bg: 'bg-indigo-55 bg-indigo-50 border border-indigo-100/30',
    hoverBorder: 'hover:border-indigo-300',
    path: '/features/work-tracking',
  },
  {
    icon: FileCheck,
    title: 'Requests & Approvals Log',
    description: 'Standardize administrative requests. Review expense quotes, authorize leaves of absence, and track procurement files in a secure sign-off inbox.',
    bullets: ['Expense reimbursement queues', 'Leave of absence forms', 'Procurement audit logs'],
    color: 'text-purple-600',
    bg: 'bg-purple-55 bg-purple-50 border border-purple-100/30',
    hoverBorder: 'hover:border-purple-300',
    path: '/features/approvals',
  },
  {
    icon: Shield,
    title: 'Admin Console',
    description: 'Monitor capacity, workload allocations, project goal health, and overdue tasks.',
    bullets: ['Resource workload allocation', 'Project health tracking', 'Overdue task triage'],
    color: 'text-rose-600',
    bg: 'bg-rose-55 bg-rose-50 border border-rose-100/30',
    hoverBorder: 'hover:border-rose-300',
    path: '/features/admin-console',
  },
];

export function FeatureCards() {
  const { navigate } = useNavigation();

  return (
    <section className="px-6 py-24 relative overflow-hidden bg-slate-50/10 grid-pattern">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
              Engineered for Operational Speed
            </h2>
            <p className="text-slate-500 text-xs md:text-sm font-semibold max-w-lg mx-auto leading-relaxed">
              Consolidate your coordination. Guild Orbit unifies task lists, chat channels, expense approvals, and admin workload boards.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <ScrollReveal key={f.title} delay={i * 0.08}>
                <div 
                  onClick={() => navigate(f.path)}
                  className={`group glass rounded-3xl p-7 h-full flex flex-col justify-between hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-slate-150 shadow-sm relative overflow-hidden ${f.hoverBorder}`}
                >
                  {/* Sweep highlight animation */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" style={{ animationDuration: '1.5s' }} />
                  
                  <div>
                    {/* Header: Icon */}
                    <div
                      className={`inline-flex items-center justify-center h-12 w-12 rounded-2xl mb-6 group-hover:scale-110 transition-transform ${f.bg} ${f.color}`}
                    >
                      <Icon className="h-5.5 w-5.5" />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-slate-900 mb-2.5 group-hover:text-indigo-600 transition-colors">
                      {f.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-6">
                      {f.description}
                    </p>

                    {/* Bullet List */}
                    <ul className="space-y-2 mb-6">
                      {f.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-center gap-2 text-[10.5px] font-bold text-slate-600">
                          <Check className={`h-3 w-3 ${f.color}`} />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Learn More link */}
                  <div className="pt-2 flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                    <span>Learn more</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal delay={0.35}>
          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/features')}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer group"
            >
              Explore all premium features
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
