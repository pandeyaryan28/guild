import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, Zap, Shield, Heart, Users } from 'lucide-react';
import { APP_URL } from '../config/landingData';
import { useNavigation } from '../context/NavigationContext';

export function Home() {
  const { navigate } = useNavigation();

  return (
    <div className="space-y-28 pb-16">
      {/* Hero Section */}
      <section className="relative pt-32 md:pt-40 pb-12 px-6 max-w-[1200px] mx-auto flex flex-col items-center">
        {/* Accent Pill */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="aether-glass border border-indigo-200/50 bg-indigo-50/20 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8 flex items-center gap-1.5 shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          The SMB Operations Monolith
        </motion.div>

        {/* Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-center max-w-[950px] leading-[1.15] text-text-primary uppercase"
        >
          The Operations Center for <br className="hidden md:inline" />
          Teams that <span className="text-gradient bg-gradient-to-r from-indigo-600 to-violet-600">Move Fast</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-sm md:text-base text-text-secondary text-center mt-6 max-w-[680px] leading-relaxed font-medium"
        >
          Guild Orbit unites team chat, task tracking, and operational approvals into one beautiful glassmorphic workspace. Stop chasing status updates across five different apps.
        </motion.p>

        {/* CTAs */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 mt-10 w-full sm:w-auto z-10"
        >
          <a 
            href={`${APP_URL}/signup`} 
            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer relative overflow-hidden"
          >
            <Zap className="h-4.5 w-4.5 fill-white" />
            Get Started Free
          </a>
          <button 
            onClick={() => navigate('/features')}
            className="w-full sm:w-auto h-12 px-8 rounded-xl aether-glass border border-border-default hover:bg-white/40 text-text-secondary hover:text-text-primary text-sm font-bold transition-all flex items-center justify-center gap-1 active:scale-98 cursor-pointer"
          >
            Explore Features
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        {/* Hero Product Screenshot */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.97, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-16 md:mt-24 w-full max-w-[1100px] aspect-[16/10] rounded-[28px] p-2 aether-glass border border-indigo-100 shadow-2xl overflow-hidden animate-float select-none"
        >
          <img 
            src="/guild_hero_mockup.png" 
            alt="Guild Orbit Workspace Dashboard Mockup" 
            className="w-full h-full object-cover rounded-[20px] shadow-inner select-none"
            loading="eager"
          />
        </motion.div>
      </section>

      {/* Metrics Section */}
      <section className="py-12 px-6 max-w-[1200px] mx-auto">
        <div className="aether-glass border border-border-default/60 p-8 md:p-12 rounded-[32px] grid grid-cols-2 md:grid-cols-4 gap-8 text-center bg-white/10">
          <div className="space-y-1">
            <p className="text-3xl md:text-4.5xl font-black text-indigo-600">5 Mins</p>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Average Onboarding</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl md:text-4.5xl font-black text-indigo-600">10 Secs</p>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Approval Submission</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl md:text-4.5xl font-black text-indigo-600">3 Apps</p>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Consolidated into 1</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl md:text-4.5xl font-black text-indigo-600">99.9%</p>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Uptime Reliability</p>
          </div>
        </div>
      </section>

      {/* Core Proposition Summary */}
      <section className="py-16 px-6 max-w-[1200px] mx-auto text-center space-y-16">
        <div className="max-w-[700px] mx-auto space-y-4">
          <h2 className="text-2xl md:text-4xl font-extrabold text-text-primary tracking-tight uppercase">
            Designed to Restore Operational Sanity
          </h2>
          <p className="text-sm text-text-secondary font-medium leading-relaxed">
            We avoid enterprise complexity and bloated features. Guild Orbit provides lightweight, lightning-fast tools that allow teams to focus on actual work.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-left">
          <div className="aether-glass p-8 space-y-4 hover:scale-[1.01] transition-transform duration-300">
            <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-md font-extrabold text-text-primary uppercase tracking-wide">Low Adoption Friction</h3>
            <p className="text-xs text-text-secondary leading-relaxed font-medium">
              Invite your team with a simple link. The workspace auto-initializes instantly so employees can start collaborating with zero training.
            </p>
          </div>

          <div className="aether-glass p-8 space-y-4 hover:scale-[1.01] transition-transform duration-300">
            <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="text-md font-extrabold text-text-primary uppercase tracking-wide">No Enterprise Bloat</h3>
            <p className="text-xs text-text-secondary leading-relaxed font-medium">
              We skip complex Gantt charts, automation builders, and configuration screens. You get clean chats, task boards, and approvals.
            </p>
          </div>

          <div className="aether-glass p-8 space-y-4 hover:scale-[1.01] transition-transform duration-300">
            <div className="h-10 w-10 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center">
              <Heart className="h-5 w-5" />
            </div>
            <h3 className="text-md font-extrabold text-text-primary uppercase tracking-wide">Visibility First</h3>
            <p className="text-xs text-text-secondary leading-relaxed font-medium">
              A single central feed tracks operational tasks, pending approvals, and active conversations so everyone stays in sync.
            </p>
          </div>
        </div>

        <div className="pt-4">
          <button 
            onClick={() => navigate('/solutions')}
            className="h-12 px-8 rounded-xl bg-text-primary text-white text-sm font-bold hover:bg-black/80 transition-all flex items-center gap-2 mx-auto cursor-pointer"
          >
            See Solutions In Action
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
        </div>
      </section>
    </div>
  );
}
