import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { APP_URL, NAV_ITEMS } from '../../config/landingData';
import { useNavigation } from '../../context/NavigationContext';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(() => window.scrollY > 20);
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
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-3">
      <nav
        className={`mx-auto max-w-5xl rounded-2xl px-5 py-3 flex items-center justify-between transition-all duration-300 ${
          scrolled ? 'glass-nav' : 'bg-transparent'
        }`}
      >
        {/* Logo */}
        <a
          href="/"
          onClick={(e) => handleNav(e, '/')}
          className="flex items-center gap-2.5"
        >
          <img
            src="/logo.png"
            alt="Guild Orbit"
            className="h-8 w-8 rounded-lg"
          />
          <span className="text-base font-semibold text-ink tracking-tight">
            Guild Orbit
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => handleNav(e, item.path)}
              className={`text-[13px] font-medium transition-colors ${
                currentPath === item.path
                  ? 'text-accent'
                  : 'text-ink-light hover:text-ink'
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href={`${APP_URL}/login`}
            className="text-[13px] font-medium text-ink-light hover:text-ink transition-colors px-3 py-1.5"
          >
            Sign in
          </a>
          <a
            href={`${APP_URL}/signup`}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white bg-accent hover:bg-accent-dark px-4 py-2 rounded-xl transition-all active:scale-[0.97]"
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

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mx-4 mt-2 rounded-2xl glass-nav p-5 flex flex-col gap-4 md:hidden"
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleNav(e, item.path)}
                className={`text-sm font-medium py-1 ${
                  currentPath === item.path ? 'text-accent' : 'text-ink-light'
                }`}
              >
                {item.label}
              </a>
            ))}
            <div className="h-px bg-line mt-1 mb-1" />
            <a
              href={`${APP_URL}/login`}
              className="text-sm font-medium text-ink-light text-center py-2"
            >
              Sign in
            </a>
            <a
              href={`${APP_URL}/signup`}
              className="text-sm font-medium text-white bg-accent hover:bg-accent-dark text-center py-2.5 rounded-xl transition-all"
            >
              Start for free
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
