import { Navbar } from '../components/landing/Navbar';
import { Footer } from '../components/landing/Footer';
import { Home } from './Home';
import { Features } from './Features';
import { Pricing } from './Pricing';
import { FAQ } from './FAQ';
import { WorkTrackingFeature } from './WorkTrackingFeature';
import { TeamChatFeature } from './TeamChatFeature';
import { ApprovalsFeature } from './ApprovalsFeature';
import { VisibilityFeature } from './VisibilityFeature';
import { AdminFeature } from './AdminFeature';
import { Privacy } from './Privacy';
import { Terms } from './Terms';
import { Demo } from './Demo';
import { Onboarding } from './Onboarding';
import { Contact } from './Contact';
import { useNavigation } from '../context/NavigationContext';
import { motion, AnimatePresence } from 'motion/react';

export function LandingPage() {
  const { currentPath } = useNavigation();

  const renderPage = () => {
    // Normalize path: lowercase, trim, remove trailing slash
    let path = currentPath.toLowerCase().trim().replace(/\/$/, '');

    // Strip out base path if served from a subdirectory (e.g. /guild/features -> /features)
    const featuresIdx = path.indexOf('/features');
    if (featuresIdx !== -1) {
      path = path.substring(featuresIdx);
    } else {
      const pricingIdx = path.indexOf('/pricing');
      if (pricingIdx !== -1) {
        path = path.substring(pricingIdx);
      } else {
        const faqIdx = path.indexOf('/faq');
        if (faqIdx !== -1) {
          path = path.substring(faqIdx);
        } else {
          const onboardingIdx = path.indexOf('/onboarding');
          if (onboardingIdx !== -1) {
            path = path.substring(onboardingIdx);
          } else {
            const demoIdx = path.indexOf('/demo');
            if (demoIdx !== -1) {
              path = path.substring(demoIdx);
            } else {
              const contactIdx = path.indexOf('/contact');
              if (contactIdx !== -1) {
                path = path.substring(contactIdx);
              } else {
                const privacyIdx = path.indexOf('/privacy');
                if (privacyIdx !== -1) {
                  path = path.substring(privacyIdx);
                } else {
                  const termsIdx = path.indexOf('/terms');
                  if (termsIdx !== -1) {
                    path = path.substring(termsIdx);
                  }
                }
              }
            }
          }
        }
      }
    }

    switch (path) {
      case '/features':
        return <Features key="features" />;
      case '/features/work-tracking':
        return <WorkTrackingFeature key="work-tracking" />;
      case '/features/team-chat':
        return <TeamChatFeature key="team-chat" />;
      case '/features/approvals':
        return <ApprovalsFeature key="approvals" />;
      case '/features/visibility':
        return <VisibilityFeature key="visibility" />;
      case '/features/admin-console':
        return <AdminFeature key="admin-console" />;
      case '/pricing':
        return <Pricing key="pricing" />;
      case '/faq':
        return <FAQ key="faq" />;
      case '/contact':
        return <Contact key="contact" />;
      case '/privacy':
        return <Privacy key="privacy" />;
      case '/terms':
        return <Terms key="terms" />;
      case '/demo':
        return <Demo key="demo" />;
      case '/onboarding':
        return <Onboarding key="onboarding" />;
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
