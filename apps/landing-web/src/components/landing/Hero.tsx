import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';

export function Hero() {
  const { navigate } = useNavigation();

  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden hero-glow">
      {/* Dynamic Ambient Background Canvas */}
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      
      {/* Floating Ambient Glowing Spheres */}
      <div className="absolute top-[10%] left-[12%] w-[450px] h-[450px] rounded-full bg-indigo-500/10 blur-[130px] animate-drift pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[120px] animate-drift-reverse pointer-events-none" />
      
      <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10">
        
        {/* Hero Headings */}
        <div className="text-center max-w-4xl">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.08] mb-6"
          >
            One Workspace. <br className="sm:hidden" />
            <span className="text-gradient-cosmic">Total Operational Clarity.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
            className="text-[15px] sm:text-lg md:text-[19px] text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10"
          >
            The lightweight coordination platform for small & mid-sized teams to unify tasks, chat, and approvals. Powered by a centralized visibility layer that gives owners and managers total oversight of every department.
          </motion.p>
        </div>

        {/* Premium CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center"
        >
          <button 
            onClick={() => navigate('/onboarding')}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm tracking-tight shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            Start free trial
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

      </div>
    </section>
  );
}
