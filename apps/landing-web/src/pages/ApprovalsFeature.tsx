import { motion } from 'motion/react';
import { FileCheck, Sparkles, Clock, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { CTABanner } from '../components/landing/CTABanner';

export function ApprovalsFeature() {
  const { navigate } = useNavigation();

  return (
    <div className="pt-32 pb-8 relative overflow-hidden bg-slate-50/20 grid-pattern">
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-purple-500/5 blur-[90px] pointer-events-none animate-drift" />
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
            Requests & Approvals
          </h1>
          <p className="mt-4 text-slate-500 text-base md:text-lg font-medium leading-relaxed">
            Fast, structured operational sign-offs. Standardize administrative requests and eliminate delays in purchasing, leaves, and approvals.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch mb-20">
          
          {/* Card 1: Leave Requests */}
          <div className="glass rounded-3xl p-8 border border-indigo-50/50 flex flex-col justify-between hover:scale-[1.005] transition-all shadow-sm">
            <div>
              <div className="h-10 w-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-6">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Leave Requests</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                Standardize leave submissions. Workers can log time-off requests, designate core team coverage, and monitor status updates directly on their dashboard.
              </p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] font-bold text-slate-500 flex justify-between items-center">
              <div>
                <p className="text-slate-800">Annual Leave Request</p>
                <p className="text-slate-400 text-[8px] font-semibold mt-0.5">Alex Rivera • 5 Days</p>
              </div>
              <span className="bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded text-[8px]">Leave</span>
            </div>
          </div>

          {/* Card 2: Purchase Approvals */}
          <div className="glass rounded-3xl p-8 border border-indigo-50/50 flex flex-col justify-between hover:scale-[1.005] transition-all shadow-sm">
            <div>
              <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-6">
                <FileCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Purchase & Expense Approvals</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                Authorize operational expenses without loose emails. Managers can review vendor quotes, add action comments, and sign off in a single click.
              </p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] font-bold text-slate-500 flex justify-between items-center">
              <div>
                <p className="text-slate-800">Warehouse Equipment Maintenance</p>
                <p className="text-indigo-600 text-[9px] mt-0.5">$1,200</p>
              </div>
              <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded text-[8px]">Approved</span>
            </div>
          </div>

        </div>

        {/* Feature Deep Dive details */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-150/70 shadow-sm mb-16">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-8 tracking-tight">
            Compliance & Audit trails
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-sm font-semibold text-slate-600">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">Optional Action Comments</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Attach notes when approving or rejecting requests to specify instructions or detail requirements.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">Real-time Sign-off Alerts</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Instantly notifies request owners when an admin signs off, avoiding delays in coordination.
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
                  <h4 className="text-slate-900 font-bold text-xs">Complete Audit Log</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Retain records of historical approvals and changes to maintain complete operational accountability.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">Role-based Restrictions</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Define who can approve purchase orders or check off requests using department role permissions.
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
