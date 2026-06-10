import { HeroSection } from '../components/landing/HeroSection';
import { TrustBar } from '../components/landing/TrustBar';
import { FeatureCards } from '../components/landing/FeatureCards';
import { BentoShowcase } from '../components/landing/BentoShowcase';
import { BeforeAfter } from '../components/landing/BeforeAfter';
import { CTABanner } from '../components/landing/CTABanner';

export function Home() {
  return (
    <>
      <HeroSection />
      <TrustBar />
      <FeatureCards />
      <BentoShowcase />
      <BeforeAfter />
      <CTABanner />
    </>
  );
}
