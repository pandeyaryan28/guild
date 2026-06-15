import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Menu, 
  X, 
  CheckSquare, 
  MessageSquare, 
  FileCheck, 
  LayoutDashboard, 
  FolderOpen, 
  BookOpen, 
  HelpCircle, 
  Play, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { APP_URL } from '../../config/landingData';
import { useNavigation } from '../../context/NavigationContext';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(() => window.scrollY > 20);
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const { currentPath, navigate } = useNavigation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigate(path);
    setMobileOpen(false);
    setShowMegaMenu(false);
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate('/');
    setMobileOpen(false);
    setShowMegaMenu(false);
  };

  const megaMenuData = [
    {
      title: 'Work Tracking',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border border-indigo-100/50',
      items: [
        { icon: CheckSquare, label: 'Tasks', desc: 'Assign and organize team tasks.' },
        { icon: LayoutDashboard, label: 'Kanban Board', desc: 'Drag-and-drop workflows.' },
      ]
    },
    {
      title: 'Team Chat',
      color: 'text-cyan-600',
      bg: 'bg-cyan-50 border border-cyan-100/50',
      items: [
        { icon: MessageSquare, label: 'Channels', desc: 'Department-focused chat rooms.' },
        { icon: Sparkles, label: 'Mentions & DMs', desc: 'Fast, secure direct chats.' },
      ]
    },
    {
      title: 'Requests & Approvals',
      color: 'text-purple-600',
      bg: 'bg-purple-50 border border-purple-100/50',
      items: [
        { icon: FileCheck, label: 'Leave Requests', desc: 'Quick time-off submissions.' },
        { icon: Sparkles, label: 'Expense Approvals', desc: 'Purchase orders and sign-offs.' },
      ]
    },
    {
      title: 'Visibility & Files',
      color: 'text-rose-600',
      bg: 'bg-rose-50 border border-rose-100/50',
      items: [
        { icon: LayoutDashboard, label: 'Central Dashboard', desc: 'Assigned tasks & activity feeds.' },
        { icon: FolderOpen, label: 'Shared Files', desc: 'Shared budget, layout, and document lists.' },
      ]
    },
    {
      title: 'Resources',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border border-emerald-100/50',
      items: [
        { icon: BookOpen, label: 'Onboarding Guide', desc: 'Start coordination in 5 mins.' },
        { icon: HelpCircle, label: 'Help Center', desc: 'Guides on setup & permissions.' },
      ]
    }
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
      {/* Top Promotion Announcement Bar */}
      <div className="bg-gradient-to-right from-indigo-600 via-indigo-700 to-purple-600 text-white py-2 px-4 text-center text-[11px] md:text-xs font-semibold tracking-wide shadow-sm flex items-center justify-center gap-1.5 z-50">
        <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />
        <span>Meet Guild Orbit v2 — Optimize team operations in a single workspace.</span>
        <a 
          href="/onboarding" 
          onClick={(e) => handleNav(e, '/')} 
          className="underline hover:text-indigo-100 transition-colors inline-flex items-center gap-0.5 ml-1.5"
        >
          Learn more <ArrowRight className="h-3 w-3 inline" />
        </a>
      </div>

      <header 
        className="w-full px-4 pt-3 transition-all duration-300 relative"
        onMouseLeave={() => setShowMegaMenu(false)}
      >
        <nav
          className={`mx-auto max-w-5xl rounded-2xl px-5 flex items-center justify-between transition-all duration-300 glass-nav ${
            scrolled ? 'py-2.5 shadow-md' : 'py-3.5'
          }`}
        >
          {/* Left: Logo */}
          <a
            href="/"
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 group"
          >
            <img
              src="/logo.png"
              alt="Guild Orbit"
              className="h-8 w-8 rounded-lg group-hover:scale-105 transition-transform"
            />
            <span className="text-base font-semibold text-slate-900 tracking-tight">
              Guild Orbit
            </span>
          </a>

          {/* Center: Desktop links */}
          <div className="hidden md:flex items-center gap-8 h-full">
            {/* Features Dropdown Link */}
            <div 
              className="relative py-2"
              onMouseEnter={() => setShowMegaMenu(true)}
            >
              <button
                className={`flex items-center gap-1 text-[13px] font-semibold transition-colors cursor-pointer ${
                  showMegaMenu ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Features
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showMegaMenu ? 'rotate-180 text-indigo-600' : ''}`} />
              </button>
            </div>

            <a
              href="/pricing"
              onClick={(e) => handleNav(e, '/pricing')}
              className={`text-[13px] font-semibold transition-colors ${
                currentPath === '/pricing'
                  ? 'text-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pricing
            </a>

            <a
              href="/faq"
              onClick={(e) => handleNav(e, '/faq')}
              className={`text-[13px] font-semibold transition-colors ${
                currentPath === '/faq'
                  ? 'text-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              FAQ
            </a>
          </div>

          {/* Right: Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/faq')}
              className="text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 cursor-pointer"
            >
              Get a Demo
            </button>
            <a
              href={`${APP_URL}/login`}
              className="text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 border border-transparent hover:border-slate-100 rounded-xl"
            >
              Sign in
            </a>
            <a
              href={`${APP_URL}/signup`}
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl shadow-md shadow-indigo-150 transition-all active:scale-[0.97]"
            >
              Start for free
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-black/5 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </nav>

        {/* Desktop Full-Width Hover Mega Menu */}
        <AnimatePresence>
          {showMegaMenu && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 right-0 top-full px-4 pt-2 z-40 hidden md:block"
              onMouseEnter={() => setShowMegaMenu(true)}
              onMouseLeave={() => setShowMegaMenu(false)}
            >
              <div className="mx-auto max-w-5xl rounded-2xl bg-white border border-slate-150/70 p-6 shadow-2xl shadow-slate-200/60 grid grid-cols-5 gap-6">
                {megaMenuData.map((col) => (
                  <div key={col.title} className="flex flex-col gap-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                      {col.title}
                    </span>
                    <div className="flex flex-col gap-3">
                      {col.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <a
                            key={item.label}
                            href="/features"
                            onClick={(e) => handleNav(e, '/features')}
                            className="group flex gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-all"
                          >
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${col.bg} ${col.color} group-hover:scale-105 transition-transform`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {item.label}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-snug">
                                {item.desc}
                              </span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mx-4 mt-2 rounded-2xl glass-nav p-5 flex flex-col gap-4 md:hidden z-40 relative"
            >
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">
                Core Modules
              </span>
              
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <a href="/features" onClick={(e) => handleNav(e, '/features')} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-700">
                  <CheckSquare className="h-4 w-4 text-indigo-600" /> Tasks
                </a>
                <a href="/features" onClick={(e) => handleNav(e, '/features')} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-700">
                  <MessageSquare className="h-4 w-4 text-cyan-600" /> DMs & Chat
                </a>
                <a href="/features" onClick={(e) => handleNav(e, '/features')} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-700">
                  <FileCheck className="h-4 w-4 text-purple-600" /> Approvals
                </a>
                <a href="/features" onClick={(e) => handleNav(e, '/features')} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-700">
                  <FolderOpen className="h-4 w-4 text-rose-600" /> Shared Files
                </a>
              </div>

              <div className="h-px bg-slate-100 mt-2 mb-2" />
              
              <a
                href="/pricing"
                onClick={(e) => handleNav(e, '/pricing')}
                className={`text-sm font-bold py-1 ${
                  currentPath === '/pricing' ? 'text-indigo-600' : 'text-slate-600'
                }`}
              >
                Pricing
              </a>
              <a
                href="/faq"
                onClick={(e) => handleNav(e, '/faq')}
                className={`text-sm font-bold py-1 ${
                  currentPath === '/faq' ? 'text-indigo-600' : 'text-slate-600'
                }`}
              >
                FAQ
              </a>
              <div className="h-px bg-slate-100 mt-1 mb-1" />
              <a
                href={`${APP_URL}/login`}
                className="text-sm font-bold text-slate-600 text-center py-2 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Sign in
              </a>
              <a
                href={`${APP_URL}/signup`}
                className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 text-center py-2.5 rounded-xl shadow-md shadow-indigo-100 transition-all"
              >
                Start for free
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </div>
  );
}
