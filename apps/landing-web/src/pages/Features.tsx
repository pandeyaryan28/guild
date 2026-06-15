import { motion } from 'motion/react';
import {
  MessageSquare,
  CheckSquare,
  FileCheck,
  FolderOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { ScrollReveal } from '../components/landing/ScrollReveal';
import { CTABanner } from '../components/landing/CTABanner';

const featuresPortalData = [
  {
    category: 'Work Tracking',
    icon: CheckSquare,
    title: 'Visual Task Boards & Kanban',
    description: 'Track operations with transparent Kanban boards, assigned task owners, and real-time statuses.',
    bullets: ['Lightweight Kanban boards', 'Assigned owners & due dates', 'Auditable priority triage'],
    path: '/features/work-tracking',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border border-indigo-100/50',
    accentColor: 'group-hover:text-indigo-600',
    btnBg: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 shadow-md',
  },
  {
    category: 'Team Chat',
    icon: MessageSquare,
    title: 'Real-time Channels & DMs',
    description: 'Centralize communication in department chat channels, direct messages, and contextual task comments.',
    bullets: ['Department-focused channels', 'Secure private messaging', 'Unique /task chat shortcut'],
    path: '/features/team-chat',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50 border border-cyan-100/50',
    accentColor: 'group-hover:text-cyan-600',
    btnBg: 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-100 shadow-md',
  },
  {
    category: 'Requests & Approvals',
    icon: FileCheck,
    title: 'One-Click Administrative Sign-offs',
    description: 'Submit, review, and authorize purchase orders, leave requests, and operational sign-offs instantly.',
    bullets: ['Leave & vacation requests', 'Purchase order approvals', 'Operational audit logs'],
    path: '/features/approvals',
    color: 'text-purple-600',
    bg: 'bg-purple-50 border border-purple-100/50',
    accentColor: 'group-hover:text-purple-600',
    btnBg: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-100 shadow-md',
  },
  {
    category: 'Visibility & Files',
    icon: FolderOpen,
    title: 'Central Dashboards & Shared Files',
    description: 'Establish a single source of truth with personal activity feeds, files directory, and task indexes.',
    bullets: ['Centralized dashboard views', 'Shared files directory', 'Global indexed search'],
    path: '/features/visibility',
    color: 'text-rose-600',
    bg: 'bg-rose-50 border border-rose-100/50',
    accentColor: 'group-hover:text-rose-600',
    btnBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-100 shadow-md',
  },
];

export function Features() {
  const { navigate } = useNavigation();

  return (
    <div className="pt-28 pb-8 relative overflow-hidden bg-slate-50/20 grid-pattern">
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-indigo-400/5 blur-[90px] animate-drift pointer-events-none" />
      <div className="absolute top-[40%] right-[5%] w-[400px] h-[400px] rounded-full bg-cyan-400/5 blur-[100px] animate-drift-reverse pointer-events-none" />

      {/* Header */}
      <section className="px-6 max-w-3xl mx-auto text-center mb-16">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[clamp(2rem,4vw,3rem)] font-extrabold text-slate-900 tracking-tight leading-tight"
        >
          Clarity in every module.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-4 text-slate-500 text-base md:text-lg font-medium max-w-xl mx-auto leading-relaxed"
        >
          Explore the core operational tools built from the ground up for speed, transparency, and collaboration.
        </motion.p>
      </section>

      {/* Feature grid */}
      <div className="max-w-5xl mx-auto px-6 mb-24">
        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          {featuresPortalData.map((f, i) => {
            const Icon = f.icon;
            return (
              <ScrollReveal key={f.title} delay={i * 0.08}>
                <div 
                  onClick={() => navigate(f.path)}
                  className="group glass rounded-3xl p-8 border border-slate-150/70 shadow-sm flex flex-col justify-between h-full hover:scale-[1.005] hover:border-slate-300 transition-all duration-300 cursor-pointer"
                >
                  <div>
                    {/* Header: Icon & Category */}
                    <div className="flex justify-between items-center mb-6">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${f.bg} ${f.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                        {f.category}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-3 leading-snug">
                      {f.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                      {f.description}
                    </p>

                    {/* Key features bullets */}
                    <ul className="space-y-2.5 mb-8">
                      {f.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <span className={`h-1.5 w-1.5 rounded-full ${f.color.replace('text-', 'bg-')}`} />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(f.path);
                    }}
                    className={`w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold py-3 px-4 rounded-xl transition-all cursor-pointer hover:translate-y-[-1px] active:translate-y-0 ${f.btnBg}`}
                  >
                    Learn more about {f.category}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>

      <CTABanner />
    </div>
  );
}
