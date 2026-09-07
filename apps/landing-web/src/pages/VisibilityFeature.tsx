import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Clock, 
  ArrowLeft, 
  Check, 
  MessageSquare, 
  Search, 
  Eye, 
  TrendingUp 
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { CTABanner } from '../components/landing/CTABanner';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';

export function VisibilityFeature() {
  useDocumentMetadata({
    title: 'Visibility & Dashboards',
    description: 'Get real time updates and full overview dashboards showing what tasks are in progress, what needs review, and team activity feeds.',
    canonicalPath: '/features/visibility'
  });

  const { navigate } = useNavigation();

  return (
    <div className="pt-32 pb-8 relative overflow-hidden bg-slate-50/20 grid-pattern">
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-rose-500/5 blur-[100px] pointer-events-none animate-drift" />
      <div className="absolute top-[40%] right-[5%] w-[450px] h-[450px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none animate-drift-reverse" />

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
              Central Dashboards & <br/>
              <span className="text-gradient">Activity Feeds</span>
            </h1>
            <p className="text-slate-500 text-sm md:text-base font-semibold leading-relaxed">
              Unify team operations. Access daily task feeds, view personal dashboards, and search through global chat histories in a centralized visibility layer.
            </p>

            <div className="flex flex-col gap-3.5 pt-2">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Centralized personal dashboards for active tasks</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Real time feeds tracking status updates and changes</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Database indexed full text search for quick access</span>
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
                src="/visibility.png" 
                alt="Visibility Layer & Dashboard Mockup" 
                className="w-full h-auto rounded-2xl border border-slate-100/50 shadow-sm"
              />
            </motion.div>
          </div>
        </div>

        {/* Detailed Features Deep Dive */}
        <div className="mb-24">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              A Single Source of Truth
            </h2>
            <p className="mt-3 text-slate-500 text-xs font-semibold leading-relaxed">
              Unify team context. Keep assets organized automatically, eliminating time wasted looking for files across threads.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1: Dashboard */}
            <div className="glass rounded-3xl p-8 border border-white/50 hover:scale-[1.02] hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-11 w-11 rounded-2xl bg-indigo-50 border border-indigo-100/75 flex items-center justify-center text-indigo-600 mb-6 shadow-sm">
                  <LayoutDashboard className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Centralized Operations Hub</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                  Access your personal workspace feed. Review assigned tasks, view pending approval statuses, and read updates on target project deadlines on a single page.
                </p>
              </div>
              <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Personal task indexes
                </li>
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Recent activity streams
                </li>
              </ul>
            </div>

            {/* Card 2: Activity Feeds */}
            <div className="glass rounded-3xl p-8 border border-white/50 hover:scale-[1.02] hover:-translate-y-1 hover:border-rose-200 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-11 w-11 rounded-2xl bg-rose-50 border border-rose-100/75 flex items-center justify-center text-rose-600 mb-6 shadow-sm">
                  <Clock className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Personal Activity Feeds</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                  Never miss an update. A customized activity log tracks status changes, comments, and task creation across all channels, giving you a quick summary of what happened while you were away.
                </p>
              </div>
              <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Chronological status history
                </li>
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Filter updates by channel or project
                </li>
              </ul>
            </div>

            {/* Card 3: Indexed Search */}
            <div className="glass rounded-3xl p-8 border border-white/50 hover:scale-[1.02] hover:-translate-y-1 hover:border-cyan-200 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-11 w-11 rounded-2xl bg-cyan-50 border border-cyan-100/75 flex items-center justify-center text-cyan-600 mb-6 shadow-sm">
                  <Search className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Full Text Indexed Search</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                  Retrieve updates in seconds. Query task names, check comment contents, or search through chat logs and task descriptions using indexed search.
                </p>
              </div>
              <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  Indexed database query matching
                </li>
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  Cross category result filtering
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Detailed Search Preview */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-150/70 shadow-sm mb-20 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-[200px] h-[200px] bg-rose-50/50 rounded-full blur-3xl pointer-events-none" />
          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100/30">
                Data Indexing
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Universal Search Capabilities
              </h2>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                By indexing all text metadata, Guild Orbit makes it easy to find specific tasks or comments. Type a keyword like "budget" and instantly see task descriptions, chat comments, and approvals.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 pt-2 font-sans text-xs font-bold text-slate-700">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-rose-500" />
                  <span>Immediate comment previews</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-rose-500" />
                  <span>Fast database response</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 bg-slate-50 p-5.5 rounded-2xl border border-slate-100/80 space-y-3 shadow-inner">
              <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200/80 rounded-xl shadow-sm text-xs font-bold text-slate-800">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <span>budget</span>
              </div>
              
              <div className="space-y-2 text-[10px] font-bold">
                <div className="flex items-center justify-between bg-rose-50/50 text-rose-700 border border-rose-100/50 p-2 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-rose-500" />
                    <span>"Let's finalize the Q3 logistics budget"</span>
                  </div>
                  <span className="text-[9px] text-slate-400">Chat Log</span>
                </div>
                
                <div className="flex items-center justify-between bg-slate-100/50 text-slate-700 border border-slate-200/50 p-2 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-slate-500" />
                    <span>Task: "Finalize operations budget"</span>
                  </div>
                  <span className="text-[9px] text-slate-400">Tasks Board</span>
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
