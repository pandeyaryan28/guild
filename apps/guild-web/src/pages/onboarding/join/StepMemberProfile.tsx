import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Loader2, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Building2 } from 'lucide-react';
import { StepHeader } from '../../../components/onboarding/StepHeader';
import { executeMemberOnboardingJoin, checkUsernameUnique } from '../../../lib/firestore';
import { isValidUsername, isValidEmployeeId, isValidAge, isValidPhoneNumber } from '../../../lib/validation';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import type { OnboardingData } from '../../../types/onboarding';

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
  const [phoneNumber, setPhoneNumber] = React.useState('');
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
    if (!validate() || !user || !data.joinOrgId) return;

    setIsSubmitting(true);
    try {
      // Perform the joining procedure
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
        phoneNumber: phoneNumber.trim(),
      });

      localStorage.removeItem('guild_invite_token');
      sessionStorage.removeItem('guild_invite_token');
      navigate('/onboarding/complete');
    } catch {
      setErrors({ submit: 'Failed to complete profile registration. Please try again.' });
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
        title="Member Profile"
        subtitle={`Set up your profile to join ${data.joinOrgName || 'the workspace'}`}
      />

      <div className="w-full p-8 mt-8 rounded-3xl bg-surface/90 dark:bg-card/75 backdrop-blur-2xl border border-border dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
        {data.joinOrgName && (
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
            <Building2 className="h-3.5 w-3.5" />
            Joining: <span className="font-bold">{data.joinOrgName}</span>
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
                placeholder="e.g. Maya Lin"
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
                placeholder="e.g. Software Engineer"
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
                placeholder="e.g. EMP-042"
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
                placeholder="e.g. 26"
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
                  placeholder="e.g. maya"
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
              onClick={() => navigate('/onboarding/join/find')}
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
