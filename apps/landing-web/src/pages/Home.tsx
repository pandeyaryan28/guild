import { Hero } from '../components/landing/Hero';
import { TrustBar } from '../components/landing/TrustBar';
import { FeatureCards } from '../components/landing/FeatureCards';
import { BentoShowcase } from '../components/landing/BentoShowcase';
import { BeforeAfter } from '../components/landing/BeforeAfter';
import { CTABanner } from '../components/landing/CTABanner';
import { GlassTorusKnot } from '../components/landing/GlassTorusKnot';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';
import { JsonLd } from '../components/seo/JsonLd';

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  'name': 'Guild Orbit',
  'url': 'https://guildorbit.com',
  'logo': 'https://guildorbit.com/logo.png',
  'sameAs': [
    'https://twitter.com/guildorbit',
    'https://github.com/guildorbit'
  ]
};

const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  'name': 'Guild Orbit',
  'operatingSystem': 'All',
  'applicationCategory': 'BusinessApplication',
  'offers': {
    '@type': 'Offer',
    'price': '0',
    'priceCurrency': 'USD'
  }
};

export function Home() {
  useDocumentMetadata({
    title: 'Guild Orbit, Startup Visibility Layer in Two Minutes',
    description: 'Get the status of your whole startup within two minutes. Guild Orbit is the centralized visibility layer for founders, managers, and admins with tasks, chat, and approvals underneath.',
    canonicalPath: '/'
  });

  return (
    <>
      <JsonLd schema={orgSchema} />
      <JsonLd schema={appSchema} />
      <Hero />
      <TrustBar />
      
      {/* FeatureCards with background torus knot floating on the left */}
      <div className="relative overflow-hidden">
        <div className="absolute top-[10%] -left-[15%] w-[400px] h-[400px] sm:w-[550px] sm:h-[550px] md:w-[700px] md:h-[700px] pointer-events-none z-0 opacity-15 select-none">
          <GlassTorusKnot />
        </div>
        <FeatureCards />
      </div>
      

      {/* BentoShowcase with background torus knot floating on the left */}
      <div className="relative overflow-hidden">
        <div className="absolute bottom-[10%] -left-[12%] w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] md:w-[650px] md:h-[650px] pointer-events-none z-0 opacity-15 select-none">
          <GlassTorusKnot />
        </div>
        <BentoShowcase />
      </div>

      <BeforeAfter />
      <CTABanner />
    </>
  );
}
