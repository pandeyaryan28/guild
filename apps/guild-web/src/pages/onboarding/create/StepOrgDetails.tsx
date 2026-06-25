import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { StepHeader } from '../../../components/onboarding/StepHeader';
import { useAuth } from '../../../hooks/useAuth';
import { generateInviteToken } from '../../../lib/validation';
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
      domainAutoJoin: emailDomain && !isPublicDomain ? domainAutoJoin : false,
      emailDomain: emailDomain && !isPublicDomain ? emailDomain : '',
      inviteToken: preGeneratedToken,
    });
    navigate('/onboarding/create/profile');
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

          {/* Domain Auto-Join Checkbox */}
          {emailDomain && !isPublicDomain && (
            <div className="space-y-2 pt-2 border-t border-border-default/20">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={domainAutoJoin}
                  onChange={(e) => setDomainAutoJoin(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border-default text-indigo-600 focus:ring-indigo-500/20 accent-indigo-600 cursor-pointer"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-foreground">Enable Domain Auto-Join</span>
                  <span className="text-[10px] text-muted-foreground font-semibold leading-relaxed">
                    Allow anyone signing up with verified emails ending in <strong>@{emailDomain}</strong> to join this workspace automatically.
                  </span>
                </div>
              </label>
            </div>
          )}

          <button
            type="submit"
            className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-2"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
