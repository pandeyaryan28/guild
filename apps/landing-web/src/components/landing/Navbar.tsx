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
  Clock, 
  BookOpen, 
  HelpCircle, 
  Play, 
  Sparkles,
  ChevronDown,
  Shield
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

  const handleNav = (e: React.MouseEvent<any>, path: string) => {
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
      path: '/features/work-tracking',
      items: [
        { icon: CheckSquare, label: 'Tasks', desc: 'Assign and organize team tasks.', path: '/features/work-tracking' },
        { icon: LayoutDashboard, label: 'Kanban Board', desc: 'Drag and drop workflows.', path: '/features/work-tracking' },
      ]
    },
    {
      title: 'Team Chat',
      color: 'text-cyan-600',
      bg: 'bg-cyan-50 border border-cyan-100/50',
      path: '/features/team-chat',
      items: [
        { icon: MessageSquare, label: 'Channels', desc: 'Department focused chat rooms.', path: '/features/team-chat' },
        { icon: Sparkles, label: 'Mentions & DMs', desc: 'Fast, secure direct chats.', path: '/features/team-chat' },
      ]
    },
    {
      title: 'Requests & Approvals',
      color: 'text-purple-600',
      bg: 'bg-purple-50 border border-purple-100/50',
      path: '/features/approvals',
      items: [
        { icon: FileCheck, label: 'Leave Requests', desc: 'Quick time off submissions.', path: '/features/approvals' },
        { icon: Sparkles, label: 'Expense Approvals', desc: 'Purchase orders and approvals.', path: '/features/approvals' },
      ]
    },
    {
      title: 'Visibility & Dashboards',
      color: 'text-rose-600',
      bg: 'bg-rose-50 border border-rose-100/50',
      path: '/features/visibility',
      items: [
        { icon: LayoutDashboard, label: 'Central Dashboard', desc: 'Assigned tasks & activity feeds.', path: '/features/visibility' },
        { icon: Clock, label: 'Activity Feeds', desc: 'Real time updates on status changes.', path: '/features/visibility' },
      ]
    },
    {
      title: 'Admin Console',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border border-indigo-100/50',
      path: '/features/admin-console',
      items: [
        { icon: Shield, label: 'Workload Allotment', desc: 'Balance team work allocations.', path: '/features/admin-console' },
        { icon: Shield, label: 'Project Health', desc: 'Track health, on track vs delayed.', path: '/features/admin-console' },
      ]
    },
    {
      title: 'Resources',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border border-emerald-100/50',
      path: '/faq',
      items: [
        { icon: BookOpen, label: 'Onboarding Guide', desc: 'Start coordination in 5 mins.', path: '/faq' },
        { icon: HelpCircle, label: 'Help Center', desc: 'Guides on setup & permissions.', path: '/faq' },
      ]
    }
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
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
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/features');
                  setShowMegaMenu(false);
                }}
                className={`flex items-center gap-1 text-[13px] font-semibold transition-colors cursor-pointer ${
                  currentPath.startsWith('/features') || showMegaMenu ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'
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

            <a
              href="/contact"
              onClick={(e) => handleNav(e, '/contact')}
              className={`text-[13px] font-semibold transition-colors ${
                currentPath === '/contact'
                  ? 'text-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Contact
            </a>
          </div>

          {/* Right: Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/demo')}
              className="text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 cursor-pointer"
            >
              Get a Demo
            </button>
            <a
              href={APP_URL}
              className="text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 border border-transparent hover:border-slate-100 rounded-xl"
            >
              Sign in
            </a>
            <a
              href={APP_URL}
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
              <div className="mx-auto max-w-5xl rounded-2xl bg-white border border-slate-150/70 p-6 shadow-2xl shadow-slate-200/60 grid grid-cols-6 gap-6">
                {megaMenuData.map((col) => (
                  <div key={col.title} className="flex flex-col gap-4">
                    <a
                      href={col.path}
                      onClick={(e) => handleNav(e, col.path)}
                      className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      {col.title}
                    </a>
                    <div className="flex flex-col gap-3">
                      {col.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <a
                            key={item.label}
                            href={item.path}
                            onClick={(e) => handleNav(e, item.path)}
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
              className="mx-4 mt-2 rounded-2xl glass-nav p-5 flex flex-col gap-4 md:hidden z-40 relative max-h-[calc(100dvh-120px)] overflow-y-auto custom-scroll"
            >
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">
                Core Modules
              </span>
              
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <a href="/features/work-tracking" onClick={(e) => handleNav(e, '/features/work-tracking')} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-700">
                  <CheckSquare className="h-4 w-4 text-indigo-600" /> Tasks
                </a>
                <a href="/features/team-chat" onClick={(e) => handleNav(e, '/features/team-chat')} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-700">
                  <MessageSquare className="h-4 w-4 text-cyan-600" /> DMs & Chat
                </a>
                <a href="/features/approvals" onClick={(e) => handleNav(e, '/features/approvals')} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-700">
                  <FileCheck className="h-4 w-4 text-purple-600" /> Approvals
                </a>
                <a href="/features/visibility" onClick={(e) => handleNav(e, '/features/visibility')} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-700">
                  <Clock className="h-4 w-4 text-rose-600" /> Activity Feeds
                </a>
                <a href="/features/admin-console" onClick={(e) => handleNav(e, '/features/admin-console')} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-700 col-span-2">
                  <Shield className="h-4 w-4 text-slate-700" /> Admin Console
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
              <a
                href="/contact"
                onClick={(e) => handleNav(e, '/contact')}
                className={`text-sm font-bold py-1 ${
                  currentPath === '/contact' ? 'text-indigo-600' : 'text-slate-600'
                }`}
              >
                Contact
              </a>
              <div className="h-px bg-slate-100 mt-1 mb-1" />
              <a
                href={APP_URL}
                className="text-sm font-bold text-slate-600 text-center py-2 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Sign in
              </a>
              <a
                href={APP_URL}
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
