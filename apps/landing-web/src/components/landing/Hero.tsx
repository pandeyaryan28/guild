import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Zap } from 'lucide-react';
import { APP_URL } from '../../config/landingData';

export function Hero() {
  return (
    <section className="relative pt-36 md:pt-48 pb-20 px-6 max-w-[1200px] mx-auto flex flex-col items-center">
      
      {/* Floating Accent pill */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="aether-glass border border-indigo-200/50 bg-indigo-50/20 text-indigo-600 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-6 flex items-center gap-1.5"
      >
        <Sparkles className="h-3 w-3 text-indigo-500" />
        The SMB Operations Monolith
      </motion.div>

      {/* Headline */}
      <motion.h1 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-center max-w-[900px] leading-[1.15] text-text-primary uppercase"
      >
        The Operations Center for <br className="hidden md:inline" />
        Teams that <span className="text-gradient bg-gradient-to-r from-indigo-600 to-violet-600">Move Fast</span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-xs md:text-sm text-text-secondary text-center mt-5 max-w-[620px] leading-relaxed font-medium"
      >
        Guild Orbit unites your team chat, task boards, and operational approvals into one beautiful glassmorphic workspace. Stop chasing status updates across five different apps.
      </motion.p>

      {/* CTAs */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex flex-col sm:flex-row items-center gap-4 mt-8 w-full sm:w-auto"
      >
        <a 
          href={`${APP_URL}/signup`} 
          className="w-full sm:w-auto h-11 px-7 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer relative overflow-hidden"
        >
          <div className="absolute inset-0 animate-shimmer pointer-events-none" />
          <Zap className="h-4 w-4 fill-white" />
          Get Started Free
        </a>
        <a 
          href="#features" 
          className="w-full sm:w-auto h-11 px-6 rounded-xl aether-glass border border-border-default hover:bg-white/40 text-text-secondary hover:text-text-primary text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-98 cursor-pointer"
        >
          Explore Features
        </a>
      </motion.div>

      {/* Hero Product Screenshot / Dashboard mockup mockup */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-16 md:mt-20 w-full max-w-[1000px] aspect-[16/10] rounded-[28px] p-2 aether-glass border border-indigo-100 shadow-2xl overflow-hidden animate-float select-none"
      >
        <div className="absolute inset-0 bg-dashboard-grid opacity-[0.06] pointer-events-none" />
        <img 
          src="/guild_hero_mockup.png" 
          alt="Guild Orbit Workspace Dashboard Mockup" 
          className="w-full h-full object-cover rounded-[20px] shadow-inner select-none"
          loading="eager"
        />
      </motion.div>
    </section>
  );
}
