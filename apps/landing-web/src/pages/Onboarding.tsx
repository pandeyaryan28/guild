import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Plus,
  Trash2,
  Users,
  Building2,
  Search,
  User,
  Star,
  ArrowRight,
  Sun,
  Moon,
  Send,
  Sparkles,
  Calendar,
  Phone,
  AtSign,
  Loader2,
  Check
} from 'lucide-react';
import { APP_URL } from '../config/landingData';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: any;
}

const CREATE_STEPS: Step[] = [
  {
    id: 1,
    title: 'Choose Path',
    description: 'Select between provisioning a new workspace or joining an existing team.',
    icon: Users,
  },
  {
    id: 2,
    title: 'Organization Setup',
    description: 'Configure organization name, subdomain slug, industry, and size.',
    icon: Building2,
  },
  {
    id: 3,
    title: 'Owner Profile',
    description: 'Set up your administrator profile, username, system theme, and invite team members.',
    icon: User,
  },
  {
    id: 4,
    title: 'Complete Setup',
    description: 'Finalize workspace seeding and step onto the operations deck.',
    icon: CheckCircle2,
  },
];

const JOIN_STEPS: Step[] = [
  {
    id: 1,
    title: 'Choose Path',
    description: 'Select between provisioning a new workspace or joining an existing team.',
    icon: Users,
  },
  {
    id: 2,
    title: 'Find Organization',
    description: 'Search for your active workspace using a subdomain slug or enter an invite token.',
    icon: Search,
  },
  {
    id: 3,
    title: 'Member Profile',
    description: 'Create your personal profile, username, designation, and set your interface theme.',
    icon: User,
  },
  {
    id: 4,
    title: 'Complete Setup',
    description: 'Link your credentials to the organization and enter the operations deck.',
    icon: CheckCircle2,
  },
];

