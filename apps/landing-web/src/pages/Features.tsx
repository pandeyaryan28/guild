import { motion } from 'motion/react';
import {
  MessageSquare,
  CheckSquare,
  FileCheck,
  FolderOpen,
  Search,
  LayoutDashboard,
  Bell,
} from 'lucide-react';
import { ScrollReveal } from '../components/landing/ScrollReveal';
import { CTABanner } from '../components/landing/CTABanner';

const mainFeatures = [
  {
    badge: 'Communication',
    icon: MessageSquare,
    title: 'Context-First Communication',
    description:
      'Centralized department channels, direct messaging, and fast file sharing.',
    bullets: [
      'Targeted channels (#ops, #marketing)',
      'Direct DMs & private groups',
      'Instant file attachments',
    ],
    image: '/guild_hero_mockup.png?v=2',
    color: 'text-violet-600',
    bg: 'bg-violet-500/10',
    dotBg: 'bg-violet-600',
    accentBorder: 'border-violet-500/10',
  },
  {
    badge: 'Task management',
    icon: CheckSquare,
    title: 'Visual Task Tracking',
    description:
      'Lightweight Kanban boards to plan and execute operations together.',
    bullets: [
      'Drag-and-drop workflow status',
      'Assigned owners & due dates',
      'Priority triage & activity history',
    ],
    image: '/guild_feature_showcase.png?v=2',
    color: 'text-indigo-600',
    bg: 'bg-indigo-500/10',
    dotBg: 'bg-indigo-600',
    accentBorder: 'border-indigo-500/10',
  },
  {
    badge: 'Approvals',
    icon: FileCheck,
    title: 'One-Click Approvals',
    description:
      'Standardized forms for expenses, leaves, and admin requests.',
    bullets: [
      'Purchase & expense requests',
      'Leave & administrative signoffs',
      'Complete operational audit trail',
    ],
    image: null,
    color: 'text-cyan-600',
    bg: 'bg-cyan-500/10',
    dotBg: 'bg-cyan-600',
    accentBorder: 'border-cyan-500/10',
  },
];

const extraModules = [
  {
    icon: FolderOpen,
    title: 'Shared files',
    description: 'Invoices, assets, and document directories.',
  },
  {
    icon: Search,
    title: 'Global search',
    description: 'Search chat, tasks, and files instantly.',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Your tasks and approvals in a single view.',
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Mentions and approval alerts in real-time.',
  },
];

export function Features() {
  return (
    <div className="pt-28 pb-8 relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-indigo-400/5 blur-[90px] animate-drift pointer-events-none" />
      <div className="absolute top-[40%] right-[5%] w-[400px] h-[400px] rounded-full bg-cyan-400/5 blur-[100px] animate-drift-reverse pointer-events-none" />

      {/* Header */}
      <section className="px-6 max-w-3xl mx-auto text-center mb-20">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[clamp(2rem,4vw,3rem)] font-extrabold text-ink tracking-tight"
        >
          Clarity in every module.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-4 text-lg text-ink-light font-medium"
        >
          Operational tools built for speed.
        </motion.p>
      </section>

      {/* Feature deep-dives */}
      <div className="max-w-5xl mx-auto px-6 space-y-24">
        {mainFeatures.map((f, i) => {
          const isReversed = i % 2 === 1;
          return (
            <ScrollReveal key={f.title}>
              <section className="grid md:grid-cols-2 gap-12 items-center">
                {/* Text side */}
                <div className={isReversed ? 'md:order-2' : ''}>
                  <div
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${f.color} ${f.bg} px-3 py-1 rounded-full mb-4 glass`}
                  >
                    <f.icon className="h-3.5 w-3.5" />
                    {f.badge}
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-ink tracking-tight mb-3">
                    {f.title}
                  </h2>
                  <p className="text-sm text-ink-light leading-relaxed mb-5 font-medium">
                    {f.description}
                  </p>
                  <ul className="space-y-2.5">
                    {f.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-center gap-2.5 text-sm text-ink-light font-medium"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${f.dotBg}`}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual side */}
                <div className={isReversed ? 'md:order-1' : ''}>
                  {f.image ? (
                    <div
                      className={`glass rounded-3xl p-2 border ${f.accentBorder} shadow-lg shadow-indigo-100/10 hover:scale-[1.01] transition-transform duration-300`}
                    >
                      <img
                        src={f.image}
                        alt={f.title}
                        className="w-full rounded-2xl"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div
                      className={`glass rounded-3xl p-8 ${f.accentBorder} border min-h-[280px] flex items-center justify-center shadow-lg shadow-indigo-100/10 hover:scale-[1.01] transition-transform duration-300`}
                    >
                      <div className="text-center">
                        <div
                          className={`inline-flex items-center justify-center h-16 w-16 rounded-2xl ${f.bg} ${f.color} mb-4`}
                        >
                          <f.icon className="h-8 w-8" />
                        </div>
                        <p className="text-sm text-ink-faint font-semibold">
                          Structured approval workflows
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </ScrollReveal>
          );
        })}
      </div>

      {/* Extra modules */}
      <div className="max-w-5xl mx-auto px-6 mt-24">
        <ScrollReveal>
          <h3 className="text-xl font-bold text-ink text-center mb-10">
            Plus more built-in modules
          </h3>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
          {extraModules.map((m, i) => (
            <ScrollReveal key={m.title} delay={i * 0.06}>
              <div className="glass rounded-2xl p-6 h-full hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <m.icon className="h-5 w-5 text-ink-light mb-4" />
                <h4 className="text-sm font-bold text-ink mb-1">
                  {m.title}
                </h4>
                <p className="text-xs text-ink-light leading-relaxed font-medium">
                  {m.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <CTABanner />
    </div>
  );
}
