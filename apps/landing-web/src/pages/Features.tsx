import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  CheckSquare,
  FileCheck,
  FolderOpen,
  Shield,
  ArrowRight,
  Check,
  Sparkles,
  Clock,
  Users,
  Search,
  FileText,
  Plus,
  Maximize2
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { ScrollReveal } from '../components/landing/ScrollReveal';
import { CTABanner } from '../components/landing/CTABanner';

// Feature details with metadata
const featuresList = [
  {
    id: 'work-tracking',
    category: 'Work Tracking',
    icon: CheckSquare,
    title: 'Visual Task Boards & Kanban',
    description: 'Track operations with transparent Kanban boards, assigned task owners, and real-time statuses.',
    bullets: ['Lightweight Kanban boards', 'Assigned owners & due dates', 'Auditable priority triage'],
    path: '/features/work-tracking',
    image: '/work_tracking.png',
    color: 'indigo',
    accentClass: 'text-indigo-600 bg-indigo-50 border-indigo-150/40',
    glowColor: 'rgba(99, 102, 241, 0.15)',
    gradient: 'from-indigo-500 to-indigo-650',
    highlightBadge: 'In Progress'
  },
  {
    id: 'team-chat',
    category: 'Team Chat',
    icon: MessageSquare,
    title: 'Real-time Channels & DMs',
    description: 'Centralize communication in department chat channels, direct messages, and contextual task comments.',
    bullets: ['Department-focused channels', 'Secure private messaging', 'Unique /task chat shortcut'],
    path: '/features/team-chat',
    image: '/team_chat.png',
    color: 'cyan',
    accentClass: 'text-cyan-600 bg-cyan-50 border-cyan-150/40',
    glowColor: 'rgba(6, 182, 212, 0.15)',
    gradient: 'from-cyan-500 to-cyan-605',
    highlightBadge: '#logistics'
  },
  {
    id: 'approvals',
    category: 'Requests & Approvals',
    icon: FileCheck,
    title: 'One-Click Administrative Sign-offs',
    description: 'Submit, review, and authorize purchase orders, leave requests, and operational sign-offs instantly.',
    bullets: ['Leave & vacation requests', 'Purchase order approvals', 'Operational audit logs'],
    path: '/features/approvals',
    image: '/approvals.png',
    color: 'purple',
    accentClass: 'text-purple-600 bg-purple-50 border-purple-150/40',
    glowColor: 'rgba(168, 85, 247, 0.15)',
    gradient: 'from-purple-500 to-purple-650',
    highlightBadge: 'Approved'
  },
  {
    id: 'visibility',
    category: 'Visibility & Files',
    icon: FolderOpen,
    title: 'Central Dashboards & Shared Files',
    description: 'Establish a single source of truth with personal activity feeds, files directory, and task indexes.',
    bullets: ['Centralized dashboard views', 'Shared files directory', 'Global indexed search'],
    path: '/features/visibility',
    image: '/visibility.png',
    color: 'rose',
    accentClass: 'text-rose-600 bg-rose-50 border-rose-150/40',
    glowColor: 'rgba(244, 63, 94, 0.15)',
    gradient: 'from-rose-500 to-rose-650',
    highlightBadge: 'Shared'
  },
  {
    id: 'admin-console',
    category: 'Admin Console',
    icon: Shield,
    title: 'Operational Visibility & Workloads',
    description: 'Provide owners and managers with organizational intelligence to track resource allocation and project status.',
    bullets: ['Resource workload allocation', 'Project & goal health tracking', 'Overdue task triage dashboards'],
    path: '/features/admin-console',
    image: '/admin_console.png',
    color: 'violet',
    accentClass: 'text-violet-600 bg-violet-50 border-violet-150/40',
    glowColor: 'rgba(139, 92, 246, 0.15)',
    gradient: 'from-violet-500 to-violet-650',
    highlightBadge: 'Admin Only'
  }
];

