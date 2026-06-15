import { motion } from 'motion/react';
import { CheckSquare, LayoutDashboard, MessageSquare, Clock, ArrowLeft, Sparkles, Check } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { CTABanner } from '../components/landing/CTABanner';

export function WorkTrackingFeature() {
  const { navigate } = useNavigation();

  return (
    <div className="pt-32 pb-8 relative overflow-hidden bg-slate-50/20 grid-pattern">
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[90px] pointer-events-none animate-drift" />
      <div className="absolute top-[40%] right-[5%] w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none animate-drift-reverse" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        {/* Back navigation */}
        <button
          onClick={() => navigate('/features')}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-8 cursor-pointer group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to all features
        </button>

        {/* Hero header */}
        <div className="max-w-3xl mb-16">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight font-sans">
            Work Tracking & Task Management
          </h1>
          <p className="mt-4 text-slate-500 text-base md:text-lg font-medium leading-relaxed">
            Eliminate loose paper trails and scattered spreadsheets. Assign owners, set priorities, and track operations using lightweight Kanban boards and task lists.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch mb-20">
          
          {/* Card 1: Kanban Board */}
          <div className="glass rounded-3xl p-8 border border-indigo-50/50 flex flex-col justify-between hover:scale-[1.005] transition-all shadow-sm">
            <div>
              <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-6">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Visual Kanban Boards</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                View your team's workload at-a-glance. Drag-and-drop tasks across custom columns (like To Do, In Progress, and Done) to ensure absolute transparency on operational progress.
              </p>
            </div>
            
            {/* Visual indicator */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] font-bold text-slate-500 space-y-2">
              <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                <span>Forklift safety inspection</span>
                <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100">High</span>
              </div>
              <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                <span>Update operations protocol</span>
                <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100">Medium</span>
              </div>
            </div>
          </div>

          {/* Card 2: Details & Comments */}
          <div className="glass rounded-3xl p-8 border border-indigo-50/50 flex flex-col justify-between hover:scale-[1.005] transition-all shadow-sm">
            <div>
              <div className="h-10 w-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-6">
                <CheckSquare className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Auditable Task Logs</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                Every task card is a centralized log containing ownership details, target due dates, attachment history, and comment threads. Resolve issues directly on the task context.
              </p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] font-semibold text-slate-500 space-y-2">
              <p className="border-b border-slate-200/60 pb-1.5 font-bold text-slate-700">Recent Comments</p>
              <p className="text-slate-600"><span className="font-bold text-slate-800">Sarah J:</span> Invoice added. Ready to procure.</p>
              <p className="text-slate-600"><span className="font-bold text-slate-800">Marcus C:</span> Picking up supplies at 2pm.</p>
            </div>
          </div>

        </div>

        {/* Feature Deep Dive details */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-150/70 shadow-sm mb-16">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-8 tracking-tight">
            Comprehensive Task Capabilities
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-sm font-semibold text-slate-600">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">Assign Owners</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Delegate tasks to specific department members to set clear accountability.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">Due Dates & Deadlines</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Set precise calendar due dates to organize timelines and avoid execution delays.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">Priority Triage</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Sort tasks by High, Medium, or Low priority badges to tackle bottlenecks first.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">Unified File Attachments</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Attach receipts, schedules, or layout mockups directly to task tickets for visual clarity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      <CTABanner />
    </div>
  );
}
