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
  Workflow,
  Gift,
  Wallet,
  Star,
  Settings,
  Eye,
  Target,
  Folder
} from 'lucide-react';

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [activeFAQ, setActiveFAQ] = React.useState<number | null>(null);

  // Interactive pricing state
  const [currency, setCurrency] = React.useState<'USD' | 'INR'>('USD');
  const [billingTab, setBillingTab] = React.useState<'plans' | 'credits'>('plans');
  const [cycle, setCycle] = React.useState<'monthly' | 'annual'>('annual');

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
         THE SOLUTIONS & CORE VALUE (SIMPLE & VISUAL)
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="solutions" className="py-20 px-6 max-w-[1200px] mx-auto scroll-mt-20">
        
        {/* Section Header */}
        <div className="text-center max-w-[750px] mx-auto mb-16">
          <h2 className="text-2xl md:text-3.5xl font-black text-text-primary tracking-tight uppercase">
            Simple Operations. Zero Noise.
          </h2>
          <p className="text-xs text-text-secondary mt-3 font-semibold leading-relaxed">
            Stop switching between WhatsApp group chats, Excel spreadsheets, and email request trails. GuildHQ brings your daily team operations under one roof.
          </p>
        </div>

        {/* 4 Core Features Grid */}
        <div className="mb-20">
          <div className="flex items-center gap-2 mb-6">
            <span className="h-[1px] bg-border-default/60 flex-grow" />
            <h3 className="text-[10px] font-black uppercase text-text-muted tracking-widest px-3">
              The 4 Core Platform Features
            </h3>
            <span className="h-[1px] bg-border-default/60 flex-grow" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Feature 1: Chat */}
            <div className="aether-glass p-6 flex flex-col h-full rounded-[24px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 mb-5">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black text-text-primary uppercase tracking-wider mb-2">1. Team Chat</h4>
              <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
                Simple channels and direct messages for work talk. Attach files and create tasks directly from chats to keep context intact.
              </p>
            </div>

            {/* Feature 2: Tasks */}
            <div className="aether-glass p-6 flex flex-col h-full rounded-[24px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 mb-5">
                <CheckSquare className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black text-text-primary uppercase tracking-wider mb-2">2. Task Management</h4>
              <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
                Kanban boards showing who is doing what. Set due dates, assign owners, prioritize tasks, and write comments without complexity.
              </p>
            </div>

            {/* Feature 3: Approvals */}
            <div className="aether-glass p-6 flex flex-col h-full rounded-[24px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 mb-5">
                <FileCheck className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black text-text-primary uppercase tracking-wider mb-2">3. Requests & Approvals</h4>
              <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
                Standardized forms for leave, expenses, and operational orders. Submit requests in seconds and let managers approve with one click.
              </p>
            </div>

            {/* Feature 4: File Hub */}
            <div className="aether-glass p-6 flex flex-col h-full rounded-[24px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mb-5">
                <Folder className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black text-text-primary uppercase tracking-wider mb-2">4. Shared File Hub</h4>
              <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
                A central home for team files. Upload PDFs, sheets, or mockups, view basic file previews, and search shared files instantly.
              </p>
            </div>

          </div>
        </div>

        {/* Strategic business benefits (Owner Visibility, Employee Focus Boost, Admin Control) */}
        <div className="mb-24">
          <div className="flex items-center gap-2 mb-6">
            <span className="h-[1px] bg-border-default/60 flex-grow" />
            <h3 className="text-[10px] font-black uppercase text-text-muted tracking-widest px-3">
              How GuildHQ Boosts Your Business
            </h3>
            <span className="h-[1px] bg-border-default/60 flex-grow" />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Owner Visibility */}
            <div className="aether-glass border border-indigo-100 bg-indigo-50/[0.02] p-8 flex flex-col h-full rounded-[24px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white mb-6 shadow-md shadow-indigo-500/25">
                <Eye className="h-4.5 w-4.5" />
              </div>
              <h4 className="text-sm font-extrabold text-text-primary uppercase tracking-wider mb-2.5">
                Enhanced Owner Visibility
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">
                Get a clear view of your company operations from one dashboard. Know exactly which tasks are overdue, which purchases are pending approval, and what your teams are discussing in real-time. No more asking "what's the update?"
              </p>
            </div>

            {/* Employee Focus Boost */}
            <div className="aether-glass border border-violet-100 bg-violet-50/[0.02] p-8 flex flex-col h-full rounded-[24px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-white mb-6 shadow-md shadow-violet-500/25">
                <Target className="h-4.5 w-4.5" />
              </div>
              <h4 className="text-sm font-extrabold text-text-primary uppercase tracking-wider mb-2.5">
                Subconscious Focus Boost
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">
                Constant context-switching drains productivity. By combining chats, tasks, and request tools into a single workspace, employees maintain an uninterrupted state of focus. Clear ownership and visibility naturally boost subconscious accountability.
              </p>
            </div>

            {/* Central Admin Panel */}
            <div className="aether-glass border border-cyan-100 bg-cyan-50/[0.02] p-8 flex flex-col h-full rounded-[24px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 text-white mb-6 shadow-md shadow-cyan-500/25">
                <Settings className="h-4.5 w-4.5" />
              </div>
              <h4 className="text-sm font-extrabold text-text-primary uppercase tracking-wider mb-2.5">
                Unified Admin Control
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">
                Keep operations organized as your team scales. Setup user roles, create custom departments, manage team workspace scopes, review activity audit trails, and maintain strict access boundaries from a simple settings pane.
              </p>
            </div>

          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
           FEATURE SHOWCASES & DEEP DIVES
        ───────────────────────────────────────────────────────────────────────────── */}
        <div id="features" className="space-y-24 max-w-[1000px] mx-auto scroll-mt-20">
          
          {/* Showcase 1: Request approvals (with generated image) */}
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-md">
                <Workflow className="h-3 w-3" />
                Streamlined Approvals
              </div>
              <h3 className="text-xl md:text-2xl font-black text-text-primary uppercase tracking-tight">
                Submit leaves and purchase orders in 10 seconds
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">
                Say goodbye to email folders and spreadsheet records. Employees can submit structured requests with amounts, reasons, and files. Managers receive immediate notifications and can approve or decline instantly, logging the transaction automatically.
              </p>
              <div className="pt-2">
                <a 
                  href={`${APP_URL}/signup`} 
                  className="inline-flex items-center gap-2 text-xs font-black text-indigo-600 hover:text-indigo-500 hover:translate-x-1 transition-all"
                >
                  Start free workspace
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

          {/* Showcase 2: Chat-to-Task Sync (CSS Rendered Chat Flow) */}
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="order-2 md:order-1 aether-glass p-6 bg-slate-50/30 border-slate-100 shadow-xl rounded-[24px] space-y-4 select-none">
              <div className="flex items-center justify-between border-b border-border-default/60 pb-3">
                <span className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-violet-500" />
                  #ops-dispatch
                </span>
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              
              <div className="space-y-3.5">
                <div className="flex gap-2.5 items-start">
                  <div className="h-7 w-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">K</div>
                  <div className="bg-white/80 p-3 rounded-2xl rounded-tl-none border border-indigo-50 shadow-sm max-w-[85%]">
                    <p className="text-[11px] text-text-secondary font-medium leading-relaxed">
                      We need to inspect the dispatch inventory count before shipping the packages.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 items-start">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">R</div>
                  <div className="bg-white/80 p-3 rounded-2xl rounded-tl-none border border-emerald-50 shadow-sm max-w-[85%]">
                    <p className="text-[11px] text-text-secondary font-medium leading-relaxed mb-2">
                      Understood. I will spin off a checklist task right here so it doesn't get lost.
                    </p>
                    <div className="aether-glass bg-emerald-50/10 border-emerald-100 p-2.5 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                        <span className="text-[9px] font-bold text-text-primary uppercase">Inventory Audit</span>
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
                Actionable Conversations
              </div>
              <h3 className="text-xl md:text-2xl font-black text-text-primary uppercase tracking-tight">
                Turn chats into tracked tasks instantly
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">
                Work conversations can easily get buried under hundreds of messages. GuildHQ lets you convert messages directly into task cards. Assign an owner, set a deadline, and keep the task linked to the chat thread so the full context is preserved.
              </p>
              <div className="pt-2">
                <a 
                  href={`${APP_URL}/signup`} 
                  className="inline-flex items-center gap-2 text-xs font-black text-violet-600 hover:text-violet-500 hover:translate-x-1 transition-all"
                >
                  Create tasks from chat
                  <ArrowRight className="h-4.5 w-4.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Showcase 3: CSS-rendered Admin Panel Mockup */}
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-600 uppercase tracking-widest bg-cyan-50 px-2.5 py-1 rounded-md">
                <Settings className="h-3 w-3" />
                Admin Dashboard
              </div>
              <h3 className="text-xl md:text-2xl font-black text-text-primary uppercase tracking-tight">
                Centralized user management & role control
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">
                Keep security tight. The GuildHQ Admin panel allows workspace owners to invite members, deactivate accounts, assign departments, and configure system permissions. Maintain clear operational borders without complex configurations.
              </p>
              <div className="pt-2">
                <a 
                  href={`${APP_URL}/signup`} 
                  className="inline-flex items-center gap-2 text-xs font-black text-cyan-600 hover:text-cyan-500 hover:translate-x-1 transition-all"
                >
                  Open admin console
                  <ArrowRight className="h-4.5 w-4.5" />
                </a>
              </div>
            </div>

            <div className="aether-glass p-5 bg-cyan-50/20 border-cyan-100 shadow-xl rounded-[24px] space-y-4 select-none">
              <div className="flex items-center justify-between border-b border-border-default/60 pb-3">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-cyan-500" />
                  Workspace Members
                </span>
                <span className="text-[9px] font-black uppercase text-cyan-600 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded">
                  Admin Active
                </span>
              </div>

              {/* User row mockup */}
              <div className="space-y-2">
                {[
                  { name: "Aryan Pandey", role: "Owner", dept: "Operations" },
                  { name: "Rahul Sharma", role: "Manager", dept: "Logistics" },
                  { name: "Aarav Gupta", role: "Member", dept: "Marketing" }
                ].map((user, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/70 border border-border-default/40 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-cyan-500 text-white font-black text-[10px] flex items-center justify-center">
                        {user.name.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-extrabold text-text-primary text-[11px]">{user.name}</p>
                        <p className="text-[9px] text-text-muted mt-0.5 font-medium">{user.dept}</p>
                      </div>
                    </div>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                      user.role === 'Owner' ? 'bg-indigo-500 text-white' : user.role === 'Manager' ? 'bg-violet-500 text-white' : 'bg-slate-100 text-text-secondary'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
         PRICING SECTION
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-6 max-w-[1200px] mx-auto scroll-mt-20">
        <div className="text-center max-w-[700px] mx-auto mb-12">
          <h2 className="text-2xl md:text-3.5xl font-black text-text-primary tracking-tight uppercase">
            Flexible & Transparent Pricing
          </h2>
          <p className="text-xs text-text-secondary mt-3 font-medium">
            Start completely free with your core team. Upgrade to scale or prepay using our credit wallet.
          </p>
        </div>

        {/* Pricing Controls: Tab Selector & Currency Toggle */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-[960px] mx-auto mb-10 p-2.5 aether-glass bg-white/20 border-border-default/60">
          
          {/* Billing Tab Switcher */}
          <div className="flex gap-1 w-full md:w-auto p-1 bg-black/[0.03] rounded-xl border border-border-default/40">
            <button
              onClick={() => setBillingTab('plans')}
              className={`flex-1 md:flex-none px-5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                billingTab === 'plans'
                  ? 'bg-white text-text-primary shadow-sm border border-border-default/60'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Subscription Plans
            </button>
            <button
              onClick={() => setBillingTab('credits')}
              className={`flex-1 md:flex-none px-5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                billingTab === 'credits'
                  ? 'bg-white text-text-primary shadow-sm border border-border-default/60'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Prepaid Credit Wallet
            </button>
          </div>

          {/* Currency Selector */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Currency:</span>
            <div className="flex gap-0.5 p-0.5 bg-black/[0.03] rounded-lg border border-border-default/40">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3.5 py-1.5 text-[10px] font-extrabold rounded-md cursor-pointer transition-all ${
                  currency === 'USD'
                    ? 'bg-white text-text-primary shadow-sm border border-border-default/40'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrency('INR')}
                className={`px-3.5 py-1.5 text-[10px] font-extrabold rounded-md cursor-pointer transition-all ${
                  currency === 'INR'
                    ? 'bg-white text-text-primary shadow-sm border border-border-default/40'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                INR (₹)
              </button>
            </div>
          </div>
        </div>

        {/* ── PLANS TAB CONTENT ── */}
        {billingTab === 'plans' && (
          <div className="space-y-8">
            {/* Cycle Toggle */}
            <div className="flex justify-center mb-6">
              <div className="flex gap-0.5 rounded-xl bg-black/[0.03] border border-border-default/40 p-0.5">
                <button
                  onClick={() => setCycle('monthly')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    cycle === 'monthly'
                      ? 'bg-white text-text-primary shadow-sm border border-border-default/60'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setCycle('annual')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    cycle === 'annual'
                      ? 'bg-white text-text-primary shadow-sm border border-border-default/60'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Annual
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-600 bg-emerald-50 rounded uppercase">
                    -50%
                  </span>
                </button>
              </div>
            </div>

            {/* Plan Cards Grid */}
            <div className="grid md:grid-cols-3 gap-8 max-w-[1080px] mx-auto items-stretch">
              
              {/* Free Plan */}
              <div className="aether-glass border border-border-default/80 p-6 flex flex-col rounded-[24px]">
                <div className="mb-4">
                  <h3 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">Free</h3>
                  <div className="flex items-baseline mt-2">
                    <span className="text-3xl font-black text-text-primary">
                      {currency === 'INR' ? '₹0' : '$0'}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted mt-1 font-medium">Up to 5 members free</p>
                </div>
                <div className="h-[1px] bg-border-default/60 my-4" />
                <ul className="space-y-3 flex-grow mb-6 text-left">
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    <span>5 seat limit</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    <span>10 MB storage limit</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    <span>Chat channels & DMs</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    <span>Kanban task boards</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    <span>Leave & expense requests</span>
                  </li>
                </ul>
                <a
                  href={`${APP_URL}/signup`}
                  className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-text-primary border border-border-default hover:bg-black/[0.02] active:scale-98 transition-all"
                >
                  Get Started
                </a>
              </div>

              {/* Pro Plan */}
              <div className="aether-glass border border-indigo-200 bg-indigo-50/5 p-6 flex flex-col rounded-[24px] relative shadow-lg">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Star className="h-3 w-3 fill-white" />
                  Best Value
                </div>
                
                <div className="mb-4 mt-2">
                  <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                    Pro
                    {cycle === 'annual' && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[9px] font-black">
                        -50% Off
                      </span>
                    )}
                  </h3>
                  <div className="flex items-baseline mt-2">
                    <span className="text-3xl font-black text-text-primary">
                      {currency === 'INR'
                        ? (cycle === 'annual' ? '₹249.50' : '₹499')
                        : (cycle === 'annual' ? '$4.06' : '$8.12')}
                    </span>
                    <span className="text-xs font-semibold text-text-secondary ml-1">/ seat / month</span>
                  </div>
                  <p className="text-[10px] text-text-muted mt-1 font-medium">
                    {cycle === 'annual'
                      ? `Billed annually (${currency === 'INR' ? '₹2,994' : '$48.72'}/seat/year)`
                      : `Billed monthly (${currency === 'INR' ? '₹499' : '$8.12'}/seat/month)`}
                  </p>
                </div>
                
                <div className="h-[1px] bg-indigo-100 my-4" />
                
                {cycle === 'annual' && (
                  <div className="mb-4 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-[10px] text-amber-700 font-bold">
                    <Gift className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Includes 1 Year Free access to upcoming Guild HR & Accounting module!</span>
                  </div>
                )}

                <ul className="space-y-3 flex-grow mb-6 text-left">
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                    <span>Unlimited seats</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                    <span>Everything in Free</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                    <span>Full GuildHQ Admin panel access</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                    <span>Priority email support</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                    <span>Standard SLA uptime</span>
                  </li>
                </ul>
                <a
                  href={`${APP_URL}/signup`}
                  className="w-full text-center py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1"
                >
                  Upgrade to Pro
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              {/* Enterprise Plan */}
              <div className="aether-glass border border-border-default/80 p-6 flex flex-col rounded-[24px]">
                <div className="mb-4">
                  <h3 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">Enterprise</h3>
                  <div className="flex items-baseline mt-2">
                    <span className="text-3xl font-black text-text-primary">Custom</span>
                  </div>
                  <p className="text-[10px] text-text-muted mt-1 font-medium">For teams with 100+ seats</p>
                </div>
                <div className="h-[1px] bg-border-default/60 my-4" />
                <ul className="space-y-3 flex-grow mb-6 text-left">
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-sky-500 shrink-0" />
                    <span>Volume-based discount pricing</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-sky-500 shrink-0" />
                    <span>Dedicated success manager</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-sky-500 shrink-0" />
                    <span>Custom onboarding support</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-sky-500 shrink-0" />
                    <span>Custom SLAs & security docs</span>
                  </li>
                </ul>
                <a
                  href="mailto:enterprise@guildhq.com"
                  className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-sky-600 bg-sky-500/10 border border-sky-400/20 hover:bg-sky-500/20 active:scale-98 transition-all"
                >
                  Contact Sales
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── PREPAID CREDITS TAB CONTENT ── */}
        {billingTab === 'credits' && (
          <div className="space-y-8 max-w-[800px] mx-auto">
            {/* Wallet Explanation Card */}
            <div className="aether-glass border border-emerald-200 bg-emerald-50/5 p-6 rounded-[24px]">
              <div className="flex gap-4 items-center">
                <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">Top up once, use as you grow</h3>
                  <p className="text-xs text-text-secondary leading-relaxed font-medium mt-1">
                    Your prepaid credits are deducted dynamically at the active rate of{' '}
                    <span className="font-extrabold text-text-primary">
                      {currency === 'INR' ? '₹499' : '$8.12'}
                    </span>{' '}
                    per seat per month. Add members anytime, credits automatically roll over.
                  </p>
                </div>
              </div>
            </div>

            {/* Credit Packs Grid */}
            <div className="grid md:grid-cols-2 gap-8 items-stretch">
              
              {/* Starter Pack */}
              <div className="aether-glass border border-border-default/80 p-6 flex flex-col rounded-[24px]">
                <div className="mb-4">
                  <h3 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">Starter Pack</h3>
                  <div className="flex items-baseline mt-2">
                    <span className="text-3xl font-black text-text-primary">
                      {currency === 'INR' ? '₹50,000' : '$500'}
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600 ml-2 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
                      +10% Bonus
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1 font-semibold">
                    You get <span className="text-text-primary font-black">{currency === 'INR' ? '₹55,000' : '$550'}</span> credited in your wallet
                  </p>
                </div>
                <div className="h-[1px] bg-border-default/60 my-4" />
                <ul className="space-y-3 flex-grow mb-6 text-left">
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    <span>Prepaid credit wallet system</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    <span>Deducted per active seat</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    <span>Credits roll over and never expire</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    <span>Add members or upgrade seats anytime</span>
                  </li>
                </ul>
                <a
                  href={`${APP_URL}/signup`}
                  className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-text-primary border border-border-default hover:bg-black/[0.02] active:scale-98 transition-all"
                >
                  Purchase Starter Pack
                </a>
              </div>

              {/* Growth Pack */}
              <div className="aether-glass border border-indigo-200 bg-indigo-50/5 p-6 flex flex-col rounded-[24px] relative shadow-lg">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Gift className="h-3 w-3 fill-white" />
                  Popular
                </div>
                <div className="mb-4 mt-2">
                  <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">Growth Pack</h3>
                  <div className="flex items-baseline mt-2">
                    <span className="text-3xl font-black text-text-primary">
                      {currency === 'INR' ? '₹1,00,000' : '$1,000'}
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600 ml-2 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
                      +20% Bonus
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1 font-semibold">
                    You get <span className="text-text-primary font-black">{currency === 'INR' ? '₹1,20,000' : '$1,200'}</span> credited in your wallet
                  </p>
                </div>
                <div className="h-[1px] bg-indigo-100 my-4" />
                
                <div className="mb-4 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-[10px] text-amber-700 font-bold">
                  <Gift className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Includes 1 Year Free access to upcoming Guild HR & Accounting module!</span>
                </div>

                <ul className="space-y-3 flex-grow mb-6 text-left">
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                    <span>Deducted per active seat</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                    <span>Credits roll over and never expire</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                    <span>Add members or upgrade seats anytime</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                    <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                    <span>Priority enterprise onboarding setup</span>
                  </li>
                </ul>
                <a
                  href={`${APP_URL}/signup`}
                  className="w-full text-center py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1"
                >
                  Purchase Growth Pack
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        )}
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