export function Features() {
  const { navigate } = useNavigation();
  const [activeTab, setActiveTab] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse coordinate tracker hook for standard glow cards
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  // State for simulated audit ticker
  const [auditLogs, setAuditLogs] = useState<string[]>([
    'Checklist "Procurement Checklist" created by Ryan',
    'Task "Verify delivery schedule" moved to DONE',
    'Leave Request "Q3 Vacation" approved by Admin',
    'File "Contract_Draft_v2.pdf" uploaded to #operations'
  ]);

  useEffect(() => {
    const actions = [
      'Task "Audit Q3 Logistics Billing" created',
      'DM sent: "Let\'s sync on the dispatch schedule"',
      'Purchase Order PO-4091 signed off ($2,400)',
      'Department #marketing added to workspace',
      'Task owner updated: Alice -> "Dispatch coordination"'
    ];

    const interval = setInterval(() => {
      setAuditLogs((prev) => {
        const next = [...prev];
        next.shift();
        next.push(actions[Math.floor(Math.random() * actions.length)]);
        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Team Capacity Simulator state
  const [projectsCount, setProjectsCount] = useState(6);
  const [teamSize, setTeamSize] = useState(5);

  const getCapacityStatus = () => {
    const ratio = projectsCount / teamSize;
    if (ratio > 1.6) return { label: 'Critical Overload', color: 'text-rose-600 bg-rose-50 border-rose-150/50', percent: 95 };
    if (ratio > 1.1) return { label: 'Optimal Load', color: 'text-indigo-600 bg-indigo-50 border-indigo-150/50', percent: 78 };
    return { label: 'Under-utilized', color: 'text-cyan-600 bg-cyan-50 border-cyan-150/50', percent: 42 };
  };

  const capacity = getCapacityStatus();

  // Active feature item
  const activeFeature = featuresList[activeTab];

  return (
    <div className="pt-28 pb-8 relative overflow-hidden bg-slate-50/20 grid-pattern" ref={containerRef}>
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-[5%] w-[500px] h-[500px] rounded-full bg-indigo-400/5 blur-[120px] animate-drift pointer-events-none" />
      <div className="absolute top-[50%] right-[5%] w-[500px] h-[500px] rounded-full bg-cyan-400/5 blur-[120px] animate-drift-reverse pointer-events-none" />

      {/* 1. Hero Section */}
      <section className="px-6 max-w-5xl mx-auto text-center mb-20 relative z-10">
        {/* Floating Background Glass Shards */}
        <div className="absolute -top-12 -left-8 md:left-4 w-44 pointer-events-none select-none z-0 hidden sm:block">
          <div className="glass dark-glass rounded-2xl p-3 shadow-md animate-float opacity-80 border border-white/40 scale-90">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>DMs: Project Approved</span>
            </div>
            <p className="text-[9px] text-slate-500 font-semibold mt-1">Let's ship dispatch board today!</p>
          </div>
        </div>

        <div className="absolute -top-8 -right-8 md:right-4 w-48 pointer-events-none select-none z-0 hidden sm:block [animation-delay:2s]">
          <div className="glass rounded-2xl p-3 shadow-md animate-float opacity-80 border border-white/40 scale-95" style={{ animationDelay: '2s' }}>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-800">
              <CheckSquare className="h-3 w-3 text-indigo-500" />
              <span>Verify Fleet Routing</span>
            </div>
            <div className="h-1 w-20 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full w-3/4 bg-indigo-500 rounded-full" />
            </div>
          </div>
        </div>

        <div className="absolute -bottom-16 left-12 w-48 pointer-events-none select-none z-0 hidden md:block" style={{ animationDelay: '4s' }}>
          <div className="glass rounded-2xl p-3.5 shadow-md animate-float opacity-85 border border-white/40" style={{ animationDelay: '4s' }}>
            <div className="flex items-center gap-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
              Approvals Queue
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 bg-white/50 p-1.5 rounded-lg border border-slate-100/50">
              <span>Vacation Request</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold uppercase">Approved</span>
            </div>
          </div>
        </div>

        {/* Hero Copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-150/40 bg-indigo-50/50 text-indigo-750 text-[10.5px] font-extrabold uppercase tracking-wider mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Operational Tour</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Clarity in <span className="text-gradient">every module</span>. <br/>
            Power in <span className="text-gradient-cosmic">every flow</span>.
          </h1>
          <p className="mt-4 text-slate-500 text-xs md:text-sm font-semibold max-w-xl mx-auto leading-relaxed">
            Consolidate task queues, department chat channels, formal approvals, and workload visibility into a single operational hub designed for absolute velocity.
          </p>
        </motion.div>
      </section>

      {/* 2. Interactive Spotlight Showcase */}
      <section className="max-w-6xl mx-auto px-6 mb-28 relative z-10">
        <ScrollReveal>
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Column Selector: 5 features list */}
            <div className="lg:col-span-5 flex flex-col justify-center gap-3">
              {featuresList.map((f, idx) => {
                const Icon = f.icon;
                const isActive = activeTab === idx;

                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveTab(idx)}
                    onMouseMove={handleMouseMove}
                    className={`text-left p-5 rounded-2xl transition-all duration-300 relative border flex items-start gap-4 cursor-pointer outline-none select-none group w-full ${
                      isActive 
                        ? 'bg-white border-indigo-150/80 shadow-md shadow-indigo-100/30' 
                        : 'bg-white/40 border-slate-150/40 hover:bg-white/70 hover:border-slate-250 hover:shadow-sm'
                    } mouse-glow-card mouse-glow-border`}
                  >
                    {/* Active slide indicator pill */}
                    {isActive && (
                      <motion.div
                        layoutId="activeFeatureIndicator"
                        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-50/30 via-transparent to-transparent pointer-events-none"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}

                    {/* Icon wrapper */}
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-300 relative z-10 ${
                      isActive 
                        ? 'bg-indigo-600 text-white border-indigo-650 scale-105 shadow-sm' 
                        : 'bg-slate-50 text-slate-500 border-slate-100 group-hover:scale-105'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="space-y-1 relative z-10 flex-grow">
                      <div className="flex justify-between items-center">
                        <span className={`text-[9.5px] font-extrabold uppercase tracking-wider ${
                          isActive ? 'text-indigo-600' : 'text-slate-400'
                        }`}>
                          {f.category}
                        </span>
                        {isActive && (
                          <span className="text-[9.5px] font-extrabold bg-indigo-50 text-indigo-750 px-2 py-0.5 rounded border border-indigo-100/40">
                            Active
                          </span>
                        )}
                      </div>
                      <h3 className={`text-[13.5px] font-bold tracking-tight ${
                        isActive ? 'text-slate-900' : 'text-slate-700'
                      }`}>
                        {f.title}
                      </h3>
                      {isActive && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-[11.5px] text-slate-500 font-semibold leading-relaxed pt-1"
                        >
                          {f.description}
                        </motion.p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Visual Device Frame & Cross-Fading Mockups */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="bg-slate-900/90 dark-glass rounded-3xl p-3.5 shadow-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between h-[420px]">
                {/* Visual Glass Header Bar */}
                <div className="flex justify-between items-center border-b border-white/5 pb-2.5 mb-3 px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
                    <span>Guild Orbit</span>
                    <span>•</span>
                    <span className="text-cyan-400 font-bold">{activeFeature.category}</span>
                  </div>
                  <div className="h-4 w-4 flex items-center justify-center text-slate-500">
                    <Maximize2 className="h-3 w-3" />
                  </div>
                </div>

                {/* Display Container with Image Cross-Fade */}
                <div className="relative flex-grow rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-white/5 shadow-inner">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeFeature.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.35, ease: 'easeInOut' }}
                      className="absolute inset-0 flex items-center justify-center p-2"
                    >
                      <img
                        src={activeFeature.image}
                        alt={activeFeature.title}
                        className="w-full h-full object-cover rounded-xl border border-white/10 shadow-lg object-top"
                      />

                      {/* Accent highlight glow overlay */}
                      <div 
                        className="absolute inset-0 pointer-events-none rounded-xl mix-blend-screen opacity-10"
                        style={{
                          background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${activeFeature.glowColor}, transparent)`
                        }}
                      />

                      {/* Dynamic Floating Badge Overlay specific to active tab */}
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 18 }}
                        className="absolute bottom-4 right-4 z-20"
                      >
                        <div className="glass dark-glass rounded-xl p-2.5 border border-white/10 shadow-lg flex items-center gap-2 text-[10.5px] font-bold text-white">
                          <div className="h-2 w-2 rounded-full animate-pulse" style={{
                            backgroundColor: activeFeature.color === 'indigo' ? '#6366f1' : 
                                             activeFeature.color === 'cyan' ? '#06b6d4' : 
                                             activeFeature.color === 'purple' ? '#a855f7' : 
                                             activeFeature.color === 'rose' ? '#f43f5e' : '#8b5cf6'
                          }} />
                          <span>Status: {activeFeature.highlightBadge}</span>
                        </div>
                      </motion.div>

                      {/* Interactive Floating Micro-graphics for wow-factor */}
                      {activeFeature.id === 'work-tracking' && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="absolute top-6 left-6 z-25 bg-slate-900/90 border border-white/10 rounded-xl p-2 shadow-xl flex items-center gap-2 max-w-[140px]"
                        >
                          <CheckSquare className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                          <div className="text-left">
                            <p className="text-[8.5px] text-white font-bold truncate">Update dispatch fleet</p>
                            <p className="text-[7px] text-slate-400 font-semibold uppercase">Logistics</p>
                          </div>
                        </motion.div>
                      )}

                      {activeFeature.id === 'team-chat' && (
                        <motion.div
                          initial={{ opacity: 0, y: -15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute top-6 right-6 z-25 bg-slate-900/90 border border-cyan-500/20 rounded-xl p-2.5 shadow-xl flex items-start gap-2 max-w-[180px]"
                        >
                          <div className="h-4 w-4 rounded-full bg-cyan-600 flex items-center justify-center text-[7.5px] text-white font-extrabold">A</div>
                          <div className="text-left">
                            <p className="text-[8.5px] text-slate-200 font-bold leading-tight">Aryan: Dispatch logs uploaded to #delivery</p>
                          </div>
                        </motion.div>
                      )}

                      {activeFeature.id === 'approvals' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', damping: 12 }}
                          className="absolute top-6 left-6 z-25 border border-purple-500/30 rounded-2xl bg-slate-900/95 p-3 shadow-xl text-center"
                        >
                          <div className="flex justify-center mb-1">
                            <div className="h-6 w-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                              <FileCheck className="h-3.5 w-3.5" />
                            </div>
                          </div>
                          <p className="text-[8.5px] text-white font-extrabold uppercase tracking-wide">Signature Valid</p>
                          <p className="text-[7.5px] text-slate-400 font-semibold mt-0.5">PO-1049 Approved</p>
                        </motion.div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Learn More & Module Navigation bar */}
                <div className="mt-3 flex justify-between items-center px-1">
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Interactive Preview • Click Learn More to deep dive
                  </span>
                  <button
                    onClick={() => navigate(activeFeature.path)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer group"
                  >
                    Learn more
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </ScrollReveal>
      </section>

      {/* 3. Immersive Interactive Bento Showcase */}
      <section className="max-w-5xl mx-auto px-6 mb-24 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Under the Hood Operational Mechanics
            </h2>
            <p className="text-slate-500 text-xs font-semibold max-w-md mx-auto leading-relaxed">
              Guild Orbit is built from the ground up to prevent communication dropouts and audit gaps.
            </p>
          </div>
        </ScrollReveal>

        {/* Bento Asymmetrical Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          {/* Card 1: Live Interactive Capacity Calculator (5 cols) */}
          <div 
            onMouseMove={handleMouseMove}
            className="md:col-span-5 glass rounded-3xl p-6 border border-slate-150 shadow-sm flex flex-col justify-between min-h-[340px] mouse-glow-card mouse-glow-border group/bento"
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/40">
                  Capacity Monitor
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Simulator</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Interactive Capacity Simulator
              </h3>
              <p className="text-[11.5px] text-slate-500 font-semibold leading-relaxed mt-1.5">
                Drag controls to simulate department load allocation. See how Guild prevents burnout.
              </p>
            </div>

            {/* Interactive Sliders */}
            <div className="my-5 space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100 shadow-inner">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10.5px] font-bold text-slate-600">
                  <span>Active Tasks:</span>
                  <span className="text-indigo-650 font-extrabold">{projectsCount}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={projectsCount}
                  onChange={(e) => setProjectsCount(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10.5px] font-bold text-slate-600">
                  <span>Team Size:</span>
                  <span className="text-indigo-650 font-extrabold">{teamSize} Members</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={teamSize}
                  onChange={(e) => setTeamSize(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Calculator Output */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="text-left">
                <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">Status Outcome</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded-md border ${capacity.color}`}>
                    {capacity.label}
                  </span>
                </div>
              </div>

              {/* Progress dial representation */}
              <div className="relative h-11 w-11 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-150"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${
                      capacity.percent > 90 ? 'text-rose-500' : capacity.percent > 60 ? 'text-indigo-500' : 'text-cyan-500'
                    } transition-all duration-300`}
                    strokeWidth="3.5"
                    strokeDasharray={`${capacity.percent}, 100`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-[9px] font-extrabold text-slate-800">{capacity.percent}%</span>
              </div>
            </div>
          </div>

          {/* Card 2: Real-time Audit Ticker (7 cols) */}
          <div 
            onMouseMove={handleMouseMove}
            className="md:col-span-7 glass rounded-3xl p-6 border border-slate-150 shadow-sm flex flex-col justify-between min-h-[340px] mouse-glow-card mouse-glow-border group/bento"
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/40">
                  Operational Safety
                </span>
                <div className="flex items-center gap-1 text-[9.5px] text-slate-400 font-bold">
                  <Clock className="h-3 w-3 text-emerald-500 animate-spin" style={{ animationDuration: '3s' }} />
                  <span>Real-time</span>
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Granular Audit Trail Logging
              </h3>
              <p className="text-[11.5px] text-slate-500 font-semibold leading-relaxed mt-1.5">
                Every file drop, task reassignment, and purchase order signature is logged securely. No more accountability gaps.
              </p>
            </div>

            {/* Audit Trail List with simulated updates */}
            <div className="my-5 bg-slate-950 rounded-2xl p-4 border border-white/5 font-mono text-[10.5px] text-slate-400 shadow-inner flex-grow flex flex-col justify-between gap-2.5 relative overflow-hidden">
              {/* Overlay glow */}
              <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-slate-950 to-transparent pointer-events-none" />
              
              <AnimatePresence mode="popLayout">
                {auditLogs.map((log, index) => (
                  <motion.div
                    key={log + index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-2 border-b border-white/5 pb-1.5 last:border-0 last:pb-0"
                  >
                    <span className="text-emerald-500 shrink-0 select-none">&gt;&gt;</span>
                    <span className="truncate leading-relaxed text-slate-350">{log}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="text-[10px] text-slate-500 font-semibold">
              Automatically synced with immutable ledger indexes.
            </div>
          </div>

          {/* Card 3: Asymmetric Bento Row - File vault (6 cols) */}
          <div 
            onMouseMove={handleMouseMove}
            className="md:col-span-6 glass rounded-3xl p-6 border border-slate-150 shadow-sm flex flex-col justify-between min-h-[260px] mouse-glow-card mouse-glow-border group/bento"
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100/40">
                  Shared Vault
                </span>
                <span className="text-[10px] text-slate-400 font-bold">100% Encrypted</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Secure Files Directory
              </h3>
              <p className="text-[11.5px] text-slate-500 font-semibold leading-relaxed mt-1.5">
                Upload expense bills, contract sheets, or fleet routing maps directly into task comments or department logs. Shared securely with role locks.
              </p>
            </div>

            {/* Folder Mock representation */}
            <div className="mt-4 bg-white/60 p-3.5 rounded-2xl border border-slate-150/70 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800">Operational_Rules_v3.pdf</p>
                  <p className="text-[10px] text-slate-400 font-semibold">Uploaded by Alice • 4.2 MB</p>
                </div>
              </div>
              <span className="text-[9.5px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-extrabold uppercase shrink-0">
                Shared
              </span>
            </div>
          </div>

          {/* Card 4: Asymmetric Bento Row - Instant Channels (6 cols) */}
          <div 
            onMouseMove={handleMouseMove}
            className="md:col-span-6 glass rounded-3xl p-6 border border-slate-150 shadow-sm flex flex-col justify-between min-h-[260px] mouse-glow-card mouse-glow-border group/bento"
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100/40">
                  Structured Channels
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Live Link</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Contextual Chat Channels
              </h3>
              <p className="text-[11.5px] text-slate-500 font-semibold leading-relaxed mt-1.5">
                Segment teams into distinct focus points to restrict noise. Bridge conversations with task indexes instantly using shortcuts.
              </p>
            </div>

            {/* Interactive Channels List mockup */}
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 text-indigo-700 text-xs font-bold shadow-sm">
                <span className="text-indigo-400 font-bold">#</span>
                <span>operations</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-200 bg-cyan-50/50 text-cyan-700 text-xs font-bold shadow-sm">
                <span className="text-cyan-400 font-bold">#</span>
                <span>logistics-dispatch</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-150 bg-white/80 text-slate-500 text-xs font-bold shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer">
                <Plus className="h-3.5 w-3.5" />
                <span>Create Channel</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. Action Banner */}
      <CTABanner />
    </div>
  );
}
