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
  Loader2,
  Users,
  FileText,
  FileSpreadsheet,
  Send
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
    endTime: 6,
    subtitle: 'Streamlined Kanban Boards',
    badge: 'Task Management',
    color: '#4f46e5',
    gradient: 'from-indigo-650 via-purple-600 to-cyan-600',
  },
  {
    id: 'chat',
    title: 'CONNECTED TEAMS',
    startTime: 6,
    endTime: 12,
    subtitle: 'Real-time Synchronized Chat',
    badge: 'Communication',
    color: '#06b6d4',
    gradient: 'from-cyan-650 via-indigo-600 to-emerald-650',
  },
  {
    id: 'approvals',
    title: 'INSTANT SIGN-OFFS',
    startTime: 12,
    endTime: 18,
    subtitle: 'Automated Compliance Routing',
    badge: 'Operations & Approvals',
    color: '#9333ea',
    gradient: 'from-purple-650 via-pink-600 to-amber-600',
  },
  {
    id: 'directory',
    title: 'SMART ALLOCATIONS',
    startTime: 18,
    endTime: 24,
    subtitle: 'Workload Balance Directory',
    badge: 'Resource Visibility',
    color: '#10b981',
    gradient: 'from-emerald-650 via-teal-600 to-indigo-650',
  },
];

const TOTAL_DURATION = 24; // seconds (Snappy & Fast)

