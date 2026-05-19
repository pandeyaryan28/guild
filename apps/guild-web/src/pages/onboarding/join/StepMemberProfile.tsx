import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Briefcase, Hash, Calendar, AtSign, Loader2, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { StepHeader } from '../../../components/onboarding/StepHeader';
import { FormField, TextInput, OnboardingCard } from '../../../components/onboarding/FormComponents';
import { createUser, addOrgMember, checkUsernameUnique, setOnboardingState, markInviteUsed } from '../../../lib/firestore';
import { isValidUsername, isValidEmployeeId, isValidAge } from '../../../lib/validation';
import { useAuth } from '../../../hooks/useAuth';
import type { OnboardingData } from '../OnboardingRoot';

interface Props {
  data: OnboardingData;
  updateData: (patch: Partial<OnboardingData>) => void;
}

export function StepMemberProfile({ data, updateData }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fullName, setFullName] = React.useState('');
  const [designation, setDesignation] = React.useState('');
  const [employeeId, setEmployeeId] = React.useState('');
  const [age, setAge] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [usernameAvailable, setUsernameAvailable] = React.useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
      await createUser(user.uid, {
        email: user.email!,
        fullName: fullName.trim(),
        username: username.toLowerCase(),
        designation: designation.trim(),
        employeeId: employeeId.trim(),
        age: parseInt(age),
        organizationId: data.joinOrgId,
        role: 'member',
      });

      await addOrgMember(data.joinOrgId, user.uid, 'member');
      if (data.inviteToken) {
        await markInviteUsed(data.inviteToken);
      }
      await setOnboardingState(user.uid, { step: 3, path: 'join' });

      navigate('/onboarding/complete');
    } catch {
      setErrors({ submit: 'Failed to save profile. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const usernameStatus = checkingUsername ? null : usernameAvailable === true ? true : usernameAvailable === false ? false : undefined;

  return (
    <div className="w-full max-w-lg">
      <StepHeader
        step={3}
        totalSteps={4}
        title="Create your member profile"
        subtitle={`You're joining ${data.joinOrgName || 'the organization'}.`}
      />

      {/* Org preview badge */}
      {data.joinOrgName && (
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary mb-6">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          {data.joinOrgName}
        </div>
      )}

      <OnboardingCard>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name" error={errors.fullName}>
              <TextInput
                icon={User}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </FormField>
            <FormField label="Designation / Role" error={errors.designation}>
              <TextInput
                icon={Briefcase}
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Engineer, Designer..."
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Employee ID" error={errors.employeeId}>
              <TextInput
                icon={Hash}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="EMP-001"
              />
            </FormField>
            <FormField label="Age" error={errors.age}>
              <TextInput
                icon={Calendar}
                type="number"
                min={16}
                max={100}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="28"
              />
            </FormField>
          </div>

          <FormField
            label="Username"
            error={errors.username}
            hint="Unique handle across all of Guild."
          >
            <TextInput
              icon={AtSign}
              value={username}
              onChange={(e) => { setUsername(e.target.value.toLowerCase()); setUsernameAvailable(null); }}
              placeholder="your_handle"
              isValid={usernameStatus === true ? true : usernameStatus === false ? false : undefined}
              suffix={
                checkingUsername ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
                ) : usernameStatus === true ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : usernameStatus === false ? (
                  <XCircle className="h-4 w-4 text-destructive" />
                ) : null
              }
            />
          </FormField>

          {errors.submit && <p className="text-xs text-destructive font-medium">{errors.submit}</p>}

          <button
            type="submit"
            disabled={isSubmitting || checkingUsername || usernameAvailable === false}
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground text-sm font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Complete Profile <ChevronRight className="h-4 w-4" /></>}
          </button>
        </form>
      </OnboardingCard>
    </div>
  );
}
