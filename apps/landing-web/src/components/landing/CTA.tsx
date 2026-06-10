import React from 'react';
import { ArrowRight } from 'lucide-react';
import { APP_URL } from '../../config/landingData';

export function CTA() {
  return (
    <section className="py-20 px-6 max-w-[1000px] mx-auto">
      <div className="aether-glass border border-indigo-200 bg-indigo-50/10 p-8 md:p-12 text-center rounded-[28px] relative overflow-hidden shadow-2xl">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-500/5 rounded-full filter blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-violet-500/5 rounded-full filter blur-2xl pointer-events-none" />
        
        <h2 className="text-2xl md:text-4.5xl font-black text-text-primary uppercase tracking-tight mb-4">
          Eliminate Operational Noise Today
        </h2>
        <p className="text-xs text-text-secondary max-w-[550px] mx-auto leading-relaxed font-medium mb-8">
          Join the forward-thinking teams coordinating workflows, tracking tasks, and securing approvals with Guild Orbit.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-[500px] mx-auto">
          <a 
            href={`${APP_URL}/signup`}
            className="w-full sm:w-auto h-11 px-7 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer shrink-0"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
