import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building2, Loader2, CheckCircle2, XCircle, ChevronRight, Hash, Sliders } from 'lucide-react';
import { StepHeader } from '../../../components/onboarding/StepHeader';
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

      // Seed default channels for the new org with dynamic templates based on the industry
      await seedDefaultChannels(orgId, user.uid, industry);

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
    <div className="w-full max-w-[500px] px-4 flex flex-col items-center">
      <StepHeader
        step={2}
        totalSteps={4}
        title="Workspace Credentials"
        subtitle="Specify the core parameters of your team operations hub."
      />

      <div className="aether-glass w-full p-8 mt-8 shadow-2xl relative overflow-hidden border border-border-default/30">
        <div className="absolute inset-0 bg-dashboard-grid opacity-20 pointer-events-none" />

        <form onSubmit={handleSubmit} className="space-y-4.5 relative z-10">
          {/* Organization Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
              Organization Name
            </label>
            <div className="relative group">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-indigo-500" />
              <input
                value={name}
                onChange={handleNameChange}
                placeholder="Acme Corp"
                required
                className="w-full h-10 rounded-xl border border-border-default/60 bg-surface/50 dark:bg-white/5 pl-10 pr-4 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200"
              />
            </div>
            {errors.name && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.name}</p>}
          </div>

          {/* Org Slug */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between pl-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Workspace Slug
              </label>
              <span className="text-[9px] font-semibold text-muted-foreground">Unique sub-domain identifier</span>
            </div>
            <div className="relative group">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground select-none">guild.app/</span>
              <input
                value={slug}
                onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugAvailable(null); }}
                placeholder="acme-corp"
                required
                style={{ paddingLeft: '84px' }}
                className={`w-full h-10 rounded-xl border bg-surface/50 dark:bg-white/5 pr-10 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200 ${
                  slugStatus === true ? 'border-emerald-500/50 focus:border-emerald-500/50 focus:ring-emerald-500/20' : slugStatus === false ? 'border-destructive/50 focus:border-destructive/50 focus:ring-destructive/20' : 'border-border-default/60'
                }`}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {checkingSlug && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                {!checkingSlug && slugStatus === true && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                {!checkingSlug && slugStatus === false && <XCircle className="h-3.5 w-3.5 text-destructive" />}
              </div>
            </div>
            {errors.slug && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.slug}</p>}
          </div>

          {/* Industry Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Industry
              </label>
              <div className="relative group">
                <Sliders className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors pointer-events-none group-focus-within:text-indigo-500" />
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  required
                  className="w-full h-10 rounded-xl border border-border-default/60 bg-surface/50 dark:bg-white/5 pl-10 pr-4 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200 appearance-none [&>option]:bg-surface [&>option]:text-foreground cursor-pointer"
                >
                  <option value="" disabled className="text-muted-foreground">Select template</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i} className="text-foreground">{i}</option>
                  ))}
                </select>
              </div>
              {errors.industry && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.industry}</p>}
            </div>

            {/* Company Size */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Company Size
              </label>
              <div className="relative group">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors pointer-events-none group-focus-within:text-indigo-500" />
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  required
                  className="w-full h-10 rounded-xl border border-border-default/60 bg-surface/50 dark:bg-white/5 pl-10 pr-4 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200 appearance-none [&>option]:bg-surface [&>option]:text-foreground cursor-pointer"
                >
                  <option value="" disabled className="text-muted-foreground">Select size</option>
                  {COMPANY_SIZES.map((s) => (
                    <option key={s} value={s} className="text-foreground">{s}</option>
                  ))}
                </select>
              </div>
              {errors.size && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.size}</p>}
            </div>
          </div>

          {errors.submit && (
            <p className="text-xs text-destructive font-semibold text-center mt-2">{errors.submit}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || checkingSlug || slugAvailable === false}
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <>
                Initialize Space
                <ChevronRight className="h-4 w-4 text-white" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
