import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { APP_URL } from '../../config/landingData';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="fixed top-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[1200px] z-50 transition-all duration-300">
      <nav className="aether-glass flex items-center justify-between px-6 py-3.5 shadow-md">
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform duration-300">
            <img src="/logo.png" alt="Guild Orbit Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-lg font-black tracking-wider uppercase text-gradient bg-gradient-to-r from-indigo-600 to-violet-600">
            Guild Orbit
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
  );
}
