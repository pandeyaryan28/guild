import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ArrowRight,
  Kanban,
  MessageSquare,
  CheckSquare,
  Users,
  Tv,
  CheckCircle2,
  Calendar,
  Sparkles
} from 'lucide-react';

interface Scene {
  id: string;
  title: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  icon: any;
  label: string;
  description: string;
}

const SCENES: Scene[] = [
  {
    id: 'tasks',
    title: 'Tasks & Kanban',
    startTime: 0,
    endTime: 25,
    icon: Kanban,
    label: 'Kanban Boards',
    description: 'Organize work visually, update task statuses, and assign duties in a clean drag-and-drop Kanban view.',
  },
  {
    id: 'chat',
    title: 'Team Channels',
    startTime: 25,
    endTime: 50,
    icon: MessageSquare,
    label: 'Group Chat',
    description: 'Keep chat rooms aligned with departments, projects, or threads, with full slack-like message history.',
  },
  {
    id: 'approvals',
    title: 'Approvals Log',
    startTime: 50,
    endTime: 75,
    icon: CheckSquare,
    label: 'Operational Sign-offs',
    description: 'Request formal sign-offs for releases, budgets, or designs, tracking the status with a clear log.',
  },
  {
    id: 'directory',
    title: 'Workload Directory',
    startTime: 75,
    endTime: 100,
    icon: Users,
    label: 'Team Directory',
    description: 'Check department allocations, view what tasks team members are on, and avoid workload burnout.',
  },
];

const TOTAL_DURATION = 100; // seconds