export function Onboarding() {
  const [path, setPath] = useState<'create' | 'join' | null>(null);
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Simulation State - Create Path
  const [orgName, setOrgName] = useState('Acme Corp');
  const [orgSlug, setOrgSlug] = useState('acme');
  const [orgIndustry, setOrgIndustry] = useState('Technology');
  const [orgSize, setOrgSize] = useState('11–50');

  // Simulation State - Join Path
  const [joinMethod, setJoinMethod] = useState<'slug' | 'invite'>('slug');
  const [slugInput, setSlugInput] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [searchSuccess, setSearchSuccess] = useState<boolean | null>(null);
  const [foundOrgName, setFoundOrgName] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Simulation State - Profile (Both)
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [designation, setDesignation] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [age, setAge] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [themePreference, setThemePreference] = useState<'light' | 'dark'>('dark');
  const [inviteEmails, setInviteEmails] = useState<string[]>(['alex@acme.com', 'developer@acme.com']);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [isUsernameChecking, setIsUsernameChecking] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

  const steps = path === 'join' ? JOIN_STEPS : CREATE_STEPS;

  const completeStep = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
    if (stepId < steps.length) {
      setActiveStep(stepId + 1);
    }
  };

  const resetSimulator = () => {
    setPath(null);
    setActiveStep(1);
    setCompletedSteps([]);
    setOrgName('Acme Corp');
    setOrgSlug('acme');
    setOrgIndustry('Technology');
    setOrgSize('11–50');
    setJoinMethod('slug');
    setSlugInput('');
    setInviteInput('');
    setSearchSuccess(null);
    setFoundOrgName(null);
    setFullName('');
    setUsername('');
    setDesignation('');
    setEmployeeId('');
    setAge('');
    setPhoneNumber('');
    setThemePreference('dark');
    setInviteEmails(['alex@acme.com', 'developer@acme.com']);
    setNewInviteEmail('');
    setIsUsernameAvailable(null);
  };

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    if (!val.trim()) {
      setIsUsernameAvailable(null);
      return;
    }
    setIsUsernameChecking(true);
    // Simulate API call
    const timer = setTimeout(() => {
      setIsUsernameChecking(false);
      setIsUsernameAvailable(val.length > 2 && !val.includes('taken') && val !== 'admin');
    }, 400);
    return () => clearTimeout(timer);
  };

  const renderSimulatorSection = () => {
    switch (activeStep) {
      case 1:
        return (
          <div className="flex flex-col gap-4 animate-fade-in">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-[10px]">1</span>
              Choose Onboarding Path
            </h4>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setPath('create');
                  completeStep(1);
                }}
                className="group border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/10 rounded-2xl p-4 text-left transition-all cursor-pointer bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 group-hover:scale-105 transition-transform duration-300">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                      Create Space
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </h5>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-normal">
                      Provision a new operation hub for your company or department.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPath('join');
                  completeStep(1);
                }}
                className="group border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/10 rounded-2xl p-4 text-left transition-all cursor-pointer bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 group-hover:scale-105 transition-transform duration-300">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                      Join Team
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </h5>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-normal">
                      Step into an active workspace using an invite token or subdomain.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        );
      case 2:
        if (path === 'create') {
          return (
            <div className="flex flex-col gap-3.5 animate-fade-in">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-[10px]">2</span>
                Enter Organization Details
              </h4>
              
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">Organization Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => {
                      setOrgName(e.target.value);
                      setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">Subdomain Slug</label>
                  <input
                    type="text"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[8px] font-bold text-slate-400 block mt-0.5">
                    Preview: https://{orgSlug || 'acme'}.guildhq.space
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold uppercase text-slate-400">Industry</label>
                    <select
                      value={orgIndustry}
                      onChange={(e) => setOrgIndustry(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="Technology">Technology</option>
                      <option value="Logistics & Supply">Logistics</option>
                      <option value="Marketing & Creative">Creative Agency</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Consulting">Consulting</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold uppercase text-slate-400">Company Size</label>
                    <select
                      value={orgSize}
                      onChange={(e) => setOrgSize(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="1–10">1–10 members</option>
                      <option value="11–50">11–50 members</option>
                      <option value="51–200">51–200 members</option>
                      <option value="201–500">201–500 members</option>
                      <option value="500+">500+ members</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => completeStep(2)}
                className="mt-1 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white py-2 px-4 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1"
              >
                Continue to Owner Profile
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          );
        } else {
          // Join Path
          return (
            <div className="flex flex-col gap-3.5 animate-fade-in">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-[10px]">2</span>
                Find Your Organization
              </h4>

              <div className="flex gap-1 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/40">
                <button
                  type="button"
                  onClick={() => {
                    setJoinMethod('slug');
                    setSearchSuccess(null);
                    setFoundOrgName(null);
                  }}
                  className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    joinMethod === 'slug' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  By Subdomain
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setJoinMethod('invite');
                    setSearchSuccess(null);
                    setFoundOrgName(null);
                  }}
                  className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    joinMethod === 'invite' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  By Invite Token
                </button>
              </div>

              {joinMethod === 'slug' ? (
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">Workspace Subdomain Slug</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. acme"
                      value={slugInput}
                      onChange={(e) => setSlugInput(e.target.value.toLowerCase())}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 flex-grow"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!slugInput.trim()) return;
                        setIsSearching(true);
                        setTimeout(() => {
                          setIsSearching(false);
                          setSearchSuccess(true);
                          setFoundOrgName(slugInput.toUpperCase() + ' Corp');
                        }, 600);
                      }}
                      className="bg-slate-900 text-white rounded-xl px-3.5 text-xs font-bold hover:bg-slate-800 cursor-pointer flex items-center justify-center"
                    >
                      Search
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">Invitation Link or Token</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. guild-tkn-8f9d..."
                      value={inviteInput}
                      onChange={(e) => setInviteInput(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 flex-grow"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!inviteInput.trim()) return;
                        setIsSearching(true);
                        setTimeout(() => {
                          setIsSearching(false);
                          setSearchSuccess(true);
                          setFoundOrgName('Acme Corp');
                        }, 600);
                      }}
                      className="bg-slate-900 text-white rounded-xl px-3.5 text-xs font-bold hover:bg-slate-800 cursor-pointer flex items-center justify-center"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}

              {isSearching && (
                <div className="py-2 text-[10px] text-slate-500 font-semibold flex items-center gap-1.5 justify-center">
                  <span className="h-3 w-3 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                  Querying database index...
                </div>
              )}

              {searchSuccess && foundOrgName && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-[10px] text-emerald-800 font-semibold animate-fade-in">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Found: <strong className="font-extrabold">{foundOrgName}</strong>
                  </span>
                  <span className="text-[8px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase">Verified</span>
                </div>
              )}

              <button
                type="button"
                disabled={!searchSuccess}
                onClick={() => completeStep(2)}
                className={`mt-1 py-2 px-4 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1 transition-all ${
                  searchSuccess
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                Continue to Member Profile
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          );
        }
      case 3:
        return (
          <div className="flex flex-col gap-3.5 animate-fade-in max-h-[380px] overflow-y-auto pr-1.5 custom-scroll">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-5 w-5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-[10px]">3</span>
              Set Up Your Profile
            </h4>
            
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-extrabold uppercase text-slate-400">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Sarah Jenkins"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-extrabold uppercase text-slate-400">Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="sarah_j"
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl pl-2.5 pr-6 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 w-full"
                    />
                    {isUsernameChecking && (
                      <span className="absolute right-2.5 top-2.5 h-3.5 w-3.5 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                    )}
                    {!isUsernameChecking && isUsernameAvailable === true && (
                      <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-emerald-500" />
                    )}
                    {!isUsernameChecking && isUsernameAvailable === false && (
                      <span className="absolute right-2 top-2 text-red-500 text-[10px] font-bold">Taken</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-extrabold uppercase text-slate-400">Designation</label>
                  <input
                    type="text"
                    placeholder="Operations Lead"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-extrabold uppercase text-slate-400">Employee ID</label>
                  <input
                    type="text"
                    placeholder="EMP-492"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-extrabold uppercase text-slate-400">Age</label>
                  <input
                    type="number"
                    placeholder="28"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-extrabold uppercase text-slate-400">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Interface Theme Selection */}
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-extrabold uppercase text-slate-400">Interface Theme</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setThemePreference('light')}
                    className={`flex-1 flex items-center justify-center gap-1.5 border rounded-xl py-1.5 text-[10px] font-bold cursor-pointer transition-all ${
                      themePreference === 'light'
                        ? 'border-indigo-500 bg-indigo-50/10 text-indigo-700 font-extrabold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    Light Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemePreference('dark')}
                    className={`flex-1 flex items-center justify-center gap-1.5 border rounded-xl py-1.5 text-[10px] font-bold cursor-pointer transition-all ${
                      themePreference === 'dark'
                        ? 'border-indigo-500 bg-indigo-50/10 text-indigo-700 font-extrabold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    Dark Mode
                  </button>
                </div>
              </div>

              {/* Invitations section for Create Path */}
              {path === 'create' && (
                <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-2.5 mt-1">
                  <label className="text-[8px] font-extrabold uppercase text-slate-400">Invite Team Members (Optional)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="email"
                      placeholder="teammate@company.com"
                      value={newInviteEmail}
                      onChange={(e) => setNewInviteEmail(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[10px] font-semibold focus:outline-none w-full"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newInviteEmail && !inviteEmails.includes(newInviteEmail)) {
                          setInviteEmails([...inviteEmails, newInviteEmail]);
                          setNewInviteEmail('');
                        }
                      }}
                      className="bg-slate-900 text-white rounded-xl px-2.5 text-xs font-bold hover:bg-slate-800 cursor-pointer flex items-center justify-center"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1 max-h-[60px] overflow-y-auto">
                    {inviteEmails.map((email) => (
                      <span key={email} className="inline-flex items-center gap-1 text-[8px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-600">
                        {email}
                        <button
                          type="button"
                          onClick={() => setInviteEmails(inviteEmails.filter((e) => e !== email))}
                          className="text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!fullName.trim() || !username.trim() || isUsernameAvailable === false}
              onClick={() => completeStep(3)}
              className={`mt-1.5 py-2.5 px-4 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1 transition-all ${
                fullName.trim() && username.trim() && isUsernameAvailable !== false
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              Continue to Completion
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pt-28 pb-20 px-6 min-h-screen grid-pattern bg-page relative">
      <div className="absolute top-[10%] left-[5%] w-[450px] h-[450px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none animate-drift" />
      <div className="absolute bottom-[10%] right-[5%] w-[450px] h-[450px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none animate-drift-reverse" />

      {/* Header */}
      <section className="max-w-4xl mx-auto text-center mb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-extrabold text-slate-900 tracking-tight leading-none">
            Getting Started Onboarding
          </h1>
          <p className="mt-4 text-sm font-semibold text-slate-500 max-w-xl mx-auto leading-relaxed">
            Follow this interactive onboarding guide to understand how workspaces are created or joined, how profiles are initialized, and how settings propagate.
          </p>
        </motion.div>
      </section>

      {/* Guide Content Layout */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative z-10">
        {/* Left Documentation Steps */}
        <div className="md:col-span-7 flex flex-col gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            const isCurrent = activeStep === step.id;
            const isCompleted = completedSteps.includes(step.id) || (activeStep > step.id);

            return (
              <div
                key={step.id}
                onClick={() => {
                  if (step.id <= completedSteps.length + 1) {
                    setActiveStep(step.id);
                  }
                }}
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
                          <p>
                            Choose between provisioning a brand new organization workspace (Create Space) or joining an existing organization via a shared domain slug or unique access token (Join Team).
                          </p>
                        )}
                        {step.id === 2 && (
                          path === 'create' ? (
                            <>
                              <p>Fill in your Organization's Name. We will generate a unique subdomain slug that maps directly to your workspace database directory.</p>
                              <p className="bg-slate-50 p-2 rounded-lg border border-slate-200/50 text-[9px] font-mono">
                                Subdomain: https://{orgSlug || 'acme'}.guildhq.space
                              </p>
                            </>
                          ) : (
                            <p>
                              Enter the organization subdomain name or paste a verified email invite token. The system checks database records in real-time to find and securely link your account.
                            </p>
                          )
                        )}
                        {step.id === 3 && (
                          path === 'create' ? (
                            <p>
                              Configure your Owner Profile. Set your full name, unique system username, designation, and default interface theme (Light or Dark). You can also seed email invitations to dispatch signup tokens to your team.
                            </p>
                          ) : (
                            <p>
                              Create your Member Profile. Set up your username, employee ID, age, and phone credentials. Toggle between light and dark modes to select your client interface theme.
                            </p>
                          )
                        )}
                        {step.id === 4 && (
                          <p>
                            Review the generated settings and finalize account provisioning. Once submitted, database seeds generate the workspace, register the user schema, and open the console deck.
                          </p>
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
            {completedSteps.length < steps.length ? (
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
                className="text-center py-6 flex flex-col items-center gap-4 animate-fade-in"
              >
                {/* Dynamic Ambient Orbit Ceremony */}
                <div className="flex items-center justify-center relative h-24 w-24">
                  <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-xl animate-pulse" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border border-dashed border-indigo-500/20 p-2"
                  />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/10 to-indigo-500/25 border border-indigo-500/40 shadow-xl backdrop-blur-md">
                    <CheckCircle2 className="h-8 w-8 text-indigo-600" />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1">
                  Setup Complete!
                  <Sparkles className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed max-w-xs mx-auto">
                  Your Guild workspace credentials have been mapped. Let's step into the operations deck.
                </p>
                
                <div className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl p-4 text-left text-[9px] font-semibold space-y-2 text-slate-600">
                  <p className="border-b border-slate-200/50 pb-1.5 flex justify-between">
                    <span>Path:</span>
                    <span className="font-bold text-slate-800 uppercase tracking-wider">{path === 'create' ? 'Create Space' : 'Join Team'}</span>
                  </p>
                  <p className="border-b border-slate-200/50 pb-1.5 flex justify-between">
                    <span>Workspace Name:</span>
                    <span className="font-bold text-slate-800">{path === 'create' ? orgName : foundOrgName}</span>
                  </p>
                  {path === 'create' && (
                    <p className="border-b border-slate-200/50 pb-1.5 flex justify-between">
                      <span>Subdomain:</span>
                      <span className="font-bold text-indigo-600 font-mono">https://{orgSlug}.guildhq.space</span>
                    </p>
                  )}
                  <p className="border-b border-slate-200/50 pb-1.5 flex justify-between">
                    <span>Profile Name:</span>
                    <span className="font-bold text-slate-800">{fullName}</span>
                  </p>
                  <p className="border-b border-slate-200/50 pb-1.5 flex justify-between">
                    <span>Username:</span>
                    <span className="font-bold text-slate-850">@{username}</span>
                  </p>
                  <p className="border-b border-slate-200/50 pb-1.5 flex justify-between">
                    <span>Designation:</span>
                    <span className="font-bold text-slate-800">{designation || 'None'}</span>
                  </p>
                  <p className="border-b border-slate-200/50 pb-1.5 flex justify-between">
                    <span>Age / Emp ID:</span>
                    <span className="font-bold text-slate-800">{age} yrs / {employeeId || 'N/A'}</span>
                  </p>
                  <p className="border-b border-slate-200/50 pb-1.5 flex justify-between">
                    <span>Interface Theme:</span>
                    <span className="font-bold text-slate-800 capitalize flex items-center gap-1">
                      {themePreference === 'dark' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3 text-amber-500" />}
                      {themePreference} Mode
                    </span>
                  </p>
                  {path === 'create' && (
                    <p className="flex justify-between">
                      <span>Colleagues Invited:</span>
                      <span className="font-bold text-slate-800">{inviteEmails.length} member(s)</span>
                    </p>
                  )}
                </div>

                <a
                  href={`${APP_URL}/signup`}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 transition-colors text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                >
                  Enter Workspace Command
                  <Send className="h-4 w-4" />
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
