import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  CheckSquare, 
  MessageSquare, 
  FileCheck, 
  Terminal, 
  Cpu, 
  Layers, 
  Sparkles, 
  Sliders, 
  Zap, 
  Activity, 
  Fingerprint, 
  RefreshCw, 
  AlertTriangle, 
  ShieldCheck, 
  Mail, 
  MessageCircle, 
  Table, 
  Check, 
  Trello, 
  Send,
  Play
} from 'lucide-react';
import { APP_URL } from '../../config/landingData';
import { useNavigation } from '../../context/NavigationContext';

interface DebrisItem {
  id: string;
  label: string;
  icon: 'whatsapp' | 'spreadsheet' | 'mail' | 'trello';
  color: string;
  angleOffset: number;
  radiusOffset: number;
  yOffset: number;
  speed: number;
  active: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

export function HeroSection() {
  const { navigate } = useNavigation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const oscRef = useRef<HTMLCanvasElement>(null);

  // Core physics states
  const [angle, setAngle] = useState(90);
  const [isHovered, setIsHovered] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [targetAngle, setTargetAngle] = useState(90);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  // Interactive controls
  const [gravity, setGravity] = useState(45); // 10 = chaos/debris float, 100 = collapsed
  const [orbitSpeed, setOrbitSpeed] = useState(70); // 0 = paused, 200 = fast

  // Telemetry metric states
  const [fps, setFps] = useState(60);
  const [systemAlignment, setSystemAlignment] = useState(45);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '[INIT] Guild Gravity Deck v3.0 online.',
    '[SYSTEM] Operations entropy detected. System running in hybrid orbit.',
    '[OK] Space grid coordinates synchronized.'
  ]);
  
  // Spotlight cursor tracking
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });

  // Floating debris state representing WhatsApp, Excel, Gmail, Jira
  const [debris, setDebris] = useState<DebrisItem[]>([
    { id: 'wa', label: 'WhatsApp Groups', icon: 'whatsapp', color: '#10b981', angleOffset: 45, radiusOffset: 245, yOffset: -50, speed: 0.85, active: true },
    { id: 'xls', label: 'Spreadsheets v2', icon: 'spreadsheet', color: '#059669', angleOffset: 165, radiusOffset: 220, yOffset: 40, speed: 1.05, active: true },
    { id: 'mail', label: 'Spammy Email Threads', icon: 'mail', color: '#f43f5e', angleOffset: 285, radiusOffset: 260, yOffset: -15, speed: 0.7, active: true },
    { id: 'trello', label: 'Scattered Jira Tickets', icon: 'trello', color: '#3b82f6', angleOffset: 110, radiusOffset: 235, yOffset: 55, speed: 1.15, active: true }
  ]);

  // Canvas interactive particle bursts
  const particlesRef = useRef<Particle[]>([]);

  // Snap targets corresponding to Tasks, Comms, Approvals front-center depth
  const snapTargets = [90, 330, 210]; 

  // Interactive Card Internal States
  // 1. Tasks Card checklist
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Finalize server edge migration', checked: true },
    { id: 2, text: 'Confirm QA budget allocations', checked: false },
    { id: 3, text: 'Sign SSL security protocol certs', checked: false }
  ]);

  // 2. Comms Card typing and messaging loop
  const [messages, setMessages] = useState([
    { sender: 'Sarah (Ops)', text: 'Are the server migration steps approved?', time: '12:02' },
    { sender: 'Alex (Dev)', text: 'Waiting on financial budget sign-off.', time: '12:03' }
  ]);
  const [isTyping, setIsTyping] = useState(true);
  const commLoopRef = useRef(0);

  // 3. Approvals Card approved indicator
  const [approvedState, setApprovedState] = useState(false);

  // Handle cursor hover illumination tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMouseCoords({ x, y });
  };

  // Add line to terminal logs helper
  const addLog = (log: string) => {
    setTerminalLogs((prev) => {
      const time = new Date().toLocaleTimeString().split(' ')[0];
      const newLog = `[${time}] ${log}`;
      return [...prev.slice(-4), newLog]; // Keep last 5 logs
    });
  };

  // Dynamic system alignment based on gravity and remaining debris
  useEffect(() => {
    const activeDebrisCount = debris.filter(d => d.active).length;
    const alignmentScore = Math.round(
      (gravity / 100) * 60 + (4 - activeDebrisCount) * 10
    );
    setSystemAlignment(Math.min(100, Math.max(10, alignmentScore)));
  }, [gravity, debris]);

  // Card Checklist handler
  const toggleTask = (id: number) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, checked: !t.checked } : t);
      const target = updated.find(t => t.id === id);
      addLog(`Task '${target?.text.slice(0, 18)}...' ${target?.checked ? 'completed ✓' : 'reopened'}`);
      
      // Spark a mini purple-indigo particle burst on checking
      if (target?.checked) {
        generateBurst(0, '#818cf8', 12);
      }
      return updated;
    });
  };

  const completedCount = tasks.filter(t => t.checked).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  // Team Comms auto message script loop
  useEffect(() => {
    let timer: number;
    const runCommsLoop = () => {
      setIsTyping(true);
      timer = window.setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => {
          if (commLoopRef.current === 0) {
            commLoopRef.current = 1;
            addLog('New sync message from Sarah in #cdn-deployment');
            generateBurst(1, '#22d3ee', 8);
            return [
              ...prev,
              { sender: 'Sarah (Ops)', text: 'Just signed off! Deploy whenever ready.', time: '12:04' }
            ];
          } else {
            commLoopRef.current = 0;
            // Reset thread
            return [
              { sender: 'Sarah (Ops)', text: 'Are the server migration steps approved?', time: '12:02' },
              { sender: 'Alex (Dev)', text: 'Waiting on financial budget sign-off.', time: '12:03' }
            ];
          }
        });
        
        // Loop again
        timer = window.setTimeout(runCommsLoop, 8000);
      }, 3000);
    };

    timer = window.setTimeout(runCommsLoop, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Approvals signoff handler
  const handleApprove = () => {
    setApprovedState(true);
    addLog('Budget signoff APR-702 secured by admin');
    generateBurst(2, '#34d399', 24); // Heavy green spark explosion
  };

  // Generate canvas-based particle bursts
  const generateBurst = (cardIndex: number, color: string, count: number) => {
    const coords = getOrbitalPos(cardIndex);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    // Create new particles
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angleRad = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      newParticles.push({
        id: Math.random(),
        x: cx + coords.x,
        y: cy + coords.y,
        vx: Math.cos(angleRad) * speed,
        vy: Math.sin(angleRad) * speed,
        color,
        size: 2 + Math.random() * 3,
        alpha: 1.0,
        decay: 0.015 + Math.random() * 0.02
      });
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];
  };

  // Math-based 3D coordinate orbital projection
  const getOrbitalPos = (index: number) => {
    const isCollapsed = gravity >= 95;
    if (isCollapsed) {
      return { x: 0, y: 0, scale: 0, opacity: 0, zIndex: 0, blur: 8 };
    }

    // Decay orbit radius based on gravity (high gravity = compact orbit)
    const currentRadius = 195 * (1 - (gravity / 100) * 0.68);
    const tilt = 0.45; // Orbital slant angle
    const d = 460; // 3D Camera distance perspective

    const angleRad = (angle * Math.PI) / 180;
    const nodeAngle = angleRad + (index * 2 * Math.PI) / 3;

    // 3D coordinates on elliptical plane
    const x3 = currentRadius * Math.cos(nodeAngle);
    const y3 = currentRadius * Math.sin(nodeAngle) * Math.cos(tilt);
    const z3 = currentRadius * Math.sin(nodeAngle) * Math.sin(tilt);

    // Perspective projection formula
    const factor = d / (d - z3);
    const xProj = x3 * factor;
    const yProj = y3 * factor;

    const zIndex = Math.round(50 + z3);
    const blur = z3 < -60 ? Math.min(3, Math.abs(z3 + 60) / 45) : 0;

    return {
      x: xProj,
      y: yProj,
      scale: factor * 0.96,
      opacity: 0.45 + 0.55 * ((z3 + currentRadius) / (2 * currentRadius)),
      zIndex,
      blur
    };
  };

  // Projection for scattered operational debris
  const getDebrisPos = (item: DebrisItem) => {
    const isPulled = gravity >= 68;
    
    // Scale orbital distance down to zero if gravity pulls them in
    const pullFactor = Math.max(0, (gravity - 30) / 70); 
    const currentRadius = item.radiusOffset * (1 - pullFactor);
    const tilt = 0.45;
    const d = 460;

    const angleRad = ((angle * item.speed + item.angleOffset) * Math.PI) / 180;

    const x3 = currentRadius * Math.cos(angleRad);
    const y3 = currentRadius * Math.sin(angleRad) * Math.cos(tilt) + item.yOffset * (1 - pullFactor);
    const z3 = currentRadius * Math.sin(angleRad) * Math.sin(tilt);

    const factor = d / (d - z3);
    const xProj = x3 * factor;
    const yProj = y3 * factor;

    const zIndex = Math.round(35 + z3);
    // Fade opacity out as they approach the center core to simulate dissolving
    const opacity = item.active 
      ? (0.4 + 0.6 * ((z3 + item.radiusOffset) / (2 * item.radiusOffset))) * (currentRadius / item.radiusOffset)
      : 0;

    return {
      x: xProj,
      y: yProj,
      scale: factor * 0.72,
      opacity,
      zIndex,
      visible: item.active && opacity > 0.05
    };
  };

  // Trigger manual lock snap for orbit modules
  const handleManualSnap = (index: number) => {
    if (gravity >= 95) return;
    setIsManual(true);
    setActiveIndex(index);
    addLog(`Snapping system focus to card MODULE_${index === 0 ? 'TASKS' : index === 1 ? 'COMMS' : 'APPROVALS'}`);

    const currentAngle = angle;
    const baseAngle = Math.floor(currentAngle / 360) * 360;
    const targetBase = snapTargets[index];

    // Compute shortest rotational direction LERP
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

  // Main rendering loop (canvas drawing, debris swallowing, oscilloscope drawing)
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();
    let fpsAcc = 60;

    const tick = () => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      // Calculate smooth FPS metrics
      const currentFps = delta > 0 ? 1000 / delta : 60;
      fpsAcc = fpsAcc * 0.95 + currentFps * 0.05;
      setFps(fpsAcc);

      // 1. Update orbital angle rotation
      setAngle((prevAngle) => {
        let nextAngle = prevAngle;
        if (isManual) {
          const diff = targetAngle - prevAngle;
          if (Math.abs(diff) < 0.15) {
            nextAngle = targetAngle;
          } else {
            nextAngle += diff * 0.12; // LERP snap speeds
          }
        } else {
          const isPaused = hoveredNode !== null;
          // Slowly rotate, slowing down slightly on hover
          const currentSpeed = isPaused ? 0.02 : isHovered ? (orbitSpeed / 100) * 0.1 : (orbitSpeed / 100) * 0.35;
          nextAngle = prevAngle + currentSpeed;
        }

        // Automatic center snap calculations when orbiting freely
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

          if (activeIndex !== closestIdx) {
            setActiveIndex(closestIdx);
          }
        }

        return nextAngle;
      });

      // 2. Check operational debris swallow conditions
      setDebris((prevDebris) => {
        let updated = false;
        const nextDebris = prevDebris.map((item) => {
          if (!item.active) return item;

          const pullFactor = Math.max(0, (gravity - 30) / 70); 
          const currentRadius = item.radiusOffset * (1 - pullFactor);

          // Swallow debris near the core gravity field
          if (currentRadius < 15) {
            updated = true;
            addLog(`Swallowed & dissolved fragmented tool: ${item.label.toUpperCase()}`);
            
            // Trigger explosion sparks at center (0,0)
            const canvas = canvasRef.current;
            if (canvas) {
              const cx = canvas.width / 2;
              const cy = canvas.height / 2;
              const splashCount = 16;
              const newParticles: Particle[] = [];
              for (let i = 0; i < splashCount; i++) {
                const angleRad = Math.random() * Math.PI * 2;
                const speed = 1.0 + Math.random() * 3.0;
                newParticles.push({
                  id: Math.random(),
                  x: cx,
                  y: cy + item.yOffset * (1 - pullFactor),
                  vx: Math.cos(angleRad) * speed,
                  vy: Math.sin(angleRad) * speed,
                  color: item.color,
                  size: 2.5 + Math.random() * 2,
                  alpha: 1.0,
                  decay: 0.025 + Math.random() * 0.02
                });
              }
              particlesRef.current = [...particlesRef.current, ...newParticles];
            }

            return { ...item, active: false };
          }
          return item;
        });
        return updated ? nextDebris : prevDebris;
      });

      // 3. Update canvas particles
      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          alpha: p.alpha - p.decay
        }))
        .filter((p) => p.alpha > 0);

      // 4. Render main space grid & vectors
      renderCanvas();

      // 5. Render live oscilloscope wave
      renderOscilloscope();

      frameId = requestAnimationFrame(tick);
    };

    // Main 3D Canvas Drawer
    const renderCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle retina displays
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }

      const width = rect.width;
      const height = rect.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Draw Orbit Slant Grid Ellipse Guide
      if (gravity < 95) {
        const orbitRadius = 195 * (1 - (gravity / 100) * 0.68);
        const tilt = 0.45;

        // Draw outer orbit ring
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, orbitRadius, orbitRadius * Math.cos(tilt), 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.restore();

        // Draw connector vectors to 3 active module nodes
        [0, 1, 2].forEach((idx) => {
          const cardPos = getOrbitalPos(idx);
          const active = activeIndex === idx;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + cardPos.x, cy + cardPos.y);

          // Custom colors per module
          const strokeColors = ['rgba(129, 140, 248, ', 'rgba(34, 211, 238, ', 'rgba(168, 85, 247, '];
          ctx.strokeStyle = `${strokeColors[idx]}${active ? '0.28)' : '0.08)'}`;
          ctx.lineWidth = active ? 2.5 : 1;
          
          if (active) {
            // Animating dash pulses traveling down the vector
            ctx.setLineDash([5, 10]);
            ctx.lineDashOffset = -((performance.now() / 15) % 15);
            ctx.shadowColor = idx === 0 ? '#818cf8' : idx === 1 ? '#22d3ee' : '#a855f7';
            ctx.shadowBlur = 4;
          } else {
            ctx.setLineDash([3, 5]);
          }
          ctx.stroke();
          ctx.restore();
        });
      }

      // Render sparks particles
      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x / dpr, p.y / dpr, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
      });
    };

    // Draw retro command deck oscilloscope
    const renderOscilloscope = () => {
      const osc = oscRef.current;
      if (!osc) return;
      const ctx = osc.getContext('2d');
      if (!ctx) return;

      const rect = osc.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (osc.width !== rect.width * dpr || osc.height !== rect.height * dpr) {
        osc.width = rect.width * dpr;
        osc.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }

      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.beginPath();
      
      const isCollapsed = gravity >= 95;
      const speedFactor = isCollapsed ? 0.05 : orbitSpeed / 100;
      const phase = (angle * Math.PI) / 180 * 2.5;
      
      for (let x = 0; x < w; x++) {
        // Compose a complex telemetry waveform with harmonics
        const baseSine = Math.sin((x / 18) - phase) * 8;
        const harmonic = Math.sin((x / 6) + phase * 1.5) * 3;
        const noise = (Math.random() - 0.5) * (isCollapsed ? 2.5 : 0.8);
        
        const y = (h / 2) + (baseSine + harmonic + noise) * speedFactor;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = isCollapsed ? '#f43f5e' : '#34d399';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = isCollapsed ? '#f43f5e' : '#34d399';
      ctx.shadowBlur = 5;
      ctx.stroke();
      ctx.restore();
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [angle, isManual, targetAngle, isHovered, hoveredNode, orbitSpeed, gravity, activeIndex]);

  // Reset debris items to active state manually
  const resetDebris = () => {
    setDebris((prev) => prev.map((d) => ({ ...d, active: true })));
    setGravity(45);
    addLog('[CMD] Gravity reset to default. Debris re-orbiting.');
  };

  const isCollapsed = gravity >= 95;
  const gravityForce = (9.8 * (1 + gravity / 30)).toFixed(2);
  const velocityRads = ((orbitSpeed / 100) * 0.75).toFixed(2);

  return (
    <section 
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative pt-32 md:pt-40 pb-28 px-6 overflow-hidden bg-slate-950 text-slate-100 grid-pattern-dark cursor-default font-sans select-none"
      style={{
        '--mouse-x': `${mouseCoords.x}px`,
        '--mouse-y': `${mouseCoords.y}px`
      } as React.CSSProperties}
    >
      {/* Laser spotlight cursor tracking glow */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(600px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(99, 102, 241, 0.11), transparent 80%)`
        }}
      />

      {/* Futuristic floating cosmic background nebula blobs */}
      <div className="absolute top-[8%] left-[5%] w-[450px] h-[450px] rounded-full bg-indigo-650/10 blur-[130px] animate-drift pointer-events-none z-0" />
      <div className="absolute top-[16%] right-[5%] w-[450px] h-[450px] rounded-full bg-cyan-500/8 blur-[120px] animate-drift-reverse pointer-events-none z-0" />
      <div className="absolute bottom-[4%] left-[28%] w-[400px] h-[400px] rounded-full bg-purple-500/8 blur-[115px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
        
        {/* Left Column: Brand Copy Redesign */}
        <div className="lg:col-span-6 text-left flex flex-col justify-center select-none z-20">
          
          {/* Pill Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 shadow-xl backdrop-blur-md mb-6 hover:border-indigo-500/50 transition-colors"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-350 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Introducing Guild Orbit 3.0
            </span>
          </motion.div>

          {/* Heading */}
          <h1 className="text-[clamp(2.5rem,5.2vw,4.15rem)] font-extrabold tracking-tight leading-[1.05] text-white">
            <motion.span
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="block"
            >
              Run operations.
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 block mt-1 drop-shadow-[0_0_15px_rgba(99,102,241,0.25)]"
            >
              Without the chaos.
            </motion.span>
          </h1>

          {/* Paragraph */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="mt-6 text-sm md:text-base text-slate-400 max-w-xl leading-relaxed font-medium"
          >
            Stop fragmenting your work across WhatsApp chats, spreadsheets, and emails. Guild brings task boards, team communication, and official approvals into a single, high-performance workspace designed for SMB teams.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center gap-4"
          >
            <a
              href={`${APP_URL}/signup`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-7 py-4 rounded-2xl shadow-xl hover:shadow-indigo-500/25 transition-all active:scale-[0.98] hover:-translate-y-0.5 cursor-pointer neon-glow-indigo"
            >
              Launch free orbit
              <ArrowRight className="h-4.5 w-4.5" />
            </a>
            <button
              onClick={() => navigate('/demo')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-sm font-bold text-slate-350 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 px-6.5 py-4 rounded-2xl transition-all shadow-xl cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] backdrop-blur-md"
            >
              Watch platform demo
              <Play className="h-4 w-4 fill-current text-slate-400 group-hover:text-white" />
            </button>
          </motion.div>
        </div>

        {/* Right Column: 3D Orbit Sandbox */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[460px] md:min-h-[520px]">
          
          {/* Main 3D Space Ring Stage */}
          <div 
            className="w-full relative flex items-center justify-center min-h-[360px] md:min-h-[385px]"
            style={{ perspective: 1200 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
              setIsHovered(false);
              setHoveredNode(null);
            }}
          >
            {/* Dynamic Vector Canvas Stage */}
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full pointer-events-none z-10" 
            />

            {/* =========================================
                THE GRAVITY ENGINE CORE
               ========================================= */}
            <div className="absolute z-40 flex items-center justify-center">
              <motion.div
                animate={{
                  scale: isCollapsed ? [1, 1.3, 1.2] : [1, 1.06, 1],
                  rotate: isCollapsed ? 360 : 0
                }}
                transition={{
                  scale: { 
                    repeat: isCollapsed ? 0 : Infinity, 
                    duration: isCollapsed ? 0.35 : 4, 
                    ease: "easeInOut" 
                  },
                  rotate: { duration: 16, repeat: Infinity, ease: "linear" }
                }}
                className={`rounded-full flex items-center justify-center transition-all duration-500 relative cursor-pointer ${
                  isCollapsed 
                    ? 'w-36 h-36 bg-gradient-to-tr from-violet-600 via-indigo-650 to-emerald-500 neon-glow-emerald ring-8 ring-emerald-500/10' 
                    : 'w-22 h-22 bg-slate-900 border border-slate-800 shadow-2xl hover:scale-105 active:scale-95'
                }`}
                onClick={() => {
                  if (isCollapsed) {
                    setGravity(45);
                    addLog('Gravity Engine rebooted. Dispersing orbits.');
                  } else {
                    setGravity(100);
                    addLog('Gravity Core set to MAX. Consolidating workspace.');
                  }
                }}
              >
                {/* Glowing Aura */}
                <div 
                  className="absolute inset-0 rounded-full gravity-core-glow opacity-80" 
                  style={{
                    '--core-color-1': isCollapsed ? '#10b981' : '#6366f1',
                    '--core-color-2': isCollapsed ? '#065f46' : '#1e1b4b'
                  } as React.CSSProperties}
                />

                {/* Core contents */}
                <div className="relative z-10 flex flex-col items-center text-center text-white">
                  {isCollapsed ? (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex flex-col items-center"
                    >
                      <ShieldCheck className="h-7 w-7 text-emerald-300 animate-bounce" />
                      <span className="text-[9px] font-mono font-extrabold tracking-widest mt-1.5 uppercase text-emerald-250">
                        UNIFIED
                      </span>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <img src="/logo.png" alt="Logo" className="h-6.5 w-6.5 rounded-md mb-0.5 animate-pulse-slow" />
                      <span className="text-[8px] font-mono tracking-widest text-slate-400 font-extrabold uppercase">
                        ORBIT
                      </span>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="absolute inset-0 rounded-full border border-indigo-500/35 animate-ping opacity-25 pointer-events-none" />
                )}
              </motion.div>
            </div>

            {/* =========================================
                ORBITAL FLOATING DASHBOARD CARDS
               ========================================= */}

            {/* CARD 1: TASKS BOARD */}
            <div 
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                ...(() => {
                  const pos = getOrbitalPos(0);
                  return {
                    transform: `translate(-50%, -50%) translate3d(${pos.x}px, ${pos.y}px, 0) scale(${pos.scale})`,
                    opacity: pos.opacity,
                    zIndex: pos.zIndex,
                    filter: pos.blur > 0 ? `blur(${pos.blur.toFixed(1)}px)` : 'none'
                  };
                })()
              }}
              onMouseEnter={() => setHoveredNode(0)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleManualSnap(0)}
              className={`absolute w-[245px] h-[165px] dark-glass rounded-2xl p-4 border cursor-pointer select-none flex flex-col justify-between transition-colors duration-300 ${
                activeIndex === 0 && !isCollapsed
                  ? 'border-indigo-500/50 bg-indigo-950/15 shadow-[0_0_20px_rgba(99,102,241,0.08)]' 
                  : 'border-slate-800/80 bg-slate-900/60 hover:border-indigo-500/40'
              }`}
            >
              <div className="absolute inset-1.5 border border-indigo-500/5 rounded-xl pointer-events-none" />
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-1.5 z-10">
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <CheckSquare className="h-4 w-4 text-indigo-400" />
                  <span className="font-extrabold text-[10px] font-mono uppercase tracking-wide">Tasks Board</span>
                </div>
                <span className="font-mono text-[8px] text-slate-500 font-bold">[TSK_MGR]</span>
              </div>

              {/* Card Body */}
              <div className="flex-1 flex flex-col justify-between z-10">
                <div className="space-y-1.5 mt-1.5">
                  {tasks.map((t) => (
                    <div 
                      key={t.id} 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(t.id);
                      }}
                      className="flex items-center gap-2 text-[10px] text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center transition-all ${
                        t.checked 
                          ? 'bg-indigo-600 border-indigo-500 text-white' 
                          : 'border-slate-700 bg-slate-950'
                      }`}>
                        {t.checked && <Check className="h-2.5 w-2.5 stroke-[3.5]" />}
                      </div>
                      <span className={`truncate leading-none font-semibold ${t.checked ? 'line-through text-slate-500 font-medium' : ''}`}>
                        {t.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-2.5 flex items-center justify-between text-[8.5px] text-slate-400 font-mono">
                  <div className="flex-grow mr-2.5 bg-slate-950/80 rounded-full h-1.5 overflow-hidden border border-slate-800">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="font-bold text-indigo-400">{progressPercent}%</span>
                </div>
              </div>
            </div>

            {/* CARD 2: TEAM CHAT COMMS */}
            <div 
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                ...(() => {
                  const pos = getOrbitalPos(1);
                  return {
                    transform: `translate(-50%, -50%) translate3d(${pos.x}px, ${pos.y}px, 0) scale(${pos.scale})`,
                    opacity: pos.opacity,
                    zIndex: pos.zIndex,
                    filter: pos.blur > 0 ? `blur(${pos.blur.toFixed(1)}px)` : 'none'
                  };
                })()
              }}
              onMouseEnter={() => setHoveredNode(1)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleManualSnap(1)}
              className={`absolute w-[245px] h-[165px] dark-glass rounded-2xl p-4 border cursor-pointer select-none flex flex-col justify-between transition-colors duration-300 ${
                activeIndex === 1 && !isCollapsed
                  ? 'border-cyan-500/50 bg-cyan-950/15 shadow-[0_0_20px_rgba(34,211,238,0.08)]' 
                  : 'border-slate-800/80 bg-slate-900/60 hover:border-cyan-500/40'
              }`}
            >
              <div className="absolute inset-1.5 border border-cyan-500/5 rounded-xl pointer-events-none" />
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-1.5 z-10">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <MessageSquare className="h-4 w-4 text-cyan-400" />
                  <span className="font-extrabold text-[10px] font-mono uppercase tracking-wide">Team Comms</span>
                </div>
                <span className="font-mono text-[8px] text-slate-500 font-bold">[CH_DMS]</span>
              </div>

              {/* Chat Body */}
              <div className="flex-1 flex flex-col justify-between z-10 space-y-1.5 overflow-hidden">
                <div className="space-y-2 mt-1.5">
                  {messages.map((m, i) => (
                    <div 
                      key={i} 
                      className={`flex gap-1.5 items-start ${m.sender.includes('Alex') ? 'justify-end' : ''}`}
                    >
                      {m.sender.includes('Sarah') && (
                        <div className="h-5 w-5 rounded-full bg-cyan-750 flex items-center justify-center text-[7.5px] text-cyan-100 font-mono shrink-0 font-bold border border-cyan-600">
                          SO
                        </div>
                      )}
                      <div className={`p-2 rounded-xl text-[9px] max-w-[85%] leading-normal font-semibold font-sans shadow-md border ${
                        m.sender.includes('Alex') 
                          ? 'bg-cyan-600 text-white border-cyan-500 rounded-tr-none' 
                          : 'bg-slate-950 text-slate-200 border-slate-800 rounded-tl-none'
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex gap-1.5 items-center">
                      <div className="h-5 w-5 rounded-full bg-cyan-750 flex items-center justify-center text-[7.5px] text-cyan-100 font-mono shrink-0 font-bold border border-cyan-600">
                        SO
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl rounded-tl-none border border-slate-800 flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" />
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtext channel */}
                <div className="text-[8px] text-cyan-500/80 border-t border-slate-800/60 pt-1.5 font-mono flex justify-between items-center mt-1">
                  <span className="font-semibold text-cyan-400 flex items-center gap-0.5">#cdn-migration</span>
                  <span className="text-[7px] text-slate-500 font-bold">REALTIME</span>
                </div>
              </div>
            </div>

            {/* CARD 3: OPERATIONAL APPROVALS */}
            <div 
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                ...(() => {
                  const pos = getOrbitalPos(2);
                  return {
                    transform: `translate(-50%, -50%) translate3d(${pos.x}px, ${pos.y}px, 0) scale(${pos.scale})`,
                    opacity: pos.opacity,
                    zIndex: pos.zIndex,
                    filter: pos.blur > 0 ? `blur(${pos.blur.toFixed(1)}px)` : 'none'
                  };
                })()
              }}
              onMouseEnter={() => setHoveredNode(2)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleManualSnap(2)}
              className={`absolute w-[245px] h-[165px] dark-glass rounded-2xl p-4 border cursor-pointer select-none flex flex-col justify-between transition-colors duration-300 ${
                activeIndex === 2 && !isCollapsed
                  ? 'border-purple-500/50 bg-purple-950/15 shadow-[0_0_20px_rgba(168,85,247,0.08)]' 
                  : 'border-slate-800/80 bg-slate-900/60 hover:border-purple-500/40'
              }`}
            >
              <div className="absolute inset-1.5 border border-purple-500/5 rounded-xl pointer-events-none" />
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-1.5 z-10">
                <div className="flex items-center gap-1.5 text-purple-400">
                  <FileCheck className="h-4 w-4 text-purple-400" />
                  <span className="font-extrabold text-[10px] font-mono uppercase tracking-wide">Approvals</span>
                </div>
                <span className="font-mono text-[8px] text-slate-500 font-bold">[APR_FLOW]</span>
              </div>

              {/* Card Body */}
              <div className="flex-1 flex flex-col justify-between z-10">
                <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 shadow-inner relative mt-1.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[7px] font-mono bg-purple-500/10 text-purple-400 px-1 py-0.2 rounded-xs border border-purple-500/15 font-bold uppercase tracking-wider">Ops Infra</span>
                    <span className={`text-[7px] font-mono px-1 py-0.2 rounded-xs font-bold uppercase tracking-wider ${
                      approvedState 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                    }`}>
                      {approvedState ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <h4 className="text-[10px] font-bold text-slate-200">Server CDN Deployment</h4>
                  <p className="text-[10.5px] text-slate-100 font-extrabold font-mono mt-0.5">$1,250.00 / mo</p>
                </div>

                {/* Fingerprint signatures */}
                <div className="mt-2.5 flex gap-2">
                  {approvedState ? (
                    <motion.button 
                      initial={{ scale: 0.96 }}
                      animate={{ scale: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setApprovedState(false);
                        addLog('Admin approval revoked.');
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-[9px] shadow-lg transition-all active:scale-[0.98] cursor-pointer font-mono uppercase tracking-wide flex items-center justify-center gap-1 border border-emerald-500/30 neon-glow-emerald"
                    >
                      <Fingerprint className="h-3.5 w-3.5" /> SECURED BY ADMIN
                    </motion.button>
                  ) : (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove();
                        }}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-1.5 rounded-lg text-[9px] shadow-md transition-all active:scale-[0.98] cursor-pointer font-sans"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          addLog('Budget request declined.');
                        }}
                        className="flex-1 bg-slate-950 hover:bg-slate-900 text-slate-400 border border-slate-800 font-bold py-1.5 rounded-lg text-[9px] shadow-sm transition-all active:scale-[0.98] cursor-pointer font-sans"
                      >
                        Decline
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* =========================================
                FLOATING OPERATIONAL DEBRIS PILLS
               ========================================= */}
            {debris.map((item) => {
              const pos = getDebrisPos(item);
              if (!pos.visible) return null;

              return (
                <div
                  key={item.id}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) translate3d(${pos.x}px, ${pos.y}px, 0) scale(${pos.scale})`,
                    opacity: pos.opacity,
                    zIndex: pos.zIndex,
                    filter: 'blur(0.5px)',
                    pointerEvents: 'none'
                  }}
                  className="px-2.5 py-1 rounded-full dark-glass border border-slate-800 flex items-center gap-1.5 text-[9px] font-semibold text-slate-400 shadow-md transition-all duration-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.icon === 'whatsapp' && <MessageCircle className="h-3 w-3 text-emerald-400" />}
                  {item.icon === 'spreadsheet' && <Table className="h-3 w-3 text-emerald-500" />}
                  {item.icon === 'mail' && <Mail className="h-3 w-3 text-rose-400" />}
                  {item.icon === 'trello' && <Trello className="h-3 w-3 text-blue-400" />}
                  <span className="font-mono text-[8px] tracking-wide text-slate-350">{item.label}</span>
                </div>
              );
            })}

          </div>

          {/* =========================================
              TELEMETRY & PHYSICS COMMAND CONSOLE
             ========================================= */}
          <div className="mt-8 z-20 flex flex-col md:grid md:grid-cols-12 gap-4 w-full max-w-[510px]">
            
            {/* Left Deck Panel: Module Select & Live Log Terminal */}
            <div className="col-span-6 flex flex-col gap-3">
              {/* Snapshot select deck */}
              <div className="flex bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-850 w-full shadow-2xl select-none">
                <button 
                  onClick={() => handleManualSnap(0)}
                  disabled={isCollapsed}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-extrabold transition-all duration-300 cursor-pointer ${
                    activeIndex === 0 && !isCollapsed
                      ? 'bg-indigo-650 text-white shadow-md border border-indigo-500/20' 
                      : 'text-slate-450 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  <CheckSquare className="h-3 w-3" />
                  Tasks
                </button>
                <button 
                  onClick={() => handleManualSnap(1)}
                  disabled={isCollapsed}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-extrabold transition-all duration-300 cursor-pointer ${
                    activeIndex === 1 && !isCollapsed
                      ? 'bg-cyan-650 text-white shadow-md border border-cyan-500/20' 
                      : 'text-slate-450 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  <MessageSquare className="h-3 w-3" />
                  Chat
                </button>
                <button 
                  onClick={() => handleManualSnap(2)}
                  disabled={isCollapsed}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-extrabold transition-all duration-300 cursor-pointer ${
                    activeIndex === 2 && !isCollapsed
                      ? 'bg-purple-650 text-white shadow-md border border-purple-500/20' 
                      : 'text-slate-450 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  <FileCheck className="h-3 w-3" />
                  Approvals
                </button>
              </div>

              {/* Terminal Logs console deck */}
              <div className="font-mono text-[9px] text-slate-400 bg-slate-950 border border-slate-900 rounded-xl p-3 w-full space-y-1.5 select-none shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[110px]">
                <div className="absolute inset-0 gravity-scanline pointer-events-none" />
                
                <div className="flex justify-between border-b border-slate-900 pb-1 z-10">
                  <span className="text-indigo-400 font-bold flex items-center gap-1">
                    <Terminal className="h-3 w-3" /> ORBIT_SYSTEM
                  </span>
                  <span className="text-emerald-400 animate-pulse flex items-center gap-1">
                    <Cpu className="h-3 w-3" /> {fps.toFixed(1)} FPS
                  </span>
                </div>
                
                <div className="space-y-1 z-10 mt-1 flex-grow">
                  {terminalLogs.map((log, i) => (
                    <div key={i} className="truncate leading-tight">
                      <span className="text-slate-600 font-semibold">&gt; </span>
                      <span className={
                        log.includes('[OK]') || log.includes('secured') ? 'text-emerald-455' :
                        log.includes('[ALERT]') || log.includes('Swallowed') ? 'text-cyan-400' :
                        log.includes('[INIT]') ? 'text-indigo-400' : 'text-slate-350'
                      }>
                        {log}
                      </span>
                    </div>
                  ))}
                </div>

                {isManual && !isCollapsed && (
                  <button
                    onClick={() => {
                      setIsManual(false);
                      addLog('Resuming standard orbital rotation');
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-850 text-indigo-400 hover:text-indigo-300 font-extrabold py-0.5 rounded border border-slate-800 active:scale-95 transition-all cursor-pointer text-center text-[7.5px] mt-1.5 z-10 uppercase tracking-widest flex items-center justify-center gap-1 font-mono"
                  >
                    <RefreshCw className="h-2 w-2 animate-spin" /> Resume Auto Orbit()
                  </button>
                )}
              </div>
            </div>

            {/* Right Deck Panel: Range Sliders & Wave Oscilloscope */}
            <div className="col-span-6 flex flex-col justify-between gap-3">
              {/* Range sliders */}
              <div className="flex flex-col gap-3 bg-slate-900 border border-slate-850 p-3.5 rounded-xl shadow-2xl">
                
                {/* Gravity Pull slider */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-center text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Zap className="h-3.5 w-3.5 text-amber-500 fill-current" /> Operations Gravity
                    </span>
                    <span className="text-indigo-400">{gravity}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={gravity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setGravity(val);
                      if (val >= 95) {
                        setIsManual(false);
                      }
                    }}
                    className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500 border border-slate-900"
                  />
                  <div className="flex justify-between text-[7px] text-slate-500 font-bold font-mono mt-1">
                    <span>Low (Chaos Mode)</span>
                    <span className="text-indigo-400">High (Unified)</span>
                  </div>
                </div>

                {/* Orbit Speed slider */}
                <div className="flex flex-col">
                  <div className="flex justify-between items-center text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Sliders className="h-3.5 w-3.5 text-cyan-400" /> Orbit Velocity
                    </span>
                    <span className="text-cyan-400">{orbitSpeed}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="200" 
                    value={orbitSpeed}
                    disabled={isCollapsed}
                    onChange={(e) => {
                      setOrbitSpeed(Number(e.target.value));
                      setIsManual(false); 
                    }}
                    className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500 border border-slate-900 disabled:opacity-20 disabled:cursor-not-allowed"
                  />
                  <div className="flex justify-between text-[7px] text-slate-500 font-bold font-mono mt-1">
                    <span>Static</span>
                    <span className="text-cyan-400">Express</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Oscilloscope Display Panel */}
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-3.5 w-full shadow-2xl relative overflow-hidden flex flex-col justify-center min-h-[64px] select-none">
                <div className="absolute inset-0 gravity-scanline pointer-events-none" />
                <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 border-b border-slate-900/60 pb-1 mb-1.5 z-10">
                  <span className="flex items-center gap-1 font-extrabold text-slate-400">
                    <Activity className="h-2.5 w-2.5 text-emerald-400 animate-pulse" /> Alignment Wave
                  </span>
                  <span className="font-semibold text-slate-400">ALIGNMENT: {systemAlignment}%</span>
                </div>
                
                {/* Canvas Oscilloscope Line */}
                <canvas ref={oscRef} className="w-full h-8 overflow-visible z-10" />

                {/* Reset button if debris is cleared */}
                {debris.every(d => !d.active) && (
                  <button 
                    onClick={resetDebris}
                    className="absolute right-2.5 bottom-1 px-1.5 py-0.5 bg-indigo-950 border border-indigo-900 rounded text-[7px] text-indigo-400 hover:text-indigo-300 font-mono font-bold cursor-pointer"
                  >
                    RESET CHAOS
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
