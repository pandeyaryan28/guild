import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Search, 
  Shield, 
  Users, 
  FileCheck, 
  Folder, 
  ArrowRight, 
  Clock, 
  AlertTriangle, 
  UserCheck,
  CheckCircle2,
  Terminal,
  Inbox
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { useNavigation } from '../../context/NavigationContext';

export function BentoShowcase() {
  const { navigate } = navigateFn();
  
  // Custom navigation wrapper to avoid React compiler issues if any
  function navigateFn() {
    try {
      return useNavigation();
    } catch (e) {
      return { navigate: (path: string) => { window.location.hash = path; } };
    }
  }

  // State for simulated search typing effect
  const [searchText, setSearchText] = useState('');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!showResults) {
      const currentWord = 'invoice';
      let index = 0;
      setSearchText('');
      const interval = setInterval(() => {
        if (index < currentWord.length) {
          setSearchText(currentWord.substring(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          setShowResults(true);
          timer = setTimeout(() => {
            setShowResults(false);
          }, 3500);
        }
      }, 250);

      return () => {
        clearInterval(interval);
        if (timer) clearTimeout(timer);
      };
    }
  }, [showResults]);

  return (
    <section className="px-6 py-24 relative bg-slate-50/10 grid-pattern">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
              Engineered for Total Visibility
            </h2>
            <p className="mt-4 text-slate-500 text-xs md:text-sm font-semibold max-w-xl mx-auto leading-relaxed">
              Dismantle operations silos. Unify department channels, audit checklists, task states, and secure admin visibility logs inside a single responsive space.
            </p>
          </div>
        </ScrollReveal>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Large Department View (Work Management) */}
          <ScrollReveal className="md:col-span-2">
            <div className="glass rounded-3xl p-7 hover:scale-[1.005] hover:border-slate-300 transition-all duration-300 border-slate-150 shadow-md h-full flex flex-col justify-between min-h-[320px]">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/35">
                  Workspace Structure
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-4 tracking-tight">
                  Organized by Departments
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-2.5 max-w-md leading-relaxed">
                  Segment your team into dedicated departments (like Operations, Logistics, or Marketing) to target chat channels and restrict task permissions.
                </p>
              </div>

              {/* Visual Demo List */}
              <div className="mt-6 space-y-2.5 bg-slate-50/80 rounded-2xl p-4 border border-slate-100 shadow-inner">
                <div className="group/item flex items-center justify-between text-xs font-semibold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100/50 shadow-sm hover:scale-[1.005] hover:border-indigo-150 transition-all cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6.5 w-6.5 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <span>#operations</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-400">
                    <span>14 Members</span>
                    <span>•</span>
                    <span className="text-indigo-650 font-bold bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded">8 Active Tasks</span>
                  </div>
                </div>

                <div className="group/item flex items-center justify-between text-xs font-semibold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100/50 shadow-sm hover:scale-[1.005] hover:border-cyan-150 transition-all cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6.5 w-6.5 rounded-lg bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 shrink-0">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <span>#logistics-delivery</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-400">
                    <span>8 Members</span>
                    <span>•</span>
                    <span className="text-cyan-650 font-bold bg-cyan-50 border border-cyan-100/50 px-2 py-0.5 rounded">5 Active Tasks</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 2: Instant Setup */}
          <ScrollReveal>
            <div className="glass rounded-3xl p-7 hover:scale-[1.005] hover:border-slate-300 transition-all duration-300 border-slate-150 shadow-md h-full flex flex-col justify-between min-h-[320px]">
              <div>
                <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mb-4 shadow-sm animate-pulse">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Instant Onboarding
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-2 leading-relaxed">
                  No complex setup. Create a workspace, map departments, and share quick-invite links. Ready in under 5 minutes.
                </p>
              </div>

              <div className="mt-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                <div className="space-y-3.5 text-[11px] font-bold text-slate-500">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-extrabold">1</div>
                    <span>Create workspace profile</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-650">
                    <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-extrabold">2</div>
                    <span>Map core departments</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-400">
                    <div className="h-5 w-5 rounded-full bg-slate-200 text-[10px] font-extrabold text-slate-600 animate-pulse">3</div>
                    <span>Share quick-invite links</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 3: Global search */}
          <ScrollReveal>
            <div className="glass rounded-3xl p-7 hover:scale-[1.005] hover:border-slate-300 transition-all duration-300 border-slate-150 shadow-md h-full flex flex-col justify-between min-h-[320px]">
              <div>
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-4 shadow-sm">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Unified Search
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-2 leading-relaxed">
                  Search across task names, comments, chat histories, and shared filenames instantly using our indexed database search.
                </p>
              </div>

              {/* Simulated Search Dropdown with Typing Effect */}
              <div className="mt-6 bg-white p-3.5 rounded-2xl border border-slate-150/80 shadow-sm text-xs font-semibold text-slate-400 relative">
                <div className="border border-slate-100 rounded-xl px-2.5 py-1.5 flex items-center gap-2 bg-slate-50 mb-2.5">
                  <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-[10.5px] text-slate-800 font-bold min-h-[16px] flex items-center">
                    {searchText}
                    <span className="w-1 h-3.5 bg-indigo-500 animate-pulse ml-0.5" />
                  </span>
                </div>
                
                <div className="min-h-[58px]">
                  <AnimatePresence>
                    {showResults && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5 p-1 bg-rose-50/50 text-rose-700 rounded-md text-[10px] font-bold border border-rose-100/40">
                          <Folder className="h-3 w-3 text-rose-500" /> Q3_Invoice.pdf
                        </div>
                        <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-md text-[10px] text-slate-500 font-semibold border border-slate-100/50">
                          <Users className="h-3 w-3 text-cyan-500" /> chat: "...invoice paid today"
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 4: Auditable approvals & security */}
          <ScrollReveal className="md:col-span-2">
            <div className="glass rounded-3xl p-7 hover:scale-[1.005] hover:border-slate-300 transition-all duration-300 border-slate-150 shadow-md h-full flex flex-col justify-between min-h-[320px]">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100/35">
                  Compliance & Security
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-4 tracking-tight">
                  Auditable Sign-off Trails
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-2.5 max-w-md leading-relaxed">
                  Keep records of every administrative approval, leave request, and purchase sign-off. All transactions are logged and encrypted at the workspace level for safety.
                </p>
              </div>

              {/* Simulated Audits log with hover animation */}
              <div className="mt-6 space-y-2.5 bg-slate-50/80 rounded-2xl p-4 border border-slate-100 text-[10.5px] font-semibold text-slate-500 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-150/40 pb-2 hover:bg-white/45 p-1 rounded transition-colors">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-slate-800 font-bold">Purchase Approved</span>
                  </div>
                  <span>Marcus Chen approved by Sarah J. • 2m ago</span>
                </div>
                <div className="flex items-center justify-between pt-1 hover:bg-white/45 p-1 rounded transition-colors">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-slate-800 font-bold">Permissions Locked</span>
                  </div>
                  <span>System: Role changed for Alex R. • 1h ago</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 5: Admin Portal Visibility Layer */}
          <ScrollReveal className="md:col-span-3">
            <div 
              onClick={() => navigate('/features/admin-console')}
              className="glass rounded-3xl p-8 hover:scale-[1.005] transition-all duration-300 border-slate-150 shadow-sm flex flex-col md:flex-row gap-8 items-center cursor-pointer hover:border-slate-350"
            >
              <div className="flex-1 space-y-4">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Business-Wide Visibility Layer
                </h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  As a business owner or founder, get complete administrative control. Spot which members are underloaded, check if goals/projects are on-track, and instantly triage overdue tasks.
                </p>
                <div className="pt-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/features/admin-console');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-605 hover:text-indigo-750 transition-colors cursor-pointer"
                  >
                    Explore Admin features
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Simulated Dashboard Widgets with active indicators */}
              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Workload Allotment widget */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/60 space-y-3.5 hover:scale-[1.01] transition-transform duration-300 shadow-sm">
                  <div className="flex items-center justify-between text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <span>Workload Allotment</span>
                    <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">Admin</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-700">
                      <span className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5 text-emerald-500 animate-pulse" /> Sarah Jenkins</span>
                      <span className="text-slate-400 font-semibold">Allotted (3 Tasks)</span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-700">
                      <span className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5 text-amber-500" /> Alex Rivera</span>
                      <span className="text-indigo-650">Underloaded (1 Task)</span>
                    </div>
                  </div>
                </div>

                {/* Project Status & Overdue widget */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/60 space-y-3.5 hover:scale-[1.01] transition-transform duration-300 shadow-sm">
                  <div className="flex items-center justify-between text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <span>Operational Health</span>
                    <span className="text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded">Alerts</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-700">
                      <span>Q3 Delivery Goal</span>
                      <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[8.5px] font-extrabold">On Track</span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-700">
                      <span className="flex items-center gap-0.5"><AlertTriangle className="h-3.5 w-3.5 text-rose-500 animate-pulse" /> Logistics Team</span>
                      <span className="text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded text-[8.5px] font-extrabold">3 Overdue</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </ScrollReveal>

        </div>
      </div>
    </section>
  );
}
