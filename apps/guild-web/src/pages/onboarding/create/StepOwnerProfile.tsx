import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, Briefcase, Hash, Calendar, AtSign, Loader2, CheckCircle2, XCircle, ChevronRight, Copy, Check, Link, Sparkles, UserPlus } from 'lucide-react';
import { StepHeader } from '../../../components/onboarding/StepHeader';
import { createUser, addOrgMember, setOnboardingState, checkUsernameUnique, createPendingEmailInvite } from '../../../lib/firestore';
import { isValidUsername, isValidEmployeeId, isValidAge, isValidEmail } from '../../../lib/validation';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import type { OnboardingData } from '../OnboardingRoot';

interface Props {
  data: OnboardingData;
  updateData: (patch: Partial<OnboardingData>) => void;
}

export function StepOwnerProfile({ data, updateData }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeId, setTheme, themes } = useTheme();

  const [fullName, setFullName] = React.useState('');
  const [designation, setDesignation] = React.useState('');
  const [employeeId, setEmployeeId] = React.useState('');
  const [age, setAge] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [inviteEmails, setInviteEmails] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [usernameAvailable, setUsernameAvailable] = React.useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [copiedInvite, setCopiedInvite] = React.useState(false);

  // Invite link for display after org creation
  const inviteUrl = data.inviteToken
    ? `${window.location.origin}/join/${data.inviteToken}`
    : null;

  const copyInviteLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

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
    if (!validate() || !user || !data.orgId) return;

    setIsSubmitting(true);
    try {
      // 1. Create user profile
      await createUser(user.uid, {
        email: user.email!,
        fullName: fullName.trim(),
        username: username.toLowerCase(),
        designation: designation.trim(),
        employeeId: employeeId.trim(),
        age: parseInt(age),
        organizationId: data.orgId,
        role: 'owner',
      });

      // 2. Add to org members
      await addOrgMember(data.orgId, user.uid, 'owner');

      // 3. Process direct email invitations if specified
      if (inviteEmails.trim()) {
        const emailList = inviteEmails
          .split(',')
          .map((email) => email.trim().toLowerCase())
          .filter((email) => isValidEmail(email));
        
        const invitePromises = emailList.map((email) => 
          createPendingEmailInvite(email, data.orgId!, 'member', user.uid)
        );
        await Promise.all(invitePromises);
      }

      // 4. Update onboarding state
      await setOnboardingState(user.uid, { step: 3, path: 'create' });

      navigate('/onboarding/complete');
    } catch {
      setErrors({ submit: 'Failed to save profile. Please try again.' });
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
        title="Owner Profile Setup"
        subtitle="Set up your profile and configure your team's workspace details."
      />

      <div className="aether-glass w-full p-8 mt-8 shadow-2xl relative overflow-hidden border border-border-default/30">
        <div className="absolute inset-0 bg-dashboard-grid opacity-20 pointer-events-none" />

        {/* Global Invite link section */}
        {inviteUrl && (
          <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4.5 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Link className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Permanent Invite Link</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 font-medium">Teammates can instantly join your workspace using this link.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[10px] font-mono text-foreground bg-surface/80 dark:bg-black/40 rounded-xl px-3 py-2 truncate border border-border-default/60">
                {inviteUrl}
              </code>
              <button
                type="button"
                onClick={copyInviteLink}
                className="flex-shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border-default hover:bg-surface-hover bg-surface text-xs font-bold text-foreground transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                {copiedInvite ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-foreground" />}
                {copiedInvite ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div className="grid grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Full Name
              </label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Arjun Mehta"
                  required
                  className="w-full h-10 rounded-xl border border-border-default/60 bg-surface/50 dark:bg-white/5 pl-10 pr-4 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200"
                />
              </div>
              {errors.fullName && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.fullName}</p>}
            </div>

            {/* Designation */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Designation
              </label>
              <div className="relative group">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="CEO & Founder"
                  required
                  className="w-full h-10 rounded-xl border border-border-default/60 bg-surface/50 dark:bg-white/5 pl-10 pr-4 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200"
                />
              </div>
              {errors.designation && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.designation}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Employee ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Employee ID
              </label>
              <div className="relative group">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="EMP-001"
                  required
                  className="w-full h-10 rounded-xl border border-border-default/60 bg-surface/50 dark:bg-white/5 pl-10 pr-4 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200"
                />
              </div>
              {errors.employeeId && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.employeeId}</p>}
            </div>

            {/* Age */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Age
              </label>
              <div className="relative group">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                  type="number"
                  min={16}
                  max={100}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="28"
                  required
                  className="w-full h-10 rounded-xl border border-border-default/60 bg-surface/50 dark:bg-white/5 pl-10 pr-4 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200"
                />
              </div>
              {errors.age && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.age}</p>}
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between pl-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Unique Handle
              </label>
              <span className="text-[9px] font-semibold text-muted-foreground">Username for mentions</span>
            </div>
            <div className="relative group">
              <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                value={username}
                onChange={(e) => { setUsername(e.target.value.toLowerCase()); setUsernameAvailable(null); }}
                placeholder="arjun_mehta"
                required
                className={`w-full h-10 rounded-xl border bg-surface/50 dark:bg-white/5 pl-10 pr-10 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200 ${
                  usernameStatus === true ? 'border-emerald-500/50' : usernameStatus === false ? 'border-destructive/50' : 'border-border-default/60'
                }`}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {checkingUsername && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                {!checkingUsername && usernameStatus === true && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                {!checkingUsername && usernameStatus === false && <XCircle className="h-3.5 w-3.5 text-destructive" />}
              </div>
            </div>
            {errors.username && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.username}</p>}
          </div>

          {/* Direct Email Invitations */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between pl-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-primary" />
                Invite Teammates (Optional)
              </label>
              <span className="text-[9px] font-semibold text-muted-foreground">Separate with commas</span>
            </div>
            <textarea
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              placeholder="colleague1@company.com, colleague2@company.com"
              className="w-full h-16 py-2 px-3.5 rounded-xl border border-border-default/60 bg-surface/50 dark:bg-white/5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200 resize-none aether-scroll"
            />
          </div>

          {/* Premium Theme Picker */}
          <div className="space-y-3 pt-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Workspace Cosmic Theme
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all duration-200 active:scale-95 cursor-pointer hover:bg-surface-hover ${
                    themeId === t.id ? 'border-primary bg-primary/10 shadow-sm' : 'border-border-default bg-surface/30'
                  }`}
                >
                  <div
                    className="h-6 w-6 rounded-full border border-border-default/80 flex-shrink-0 shadow-inner"
                    style={{ background: t.swatch }}
                  />
                  <span className="text-[8px] font-bold text-foreground truncate max-w-full text-center">
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
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-3"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <>
                Finalize & Build Space
                <ChevronRight className="h-4 w-4 text-white" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
