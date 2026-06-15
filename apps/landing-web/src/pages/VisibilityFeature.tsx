import { motion } from 'motion/react';
import { LayoutDashboard, FolderOpen, ArrowLeft, Check, Sparkles, Files } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { CTABanner } from '../components/landing/CTABanner';

export function VisibilityFeature() {
  const { navigate } = useNavigation();

  return (
    <div className="pt-32 pb-8 relative overflow-hidden bg-slate-50/20 grid-pattern">
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-rose-500/5 blur-[90px] pointer-events-none animate-drift" />
      <div className="absolute top-[40%] right-[5%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none animate-drift-reverse" />

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
            Visibility & Shared Files
          </h1>
          <p className="mt-4 text-slate-500 text-base md:text-lg font-medium leading-relaxed">
            A single source of truth for operations. Centralize your daily dashboards, recent activities, and uploaded team files.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch mb-20">
          
          {/* Card 1: Dashboard */}
          <div className="glass rounded-3xl p-8 border border-indigo-50/50 flex flex-col justify-between hover:scale-[1.005] transition-all shadow-sm">
            <div>
              <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-6">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Central Operations Dashboard</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                Never lose track of your work again. Get an aggregated view of your assigned tasks, pending leave or purchase approvals, and active DMs in a single page.
              </p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] font-bold text-slate-500 space-y-1">
              <p className="text-slate-800">✓ Your Open Tasks: 4</p>
              <p className="text-slate-800">⏳ Awaiting Sign-off: 2</p>
            </div>
          </div>

          {/* Card 2: Shared Files */}
          <div className="glass rounded-3xl p-8 border border-indigo-50/50 flex flex-col justify-between hover:scale-[1.005] transition-all shadow-sm">
            <div>
              <div className="h-10 w-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-6">
                <FolderOpen className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Centralized File Directory</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                Any file uploaded inside DMs, channel chats, or task logs is automatically organized inside the central shared files folder. Easily search and download operational assets.
              </p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] font-bold text-slate-500 flex items-center gap-2">
              <Files className="h-4 w-4 text-rose-500" />
              <span>Q3_Logistics_Budget.xlsx • 1.4 MB</span>
            </div>
          </div>

        </div>

        {/* Feature Deep Dive details */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-150/70 shadow-sm mb-16">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-8 tracking-tight">
            Centralized Asset Management
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-sm font-semibold text-slate-600">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">Recent Activity Feeds</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Track updates across channels and task logs in real-time, boosting visibility.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">Attachment Previews</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    View images and standard files directly in-app without downloading them first.
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
                  <h4 className="text-slate-900 font-bold text-xs">Quick Action Workflows</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Submit leave requests or log a task directly from dashboard quick action widgets.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">Indexed File Search</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Search uploaded files instantly using PostgreSQL full-text search.
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
