import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  Mail, 
  MessageSquare, 
  Building2, 
  Users 
} from 'lucide-react';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';
import { submitDemoRequest } from '../services/demoService';

export function Contact() {
  useDocumentMetadata({
    title: 'Contact Us',
    description: 'Get in touch with the Guild Orbit team. Request a personalized demo, ask a question about our workspaces, or inquire about custom team pricing.',
    canonicalPath: '/contact'
  });

  const [formType, setFormType] = useState<'demo' | 'inquiry'>('demo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    teamSize: '5-20',
    message: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await submitDemoRequest({
        name: formData.name,
        email: formData.email,
        company: formData.company,
        teamSize: formData.teamSize,
        message: formData.message,
        source: 'contact_page',
        formType: formType,
      });
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Contact Form Error:', err);
      setErrorMsg(err.message || 'Failed to submit form. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative min-h-[90vh] py-24 md:py-32 px-6 overflow-hidden flex items-center justify-center grid-pattern">
      {/* Background Cinematic Glow Elements */}
      <div className="absolute top-[15%] left-[-10%] w-[450px] h-[450px] rounded-full bg-indigo-500/10 blur-[130px] animate-drift pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[450px] h-[450px] rounded-full bg-cyan-500/10 blur-[130px] animate-drift-reverse pointer-events-none" />

      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Side: Copy and Details */}
        <div className="md:col-span-5 flex flex-col gap-6">


          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Let's build your unified <span className="text-gradient">workspace.</span>
          </h1>

          <p className="text-slate-500 text-xs font-semibold leading-relaxed max-w-sm">
            Whether you want a personalized tour of our operational tools, have questions about setup, or need pricing for a larger team, we're here to help.
          </p>

          <div className="h-px bg-slate-200/60 my-2" />

          {/* Quick value propositions */}
          <div className="flex flex-col gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100/30">
                <CheckCircle2 className="h-3 w-3 text-indigo-600" />
              </div>
              <div>
                <span className="text-slate-800 font-bold block">15-minute product walk</span>
                <span className="text-slate-400 font-medium text-[11px]">No high-pressure sales. Just operations logic.</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded bg-cyan-50 flex items-center justify-center shrink-0 mt-0.5 border border-cyan-100/30">
                <CheckCircle2 className="h-3 w-3 text-cyan-600" />
              </div>
              <div>
                <span className="text-slate-800 font-bold block">Tailored onboarding help</span>
                <span className="text-slate-400 font-medium text-[11px]">We help you move tasks from WhatsApp & sheets.</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200/60 my-2" />

          {/* Contact Methods */}
          <div className="flex flex-col gap-3">
            <a 
              href="mailto:support@guildorbit.com" 
              className="flex items-center gap-3 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors group"
            >
              <div className="h-8 w-8 rounded-lg bg-white/60 border border-slate-200 flex items-center justify-center group-hover:border-indigo-200 group-hover:bg-indigo-50/30 transition-all">
                <Mail className="h-3.5 w-3.5" />
              </div>
              support@guildorbit.com
            </a>

          </div>
        </div>

        {/* Right Side: Glassmorphic Interactive Form */}
        <div className="md:col-span-7">
          <div className="bg-white/45 glass rounded-3xl p-6 md:p-8 border border-slate-200/50 shadow-xl relative">
            
            {/* Tabs for choosing form type */}
            <div className="grid grid-cols-2 bg-slate-100/80 rounded-xl p-1 mb-6 border border-slate-200/40">
              <button
                type="button"
                onClick={() => {
                  setFormType('demo');
                  setErrorMsg(null);
                }}
                disabled={isSubmitting || isSuccess}
                className={`py-2 px-3 rounded-lg text-[11px] font-bold tracking-tight cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  formType === 'demo'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Book a Demo
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormType('inquiry');
                  setErrorMsg(null);
                }}
                disabled={isSubmitting || isSuccess}
                className={`py-2 px-3 rounded-lg text-[11px] font-bold tracking-tight cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  formType === 'inquiry'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                General Inquiry
              </button>
            </div>

            <AnimatePresence mode="wait">
              {!isSuccess ? (
                <motion.div
                  key="contact-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                    {/* Error Banner */}
                    {errorMsg && (
                      <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-2.5 rounded-xl text-xs font-semibold">
                        {errorMsg}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="name" className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          required
                          value={formData.name}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          placeholder="Jane Doe"
                          className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        />
                      </div>

                      {/* Email */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="email" className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                          Work Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          placeholder="jane@company.com"
                          className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Company */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="company" className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                        Company / Organization
                      </label>
                      <div className="relative flex items-center">
                        <Building2 className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          id="company"
                          required
                          value={formData.company}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          placeholder="Acme Operations Corp"
                          className="w-full bg-white/60 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Team Size (only relevant for Demo request) */}
                    {formType === 'demo' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col gap-1.5 overflow-hidden"
                      >
                        <label htmlFor="teamSize" className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                          Expected Team Size
                        </label>
                        <select
                          id="teamSize"
                          value={formData.teamSize}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          <option value="5-20">5 to 20 users</option>
                          <option value="20-100">20 to 100 users</option>
                          <option value="100+">More than 100 users</option>
                        </select>
                      </motion.div>
                    )}

                    {/* Message */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="message" className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                        Message / Operational Challenges
                      </label>
                      <textarea
                        id="message"
                        rows={4}
                        required={formType === 'inquiry'}
                        value={formData.message}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        placeholder={
                          formType === 'demo'
                            ? "Tell us a bit about your operational challenges (optional)..."
                            : "How can we help your team succeed?..."
                        }
                        className="bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none disabled:opacity-50"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors text-white py-3 px-4 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5 mt-2 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting Request...
                        </>
                      ) : formType === 'demo' ? (
                        <>
                          Request Live Demo
                          <ArrowRight className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Send Message
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              ) : (
                /* Success screen */
                <motion.div
                  key="success-message"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="text-center py-10 flex flex-col items-center gap-5"
                >
                  <div className="h-16 w-16 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-md">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold text-slate-900">
                      {formType === 'demo' ? 'Demo Request Received!' : 'Message Sent Successfully!'}
                    </h3>
                    <p className="text-slate-500 text-xs font-semibold max-w-sm mx-auto leading-relaxed">
                      Thank you, <span className="text-slate-800 font-bold">{formData.name}</span>. 
                      {formType === 'demo' 
                        ? ` We've recorded your demo request for ${formData.company}. An operations specialist will contact you at `
                        : ' We have received your inquiry. A support coordinator will email you at '}
                      <span className="text-slate-800 font-bold">{formData.email}</span> within the next 24 business hours.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSuccess(false);
                      setFormData({
                        name: '',
                        email: '',
                        company: '',
                        teamSize: '5-20',
                        message: '',
                      });
                    }}
                    className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Send another response
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

      </div>
    </section>
  );
}
