import { motion } from 'motion/react';
import { Mail, ArrowRight } from 'lucide-react';

export function Careers() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center relative overflow-hidden bg-slate-50/20 grid-pattern px-6 pt-20">
      {/* Background glow blobs */}
      <div className="absolute top-[20%] left-[10%] w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      <div className="max-w-2xl w-full text-center relative z-10 space-y-8 py-16">
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight font-sans"
        >
          Careers at <br />
          <span className="text-gradient">Guild Orbit</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-xl md:text-2xl font-bold text-slate-500 leading-relaxed max-w-xl mx-auto"
        >
          We are always looking for exceptional engineers, designers, and operators to join our team.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="pt-6 flex flex-col items-center gap-4"
        >
          <span className="text-sm font-bold uppercase tracking-widest text-slate-400">
            How to apply
          </span>
          <p className="text-lg md:text-xl font-bold text-slate-700 max-w-lg leading-relaxed">
            Please send your resume and a link to your portfolio or GitHub profile to:
          </p>
          <a
            href="mailto:career@guildorbit.com?subject=Application for Careers at Guild Orbit"
            className="text-2xl md:text-4xl font-extrabold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-2 underline underline-offset-8 decoration-2"
          >
            <Mail className="h-6 w-6 md:h-9 md:w-9 shrink-0" />
            career@guildorbit.com
          </a>

          <div className="pt-8">
            <a
              href="mailto:career@guildorbit.com?subject=Application for Careers at Guild Orbit"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base tracking-tight shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.97] cursor-pointer"
            >
              Email Resume
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
