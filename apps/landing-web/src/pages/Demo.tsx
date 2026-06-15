import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ArrowRight,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
  Lock,
  Users,
  Tv
} from 'lucide-react';

interface MotionScene {
  id: string;
  title: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  subtitle: string;
  badge: string;
  color: string;
  gradient: string;
}

const MOTION_SCENES: MotionScene[] = [
  {
    id: 'tasks',
    title: 'FLUID WORKFLOWS',
    startTime: 0,
    endTime: 10,
    subtitle: 'Streamlined Kanban Boards',
    badge: 'Task Management',
    color: '#6366f1',
    gradient: 'from-indigo-500 via-purple-500 to-cyan-500',
  },
  {
    id: 'chat',
    title: 'CONNECTED TEAMS',
    startTime: 10,
    endTime: 20,
    subtitle: 'Real-time Synchronized Chat',
    badge: 'Communication',
    color: '#06b6d4',
    gradient: 'from-cyan-500 via-indigo-500 to-emerald-500',
  },
  {
    id: 'approvals',
    title: 'INSTANT SIGN-OFFS',
    startTime: 20,
    endTime: 30,
    subtitle: 'Automated Compliance Routing',
    badge: 'Operations & Approvals',
    color: '#a855f7',
    gradient: 'from-purple-500 via-pink-500 to-amber-500',
  },
  {
    id: 'directory',
    title: 'SMART ALLOCATIONS',
    startTime: 30,
    endTime: 40,
    subtitle: 'Workload Balance Directory',
    badge: 'Resource Visibility',
    color: '#10b981',
    gradient: 'from-emerald-500 via-teal-500 to-indigo-500',
  },
];

const TOTAL_DURATION = 40; // seconds (Faster, 10s per scene)

