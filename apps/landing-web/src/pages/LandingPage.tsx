import React from 'react';
import { Navbar } from '../components/landing/Navbar';
import { Footer } from '../components/landing/Footer';
import { Home } from './Home';
import { Features } from './Features';
import { Solutions } from './Solutions';
import { Pricing } from './Pricing';
import { FAQ } from './FAQ';
import { useNavigation } from '../context/NavigationContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { APP_URL } from '../config/landingData';

export function LandingPage() {
  const { currentPath } = useNavigation();

  const renderActivePage = () => {
    switch (currentPath) {
      case '/features':
        return <Features key="features" />;
      case '/solutions':
        return <Solutions key="solutions" />;
      case '/pricing':
        return <Pricing key="pricing" />;
      case '/faq':
        return <FAQ key="faq" />;
      case '/':
      default:
        return <Home key="home" />;
    }
  };

  return (
    <div className="relative min-h-screen text-text-primary z-10 antialiased overflow-x-hidden flex flex-col justify-between">
      {/* Navbar Header */}
      <Navbar />

      {/* Main Routed Content */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPath}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            {renderActivePage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Reusable CTA Section (shown on all pages to convert users) */}
      <section className="py-12 px-6 max-w-[1000px] mx-auto w-full">
        <div className="aether-glass border border-indigo-200 bg-indigo-50/10 p-8 md:p-12 text-center rounded-[28px] relative overflow-hidden shadow-xl">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-500/5 rounded-full filter blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-violet-500/5 rounded-full filter blur-2xl pointer-events-none" />
          
          <h2 className="text-xl md:text-3xl font-black text-text-primary uppercase tracking-tight mb-3">
            Eliminate Operational Noise Today
          </h2>
          <p className="text-xs text-text-secondary max-w-[520px] mx-auto leading-relaxed font-medium mb-6">
            Join the forward-thinking teams coordinating workflows, tracking tasks, and securing approvals with Guild Orbit.
          </p>

          <a 
            href={`${APP_URL}/signup`}
            className="inline-flex items-center gap-2 h-11 px-7 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-98 cursor-pointer"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Footer Directory */}
      <Footer />
    </div>
  );
}
