import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import {
  Compass,
  CheckCircle2,
  ChevronRight,
  Plus,
  Trash2,
  Briefcase,
  Users,
  Settings,
  ShieldCheck,
  Send,
  Sparkles
} from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: any;
}

const STEPS: Step[] = [
  {
    id: 1,
    title: 'Workspace Setup',
    description: 'Name your team organization and customize your unique workspace subdomain.',
    icon: Briefcase,
  },
  {
    id: 2,
    title: 'Kanban Boards',
    description: 'Select board templates to track sprints, designs, or campaign flows.',
    icon: Compass,
  },
  {
    id: 3,
    title: 'Team Channels',
    description: 'Establish chat channels for departments, topics, or announcements.',
    icon: Plus,
  },
  {
    id: 4,
    title: 'Approval Rules',
    description: 'Link specific columns or tasks to supervisor sign-off requirements.',
    icon: ShieldCheck,
  },
  {
    id: 5,
    title: 'Team Invitations',
    description: 'Invite members to your workspace and assign their specific department roles.',
    icon: Users,
  },
];

export function Onboarding() {
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Simulation State
  const [workspaceName, setWorkspaceName] = useState('Acme Corp');
  const [selectedTemplate, setSelectedTemplate] = useState('software');
  const [chatChannels, setChatChannels] = useState(['general', 'engineering', 'design']);
  const [newChannel, setNewChannel] = useState('');
  const [approvalRules, setApprovalRules] = useState<Array<{ column: string; approver: string }>>([
    { column: 'Done', approver: 'Sarah O\'Connor' },
  ]);
  const [newRule, setNewRule] = useState({ column: 'QA Review', approver: 'Sarah O\'Connor' });
  const [inviteEmails, setInviteEmails] = useState<Array<{ email: string; role: string }>>([
    { email: 'alex@acme.com', role: 'Developer' },
  ]);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'Developer' });

  const completeStep = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
    if (stepId < STEPS.length) {
      setActiveStep(stepId + 1);
    }
  };

  const resetSimulator = () => {
    setCompletedSteps([]);
    setActiveStep(1);
    setWorkspaceName('Acme Corp');
    setSelectedTemplate('software');
    setChatChannels(['general', 'engineering', 'design']);
    setApprovalRules([{ column: 'Done', approver: 'Sarah O\'Connor' }]);
    setInviteEmails([{ email: 'alex@acme.com', role: 'Developer' }]);
  };

  // Add Channel
  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChannel && !chatChannels.includes(newChannel)) {
      setChatChannels([...chatChannels, newChannel.toLowerCase().replace(/\s+/g, '-')]);
      setNewChannel('');
    }
  };

  // Delete Channel
  const handleDeleteChannel = (channel: string) => {
    if (channel !== 'general') {
      setChatChannels(chatChannels.filter((c) => c !== channel));
    }
  };

  // Add Approval Rule
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    setApprovalRules([...approvalRules, { ...newRule }]);
  };

  // Delete Approval Rule
  const handleDeleteRule = (index: number) => {
    setApprovalRules(approvalRules.filter((_, i) => i !== index));
  };

  // Add Invite Email
  const handleAddInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (newInvite.email && !inviteEmails.some((i) => i.email === newInvite.email)) {
      setInviteEmails([...inviteEmails, { ...newInvite }]);
      setNewInvite({ email: '', role: 'Developer' });
    }
  };

  // Delete Invite Email
  const handleDeleteInvite = (email: string) => {
    setInviteEmails(inviteEmails.filter((i) => i.email !== email));
  };

  // Render Simulator UI depending on active step
  const renderSimulatorSection = () => {
    switch (activeStep) {
      case 1:
        return (
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-[10px]">1</span>
              Name your workspace organization
            </h4>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-extrabold uppercase text-slate-400">Workspace Name</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Subdomain Preview */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 text-[10px] text-slate-500 font-semibold space-y-1">
                <span className="text-[8px] uppercase font-bold text-indigo-500 block">Subdomain Address</span>
                <span className="text-slate-800 font-bold truncate block">
                  https://{workspaceName.toLowerCase().replace(/\s+/g, '-') || 'acme'}.guildorbit.com
                </span>
              </div>
            </div>

            <button
              onClick={() => completeStep(1)}
              className="mt-2 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white py-2 px-4 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1"
            >
              Continue to Boards
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-[10px]">2</span>
              Choose a Kanban template
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'software', label: 'Software Sprints', cols: ['To Do', 'In Progress', 'QA Review', 'Done'] },
                { id: 'marketing', label: 'Marketing Campaign', cols: ['Ideas', 'Content Draft', 'Live', 'Reporting'] },
                { id: 'design', label: 'Design Pipeline', cols: ['Backlog', 'Wireframes', 'Feedback', 'Ready'] },
                { id: 'general', label: 'Simple Task Board', cols: ['Pending', 'Working', 'Completed'] },
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`border rounded-xl p-2.5 text-left transition-all cursor-pointer ${
                    selectedTemplate === tmpl.id
                      ? 'border-indigo-500 bg-indigo-50/20 text-indigo-900 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-[10px] font-bold block">{tmpl.label}</span>
                  <div className="flex gap-1 mt-1.5">
                    {tmpl.cols.slice(0, 3).map((c, i) => (
                      <span key={i} className="text-[7px] bg-slate-100 border border-slate-200/50 px-1 py-0.5 rounded font-bold text-slate-500">
                        {c}
                      </span>
                    ))}
                    {tmpl.cols.length > 3 && <span className="text-[7px] text-slate-400 font-bold self-center">+1</span>}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => completeStep(2)}
              className="bg-indigo-600 hover:bg-indigo-700 transition-colors text-white py-2 px-4 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1"
            >
              Continue to Channels
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-[10px]">3</span>
              Configure departmental chat channels
            </h4>
            <form onSubmit={handleAddChannel} className="flex gap-2">
              <input
                type="text"
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                placeholder="e.g. marketing-sync"
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 flex-grow"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3 flex items-center justify-center cursor-pointer shadow-md shadow-indigo-600/10"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>

            <div className="bg-slate-50 border border-slate-200/50 p-2.5 rounded-xl flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto custom-scroll">
              {chatChannels.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 text-[9px] bg-white border border-slate-200 px-2 py-1 rounded-lg font-bold text-slate-600 shadow-sm">
                  #{c}
                  {c !== 'general' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteChannel(c)}
                      className="text-slate-400 hover:text-red-500 cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>

            <button
              onClick={() => completeStep(3)}
              className="bg-indigo-600 hover:bg-indigo-700 transition-colors text-white py-2 px-4 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1"
            >
              Continue to Approvals
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        );
      case 4:
        return (
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-[10px]">4</span>
              Create task approval routing rules
            </h4>
            <form onSubmit={handleAddRule} className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-extrabold uppercase text-slate-400">Trigger Column</label>
                <select
                  value={newRule.column}
                  onChange={(e) => setNewRule({ ...newRule, column: e.target.value })}
                  className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[10px] font-semibold focus:outline-none"
                >
                  <option value="QA Review">QA Review</option>
                  <option value="Done">Done</option>
                  <option value="Ready for Live">Ready for Live</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-extrabold uppercase text-slate-400">Required Sign-off</label>
                <select
                  value={newRule.approver}
                  onChange={(e) => setNewRule({ ...newRule, approver: e.target.value })}
                  className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[10px] font-semibold focus:outline-none"
                >
                  <option value="Sarah O'Connor">Sarah O'Connor</option>
                  <option value="David Kim">David Kim</option>
                  <option value="Aryan Pandey">Aryan Pandey</option>
                </select>
              </div>
              <button
                type="submit"
                className="col-span-2 bg-slate-900 text-white rounded-xl py-2 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Approval Rule
              </button>
            </form>

            <div className="flex flex-col gap-1.5 max-h-[110px] overflow-y-auto custom-scroll">
              {approvalRules.map((rule, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200/50 p-2 rounded-lg flex items-center justify-between text-[9px] font-semibold text-slate-600">
                  <span className="truncate">
                    Tasks entering <span className="font-bold text-slate-800">"{rule.column}"</span> require sign-off by <span className="font-bold text-slate-800">{rule.approver}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(idx)}
                    className="text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => completeStep(4)}
              className="bg-indigo-600 hover:bg-indigo-700 transition-colors text-white py-2 px-4 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1"
            >
              Continue to Team Invites
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        );
      case 5:
        return (
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-[10px]">5</span>
              Invite members & assign roles
            </h4>
            <form onSubmit={handleAddInvite} className="grid grid-cols-5 gap-2">
              <input
                type="email"
                required
                value={newInvite.email}
                onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                placeholder="developer@acme.com"
                className="col-span-3 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-semibold focus:outline-none focus:border-indigo-500"
              />
              <select
                value={newInvite.role}
                onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
                className="col-span-1 bg-white border border-slate-200 rounded-xl px-1 py-1.5 text-[9px] font-semibold focus:outline-none"
              >
                <option value="Developer">Developer</option>
                <option value="Designer">Designer</option>
                <option value="Marketer">Marketer</option>
                <option value="Manager">Manager</option>
              </select>
              <button
                type="submit"
                className="col-span-1 bg-indigo-600 text-white rounded-xl flex items-center justify-center cursor-pointer shadow-md shadow-indigo-600/10"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>

            <div className="flex flex-col gap-1.5 max-h-[110px] overflow-y-auto custom-scroll">
              {inviteEmails.map((invite) => (
                <div key={invite.email} className="bg-slate-50 border border-slate-200/50 p-2 rounded-lg flex items-center justify-between text-[9px] font-semibold text-slate-600">
                  <span className="truncate">{invite.email}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] bg-indigo-500/10 text-indigo-600 px-1.5 py-0.5 rounded font-extrabold uppercase">
                      {invite.role}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteInvite(invite.email)}
                      className="text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => completeStep(5)}
              className="bg-emerald-600 hover:bg-emerald-700 transition-colors text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 cursor-pointer flex items-center justify-center gap-1.5"
            >
              Finish Workspace Simulation
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pt-28 pb-20 px-6 min-h-screen grid-pattern bg-page relative">
      <div className="absolute top-[10%] left-[5%] w-[450px] h-[450px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[450px] h-[450px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <section className="max-w-4xl mx-auto text-center mb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50/80 border border-indigo-100/50 px-3 py-1.5 rounded-full mb-3 glass">
            Setup Guide
          </span>
          <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-extrabold text-slate-900 tracking-tight leading-none">
            Getting Started Onboarding
          </h1>
          <p className="mt-4 text-sm font-semibold text-slate-500 max-w-xl mx-auto leading-relaxed">
            Follow this step-by-step setup guide to initialize your team workspace, define board templates, establish chat channels, and invite your department colleagues.
          </p>
        </motion.div>
      </section>

      {/* Guide Content Layout */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative z-10">
        {/* Left Documentation Steps */}
        <div className="md:col-span-7 flex flex-col gap-6">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isCurrent = activeStep === step.id;
            const isCompleted = completedSteps.includes(step.id) || (activeStep > step.id);

            return (
              <div
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`bg-white/45 glass p-6 rounded-2xl border text-left cursor-pointer transition-all shadow-sm ${
                  isCurrent
                    ? 'border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20 bg-indigo-50/10'
                    : isCompleted
                    ? 'border-emerald-500/30 bg-emerald-50/5'
                    : 'border-slate-200/50 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-xs font-bold uppercase tracking-wider ${
                        isCurrent ? 'text-indigo-600' : isCompleted ? 'text-emerald-700' : 'text-slate-400'
                      }`}>
                        Phase 0{step.id}: {step.title}
                      </h3>
                      {isCompleted && (
                        <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100/50 px-2 py-0.5 rounded font-extrabold">
                          Configured
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-800 mt-1">{step.title} Instructions</p>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-1">
                      {step.description}
                    </p>
                    
                    {/* Expand Details if Active */}
                    {isCurrent && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 pt-4 border-t border-slate-150/40 text-[10px] text-slate-600 space-y-2.5 leading-relaxed font-semibold"
                      >
                        {step.id === 1 && (
                          <>
                            <p>To start, input your company's name. This defines the domain slug where members of your organization will connect.</p>
                            <p className="bg-slate-50 p-2 rounded-lg border border-slate-200/50 text-[9px] font-mono">
                              Subdomain: https://[workspace-slug].guildorbit.com
                            </p>
                          </>
                        )}
                        {step.id === 2 && (
                          <p>Boards let you isolate specific team departments. Select a template that pre-populates default columns, or start from scratch with custom stages.</p>
                        )}
                        {step.id === 3 && (
                          <p>Create chat rooms for coordination. The `#general` channel is added automatically. You can add topics like `#sprint-updates` or `#design-assets` for focused communication.</p>
                        )}
                        {step.id === 4 && (
                          <p>Automate approval sign-offs. Create a rule where moving a task to a designated column notifies the chosen supervisor and blocks progress until approved.</p>
                        )}
                        {step.id === 5 && (
                          <p>Invite your team members via email. Assign department tags (Developer, Designer, Marketer) to automatically grant access to relevant channels.</p>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Active Step Simulator Frame */}
        <div className="md:col-span-5 bg-white/45 glass rounded-3xl p-6 md:p-8 border border-slate-200/50 shadow-sm relative sticky top-28">
          <div className="absolute top-[10%] right-[10%] w-[150px] h-[150px] bg-indigo-500/5 blur-[40px] pointer-events-none rounded-full" />
          
          <div className="flex items-center justify-between border-b border-slate-150/60 pb-3 mb-5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Interactive Setup Simulator
            </span>
            <button
              onClick={resetSimulator}
              className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>

          <AnimatePresence mode="wait">
            {completedSteps.length < STEPS.length ? (
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
              >
                {renderSimulatorSection()}
              </motion.div>
            ) : (
              <motion.div
                key="completion"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 flex flex-col items-center gap-4"
              >
                <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Your Workspace configuration is Ready!</h3>
                
                <div className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl p-4 text-left text-[9px] font-semibold space-y-2.5 text-slate-600">
                  <p className="border-b border-slate-200/50 pb-1.5 flex justify-between">
                    <span>Workspace:</span>
                    <span className="font-bold text-slate-800">{workspaceName}.guildorbit.com</span>
                  </p>
                  <p className="border-b border-slate-200/50 pb-1.5 flex justify-between">
                    <span>Template:</span>
                    <span className="font-bold text-slate-800 capitalize">{selectedTemplate}</span>
                  </p>
                  <p className="border-b border-slate-200/50 pb-1.5 flex justify-between">
                    <span>Chat Channels:</span>
                    <span className="font-bold text-slate-800">{chatChannels.length} active</span>
                  </p>
                  <p className="border-b border-slate-200/50 pb-1.5 flex justify-between">
                    <span>Approval Rules:</span>
                    <span className="font-bold text-slate-800">{approvalRules.length} rule(s)</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Invited Members:</span>
                    <span className="font-bold text-slate-800">{inviteEmails.length} member(s)</span>
                  </p>
                </div>

                <a
                  href="/signup"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 transition-colors text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                >
                  Create Workspace Account
                  <Send className="h-4.5 w-4.5" />
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
