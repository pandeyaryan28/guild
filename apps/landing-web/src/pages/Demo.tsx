import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';
import { submitDemoRequest } from '../services/demoService';

export function Demo() {
  useDocumentMetadata({
    title: 'Request a Live Demo',
    description: 'Get in touch with us to schedule a personalized demo of Guild Orbit and see how it fits your team\'s workflows.',
    canonicalPath: '/demo'
  });

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', teamSize: '5-20', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await submitDemoRequest({
        name: formData.name,
        email: formData.email,
        teamSize: formData.teamSize,
        message: formData.message,
        source: 'demo_page',
        formType: 'demo',
      });
      setFormSubmitted(true);
    } catch (err: any) {
      console.error('Demo Form Submit Error:', err);
      setErrorMsg(err.message || 'Failed to submit demo request. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-28 pb-20 px-6 min-h-screen grid-pattern bg-page relative flex flex-col justify-center items-center">
      {/* Floating Ambient Glowing Spheres */}
      <div className="absolute top-[10%] left-[5%] w-[450px] h-[450px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[450px] h-[450px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-xl mx-auto flex flex-col items-center relative z-20">
        {/* Header */}
        <section className="text-center mb-8 max-w-lg">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-none mb-3">
            Schedule a Demo
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            See how Guild Orbit can help coordinate your team's tasks, chat, and approvals.
          </p>
        </section>

        {/* Form Card */}
        <div className="w-full bg-white/45 glass rounded-3xl p-6 md:p-8 border border-slate-200/50 shadow-sm overflow-hidden">
          <AnimatePresence mode="wait">
            {!formSubmitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h2 className="text-lg font-bold text-slate-900 text-center">
                  Request a live, personalized team demo
                </h2>
                <p className="text-slate-500 text-xs font-semibold text-center mt-1.5 mb-6">
                  Get a dedicated coordinator to show you how Guild Orbit fits your department's specific workflows.
                </p>

                <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                  {errorMsg && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-2.5 rounded-xl text-xs font-semibold">
                      {errorMsg}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="name" className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        disabled={isSubmitting}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="email" className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                        Work Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        disabled={isSubmitting}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@company.com"
                        className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="team-size" className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                      Expected Team Size
                    </label>
                    <select
                      id="team-size"
                      disabled={isSubmitting}
                      value={formData.teamSize}
                      onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                      className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="5-20">5 to 20 users</option>
                      <option value="20-100">20 to 100 users</option>
                      <option value="100+">More than 100 users</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="message" className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                      Message (Optional)
                    </label>
                    <textarea
                      id="message"
                      rows={3}
                      disabled={isSubmitting}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us a bit about your operational challenges..."
                      className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none disabled:opacity-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors text-white py-3 px-4 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5 mt-2 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Booking demo call...
                      </>
                    ) : (
                      <>
                        Book Demo Call
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 flex flex-col items-center gap-4"
              >
                <div className="h-14 w-14 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Demo Scheduled Successfully!</h3>
                <p className="text-slate-500 text-xs font-semibold max-w-sm leading-relaxed">
                  Thanks for your interest, <span className="text-slate-800 font-bold">{formData.name}</span>! An onboarding specialist will email you at <span className="text-slate-800 font-bold">{formData.email}</span> within the next 24 hours with an invite link.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
