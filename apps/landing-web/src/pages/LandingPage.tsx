import React from 'react';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { Solutions } from '../components/landing/Solutions';
import { FeatureShowcase } from '../components/landing/FeatureShowcase';
import { Pricing } from '../components/landing/Pricing';
import { FAQ } from '../components/landing/FAQ';
import { CTA } from '../components/landing/CTA';
import { Footer } from '../components/landing/Footer';

export function LandingPage() {
  return (
    <div className="relative min-h-screen text-text-primary z-10 antialiased overflow-x-hidden pb-16">
      {/* Navbar Header */}
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Solutions Core Features Section */}
      <Solutions />

      {/* Feature Deep Dive Showcases */}
      <FeatureShowcase />

      {/* Pricing Selector & Wallet Topups */}
      <Pricing />

      {/* FAQ Accordion */}
      <FAQ />

      {/* Call To Action Banner */}
      <CTA />

      {/* Footer Directory */}
      <Footer />
    </div>
  );
}
