import { motion } from 'motion/react';
import { 
  Sparkles, 
  Clock, 
  ArrowLeft, 
  Check, 
  Terminal, 
  Users, 
  ShieldCheck, 
  AlertCircle,
  Video,
  Hash,
  Send
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { CTABanner } from '../components/landing/CTABanner';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';

export function TeamChatFeature() {
  useDocumentMetadata({
    title: 'Team Chat & Channels',
    description: 'Keep discussions focused with department channels, private group threads, direct messaging, and contextual task comments.',
    canonicalPath: '/features/team-chat'
  });

  const { navigate } = useNavigation();

  return (
    <div className="pt-32 pb-8 relative overflow-hidden bg-slate-50/20 grid-pattern">
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none animate-drift" />
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
              Real-time Chat & <br/>
              <span className="text-gradient">Task Shortcuts</span>
            </h1>
            <p className="text-slate-500 text-sm md:text-base font-semibold leading-relaxed">
              Consolidate team communication. Eliminate scattered emails and consumer messaging apps. Chat directly inside department channels and create tasks instantly using chat shortcuts.
            </p>

            <div className="flex flex-col gap-3.5 pt-2">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Dedicated chat channels for operations groups</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Direct mentions and secure direct messaging</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Create workspace tasks instantly using `/task` shortcut</span>
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
                src="/team_chat.png" 
                alt="Real-time Team Chat & Chat Shortcuts Mockup" 
                className="w-full h-auto rounded-2xl border border-slate-100/50 shadow-sm"
              />
            </motion.div>
          </div>
        </div>

        {/* Detailed Features Deep Dive */}
        <div className="mb-24">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Actionable Conversations
            </h2>
            <p className="mt-3 text-slate-500 text-xs font-semibold leading-relaxed">
              Don't let operational discussions fade into scroll history. Translate discussions into trackable actions instantly.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1: Channels */}
            <div className="glass rounded-3xl p-8 border border-white/50 hover:scale-[1.02] hover:-translate-y-1 hover:border-cyan-200 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-11 w-11 rounded-2xl bg-cyan-50 border border-cyan-100/75 flex items-center justify-center text-cyan-600 mb-6 shadow-sm">
                  <Hash className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Department Channels</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                  Segment chat spaces by focus group. Create channels like `#operations`, `#logistics-delivery`, or `#marketing` to keep communication targeted and clean.
                </p>
              </div>
              <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  Muted state controls
                </li>
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  Department restricted access
                </li>
              </ul>
            </div>

            {/* Card 2: Commands */}
            <div className="glass rounded-3xl p-8 border border-white/50 hover:scale-[1.02] hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 shadow-sm flex flex-col justify-between ring-2 ring-indigo-500/10">
              <div>
                <div className="h-11 w-11 rounded-2xl bg-indigo-50 border border-indigo-100/75 flex items-center justify-center text-indigo-600 mb-6 shadow-sm">
                  <Terminal className="h-5.5 w-5.5" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-bold text-slate-900">Task Shortcuts</h3>
                  <span className="bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase text-indigo-600">Unique</span>
                </div>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                  Turn talk into tasks. Type `/task [title] assign @username` right in the chat input. A bot instantly creates the Kanban ticket, avoiding context switches.
                </p>
              </div>
              <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Auto-fill priorities and dates
                </li>
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Inline creation check logs
                </li>
              </ul>
            </div>

            {/* Card 3: Mentions & DMs */}
            <div className="glass rounded-3xl p-8 border border-white/50 hover:scale-[1.02] hover:-translate-y-1 hover:border-purple-200 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <div className="h-11 w-11 rounded-2xl bg-purple-50 border border-purple-100/75 flex items-center justify-center text-purple-600 mb-6 shadow-sm">
                  <Sparkles className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Mentions & Secure DMs</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
                  Ping team coordinators directly with `@username` mentions to trigger push notifications. Message members privately for confidential, 1-on-1 coordination.
                </p>
              </div>
              <ul className="space-y-2.5 pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  Instant push & in-app alerts
                </li>
                <li className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  Secure end-to-end data feeds
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Shortcut Terminal Simulator */}
        <div className="bg-slate-950 rounded-3xl p-8 md:p-12 border border-slate-900 shadow-xl mb-20 text-slate-300 font-mono relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded-full border border-cyan-900/50">
                Workspace Automation
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight font-sans">
                The `/task` Command Simulator
              </h2>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed font-sans">
                Never lose track of assignments discussed in chat. By using the integrated chat command, managers and operators create tickets and assign owners without leaving the discussion.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 pt-2 font-sans text-xs font-semibold">
                <div className="flex items-center gap-2 text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-cyan-400" />
                  <span>Strict permissions</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Send className="h-4 w-4 text-cyan-400" />
                  <span>Slack-like convenience</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 bg-slate-900 p-6 rounded-2xl border border-slate-800 text-[11px] font-semibold space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500 uppercase tracking-widest text-[8px] font-extrabold">Chat Input Console</span>
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              </div>
              <div className="space-y-2.5">
                <p className="text-slate-400">
                  <span className="text-cyan-400">sarah_j:</span> /task Procurement review assign @marcus
                </p>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-cyan-300 flex items-start gap-2"
                >
                  <Terminal className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white">✅ Bot: Task created successfully!</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Title: "Procurement review" | Assigned: Marcus Chen</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CTABanner />
    </div>
  );
}
