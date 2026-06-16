import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  MessageSquare, 
  CheckSquare, 
  FileCheck, 
  Terminal, 
  Cpu, 
  Layers, 
  Sparkles, 
  Sliders, 
  Zap, 
  Activity, 
  Fingerprint,
  RefreshCw
} from 'lucide-react';
import { APP_URL } from '../../config/landingData';
import { useNavigation } from '../../context/NavigationContext';

export function HeroSection() {
  const { navigate } = useNavigation();
  const sectionRef = useRef<HTMLDivElement>(null);
  
  // Real-time animation states
  const [angle, setAngle] = useState(90); // Start showing Tasks front and center
  const [isHovered, setIsHovered] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [targetAngle, setTargetAngle] = useState(90);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  
  // Custom gravity & speed controls
  const [gravity, setGravity] = useState(30); // 0 = wide orbit, 100 = collapsed
  const [orbitSpeed, setOrbitSpeed] = useState(80); // 0 = paused, 200 = fast
  
  // Telemetry metrics
  const [fps, setFps] = useState(60);
  const lastTimeRef = useRef(performance.now());
  const fpsRef = useRef(60);
  const activeIndexRef = useRef(0);
  
  // Spotlight mouse track
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });

  // Snap targets for front-center positions (angle_deg where z is max)
  // Theta_i = angle_rad + i * 2PI/3 = PI/2 -> angle_deg = 90 - i * 120
  const snapTargets = [90, 330, 210]; // Tasks, Chat, Approvals

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMouseCoords({ x, y });
  };

  // requestAnimationFrame loop for smooth 3D rotation, snapping, and telemetry
  useEffect(() => {
    let frameId: number;

    const tick = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Calculate dynamic FPS
      const currentFps = delta > 0 ? 1000 / delta : 60;
      fpsRef.current = fpsRef.current * 0.96 + currentFps * 0.04;
      setFps(fpsRef.current);

      setAngle((prevAngle) => {
        let nextAngle = prevAngle;
        
        if (isManual) {
          // Linear interpolation to target snap angle
          const diff = targetAngle - prevAngle;
          if (Math.abs(diff) < 0.1) {
            nextAngle = targetAngle;
          } else {
            nextAngle += diff * 0.12; // LERP speed
          }
        } else {
          // Orbit auto-rotates (slows down on hover or specific card focus)
          const isPaused = hoveredNode !== null;
          const currentSpeed = isPaused ? 0.01 : isHovered ? (orbitSpeed / 100) * 0.08 : (orbitSpeed / 100) * 0.38;
          nextAngle = prevAngle + currentSpeed;
        }

        // Auto snap activeIndex tabs based on angle when orbiting automatically
        if (!isManual && orbitSpeed > 0) {
          const posAngle = ((nextAngle % 360) + 360) % 360;
          let closestIdx = 0;
          let minDiff = Infinity;
          
          snapTargets.forEach((target, idx) => {
            const d = Math.abs(((posAngle - target + 180) % 360) - 180);
            if (d < minDiff) {
              minDiff = d;
              closestIdx = idx;
            }
          });

          if (activeIndexRef.current !== closestIdx) {
            activeIndexRef.current = closestIdx;
            setActiveIndex(closestIdx);
          }
        }

        return nextAngle;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isManual, targetAngle, isHovered, hoveredNode, orbitSpeed]);

  const handleManualSnap = (index: number) => {
    setIsManual(true);
    setActiveIndex(index);
    activeIndexRef.current = index;

    // Shortest path snaps
    const currentAngle = angle;
    const baseAngle = Math.floor(currentAngle / 360) * 360;
    const targetBase = snapTargets[index];

    const options = [
      baseAngle - 360 + targetBase,
      baseAngle + targetBase,
      baseAngle + 360 + targetBase
    ];

    let bestTarget = options[0];
    let minDiff = Math.abs(options[0] - currentAngle);
    for (let i = 1; i < options.length; i++) {
      const diff = Math.abs(options[i] - currentAngle);
      if (diff < minDiff) {
        minDiff = diff;
        bestTarget = options[i];
      }
    }

    setTargetAngle(bestTarget);
  };

  // Metaphorical stats / states
  const isCollapsed = gravity >= 94;
  const gravityGs = (9.8 * (1 + gravity / 30)).toFixed(2);
  const velocityRads = ((orbitSpeed / 100) * 0.8).toFixed(2);

  // Generate real-time telemetry pulse wave SVG path
  const generatePulsePath = () => {
    let points = [];
    const speedFactor = orbitSpeed > 0 ? (orbitSpeed / 100) : 0.05;
    const phaseOffset = (angle * Math.PI) / 180;
    
    for (let i = 0; i <= 210; i += 6) {
      // Create a heart-beat style oscilloscope wave
      const baseWave = Math.sin((i / 15) - phaseOffset * 3.5) * 5;
      const spikeWave = i > 80 && i < 130 
        ? Math.sin((i / 4) - phaseOffset * 6) * 14 * Math.sin((i - 80) * Math.PI / 50) 
        : 0;
      const noise = Math.cos((i / 2) - phaseOffset * 8) * 1.5;
      
      const y = 20 + baseWave + spikeWave + noise;
      points.push(`${i},${y}`);
    }
    return `M ${points.join(' L ')}`;
  };

  // Orbit node calculator
  // Generates 3D spatial properties (X, Y, depth, scale, blur)
  const getOrbitalStyles = (index: number) => {
    if (isCollapsed) {
      return {
        transform: 'translate(-50%, -50%) scale(0) translate3d(0, 0, 0)',
        opacity: 0,
        zIndex: 0,
        filter: 'blur(8px)',
        pointerEvents: 'none' as const
      };
    }

    // Base orbit dimensions
    const baseRadiusX = 180; 
    const baseRadiusY = 60; // Tilted aspect ratio gives pseudo-3D look
    
    // Scale orbit based on current gravity setting
    const scaleFactor = 1 - (gravity / 100) * 0.82;
    const radiusX = baseRadiusX * scaleFactor;
    const radiusY = baseRadiusY * scaleFactor;

    // Convert angles to radians
    const angleRad = (angle * Math.PI) / 180;
    const nodeAngle = angleRad + (index * 2 * Math.PI) / 3;

    // 3D coordinates
    const x = Math.cos(nodeAngle) * radiusX;
    const y = Math.sin(nodeAngle) * radiusY;
    const z = Math.sin(nodeAngle) * baseRadiusX; // Pure depth tracking

    // Depth modifiers
    // front is z = baseRadiusX, back is z = -baseRadiusX
    const normalizedDepth = (z + baseRadiusX) / (2 * baseRadiusX); // 0 to 1
    
    const scale = 0.84 + normalizedDepth * 0.32; // 0.84x to 1.16x
    const opacity = 0.45 + normalizedDepth * 0.55; // 45% to 100%
    const zIndex = Math.round(50 + z); // Depth sorting
    const blurAmount = z < -30 ? Math.min(3, Math.abs(z + 30) / 45) : 0;

    return {
      transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) scale(${scale})`,
      opacity,
      zIndex,
      filter: blurAmount > 0 ? `blur(${blurAmount.toFixed(2)}px)` : 'none',
      transition: 'box-shadow 0.3s, border-color 0.3s'
    };
  };

  // Approvals Card digital signature state
  const [approvedState, setApprovedState] = useState(false);

  return (
    <section 
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative pt-32 md:pt-40 pb-24 px-6 overflow-hidden bg-slate-50/20 grid-pattern cursor-default font-sans"
      style={{
        '--mouse-x': `${mouseCoords.x}px`,
        '--mouse-y': `${mouseCoords.y}px`
      } as React.CSSProperties}
    >
      {/* Dynamic Cursor Spotlight Effect */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(450px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(99, 102, 241, 0.06), transparent 80%)`
        }}
      />

      {/* Floating Animated Mesh Background Blobs */}
      <div className="absolute top-[8%] left-[6%] w-[450px] h-[450px] rounded-full bg-radial from-indigo-500/8 to-transparent blur-[120px] animate-drift pointer-events-none z-0" />
      <div className="absolute top-[15%] right-[6%] w-[450px] h-[450px] rounded-full bg-radial from-cyan-500/8 to-transparent blur-[120px] animate-drift-reverse pointer-events-none z-0" />
      <div className="absolute bottom-[5%] left-[30%] w-[380px] h-[380px] rounded-full bg-radial from-purple-500/5 to-transparent blur-[110px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
        
        {/* Left Column: Premium Brand Messaging */}
        <div className="lg:col-span-6 text-left flex flex-col justify-center select-none">
          
          {/* Animated Header Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-xs backdrop-blur-md mb-6 hover:border-indigo-300 transition-colors"
          >
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-800 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-500" /> Introducing Guild Orbit 2.0
            </span>
          </motion.div>

          {/* Staggered Heading Reveal */}
          <h1 className="text-[clamp(2.5rem,5.2vw,4.25rem)] font-extrabold tracking-tight leading-[1.05] text-slate-900 font-sans">
            <motion.span
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="block"
            >
              The gravity your
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="text-gradient-cosmic block mt-1"
            >
              operations demand.
            </motion.span>
          </h1>

          {/* Subtext */}
          <motion.h2 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl font-bold text-slate-800 mt-6 leading-relaxed font-sans"
          >
            Bring tasks, chat, and approvals into perfect sync.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="mt-4 text-sm md:text-base text-slate-500 max-w-xl leading-relaxed font-medium"
          >
            Stop chasing fragmented threads across five different tools. Unify your team's chats, Kanban boards, leave approvals, and execution metrics in one fast, lightweight dashboard designed for agile operations.
          </motion.p>

          {/* Call-to-actions */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-8 flex flex-col sm:flex-row items-center gap-4"
          >
            <a
              href={`${APP_URL}/signup`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-7 py-4 rounded-2xl shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-[0.98] hover:-translate-y-0.5 cursor-pointer hover:neon-glow-indigo"
            >
              Start free workspace
              <ArrowRight className="h-4.5 w-4.5" />
            </a>
            <button
              onClick={() => navigate('/features')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200/80 hover:border-slate-350 px-6.5 py-4 rounded-2xl transition-all shadow-xs cursor-pointer hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Explore features
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>

        {/* Right Column: Orbital Simulator Stage */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[460px] md:min-h-[520px]">
          
          {/* Main 3D Interactive Stage Container */}
          <div 
            className="w-full relative flex items-center justify-center min-h-[360px] md:min-h-[380px] select-none"
            style={{ perspective: 1200 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
              setIsHovered(false);
              setHoveredNode(null);
            }}
          >
            {/* Ambient System Orbit Circles (Visual representation of paths) */}
            {!isCollapsed && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
                {/* Large outer path */}
                <svg className="w-full h-full max-w-[420px] opacity-[0.25]" viewBox="0 0 300 200">
                  <ellipse 
                    cx="150" 
                    cy="100" 
                    rx="110" 
                    ry="35" 
                    stroke="url(#orbitGradient)" 
                    strokeWidth="1.2" 
                    strokeDasharray="4 4" 
                    fill="none" 
                  />
                  <defs>
                    <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="50%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}

            {/* =========================================
                THE GRAVITY CORE (Platform Anchor)
               ========================================= */}
            <div className="absolute z-40 flex items-center justify-center">
              <motion.div
                animate={{
                  scale: isCollapsed ? [1, 1.4, 1.25] : [1, 1.08, 1],
                  rotate: isCollapsed ? 360 : 0
                }}
                transition={{
                  scale: { 
                    repeat: isCollapsed ? 0 : Infinity, 
                    duration: isCollapsed ? 0.4 : 3, 
                    ease: "easeInOut" 
                  },
                  rotate: { duration: 15, repeat: Infinity, ease: "linear" }
                }}
                className={`rounded-full flex items-center justify-center transition-all duration-500 relative cursor-pointer ${
                  isCollapsed 
                    ? 'w-36 h-36 bg-gradient-to-tr from-violet-600 via-indigo-650 to-emerald-400 neon-glow-indigo ring-8 ring-indigo-500/10' 
                    : 'w-20 h-20 bg-slate-900 border border-slate-800/80 shadow-2xl shadow-indigo-500/20 hover:scale-105 active:scale-95'
                }`}
                onClick={() => {
                  // Resets collapse if user clicks the collapsed star
                  if (isCollapsed) {
                    setGravity(30);
                  } else {
                    setGravity(100);
                  }
                }}
              >
                {/* Glowing Core Background Radial */}
                <div className="absolute inset-0 rounded-full gravity-core-glow opacity-80" />

                {/* Core Icon / Text */}
                <div className="relative z-10 flex flex-col items-center text-center text-white">
                  {isCollapsed ? (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex flex-col items-center"
                    >
                      <Zap className="h-7 w-7 text-emerald-300 animate-bounce" />
                      <span className="text-[9px] font-mono font-extrabold tracking-widest mt-1 uppercase text-emerald-200">
                        UNIFIED
                      </span>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <img src="/logo.png" alt="" className="h-6 w-6 rounded-md mb-0.5 animate-pulse-slow" />
                      <span className="text-[7.5px] font-mono tracking-wider text-slate-400 font-bold uppercase">
                        GUILD
                      </span>
                    </div>
                  )}
                </div>

                {/* Satellite Core Accents */}
                {!isCollapsed && (
                  <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping opacity-30 pointer-events-none" />
                )}
              </motion.div>
            </div>

            {/* =========================================
                ORBITAL FLOATING NODES (3D sorting)
               ========================================= */}

            {/* CARD 1: TASKS & TICKETS */}
            <div 
              style={getOrbitalStyles(0)}
              onMouseEnter={() => setHoveredNode(0)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleManualSnap(0)}
              className={`absolute top-1/2 left-1/2 w-[245px] h-[155px] glass rounded-2xl p-4 shadow-xl border cursor-pointer select-none flex flex-col justify-between transition-colors duration-300 ${
                activeIndex === 0 && !isCollapsed
                  ? 'border-indigo-500/50 bg-indigo-50/15 shadow-indigo-500/5 ring-1 ring-indigo-500/10' 
                  : 'border-slate-200/60 bg-white/70 hover:border-indigo-300'
              }`}
            >
              <div className="absolute inset-1.5 border border-indigo-500/5 rounded-xl pointer-events-none" />
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-indigo-500/10 pb-2 mb-2 z-10">
                <div className="flex items-center gap-1.5 text-indigo-800">
                  <CheckSquare className="h-4 w-4 text-indigo-600" />
                  <span className="font-extrabold text-[10px] font-mono uppercase tracking-wide">Tasks Board</span>
                </div>
                <span className="font-mono text-[8px] text-slate-400 font-bold">[MOD: TSK]</span>
              </div>

              {/* Card Body */}
              <div className="flex-1 flex flex-col justify-between z-10 mt-1">
                <div className="bg-white/90 p-2 rounded-xl border border-indigo-500/5 shadow-xs">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[7px] font-mono bg-rose-500/10 text-rose-600 px-1 py-0.2 rounded-xs font-bold uppercase tracking-wider">High</span>
                    <span className="text-[7.5px] font-mono text-slate-400 font-medium">TSK-104</span>
                  </div>
                  <h4 className="text-[10.5px] font-extrabold text-slate-800 truncate leading-snug">Deploy Production CDN</h4>
                  
                  {/* Task list simulation */}
                  <div className="mt-1.5 space-y-0.5 text-[8.5px] font-medium text-slate-500">
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span className="line-through text-slate-400">Resolve DNS records</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-slate-600 font-bold">Compile asset bundler</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2 flex items-center justify-between text-[8.5px] text-slate-400 font-mono">
                  <div className="flex-grow mr-2 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-650 h-full rounded-full w-[50%] transition-all duration-300" />
                  </div>
                  <span className="font-bold text-indigo-700">50%</span>
                </div>
              </div>
            </div>

            {/* CARD 2: TEAM COMMS */}
            <div 
              style={getOrbitalStyles(1)}
              onMouseEnter={() => setHoveredNode(1)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleManualSnap(1)}
              className={`absolute top-1/2 left-1/2 w-[245px] h-[155px] glass rounded-2xl p-4 shadow-xl border cursor-pointer select-none flex flex-col justify-between transition-colors duration-300 ${
                activeIndex === 1 && !isCollapsed
                  ? 'border-cyan-500/50 bg-cyan-50/15 shadow-cyan-500/5 ring-1 ring-cyan-500/10' 
                  : 'border-slate-200/60 bg-white/70 hover:border-cyan-300'
              }`}
            >
              <div className="absolute inset-1.5 border border-cyan-500/5 rounded-xl pointer-events-none" />
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2 mb-2 z-10">
                <div className="flex items-center gap-1.5 text-cyan-800">
                  <MessageSquare className="h-4 w-4 text-cyan-600" />
                  <span className="font-extrabold text-[10px] font-mono uppercase tracking-wide">Team Comms</span>
                </div>
                <span className="font-mono text-[8px] text-slate-400 font-bold">[MOD: COM]</span>
              </div>

              {/* Card Body */}
              <div className="flex-1 flex flex-col justify-between z-10 space-y-1.5">
                <div className="space-y-1.5 mt-0.5">
                  <div className="flex gap-2 items-start">
                    <div className="h-5.5 w-5.5 rounded-full bg-cyan-650 flex items-center justify-center text-[8px] text-white font-mono shrink-0 font-bold">
                      SO
                    </div>
                    <div className="bg-white/90 p-2 rounded-xl rounded-tl-none border border-slate-100 text-[9.5px] text-slate-705 max-w-[85%] leading-normal font-sans shadow-2xs font-semibold">
                      Is CDN deploy pending?
                    </div>
                  </div>

                  <div className="flex gap-2 items-start justify-end">
                    <div className="bg-cyan-600 text-white p-2 rounded-xl rounded-tr-none text-[9.5px] max-w-[85%] leading-normal font-semibold shadow-2xs font-sans">
                      Waiting for budget sign-off.
                    </div>
                    <div className="h-5.5 w-5.5 rounded-full bg-indigo-600 flex items-center justify-center text-[8px] text-white font-mono shrink-0 font-bold">
                      ME
                    </div>
                  </div>
                </div>

                {/* Animated Typing Indicator */}
                <div className="flex items-center justify-between text-[8px] text-slate-400 border-t border-slate-100/50 pt-1.5 font-mono">
                  <span className="font-semibold text-cyan-700">#cdn-sync</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-400">Sarah is typing</span>
                    <div className="flex gap-0.5 mt-0.5">
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" />
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: REQUESTS & APPROVALS */}
            <div 
              style={getOrbitalStyles(2)}
              onMouseEnter={() => setHoveredNode(2)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleManualSnap(2)}
              className={`absolute top-1/2 left-1/2 w-[245px] h-[155px] glass rounded-2xl p-4 shadow-xl border cursor-pointer select-none flex flex-col justify-between transition-colors duration-300 ${
                activeIndex === 2 && !isCollapsed
                  ? 'border-purple-500/50 bg-purple-50/15 shadow-purple-500/5 ring-1 ring-purple-500/10' 
                  : 'border-slate-200/60 bg-white/70 hover:border-purple-300'
              }`}
            >
              <div className="absolute inset-1.5 border border-purple-500/5 rounded-xl pointer-events-none" />
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-purple-500/10 pb-2 mb-2 z-10">
                <div className="flex items-center gap-1.5 text-purple-800">
                  <FileCheck className="h-4 w-4 text-purple-600" />
                  <span className="font-extrabold text-[10px] font-mono uppercase tracking-wide">Approvals</span>
                </div>
                <span className="font-mono text-[8px] text-slate-400 font-bold">[MOD: APR]</span>
              </div>

              {/* Card Body */}
              <div className="flex-1 flex flex-col justify-between z-10">
                <div className="bg-white/90 p-2 rounded-xl border border-purple-500/5 shadow-xs relative">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[7px] font-mono bg-purple-100 text-purple-750 px-1 py-0.2 rounded-xs font-bold uppercase tracking-wider">Finance</span>
                    <span className={`text-[7px] font-mono px-1 py-0.2 rounded-xs font-bold uppercase tracking-wider ${
                      approvedState 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-50 text-amber-500 animate-pulse'
                    }`}>
                      {approvedState ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <h4 className="text-[10px] font-extrabold text-slate-800">CDN Expansion Budget</h4>
                  <p className="text-[10.5px] text-slate-800 font-bold font-mono mt-0.5">$180.00 / month</p>
                </div>

                {/* Signature buttons */}
                <div className="mt-2 flex gap-2">
                  {approvedState ? (
                    <motion.button 
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setApprovedState(false);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-[9px] shadow-sm transition-all active:scale-[0.98] cursor-pointer font-sans uppercase tracking-wide flex items-center justify-center gap-1"
                    >
                      <Fingerprint className="h-3.5 w-3.5" /> Approved By Admin
                    </motion.button>
                  ) : (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setApprovedState(true);
                        }}
                        className="flex-1 bg-purple-650 hover:bg-purple-700 text-white font-bold py-1.5 rounded-lg text-[9px] shadow-sm transition-all active:scale-[0.98] cursor-pointer font-sans"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="flex-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold py-1.5 rounded-lg text-[9px] shadow-sm transition-all active:scale-[0.98] cursor-pointer font-sans"
                      >
                        Decline
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* =========================================
              THE COMMAND AND SYNTAX CONSOLE DECK
             ========================================= */}
          <div className="mt-6 z-20 flex flex-col md:grid md:grid-cols-12 gap-4 w-full max-w-[510px]">
            
            {/* Left Column: Module snap tabs & Live Oscilloscope */}
            <div className="col-span-6 flex flex-col gap-3">
              {/* Module select tabs */}
              <div className="flex bg-slate-100/90 backdrop-blur-md p-1 rounded-xl border border-slate-200/50 w-full shadow-inner select-none">
                <button 
                  onClick={() => handleManualSnap(0)}
                  disabled={isCollapsed}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[10px] font-extrabold transition-all duration-300 cursor-pointer ${
                    activeIndex === 0 && !isCollapsed
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/30' 
                      : 'text-slate-550 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <CheckSquare className="h-3 w-3" />
                  Tasks
                </button>
                <button 
                  onClick={() => handleManualSnap(1)}
                  disabled={isCollapsed}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[10px] font-extrabold transition-all duration-300 cursor-pointer ${
                    activeIndex === 1 && !isCollapsed
                      ? 'bg-white text-cyan-800 shadow-xs border border-slate-200/30' 
                      : 'text-slate-550 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <MessageSquare className="h-3 w-3" />
                  Chat
                </button>
                <button 
                  onClick={() => handleManualSnap(2)}
                  disabled={isCollapsed}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[10px] font-extrabold transition-all duration-300 cursor-pointer ${
                    activeIndex === 2 && !isCollapsed
                      ? 'bg-white text-purple-700 shadow-xs border border-slate-200/30' 
                      : 'text-slate-550 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <FileCheck className="h-3 w-3" />
                  Approvals
                </button>
              </div>

              {/* Live Telemetry monitor console */}
              <div className="font-mono text-[9px] text-slate-400 bg-slate-900 border border-slate-800 rounded-xl p-3 w-full space-y-1.5 select-none shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[110px]">
                <div className="absolute inset-0 gravity-scanline pointer-events-none" />
                
                <div className="flex justify-between border-b border-slate-800 pb-1 z-10">
                  <span className="text-indigo-400 font-bold flex items-center gap-1">
                    <Terminal className="h-3 w-3" /> SYSTEM_DECK v2.1
                  </span>
                  <span className="text-emerald-400 animate-pulse flex items-center gap-1">
                    <Cpu className="h-3 w-3" /> {fps.toFixed(1)} Hz
                  </span>
                </div>
                
                <div className="space-y-1 z-10 mt-1">
                  <div className="flex justify-between">
                    <span>ACTIVE_CARD:</span>
                    <span className="text-white font-bold">
                      {isCollapsed ? "SYSTEM_COLLAPSED" : activeIndex === 0 ? "TASKS_KNB" : activeIndex === 1 ? "CHAT_DMS" : "APPROVAL_APR"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>GRAVITY_FORCE:</span>
                    <span className="text-white font-bold">{isCollapsed ? "MAX (COLLAPSED)" : `${gravityGs} Gs`}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-800 pt-1">
                    <span className="flex items-center gap-1">
                      <Layers className="h-2.5 w-2.5 text-slate-500" /> STATE:
                    </span>
                    <span className={`font-bold ${
                      isCollapsed 
                        ? "text-rose-500 animate-pulse" 
                        : isManual 
                          ? "text-amber-400" 
                          : "text-indigo-400"
                    }`}>
                      {isCollapsed ? "FUSED_CORE" : isManual ? "LOCKED_SPEC" : "AUTO_ORBIT"}
                    </span>
                  </div>
                </div>

                {/* CMD reset orbit button */}
                {isManual && !isCollapsed && (
                  <button
                    onClick={() => setIsManual(false)}
                    className="w-full bg-slate-800 hover:bg-slate-755 text-indigo-400 hover:text-indigo-300 font-extrabold py-0.5 px-2 rounded border border-slate-750 active:scale-95 transition-all cursor-pointer text-center text-[7.5px] mt-1.5 z-10 uppercase tracking-wider flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="h-2 w-2" /> Resume Auto Orbit()
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Physics range sliders & Oscilloscope Wave */}
            <div className="col-span-6 flex flex-col justify-between gap-3">
              {/* Physics synth control sliders */}
              <div className="flex flex-col gap-2.5 bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs">
                
                {/* Gravity Pull range slider */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-center text-[9.5px] font-extrabold text-slate-650 uppercase tracking-wider mb-1 font-mono">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-500" /> Operations Gravity
                    </span>
                    <span className="text-indigo-650">{gravity}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={gravity}
                    onChange={(e) => {
                      setGravity(Number(e.target.value));
                      if (isCollapsed) {
                        setIsManual(false);
                      }
                    }}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[7px] text-slate-450 font-bold font-mono mt-0.5">
                    <span>Fragmented</span>
                    <span className="text-indigo-500">Unified</span>
                  </div>
                </div>

                {/* Orbit Speed range slider */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-center text-[9.5px] font-extrabold text-slate-650 uppercase tracking-wider mb-1 font-mono">
                    <span className="flex items-center gap-1">
                      <Sliders className="h-3 w-3 text-cyan-600" /> Orbit Velocity
                    </span>
                    <span className="text-cyan-700">{orbitSpeed}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="200" 
                    value={orbitSpeed}
                    disabled={isCollapsed}
                    onChange={(e) => {
                      setOrbitSpeed(Number(e.target.value));
                      setIsManual(false); // Unlocks manual snap locks on speed change
                    }}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <div className="flex justify-between text-[7px] text-slate-450 font-bold font-mono mt-0.5">
                    <span>Static</span>
                    <span className="text-cyan-500">Express</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Oscilloscope Display Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 w-full shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[64px] select-none">
                <div className="absolute inset-0 gravity-scanline pointer-events-none" />
                <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 border-b border-slate-850 pb-1 mb-1.5 z-10">
                  <span className="flex items-center gap-1 font-extrabold text-slate-400">
                    <Activity className="h-2.5 w-2.5 text-emerald-400 animate-pulse" /> ORBITAL_FREQUENCY
                  </span>
                  <span>VELOCITY: {velocityRads} rad/s</span>
                </div>
                
                {/* SVG Oscilloscope Line Wave */}
                <svg className="w-full h-10 overflow-visible z-10" viewBox="0 0 210 40">
                  <motion.path 
                    d={generatePulsePath()} 
                    fill="none" 
                    stroke={isCollapsed ? "#f43f5e" : "#10b981"} 
                    strokeWidth="1.5"
                    className="transition-colors duration-500"
                  />
                </svg>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
