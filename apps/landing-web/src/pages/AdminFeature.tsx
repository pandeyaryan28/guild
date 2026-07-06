import { motion } from 'motion/react';
import { 
  Users, 
  Briefcase, 
  Clock, 
  ArrowLeft, 
  Check, 
  AlertTriangle, 
  UserCheck, 
  TrendingUp,
  Sliders
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { CTABanner } from '../components/landing/CTABanner';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';

export function AdminFeature() {
  useDocumentMetadata({
    title: 'Admin Console & Workload Allotment',
    description: 'Track member task allocation, project and goal health, overdue items, and manage secure workspace roles and invite links.',
    canonicalPath: '/features/admin-console'
  });

  const { navigate } = useNavigation();

  return (
    <div className="pt-32 pb-8 relative overflow-hidden bg-slate-50/20 grid-pattern">
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none animate-drift" />
      <div className="absolute top-[40%] right-[5%] w-[450px] h-[450px] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none animate-drift-reverse" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        {/* Back navigation */}
        <button
          onClick={() => navigate('/features')}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-indigo-600 transition-colors mb-12 cursor-pointer group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to all features
        </button>

        {/* Top Split Hero Section */}
        <div className="grid lg:grid-cols-12 gap-12 items-center mb-24">
          {/* Left Text Column */}
          <div className="lg:col-span-5 space-y-6">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Admin Portal & <br/>
              <span className="text-gradient">Operations Hub</span>
            </h1>
            <p className="text-slate-500 text-sm md:text-base font-semibold leading-relaxed">
              Empower founders, managers, and directors with complete administrative visibility. Monitor member allocations, track project health, and unblock overdue tasks.
            </p>

            <div className="flex flex-col gap-3.5 pt-2">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Track team workloads and balance allocations</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Audit project completion logs and goals</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Reassign and triage overdue tasks directly</span>
              </div>
            </div>
          </div>

          {/* Right Image/Graphic Column */}
          <div className="lg:col-span-7 relative">
            {/* Visual Frame */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="relative z-10 bg-white/20 dark-glass rounded-3xl p-3 shadow-2xl border border-white/60"
            >
              <img 
                src="/admin_console.png" 
                alt="Admin Console Operations Dashboard Mockup" 
                className="w-full h-auto rounded-2xl border border-slate-100/50 shadow-sm"
              />
            </motion.div>
          </div>
        </div>

        {/* Detailed Features Deep Dive */}
        <div className="mb-24">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Three Pillars of Administrative Command
            </h2>
            <p className="mt-3 text-slate-500 text-xs font-semibold leading-relaxed">
              Unify team context. Access real-time intelligence feeds to balance workloads, protect project health, and unblock bottlenecks.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1: Workload */}
            <div className="glass rounded-3xl p-8 border border-white/50 hover:scale-[1.02] hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-11 w-11 rounded-2xl bg-indigo-50 border border-indigo-100/75 flex items-center justify-center text-indigo-600 mb-6 shadow-sm">
                  <Users className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Workload Allotment</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                  Check team capacity ratios. Spot which coordinators are fully allotted, who has availability (underloaded), and balance operational task assignments to avoid team burnout.
                </p>
              </div>
              <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Capacity ratios checks
                </li>
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Assignee filters & load balancing
                </li>
              </ul>
            </div>

            {/* Card 2: Health */}
            <div className="glass rounded-3xl p-8 border border-white/50 hover:scale-[1.02] hover:-translate-y-1 hover:border-emerald-250 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-11 w-11 rounded-2xl bg-emerald-50 border border-emerald-100/75 flex items-center justify-center text-emerald-600 mb-6 shadow-sm">
                  <Briefcase className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Project Health Tracking</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                  Track completion progress. Instantly check if active workspace projects and team goals are on-track, delayed, or completed to maintain total business momentum.
                </p>
              </div>
              <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Visual progress completion bars
                </li>
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Delayed and At-Risk alerts
                </li>
              </ul>
            </div>

            {/* Card 3: Overdue Triage */}
            <div className="glass rounded-3xl p-8 border border-white/50 hover:scale-[1.02] hover:-translate-y-1 hover:border-rose-200 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-11 w-11 rounded-2xl bg-rose-50 border border-rose-100/75 flex items-center justify-center text-rose-600 mb-6 shadow-sm">
                  <Clock className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Overdue Task Triage</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                  Resolve operational blockers. Get a clear overview of overdue tasks by team member and department, detailing exactly how many days late they are to target delay points.
                </p>
              </div>
              <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Days-late details indicators
                </li>
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Direct owner ping integrations
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Workspace Security & Management */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-150/70 shadow-sm mb-20 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-[200px] h-[200px] bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />
          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/30">
                Workspace Security
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Invite Link & Onboarding Management
              </h2>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                As a workspace administrator, easily configure global settings. Control onboarding security by generating invite links, resetting active credentials, or disabling links entirely.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 pt-2 font-sans text-xs font-bold text-slate-700">
                <div className="flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-indigo-500" />
                  <span>Global admin settings</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  <span>Interactive completion stats</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-100/80 space-y-3 shadow-inner">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Security Settings console</span>
              
              <div className="space-y-3.5 text-xs font-bold">
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-150/60 shadow-sm">
                  <div>
                    <p className="text-slate-800">Global Invite Link</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Active • Reset 2d ago</p>
                  </div>
                  <span className="text-[9px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">Reset Link</span>
                </div>
                
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-150/60 shadow-sm">
                  <div>
                    <p className="text-slate-800">Onboarding Security</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Admin approval required</p>
                  </div>
                  <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">Enabled</span>
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
