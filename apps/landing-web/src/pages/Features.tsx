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
    title: 'Team chat with real work context',
    description:
      'Keep conversations aligned with operations. Public channels for departments, private DMs for quick discussions, and secure file sharing — all searchable.',
    bullets: [
      'Department channels (#ops, #marketing)',
      'Direct messages and group chats',
      'File attachments and message history',
    ],
    image: '/guild_hero_mockup.png',
    color: 'text-violet-500',
    bg: 'bg-violet-50',
    dotBg: 'bg-violet-500',
    accentBorder: 'border-violet-100',
  },
  {
    badge: 'Task management',
    icon: CheckSquare,
    title: 'Simple tasks and kanban boards',
    description:
      'Maintain visual oversight of ongoing work. Create tasks, assign owners, set deadlines, and track progress — without the complexity of engineering tools.',
    bullets: [
      'Drag-and-drop kanban columns',
      'Assignees, due dates, and priorities',
      'Activity logs and comment history',
    ],
    image: '/guild_feature_showcase.png',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
    dotBg: 'bg-indigo-500',
    accentBorder: 'border-indigo-100',
  },
  {
    badge: 'Approvals',
    icon: FileCheck,
    title: 'Structured approvals in seconds',
    description:
      'Employees submit requests for purchases, leaves, or admin permissions. Managers get clean notifications and approve or decline with one click.',
    bullets: [
      'Standardized request templates',
      'Cost tracking and date selection',
      'Full audit trail of all decisions',
    ],
    image: null,
    color: 'text-cyan-500',
    bg: 'bg-cyan-50',
    dotBg: 'bg-cyan-500',
    accentBorder: 'border-cyan-100',
  },
];

const extraModules = [
  {
    icon: FolderOpen,
    title: 'Shared files',
    description:
      'Central directory for invoices, templates, and company documents.',
  },
  {
    icon: Search,
    title: 'Global search',
    description: 'Find messages, files, tasks, or people instantly.',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description:
      'Your assigned tasks, pending approvals, and recent activity in one view.',
  },
  {
    icon: Bell,
    title: 'Notifications',
    description:
      'Stay updated on tasks, approvals, and mentions without the noise.',
  },
];

export function Features() {
  return (
    <div className="pt-28 pb-8">
      {/* Header */}
      <section className="px-6 max-w-3xl mx-auto text-center mb-20">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[clamp(2rem,4vw,3rem)] font-bold text-ink tracking-tight"
        >
          Everything your team needs, nothing it doesn&apos;t
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-4 text-lg text-ink-light"
        >
          Lightweight tools built for operational clarity.
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
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${f.color} ${f.bg} px-3 py-1 rounded-full mb-4`}
                  >
                    <f.icon className="h-3.5 w-3.5" />
                    {f.badge}
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-ink tracking-tight mb-3">
                    {f.title}
                  </h2>
                  <p className="text-sm text-ink-light leading-relaxed mb-5">
                    {f.description}
                  </p>
                  <ul className="space-y-2.5">
                    {f.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-center gap-2.5 text-sm text-ink-light"
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
                      className={`glass rounded-2xl p-1.5 border ${f.accentBorder}`}
                    >
                      <img
                        src={f.image}
                        alt={f.title}
                        className="w-full rounded-xl"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div
                      className={`glass rounded-2xl p-8 ${f.accentBorder} border min-h-[280px] flex items-center justify-center`}
                    >
                      <div className="text-center">
                        <div
                          className={`inline-flex items-center justify-center h-16 w-16 rounded-2xl ${f.bg} ${f.color} mb-4`}
                        >
                          <f.icon className="h-8 w-8" />
                        </div>
                        <p className="text-sm text-ink-faint font-medium">
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
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {extraModules.map((m, i) => (
            <ScrollReveal key={m.title} delay={i * 0.06}>
              <div className="glass rounded-2xl p-6 h-full">
                <m.icon className="h-5 w-5 text-ink-light mb-3" />
                <h4 className="text-sm font-semibold text-ink mb-1">
                  {m.title}
                </h4>
                <p className="text-xs text-ink-light leading-relaxed">
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
