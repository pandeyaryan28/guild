import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Sparkles, CheckSquare, MessageSquare, FileCheck } from 'lucide-react';
import { APP_URL } from '../../config/landingData';
import { useNavigation } from '../../context/NavigationContext';
import { CosmicCanvas3D } from './CosmicCanvas3D';
import { InteractiveMockup } from './InteractiveMockup';

const Words = ['Tasks', 'Direct Chats', 'Leave Approvals', 'Expense Sign-offs', 'Shared Files'];

export function HeroSection() {
  const { navigate } = useNavigation();
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % Words.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-36 md:pt-44 pb-20 px-6 overflow-hidden bg-slate-50/20 grid-pattern">
      {/* 3D Cosmic Node Canvas Background */}
      <div className="absolute inset-0 z-0 h-full w-full pointer-events-none">
        <CosmicCanvas3D />
      </div>

      {/* Glow blobs for visual depth */}
      <div className="absolute top-[12%] left-[10%] w-[380px] h-[380px] rounded-full bg-indigo-500/5 blur-[100px] animate-drift pointer-events-none z-0" />
      <div className="absolute top-[25%] right-[10%] w-[420px] h-[420px] rounded-full bg-cyan-500/5 blur-[110px] animate-drift-reverse pointer-events-none z-0" />
      <div className="absolute top-[45%] left-[30%] w-[320px] h-[320px] rounded-full bg-purple-500/4 blur-[90px] animate-drift pointer-events-none z-0" />

      <div className="max-w-5xl mx-auto flex flex-col items-center text-center relative z-10 pt-4">
        {/* Dynamic Bold Title */}
        <h1 className="text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold tracking-tight leading-[1.08] max-w-4xl text-slate-900 font-sans">
          Bring your team's{' '}
          <div className="block sm:inline-block h-[1.15em] relative align-bottom overflow-hidden w-full sm:w-[320px] md:w-[380px] text-left sm:text-center mt-1 sm:mt-0">
            <AnimatePresence mode="wait">
              <motion.span
                key={wordIndex}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -32 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-0 right-0 text-gradient-cosmic pb-1"
              >
                {Words[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
          <br className="hidden sm:inline" />
          <span className="relative">into perfect orbit.</span>
        </h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mt-6 text-base md:text-lg text-slate-500 max-w-2xl leading-relaxed font-semibold"
        >
          Stop checking five fragmented apps. Unify your team tasks, chat, approvals, and shared files in one beautifully coordinated workspace built for operational clarity.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="mt-9 flex flex-col sm:flex-row items-center gap-3.5 z-20"
        >
          <a
            href={`${APP_URL}/signup`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-6.5 py-3.5 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.97] hover:-translate-y-0.5"
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

        {/* Mini Feature Highlights */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[11px] font-bold text-slate-400"
        >
          <div className="flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5 text-indigo-500" />
            No Limits on Tasks
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-cyan-500" />
            Centralized Team Chats
          </div>
          <div className="flex items-center gap-1.5">
            <FileCheck className="h-3.5 w-3.5 text-purple-500" />
            Instant Leave & Sign-offs
          </div>
        </motion.div>

        {/* Interactive Dashboard Mockup Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 md:mt-20 w-full max-w-4xl z-20"
        >
          <InteractiveMockup />
        </motion.div>
      </div>
    </section>
  );
}
