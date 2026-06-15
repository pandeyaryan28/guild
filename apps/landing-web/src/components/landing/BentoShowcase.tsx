import { Zap, Search, Shield, Users, FileCheck, Folder, ArrowRight } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

export function BentoShowcase() {
  return (
    <section className="px-6 py-24 relative bg-slate-50/10">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
              Engineered for Visual Clarity
            </h2>
            <p className="mt-4 text-slate-500 text-base md:text-lg font-medium max-w-xl mx-auto">
              Shatter team silos. Access tasks, team chats, approvals, and shared documents in a single structured workspace.
            </p>
          </div>
        </ScrollReveal>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Large Department View (Work Management) */}
          <ScrollReveal className="md:col-span-2">
            <div className="glass rounded-3xl p-6.5 hover:scale-[1.01] transition-all duration-300 border-indigo-50/50 shadow-md h-full flex flex-col justify-between min-h-[300px]">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/30">
                  Workspace Structure
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-4 tracking-tight">
                  Organized by Departments
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-2 max-w-md">
                  Segment your team into dedicated departments (like Operations, Logistics, or Marketing) to target chat channels and restrict task permissions.
                </p>
              </div>

              {/* Visual Demo List */}
              <div className="mt-6 space-y-2.5 bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100/50 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <span>#operations</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-400">
                    <span>14 Members</span>
                    <span>•</span>
                    <span className="text-indigo-600">8 Active Tasks</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100/50 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-lg bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <span>#logistics-delivery</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-400">
                    <span>8 Members</span>
                    <span>•</span>
                    <span className="text-cyan-600">5 Active Tasks</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 2: Instant Setup */}
          <ScrollReveal>
            <div className="glass rounded-3xl p-6.5 hover:scale-[1.01] transition-all duration-300 border-indigo-50/50 shadow-md h-full flex flex-col justify-between min-h-[300px]">
              <div>
                <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mb-4">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Instant Onboarding
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-2 leading-relaxed">
                  No complex setup. Create a workspace, key in your team details, and generate invites. Your dashboard and channels are ready in under 5 minutes.
                </p>
              </div>

              <div className="mt-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="space-y-2 text-[11px] font-bold text-slate-500">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <div className="h-4.5 w-4.5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-extrabold">1</div>
                    <span>Create workspace profile</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-600">
                    <div className="h-4.5 w-4.5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-extrabold">2</div>
                    <span>Map core departments</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-400">
                    <div className="h-4.5 w-4.5 rounded-full bg-slate-200 text-[9px] font-extrabold text-slate-500">3</div>
                    <span>Share quick-invite links</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 3: Global search */}
          <ScrollReveal>
            <div className="glass rounded-3xl p-6.5 hover:scale-[1.01] transition-all duration-300 border-indigo-50/50 shadow-md h-full flex flex-col justify-between min-h-[300px]">
              <div>
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-4">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Unified Search
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-2 leading-relaxed">
                  Search across task names, comments, chat histories, and shared filenames instantly using our indexed database search.
                </p>
              </div>

              {/* Simulated Search Dropdown */}
              <div className="mt-6 bg-white p-3 rounded-2xl border border-slate-150/80 shadow-sm text-xs font-semibold text-slate-400">
                <div className="border border-slate-100 rounded-lg px-2 py-1.5 flex items-center gap-1.5 bg-slate-50 mb-2">
                  <Search className="h-3 w-3" />
                  <span className="text-[10px]">invoice</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-md text-[10px] text-slate-700 font-bold">
                    <Folder className="h-3 w-3 text-amber-500" /> Q3_Invoice.pdf
                  </div>
                  <div className="flex items-center gap-1.5 p-1 text-[10px] text-slate-500">
                    <Users className="h-3 w-3 text-cyan-500" /> chat: "...invoice paid today"
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 4: Auditable approvals & security */}
          <ScrollReveal className="md:col-span-2">
            <div className="glass rounded-3xl p-6.5 hover:scale-[1.01] transition-all duration-300 border-indigo-50/50 shadow-md h-full flex flex-col justify-between min-h-[300px]">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-500 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100/30">
                  Compliance & Security
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-4 tracking-tight">
                  Auditable Sign-off Trails
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-2 max-w-md">
                  Keep records of every administrative approval, leave request, and purchase sign-off. All transactions are logged and encrypted at the workspace level for safety.
                </p>
              </div>

              {/* Simulated Audits log */}
              <div className="mt-6 space-y-2 bg-slate-50/80 rounded-2xl p-4 border border-slate-100 text-[10.5px] font-semibold text-slate-500">
                <div className="flex items-center justify-between border-b border-slate-150/40 pb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-slate-800 font-bold">Purchase Approved</span>
                  </div>
                  <span>Marcus Chen approved by Sarah J. • 2m ago</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-slate-800 font-bold">Permissions Updated</span>
                  </div>
                  <span>System: Admin changed role for Alex R. • 1h ago</span>
                </div>
              </div>
            </div>
          </ScrollReveal>


        </div>
      </div>
    </section>
  );
}

