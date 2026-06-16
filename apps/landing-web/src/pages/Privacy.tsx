import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { Shield, Eye, Lock, FileText, Share2, Bell, Mail } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  icon: any;
}

const SECTIONS: Section[] = [
  { id: 'introduction', title: 'Introduction', icon: FileText },
  { id: 'collection', title: 'Information We Collect', icon: Eye },
  { id: 'use', title: 'How We Use Information', icon: Shield },
  { id: 'security', title: 'Data Security & Storage', icon: Lock },
  { id: 'sharing', title: 'Information Sharing', icon: Share2 },
  { id: 'updates', title: 'Policy Updates', icon: Bell },
  { id: 'contact', title: 'Contact Us', icon: Mail },
];

export function Privacy() {
  const [activeSection, setActiveSection] = useState('introduction');

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
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm font-semibold text-slate-500 max-w-xl mx-auto">
            Last Updated: June 15, 2026. Learn how we handle, store, and protect your team's workspace data.
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

        {/* Policy Text Content */}
        <main className="md:col-span-3 flex flex-col gap-10">
          {/* Section: Introduction */}
          <section
            id="introduction"
            className="bg-white/45 glass rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">1. Introduction</h2>
            </div>
            <div className="text-sm text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>
                Welcome to Guild Orbit. We respect your privacy and are committed to protecting the personal and workspace data you share with us. This Privacy Policy explains how we collect, use, store, and safeguard your information when you use our landing site, web app, and related services.
              </p>
              <p>
                By accessing or using our services, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use our services.
              </p>
            </div>
          </section>

          {/* Section: Information We Collect */}
          <section
            id="collection"
            className="bg-white/45 glass rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <Eye className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">2. Information We Collect</h2>
            </div>
            <div className="text-sm text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>
                To provide our lightweight coordination platform, we collect information that helps us identify you, configure your workspaces, and keep your department operations running smoothly:
              </p>
              <ul className="list-disc pl-5 space-y-2.5">
                <li>
                  <strong className="text-slate-800">Account Details:</strong> When you sign up, we collect your name, business email address, and authentication credentials.
                </li>
                <li>
                  <strong className="text-slate-800">Workspace Content:</strong> This includes Kanban tasks, chat channel messages, member allocations, and operational approvals created inside the platform.
                </li>
                <li>
                  <strong className="text-slate-800">Usage Data:</strong> We automatically collect information about how you interact with the app (IP addresses, browser details, clickpaths, and feature utilization statistics).
                </li>
              </ul>
            </div>
          </section>

          {/* Section: How We Use Information */}
          <section
            id="use"
            className="bg-white/45 glass rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <Shield className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">3. How We Use Information</h2>
            </div>
            <div className="text-sm text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>We use the data we collect for the following core operational purposes:</p>
              <ul className="list-disc pl-5 space-y-2.5">
                <li>Providing and maintaining your collaborative team workspaces.</li>
                <li>Managing real-time operations, channel chats, approvals, and board states.</li>
                <li>Providing administrative overview panels (e.g. member workload tracking and task progress).</li>
                <li>Improving our UI/UX based on anonymized usage metrics.</li>
                <li>Communicating with workspace owners regarding feature updates, security alerts, and support queries.</li>
              </ul>
            </div>
          </section>

          {/* Section: Data Security */}
          <section
            id="security"
            className="bg-white/45 glass rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <Lock className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">4. Data Security & Storage</h2>
            </div>
            <div className="text-sm text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>
                We prioritize security to keep your workspace secure. We implement a variety of industry-standard security measures:
              </p>
              <ul className="list-disc pl-5 space-y-2.5">
                <li>
                  <strong className="text-slate-800">Encryption:</strong> All data in transit is encrypted using SSL/TLS, and data at rest is stored in secure databases.
                </li>
                <li>
                  <strong className="text-slate-800">Access Controls:</strong> Workspace permissions enforce that chat history, task updates, and approval routing are strictly visible to authorized workspace members.
                </li>
                <li>
                  <strong className="text-slate-800">Data Retention:</strong> We retain workspace contents as long as your account remains active. You can request complete deletion of your workspace data at any time.
                </li>
              </ul>
            </div>
          </section>

          {/* Section: Information Sharing */}
          <section
            id="sharing"
            className="bg-white/45 glass rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <Share2 className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">5. Information Sharing</h2>
            </div>
            <div className="text-sm text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>
                Guild Orbit does not sell, rent, or trade your personal or workspace data to third parties. We share information only in the following specific circumstances:
              </p>
              <ul className="list-disc pl-5 space-y-2.5">
                <li>
                  <strong className="text-slate-800">Service Providers:</strong> We may share data with vetted cloud hosting, database, or email service infrastructure providers who operate under strict confidentiality clauses.
                </li>
                <li>
                  <strong className="text-slate-800">Legal Compliance:</strong> We may disclose data if required by law, subpoena, or to protect the safety and integrity of our users.
                </li>
              </ul>
            </div>
          </section>

          {/* Section: Policy Updates */}
          <section
            id="updates"
            className="bg-white/45 glass rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <Bell className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">6. Policy Updates</h2>
            </div>
            <div className="text-sm text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>
                We may update this Privacy Policy from time to time. When changes are made, we will revise the "Last Updated" date at the top of this page. For significant updates, we will notify workspace administrators via email or trigger a dashboard announcement. We encourage you to review this policy periodically to stay informed about how we protect your information.
              </p>
            </div>
          </section>

          {/* Section: Contact Us */}
          <section
            id="contact"
            className="bg-white/45 glass rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <Mail className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">7. Contact Us</h2>
            </div>
            <div className="text-sm text-slate-600 font-medium space-y-4 leading-relaxed">
              <p>
                If you have any questions or concerns about this Privacy Policy, or if you wish to request data deletion/export, please contact our security team at:
              </p>
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/30 flex flex-col gap-1 text-xs">
                <span className="font-bold text-slate-800">Email:</span>
                <span className="text-indigo-600 font-semibold">security@guildorbit.com</span>
                <span className="font-bold text-slate-800 mt-2">Mailing Address:</span>
                <span className="text-slate-500 font-semibold">
                  Guild Orbit Inc., 100 Pine Street, Suite 1200, San Francisco, CA 94111
                </span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
