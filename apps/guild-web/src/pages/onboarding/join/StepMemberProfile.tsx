import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, Briefcase, Hash, Calendar, AtSign, Loader2, CheckCircle2, XCircle, ChevronRight, Sparkles } from 'lucide-react';
import { StepHeader } from '../../../components/onboarding/StepHeader';
import { executeMemberOnboardingJoin, getInviteLinkByToken, checkUsernameUnique } from '../../../lib/firestore';
import { isValidUsername, isValidEmployeeId, isValidAge } from '../../../lib/validation';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import type { OnboardingData } from '../OnboardingRoot';

interface Props {
  data: OnboardingData;
  updateData: (patch: Partial<OnboardingData>) => void;
}

export function StepMemberProfile({ data, updateData }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeId, setTheme, themes } = useTheme();

  const [fullName, setFullName] = React.useState('');
  const [designation, setDesignation] = React.useState('');
  const [employeeId, setEmployeeId] = React.useState('');
  const [age, setAge] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [usernameAvailable, setUsernameAvailable] = React.useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Debounced username check
  React.useEffect(() => {
    if (!username || !isValidUsername(username)) {
      setUsernameAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const available = await checkUsernameUnique(username);
        setUsernameAvailable(available);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    if (!designation.trim()) errs.designation = 'Designation is required.';
    if (!isValidEmployeeId(employeeId)) errs.employeeId = 'Employee ID is required.';
    const ageNum = parseInt(age);
    if (!isValidAge(ageNum)) errs.age = 'Enter a valid age (16–100).';
    if (!isValidUsername(username)) errs.username = 'Username: 3–20 chars, letters, numbers, underscores.';
    if (usernameAvailable === false) errs.username = 'This username is taken.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user || !data.joinOrgId) return;

    setIsSubmitting(true);
    try {
      // 1. Check if it's a global token
      let isGlobal = false;
      if (data.inviteToken) {
        const invite = await getInviteLinkByToken(data.inviteToken);
        if (invite) {
          isGlobal = !!invite.isGlobal;
        }
      }

      // 2. Perform the transactional joining procedure
      await executeMemberOnboardingJoin({
        uid: user.uid,
        email: user.email!,
        fullName: fullName.trim(),
        username: username.toLowerCase(),
        designation: designation.trim(),
        employeeId: employeeId.trim(),
        age: parseInt(age),
        orgId: data.joinOrgId,
        role: (data.inviteRole as any) || 'member',
        token: data.inviteToken,
        isGlobal,
      });

      navigate('/onboarding/complete');
    } catch {
      setErrors({ submit: 'Failed to complete profile registration. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const usernameStatus = checkingUsername ? null : usernameAvailable === true ? true : usernameAvailable === false ? false : undefined;

  return (
    <div className="w-full max-w-[540px] px-4 flex flex-col items-center">
      <StepHeader
        step={3}
        totalSteps={4}
        title="Member Profile Setup"
        subtitle={`Set up your workspace handle and enter ${data.joinOrgName || 'the organization'}.`}
      />

      <div className="aether-glass w-full p-8 mt-8 shadow-2xl relative overflow-hidden border border-white/10">
        <div className="absolute inset-0 bg-dashboard-grid opacity-20 pointer-events-none" />

        {/* Dynamic Org indicator badge */}
        {data.joinOrgName && (
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-4 py-1.5 text-xs font-bold text-indigo-400 mb-6 relative z-10 select-none">
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            Joining Workspace: {data.joinOrgName}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div className="grid grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                Full Name
              </label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted transition-colors group-focus-within:text-indigo-400" />
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="w-full h-10 rounded-xl border border-white/5 bg-white/5 pl-10 pr-4 text-xs font-semibold text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 focus:bg-white/10 transition-all duration-200"
                />
              </div>
              {errors.fullName && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.fullName}</p>}
            </div>

            {/* Designation */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                Designation
              </label>
              <div className="relative group">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted transition-colors group-focus-within:text-indigo-400" />
                <input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Software Engineer"
                  required
                  className="w-full h-10 rounded-xl border border-white/5 bg-white/5 pl-10 pr-4 text-xs font-semibold text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 focus:bg-white/10 transition-all duration-200"
                />
              </div>
              {errors.designation && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.designation}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Employee ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                Employee ID
              </label>
              <div className="relative group">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted transition-colors group-focus-within:text-indigo-400" />
                <input
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="EMP-052"
                  required
                  className="w-full h-10 rounded-xl border border-white/5 bg-white/5 pl-10 pr-4 text-xs font-semibold text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 focus:bg-white/10 transition-all duration-200"
                />
              </div>
              {errors.employeeId && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.employeeId}</p>}
            </div>

            {/* Age */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                Age
              </label>
              <div className="relative group">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted transition-colors group-focus-within:text-indigo-400" />
                <input
                  type="number"
                  min={16}
                  max={100}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="24"
                  required
                  className="w-full h-10 rounded-xl border border-white/5 bg-white/5 pl-10 pr-4 text-xs font-semibold text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 focus:bg-white/10 transition-all duration-200"
                />
              </div>
              {errors.age && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.age}</p>}
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between pl-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                Unique Handle
              </label>
              <span className="text-[9px] font-semibold text-text-muted">Username for mentions</span>
            </div>
            <div className="relative group">
              <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted transition-colors group-focus-within:text-indigo-400" />
              <input
                value={username}
                onChange={(e) => { setUsername(e.target.value.toLowerCase()); setUsernameAvailable(null); }}
                placeholder="your_handle"
                required
                className={`w-full h-10 rounded-xl border bg-white/5 pl-10 pr-10 text-xs font-semibold text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 focus:bg-white/10 transition-all duration-200 ${
                  usernameStatus === true ? 'border-emerald-500/50' : usernameStatus === false ? 'border-destructive/50' : 'border-white/5'
                }`}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {checkingUsername && <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />}
                {!checkingUsername && usernameStatus === true && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                {!checkingUsername && usernameStatus === false && <XCircle className="h-3.5 w-3.5 text-destructive" />}
              </div>
            </div>
            {errors.username && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.username}</p>}
          </div>

          {/* Premium Theme Picker */}
          <div className="space-y-3 pt-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Workspace Cosmic Theme
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all duration-200 active:scale-95 cursor-pointer hover:bg-white/5 ${
                    themeId === t.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-transparent'
                  }`}
                >
                  <div
                    className="h-6 w-6 rounded-full border border-white/10 flex-shrink-0"
                    style={{ background: t.swatch }}
                  />
                  <span className="text-[8px] font-bold text-white truncate max-w-full text-center">
                    {t.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {errors.submit && <p className="text-xs text-destructive font-semibold text-center mt-2">{errors.submit}</p>}

          <button
            type="submit"
            disabled={isSubmitting || checkingUsername || usernameAvailable === false}
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-3"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <>
                Finalize Profile Setup
                <ChevronRight className="h-4 w-4 text-white" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
