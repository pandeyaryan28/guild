import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Building, Globe, Users } from 'lucide-react';
import { StepHeader } from '../../../components/onboarding/StepHeader';
import { useAuth } from '../../../hooks/useAuth';
import { generateInviteToken } from '../../../lib/validation';
import type { OnboardingData } from '../../../types/onboarding';

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
  const [domainAutoJoin, setDomainAutoJoin] = React.useState(data.domainAutoJoin ?? false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const emailDomain = React.useMemo(() => {
    if (!user?.email) return '';
    return user.email.substring(user.email.lastIndexOf('@') + 1).toLowerCase();
  }, [user?.email]);

  const isPublicDomain = React.useMemo(() => {
    const PUBLIC_DOMAINS = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com',
      'aol.com', 'icloud.com', 'mail.com', 'zoho.com', 'protonmail.com',
      'yandex.com', 'gmx.com'
    ];
    return PUBLIC_DOMAINS.includes(emailDomain);
  }, [emailDomain]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Organization name is required.';
    if (!industry) errs.industry = 'Please select an industry.';
    if (!size) errs.size = 'Please select a company size.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;

    const preGeneratedToken = generateInviteToken();

    updateData({
      orgName: name.trim(),
      orgIndustry: industry,
      orgSize: size,
      domainAutoJoin: emailDomain ? domainAutoJoin : false,
      emailDomain: emailDomain || '',
      inviteToken: preGeneratedToken,
    });
    navigate('/onboarding/create/profile');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className="w-full max-w-[500px] px-4 flex flex-col items-center"
    >
      <StepHeader
        step={2}
        totalSteps={4}
        title="Workspace Details"
        subtitle="Give your workspace a name and choose your industry"
      />

      <div className="w-full p-8 mt-8 rounded-3xl bg-surface/90 dark:bg-card/75 backdrop-blur-2xl border border-border dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Organization Name */}
          <div className="space-y-1.5">
            <label htmlFor="org-name" className="text-xs font-semibold text-foreground/80 pl-1">
              Workspace Name
            </label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
              placeholder="e.g. Acme Corporation"
              required
              className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] px-4 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200"
            />
            {errors.name && <p className="text-xs text-destructive font-medium pl-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Industry Selection */}
            <div className="space-y-1.5">
              <label htmlFor="org-industry" className="text-xs font-semibold text-foreground/80 pl-1">
                Industry
              </label>
              <div className="relative">
                <select
                  id="org-industry"
                  value={industry}
                  onChange={(e) => { setIndustry(e.target.value); setErrors(prev => ({ ...prev, industry: '' })); }}
                  required
                  className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] px-4 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200 cursor-pointer appearance-none"
                >
                  <option value="" disabled className="bg-surface text-foreground">Select industry</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i} className="bg-surface text-foreground">{i}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  ▾
                </div>
              </div>
              {errors.industry && <p className="text-xs text-destructive font-medium pl-1">{errors.industry}</p>}
            </div>

            {/* Company Size */}
            <div className="space-y-1.5">
              <label htmlFor="org-size" className="text-xs font-semibold text-foreground/80 pl-1">
                Team Size
              </label>
              <div className="relative">
                <select
                  id="org-size"
                  value={size}
                  onChange={(e) => { setSize(e.target.value); setErrors(prev => ({ ...prev, size: '' })); }}
                  required
                  className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] px-4 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all duration-200 cursor-pointer appearance-none"
                >
                  <option value="" disabled className="bg-surface text-foreground">Select size</option>
                  {COMPANY_SIZES.map((s) => (
                    <option key={s} value={s} className="bg-surface text-foreground">{s} people</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  ▾
                </div>
              </div>
              {errors.size && <p className="text-xs text-destructive font-medium pl-1">{errors.size}</p>}
            </div>
          </div>

          {/* Domain Auto-Join Checkbox */}
          {emailDomain && (
            <div className="p-4 rounded-2xl border border-border bg-secondary/30 dark:bg-white/[0.02]">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={domainAutoJoin}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (checked && isPublicDomain) {
                      const confirm = window.confirm(
                        `WARNING: You are enabling domain-based auto-join for a public email domain (${emailDomain}). ` +
                        `This means ANYONE with a verified email ending in @${emailDomain} can join your organization. ` +
                        `Are you sure you want to proceed?`
                      );
                      if (!confirm) return;
                    }
                    setDomainAutoJoin(checked);
                  }}
                  className="mt-0.5 h-4 w-4 rounded-md border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-foreground">Domain Auto-Join</span>
                  <span className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Allow teammates signing up with verified emails ending in <strong className="text-foreground">@{emailDomain}</strong> to join this workspace automatically.
                  </span>
                </div>
              </label>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="h-11 px-4 rounded-2xl border border-border bg-transparent hover:bg-secondary/60 text-muted-foreground hover:text-foreground text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
