import { motion } from 'motion/react';
import { Mail, Briefcase, Users, Star, ArrowRight } from 'lucide-react';
import { CTABanner } from '../components/landing/CTABanner';

export function Careers() {
  return (
    <div className="pt-32 pb-8 relative overflow-hidden bg-slate-50/20 grid-pattern">
      {/* Background glow blobs */}
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none animate-drift" />
      <div className="absolute bottom-[10%] right-[5%] w-[450px] h-[450px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none animate-drift-reverse" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        
        {/* Header */}
        <section className="text-center mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-indigo-605 bg-indigo-50 border border-indigo-100/55 px-3 py-1 rounded-full"
          >
            <Briefcase className="h-3 w-3" />
            We are hiring
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight"
          >
            Build the future of <br/>
            <span className="text-gradient">Team Coordination</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-4 text-slate-500 text-sm md:text-base font-semibold max-w-xl mx-auto leading-relaxed"
          >
            Join us in dismantling team silos and building high-performance, transparent operating layers for modern businesses.
          </motion.p>
        </section>

        {/* Culture & Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="glass rounded-3xl p-6 border border-white/50 space-y-4">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650">
              <Star className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">High Autonomy</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              We trust our team members. Work where you want, how you want, and take absolute ownership of your projects.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 border border-white/50 space-y-4">
            <div className="h-10 w-10 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Collaborative Spirit</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              No ego. Just smart, curious developers and product thinkers pairing together to ship exceptional software.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 border border-white/50 space-y-4">
            <div className="h-10 w-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-605">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Modern Stack</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              TypeScript, React, Tailwind CSS, Firebase, and Vite. We keep our codebase clean, fast, and highly developer-friendly.
            </p>
          </div>
        </div>

        {/* Application instructions card */}
        <div className="glass rounded-3xl p-8 md:p-12 border border-slate-150/70 shadow-sm mb-20 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-[200px] h-[200px] bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-6 max-w-2xl">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/30">
              How to Apply
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              We're always looking for exceptional talent
            </h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              We are constantly seeking brilliant engineers, UX designers, and operations specialists who love writing premium code and building world-class user experiences. 
              Even if we don't have a specific role listed that matches your profile, we want to hear from you.
            </p>
            <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-150/70 space-y-2">
              <p className="text-xs font-bold text-slate-700">
                To apply, please email your resume and a brief description of the most interesting thing you have built to:
              </p>
              <a 
                href="mailto:career@guildorbit.com?subject=Application%20for%2520Careers%20at%20Guild%20Orbit"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <Mail className="h-4 w-4" />
                career@guildorbit.com
              </a>
            </div>
            <div className="pt-2">
              <a
                href="mailto:career@guildorbit.com?subject=Application%20for%20Careers%20at%20Guild%20Orbit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs tracking-tight shadow-md shadow-indigo-500/15 transition-all active:scale-[0.98] cursor-pointer"
              >
                Send Resume
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

      </div>

      <CTABanner />
    </div>
  );
}