export function Demo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [activeTab, setActiveTab] = useState('tasks');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', teamSize: '5-20', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Web Audio Synth for motion graphic sound effects
  const playSound = (type: 'play' | 'transition' | 'click' | 'success' | 'bubble') => {
    if (typeof window === 'undefined' || isMuted) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      if (type === 'play') {
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
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc2.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
        osc2.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc2.start();
        osc.stop(ctx.currentTime + 0.5);
        osc2.stop(ctx.currentTime + 0.5);
      } else if (type === 'bubble') {
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
      console.warn('Web Audio fail:', e);
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;

    if (!accessKey || accessKey === 'your_web3forms_access_key_here') {
      console.log('%c[Guild Demo Form - Mock Mode]', 'color: #6366f1; font-weight: bold;', {
        ...formData,
        timestamp: new Date().toISOString()
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      playSound('success');
      setIsSubmitting(false);
      setFormSubmitted(true);
      return;
    }

    try {
      const payload = {
        access_key: accessKey,
        subject: `New Demo Booking from ${formData.name}`,
        from_name: 'Guild Orbit Website Demo Page',
        name: formData.name,
        email: formData.email,
        teamSize: formData.teamSize,
        message: formData.message,
        form_type: 'demo_page_booking'
      };

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        playSound('success');
        setFormSubmitted(true);
      } else {
        throw new Error(data.message || 'Something went wrong. Please try again.');
      }
    } catch (err: any) {
      console.error('Demo Form Submit Error:', err);
      setErrorMsg(err.message || 'Failed to submit form. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Snappy Sound triggers based on sceneElapsed time for realistic integration
  useEffect(() => {
    if (isPlaying) {
      const currentScene = MOTION_SCENES.find((s) => s.id === activeTab) || MOTION_SCENES[0];
      const sceneElapsed = currentTime - currentScene.startTime;

      if (activeTab === 'tasks') {
        if (sceneElapsed === 1) playSound('transition');
        if (sceneElapsed === 4) playSound('success');
      } else if (activeTab === 'chat') {
        if (sceneElapsed === 1 || sceneElapsed === 3) playSound('bubble');
        if (sceneElapsed === 4) playSound('click');
        if (sceneElapsed === 5) playSound('bubble');
      } else if (activeTab === 'approvals') {
        if (sceneElapsed === 1 || sceneElapsed === 2) playSound('click');
        if (sceneElapsed === 4) playSound('click');
        if (sceneElapsed === 5) playSound('success');
      } else if (activeTab === 'directory') {
        if (sceneElapsed === 1) playSound('transition');
        if (sceneElapsed === 3) playSound('success');
      }
    }
  }, [currentTime, isPlaying, activeTab]);

  const renderGraphicScreen = () => {
    const currentScene = MOTION_SCENES.find((s) => s.id === activeTab) || MOTION_SCENES[0];
    const sceneElapsed = currentTime - currentScene.startTime;

    switch (activeTab) {
      case 'tasks':
        return (
          <div className="w-full h-full bg-slate-50 flex flex-col p-4 relative overflow-hidden select-none">
            {/* Top bar of workspace */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold text-slate-800 tracking-tight">Sprint Board</span>
                <span className="text-[8px] font-bold bg-indigo-550/10 text-indigo-650 px-1.5 py-0.5 rounded-full border border-indigo-100/30">Sprint 12</span>
              </div>
              
              {/* Sprint Progress Stats Widget */}
              <div className="bg-white border border-slate-205 rounded-xl p-1.5 px-3 shadow-sm flex items-center gap-2.5">
                <div className="relative h-6 w-6 flex items-center justify-center">
                  {/* SVG Progress Ring */}
                  <svg className="w-6 h-6 transform -rotate-90">
                    <circle cx="12" cy="12" r="10" className="stroke-slate-100" strokeWidth="2.5" fill="transparent" />
                    <motion.circle
                      cx="12"
                      cy="12"
                      r="10"
                      className="stroke-indigo-600"
                      strokeWidth="2.5"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 10}
                      animate={{ strokeDashoffset: 2 * Math.PI * 10 * (1 - (sceneElapsed >= 4.2 ? 0.8 : 0.6)) }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </svg>
                  <span className="absolute text-[7px] font-extrabold text-slate-800">
                    {sceneElapsed >= 4.2 ? "80%" : "60%"}
                  </span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider leading-none">Completion</span>
                  <span className="text-[9px] font-extrabold text-slate-800">
                    {sceneElapsed >= 4.2 ? "4/5 Tasks" : "3/5 Tasks"}
                  </span>
                </div>
                
                {/* Floating Velocity Badge */}
                <AnimatePresence>
                  {sceneElapsed >= 4.2 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-emerald-500 text-white font-extrabold text-[7px] px-1 py-0.5 rounded ml-1"
                    >
                      +20%
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Kanban Columns */}
            <div className="flex gap-3 h-full flex-grow items-start">
              {/* Column 1: Backlog */}
              <div className="flex-1 bg-slate-100/60 border border-slate-200/30 rounded-xl p-2 flex flex-col gap-2 h-full">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider">Backlog</span>
                  <span className="text-[8px] font-bold text-slate-400 bg-slate-200/60 px-1 py-0.2 rounded">
                    {sceneElapsed >= 0.8 ? "1" : "2"}
                  </span>
                </div>
                
                {/* Task Card 1: Static */}
                <div className="bg-white border border-slate-200/65 p-2 rounded-lg shadow-sm">
                  <div className="flex justify-between items-start mb-1.5 text-left">
                    <span className="text-[8px] font-bold text-slate-800 leading-tight">API Integration</span>
                    <span className="text-[6px] font-extrabold bg-blue-50 text-blue-600 px-1 py-0.2 rounded">Dev</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[6px] font-semibold text-slate-400">Due Jun 20</span>
                    <div className="h-4 w-4 rounded-full bg-cyan-500 text-white flex items-center justify-center text-[7px] font-bold">AL</div>
                  </div>
                </div>

                {/* Task Card 2 (db-card) Placeholder if sceneElapsed < 0.8 */}
                {sceneElapsed < 0.8 && (
                  <div className="bg-white border border-slate-200/65 p-2 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-1.5 text-left">
                      <span className="text-[8px] font-bold text-slate-800 leading-tight">Database Setup</span>
                      <span className="text-[6px] font-extrabold bg-indigo-50 text-indigo-650 px-1 py-0.2 rounded">Dev</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[6px] font-semibold text-slate-400">Due Jun 18</span>
                      <div className="h-4 w-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[7px] font-bold">SA</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: In Progress */}
              <div className="flex-1 bg-slate-100/60 border border-slate-200/30 rounded-xl p-2 flex flex-col gap-2 h-full relative">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider">In Progress</span>
                  <span className="text-[8px] font-bold text-slate-400 bg-slate-200/60 px-1 py-0.2 rounded">
                    {sceneElapsed < 0.8 ? "1" : sceneElapsed >= 2.0 && sceneElapsed < 3.0 ? "2" : "1"}
                  </span>
                </div>

                {/* Task Card 3 (ui-card) Placeholder if sceneElapsed < 3.0 */}
                {sceneElapsed < 3.0 && (
                  <div className="bg-white border border-slate-200/65 p-2 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-1.5 text-left">
                      <span className="text-[8px] font-bold text-slate-800 leading-tight">UI Redesign</span>
                      <span className="text-[6px] font-extrabold bg-purple-50 text-purple-650 px-1 py-0.2 rounded">Design</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[6px] font-semibold text-slate-400">Due Jun 19</span>
                      <div className="flex -space-x-1">
                        <div className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[7px] font-bold border border-white">SA</div>
                        <div className="h-4 w-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[7px] font-bold border border-white">DA</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flying Database Setup Card */}
                {sceneElapsed >= 0.8 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, x: "-120%", y: 50, rotate: -5 }}
                    animate={{
                      opacity: 1,
                      scale: sceneElapsed < 2.0 ? 1.05 : 1,
                      x: 0,
                      y: 0,
                      rotate: 0,
                      boxShadow: sceneElapsed < 2.0 ? "0 8px 20px rgba(99,102,241,0.12)" : "0 1px 3px rgba(0,0,0,0.05)"
                    }}
                    transition={{ duration: 1.0, ease: "easeInOut" }}
                    className="bg-white border border-slate-200/60 p-2 rounded-lg shadow-sm z-10 text-left"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[8px] font-bold text-slate-800 leading-tight">Database Setup</span>
                      <span className="text-[6px] font-extrabold bg-indigo-50 text-indigo-650 px-1 py-0.2 rounded">Dev</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[6px] font-semibold text-slate-400 animate-pulse">Running migrations...</span>
                      <div className="h-4 w-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[7px] font-bold">SA</div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Column 3: Done */}
              <div className="flex-1 bg-slate-100/60 border border-slate-200/30 rounded-xl p-2 flex flex-col gap-2 h-full">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider">Done</span>
                  <span className="text-[8px] font-bold text-slate-400 bg-slate-200/60 px-1 py-0.2 rounded">
                    {sceneElapsed >= 4.2 ? "2" : "1"}
                  </span>
                </div>

                {/* Task Card 4: Auth System (Static Done) */}
                <div className="bg-white border border-slate-200/65 p-2 rounded-lg shadow-sm text-left">
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[8px] font-bold text-slate-800 leading-tight">Auth System</span>
                    <span className="text-[6px] font-extrabold bg-emerald-50 text-emerald-600 px-1 py-0.2 rounded">Security</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[6px] text-emerald-600 font-bold flex items-center gap-0.5">✓ Completed</span>
                    <div className="h-4 w-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[7px] font-bold">SA</div>
                  </div>
                </div>

                {/* Flying UI Redesign Card */}
                {sceneElapsed >= 3.0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, x: "-120%", y: -30, rotate: -5 }}
                    animate={{
                      opacity: 1,
                      scale: sceneElapsed < 4.2 ? 1.05 : 1,
                      x: 0,
                      y: 0,
                      rotate: 0,
                      boxShadow: sceneElapsed < 4.2 ? "0 8px 20px rgba(99,102,241,0.12)" : "0 1px 3px rgba(0,0,0,0.05)"
                    }}
                    transition={{ duration: 1.0, ease: "easeInOut" }}
                    className="bg-white border border-slate-200/60 p-2 rounded-lg shadow-sm z-10 text-left"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[8px] font-bold text-slate-800 leading-tight">UI Redesign</span>
                      <span className="text-[6px] font-extrabold bg-purple-50 text-purple-650 px-1 py-0.2 rounded">Design</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[6px] font-bold ${sceneElapsed >= 4.2 ? "text-emerald-650" : "text-slate-450"}`}>
                        {sceneElapsed >= 4.2 ? "✓ Approved" : "Awaiting Sign-off"}
                      </span>
                      <div className="flex -space-x-1">
                        <div className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[7px] font-bold border border-white">SA</div>
                        <div className="h-4 w-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[7px] font-bold border border-white">DA</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
            
            {/* Subtitle Highlight */}
            <div className="text-center mt-3 z-20">
              <h3 className="text-xs font-extrabold text-indigo-650 tracking-wide uppercase leading-none">DRAG. DROP. DELIVER.</h3>
              <p className="text-[8px] text-slate-450 font-bold uppercase tracking-wider mt-1">Fluid, instant kanban updates for entire departments</p>
            </div>
          </div>
        );
      case 'chat':
        return (
          <div className="w-full h-full bg-white flex relative overflow-hidden select-none">
            {/* Sidebar */}
            <div className="w-1/4 bg-slate-50 border-r border-slate-200 p-2 flex flex-col justify-between">
              <div className="flex flex-col gap-3">
                {/* Workspace Name */}
                <div className="flex items-center gap-1.5 px-1 pb-1 border-b border-slate-200">
                  <div className="h-4 w-4 rounded bg-indigo-600 flex items-center justify-center text-[9px] font-extrabold text-white">G</div>
                  <span className="text-[10px] font-extrabold text-slate-800 tracking-tight">Guild Orbit</span>
                </div>
                
                {/* Channels List */}
                <div className="flex flex-col gap-1">
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest px-1">Channels</span>
                  <div className="text-[9px] font-bold text-slate-500 px-1 py-0.5 rounded flex items-center gap-1">
                    <span>#</span> general
                  </div>
                  <div className="text-[9px] font-extrabold text-indigo-650 bg-indigo-50 border border-indigo-100/40 px-1 py-0.5 rounded flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span className="text-indigo-600 font-bold">#</span> dev-team
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-650" />
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 px-1 py-0.5 rounded flex items-center gap-1">
                    <span>#</span> ops-approvals
                  </div>
                </div>

                {/* Direct Messages */}
                <div className="flex flex-col gap-1">
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest px-1">DMs</span>
                  <div className="text-[9px] font-bold text-slate-600 px-1 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Sarah
                  </div>
                  <div className="text-[9px] font-bold text-slate-600 px-1 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Alex
                  </div>
                  <div className="text-[9px] font-bold text-slate-600 px-1 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-350" /> David
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col justify-between bg-white relative">
              {/* Header */}
              <div className="border-b border-slate-200 px-3 py-1.5 flex items-center justify-between">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-extrabold text-slate-800 leading-none"># dev-team</span>
                  <span className="text-[7px] font-bold text-slate-400 mt-0.5 leading-none">Internal coordination & alerts</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-slate-400" />
                  <span className="text-[8px] font-bold text-slate-500">3</span>
                </div>
              </div>

              {/* Messages Box */}
              <div className="flex-grow p-3 flex flex-col gap-2 overflow-y-auto justify-end">
                {/* Sarah Message */}
                {sceneElapsed >= 0.5 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex gap-2 items-start text-left"
                  >
                    <div className="h-5 w-5 rounded-full bg-purple-500 text-white flex items-center justify-center text-[8px] font-bold">SA</div>
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[9px] font-extrabold text-slate-800">Sarah</span>
                        <span className="text-[6px] text-slate-400 font-semibold">12:04 PM</span>
                      </div>
                      <span className="text-[9px] text-slate-700 font-semibold leading-tight mt-0.5">
                        Hey team, did we approve the Q3 budget?
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Typing Indicator */}
                {sceneElapsed >= 1.2 && sceneElapsed < 2.5 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-2 items-center text-slate-400 text-[8px] font-bold px-1 ml-7 text-left"
                  >
                    <span>Alex is typing</span>
                    <div className="flex gap-0.5 items-center">
                      <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                )}

                {/* Alex Message */}
                {sceneElapsed >= 2.5 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2 items-start text-left"
                  >
                    <div className="h-5 w-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[8px] font-bold">AL</div>
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[9px] font-extrabold text-slate-800">Alex</span>
                        <span className="text-[6px] text-slate-400 font-semibold">12:05 PM</span>
                      </div>
                      <span className="text-[9px] text-slate-705 font-semibold leading-tight mt-0.5">
                        Yes, final numbers are uploaded.
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Bot Notification Card */}
                {sceneElapsed >= 4.0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2 items-start text-left"
                  >
                    <div className="h-5 w-5 rounded-full bg-slate-100 border border-slate-200 text-indigo-650 flex items-center justify-center">
                      <Sparkles className="h-2.5 w-2.5 text-indigo-655" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[9px] font-extrabold text-indigo-655 flex items-center gap-0.5">
                          Guild Bot <span className="bg-indigo-50 text-indigo-600 text-[6px] font-bold px-1 rounded border border-indigo-100/50">APP</span>
                        </span>
                        <span className="text-[6px] text-slate-400 font-semibold">12:05 PM</span>
                      </div>
                      <span className="text-[9px] text-slate-800 font-bold leading-tight mt-0.5">
                        ⚡ PR #412 merged: <span className="text-slate-900 font-extrabold">"Q3 Budget updates"</span>
                      </span>
                      
                      {/* File Attachment Card */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-1.5 mt-1 flex items-center gap-2 max-w-xs shadow-inner">
                        <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                          <FileSpreadsheet className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[8.5px] font-bold text-slate-800 leading-none">q3_budget_final.xlsx</span>
                          <span className="text-[6.5px] font-semibold text-slate-400 mt-1">1.2 MB • Google Sheets</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* David Message */}
                {sceneElapsed >= 5.0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2 items-start text-left"
                  >
                    <div className="h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px] font-bold">DA</div>
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[9px] font-extrabold text-slate-800">David</span>
                        <span className="text-[6px] text-slate-400 font-semibold">12:06 PM</span>
                      </div>
                      <span className="text-[9px] text-slate-705 font-semibold leading-tight mt-0.5">
                        Awesome, signing off now!
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Bottom Input Box Mock */}
              <div className="p-2 border-t border-slate-200 bg-white flex items-center gap-2">
                <div className="bg-slate-50 border border-slate-200/70 rounded-lg px-2.5 py-1.5 flex items-center justify-between flex-grow">
                  <span className="text-[9px] text-slate-400 font-semibold">Send a message to #dev-team...</span>
                  <Send className="h-3 w-3 text-slate-300" />
                </div>
              </div>
            </div>
          </div>
        );
      case 'approvals':
        return (
          <div className="w-full h-full bg-slate-50 flex flex-col p-4 relative overflow-hidden select-none">
            {/* Top Info Header */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200/60">
              <div className="flex items-center gap-2 text-left">
                <div className="h-5 w-5 rounded-lg bg-purple-100 flex items-center justify-center text-purple-650">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9.5px] font-extrabold text-slate-800 leading-none">Purchase Order #902</span>
                  <span className="text-[7.5px] font-bold text-slate-400 mt-0.5 leading-none">Compliance Level: High-Priority</span>
                </div>
              </div>
              <div className="bg-purple-50 text-purple-650 border border-purple-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                $12,500.00
              </div>
            </div>

            {/* Pipeline Stages (Nodes) */}
            <div className="flex items-center justify-between px-6 py-2 relative flex-grow max-w-xl mx-auto w-full">
              {/* SVG Connector Lines Behind Nodes */}
              <div className="absolute left-[12%] right-[12%] top-1/2 transform -translate-y-1/2 h-0.5 bg-slate-200 z-0">
                {/* Highlight Line 1 (Sarah to Auto-Bot) */}
                <motion.div
                  className="h-full bg-emerald-500 absolute left-0"
                  initial={{ width: "0%" }}
                  animate={{ width: sceneElapsed >= 2.0 ? "50%" : "0%" }}
                  transition={{ duration: 0.6 }}
                />
                {/* Highlight Line 2 (Auto-Bot to VP) */}
                <motion.div
                  className="h-full bg-emerald-500 absolute left-1/2"
                  initial={{ width: "0%" }}
                  animate={{ width: sceneElapsed >= 3.5 ? "50%" : "0%" }}
                  transition={{ duration: 0.6 }}
                />
              </div>

              {/* Stage 1 Node */}
              <div className="flex flex-col items-center gap-1 relative z-10">
                <motion.div
                  animate={{
                    scale: sceneElapsed >= 0.5 ? [1, 1.1, 1] : 1,
                    borderColor: sceneElapsed >= 0.5 ? "#10b981" : "#cbd5e1"
                  }}
                  className={`h-9 w-9 rounded-full border-2 bg-white flex items-center justify-center shadow-md`}
                >
                  {sceneElapsed >= 0.5 ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-[bounce_0.4s_ease-out]" />
                  ) : (
                    <span className="text-[10px] font-extrabold text-slate-400">1</span>
                  )}
                </motion.div>
                <div className="flex flex-col text-center">
                  <span className="text-[8px] font-extrabold text-slate-800">Sarah</span>
                  <span className="text-[6.5px] font-bold text-emerald-600">Approved</span>
                </div>
              </div>

              {/* Stage 2 Node */}
              <div className="flex flex-col items-center gap-1 relative z-10">
                <motion.div
                  animate={{
                    scale: sceneElapsed >= 2.0 ? [1, 1.1, 1] : 1,
                    borderColor: sceneElapsed >= 2.0 ? "#10b981" : sceneElapsed >= 0.8 ? "#6366f1" : "#cbd5e1"
                  }}
                  className="h-9 w-9 rounded-full border-2 bg-white flex items-center justify-center shadow-md"
                >
                  {sceneElapsed >= 2.0 ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-[bounce_0.4s_ease-out]" />
                  ) : sceneElapsed >= 0.8 ? (
                    <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
                  ) : (
                    <span className="text-[10px] font-extrabold text-slate-400">2</span>
                  )}
                </motion.div>
                <div className="flex flex-col text-center">
                  <span className="text-[8px] font-extrabold text-slate-800">Auto-Bot</span>
                  <span className={`text-[6.5px] font-bold ${sceneElapsed >= 2.0 ? "text-emerald-600" : sceneElapsed >= 0.8 ? "text-indigo-500" : "text-slate-450"}`}>
                    {sceneElapsed >= 2.0 ? "Passed" : sceneElapsed >= 0.8 ? "Auditing" : "Pending"}
                  </span>
                </div>
              </div>

              {/* Stage 3 Node */}
              <div className="flex flex-col items-center gap-1 relative z-10">
                <motion.div
                  animate={{
                    scale: sceneElapsed >= 4.5 ? [1, 1.15, 1] : 1,
                    borderColor: sceneElapsed >= 4.5 ? "#10b981" : sceneElapsed >= 3.5 ? "#f59e0b" : "#cbd5e1"
                  }}
                  className="h-9 w-9 rounded-full border-2 bg-white flex items-center justify-center shadow-md"
                >
                  {sceneElapsed >= 4.5 ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-[bounce_0.4s_ease-out]" />
                  ) : sceneElapsed >= 3.5 ? (
                    <Lock className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-extrabold text-slate-400">3</span>
                  )}
                </motion.div>
                <div className="flex flex-col text-center">
                  <span className="text-[8px] font-extrabold text-slate-800">David (VP)</span>
                  <span className={`text-[6.5px] font-bold ${sceneElapsed >= 4.5 ? "text-emerald-600" : sceneElapsed >= 3.5 ? "text-amber-500 font-extrabold" : "text-slate-450"}`}>
                    {sceneElapsed >= 4.5 ? "Signed" : sceneElapsed >= 3.5 ? "Awaiting VP" : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Action Panel (Trigger Button) */}
            <div className="mt-2 bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center shadow-sm relative">
              <div className="flex flex-col text-left">
                <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider leading-none">Security Clearance</span>
                <span className="text-[10px] font-extrabold text-slate-800 mt-1">Authorized Operations Admin</span>
              </div>
              
              {/* Action Button */}
              <motion.button
                animate={{
                  scale: sceneElapsed >= 4.2 && sceneElapsed < 4.5 ? 0.93 : 1,
                  backgroundColor: sceneElapsed >= 4.5 ? "#10b981" : "#4f46e5"
                }}
                className={`px-3 py-1.5 rounded-lg text-white font-extrabold text-[9px] flex items-center gap-1 shadow-md cursor-pointer`}
              >
                {sceneElapsed >= 4.5 ? (
                  <>✓ Verified Approval</>
                ) : (
                  <>Sign & Approve PO</>
                )}
              </motion.button>

              {/* Simulated Mouse Cursor */}
              {sceneElapsed >= 3.5 && sceneElapsed < 4.3 && (
                <motion.div
                  initial={{ x: 120, y: 80, opacity: 0 }}
                  animate={{
                    x: [120, 60, 48],
                    y: [80, 20, 10],
                    opacity: 1
                  }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="absolute z-30 pointer-events-none"
                  style={{ right: "40px", bottom: "-10px" }}
                >
                  <svg className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" viewBox="0 0 24 24" fill="none">
                    <path d="M4.5 3V17L9.2 12.8L14.5 21L17.5 19L12.3 11L18.5 11L4.5 3Z" fill="black" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                </motion.div>
              )}
            </div>

            {/* Visual Approved Stamp Overlay */}
            <AnimatePresence>
              {sceneElapsed >= 4.5 && (
                <motion.div
                  initial={{ scale: 3, rotate: -25, opacity: 0 }}
                  animate={{ scale: 1, rotate: -12, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200 }}
                  className="absolute top-[40%] left-[30%] border-4 border-emerald-500 bg-white/95 text-emerald-600 rounded-xl px-4 py-1.5 font-black text-xs tracking-wider shadow-xl z-20 border-dashed uppercase pointer-events-none"
                >
                  Approved & Disbursed
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Banner Slide Down */}
            <AnimatePresence>
              {sceneElapsed >= 4.7 && (
                <motion.div
                  initial={{ y: -60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -60 }}
                  className="absolute top-0 inset-x-0 bg-emerald-500 text-white font-extrabold text-[9px] py-1.5 px-4 text-center flex items-center justify-center gap-1.5 shadow-md z-30"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-white animate-pulse" />
                  PO #902 Compliance Check Complete • Vault Unlocked
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      case 'directory':
        return (
          <div className="w-full h-full bg-slate-50 flex flex-col p-4 relative overflow-hidden select-none">
            {/* Header */}
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200/60">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-extrabold text-slate-800">Resource Visibility & Workloads</span>
                <span className="text-[7px] font-bold text-slate-400 mt-0.5">Real-time team distribution dashboard</span>
              </div>
              <span className="text-[8px] font-extrabold bg-indigo-50 text-indigo-650 px-2 py-0.5 rounded-full border border-indigo-100/30">
                Autopilot: Smart Balancer
              </span>
            </div>

            {/* Team Members Grid */}
            <div className="flex gap-3 h-full flex-grow items-start">
              {/* Member 1: Alex */}
              <div className="flex-1 bg-white border border-slate-200/60 rounded-xl p-2.5 flex flex-col gap-2 shadow-sm h-full relative">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[8px] font-bold">AL</div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-extrabold text-slate-800 leading-none font-sans">Alex</span>
                    <span className="text-[6.5px] font-bold text-slate-400 mt-0.5 leading-none">Tech Lead</span>
                  </div>
                </div>
                
                {/* Workload Indicator */}
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex justify-between text-[7px] font-extrabold">
                    <span className="text-slate-400 uppercase">Load</span>
                    <motion.span
                      animate={{ color: sceneElapsed >= 3.2 ? "#eab308" : "#ef4444" }}
                      className="font-black"
                    >
                      {sceneElapsed >= 3.2 ? "60% (Balanced)" : "90% (Overloaded)"}
                    </motion.span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                    <motion.div
                      animate={{
                        width: sceneElapsed >= 3.2 ? "60%" : "90%",
                        backgroundColor: sceneElapsed >= 3.2 ? "#eab308" : "#ef4444"
                      }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      className="h-full rounded-full"
                    />
                  </div>
                </div>

                {/* Task List */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="bg-slate-50 border border-slate-200/50 p-1.5 rounded-lg text-left">
                    <span className="text-[7.5px] font-bold text-slate-700 block leading-tight">API Setup</span>
                  </div>
                  
                  {/* The Dragged Card: Database Migration */}
                  {sceneElapsed < 3.2 ? (
                    <motion.div
                      animate={
                        sceneElapsed >= 1.5
                          ? {
                              x: "110%", // move right to Sarah
                              y: 10,
                              scale: 1.05,
                              boxShadow: "0 6px 15px rgba(0,0,0,0.08)",
                              zIndex: 20
                            }
                          : { x: 0, y: 0 }
                      }
                      transition={{ duration: 1.2, ease: "easeInOut" }}
                      className="bg-white border border-slate-200 p-1.5 rounded-lg text-left shadow-sm flex items-center justify-between cursor-pointer"
                    >
                      <span className="text-[7.5px] font-extrabold text-indigo-650">DB Migr...</span>
                      <span className="text-[5.5px] bg-red-50 text-red-600 px-1 rounded font-bold">Heavy</span>
                    </motion.div>
                  ) : (
                    <div className="h-7 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[7.5px] text-slate-350 font-bold">
                      Task Allocated
                    </div>
                  )}
                </div>
              </div>

              {/* Member 2: Sarah */}
              <div className="flex-1 bg-white border border-slate-200/60 rounded-xl p-2.5 flex flex-col gap-2 shadow-sm h-full">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-bold">SA</div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-extrabold text-slate-800 leading-none font-sans">Sarah</span>
                    <span className="text-[6.5px] font-bold text-slate-400 mt-0.5 leading-none">Product PM</span>
                  </div>
                </div>
                
                {/* Workload Indicator */}
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex justify-between text-[7px] font-extrabold">
                    <span className="text-slate-400 uppercase">Load</span>
                    <motion.span
                      animate={{ color: sceneElapsed >= 3.2 ? "#10b981" : "#10b981" }}
                      className="font-black"
                    >
                      {sceneElapsed >= 3.2 ? "50% (Balanced)" : "30% (Available)"}
                    </motion.span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                    <motion.div
                      animate={{
                        width: sceneElapsed >= 3.2 ? "50%" : "30%",
                        backgroundColor: sceneElapsed >= 3.2 ? "#10b981" : "#10b981"
                      }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      className="h-full rounded-full"
                    />
                  </div>
                </div>

                {/* Task List */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="bg-slate-50 border border-slate-200/50 p-1.5 rounded-lg text-left">
                    <span className="text-[7.5px] font-bold text-slate-700 block leading-tight">PR Review</span>
                  </div>
                  
                  {/* Receives the card */}
                  {sceneElapsed >= 3.2 && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white border border-indigo-200 p-1.5 rounded-lg text-left shadow-sm flex items-center justify-between border-dashed"
                    >
                      <span className="text-[7.5px] font-extrabold text-indigo-650">DB Migr...</span>
                      <span className="text-[5.5px] bg-red-50 text-red-650 px-1 rounded font-bold">Heavy</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Member 3: David */}
              <div className="flex-1 bg-white border border-slate-200/60 rounded-xl p-2.5 flex flex-col gap-2 shadow-sm h-full">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px] font-bold">DA</div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-extrabold text-slate-800 leading-none font-sans">David</span>
                    <span className="text-[6.5px] font-bold text-slate-400 mt-0.5 leading-none">Operations</span>
                  </div>
                </div>
                
                {/* Workload Indicator */}
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex justify-between text-[7px] font-extrabold">
                    <span className="text-slate-400 uppercase">Load</span>
                    <span className="font-black text-amber-500">60% (Balanced)</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: "60%" }} />
                  </div>
                </div>

                {/* Task List */}
                <div className="flex flex-col gap-1.5 mt-1 text-left">
                  <div className="bg-slate-50 border border-slate-200/50 p-1.5 rounded-lg text-left">
                    <span className="text-[7.5px] font-bold text-slate-700 block leading-tight">Docs Sync</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/50 p-1.5 rounded-lg text-left">
                    <span className="text-[7.5px] font-bold text-slate-700 block leading-tight">Client Call</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Pointer for dragging */}
            {sceneElapsed >= 0.8 && sceneElapsed < 3.2 && (
              <motion.div
                initial={{ x: 60, y: 140, opacity: 0 }}
                animate={{
                  x: [60, 60, 195, 195],
                  y: [140, 110, 120, 140],
                  opacity: 1
                }}
                transition={{ duration: 2.2, ease: "easeInOut" }}
                className="absolute z-30 pointer-events-none"
                style={{ left: "20px", top: "10px" }}
              >
                <svg className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" viewBox="0 0 24 24" fill="none">
                  <path d="M4.5 3V17L9.2 12.8L14.5 21L17.5 19L12.3 11L18.5 11L4.5 3Z" fill="black" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </motion.div>
            )}

            {/* Success Toast */}
            <AnimatePresence>
              {sceneElapsed >= 3.5 && (
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50 }}
                  className="absolute bottom-3 inset-x-8 bg-indigo-650 text-white font-extrabold text-[8.5px] py-1.5 rounded-xl text-center shadow-lg flex items-center justify-center gap-1.5 z-20"
                >
                  <CheckCircle2 className="h-3 w-3 text-white animate-bounce" />
                  Workload Balanced: Alex's Burnout Risk Prevented!
                </motion.div>
              )}
            </AnimatePresence>
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

      <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col items-center">
        {/* Header */}
        <section className="text-center mb-10 max-w-2xl relative z-10">
          <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-extrabold text-slate-900 tracking-tight leading-none">
            See the Platform in Action
          </h1>
        </section>

        {/* Main Content Layout Grid */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-20 mb-10">
          {/* Video Player Layout - Glassmorphic Outer Wrapper in Premium Light Mode */}
          <section className="lg:col-span-7 xl:col-span-8 w-full">
          <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-3 md:p-4 shadow-2xl shadow-indigo-950/5 flex flex-col">
            
            {/* Browser Window mockup chrome frame */}
            <div className="w-full bg-slate-100 border-b border-slate-200/80 px-4 py-2 flex items-center justify-between select-none rounded-t-2xl">
              {/* Left: Window Controls */}
              <div className="flex items-center gap-1.5 w-1/4">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              
              {/* Center: Address Bar */}
              <div className="flex items-center gap-2 bg-white border border-slate-200/50 px-3 py-0.5 rounded-md text-[9px] font-bold text-slate-400 w-1/2 justify-center shadow-sm">
                <Lock className="h-2.5 w-2.5 text-indigo-500" />
                <span className="tracking-tight text-slate-655 font-semibold">guild.orbit/dashboard/{activeTab}</span>
              </div>
              
              {/* Right: Actions mockup */}
              <div className="w-1/4 flex justify-end gap-1.5 text-slate-400">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              </div>
            </div>

            {/* Screen Container */}
            <div className="relative aspect-video w-full rounded-b-2xl overflow-hidden bg-slate-50 flex flex-col items-center justify-center border-t-0 border border-slate-200/60 shadow-inner">
              {renderGraphicScreen()}

              {/* Idle Play Overlay - Light Glassmorphic */}
              {!isPlaying && currentTime === 0 && (
                <div className="absolute inset-0 bg-white/75 backdrop-blur-md flex flex-col items-center justify-center z-30">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={togglePlay}
                    className="h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-650/25 border border-indigo-400 cursor-pointer hover:bg-indigo-700 transition-colors"
                  >
                    <Play fill="currentColor" className="h-6 w-6 ml-1" />
                  </motion.button>
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mt-4">
                    Play Demo
                  </span>
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
                  className="flex-grow h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #4f46e5 ${(currentTime / TOTAL_DURATION) * 100}%, #e2e8f0 ${(currentTime / TOTAL_DURATION) * 100}%)`,
                  }}
                />
                <span className="text-[10px] text-slate-500 font-extrabold font-mono w-8 text-right">
                  {formatTime(TOTAL_DURATION)}
                </span>
              </div>

              {/* Button Controls */}
              <div className="flex items-center justify-between text-slate-500">
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    className="hover:text-slate-900 transition-colors cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="h-5 w-5 fill-slate-500 hover:fill-slate-900" /> : <Play className="h-5 w-5 fill-slate-500 hover:fill-slate-900" />}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="hover:text-slate-900 transition-colors cursor-pointer"
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
                      className="w-16 h-1 bg-slate-350 rounded appearance-none cursor-pointer accent-slate-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="hover:text-slate-900 transition-colors cursor-pointer" title="Fullscreen">
                    <Maximize className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </section>

          {/* Form CTA Section */}
          <section className="lg:col-span-5 xl:col-span-4 w-full bg-white/45 glass rounded-3xl p-6 md:p-8 border border-slate-200/50 shadow-sm relative overflow-hidden">
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
                  {errorMsg && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-2.5 rounded-xl text-xs font-semibold">
                      {errorMsg}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="name" className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        disabled={isSubmitting}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
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
                        disabled={isSubmitting}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@company.com"
                        className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="team-size" className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                      Expected Team Size
                    </label>
                    <select
                      id="team-size"
                      disabled={isSubmitting}
                      value={formData.teamSize}
                      onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                      className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
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
                      disabled={isSubmitting}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us a bit about your operational challenges..."
                      className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none disabled:opacity-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors text-white py-3 px-4 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5 mt-2 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Booking demo call...
                      </>
                    ) : (
                      <>
                        Book Demo Call
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
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
      </div> {/* Close Grid */}
      </div> {/* Close max-w-7xl */}
    </div>
  );
}
