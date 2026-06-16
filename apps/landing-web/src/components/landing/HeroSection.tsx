import { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { ArrowRight, MessageSquare, CheckSquare, FileCheck, Terminal, Cpu, Layers } from 'lucide-react';
import { APP_URL } from '../../config/landingData';
import { useNavigation } from '../../context/NavigationContext';

export function HeroSection() {
  const { navigate } = useNavigation();
  const sectionRef = useRef<HTMLDivElement>(null);
  
  // Real-time animation states for 3D Prism
  const [angle, setAngle] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [targetAngle, setTargetAngle] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Telemetry metric states
  const [fps, setFps] = useState(60);
  const lastTimeRef = useRef(performance.now());
  const fpsRef = useRef(60);
  const activeIndexRef = useRef(0);

  // Shortest path angle difference helper
  const getShortestAngleDiff = (target: number, current: number) => {
    let diff = (target - current) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff;
  };

  // requestAnimationFrame Loop for precise physics-based rotation & telemetry
  useEffect(() => {
    let frameId: number;

    const tick = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      
      // Calculate dynamic FPS
      const currentFps = delta > 0 ? 1000 / delta : 60;
      fpsRef.current = fpsRef.current * 0.95 + currentFps * 0.05;
      setFps(fpsRef.current);

      setAngle((prevAngle) => {
        let nextAngle = prevAngle;
        if (isManual) {
          const diff = getShortestAngleDiff(targetAngle, prevAngle);
          if (Math.abs(diff) < 0.05) {
            nextAngle = targetAngle;
          } else {
            nextAngle += diff * 0.12; // LERP speed
          }
        } else {
          // Auto rotate: slow down on hover
          const increment = isHovered ? 0.05 : 0.28;
          nextAngle = (prevAngle + increment) % 360;
        }

        // Calculate closest face (Face 0: 0°, Face 1: 120° / -240°, Face 2: 240° / -120°)
        if (!isManual) {
          const positiveAngle = ((nextAngle % 360) + 360) % 360;
          let closestFace = 0;
          let minDiff = Infinity;
          
          // Normalized face degrees: Face 0 at 0°, Face 1 at 240° (snaps to -120° container), Face 2 at 120° (snaps to -240° container)
          // Since container rotateY is negative of face rotateY:
          // Target snap for Face 0: 0°, Face 1: -120° (240°), Face 2: -240° (120°)
          const faces = [
            { id: 0, target: 0 },
            { id: 1, target: 240 },
            { id: 2, target: 120 }
          ];

          faces.forEach((face) => {
            const d = Math.abs(((positiveAngle - face.target + 180) % 360) - 180);
            if (d < minDiff) {
              minDiff = d;
              closestFace = face.id;
            }
          });

          if (activeIndexRef.current !== closestFace) {
            activeIndexRef.current = closestFace;
            setActiveIndex(closestFace);
          }
        }

        return nextAngle;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isManual, targetAngle, isHovered]);

  // Track scroll progress for chaos card condensation
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });

  // Transform coordinates for the chaos cards (shifting them inward and fading them out on scroll)
  const chatChaosX = useTransform(scrollYProgress, [0, 0.45], [-160, -25]);
  const chatChaosY = useTransform(scrollYProgress, [0, 0.45], [-70, -5]);
  const chatChaosOpacity = useTransform(scrollYProgress, [0, 0.38], [0.9, 0]);
  const chatChaosScale = useTransform(scrollYProgress, [0, 0.45], [1, 0.72]);
  const chatChaosRotate = useTransform(scrollYProgress, [0, 0.45], [-8, -3]);

  const taskChaosX = useTransform(scrollYProgress, [0, 0.45], [180, 30]);
  const taskChaosY = useTransform(scrollYProgress, [0, 0.45], [-110, -15]);
  const taskChaosOpacity = useTransform(scrollYProgress, [0, 0.38], [0.9, 0]);
  const taskChaosScale = useTransform(scrollYProgress, [0, 0.45], [1, 0.72]);
  const taskChaosRotate = useTransform(scrollYProgress, [0, 0.45], [10, 2]);

  const approvalChaosX = useTransform(scrollYProgress, [0, 0.45], [-140, -10]);
  const approvalChaosY = useTransform(scrollYProgress, [0, 0.45], [130, 15]);
  const approvalChaosOpacity = useTransform(scrollYProgress, [0, 0.38], [0.9, 0]);
  const approvalChaosScale = useTransform(scrollYProgress, [0, 0.45], [1, 0.72]);
  const approvalChaosRotate = useTransform(scrollYProgress, [0, 0.45], [-5, 0]);

  const handleManualSnap = (index: number) => {
    setIsManual(true);
    setActiveIndex(index);
    activeIndexRef.current = index;
    // Set matching container rotation target: Face 0 -> 0°, Face 1 -> -120° (or 240°), Face 2 -> -240° (or 120°)
    setTargetAngle(-index * 120);
  };

  return (
    <section 
      ref={sectionRef} 
      className="relative pt-32 md:pt-40 pb-28 px-6 overflow-hidden bg-slate-50/20 grid-pattern"
    >
      {/* Background glow blobs */}
      <div className="absolute top-[8%] left-[8%] w-[420px] h-[420px] rounded-full bg-indigo-500/5 blur-[110px] animate-drift pointer-events-none z-0" />
      <div className="absolute top-[18%] right-[8%] w-[420px] h-[420px] rounded-full bg-cyan-500/5 blur-[110px] animate-drift-reverse pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
        
        {/* Left Column: Taglines and Actions */}
        <div className="lg:col-span-6 text-left flex flex-col justify-center">
          
          {/* Tagline */}
          <h1 className="text-[clamp(2.25rem,4.8vw,3.75rem)] font-extrabold tracking-tight leading-[1.08] text-slate-900 font-sans">
            The gravity your <br />
            <span className="text-gradient-cosmic">operations need.</span>
          </h1>

          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="text-lg md:text-xl font-bold text-slate-800 mt-5 leading-relaxed font-sans"
          >
            Bring tasks, chat, and approvals into perfect sync.
          </motion.h2>

          {/* Targeted Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16 }}
            className="mt-5 text-sm md:text-base text-slate-500 max-w-xl leading-relaxed font-semibold"
          >
            Stop checking five fragmented tools. Unify your team's conversations, task boards, leave approvals, and execution visibility in one fast, lightweight workspace built for SMBs.
          </motion.p>

          {/* Call-to-actions */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.24 }}
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
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[480px] md:min-h-[520px]">
          
          {/* Cosmic Glow Stage Plate */}
          <div className="absolute w-[360px] h-[360px] rounded-full bg-radial from-indigo-500/8 to-transparent blur-3xl z-0 pointer-events-none" />

          {/* =========================================
              SCROLL-DRIVEN ORBIT CONDENSATION CARDS
              (Visible only on desktop/large screens)
             ========================================= */}
          <div className="absolute inset-0 pointer-events-none z-20 hidden md:block">
            
            {/* Structured Chat Fragment */}
            <motion.div
              style={{
                x: chatChaosX,
                y: chatChaosY,
                opacity: chatChaosOpacity,
                scale: chatChaosScale,
                rotate: chatChaosRotate,
              }}
              className="absolute top-[22%] left-[4%] bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl shadow-lg font-mono text-[9px] text-slate-400 max-w-[210px] w-full"
            >
              <div className="flex justify-between border-b border-slate-800 pb-1 mb-1.5 text-slate-500">
                <span>[COMM_FRAGMENT]</span>
                <span>#OPS_CHAN</span>
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-cyan-400 font-semibold">&lt;sarah_ops&gt;</span> did contract get signed off?
                </div>
                <div>
                  <span className="text-slate-500">&lt;jd_dev&gt;</span> pending on management review.
                </div>
              </div>
            </motion.div>

            {/* Structured Spreadsheet Fragment */}
            <motion.div
              style={{
                x: taskChaosX,
                y: taskChaosY,
                opacity: taskChaosOpacity,
                scale: taskChaosScale,
                rotate: taskChaosRotate,
              }}
              className="absolute top-[12%] right-[2%] bg-white border border-slate-200/85 p-3 rounded-lg shadow-md font-mono text-[9px] max-w-[220px] w-full select-none"
            >
              <div className="grid grid-cols-4 border-b border-slate-200 text-center text-slate-400 pb-1 mb-1 font-bold">
                <span className="border-r border-slate-100">ID</span>
                <span className="border-r border-slate-100">TASK</span>
                <span className="border-r border-slate-100">STAT</span>
                <span>OWNR</span>
              </div>
              <div className="grid grid-cols-4 text-center text-slate-600 gap-y-1">
                <span className="text-slate-400">#42</span>
                <span className="truncate px-1">Procure HW</span>
                <span className="text-amber-500 font-bold bg-amber-50 px-1 py-0.5 rounded-xs scale-90">PEND</span>
                <span>SARAH</span>
              </div>
            </motion.div>

            {/* Structured Email Header Fragment */}
            <motion.div
              style={{
                x: approvalChaosX,
                y: approvalChaosY,
                opacity: approvalChaosOpacity,
                scale: approvalChaosScale,
                rotate: approvalChaosRotate,
              }}
              className="absolute bottom-[20%] left-[6%] bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-lg font-mono text-[9px] text-slate-400 max-w-[210px] w-full"
            >
              <div className="border-b border-slate-800 pb-1 mb-1.5 text-slate-500 flex justify-between">
                <span>[INCOMING_SMTP]</span>
                <span className="text-red-400">ALERT</span>
              </div>
              <div className="space-y-0.5">
                <div><span className="text-slate-500">FROM:</span> accounting@guild-ops.net</div>
                <div><span className="text-slate-500">SUBJ:</span> [OVERDUE] Invoice approval #2904</div>
              </div>
            </motion.div>
          </div>

          {/* =========================================
              3D PERSPECTIVE GLASS PRISM WRAPPER
             ========================================= */}
          <div 
            className="w-full flex justify-center items-center select-none z-10"
            style={{ perspective: 1200 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div 
              className="relative w-[280px] h-[300px] preserve-3d"
              style={{
                transform: `rotateY(${angle}deg) rotateX(-8deg)`
              }}
            >
              
              {/* FACE 1: WORK TRACKING / KANBAN */}
              <div 
                className="absolute inset-0 w-[280px] h-[300px] backface-hidden glass rounded-3xl border-indigo-500/20 bg-indigo-50/15 shadow-xl p-5 flex flex-col dot-pattern"
                style={{ transform: `rotateY(0deg) translateZ(81px)` }}
              >
                {/* Structural Technical Border Overlay */}
                <div className="absolute inset-2 border border-indigo-500/5 rounded-[22px] pointer-events-none" />
                
                <div className="flex items-center justify-between text-indigo-800 border-b border-indigo-500/10 pb-3 mb-4 z-10">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4.5 w-4.5 text-indigo-600" />
                    <span className="font-bold text-xs font-mono uppercase tracking-wide">Tasks & Tickets</span>
                  </div>
                  <span className="font-mono text-[9px] text-slate-400">[MOD: TSK]</span>
                </div>
                
                <div className="flex-1 flex flex-col justify-between z-10">
                  <div className="space-y-3">
                    <div className="bg-white/80 p-3 rounded-2xl border border-indigo-500/10 shadow-xs relative">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] font-mono bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded-sm font-bold">HI_PRIORITY</span>
                        <span className="text-[8px] font-mono text-slate-400">ID: TSK-089</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 font-sans">Launch Production Server</h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-medium">Verify config rule paths, deploy bundle</p>
                    </div>

                    <div className="bg-white/60 p-2.5 rounded-xl border border-indigo-500/5 opacity-80 flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-700">Client Contract Sync</span>
                      <span className="text-[8px] font-mono bg-slate-100 text-slate-500 px-1 py-0.5 rounded-sm">MID</span>
                    </div>
                  </div>

                  <div className="bg-white/45 p-2 rounded-xl flex items-center justify-between text-[10px] text-slate-500 border border-indigo-500/5 font-mono">
                    <span>SYS_LOAD: <strong className="text-slate-800">4_ACTIVE</strong></span>
                    <span className="bg-indigo-600/10 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold">2_DONE</span>
                  </div>
                </div>
              </div>

              {/* FACE 2: TEAM CHAT */}
              <div 
                className="absolute inset-0 w-[280px] h-[300px] backface-hidden glass rounded-3xl border-cyan-500/20 bg-cyan-50/15 shadow-xl p-5 flex flex-col dot-pattern"
                style={{ transform: `rotateY(120deg) translateZ(81px)` }}
              >
                {/* Structural Technical Border Overlay */}
                <div className="absolute inset-2 border border-cyan-500/5 rounded-[22px] pointer-events-none" />

                <div className="flex items-center justify-between text-cyan-800 border-b border-cyan-500/10 pb-3 mb-4 z-10">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4.5 w-4.5 text-cyan-600" />
                    <span className="font-bold text-xs font-mono uppercase tracking-wide">Team Comms</span>
                  </div>
                  <span className="font-mono text-[9px] text-slate-400">[MOD: COM]</span>
                </div>

                <div className="flex-1 flex flex-col justify-between z-10">
                  <div className="space-y-3">
                    <div className="flex gap-2.5 items-start">
                      <div className="h-6 w-6 rounded-full bg-cyan-600 flex items-center justify-center text-[9px] text-white font-mono shrink-0 font-bold">
                        JD
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-2xl rounded-tl-none border border-cyan-500/10 text-[11px] text-slate-800 max-w-[85%] leading-normal font-sans">
                        Hey team, is the server contract sign-off pending?
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start justify-end">
                      <div className="bg-cyan-600 text-white p-2.5 rounded-2xl rounded-tr-none text-[11px] max-w-[85%] leading-normal shadow-xs font-sans">
                        Sent approval request, waiting for Ops review!
                      </div>
                      <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] text-white font-mono shrink-0 font-bold">
                        ME
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/45 p-2 rounded-xl flex items-center justify-between text-[10px] text-slate-500 border border-cyan-500/5 font-mono">
                    <span className="font-semibold text-cyan-800">#ops-sync</span>
                    <span className="text-[9px] bg-cyan-500/10 text-cyan-700 px-1.5 py-0.5 rounded-md font-bold">STREAMING</span>
                  </div>
                </div>
              </div>

              {/* FACE 3: APPROVALS & REQUESTS */}
              <div 
                className="absolute inset-0 w-[280px] h-[300px] backface-hidden glass rounded-3xl border-purple-500/20 bg-purple-50/15 shadow-xl p-5 flex flex-col dot-pattern"
                style={{ transform: `rotateY(240deg) translateZ(81px)` }}
              >
                {/* Structural Technical Border Overlay */}
                <div className="absolute inset-2 border border-purple-500/5 rounded-[22px] pointer-events-none" />

                <div className="flex items-center justify-between text-purple-700 border-b border-purple-500/10 pb-3 mb-4 z-10">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4.5 w-4.5 text-purple-600" />
                    <span className="font-bold text-xs font-mono uppercase tracking-wide">Approvals</span>
                  </div>
                  <span className="font-mono text-[9px] text-slate-400">[MOD: APR]</span>
                </div>

                <div className="flex-1 flex flex-col justify-between z-10">
                  <div className="space-y-3.5">
                    <div className="bg-white/80 p-3 rounded-2xl border border-purple-500/10 shadow-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-bold">FINANCE</span>
                        <span className="text-[8px] font-mono text-amber-500 font-bold bg-amber-50 px-1.5 py-0.5 rounded-sm">PENDING</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 font-sans">Server Budget Allocation</h4>
                      <p className="text-[10px] text-slate-600 mt-1 font-mono font-bold">$2,400.00 / Annually</p>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-[10px] shadow-sm active:scale-[0.97] transition-all cursor-pointer font-sans">
                        Approve
                      </button>
                      <button className="flex-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold py-2 rounded-xl text-[10px] shadow-sm active:scale-[0.97] transition-all cursor-pointer font-sans">
                        Decline
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/45 p-2 rounded-xl flex items-center justify-between text-[10px] text-slate-500 border border-purple-500/5 font-mono">
                    <span>AWAITING: <strong className="text-purple-700 font-bold">1_REQ</strong></span>
                    <span className="bg-purple-600/10 text-purple-700 px-1.5 py-0.5 rounded-md font-bold">SECURE_SIG</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* =========================================
              PRISM MANUAL SNAP CONTROL PANEL
             ========================================= */}
          <div className="mt-6 z-20 flex flex-col items-center gap-4 w-full max-w-[340px]">
            
            {/* Snapping Tabs */}
            <div className="flex bg-slate-100/80 backdrop-blur-md p-1 rounded-2xl border border-slate-200/50 w-full shadow-inner">
              <button 
                onClick={() => handleManualSnap(0)}
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
                onClick={() => handleManualSnap(1)}
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
                onClick={() => handleManualSnap(2)}
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

            {/* =========================================
                REAL-TIME TELEMETRY SYSTEM CONSOLE
               ========================================= */}
            <div className="font-mono text-[9px] text-slate-400 bg-slate-900 border border-slate-800 rounded-xl p-3 w-full max-w-[280px] space-y-1.5 select-none shadow-xl relative overflow-hidden">
              {/* Scanline overlay */}
              <div className="absolute inset-0 bg-linear-to-b from-transparent via-white/[0.01] to-transparent pointer-events-none bg-[length:100%_4px]" />
              
              <div className="flex justify-between border-b border-slate-800 pb-1 mb-1.5">
                <span className="text-indigo-400 font-bold flex items-center gap-1">
                  <Terminal className="h-3 w-3" /> TELEMETRY_CONSOLE v1.0.8
                </span>
                <span className="text-emerald-400 animate-pulse flex items-center gap-1">
                  <Cpu className="h-3 w-3" /> {fps.toFixed(2)} Hz
                </span>
              </div>
              <div className="flex justify-between">
                <span>ROTATION_Y:</span>
                <span className="text-white font-semibold">{angle.toFixed(4)}°</span>
              </div>
              <div className="flex justify-between">
                <span>ACTIVE_MODULE:</span>
                <span className="text-white font-semibold">
                  {activeIndex === 0 ? "TASKS_BOARD" : activeIndex === 1 ? "TEAM_CHAT" : "APPROVALS_FLOW"}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800 pt-1.5 mt-1.5">
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3 text-slate-500" /> STATE:
                </span>
                <span className={isManual ? "text-amber-400 font-bold" : "text-indigo-400 font-bold animate-pulse"}>
                  {isManual ? "LOCK_STEADY" : "AUTO_ORBIT"}
                </span>
              </div>

              {/* Resume auto button nested in telemetry as a command */}
              {isManual && (
                <div className="pt-2 border-t border-slate-800/80 mt-1 flex justify-center">
                  <button
                    onClick={() => setIsManual(false)}
                    className="w-full bg-slate-800 hover:bg-slate-750 text-indigo-400 hover:text-indigo-300 font-bold py-1 px-2.5 rounded-md text-[8px] border border-slate-700 active:scale-95 transition-all cursor-pointer text-center"
                  >
                    RUN CMD: RESUME_AUTO_ORBIT()
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
