import { motion } from 'motion/react';
import { 
  FileCheck, 
  Clock, 
  ArrowLeft, 
  Check, 
  DollarSign, 
  ShieldCheck, 
  AlertCircle
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { CTABanner } from '../components/landing/CTABanner';

export function ApprovalsFeature() {
  const { navigate } = useNavigation();

  return (
    <div className="pt-32 pb-8 relative overflow-hidden bg-slate-50/20 grid-pattern">
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none animate-drift" />
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
              Requests & <br/>
              <span className="text-gradient">Approvals Log</span>
            </h1>
            <p className="text-slate-500 text-sm md:text-base font-semibold leading-relaxed">
              Standardize administrative requests. Review expense quotes, authorize leaves of absence, and track procurement files in a secure sign-off inbox.
            </p>

            <div className="flex flex-col gap-3.5 pt-2">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Standardized leave submissions & coverage trackers</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Detailed expense review with attachment checks</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Auditable historical changes & action notes</span>
              </div>
            </div>
          </div>

          {/* Right Image Mockup Column */}
          <div className="lg:col-span-7 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 rounded-3xl blur-2xl -z-10" />
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="glass rounded-3xl p-3 border border-white/60 shadow-xl overflow-hidden hover:scale-[1.01] transition-transform duration-500"
            >
              <img 
                src="/approvals.png" 
                alt="Requests & Approvals Inbox Mockup" 
                className="w-full h-auto rounded-2xl border border-slate-100/50 shadow-sm"
              />
            </motion.div>

            {/* Floating micro-widget */}
            <motion.div 
              animate={{ y: [-6, 6] }}
              transition={{ duration: 5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
              className="absolute -bottom-6 -left-6 glass hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-purple-150/70 shadow-lg"
            >
              <div className="h-8 w-8 rounded-xl bg-purple-50 border border-purple-150 flex items-center justify-center text-purple-600">
                <FileCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Awaiting Action</p>
                <p className="text-xs font-bold text-slate-800">8 Active Requests</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Detailed Features Deep Dive */}
        <div className="mb-24">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              A Complete Audit Trail for Operations
            </h2>
            <p className="mt-3 text-slate-500 text-xs font-semibold leading-relaxed">
              Maintain regulatory safety and organization compliance. Track every authorization or rejection with complete audit logs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1: Leave requests */}
            <div className="glass rounded-3xl p-8 border border-white/50 hover:scale-[1.02] hover:-translate-y-1 hover:border-purple-200 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-11 w-11 rounded-2xl bg-purple-50 border border-purple-100/75 flex items-center justify-center text-purple-600 mb-6 shadow-sm">
                  <Clock className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Leave & Time-Off submissions</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                  Standardize leave requests. Workers key in vacation timelines, identify core team coverage backup, and monitor admin sign-off status directly on their personal dashboards.
                </p>
              </div>
              <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  Vacation calendar tracking
                </li>
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  Leave balance checks
                </li>
              </ul>
            </div>

            {/* Card 2: Expenses */}
            <div className="glass rounded-3xl p-8 border border-white/50 hover:scale-[1.02] hover:-translate-y-1 hover:border-emerald-250 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-11 w-11 rounded-2xl bg-emerald-50 border border-emerald-100/75 flex items-center justify-center text-emerald-600 mb-6 shadow-sm">
                  <DollarSign className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Procurement & Expenses</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                  Authorize company purchases without scattered spreadsheets. Review vendor invoices, quote details, and upload logs to sign-off on budgets instantly.
                </p>
              </div>
              <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Quote attachments & reviews
                </li>
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  One-click authorization badges
                </li>
              </ul>
            </div>

            {/* Card 3: Restrictions */}
            <div className="glass rounded-3xl p-8 border border-white/50 hover:scale-[1.02] hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-11 w-11 rounded-2xl bg-indigo-50 border border-indigo-100/75 flex items-center justify-center text-indigo-600 mb-6 shadow-sm">
                  <ShieldCheck className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Role-based Permissions</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                  Restrict approvals to managers and founders. Control who can sign off on purchase requests or approve leave requests by setting role boundaries at the department level.
                </p>
              </div>
              <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Department lead restrictions
                </li>
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Audit log changes tracking
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Audit Details block */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-150/70 shadow-sm mb-20 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-[200px] h-[200px] bg-purple-50/50 rounded-full blur-3xl pointer-events-none" />
          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100/30">
                Compliance Audit Trail
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Contextual Action Feedback
              </h2>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                When rejecting or approving items, admins can input contextual notes. This ensures that the requester understands exactly why a request was approved or needs modifications, unblocking coordination.
              </p>
              <div className="flex gap-2 items-center text-xs font-bold text-slate-700 pt-2">
                <AlertCircle className="h-4 w-4 text-purple-500" />
                <span>Eliminate administrative back-and-forth</span>
              </div>
            </div>

            <div className="md:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-100/80 space-y-3.5 shadow-sm">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Approval Audit Log</span>
              
              <div className="space-y-3.5 text-[11px] font-semibold text-slate-600">
                <div className="border-l-2 border-emerald-500 pl-3">
                  <p className="text-slate-800 font-bold">Approved: Warehouse Equipment</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">Approved by Sarah J. (Owner)</p>
                  <p className="text-slate-400 text-[10px] italic mt-1 bg-white p-1.5 rounded border border-slate-100">"Purchase order verified. Ready for logistics deployment."</p>
                </div>
                
                <div className="border-l-2 border-rose-500 pl-3">
                  <p className="text-slate-800 font-bold">Rejected: Client Lunch Expense</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">Rejected by Sarah J. (Owner)</p>
                  <p className="text-slate-400 text-[10px] italic mt-1 bg-white p-1.5 rounded border border-slate-100">"Please attach client receipt files to verify."</p>
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
