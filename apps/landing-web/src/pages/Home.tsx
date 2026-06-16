import { HeroSection } from '../components/landing/HeroSection';
import { TrustBar } from '../components/landing/TrustBar';
import { FeatureCards } from '../components/landing/FeatureCards';
import { InteractiveMockup } from '../components/landing/InteractiveMockup';
import { ScrollReveal } from '../components/landing/ScrollReveal';
import { BentoShowcase } from '../components/landing/BentoShowcase';
import { BeforeAfter } from '../components/landing/BeforeAfter';
import { CTABanner } from '../components/landing/CTABanner';

export function Home() {
  return (
    <>
      <HeroSection />
      <TrustBar />
      <FeatureCards />
      
      {/* Live Simulator Section (Shifted under One Workspace / FeatureCards) */}
      <section className="py-16 pb-24 px-6 relative overflow-hidden bg-slate-50/10">
        <div className="absolute top-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[5%] w-[350px] h-[350px] rounded-full bg-cyan-500/5 blur-[90px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Try the live simulator
              </h2>
              <p className="text-slate-500 text-xs font-semibold mt-2.5 max-w-md mx-auto leading-relaxed">
                Interact with task boards, approvals, private DMs, and activity feeds in real-time.
              </p>
            </div>
          </ScrollReveal>
          
          <ScrollReveal delay={0.15}>
            <div className="w-full max-w-4xl z-20">
              <InteractiveMockup />
            </div>
          </ScrollReveal>
        </div>
      </section>

      <BentoShowcase />
      <BeforeAfter />
      <CTABanner />
    </>
  );
}
