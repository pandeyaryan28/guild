import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Loader2, CheckCircle2, XCircle, Copy, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { StepHeader } from '../../../components/onboarding/StepHeader';
import { executeOwnerOnboardingCreate, checkUsernameUnique } from '../../../lib/firestore';
import { isValidUsername, isValidEmployeeId, isValidAge, isValidPhoneNumber } from '../../../lib/validation';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import type { OnboardingData } from '../../../types/onboarding';

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
      const storedToken = data.inviteToken || localStorage.getItem('guild_invite_token') || sessionStorage.getItem('guild_invite_token') || undefined;
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
        inviteToken: storedToken,
      });

      localStorage.removeItem('guild_invite_token');
      sessionStorage.removeItem('guild_invite_token');

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
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className="w-full max-w-[520px] px-4 flex flex-col items-center"
    >
      <StepHeader
        step={3}
        totalSteps={4}
        title="Owner Profile"
        subtitle="Set up your identity and preferences as the workspace owner"
      />

      <div className="w-full p-8 mt-8 rounded-3xl bg-surface/90 dark:bg-card/75 backdrop-blur-2xl border border-border dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
        {inviteUrl && (
          <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <span className="text-xs font-semibold text-primary block mb-0.5">Workspace Invite Link</span>
            <p className="text-xs text-muted-foreground mb-3 font-medium">Share this link with your team once setup is complete.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-foreground bg-secondary/80 rounded-xl px-3 py-2 truncate border border-border">
                {inviteUrl}
              </code>
              <button
                type="button"
                onClick={copyInviteLink}
                className="shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-surface hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer active:scale-[0.98] shadow-xs"
              >
                {copiedInvite ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedInvite ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="full-name" className="text-xs font-semibold text-foreground/80 pl-1">
                Full Name
              </label>
              <input
                id="full-name"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: '' })); }}
                placeholder="e.g. Alex Miller"
                required
                className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] px-4 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200"
              />
              {errors.fullName && <p className="text-xs text-destructive font-medium pl-1">{errors.fullName}</p>}
            </div>

            {/* Job Title / Role */}
            <div className="space-y-1.5">
              <label htmlFor="designation" className="text-xs font-semibold text-foreground/80 pl-1">
                Job Title
              </label>
              <input
                id="designation"
                value={designation}
                onChange={(e) => { setDesignation(e.target.value); setErrors(p => ({ ...p, designation: '' })); }}
                placeholder="e.g. Founder & CEO"
                required
                className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] px-4 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200"
              />
              {errors.designation && <p className="text-xs text-destructive font-medium pl-1">{errors.designation}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Employee ID */}
            <div className="space-y-1.5">
              <label htmlFor="employee-id" className="text-xs font-semibold text-foreground/80 pl-1">
                Employee ID
              </label>
              <input
                id="employee-id"
                value={employeeId}
                onChange={(e) => { setEmployeeId(e.target.value); setErrors(p => ({ ...p, employeeId: '' })); }}
                placeholder="e.g. EMP-001"
                required
                className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] px-4 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200"
              />
              {errors.employeeId && <p className="text-xs text-destructive font-medium pl-1">{errors.employeeId}</p>}
            </div>

            {/* Age */}
            <div className="space-y-1.5">
              <label htmlFor="age" className="text-xs font-semibold text-foreground/80 pl-1">
                Age
              </label>
              <input
                id="age"
                type="number"
                min={16}
                max={100}
                value={age}
                onChange={(e) => { setAge(e.target.value); setErrors(p => ({ ...p, age: '' })); }}
                placeholder="e.g. 29"
                required
                className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] px-4 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200"
              />
              {errors.age && <p className="text-xs text-destructive font-medium pl-1">{errors.age}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone Number */}
            <div className="space-y-1.5">
              <label htmlFor="phone-number" className="text-xs font-semibold text-foreground/80 pl-1">
                Phone Number (Optional)
              </label>
              <input
                id="phone-number"
                type="tel"
                value={phoneNumber}
                onChange={(e) => { setPhoneNumber(e.target.value); setErrors(p => ({ ...p, phoneNumber: '' })); }}
                placeholder="e.g. +1 (555) 012-3456"
                className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] px-4 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200"
              />
              {errors.phoneNumber && <p className="text-xs text-destructive font-medium pl-1">{errors.phoneNumber}</p>}
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-semibold text-foreground/80 pl-1">
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value.toLowerCase()); setUsernameAvailable(null); }}
                  placeholder="e.g. alex"
                  required
                  className={`w-full h-11 rounded-2xl border bg-secondary/50 dark:bg-white/[0.04] pl-4 pr-11 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200 ${
                    usernameStatus === true ? 'border-emerald-500/50' : usernameStatus === false ? 'border-destructive/50' : 'border-border'
                  }`}
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  {checkingUsername && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {!checkingUsername && usernameStatus === true && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {!checkingUsername && usernameStatus === false && <XCircle className="h-4 w-4 text-destructive" />}
                </div>
              </div>
              {errors.username && <p className="text-xs text-destructive font-medium pl-1">{errors.username}</p>}
            </div>
          </div>

          {/* Direct Email Invitations */}
          <div className="space-y-1.5">
            <label htmlFor="invite-emails" className="text-xs font-semibold text-foreground/80 pl-1">
              Invite Teammates (Optional)
            </label>
            <textarea
              id="invite-emails"
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              placeholder="sarah@company.com, david@company.com"
              className="w-full h-18 py-2.5 px-4 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200 resize-none"
            />
          </div>

          {/* Theme Picker */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-foreground/80 pl-1">
              Workspace Accent Theme
            </label>
            <div className="flex flex-wrap gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  title={t.name}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                    themeId === t.id
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'border-border bg-secondary/40 hover:bg-secondary'
                  }`}
                >
                  <div
                    className="h-3.5 w-3.5 rounded-full border border-black/10 dark:border-white/20"
                    style={{ background: t.swatch }}
                  />
                  <span className="text-xs font-medium text-foreground">
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {errors.submit && <p className="text-xs text-destructive font-medium text-center mt-2">{errors.submit}</p>}

          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => navigate('/onboarding/create/org')}
              className="h-11 px-4 rounded-2xl border border-border bg-transparent hover:bg-secondary/60 text-muted-foreground hover:text-foreground text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting || checkingUsername || usernameAvailable === false}
              className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
              ) : (
                <>
                  Complete Setup
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
