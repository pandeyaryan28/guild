import { Navbar } from '../components/landing/Navbar';
import { Footer } from '../components/landing/Footer';
import { Home } from './Home';
import { Features } from './Features';
import { Pricing } from './Pricing';
import { FAQ } from './FAQ';
import { useNavigation } from '../context/NavigationContext';
import { motion, AnimatePresence } from 'motion/react';

export function LandingPage() {
  const { currentPath } = useNavigation();

  const renderPage = () => {
    switch (currentPath) {
      case '/features':
        return <Features key="features" />;
      case '/pricing':
        return <Pricing key="pricing" />;
      case '/faq':
        return <FAQ key="faq" />;
      default:
        return <Home key="home" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPath}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
