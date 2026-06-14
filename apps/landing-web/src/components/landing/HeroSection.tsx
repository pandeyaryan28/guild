import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { APP_URL } from '../../config/landingData';
import { useNavigation } from '../../context/NavigationContext';

export function HeroSection() {
  const { navigate } = useNavigation();

  return (
    <section className="relative pt-28 md:pt-36 pb-16 px-6 overflow-hidden">
      {/* Floating background glows for depth */}
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-indigo-400/8 blur-[100px] animate-drift pointer-events-none" />
      <div className="absolute top-[20%] right-[5%] w-[450px] h-[450px] rounded-full bg-cyan-400/8 blur-[110px] animate-drift-reverse pointer-events-none" />
      <div className="absolute top-[40%] left-[25%] w-[350px] h-[350px] rounded-full bg-purple-300/6 blur-[90px] animate-drift pointer-events-none" />

      {/* Subtle background glow */}
      <div className="hero-glow absolute inset-0 pointer-events-none" />

      <div className="max-w-5xl mx-auto flex flex-col items-center text-center relative pt-4">
        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="text-[clamp(2.25rem,5vw,4.25rem)] font-bold tracking-tight leading-[1.1] max-w-3xl"
        >
          Your entire operations,{' '}
          <span className="text-gradient">perfectly in orbit.</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mt-6 text-lg md:text-xl text-ink-light max-w-lg leading-relaxed font-medium"
        >
          Chat, tasks, and approvals. Together in a unified workspace.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-3"
        >
          <a
            href={`${APP_URL}/signup`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-accent hover:bg-accent-dark px-6 py-3 rounded-xl transition-all active:scale-[0.97] shadow-lg shadow-accent/15"
          >
            Start for free
            <ArrowRight className="h-4 w-4" />
          </a>
          <button
            onClick={() => navigate('/features')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-light hover:text-ink px-5 py-3 rounded-xl transition-colors cursor-pointer"
          >
            See features
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>

        {/* Product Screenshot in Browser Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 md:mt-20 w-full max-w-4xl"
        >
          <div className="rounded-2xl border border-line bg-surface p-1.5 shadow-2xl shadow-black/[0.06]">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-line/60">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              <span className="ml-3 text-[10px] text-ink-faint font-medium">
                app.guildhq.space
              </span>
            </div>
            <img
              src="/guild_hero_mockup.png?v=2"
              alt="Guild Orbit dashboard showing team chat, task boards, and pending approvals"
              className="w-full rounded-b-xl"
              loading="eager"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
