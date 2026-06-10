import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { APP_URL } from '../../config/landingData';
import { useNavigation } from '../../context/NavigationContext';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { currentPath, navigate } = useNavigation();

  const navItems = [
    { label: 'Features', path: '/features' },
    { label: 'Solutions', path: '/solutions' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'FAQ', path: '/faq' },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[1200px] z-50 transition-all duration-300">
      <nav className="aether-glass flex items-center justify-between px-6 py-3.5 shadow-md bg-white/40">
        {/* Brand Logo */}
        <a 
          href="/" 
          onClick={(e) => handleLinkClick(e, '/')}
          className="flex items-center gap-2.5 group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform duration-300">
            <img src="/logo.png" alt="Guild Orbit Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-lg font-black tracking-wider uppercase text-gradient bg-gradient-to-r from-indigo-600 to-violet-600">
            Guild Orbit
          </span>
        </a>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center gap-7">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleLinkClick(e, item.path)}
                className={`text-xs font-bold transition-all relative py-1 uppercase tracking-wider ${
                  isActive 
                    ? 'text-indigo-600 font-extrabold' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.div 
                    layoutId="activeNavLine"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600 rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </a>
            );
          })}
        </div>

        {/* Action CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <a 
            href={`${APP_URL}/login`} 
            className="text-xs font-bold text-text-secondary hover:text-text-primary transition-colors px-4 py-2 uppercase tracking-wider"
          >
            Sign In
          </a>
          <a 
            href={`${APP_URL}/signup`} 
            className="aether-glass border border-indigo-200 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-500 hover:text-white px-5.5 py-2.5 text-xs font-bold rounded-xl active:scale-95 flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-indigo-500/10 uppercase tracking-wider"
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
            className="aether-glass-elevated absolute top-16 left-0 right-0 p-5 mt-2 flex flex-col gap-4 shadow-xl z-40 border border-border-default/80 bg-white/95"
          >
            {navItems.map((item) => (
              <a 
                key={item.path}
                href={item.path} 
                onClick={(e) => handleLinkClick(e, item.path)}
                className={`text-sm font-bold uppercase tracking-wider py-1 ${
                  currentPath === item.path 
                    ? 'text-indigo-600 font-extrabold' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {item.label}
              </a>
            ))}
            
            <div className="h-[1px] bg-border-default/60 my-1" />
            
            <div className="flex flex-col gap-2">
              <a 
                href={`${APP_URL}/login`} 
                className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-text-secondary border border-transparent hover:bg-black/5 uppercase tracking-wider"
              >
                Sign In
              </a>
              <a 
                href={`${APP_URL}/signup`} 
                className="w-full text-center py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all active:scale-95 uppercase tracking-wider"
              >
                Create Workspace
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
