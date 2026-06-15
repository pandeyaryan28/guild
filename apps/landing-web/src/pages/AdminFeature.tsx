import { motion } from 'motion/react';
import { 
  Shield, 
  Users, 
  Briefcase, 
  Clock, 
  CheckSquare, 
  FileCheck, 
  ArrowLeft, 
  Check, 
  AlertTriangle, 
  UserCheck, 
  TrendingUp,
  Percent
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { CTABanner } from '../components/landing/CTABanner';

export function AdminFeature() {
  const { navigate } = useNavigation();

  return (
    <div className="pt-32 pb-8 relative overflow-hidden bg-slate-50/20 grid-pattern">
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[90px] pointer-events-none animate-drift" />
      <div className="absolute top-[40%] right-[5%] w-[400px] h-[400px] rounded-full bg-indigo-600/5 blur-[100px] pointer-events-none animate-drift-reverse" />

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
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50/80 border border-indigo-100/50 px-3 py-1.5 rounded-full mb-4 glass">
            Guild Orbit Premium Feature
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight font-sans">
            Admin Portal & Operational Visibility
          </h1>
          <p className="mt-4 text-slate-500 text-base md:text-lg font-medium leading-relaxed">
            Empower founders, managers, and business owners with a unified operations control center. Monitor workloads, project health, and bottlenecked tasks in real-time.
          </p>
        </div>

        {/* Main Grid: Core Admin Pillars */}
        <div className="grid md:grid-cols-3 gap-6 items-stretch mb-16">
          
          {/* Card 1: Resource Allotment */}
          <div className="glass rounded-3xl p-7 border border-indigo-50/50 flex flex-col justify-between hover:scale-[1.005] transition-all shadow-sm">
            <div>
              <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-6">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-3">Workload Allotment</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                Keep workloads balanced. Easily track who is fully loaded, who has availability (underloaded), and who is ready to be assigned new work.
              </p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-[10px] font-bold">
              <div className="flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-1"><UserCheck className="h-3 w-3 text-emerald-500" /> Sarah J.</span>
                <span className="text-slate-400">Allotted (3 Tasks)</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-1"><UserCheck className="h-3 w-3 text-amber-500" /> Alex R.</span>
                <span className="text-indigo-600">Underloaded (1 Task)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Project Health */}
          <div className="glass rounded-3xl p-7 border border-indigo-50/50 flex flex-col justify-between hover:scale-[1.005] transition-all shadow-sm">
            <div>
              <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-6">
                <Briefcase className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-3">Project Health Tracking</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                Track status and completion rates. Instantly check if projects and goals are on-track, delayed, or completed in a single visibility layer.
              </p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-[10px] font-bold">
              <div className="flex justify-between items-center text-slate-700">
                <span>Q3 Logistics System</span>
                <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[8px]">On Track</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Website Revamp</span>
                <span className="text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[8px]">Delayed</span>
              </div>
            </div>
          </div>

          {/* Card 3: Overdue Triage */}
          <div className="glass rounded-3xl p-7 border border-indigo-50/50 flex flex-col justify-between hover:scale-[1.005] transition-all shadow-sm">
            <div>
              <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-6">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-3">Overdue Task Triage</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                Unblock bottlenecks. Get a clear overview of overdue tasks by member and team, detailing exactly how many days late they are.
              </p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-[10px] font-bold">
              <div className="flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> Logistics Team</span>
                <span className="text-rose-600">3 Overdue Tasks</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> Marcus C.</span>
                <span className="text-rose-600">1 Task (2d late)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Feature Deep Dive details */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-150/70 shadow-sm mb-16">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-8 tracking-tight">
            Advanced Workspace Administrative Controls
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-sm font-semibold text-slate-600">
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">Capacity Optimization</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Filter and audit workspace members. Track their active/inactive task ratios, allowing managers to allocate tasks effectively.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">Unified Completion Metrics</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    View team-wide and organization-wide completion rates for tasks and company goals over customizable time ranges (30 days, 60 days, etc.).
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">Secure Invite Link Management</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Easily generate, reset, or completely disable global invite links to control workspace onboarding security.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">Integrated Approval Inbox</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Map leave and purchase approvals in a single queue. Search, filter by assignee, and approve/reject with contextual feedback comments.
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