export function Demo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [activeTab, setActiveTab] = useState('tasks');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', teamSize: '5-20', message: '' });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Web Audio Synth for motion graphic sound effects
  const playSound = (type: 'play' | 'transition' | 'click' | 'success' | 'bubble') => {
    if (typeof window === 'undefined' || isMuted) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      if (type === 'play') {
        // Sci-fi entry sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === 'transition') {
        // Wind-up drop sound
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc2.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.4);
        osc2.frequency.setValueAtTime(200, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc2.start();
        osc.stop(ctx.currentTime + 0.4);
        osc2.stop(ctx.currentTime + 0.4);
      } else if (type === 'click') {
        // High frequency UI tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(volume * 0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'success') {
        // Metallic positive chime
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc2.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1); // C#5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2); // E5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3); // A5
        osc2.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc2.start();
        osc.stop(ctx.currentTime + 0.5);
        osc2.stop(ctx.currentTime + 0.5);
      } else if (type === 'bubble') {
        // Watery pop sound for chats
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(volume * 0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      console.warn('Web Audio not allowed or failed:', e);
    }
  };

  // Sync active tab based on current time
  useEffect(() => {
    const matchingScene = MOTION_SCENES.find(
      (s) => currentTime >= s.startTime && currentTime < s.endTime
    );
    if (matchingScene && matchingScene.id !== activeTab) {
      setActiveTab(matchingScene.id);
      playSound('transition');
    }
  }, [currentTime, activeTab]);

  // Video playback loop simulator
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= TOTAL_DURATION) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    playSound('play');
    setIsPlaying(!isPlaying);
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
    playSound('click');
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCurrentTime(value);
    playSound('click');
  };

  const jumpToScene = (scene: MotionScene) => {
    setCurrentTime(scene.startTime);
    setActiveTab(scene.id);
    setIsPlaying(true);
    playSound('transition');
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playSound('success');
    setTimeout(() => {
      setFormSubmitted(true);
    }, 600);
  };

  // Sound effects triggered at specific timestamps
  useEffect(() => {
    if (isPlaying) {
      // Scene 1 (Tasks) card moves
      if (currentTime === 3 || currentTime === 7) {
        playSound('play');
      }
      // Scene 2 (Chat) messages popping
      if (currentTime === 12 || currentTime === 15 || currentTime === 18) {
        playSound('bubble');
      }
      // Scene 3 (Approvals) success chime
      if (currentTime === 26) {
        playSound('success');
      }
      // Scene 4 (Directory) allocate pulse
      if (currentTime === 34 || currentTime === 37) {
        playSound('click');
      }
    }
  }, [currentTime, isPlaying]);

  // Motion Graphic Scenes Inside the Player Screen
  const renderGraphicScreen = () => {
    const currentScene = MOTION_SCENES.find((s) => s.id === activeTab) || MOTION_SCENES[0];
    const sceneElapsed = currentTime - currentScene.startTime; // 0 to 10 seconds

    switch (activeTab) {
      case 'tasks':
        return (
          <div className="w-full h-full bg-slate-950 flex flex-col justify-center items-center text-white relative overflow-hidden select-none p-6">
            {/* Pulsing Grid Background */}
            <div className="absolute inset-0 grid-pattern-dark opacity-40" />
            
            {/* Neon Glowing Circles */}
            <div className="absolute top-[30%] left-[20%] w-[200px] h-[200px] rounded-full bg-indigo-500/10 blur-[80px]" />
            <div className="absolute bottom-[20%] right-[20%] w-[250px] h-[250px] rounded-full bg-purple-500/10 blur-[90px]" />

            {/* Glowing Orbital rings */}
            <svg className="absolute w-[80%] h-[80%] opacity-20 pointer-events-none" viewBox="0 0 400 400">
              <circle cx="200" cy="200" r="140" fill="none" stroke="#6366f1" strokeWidth="1" strokeDasharray="5 5" className="animate-[spin_40s_linear_infinite]" />
              <circle cx="200" cy="200" r="90" fill="none" stroke="#d8b4fe" strokeWidth="1.5" className="animate-[spin_20s_linear_infinite_reverse]" />
            </svg>

            {/* Floating Visual Cards */}
            <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-6">
              <div className="flex gap-4 items-center">
                {/* Visual Column 1 */}
                <motion.div 
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl w-36 text-left shadow-lg"
                >
                  <span className="text-[7px] font-bold text-slate-500 tracking-wider block mb-2">BACKLOG</span>
                  <div className="h-6 bg-slate-800/80 border border-slate-700/50 rounded-lg flex items-center justify-between px-2 text-[8px] font-bold">
                    <span>Task Core</span>
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  </div>
                </motion.div>

                {/* Flying Card in Motion */}
                <div className="relative h-16 w-20 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {sceneElapsed >= 3 && sceneElapsed < 7 ? (
                      <motion.div
                        key="flying-card"
                        initial={{ opacity: 0, scale: 0.5, x: -70, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1.1, x: 0, y: [0, -15, 0], rotate: 5, boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)" }}
                        exit={{ opacity: 0, scale: 0.8, x: 70, rotate: 15 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        className="bg-indigo-600 border border-indigo-400 p-2.5 rounded-xl text-center w-28 absolute z-20 shadow-xl"
                      >
                        <Zap className="h-4 w-4 text-white mx-auto mb-1 animate-bounce" />
                        <span className="text-[8px] font-bold tracking-tight block text-white leading-none">Sprint Feature</span>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                {/* Visual Column 2 */}
                <motion.div 
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl w-36 text-left shadow-lg"
                >
                  <span className="text-[7px] font-bold text-slate-500 tracking-wider block mb-2">IN PROGRESS</span>
                  <div className="h-6 bg-slate-800/80 border border-slate-700/50 rounded-lg flex items-center justify-between px-2 text-[8px] font-bold">
                    <span>QA Redesign</span>
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  </div>
                </motion.div>
              </div>

              {/* Central Typographical Highlight */}
              <div className="text-center mt-2">
                <motion.h2 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 tracking-wider uppercase leading-none"
                >
                  DRAG. DROP. DELIVER.
                </motion.h2>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Fluid, intuitive board management
                </p>
              </div>
            </div>
          </div>
        );
      case 'chat':
        return (
          <div className="w-full h-full bg-slate-950 flex flex-col justify-center items-center text-white relative overflow-hidden select-none p-6">
            <div className="absolute inset-0 grid-pattern-dark opacity-40" />
            <div className="absolute top-[20%] right-[15%] w-[200px] h-[200px] rounded-full bg-cyan-500/10 blur-[80px]" />
            <div className="absolute bottom-[30%] left-[15%] w-[250px] h-[250px] rounded-full bg-indigo-500/10 blur-[90px]" />

            {/* Glowing Network Nodes (Connecting Lines) */}
            <svg className="absolute w-full h-full opacity-35" viewBox="0 0 500 300">
              <motion.line x1="100" y1="150" x2="250" y2="70" stroke="#06b6d4" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5 }} />
              <motion.line x1="400" y1="150" x2="250" y2="70" stroke="#6366f1" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.5 }} />
              <motion.line x1="250" y1="230" x2="250" y2="70" stroke="#10b981" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 1 }} />
              {/* Pulsing signal dots traveling down lines */}
              {sceneElapsed > 2 && (
                <>
                  <motion.circle r="4" fill="#06b6d4" animate={{ cx: [100, 250], cy: [150, 70] }} transition={{ duration: 2, repeat: Infinity }} />
                  <motion.circle r="4" fill="#6366f1" animate={{ cx: [400, 250], cy: [150, 70] }} transition={{ duration: 2, repeat: Infinity, delay: 0.7 }} />
                  <motion.circle r="4" fill="#10b981" animate={{ cx: [250, 250], cy: [230, 70] }} transition={{ duration: 2, repeat: Infinity, delay: 1.4 }} />
                </>
              )}
            </svg>

            {/* Nodes representation */}
            <div className="absolute left-[10%] top-[40%] bg-slate-900 border border-cyan-500/30 p-2 rounded-xl text-center shadow-lg">
              <span className="text-[8px] font-bold text-cyan-400 block uppercase">Product</span>
            </div>
            <div className="absolute right-[10%] top-[40%] bg-slate-900 border border-indigo-500/30 p-2 rounded-xl text-center shadow-lg">
              <span className="text-[8px] font-bold text-indigo-400 block uppercase">Engineering</span>
            </div>
            <div className="absolute left-[40%] bottom-[10%] bg-slate-900 border border-emerald-500/30 p-2 rounded-xl text-center shadow-lg">
              <span className="text-[8px] font-bold text-emerald-400 block uppercase">Operations</span>
            </div>

            {/* Central hub showing messages */}
            <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-16 w-16 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/10 border border-cyan-400 mb-6"
              >
                <Activity className="h-7 w-7 text-white" />
              </motion.div>

              <div className="min-h-[40px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {sceneElapsed >= 2 && sceneElapsed < 5 && (
                    <motion.p
                      key="msg1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-xs font-bold text-cyan-200"
                    >
                      "Sarah: Budget Q3 has been approved!"
                    </motion.p>
                  )}
                  {sceneElapsed >= 5 && sceneElapsed < 8 && (
                    <motion.p
                      key="msg2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-xs font-bold text-indigo-200"
                    >
                      "Alex: Deploying the build to staging."
                    </motion.p>
                  )}
                  {sceneElapsed >= 8 && (
                    <motion.p
                      key="msg3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-xs font-bold text-emerald-200"
                    >
                      "David: Shared directory is up to date."
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-4">
                <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 tracking-wider uppercase leading-none">
                  SYCHRONIZED & CENTERALIZED.
                </h2>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Team channels without communication silos
                </p>
              </div>
            </div>
          </div>
        );
      case 'approvals':
        return (
          <div className="w-full h-full bg-slate-950 flex flex-col justify-center items-center text-white relative overflow-hidden select-none p-6">
            <div className="absolute inset-0 grid-pattern-dark opacity-40" />
            <div className="absolute top-[10%] left-[20%] w-[220px] h-[220px] rounded-full bg-purple-500/10 blur-[90px]" />
            <div className="absolute bottom-[20%] right-[10%] w-[220px] h-[220px] rounded-full bg-amber-500/10 blur-[80px]" />

            {/* Glowing Circuit Lines */}
            <svg className="absolute w-[60%] h-[60%] opacity-30" viewBox="0 0 200 200">
              <motion.path
                d="M 20 100 L 80 100 L 100 80 L 140 80 L 150 90 L 180 90"
                fill="none"
                stroke="#a855f7"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2 }}
              />
              <motion.circle
                r="4"
                fill="#f59e0b"
                animate={{
                  offsetDistance: ["0%", "100%"]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                style={{
                  motionPath: "path('M 20 100 L 80 100 L 100 80 L 140 80 L 150 90 L 180 90')"
                }}
              />
            </svg>

            {/* Central Lock / Stamp Animation */}
            <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
              <div className="h-24 w-24 relative flex items-center justify-center mb-6">
                <AnimatePresence mode="wait">
                  {sceneElapsed < 6 ? (
                    <motion.div
                      key="pending-lock"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.05, opacity: 1, rotate: [0, 5, -5, 0] }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="h-16 w-16 rounded-2xl bg-amber-500/10 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/5"
                    >
                      <Lock className="h-7 w-7 text-amber-400" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="success-chime"
                      initial={{ scale: 0.3, opacity: 0, rotate: -45 }}
                      animate={{ scale: [1.3, 1], opacity: 1, rotate: 0 }}
                      className="h-20 w-20 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10"
                    >
                      <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Exploding particles on success */}
                {sceneElapsed >= 6 && sceneElapsed < 8 && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 1 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 rounded-full border border-emerald-400"
                  />
                )}
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 tracking-wider uppercase leading-none">
                  COMPLIANT. SIGNED. SECURE.
                </h2>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Automated sign-off thresholds & locks
                </p>
              </div>
            </div>
          </div>
        );
      case 'directory':
        return (
          <div className="w-full h-full bg-slate-950 flex flex-col justify-center items-center text-white relative overflow-hidden select-none p-6">
            <div className="absolute inset-0 grid-pattern-dark opacity-40" />
            <div className="absolute top-[20%] left-[10%] w-[200px] h-[200px] rounded-full bg-emerald-500/10 blur-[80px]" />
            <div className="absolute bottom-[10%] right-[15%] w-[250px] h-[250px] rounded-full bg-indigo-500/10 blur-[90px]" />

            {/* Balancing nodes structure */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-sm text-center">
              <div className="flex gap-6 items-end justify-center h-20 mb-8 w-full px-8">
                {/* Member 1 meter */}
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <motion.div
                    animate={{ height: sceneElapsed < 5 ? 70 : 40 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="w-4 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-lg shadow-md"
                  />
                  <Users className="h-4 w-4 text-emerald-400" />
                  <span className="text-[7px] font-bold text-slate-500">Alex</span>
                </div>

                {/* Member 2 meter */}
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <motion.div
                    animate={{ height: sceneElapsed < 5 ? 20 : 45 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="w-4 bg-gradient-to-t from-teal-600 to-teal-400 rounded-lg shadow-md"
                  />
                  <Users className="h-4 w-4 text-teal-400" />
                  <span className="text-[7px] font-bold text-slate-500">Sarah</span>
                </div>

                {/* Member 3 meter */}
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <motion.div
                    animate={{ height: sceneElapsed < 5 ? 90 : 50 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="w-4 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-lg shadow-md"
                  />
                  <Users className="h-4 w-4 text-indigo-400" />
                  <span className="text-[7px] font-bold text-slate-500">David</span>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 tracking-wider uppercase leading-none">
                  OPTIMIZE WORKLOAD BALANCE.
                </h2>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Visually distribute tasks & prevent team burnout
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pt-28 pb-20 px-6 min-h-screen grid-pattern bg-page relative">
      <div className="absolute top-[10%] left-[5%] w-[450px] h-[450px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[450px] h-[450px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto flex flex-col items-center">
        {/* Header */}
        <section className="text-center mb-12 max-w-2xl relative z-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50/80 border border-indigo-100/50 px-3 py-1.5 rounded-full mb-3 glass">
            Motion Walkthrough
          </span>
          <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-extrabold text-slate-900 tracking-tight leading-none">
            See the Platform in Action
          </h1>
          <p className="mt-4 text-sm font-semibold text-slate-500 max-w-lg mx-auto leading-relaxed">
            Experience our 40-second animated motion graphic showcase mapping task workflows, instant sync channels, secure sign-offs, and team balancing.
          </p>
        </section>

        {/* Video Player Layout */}
        <section className="w-full max-w-4xl relative z-20 mb-16">
          <div className="bg-slate-950 rounded-3xl p-3 md:p-4 shadow-2xl border border-slate-900 flex flex-col">
            
            {/* Screen Container */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-900 shadow-inner flex items-center justify-center">
              {renderGraphicScreen()}

              {/* Idle Play Overlay */}
              {!isPlaying && currentTime === 0 && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-30">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={togglePlay}
                    className="h-16 w-16 bg-indigo-650 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 border border-indigo-500 cursor-pointer"
                  >
                    <Play fill="currentColor" className="h-6 w-6 ml-1" />
                  </motion.button>
                  <span className="text-xs font-extrabold text-white uppercase tracking-widest mt-4">
                    Play Motion Graphic Trailer
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 mt-1">Duration: 40 seconds (Fast Tour)</span>
                  
                  {/* Speaker Hint */}
                  <div className="mt-6 flex items-center gap-1.5 text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
                    <Volume2 className="h-3.5 w-3.5 animate-pulse" />
                    Turn on sound for synthesizer UI chimes!
                  </div>
                </div>
              )}
            </div>

            {/* Custom Video Controls */}
            <div className="flex flex-col gap-2.5 mt-3 px-2">
              {/* Scrubber / Progress Bar */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500 font-extrabold font-mono w-8">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min="0"
                  max={TOTAL_DURATION}
                  value={currentTime}
                  onChange={handleScrubberChange}
                  className="flex-grow h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #6366f1 ${(currentTime / TOTAL_DURATION) * 100}%, #1e293b ${(currentTime / TOTAL_DURATION) * 100}%)`,
                  }}
                />
                <span className="text-[10px] text-slate-500 font-extrabold font-mono w-8 text-right">
                  {formatTime(TOTAL_DURATION)}
                </span>
              </div>

              {/* Button Controls */}
              <div className="flex items-center justify-between text-slate-400">
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    className="hover:text-white transition-colors cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="h-5 w-5 fill-slate-400 hover:fill-white" /> : <Play className="h-5 w-5 fill-slate-400 hover:fill-white" />}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="hover:text-white transition-colors cursor-pointer"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(parseFloat(e.target.value));
                        if (isMuted) setIsMuted(false);
                      }}
                      className="w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-400"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase mr-2 flex items-center gap-1.5">
                    <Tv className="h-3.5 w-3.5 text-slate-500 animate-pulse" />
                    Vibrant Vector Graphics
                  </span>
                  <button className="hover:text-white transition-colors cursor-pointer" title="Fullscreen">
                    <Maximize className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Feature Tabs Links */}
        <section className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {MOTION_SCENES.map((scene) => {
            const isTabActive = activeTab === scene.id;
            return (
              <button
                key={scene.id}
                onClick={() => jumpToScene(scene)}
                className={`bg-white/45 glass p-4 rounded-2xl border text-left cursor-pointer flex flex-col gap-2.5 transition-all shadow-sm ${
                  isTabActive
                    ? 'border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20 bg-indigo-50/20'
                    : 'border-slate-200/50 hover:bg-slate-50/50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: scene.color }}
                  >
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-900 leading-tight">
                    {scene.badge}
                  </span>
                </div>
                <div>
                  <span className={`text-[10px] font-extrabold tracking-tight block text-transparent bg-clip-text bg-gradient-to-r ${scene.gradient}`}>
                    {scene.title}
                  </span>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    {scene.subtitle}
                  </p>
                </div>
                <span className="text-[9px] font-bold text-indigo-600 mt-1 flex items-center gap-1">
                  Play Scene ({formatTime(scene.startTime)})
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </section>

        {/* Form CTA Section */}
        <section className="w-full max-w-2xl bg-white/45 glass rounded-3xl p-8 md:p-10 border border-slate-200/50 shadow-sm relative overflow-hidden">
          <div className="absolute top-[10%] right-[5%] w-[120px] h-[120px] rounded-full bg-indigo-500/5 blur-[30px] pointer-events-none" />
          
          <AnimatePresence mode="wait">
            {!formSubmitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h2 className="text-xl font-bold text-slate-900 text-center">
                  Request a live, personalized team demo
                </h2>
                <p className="text-slate-500 text-xs font-semibold text-center mt-1.5 mb-8">
                  Get a dedicated coordinator to show you how Guild Orbit fits your department's specific workflows.
                </p>

                <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="name" className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="email" className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                        Work Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@company.com"
                        className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="team-size" className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                      Expected Team Size
                    </label>
                    <select
                      id="team-size"
                      value={formData.teamSize}
                      onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                      className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="5-20">5 to 20 users</option>
                      <option value="20-100">20 to 100 users</option>
                      <option value="100+">More than 100 users</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="message" className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                      Message (Optional)
                    </label>
                    <textarea
                      id="message"
                      rows={3}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us a bit about your operational challenges..."
                      className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 transition-colors text-white py-3 px-4 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                  >
                    Book Demo Call
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 flex flex-col items-center gap-4"
              >
                <div className="h-14 w-14 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Demo Scheduled Successfully!</h3>
                <p className="text-slate-500 text-xs font-semibold max-w-sm leading-relaxed">
                  Thanks for your interest, <span className="text-slate-800 font-bold">{formData.name}</span>! An onboarding specialist will email you at <span className="text-slate-800 font-bold">{formData.email}</span> within the next 24 hours with an invite link.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
