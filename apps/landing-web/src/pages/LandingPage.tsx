import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  MessageSquare, 
  CheckSquare, 
  FileCheck, 
  LayoutDashboard, 
  ArrowRight, 
  Users, 
  BarChart3, 
  Clock, 
  ChevronDown, 
  Menu, 
  X, 
  Building2, 
  Sparkles, 
  Check, 
  HelpCircle,
  TrendingUp,
  Workflow
} from 'lucide-react';

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [activeFAQ, setActiveFAQ] = React.useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setActiveFAQ(activeFAQ === index ? null : index);
  };

  const APP_URL = "https://app.guildhq.space";

  return (
    <div className="relative min-h-screen text-text-primary z-10 antialiased overflow-x-hidden pb-16">
      
      {/* ─────────────────────────────────────────────────────────────────────────────
         NAVBAR
      ───────────────────────────────────────────────────────────────────────────── */}
      <header className="fixed top-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[1200px] z-50 transition-all duration-300">
        <nav className="aether-glass flex items-center justify-between px-6 py-3.5 shadow-md">
          {/* Brand Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-black text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
              G
            </div>
            <span className="text-lg font-black tracking-wider uppercase text-gradient bg-gradient-to-r from-indigo-600 to-violet-600">
              GuildHQ
            </span>
          </a>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">Features</a>
            <a href="#solutions" className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">Solutions</a>
            <a href="#pricing" className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">Pricing</a>
            <a href="#faq" className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">FAQ</a>
          </div>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <a 
              href={`${APP_URL}/login`} 
              className="text-xs font-bold text-text-secondary hover:text-text-primary transition-colors px-4 py-2"
            >
              Sign In
            </a>
            <a 
              href={`${APP_URL}/signup`} 
              className="aether-glass border border-indigo-200 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-500 hover:text-white px-5.5 py-2.5 text-xs font-bold rounded-xl active:scale-95 flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-indigo-500/10"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/5 active:scale-95 transition-all"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="aether-glass-elevated absolute top-16 left-0 right-0 p-5 mt-2 flex flex-col gap-4 shadow-xl z-40 border border-border-default/80"
            >
              <a 
                href="#features" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-text-secondary hover:text-text-primary py-1"
              >
                Features
              </a>
              <a 
                href="#solutions" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-text-secondary hover:text-text-primary py-1"
              >
                Solutions
              </a>
              <a 
                href="#pricing" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-text-secondary hover:text-text-primary py-1"
              >
                Pricing
              </a>
              <a 
                href="#faq" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-text-secondary hover:text-text-primary py-1"
              >
                FAQ
              </a>
              <div className="h-[1px] bg-border-default/60 my-1" />
              <div className="flex flex-col gap-2">
                <a 
                  href={`${APP_URL}/login`} 
                  className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-text-secondary border border-transparent hover:bg-black/5"
                >
                  Sign In
                </a>
                <a 
                  href={`${APP_URL}/signup`} 
                  className="w-full text-center py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all active:scale-95"
                >
                  Create Workspace
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────────
         HERO SECTION
      ───────────────────────────────────────────────────────────────────────────── */}
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
          GuildHQ unites your team chat, task boards, and operational approvals into one beautiful glassmorphic workspace. Stop chasing status updates across five different apps.
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
            alt="GuildHQ Workspace Dashboard Mockup" 
            className="w-full h-full object-cover rounded-[20px] shadow-inner select-none"
            loading="eager"
          />
        </motion.div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
         THE CHAOS VS GUILD (PROBLEM / SOLUTION)
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="solutions" className="py-20 px-6 max-w-[1200px] mx-auto scroll-mt-20">
        <div className="text-center max-w-[700px] mx-auto mb-16">
          <h2 className="text-2xl md:text-3.5xl font-black text-text-primary tracking-tight uppercase">
            Operational Chaos vs. Unified Control
          </h2>
          <p className="text-xs text-text-secondary mt-3 font-medium">
            Most teams coordinate through a mess of disconnected chats, tasks, and file storage. GuildHQ is the simple solution that keeps everyone aligned.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-[960px] mx-auto">
          {/* The Noise (Red Theme Glass Card) */}
          <div className="aether-glass border-red-200/50 bg-red-50/5 p-8 relative overflow-hidden rounded-[24px]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full filter blur-xl pointer-events-none" />
            <h3 className="text-md font-bold text-red-600 uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              The Old Way (Operational Noise)
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-black text-red-600">✕</span>
                <span className="text-xs text-text-secondary font-medium mt-0.5">WhatsApp group chats filled with lost task reminders.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-black text-red-600">✕</span>
                <span className="text-xs text-text-secondary font-medium mt-0.5">Spreadsheets out-of-date before the week even starts.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-black text-red-600">✕</span>
                <span className="text-xs text-text-secondary font-medium mt-0.5">Approvals stuck in inbox archives or informal verbal nods.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-black text-red-600">✕</span>
                <span className="text-xs text-text-secondary font-medium mt-0.5">Zero workspace visibility for leadership, leading to micromanagement.</span>
              </li>
            </ul>
          </div>

          {/* The Sync (Indigo Theme Glass Card) */}
          <div className="aether-glass border-indigo-200/50 bg-indigo-50/5 p-8 relative overflow-hidden rounded-[24px]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full filter blur-xl pointer-events-none" />
            <h3 className="text-md font-bold text-indigo-600 uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              The Guild HQ Standard (Workspace Sync)
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-600">✓</span>
                <span className="text-xs text-text-secondary font-medium mt-0.5">Structured, topic-based chat linked directly to task execution.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-600">✓</span>
                <span className="text-xs text-text-secondary font-medium mt-0.5">Clean visual Kanban boards showing active assignments, status, and deadlines.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-600">✓</span>
                <span className="text-xs text-text-secondary font-medium mt-0.5">One-click request submissions for leaves, purchases, and admin reviews.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-600">✓</span>
                <span className="text-xs text-text-secondary font-medium mt-0.5">A single operational dashboard widget view showing all updates in real-time.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
         CORE FEATURES
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6 max-w-[1200px] mx-auto scroll-mt-20">
        <div className="text-center max-w-[700px] mx-auto mb-16">
          <h2 className="text-2xl md:text-3.5xl font-black text-text-primary tracking-tight uppercase">
            Four pillars of Operational execution
          </h2>
          <p className="text-xs text-text-secondary mt-3 font-medium">
            Everything your team needs to invite, collaborate, track, and approve. Built lightweight so your team actually adopts it.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Feature 1: Chat */}
          <div className="aether-glass aether-glass-interactive p-6 flex flex-col h-full rounded-[24px]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600 mb-5">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2">Team Communication</h3>
            <p className="text-xs text-text-secondary leading-relaxed font-medium mb-4 flex-grow">
              Topic-focused channels and direct messaging designed specifically to discuss ongoing team activities. Support attachments and references.
            </p>
            <div className="text-[10px] font-bold text-violet-600 tracking-wider uppercase mt-auto flex items-center gap-1">
              Async-first messaging
            </div>
          </div>

          {/* Feature 2: Tasks */}
          <div className="aether-glass aether-glass-interactive p-6 flex flex-col h-full rounded-[24px]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 mb-5">
              <CheckSquare className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2">Task Management</h3>
            <p className="text-xs text-text-secondary leading-relaxed font-medium mb-4 flex-grow">
              Simple Kanban boards to assign tasks, set due dates, prioritize work, and record progress. Minimalistic workflow, no sprint bloat.
            </p>
            <div className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase mt-auto flex items-center gap-1">
              Kanban visual flow
            </div>
          </div>

          {/* Feature 3: Approvals */}
          <div className="aether-glass aether-glass-interactive p-6 flex flex-col h-full rounded-[24px]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 mb-5">
              <FileCheck className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2">Requests & Approvals</h3>
            <p className="text-xs text-text-secondary leading-relaxed font-medium mb-4 flex-grow">
              Submit structured requests for expenses, leave, or operational needs. Managers can sign-off instantly, keeping history transparent.
            </p>
            <div className="text-[10px] font-bold text-cyan-600 tracking-wider uppercase mt-auto flex items-center gap-1">
              Structured approvals
            </div>
          </div>

          {/* Feature 4: Dashboard */}
          <div className="aether-glass aether-glass-interactive p-6 flex flex-col h-full rounded-[24px]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mb-5">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2">Operations Dashboard</h3>
            <p className="text-xs text-text-secondary leading-relaxed font-medium mb-4 flex-grow">
              A centralized widget dashboard showing your assigned tasks, pending approvals, recent chats, and workspace-wide activity feed.
            </p>
            <div className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase mt-auto flex items-center gap-1">
              Unified workspace view
            </div>
          </div>
        </div>

        {/* Large Features Deep Dive (Two Column Showcases) */}
        <div className="mt-20 space-y-24 max-w-[1000px] mx-auto">
          
          {/* Deep Dive 1: Approvals focus */}
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-md">
                <Workflow className="h-3 w-3" />
                Operational Requests
              </div>
              <h3 className="text-xl md:text-2xl font-black text-text-primary uppercase tracking-tight">
                Get purchase & leave approvals in seconds, not days
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">
                No more sending emails or WhatsApp pings requesting budget sign-off. GuildHQ provides simple, structured request templates. Submit budget items, leave requests, or general approvals with context, and tracking statuses automatically.
              </p>
              <div className="pt-2">
                <a 
                  href={`${APP_URL}/signup`} 
                  className="inline-flex items-center gap-2 text-xs font-black text-indigo-600 hover:text-indigo-500 hover:translate-x-1 transition-all"
                >
                  Create first request
                  <ArrowRight className="h-4.5 w-4.5" />
                </a>
              </div>
            </div>

            <div className="aether-glass p-2 bg-indigo-50/20 border-indigo-100 shadow-xl rounded-[24px]">
              <img 
                src="/guild_feature_showcase.png" 
                alt="Approvals system detail view" 
                className="w-full h-auto object-cover rounded-[18px] select-none"
              />
            </div>
          </div>

          {/* Deep Dive 2: Chat & Task Sync */}
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="order-2 md:order-1 aether-glass p-6 bg-slate-50/30 border-slate-100 shadow-xl rounded-[24px] space-y-4">
              <div className="flex items-center justify-between border-b border-border-default/60 pb-3">
                <span className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-violet-500" />
                  #marketing-assets
                </span>
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              
              <div className="space-y-3.5">
                <div className="flex gap-2.5 items-start">
                  <div className="h-7 w-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">A</div>
                  <div className="bg-white/80 p-3 rounded-2xl rounded-tl-none border border-indigo-50 shadow-sm max-w-[85%]">
                    <p className="text-xs text-text-secondary font-medium leading-relaxed">
                      Hey team, can someone create the new social banner graphics for tomorrow?
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 items-start">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">B</div>
                  <div className="bg-white/80 p-3 rounded-2xl rounded-tl-none border border-emerald-50 shadow-sm max-w-[85%]">
                    <p className="text-xs text-text-secondary font-medium leading-relaxed mb-2">
                      I got this. I'll create a task so we can track the completion path.
                    </p>
                    <div className="aether-glass bg-emerald-50/10 border-emerald-100 p-2.5 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-[10px] font-bold text-text-primary uppercase">Social Banners</span>
                      </div>
                      <span className="text-[8px] font-black uppercase text-white bg-emerald-600 px-2 py-0.5 rounded">Created</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2 space-y-4">
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
                <TrendingUp className="h-3 w-3" />
                Execution Context
              </div>
              <h3 className="text-xl md:text-2xl font-black text-text-primary uppercase tracking-tight">
                Turn channel discussions into tracked tasks instantly
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">
                Don't lose work in active chats. GuildHQ lets you spin off task objects straight from channels. Keep conversations linked with task cards so owners always have the full contextual backdrop they need to execute.
              </p>
              <div className="pt-2">
                <a 
                  href={`${APP_URL}/signup`} 
                  className="inline-flex items-center gap-2 text-xs font-black text-violet-600 hover:text-violet-500 hover:translate-x-1 transition-all"
                >
                  Create workspace channel
                  <ArrowRight className="h-4.5 w-4.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
         SOLUTIONS & AUDIENCES
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="solutions-deep" className="py-20 px-6 bg-slate-50/5 border-y border-border-default/50">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-[700px] mx-auto mb-16">
            <h2 className="text-2xl md:text-3.5xl font-black text-text-primary tracking-tight uppercase">
              Designed for companies that coordinate daily
            </h2>
            <p className="text-xs text-text-secondary mt-3 font-medium">
              We help SMB companies remove the friction of disorganized manual follow-ups.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Startup Teams */}
            <div className="aether-glass p-8 relative overflow-hidden flex flex-col h-full rounded-[24px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white font-black text-xs mb-6 shadow-md shadow-indigo-500/25">
                01
              </div>
              <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider mb-2">Startup Teams</h3>
              <p className="text-xs text-text-secondary leading-relaxed font-medium mb-6 flex-grow">
                Launch fast, coordinate marketing and product actions, request budget sign-offs, and maintain a shared history as you scale from 10 to 100 members.
              </p>
              <ul className="space-y-2.5 mt-auto">
                <li className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                  <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  Velocity monitoring
                </li>
                <li className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                  <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  Budget sign-offs
                </li>
              </ul>
            </div>

            {/* Agencies */}
            <div className="aether-glass p-8 relative overflow-hidden flex flex-col h-full rounded-[24px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-white font-black text-xs mb-6 shadow-md shadow-violet-500/25">
                02
              </div>
              <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider mb-2">Marketing & Design Agencies</h3>
              <p className="text-xs text-text-secondary leading-relaxed font-medium mb-6 flex-grow">
                Coordinate deliverables on client projects, handle team communication, upload asset packages, and approve sub-contractor expenses instantly.
              </p>
              <ul className="space-y-2.5 mt-auto">
                <li className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                  <Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                  Client project tasks
                </li>
                <li className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                  <Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                  Billing request trails
                </li>
              </ul>
            </div>

            {/* Logistics & Admin */}
            <div className="aether-glass p-8 relative overflow-hidden flex flex-col h-full rounded-[24px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 text-white font-black text-xs mb-6 shadow-md shadow-cyan-500/25">
                03
              </div>
              <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider mb-2">Logistics & Operations</h3>
              <p className="text-xs text-text-secondary leading-relaxed font-medium mb-6 flex-grow">
                Keep dispatches organized, coordinate office and field support, submit operational supply purchase sheets, and track task completions in real-time.
              </p>
              <ul className="space-y-2.5 mt-auto">
                <li className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                  <Check className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                  Real-time activity dispatch
                </li>
                <li className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                  <Check className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                  Office supply requests
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
         PRICING SECTION
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-6 max-w-[1200px] mx-auto scroll-mt-20">
        <div className="text-center max-w-[700px] mx-auto mb-16">
          <h2 className="text-2xl md:text-3.5xl font-black text-text-primary tracking-tight uppercase">
            Transparent Pricing
          </h2>
          <p className="text-xs text-text-secondary mt-3 font-medium">
            Start completely free with your core team, upgrade as you grow. No hidden setups or long-term lock-ins.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-[460px] mx-auto aether-glass border border-indigo-200 bg-indigo-50/5 rounded-[28px] overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-violet-600" />
          
          <div className="p-8 text-center border-b border-border-default/60">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mb-1.5">Standard Operations Workspace</h3>
            <p className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wide">Unified Platform Pack</p>
            
            <div className="flex items-baseline justify-center gap-1.5 mt-6">
              <span className="text-3xl md:text-4.5xl font-black text-text-primary">$6</span>
              <span className="text-xs font-semibold text-text-secondary">/ user / month</span>
            </div>
            <p className="text-[10px] text-text-muted mt-2 font-medium">Billed monthly. Cancel anytime.</p>
          </div>

          <div className="p-8 bg-white/30 space-y-6">
            <h4 className="text-[10px] font-black uppercase text-text-secondary tracking-widest">Included Features:</h4>
            
            <ul className="space-y-3.5 text-left">
              <li className="flex items-start gap-3 text-xs font-semibold text-text-secondary">
                <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <span>Unlimited Chat Channels & Direct Messages</span>
              </li>
              <li className="flex items-start gap-3 text-xs font-semibold text-text-secondary">
                <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <span>Unlimited Kanban Task Boards & Assignments</span>
              </li>
              <li className="flex items-start gap-3 text-xs font-semibold text-text-secondary">
                <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <span>Unlimited Purchase, Leave & Admin requests</span>
              </li>
              <li className="flex items-start gap-3 text-xs font-semibold text-text-secondary">
                <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <span>Global Search across Tasks, Chats & files</span>
              </li>
              <li className="flex items-start gap-3 text-xs font-semibold text-text-secondary">
                <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <span>10 GB shared cloud file storage</span>
              </li>
            </ul>

            <div className="pt-2">
              <a 
                href={`${APP_URL}/signup`}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-1.5 active:scale-98"
              >
                Create Workspace Free
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            
            <div className="text-center">
              <span className="text-[10px] text-text-muted font-bold">Have more than 50 users? </span>
              <a href="mailto:sales@guildhq.space" className="text-[10px] text-indigo-600 hover:underline font-bold">Contact Support</a>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
         FAQ SECTION
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 px-6 max-w-[800px] mx-auto scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3.5xl font-black text-text-primary tracking-tight uppercase">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-text-secondary mt-3 font-medium">
            Have questions about how GuildHQ works? We've compiled the answers below.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "How does the onboarding process look?",
              a: "Onboarding is built to be completed in under 5 minutes. You register with your work email, input your company details (company name, industry type, team size), invite your team via a secure link, and our workspace automatically initializes the dashboard, general channel, and task board so operations can start instantly."
            },
            {
              q: "Is there a limit on how many tasks or approval requests I can submit?",
              a: "No! On our workspace plan, your team can submit unlimited task cards, invite comments, and issue and process unlimited operational requests (budgets, leaves, admin approvals) without any restrictions."
            },
            {
              q: "Can I manage permissions for different team departments?",
              a: "Yes! GuildHQ supports team roles and permissions inside the workspace admin dashboard. You can group members into departments (like marketing, operations, admin) and configure specific workspace view boundaries."
            },
            {
              q: "How secure is GuildHQ?",
              a: "We prioritize security by implementing standard token authentication protocols (JWT and Firebase Auth) alongside strict database rules. All database exchanges and user attachments are encrypted and isolated at the workspace level, ensuring data separation."
            },
            {
              q: "Can I cancel my monthly user subscription?",
              a: "Absolutely. GuildHQ operates on a simple pay-as-you-go model. You can modify your team seat count, delete workspace records, or cancel the premium plan directly in the billing dashboard at any time."
            }
          ].map((item, index) => (
            <div 
              key={index}
              className="aether-glass border border-border-default/60 overflow-hidden transition-all duration-300 rounded-[20px]"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4.5 text-left flex items-center justify-between text-xs font-bold text-text-primary uppercase tracking-wide hover:bg-black/[0.02] active:scale-99 transition-all"
              >
                <span>{item.q}</span>
                {activeFAQ === index ? (
                  <ChevronDown className="h-4.5 w-4.5 text-indigo-500 shrink-0 transform rotate-180 transition-transform duration-300" />
                ) : (
                  <ChevronDown className="h-4.5 w-4.5 text-text-muted shrink-0 transition-transform duration-300" />
                )}
              </button>
              
              <AnimatePresence>
                {activeFAQ === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="px-6 pb-5 pt-1 text-xs text-text-secondary font-medium leading-relaxed border-t border-border-default/20 bg-black/[0.01]">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
         CTA FOOTER BANNER
      ───────────────────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-[1000px] mx-auto">
        <div className="aether-glass border border-indigo-200 bg-indigo-50/10 p-8 md:p-12 text-center rounded-[28px] relative overflow-hidden shadow-2xl">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-500/5 rounded-full filter blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-violet-500/5 rounded-full filter blur-2xl pointer-events-none" />
          
          <h2 className="text-2xl md:text-4.5xl font-black text-text-primary uppercase tracking-tight mb-4">
            Eliminate Operational Noise Today
          </h2>
          <p className="text-xs text-text-secondary max-w-[550px] mx-auto leading-relaxed font-medium mb-8">
            Join the forward-thinking teams coordinating workflows, tracking tasks, and securing approvals with GuildHQ.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-[500px] mx-auto">
            <a 
              href={`${APP_URL}/signup`}
              className="w-full sm:w-auto h-11 px-7 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer shrink-0"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
         FOOTER
      ───────────────────────────────────────────────────────────────────────────── */}
      <footer className="mt-16 pt-12 border-t border-border-default/60 max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          
          <div className="col-span-2 space-y-4">
            <a href="#" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-black text-white">
                G
              </div>
              <span className="text-md font-black tracking-wider uppercase text-text-primary">
                GuildHQ
              </span>
            </a>
            <p className="text-xs text-text-secondary max-w-[280px] leading-relaxed font-medium">
              The operational coordination monolith for small and mid-sized businesses. Designed to restore sanity to daily operations.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase text-text-primary tracking-widest">Product</h4>
            <ul className="space-y-2 text-xs font-semibold text-text-secondary">
              <li><a href="#features" className="hover:text-indigo-600">Features</a></li>
              <li><a href="#solutions" className="hover:text-indigo-600">Solutions</a></li>
              <li><a href="#pricing" className="hover:text-indigo-600">Pricing</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase text-text-primary tracking-widest">Resources</h4>
            <ul className="space-y-2 text-xs font-semibold text-text-secondary">
              <li><a href={`${APP_URL}/login`} className="hover:text-indigo-600">App Sign In</a></li>
              <li><a href={`${APP_URL}/signup`} className="hover:text-indigo-600">Create Workspace</a></li>
              <li><a href="#faq" className="hover:text-indigo-600">FAQs</a></li>
            </ul>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border-default/30 pt-6">
          <span className="text-[10px] font-semibold text-text-muted">
            &copy; 2026 GuildHQ Inc. All rights reserved.
          </span>
          <div className="flex items-center gap-6 text-[10px] font-semibold text-text-muted">
            <a href="#" className="hover:text-text-primary">Privacy Policy</a>
            <a href="#" className="hover:text-text-primary">Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