export function Demo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [activeTab, setActiveTab] = useState('tasks');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', teamSize: '5-20', message: '' });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync active tab based on current time
  useEffect(() => {
    const matchingScene = SCENES.find(
      (s) => currentTime >= s.startTime && currentTime < s.endTime
    );
    if (matchingScene && matchingScene.id !== activeTab) {
      setActiveTab(matchingScene.id);
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

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleMute = () => setIsMuted(!isMuted);

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCurrentTime(value);
  };

  const jumpToScene = (scene: Scene) => {
    setCurrentTime(scene.startTime);
    setActiveTab(scene.id);
    setIsPlaying(true);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API request
    setTimeout(() => {
      setFormSubmitted(true);
    }, 600);
  };

  // Simulated scene views inside the player
  const renderPlayerScreen = () => {
    // Current scene time percentage (0 to 100%) inside its 25-second slot
    const currentScene = SCENES.find((s) => s.id === activeTab) || SCENES[0];
    const sceneProgress = ((currentTime - currentScene.startTime) / 25) * 100;

    switch (activeTab) {
      case 'tasks':
        return (
          <div className="w-full h-full bg-slate-900 flex flex-col p-4 text-white select-none">
            {/* Mock Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-[10px] text-slate-400 font-semibold ml-2">Guild Workspace / Tasks</span>
              </div>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full font-bold border border-indigo-500/30">
                Kanban view
              </span>
            </div>

            {/* Mock Board */}
            <div className="grid grid-cols-3 gap-3 flex-grow">
              {/* Column 1 */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col gap-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">To Do (2)</span>
                <div className="bg-white/10 p-2.5 rounded-lg border border-white/5 text-[10px] font-semibold space-y-1.5 shadow-sm">
                  <p>Design landing feedback section</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">High</span>
                    <div className="h-4 w-4 rounded-full bg-slate-500 text-[8px] flex items-center justify-center font-bold">JD</div>
                  </div>
                </div>
                {/* Dragging Task animation */}
                {sceneProgress < 40 && (
                  <div className="bg-white/10 p-2.5 rounded-lg border border-white/5 text-[10px] font-semibold space-y-1.5 shadow-sm">
                    <p>Integrate Stripe webhooks</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">Feature</span>
                      <div className="h-4 w-4 rounded-full bg-slate-500 text-[8px] flex items-center justify-center font-bold">AP</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2 */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col gap-2 relative">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">In Progress</span>
                {/* Animated arrival of dragging task */}
                {sceneProgress >= 40 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="bg-white/15 p-2.5 rounded-lg border border-indigo-500/30 text-[10px] font-semibold space-y-1.5 shadow-md shadow-indigo-500/5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-indigo-200">Integrate Stripe webhooks</p>
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">Feature</span>
                      <div className="h-4 w-4 rounded-full bg-indigo-600 text-[8px] flex items-center justify-center font-bold">AP</div>
                    </div>
                  </motion.div>
                )}
                <div className="bg-white/10 p-2.5 rounded-lg border border-white/5 text-[10px] font-semibold space-y-1.5 shadow-sm">
                  <p>Refactor auth state flow</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded">Bug</span>
                    <div className="h-4 w-4 rounded-full bg-cyan-500 text-[8px] flex items-center justify-center font-bold">SK</div>
                  </div>
                </div>
              </div>

              {/* Column 3 */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col gap-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Done</span>
                <div className="bg-white/10 p-2.5 rounded-lg border border-white/5 text-[10px] font-semibold space-y-1.5 line-through text-slate-500 shadow-sm">
                  <p>Draft user guide markdown</p>
                  <div className="flex items-center justify-between opacity-50">
                    <span className="text-[8px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">Docs</span>
                    <div className="h-4 w-4 rounded-full bg-slate-500 text-[8px] flex items-center justify-center font-bold">JD</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Pointer cursor simulation */}
            {sceneProgress < 40 && (
              <motion.div
                animate={{
                  x: [60, 160],
                  y: [140, 110],
                }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                className="absolute h-5 w-5 pointer-events-none z-50 text-indigo-400"
                style={{ left: '20%', top: '40%' }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 drop-shadow-md">
                  <path d="M4 4l12.4 12.4-4.8.9 3.2 6.7-2.7 1.3-3.2-6.7-4.9 4.9V4z" />
                </svg>
              </motion.div>
            )}
          </div>
        );
      case 'chat':
        // Chat room simulation
        const messages = [
          { name: 'Sarah', role: 'Product', text: 'Hey teams! Are we ready for the 2:00 PM sprint review?' },
          { name: 'Alex', role: 'Dev', text: 'Stripe webhook integration is In Progress. Visual QA is done!' },
          { name: 'David', role: 'Design', text: 'I uploaded the landing assets in the workspace folder.' },
        ];
        return (
          <div className="w-full h-full bg-slate-900 flex flex-col p-4 text-white select-none">
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-indigo-400 font-bold text-xs">#</span>
                <span className="text-xs font-bold text-slate-200">sprint-coordination</span>
                <span className="text-[9px] text-slate-500 font-bold">• 12 members</span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold">
                Sync Channels
              </span>
            </div>

            {/* Chat bubbles list */}
            <div className="flex-grow flex flex-col gap-3 justify-end pb-2">
              {sceneProgress > 10 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 items-start">
                  <div className="h-7 w-7 rounded-lg bg-pink-600 text-[10px] flex items-center justify-center font-bold uppercase shadow-inner">SO</div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold text-slate-200">{messages[0].name}</span>
                      <span className="text-[8px] text-indigo-300 font-extrabold uppercase bg-indigo-500/10 px-1 rounded">{messages[0].role}</span>
                    </div>
                    <p className="text-[10px] text-slate-300 bg-white/5 px-2.5 py-1.5 rounded-r-xl rounded-bl-xl border border-white/5 max-w-[280px]">
                      {messages[0].text}
                    </p>
                  </div>
                </motion.div>
              )}

              {sceneProgress > 45 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 items-start">
                  <div className="h-7 w-7 rounded-lg bg-blue-600 text-[10px] flex items-center justify-center font-bold uppercase shadow-inner">AP</div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold text-slate-200">{messages[1].name}</span>
                      <span className="text-[8px] text-cyan-300 font-extrabold uppercase bg-cyan-500/10 px-1 rounded">{messages[1].role}</span>
                    </div>
                    <p className="text-[10px] text-slate-300 bg-white/5 px-2.5 py-1.5 rounded-r-xl rounded-bl-xl border border-white/5 max-w-[280px]">
                      {messages[1].text}
                    </p>
                  </div>
                </motion.div>
              )}

              {sceneProgress > 80 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 items-start">
                  <div className="h-7 w-7 rounded-lg bg-emerald-600 text-[10px] flex items-center justify-center font-bold uppercase shadow-inner">DK</div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold text-slate-200">{messages[2].name}</span>
                      <span className="text-[8px] text-emerald-300 font-extrabold uppercase bg-emerald-500/10 px-1 rounded">{messages[2].role}</span>
                    </div>
                    <p className="text-[10px] text-slate-300 bg-white/5 px-2.5 py-1.5 rounded-r-xl rounded-bl-xl border border-white/5 max-w-[280px]">
                      {messages[2].text}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
            {/* Input simulator */}
            <div className="bg-white/5 border border-white/10 p-2 rounded-xl flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-semibold pl-1">Message #sprint-coordination...</span>
              <div className="h-5 w-10 bg-indigo-600 rounded-lg flex items-center justify-center text-[9px] font-bold">Send</div>
            </div>
          </div>
        );
      case 'approvals':
        return (
          <div className="w-full h-full bg-slate-900 flex flex-col p-4 text-white select-none relative">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <span className="text-xs font-bold text-slate-200">Department Approvals Log</span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                1 Pending Sign-off
              </span>
            </div>

            {/* Approvals Table */}
            <div className="flex-grow flex flex-col gap-2">
              {/* Row 1 */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-250">Marketing Budget Q3 Approval</h4>
                  <p className="text-[8px] text-slate-500 mt-0.5">Requested by Sarah Jenkins • Marketing</p>
                </div>
                <div className="flex items-center gap-2">
                  {sceneProgress < 50 ? (
                    <span className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-1 rounded-lg font-bold">
                      Pending
                    </span>
                  ) : (
                    <motion.span
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      className="text-[9px] bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-1 rounded-lg font-bold flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      Approved
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Row 2 */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between opacity-60">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-300">Stripe Integration Deployment</h4>
                  <p className="text-[8px] text-slate-500 mt-0.5">Approved by CTO • Engineering</p>
                </div>
                <span className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/20 px-2 py-1 rounded-lg font-bold">
                  Approved
                </span>
              </div>
            </div>

            {/* Mouse Click Overlay Simulation */}
            {sceneProgress >= 30 && sceneProgress < 55 && (
              <motion.div
                animate={{
                  x: [220, 260],
                  y: [120, 75],
                }}
                transition={{ duration: 1.2 }}
                className="absolute h-5 w-5 pointer-events-none z-50 text-indigo-400"
                style={{ left: '50%', top: '50%' }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 drop-shadow-md">
                  <path d="M4 4l12.4 12.4-4.8.9 3.2 6.7-2.7 1.3-3.2-6.7-4.9 4.9V4z" />
                </svg>
              </motion.div>
            )}
          </div>
        );
      case 'directory':
        return (
          <div className="w-full h-full bg-slate-900 flex flex-col p-4 text-white select-none">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <span className="text-xs font-bold text-slate-200">Workspace Member Allocation</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                Healthy Workloads
              </span>
            </div>

            {/* Directory Grid */}
            <div className="grid grid-cols-2 gap-3 flex-grow">
              {/* Member Card 1 */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-[10px]">SO</div>
                <div className="flex-grow min-w-0">
                  <h4 className="text-[10px] font-bold truncate">Sarah O'Connor</h4>
                  <p className="text-[8px] text-slate-500 truncate">Product Lead</p>
                  {/* Allocation meter */}
                  <div className="mt-1.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: '70%' }} />
                  </div>
                </div>
              </div>

              {/* Member Card 2 */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-[10px]">AP</div>
                <div className="flex-grow min-w-0">
                  <h4 className="text-[10px] font-bold truncate">Aryan Pandey</h4>
                  <p className="text-[8px] text-slate-500 truncate">Senior Engineer</p>
                  <div className="mt-1.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-yellow-500 h-full rounded-full" style={{ width: '90%' }} />
                  </div>
                </div>
              </div>

              {/* Member Card 3 */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-[10px]">DK</div>
                <div className="flex-grow min-w-0">
                  <h4 className="text-[10px] font-bold truncate">David Kim</h4>
                  <p className="text-[8px] text-slate-500 truncate">UI Designer</p>
                  <div className="mt-1.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>
              </div>

              {/* Member Card 4 */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-rose-500 flex items-center justify-center font-bold text-[10px]">EL</div>
                <div className="flex-grow min-w-0">
                  <h4 className="text-[10px] font-bold truncate">Emily Lucas</h4>
                  <p className="text-[8px] text-slate-500 truncate">QA Specialist</p>
                  <div className="mt-1.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full rounded-full" style={{ width: '30%' }} />
                  </div>
                </div>
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
            Watch Walkthrough
          </span>
          <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-extrabold text-slate-900 tracking-tight leading-none">
            See how Guild Orbit works
          </h1>
          <p className="mt-4 text-sm font-semibold text-slate-500 max-w-lg mx-auto leading-relaxed">
            Take a 100-second tour of our collaborative workspaces, task dashboards, department chat rooms, and automated sign-offs.
          </p>
        </section>

        {/* Video Player Layout */}
        <section className="w-full max-w-4xl relative z-20 mb-16">
          <div className="bg-slate-950 rounded-3xl p-3 md:p-4 shadow-2xl border border-slate-800 flex flex-col">
            
            {/* Screen Container */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-inner flex items-center justify-center">
              {renderPlayerScreen()}

              {/* Idle Play Overlay */}
              {!isPlaying && currentTime === 0 && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={togglePlay}
                    className="h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 border border-indigo-500 cursor-pointer"
                  >
                    <Play fill="currentColor" className="h-6 w-6 ml-1" />
                  </motion.button>
                  <span className="text-xs font-extrabold text-white uppercase tracking-widest mt-4">
                    Play Product Walkthrough
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 mt-1">Duration: 1:40 min</span>
                </div>
              )}
            </div>

            {/* Custom Video Controls */}
            <div className="flex flex-col gap-2.5 mt-3 px-2">
              {/* Scrubber / Progress Bar */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 font-extrabold font-mono w-8">
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
                    background: `linear-gradient(to right, #4f46e5 ${currentTime}%, #1e293b ${currentTime}%)`,
                  }}
                />
                <span className="text-[10px] text-slate-400 font-extrabold font-mono w-8 text-right">
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
                  <span className="text-[9px] font-bold text-slate-500 uppercase mr-2 flex items-center gap-1">
                    <Tv className="h-3 w-3 text-slate-500" />
                    Simulated Walkthrough
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
          {SCENES.map((scene) => {
            const Icon = scene.icon;
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
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    isTabActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-900 leading-tight">
                    {scene.title}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                  {scene.description}
                </p>
                <span className="text-[9px] font-bold text-indigo-600 mt-1 flex items-center gap-1">
                  Jump to {formatTime(scene.startTime)}
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
                <div className="mt-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 text-[10px] text-slate-500 font-semibold max-w-xs flex gap-2.5 text-left items-center">
                  <Calendar className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                  <span>We'll coordinate a time suitable for your team's timezone.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
