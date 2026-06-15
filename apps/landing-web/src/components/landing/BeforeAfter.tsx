import { X, Check, ArrowRight, Activity, MessageSquare, FileText, CheckCircle2 } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

const chaosPoints = [
  { text: 'Scattered WhatsApp & DM chats', detail: 'Crucial decisions get lost in casual threads and are impossible to audit.' },
  { text: 'Messy spreadsheets for task tracking', detail: 'Out-of-sync files lead to missed deadlines and poor accountability.' },
  { text: 'Formal approvals stuck in email trails', detail: 'Leave applications and purchase requests take days to get signed off.' },
  { text: 'Zero centralized visibility', detail: 'Founders and managers spend hours asking "what is the status of X?".' },
];

const orbitPoints = [
  { icon: MessageSquare, text: 'Context-first communication', detail: 'Dedicated channels tied directly to department workflows.' },
  { icon: CheckCircle2, text: 'Real-time Kanban task boards', detail: 'Clear assignees, priorities, and instant comment history.' },
  { icon: FileText, text: 'One-click operational sign-offs', detail: 'Leave, expenses, and purchase requests approved instantly.' },
  { icon: Activity, text: 'Unified dashboard feeds', detail: 'At-a-glance view of open approvals, tasks, and recent conversations.' },
];

export function BeforeAfter() {
  return (
    <section className="px-6 py-24 relative overflow-hidden bg-slate-50/10">
      {/* Background radial glows */}
      <div className="absolute top-[30%] left-[-10%] w-[350px] h-[350px] rounded-full bg-rose-500/[0.02] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[380px] h-[380px] rounded-full bg-emerald-500/[0.02] blur-[110px] pointer-events-none" />

      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
              The Operational Shift
            </h2>
            <p className="mt-4 text-slate-500 text-base md:text-lg font-medium max-w-xl mx-auto">
              Upgrade your team coordinate systems from scattered, offline chaos to a single unified workflow.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          {/* Left: The Chaos */}
          <ScrollReveal delay={0.08} className="h-full">
            <div className="glass rounded-3xl p-8 border border-rose-500/10 h-full shadow-lg shadow-rose-500/[0.01] hover:scale-[1.005] transition-transform duration-300 flex flex-col">
              <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-rose-100/50">
                <span className="h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="text-xs font-extrabold text-rose-600 uppercase tracking-widest">
                  The Scattered Chaos
                </h3>
              </div>
              
              <div className="space-y-6 flex-grow">
                {chaosPoints.map((item) => (
                  <div key={item.text} className="flex gap-3.5">
                    <div className="h-6 w-6 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="h-3.5 w-3.5 text-rose-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 leading-snug">
                        {item.text}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Right: Guild Orbit */}
          <ScrollReveal delay={0.16} className="h-full">
            <div className="glass rounded-3xl p-8 border border-emerald-500/10 h-full shadow-lg shadow-emerald-500/[0.01] hover:scale-[1.005] transition-transform duration-300 flex flex-col">
              <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-emerald-100/50">
                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest">
                  The Guild Orbit Calm
                </h3>
              </div>

              <div className="space-y-6 flex-grow">
                {orbitPoints.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.text} className="flex gap-3.5">
                      <div className="h-6.5 w-6.5 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 leading-snug">
                          {item.text}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-semibold mt-1 leading-relaxed">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
