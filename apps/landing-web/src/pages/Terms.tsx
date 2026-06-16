import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { FileText, ShieldAlert, UserCheck, Settings, Scale, AlertTriangle, HelpCircle } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  icon: any;
}

const SECTIONS: Section[] = [
  { id: 'acceptance', title: '1. Acceptance of Terms', icon: FileText },
  { id: 'service', title: '2. Description of Service', icon: Settings },
  { id: 'accounts', title: '3. Accounts & Security', icon: UserCheck },
  { id: 'conduct', title: '4. User Conduct', icon: ShieldAlert },
  { id: 'property', title: '5. Intellectual Property', icon: Scale },
  { id: 'liability', title: '6. Limitation of Liability', icon: AlertTriangle },
  { id: 'governing', title: '7. Governing Law', icon: HelpCircle },
];

export function Terms() {
  const [activeSection, setActiveSection] = useState('acceptance');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;

      for (const section of SECTIONS) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 120,
        behavior: 'smooth',
      });
      setActiveSection(id);
    }
  };

  return (
    <div className="pt-28 pb-20 px-6 min-h-screen grid-pattern bg-page relative">
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[5%] w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <section className="max-w-4xl mx-auto text-center mb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-extrabold text-slate-900 tracking-tight leading-none">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm font-semibold text-slate-500 max-w-xl mx-auto">
            Last Updated: June 15, 2026. Review the terms governing your usage of the Guild Orbit platform.
          </p>
        </motion.div>
      </section>

      {/* Content Layout */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 relative z-10">
        {/* Sticky Sidebar Navigation */}
        <aside className="md:col-span-1">
          <div className="sticky top-28 bg-white/45 glass rounded-2xl p-4 flex flex-col gap-1.5 shadow-sm">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3 mb-2 block">
              Contents
            </span>
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {section.title}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Terms Text Content */}
        <main className="md:col-span-3 flex flex-col gap-10">
          {/* Section: Acceptance of Terms */}
          <section
            id="acceptance"
            className="bg-white/45 glass rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">1. Acceptance of Terms</h2>
            </div>
            <div className="text-sm text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>
                By using or subscribing to Guild Orbit ("Service," "we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). These Terms govern your access to and use of our landing page, software dashboards, APIs, and communication tools.
              </p>
              <p>
                If you are entering into these Terms on behalf of a company, organization, or other legal entity, you represent that you have the authority to bind such entity to these Terms. If you do not have such authority, or if you do not agree with these Terms, you must not accept them and may not use the Service.
              </p>
            </div>
          </section>

          {/* Section: Description of Service */}
          <section
            id="service"
            className="bg-white/45 glass rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <Settings className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">2. Description of Service</h2>
            </div>
            <div className="text-sm text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>
                Guild Orbit provides a lightweight, unified coordination platform for small & mid-sized teams. The Service integrates:
              </p>
              <ul className="list-disc pl-5 space-y-2.5">
                <li>Kanban task boards and workflow tracking.</li>
                <li>Departmental/team chat channels.</li>
                <li>Structured approval logs.</li>
                <li>A shared workspace directory with workload visibility.</li>
              </ul>
              <p>
                We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice, though we will make reasonable efforts to notify customers of major changes.
              </p>
            </div>
          </section>

          {/* Section: Accounts & Security */}
          <section
            id="accounts"
            className="bg-white/45 glass rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <UserCheck className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">3. Accounts & Security</h2>
            </div>
            <div className="text-sm text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>
                To access the app services, you must register for an account. You agree to provide accurate, current, and complete registration details.
              </p>
              <ul className="list-disc pl-5 space-y-2.5">
                <li>
                  You are responsible for maintaining the security of your account passwords and API keys.
                </li>
                <li>
                  You are fully responsible for all activities that occur under your account or workspace.
                </li>
                <li>
                  You must immediately notify us of any unauthorized use of your account or security breach. We cannot and will not be liable for any loss or damage arising from your failure to comply with these security obligations.
                </li>
              </ul>
            </div>
          </section>

          {/* Section: User Conduct */}
          <section
            id="conduct"
            className="bg-white/45 glass rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <ShieldAlert className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">4. User Conduct & Acceptable Use</h2>
            </div>
            <div className="text-sm text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>
                You agree not to use the Service to upload, post, transmit, or otherwise distribute content that:
              </p>
              <ul className="list-disc pl-5 space-y-2.5">
                <li>Is illegal, harmful, threatening, abusive, harassing, defamatory, or invasive of another's privacy.</li>
                <li>Infringes any patent, trademark, trade secret, copyright, or other proprietary rights of any party.</li>
                <li>Contains software viruses, malware, or any other computer code designed to interrupt, destroy, or limit the functionality of any computer software or hardware.</li>
                <li>Interferes with or disrupts the Service or servers connected to the Service.</li>
              </ul>
            </div>
          </section>

          {/* Section: Intellectual Property */}
          <section
            id="property"
            className="bg-white/45 glass rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <Scale className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">5. Intellectual Property Rights</h2>
            </div>
            <div className="text-sm text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>
                We do not claim ownership of the content, tasks, or messages you upload to the Service. All workspace data you create remains yours.
              </p>
              <p>
                However, the Service, including its landing pages, codebases, design tokens, logos, graphics, and interactive simulators, is the exclusive property of Guild Orbit Inc. and is protected by copyright and intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any portion of our intellectual property.
              </p>
            </div>
          </section>

          {/* Section: Limitation of Liability */}
          <section
            id="liability"
            className="bg-white/45 glass rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <AlertTriangle className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">6. Limitation of Liability & Disclaimers</h2>
            </div>
            <div className="text-sm text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>
                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. GUILD ORBIT EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p>
                IN NO EVENT SHALL GUILD ORBIT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES (INCLUDING DAMAGES FOR LOSS OF PROFITS, WORK SUSPENSION, DATA LOSS, OR GOODWILL) ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE, WHETHER OR NOT WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
            </div>
          </section>

          {/* Section: Governing Law */}
          <section
            id="governing"
            className="bg-white/45 glass rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <HelpCircle className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">7. Governing Law</h2>
            </div>
            <div className="text-sm text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law principles.
              </p>
              <p>
                Any legal action or proceeding arising under these Terms will be brought exclusively in the federal or state courts located in San Francisco, California, and you hereby consent to the personal jurisdiction and venue therein.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
