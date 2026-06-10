import React from 'react';
import { motion } from 'motion/react';
import { Eye, Shield, Target, ArrowRight, X, Check } from 'lucide-react';
import { APP_URL } from '../config/landingData';

export function Solutions() {
  return (
    <div className="pt-28 pb-16 px-6 max-w-[1100px] mx-auto space-y-28">
      {/* Header */}
      <section className="text-center max-w-[750px] mx-auto space-y-4">
        <h1 className="text-4xl md:text-5xl font-black text-text-primary tracking-tight uppercase">
          Tailored Operations Workflows
        </h1>
        <p className="text-sm md:text-base text-text-secondary font-medium leading-relaxed">
          See how Guild Orbit restores synchronization and visibility across different company functions and roles.
        </p>
      </section>

      {/* Before / After: Chaos vs. Clarity Comparison */}
      <section className="space-y-12">
        <div className="text-center">
          <h2 className="text-xl md:text-2.5xl font-black text-text-primary uppercase tracking-tight">
            The Operational Shift
          </h2>
          <p className="text-xs text-text-secondary font-semibold mt-1">
            Compare fragmented messaging setups with a consolidated workspace.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-[960px] mx-auto">
          {/* Chaos: Fragmented Tools */}
          <div className="aether-glass border border-red-200 bg-red-50/5 p-8 rounded-[24px] space-y-6">
            <div className="flex items-center gap-2 border-b border-red-100 pb-4">
              <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
              <h3 className="text-xs font-black uppercase text-red-600 tracking-wider">Traditional Chaos: Scattered Tools</h3>
            </div>
            
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-xs text-text-secondary font-medium leading-relaxed">
                <X className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                <span><strong>WhatsApp Chat Grids</strong>: Team directives get buried under casual messaging, leaving tasks unacknowledged.</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-text-secondary font-medium leading-relaxed">
                <X className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                <span><strong>Excel Sheet Inaccuracies</strong>: File locks and multiple versions lead to outdated status updates and missing logs.</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-text-secondary font-medium leading-relaxed">
                <X className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                <span><strong>Fragmented Email Approvals</strong>: Reimbursements and leave applications wait in folders for manager reviews.</span>
              </li>
            </ul>
          </div>

          {/* Clarity: Guild Orbit */}
          <div className="aether-glass border border-emerald-200 bg-emerald-50/5 p-8 rounded-[24px] space-y-6">
            <div className="flex items-center gap-2 border-b border-emerald-100 pb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <h3 className="text-xs font-black uppercase text-emerald-600 tracking-wider">Guild Orbit: Unified Workspace</h3>
            </div>
            
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-xs text-text-secondary font-medium leading-relaxed">
                <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Context-driven channels</strong>: Communication feeds directly into Kanban boards to prevent context loss.</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-text-secondary font-medium leading-relaxed">
                <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Real-time Task Boards</strong>: A single source of truth shows exactly who is completing what in real time.</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-text-secondary font-medium leading-relaxed">
                <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Click-to-approve Forms</strong>: Structured request templates route to managers for one-click approval.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Target Audiences Breakdown */}
      <section className="space-y-12">
        <h2 className="text-xl md:text-2.5xl font-black text-text-primary text-center uppercase tracking-tight">
          Value by Organizational Role
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Owners/Founders */}
          <div className="aether-glass p-8 space-y-4">
            <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Eye className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-black uppercase text-text-primary tracking-wide">For Business Owners</h3>
            <p className="text-xs text-text-secondary leading-relaxed font-medium">
              Obtain real-time visibility into overall company operations. Monitor completed tasks, approve expenses, and stay synced with team progress without micro-managing or schedule constant check-ins.
            </p>
          </div>

          {/* Operations Managers */}
          <div className="aether-glass p-8 space-y-4">
            <div className="h-10 w-10 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center">
              <Target className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-black uppercase text-text-primary tracking-wide">For Operations Managers</h3>
            <p className="text-xs text-text-secondary leading-relaxed font-medium">
              Maintain project execution, assign tasks, review approvals, and coordinate team dependencies in structured chat channels. Drive workflow throughput while eliminating daily email trails.
            </p>
          </div>

          {/* Individual Employees */}
          <div className="aether-glass p-8 space-y-4">
            <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-black uppercase text-text-primary tracking-wide">For Team Members</h3>
            <p className="text-xs text-text-secondary leading-relaxed font-medium">
              Enjoy a clean, distraction-free coordination environment. Receive clear tasks, upload deliverables, and submit leave requests directly inside the team dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="text-center pt-8">
        <a 
          href={`${APP_URL}/signup`} 
          className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-md active:scale-98"
        >
          Create Your Workspace
          <ArrowRight className="h-4.5 w-4.5" />
        </a>
      </section>
    </div>
  );
}
