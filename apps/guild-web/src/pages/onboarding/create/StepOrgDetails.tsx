import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { StepHeader } from '../../../components/onboarding/StepHeader';
import { createOrganization, createInviteLink } from '../../../lib/firestore';
import { seedDefaultChannels } from '../../../lib/chat';
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
  const [industry, setIndustry] = React.useState(data.orgIndustry || '');
  const [size, setSize] = React.useState(data.orgSize || '');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Organization name is required.';
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
        industry,
        companySize: size,
        ownerId: user.uid,
      });
      const inviteToken = await createInviteLink(orgId, user.uid);

      // Seed default channels for the new org with dynamic templates based on the industry
      await seedDefaultChannels(orgId, user.uid, industry);

      updateData({ orgName: name, orgIndustry: industry, orgSize: size, orgId, inviteToken });
      navigate('/onboarding/create/profile');
    } catch {
      setErrors({ submit: 'Failed to create organization. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[480px] px-4 flex flex-col items-center">
      <StepHeader
        step={2}
        totalSteps={4}
        title="Organization Details"
        subtitle="Enter the name and details for your organization."
      />

      <div className="aether-glass w-full p-8 mt-8 shadow-xl border border-border-default/30">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization Name */}
          <div className="space-y-1.5">
            <label htmlFor="org-name" className="text-xs font-semibold text-muted-foreground pl-0.5">
              Organization Name
            </label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              required
              className="w-full h-10 rounded-xl border border-border-default bg-surface/50 dark:bg-white/5 px-3.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200"
            />
            {errors.name && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Industry Selection */}
            <div className="space-y-1.5">
              <label htmlFor="org-industry" className="text-xs font-semibold text-muted-foreground pl-0.5">
                Industry
              </label>
              <select
                id="org-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
                className="w-full h-10 rounded-xl border border-border-default bg-surface/50 dark:bg-white/5 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200 cursor-pointer"
              >
                <option value="" disabled>Select industry</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              {errors.industry && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.industry}</p>}
            </div>

            {/* Company Size */}
            <div className="space-y-1.5">
              <label htmlFor="org-size" className="text-xs font-semibold text-muted-foreground pl-0.5">
                Company Size
              </label>
              <select
                id="org-size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                required
                className="w-full h-10 rounded-xl border border-border-default bg-surface/50 dark:bg-white/5 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-surface/80 dark:focus:bg-white/10 transition-all duration-200 cursor-pointer"
              >
                <option value="" disabled>Select size</option>
                {COMPANY_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.size && <p className="text-[10px] text-destructive font-semibold pl-1">{errors.size}</p>}
            </div>
          </div>

          {errors.submit && (
            <p className="text-xs text-destructive font-semibold text-center mt-2">{errors.submit}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || checkingSlug || slugAvailable === false}
            className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              'Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
