import { Hero } from '../components/landing/Hero';
import { TrustBar } from '../components/landing/TrustBar';
import { FeatureCards } from '../components/landing/FeatureCards';
import { InteractiveMockup } from '../components/landing/InteractiveMockup';
import { ScrollReveal } from '../components/landing/ScrollReveal';
import { BentoShowcase } from '../components/landing/BentoShowcase';
import { BeforeAfter } from '../components/landing/BeforeAfter';
import { CTABanner } from '../components/landing/CTABanner';
import { GlassTorusKnot } from '../components/landing/GlassTorusKnot';

export function Home() {
  return (
    <>
      <Hero />
      <TrustBar />
      
      {/* FeatureCards with background torus knot floating on the left */}
      <div className="relative overflow-hidden">
        <div className="absolute top-[10%] -left-[15%] w-[400px] h-[400px] sm:w-[550px] sm:h-[550px] md:w-[700px] md:h-[700px] pointer-events-none z-0 opacity-15 select-none">
          <GlassTorusKnot />
        </div>
        <FeatureCards />
      </div>
      
      {/* Live Simulator Section (Shifted under One Workspace / FeatureCards) */}
      <section className="py-16 pb-24 px-6 relative overflow-hidden bg-slate-50/10">
        <div className="absolute top-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[5%] w-[350px] h-[350px] rounded-full bg-cyan-500/5 blur-[90px] pointer-events-none" />
        
        {/* Torus knot floating on the right */}
        <div className="absolute bottom-[10%] -right-[15%] w-[400px] h-[400px] sm:w-[550px] sm:h-[550px] md:w-[700px] md:h-[700px] pointer-events-none z-0 opacity-15 select-none">
          <GlassTorusKnot />
        </div>
        
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
