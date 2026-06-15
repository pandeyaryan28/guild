import { motion } from 'motion/react';
import { MessageSquare, Sparkles, Hash, AlertCircle, ArrowLeft, Check, Terminal } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { CTABanner } from '../components/landing/CTABanner';

export function TeamChatFeature() {
  const { navigate } = useNavigation();

  return (
    <div className="pt-32 pb-8 relative overflow-hidden bg-slate-50/20 grid-pattern">
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-cyan-500/5 blur-[90px] pointer-events-none animate-drift" />
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
            Real-time Team Chat
          </h1>
          <p className="mt-4 text-slate-500 text-base md:text-lg font-medium leading-relaxed">
            Consolidate your communications. Replace scattered chat threads with centralized department channels and direct messages, fully unified with your tasks.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch mb-20">
          
          {/* Card 1: Chat Channels */}
          <div className="glass rounded-3xl p-8 border border-indigo-50/50 flex flex-col justify-between hover:scale-[1.005] transition-all shadow-sm">
            <div>
              <div className="h-10 w-10 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 mb-6">
                <Hash className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Department Channels</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                Establish clean chat spaces for different operations branches (like `#operations`, `#logistics-delivery`, or `#general`). Keep everyone aligned without overlapping noise.
              </p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] font-bold text-slate-500 space-y-2">
              <span className="text-slate-400 uppercase tracking-widest text-[8px] block mb-1">Active Channel</span>
              <div className="flex items-center gap-1.5 text-indigo-600">
                <Hash className="h-3.5 w-3.5" />
                <span>#operations-channel</span>
              </div>
            </div>
          </div>

          {/* Card 2: Special /task Command */}
          <div className="glass rounded-3xl p-8 border border-indigo-50/50 flex flex-col justify-between hover:scale-[1.005] transition-all shadow-sm ring-2 ring-indigo-50/50">
            <div>
              <div className="h-10 w-10 rounded-2xl bg-indigo-55 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-6">
                <Terminal className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-bold text-slate-900">Task Creation Shortcuts</h3>
                <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase">Unique</span>
              </div>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-2 mb-6">
                Turn chat discussions into actions instantly. Type **`/task [title] assign @member`** directly inside any chat thread to log a task on the Kanban board without leaving the chat.
              </p>
            </div>
            
            <div className="bg-indigo-950 p-4 rounded-2xl border border-indigo-900 text-[10px] font-bold text-indigo-300 space-y-2 font-mono">
              <p className="text-white font-medium">sj: <span className="text-indigo-400">/task Inspect loading dock assign @marcus</span></p>
              <p className="text-indigo-300 flex items-center gap-1">
                <Terminal className="h-3 w-3" />
                <span>✅ Task Created: "Inspect loading dock"</span>
              </p>
            </div>
          </div>

        </div>

        {/* Feature Deep Dive details */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-150/70 shadow-sm mb-16">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-8 tracking-tight">
            Unified Communication Capabilities
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-sm font-semibold text-slate-600">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">Direct Private DMs</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Message team members directly for confidential, one-on-one coordination.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">User Mentions (@username)</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Ping specific team members to notify them immediately of urgent matters.
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
                  <h4 className="text-slate-900 font-bold text-xs">Shared Document Uploads</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Drag and drop file receipts or layouts directly in threads. All assets are automatically cataloged.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-xs">In-App Notification Alerts</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Mentions and channel activities trigger real-time notification updates across your workspace.
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
