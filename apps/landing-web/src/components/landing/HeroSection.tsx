import { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { ArrowRight, MessageSquare, CheckSquare, FileCheck, Sparkles, RefreshCw } from 'lucide-react';
import { APP_URL } from '../../config/landingData';
import { useNavigation } from '../../context/NavigationContext';

export function HeroSection() {
  const { navigate } = useNavigation();
  const sectionRef = useRef<HTMLDivElement>(null);
  
  // Track scroll progress for chaos card condensation
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });

  // Transform coordinates for the chaos cards (shifting them inward and fading them out on scroll)
  const chatChaosX = useTransform(scrollYProgress, [0, 0.45], [-160, -30]);
  const chatChaosY = useTransform(scrollYProgress, [0, 0.45], [-80, -10]);
  const chatChaosOpacity = useTransform(scrollYProgress, [0, 0.4], [0.85, 0]);
  const chatChaosScale = useTransform(scrollYProgress, [0, 0.45], [1, 0.75]);
  const chatChaosRotate = useTransform(scrollYProgress, [0, 0.45], [-12, -4]);

  const taskChaosX = useTransform(scrollYProgress, [0, 0.45], [180, 40]);
  const taskChaosY = useTransform(scrollYProgress, [0, 0.45], [-120, -25]);
  const taskChaosOpacity = useTransform(scrollYProgress, [0, 0.4], [0.85, 0]);
  const taskChaosScale = useTransform(scrollYProgress, [0, 0.45], [1, 0.75]);
  const taskChaosRotate = useTransform(scrollYProgress, [0, 0.45], [15, 5]);

  const approvalChaosX = useTransform(scrollYProgress, [0, 0.45], [-140, -15]);
  const approvalChaosY = useTransform(scrollYProgress, [0, 0.45], [140, 25]);
  const approvalChaosOpacity = useTransform(scrollYProgress, [0, 0.4], [0.85, 0]);
  const approvalChaosScale = useTransform(scrollYProgress, [0, 0.45], [1, 0.75]);
  const approvalChaosRotate = useTransform(scrollYProgress, [0, 0.45], [-8, 0]);

  // 3D Prism States
  const [isManual, setIsManual] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-rotation cycle in manual mode if desired, or auto-snaps when idle
  useEffect(() => {
    if (isManual) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(interval);
  }, [isManual]);

  const prismRotationAngle = -activeIndex * 120;

  return (
    <section 
      ref={sectionRef} 
      className="relative pt-32 md:pt-40 pb-24 px-6 overflow-hidden bg-slate-50/20 grid-pattern"
    >
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-[5%] w-[450px] h-[450px] rounded-full bg-indigo-500/5 blur-[120px] animate-drift pointer-events-none z-0" />
      <div className="absolute top-[20%] right-[5%] w-[450px] h-[450px] rounded-full bg-cyan-500/5 blur-[120px] animate-drift-reverse pointer-events-none z-0" />
      <div className="absolute top-[40%] left-[25%] w-[350px] h-[350px] rounded-full bg-purple-500/4 blur-[100px] animate-drift pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
        
        {/* Left Column: Taglines and Actions */}
        <div className="lg:col-span-6 text-left flex flex-col justify-center">
          
          {/* Subtle Label */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 self-start bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100/80 mb-6"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>Next-gen coordination platform</span>
          </motion.div>

          {/* New Selected Tagline */}
          <h1 className="text-[clamp(2rem,5vw,3.75rem)] font-extrabold tracking-tight leading-[1.1] text-slate-900 font-sans">
            The gravity your <br />
            <span className="text-gradient-cosmic">operations need.</span>
          </h1>

          <motion.h2 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg md:text-xl font-bold text-slate-800 mt-4 leading-relaxed"
          >
            Bring tasks, chat, and approvals into perfect sync.
          </motion.h2>

          {/* Targeted Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mt-5 text-sm md:text-base text-slate-500 max-w-xl leading-relaxed font-semibold"
          >
            Stop checking five fragmented tools. Unify your team's conversations, task boards, leave approvals, and execution visibility in one fast, lightweight workspace built for SMBs.
          </motion.p>

          {/* Call-to-actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.26 }}
            className="mt-8 flex flex-col sm:flex-row items-center gap-3.5"
          >
            <a
              href={`${APP_URL}/signup`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-6.5 py-3.5 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.97] hover:-translate-y-0.5 cursor-pointer"
            >
              Start free workspace
              <ArrowRight className="h-4 w-4" />
            </a>
            <button
              onClick={() => navigate('/features')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-150 hover:border-slate-200 px-6 py-3.5 rounded-2xl transition-all shadow-sm cursor-pointer hover:-translate-y-0.5 active:scale-[0.97]"
            >
              Explore features
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        </div>

        {/* Right Column: Interactive 3D Unified Glass Prism Stage */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[460px] md:min-h-[500px]">
          
          {/* Cosmic Glow Stage Plate */}
          <div className="absolute w-[340px] h-[340px] rounded-full bg-radial from-indigo-500/10 to-transparent blur-3xl z-0 pointer-events-none" />

          {/* =========================================
              SCROLL-DRIVEN ORBIT CONDENSATION CARDS
              (Visible only on desktop/large screens)
             ========================================= */}
          <div className="absolute inset-0 pointer-events-none z-20 hidden md:block">
            
            {/* Chaotic Chat Bubble */}
            <motion.div
              style={{
                x: chatChaosX,
                y: chatChaosY,
                opacity: chatChaosOpacity,
                scale: chatChaosScale,
                rotate: chatChaosRotate,
              }}
              className="absolute top-[20%] left-[5%] glass px-4 py-2.5 rounded-2xl shadow-md border-rose-200/50 bg-rose-50/80 flex items-center gap-2 max-w-[200px]"
            >
              <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              <div className="text-[10px] text-rose-900 leading-tight">
                <span className="font-bold block text-rose-500">WhatsApp DM</span>
                "Is the report approved?"
              </div>
            </motion.div>

            {/* Chaotic Spreadsheet Card */}
            <motion.div
              style={{
                x: taskChaosX,
                y: taskChaosY,
                opacity: taskChaosOpacity,
                scale: taskChaosScale,
                rotate: taskChaosRotate,
              }}
              className="absolute top-[15%] right-[5%] glass px-4 py-2.5 rounded-2xl shadow-md border-amber-200/50 bg-amber-50/80 flex items-center gap-2 max-w-[200px]"
            >
              <div className="text-[10px] text-amber-900 leading-tight">
                <span className="font-bold block text-amber-600">Spreadsheet Row 42</span>
                Task: Procure HW (Pending)
              </div>
            </motion.div>

            {/* Chaotic Email Alert */}
            <motion.div
              style={{
                x: approvalChaosX,
                y: approvalChaosY,
                opacity: approvalChaosOpacity,
                scale: approvalChaosScale,
                rotate: approvalChaosRotate,
              }}
              className="absolute bottom-[18%] left-[8%] glass px-4 py-2.5 rounded-2xl shadow-md border-indigo-200/50 bg-indigo-50/80 flex items-center gap-2 max-w-[200px]"
            >
              <div className="text-[10px] text-indigo-900 leading-tight">
                <span className="font-bold block text-indigo-600">Inbox Notification</span>
                [URGENT] Sign-off Needed
              </div>
            </motion.div>
          </div>

          {/* =========================================
              3D PERSPECTIVE GLASS PRISM WRAPPER
             ========================================= */}
          <div 
            className="w-full flex justify-center items-center select-none z-10"
            style={{ perspective: 1200 }}
          >
            <div 
              className={`relative w-[280px] h-[300px] preserve-3d transition-transform ${
                isManual ? 'duration-700 ease-out' : 'animate-rotate-prism'
              }`}
              style={{
                transform: isManual 
                  ? `rotateY(${prismRotationAngle}deg) rotateX(-8deg)` 
                  : undefined
              }}
            >
              
              {/* FACE 1: WORK TRACKING / KANBAN */}
              <div 
                className="absolute inset-0 w-[280px] h-[300px] backface-hidden glass rounded-3xl border-indigo-300/40 bg-indigo-50/20 shadow-xl p-5 flex flex-col"
                style={{ transform: `rotateY(0deg) translateZ(81px)` }}
              >
                <div className="flex items-center gap-2 text-indigo-700 border-b border-indigo-100/50 pb-3 mb-4">
                  <CheckSquare className="h-5 w-5 text-indigo-600" />
                  <span className="font-bold text-sm tracking-tight">Tasks & Tickets</span>
                </div>
                
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="bg-white/70 p-3 rounded-2xl border border-indigo-50/50 shadow-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-bold">HIGH</span>
                        <span className="text-[9px] text-slate-400 font-semibold">Today</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">Launch Production Server</h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal">Setup cloud host, link domain</p>
                    </div>

                    <div className="bg-white/50 p-2.5 rounded-xl border border-indigo-50/40 opacity-75">
                      <h4 className="text-[11px] font-bold text-slate-700">Client Contract Sync</h4>
                    </div>
                  </div>

                  <div className="bg-white/45 p-2 rounded-xl flex items-center justify-between text-[10px] text-slate-500 border border-white/50">
                    <span>Active tasks: <strong className="text-slate-800">4</strong></span>
                    <span className="bg-indigo-600/10 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold">2 Done</span>
                  </div>
                </div>
              </div>

              {/* FACE 2: TEAM CHAT */}
              <div 
                className="absolute inset-0 w-[280px] h-[300px] backface-hidden glass rounded-3xl border-cyan-300/40 bg-cyan-50/20 shadow-xl p-5 flex flex-col"
                style={{ transform: `rotateY(120deg) translateZ(81px)` }}
              >
                <div className="flex items-center gap-2 text-cyan-800 border-b border-cyan-100/50 pb-3 mb-4">
                  <MessageSquare className="h-5 w-5 text-cyan-600" />
                  <span className="font-bold text-sm tracking-tight">Team Communication</span>
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Chat Bubble 1 */}
                    <div className="flex gap-2.5 items-start">
                      <div className="h-6 w-6 rounded-full bg-cyan-600 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                        JD
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-2xl rounded-tl-none border border-cyan-50/50 text-[11px] text-slate-800 max-w-[85%] leading-normal">
                        Hey team, is the server contract sign-off pending?
                      </div>
                    </div>

                    {/* Chat Bubble 2 */}
                    <div className="flex gap-2.5 items-start justify-end">
                      <div className="bg-cyan-600 text-white p-2.5 rounded-2xl rounded-tr-none text-[11px] max-w-[85%] leading-normal shadow-xs">
                        Sent approval request, waiting for Ops review!
                      </div>
                      <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                        ME
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/45 p-2 rounded-xl flex items-center justify-between text-[10px] text-slate-500 border border-white/50">
                    <span className="font-semibold text-cyan-800">#ops-coordination</span>
                    <span className="text-[9px] bg-cyan-500/10 text-cyan-700 px-1.5 py-0.5 rounded-md font-bold">Realtime</span>
                  </div>
                </div>
              </div>

              {/* FACE 3: APPROVALS & REQUESTS */}
              <div 
                className="absolute inset-0 w-[280px] h-[300px] backface-hidden glass rounded-3xl border-purple-300/40 bg-purple-50/20 shadow-xl p-5 flex flex-col"
                style={{ transform: `rotateY(240deg) translateZ(81px)` }}
              >
                <div className="flex items-center gap-2 text-purple-700 border-b border-purple-100/50 pb-3 mb-4">
                  <FileCheck className="h-5 w-5 text-purple-600" />
                  <span className="font-bold text-sm tracking-tight">Requests & Approvals</span>
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-3.5">
                    <div className="bg-white/70 p-3 rounded-2xl border border-purple-50/50 shadow-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-bold">PROCUREMENT</span>
                        <span className="text-[9px] text-amber-500 font-bold">PENDING</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">Server Budget Allocation</h4>
                      <p className="text-[10px] text-slate-600 mt-1 font-bold">$2,400.00 / Annually</p>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-[10px] shadow-sm active:scale-[0.97] transition-all cursor-pointer">
                        Approve
                      </button>
                      <button className="flex-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold py-2 rounded-xl text-[10px] shadow-sm active:scale-[0.97] transition-all cursor-pointer">
                        Decline
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/45 p-2 rounded-xl flex items-center justify-between text-[10px] text-slate-500 border border-white/50">
                    <span>Awaiting your review: <strong className="text-purple-700 font-extrabold">1</strong></span>
                    <span className="bg-purple-600/10 text-purple-700 px-1.5 py-0.5 rounded-md font-bold">Audit Trail</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* =========================================
              PRISM MANUAL SNAP CONTROL PANEL
             ========================================= */}
          <div className="mt-8 z-20 flex flex-col items-center gap-3 w-full max-w-[340px]">
            
            {/* Snapping Tabs */}
            <div className="flex bg-slate-100/80 backdrop-blur-md p-1 rounded-2xl border border-slate-200/50 w-full shadow-inner">
              <button 
                onClick={() => { setIsManual(true); setActiveIndex(0); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                  activeIndex === 0 
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/30' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Tasks
              </button>
              <button 
                onClick={() => { setIsManual(true); setActiveIndex(1); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                  activeIndex === 1 
                    ? 'bg-white text-cyan-800 shadow-sm border border-slate-200/30' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Chat
              </button>
              <button 
                onClick={() => { setIsManual(true); setActiveIndex(2); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                  activeIndex === 2 
                    ? 'bg-white text-purple-700 shadow-sm border border-slate-200/30' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileCheck className="h-3.5 w-3.5" />
                Approvals
              </button>
            </div>

            {/* Resume Auto-Rotation Button */}
            <AnimatePresence>
              {isManual && (
                <motion.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsManual(false)}
                  className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-bold bg-indigo-50/60 hover:bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100/50 cursor-pointer active:scale-95 transition-all"
                >
                  <RefreshCw className="h-3 w-3 animate-spin-slow" />
                  Resume Auto-Rotation
                </motion.button>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </section>
  );
}
