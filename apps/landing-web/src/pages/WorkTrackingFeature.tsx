import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  ArrowLeft, 
  Check, 
  Users, 
  Clock, 
  Tag, 
  Paperclip,
  ArrowRight
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { CTABanner } from '../components/landing/CTABanner';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';

export function WorkTrackingFeature() {
  useDocumentMetadata({
    title: 'Work Tracking & Task Flow',
    description: 'Coordinate your team operations on lightweight Kanban boards designed for team speed and absolute transparency.',
    canonicalPath: '/features/work-tracking'
  });

  const { navigate } = useNavigation();

  return (
    <div className="pt-32 pb-8 relative overflow-hidden bg-slate-50/20 grid-pattern">
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none animate-drift" />
      <div className="absolute top-[40%] right-[5%] w-[450px] h-[450px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none animate-drift-reverse" />

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
              Work Tracking <br/>
              <span className="text-gradient">& Task Flow</span>
            </h1>
            <p className="text-slate-500 text-sm md:text-base font-semibold leading-relaxed">
              Ditch scattered messages and disorganized spreadsheets. Coordinate your operations on lightweight Kanban boards designed for team speed and absolute transparency.
            </p>

            <div className="flex flex-col gap-3.5 pt-2">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Centralize all tasks, checklists, and owners</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Instant updates across drag and drop columns</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Audit logs and comment threads on every card</span>
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
                src="/work_tracking.png" 
                alt="Work Tracking Kanban Board Mockup" 
                className="w-full h-auto rounded-2xl border border-slate-100/50 shadow-sm"
              />
            </motion.div>
          </div>
        </div>

        {/* Detailed Features Deep Dive */}
        <div className="mb-24">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Uncompromising Clarity for Every Task
            </h2>
            <p className="mt-3 text-slate-500 text-xs font-semibold leading-relaxed">
              Every card on your board acts as a secure container for task specifications, preventing execution errors and maintaining accountability.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1: Kanban */}
            <div className="glass rounded-3xl p-8 border border-white/50 hover:scale-[1.02] hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-11 w-11 rounded-2xl bg-indigo-50 border border-indigo-100/75 flex items-center justify-center text-indigo-600 mb-6 shadow-sm">
                  <LayoutDashboard className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Structured Kanban Boards</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                  Maintain a clean high-level view of projects. Drag and drop operations tasks from 'To Do' to 'In Progress' and 'Done' to align team coordinators instantly.
                </p>
              </div>
              <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Custom column workflows
                </li>
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Visual subtask checklists
                </li>
              </ul>
            </div>

            {/* Card 2: Ownership */}
            <div className="glass rounded-3xl p-8 border border-white/50 hover:scale-[1.02] hover:-translate-y-1 hover:border-cyan-200 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-11 w-11 rounded-2xl bg-cyan-50 border border-cyan-100/75 flex items-center justify-center text-cyan-600 mb-6 shadow-sm">
                  <Users className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Assign Owners & Roles</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                  Ensure every operation has a clear lead. Assign ownership to department coordinators to establish distinct channels of accountability across tasks.
                </p>
              </div>
              <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  Multiple co-assignees support
                </li>
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  Role based activity locks
                </li>
              </ul>
            </div>

            {/* Card 3: Deadlines & Triage */}
            <div className="glass rounded-3xl p-8 border border-white/50 hover:scale-[1.02] hover:-translate-y-1 hover:border-rose-200 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-11 w-11 rounded-2xl bg-rose-50 border border-rose-100/75 flex items-center justify-center text-rose-600 mb-6 shadow-sm">
                  <Clock className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Due Dates & Priority Triage</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                  Keep projects on course. Apply custom tags for high, medium, and low priorities, and set strict calendar deadlines to notify coordinators before tasks fall behind.
                </p>
              </div>
              <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Overdue highlights & notifications
                </li>
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Filter by priority tag
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Centralized audit logs section */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-150/70 shadow-sm mb-20 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-[200px] h-[200px] bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />
          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/30">
                Operational Compliance
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Auditable Task Trails
              </h2>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Every update, comment, and attachment is logged into a secure history. Resolve issues in the comment threads, and drag-and-drop file receipts or layouts directly onto task tickets for reference.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 pt-2">
                <div className="flex gap-2 items-center text-xs font-bold text-slate-700">
                  <Tag className="h-4 w-4 text-indigo-500" />
                  <span>Category Tags</span>
                </div>
                <div className="flex gap-2 items-center text-xs font-bold text-slate-700">
                  <Paperclip className="h-4 w-4 text-indigo-500" />
                  <span>Attachment Catalogs</span>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-100/80 space-y-3 shadow-inner">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Auditable Activity Log</span>
              
              <div className="space-y-3 text-[11px] font-semibold text-slate-500">
                <div className="flex items-start gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">Sarah J.</span> created task "Warehouse Audit"
                    <p className="text-[9px] text-slate-400 mt-0.5">Today at 10:15 AM</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">Marcus Lee</span> uploaded "Safety_Protocol.pdf"
                    <p className="text-[9px] text-slate-400 mt-0.5">Today at 11:30 AM</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">Sarah J.</span> assigned task to <span className="font-bold text-indigo-600">@marcus</span>
                    <p className="text-[9px] text-slate-400 mt-0.5">Today at 11:32 AM</p>
                  </div>
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
