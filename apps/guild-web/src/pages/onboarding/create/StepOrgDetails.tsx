import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building2, Loader2, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { StepHeader } from '../../../components/onboarding/StepHeader';
import { FormField, TextInput, SelectInput, OnboardingCard } from '../../../components/onboarding/FormComponents';
import { checkOrgSlugUnique, createOrganization, createInviteLink } from '../../../lib/firestore';
import { seedDefaultChannels } from '../../../lib/chat';
import { isValidSlug, slugify } from '../../../lib/validation';
import { useAuth } from '../../../hooks/useAuth';
import type { OnboardingData } from '../OnboardingRoot';

const INDUSTRIES = [
  'Technology', 'Logistics & Supply Chain', 'Marketing & Creative Agency',
  'Manufacturing', 'Finance & Accounting', 'Healthcare', 'Real Estate',
  'Retail & E-commerce', 'Education', 'Consulting', 'Other',
];

const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+'];

interface Props {
  data: OnboardingData;
  updateData: (patch: Partial<OnboardingData>) => void;
}

export function StepOrgDetails({ data, updateData }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [name, setName] = React.useState(data.orgName || '');
  const [slug, setSlug] = React.useState(data.orgSlug || '');
  const [industry, setIndustry] = React.useState(data.orgIndustry || '');
  const [size, setSize] = React.useState(data.orgSize || '');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [slugAvailable, setSlugAvailable] = React.useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    const generated = slugify(val);
    setSlug(generated);
    setSlugAvailable(null);
  };

  // Debounced slug availability check
  React.useEffect(() => {
    if (!slug || !isValidSlug(slug)) {
      setSlugAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const available = await checkOrgSlugUnique(slug);
        setSlugAvailable(available);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [slug]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Organization name is required.';
    if (!isValidSlug(slug)) errs.slug = 'Slug: 3–30 chars, lowercase letters, numbers, hyphens.';
    if (slugAvailable === false) errs.slug = 'This slug is already taken.';
    if (!industry) errs.industry = 'Please select an industry.';
    if (!size) errs.size = 'Please select a company size.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;

    setIsSubmitting(true);
    try {
      const orgId = await createOrganization({
        name: name.trim(),
        slug: slug.toLowerCase(),
        industry,
        companySize: size,
        ownerId: user.uid,
      });
      const inviteToken = await createInviteLink(orgId, user.uid);

      // Seed default channels for the new org (only on creation, never on join)
      await seedDefaultChannels(orgId, user.uid);

      updateData({ orgName: name, orgSlug: slug, orgIndustry: industry, orgSize: size, orgId, inviteToken });
      navigate('/onboarding/create/profile');
    } catch {
      setErrors({ submit: 'Failed to create organization. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const slugStatus = checkingSlug ? null : slugAvailable === true ? true : slugAvailable === false ? false : undefined;

  return (
    <div className="w-full max-w-lg">
      <StepHeader
        step={2}
        totalSteps={4}
        title="Set up your organization"
        subtitle="Create a workspace for your entire team."
      />

      <OnboardingCard>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <FormField label="Organization Name" error={errors.name}>
            <TextInput
              icon={Building2}
              value={name}
              onChange={handleNameChange}
              placeholder="Acme Corp"
              required
            />
          </FormField>

          <FormField
            label="Organization Slug"
            error={errors.slug}
            hint="This is your organization's unique URL identifier."
          >
            <div className="relative group">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground/60">guild.app/</span>
              <input
                value={slug}
                onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugAvailable(null); }}
                placeholder="acme-corp"
                className={`w-full h-11 rounded-xl border bg-muted/20 pl-[72px] pr-10 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all ${
                  slugStatus === true ? 'border-emerald-500/50' : slugStatus === false ? 'border-destructive/50' : 'border-border/40'
                }`}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {checkingSlug && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />}
                {!checkingSlug && slugStatus === true && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {!checkingSlug && slugStatus === false && <XCircle className="h-4 w-4 text-destructive" />}
              </div>
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Industry" error={errors.industry}>
              <SelectInput
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Select industry"
              >
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i} className="bg-card">{i}</option>
                ))}
              </SelectInput>
            </FormField>

            <FormField label="Company Size" error={errors.size}>
              <SelectInput
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="Select size"
              >
                {COMPANY_SIZES.map((s) => (
                  <option key={s} value={s} className="bg-card">{s}</option>
                ))}
              </SelectInput>
            </FormField>
          </div>

          {errors.submit && (
            <p className="text-xs text-destructive font-medium">{errors.submit}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || checkingSlug || slugAvailable === false}
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground text-sm font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ChevronRight className="h-4 w-4" /></>}
          </button>
        </form>
      </OnboardingCard>
    </div>
  );
}
