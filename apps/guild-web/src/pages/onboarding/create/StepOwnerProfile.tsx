import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, Copy, Check } from 'lucide-react';
import { StepHeader } from '../../../components/onboarding/StepHeader';
import { executeOwnerOnboardingCreate, checkUsernameUnique } from '../../../lib/firestore';
import { isValidUsername, isValidEmployeeId, isValidAge, isValidEmail, isValidPhoneNumber } from '../../../lib/validation';
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
  const [phoneNumber, setPhoneNumber] = React.useState('');
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
    if (!designation.trim()) errs.designation = 'Job title is required.';
    if (!isValidEmployeeId(employeeId)) errs.employeeId = 'Employee ID is required.';
    const ageNum = parseInt(age);
    if (!isValidAge(ageNum)) errs.age = 'Enter a valid age (16–100).';
    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) errs.phoneNumber = 'Enter a valid phone number.';
    if (!isValidUsername(username)) errs.username = 'Username: 3–20 chars, letters, numbers, underscores.';
    if (usernameAvailable === false) errs.username = 'This username is taken.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user || !data.orgName) return;

    setIsSubmitting(true);
    try {
      // 1. Create org and owner profile transactionally
      const { orgId } = await executeOwnerOnboardingCreate({
        uid: user.uid,
        email: user.email!,
        fullName: fullName.trim(),
        username: username.toLowerCase(),
        designation: designation.trim(),
        employeeId: employeeId.trim(),
        age: parseInt(age),
        phoneNumber: phoneNumber.trim(),
        orgName: data.orgName,
        orgIndustry: data.orgIndustry || 'Other',
        orgSize: data.orgSize || '1–10',
        domainAutoJoin: !!data.domainAutoJoin,
        emailDomain: data.emailDomain || '',
        inviteEmails: inviteEmails,
      });

      // Update local onboarding data with orgId
      updateData({ orgId });

      navigate('/onboarding/complete');
    } catch (err) {
      console.error('Failed to create workspace & profile:', err);
      setErrors({ submit: 'Failed to create workspace. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const usernameStatus = checkingUsername ? null : usernameAvailable === true ? true : usernameAvailable === false ? false : undefined;

  return (
    <div className="w-full max-w-[500px] px-4 flex flex-col items-center">
      <StepHeader
        step={3}
        totalSteps={4}
        title="Set Up Your Profile"
        subtitle="Create your profile to start using the workspace."
      />

      <div className="aether-glass w-full p-8 mt-8 shadow-xl border border-border-default/30">
        {inviteUrl && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <span className="text-xs font-bold text-primary block mb-1">Invite Link</span>
            <p className="text-[11px] text-muted-foreground mb-3 font-semibold">Share this link to let others join your workspace.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[10px] font-mono text-foreground bg-surface/80 dark:bg-black/40 rounded-lg px-3 py-2 truncate border border-border-default">
                {inviteUrl}
              </code>
              <button
                type="button"
                onClick={copyInviteLink}
                className="flex-shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border-default hover:bg-surface-hover bg-surface text-xs font-bold text-foreground transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                {copiedInvite ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : null}
                {copiedInvite ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="full-name" className="text-xs font-semibold text-muted-foreground pl-0.5">
                Full Name
              </label>
              <input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Arjun Mehta"
                required
                className="w-full h-10 rounded-xl border border-border-default bg-surface/50 dark:bg-white/5 px-3.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200"
              />
              {errors.fullName && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.fullName}</p>}
            </div>

            {/* Job Title / Role */}
            <div className="space-y-1.5">
              <label htmlFor="designation" className="text-xs font-semibold text-muted-foreground pl-0.5">
                Job Title
              </label>
              <input
                id="designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Director"
                required
                className="w-full h-10 rounded-xl border border-border-default bg-surface/50 dark:bg-white/5 px-3.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200"
              />
              {errors.designation && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.designation}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Employee ID */}
            <div className="space-y-1.5">
              <label htmlFor="employee-id" className="text-xs font-semibold text-muted-foreground pl-0.5">
                Employee ID
              </label>
              <input
                id="employee-id"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. EMP-001"
                required
                className="w-full h-10 rounded-xl border border-border-default bg-surface/50 dark:bg-white/5 px-3.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200"
              />
              {errors.employeeId && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.employeeId}</p>}
            </div>

            {/* Age */}
            <div className="space-y-1.5">
              <label htmlFor="age" className="text-xs font-semibold text-muted-foreground pl-0.5">
                Age
              </label>
              <input
                id="age"
                type="number"
                min={16}
                max={100}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 28"
                required
                className="w-full h-10 rounded-xl border border-border-default bg-surface/50 dark:bg-white/5 px-3.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200"
              />
              {errors.age && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.age}</p>}
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label htmlFor="phone-number" className="text-xs font-semibold text-muted-foreground pl-0.5">
              Phone Number (Optional)
            </label>
            <input
              id="phone-number"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +1 (555) 012-3456"
              className="w-full h-10 rounded-xl border border-border-default bg-surface/50 dark:bg-white/5 px-3.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200"
            />
            {errors.phoneNumber && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.phoneNumber}</p>}
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-xs font-semibold text-muted-foreground pl-0.5">
              Username
            </label>
            <div className="relative">
              <input
                id="username"
                value={username}
                onChange={(e) => { setUsername(e.target.value.toLowerCase()); setUsernameAvailable(null); }}
                placeholder="e.g. arjun"
                required
                className={`w-full h-10 rounded-xl border bg-surface/50 dark:bg-white/5 pl-3.5 pr-10 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200 ${
                  usernameStatus === true ? 'border-emerald-500/50' : usernameStatus === false ? 'border-destructive/50' : 'border-border-default'
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
            <label htmlFor="invite-emails" className="text-xs font-semibold text-muted-foreground pl-0.5">
              Invite Teammates (Optional, separate with commas)
            </label>
            <textarea
              id="invite-emails"
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              placeholder="colleague1@company.com, colleague2@company.com"
              className="w-full h-16 py-2 px-3.5 rounded-xl border border-border-default bg-surface/50 dark:bg-white/5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200 resize-none"
            />
          </div>

          {/* Theme Picker */}
          <div className="space-y-2.5 pt-1">
            <label className="text-xs font-semibold text-muted-foreground pl-0.5">
              Workspace Color Theme
            </label>
            <div className="flex flex-wrap gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  title={t.name}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer hover:bg-surface-hover ${
                    themeId === t.id ? 'border-primary bg-primary/10 shadow-sm' : 'border-border-default bg-surface/30'
                  }`}
                >
                  <div
                    className="h-3.5 w-3.5 rounded-full border border-border-default/80"
                    style={{ background: t.swatch }}
                  />
                  <span className="text-[10px] font-bold text-foreground">
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {errors.submit && <p className="text-xs text-destructive font-semibold text-center mt-2">{errors.submit}</p>}

          <button
            type="submit"
            disabled={isSubmitting || checkingUsername || usernameAvailable === false}
            className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-3"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              'Complete Setup'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
