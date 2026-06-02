/**
 * BillingSettingsView — owner-only billing tab inside Settings.
 * Design language matches the existing SettingsPage (aether-glass, dark theme).
 */
import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard, Zap, Building2, CheckCircle2, AlertCircle,
  Loader2, ArrowRight, Sparkles, Gift, Clock, TrendingUp,
  Wallet, History, ChevronRight, Star, Shield, Users,
  HardDrive, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBilling } from '../../hooks/useBilling';
import {
  detectCurrency, getPricing, formatMoney, toSmallestUnit,
  openRazorpayCheckout, activateSubscription, activateCreditTopUp,
  ANNUAL_OFFER_END, ENTERPRISE_CONTACT_URL, FREE_SEAT_LIMIT, FREE_STORAGE_LIMIT_MB,
} from '../../lib/billing';
import type { UserProfile, BillingCurrency } from '@guild/types';

// ─── Props ────────────────────────────────────────────────────────────────────
interface BillingSettingsViewProps {
  profile: UserProfile;
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────
function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes, expired: false };
  };
  const [time, setTime] = React.useState(calc);
  React.useEffect(() => {
    const t = setInterval(() => setTime(calc()), 60_000);
    return () => clearInterval(t);
  }, []);
  return time;
}

// ─── Plan Badge ───────────────────────────────────────────────────────────────
function PlanBadge({ plan }: { plan: string }) {
  const configs: Record<string, { label: string; color: string }> = {
    free: { label: 'Free', color: 'text-muted-foreground bg-white/5 border-white/10' },
    pro_monthly: { label: 'Pro · Monthly', color: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
    pro_annual: { label: 'Pro · Annual', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
    credit: { label: 'Credit Wallet', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
    enterprise: { label: 'Enterprise', color: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
  };
  const cfg = configs[plan] ?? configs.free;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider', cfg.color)}>
      {cfg.label}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; dot: string }> = {
    active: { label: 'Active', dot: 'bg-emerald-400' },
    past_due: { label: 'Past Due', dot: 'bg-red-400' },
    cancelled: { label: 'Cancelled', dot: 'bg-muted-foreground' },
    trialing: { label: 'Trial', dot: 'bg-amber-400' },
  };
  const cfg = configs[status] ?? configs.active;
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Section Card Wrapper ─────────────────────────────────────────────────────
function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4 relative overflow-hidden',
      className
    )}>
      {children}
    </div>
  );
}

// ─── Current Plan Panel ───────────────────────────────────────────────────────
function CurrentPlanPanel({
  billing, memberCount, creditBalanceDisplay, creditMonthsRemaining, currency,
}: {
  billing: NonNullable<ReturnType<typeof useBilling>['billing']>;
  memberCount: number;
  creditBalanceDisplay: number;
  creditMonthsRemaining: number;
  currency: BillingCurrency;
}) {
  const pricing = getPricing(currency);

  return (
    <SectionCard>
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-accent/5 blur-2xl pointer-events-none" />
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="space-y-1.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Current Plan</p>
          <div className="flex flex-wrap items-center gap-2">
            <PlanBadge plan={billing.plan} />
            <StatusBadge status={billing.status} />
          </div>
        </div>
        <div className="text-right space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Members</p>
          <p className="text-base font-black text-foreground">{memberCount} <span className="text-xs font-bold text-muted-foreground">/ {billing.plan === 'free' ? `${FREE_SEAT_LIMIT} max` : 'unlimited'}</span></p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
        {billing.plan === 'credit' && (
          <>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">Balance</p>
              <p className="text-sm font-black text-foreground">{formatMoney(creditBalanceDisplay, currency)}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">Est. Remaining</p>
              <p className="text-sm font-black text-foreground">
                {isFinite(creditMonthsRemaining) ? `${creditMonthsRemaining} mo` : '∞'}
              </p>
            </div>
          </>
        )}
        {(billing.plan === 'pro_monthly' || billing.plan === 'pro_annual') && (
          <>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">Per Seat</p>
              <p className="text-sm font-black text-foreground">
                {billing.plan === 'pro_annual'
                  ? formatMoney(pricing.annual, currency)
                  : formatMoney(pricing.monthly, currency)}
                <span className="text-[10px] text-muted-foreground font-bold">/mo</span>
              </p>
            </div>
            {billing.nextBillingDate && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">Next Bill</p>
                <p className="text-sm font-black text-foreground">
                  {new Date((billing.nextBillingDate as any).toDate?.() ?? billing.nextBillingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
          </>
        )}
        {billing.plan === 'free' && (
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 col-span-2">
            <div className="flex items-center gap-2 text-amber-400">
              <HardDrive className="h-3 w-3" />
              <p className="text-[10px] font-bold">Storage: <span className="text-foreground">{FREE_STORAGE_LIMIT_MB} MB media limit</span></p>
            </div>
          </div>
        )}
      </div>

      {/* Annual bonus activated banner */}
      {billing.annualBonusActivated && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/20">
          <Gift className="h-4 w-4 text-amber-400 shrink-0" />
          <div>
            <p className="text-[10px] font-black text-amber-300">Annual Bonus Active</p>
            <p className="text-[9px] text-amber-400/70 font-semibold">1 year free access to Guild HR & Accounting — coming soon</p>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Free Plan Limits Banner (shown when on free) ─────────────────────────────
function FreeLimitsBanner({ memberCount }: { memberCount: number }) {
  const atLimit = memberCount >= FREE_SEAT_LIMIT;
  return (
    <SectionCard className={atLimit ? 'border-amber-500/20 bg-amber-500/[0.03]' : ''}>
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-xl', atLimit ? 'bg-amber-500/10' : 'bg-white/[0.03]')}>
          <Users className={cn('h-4 w-4', atLimit ? 'text-amber-400' : 'text-muted-foreground')} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-black', atLimit ? 'text-amber-300' : 'text-foreground')}>
            {atLimit ? 'You\'ve reached the free member limit' : `${memberCount} of ${FREE_SEAT_LIMIT} free seats used`}
          </p>
          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
            Free plan includes up to {FREE_SEAT_LIMIT} members and {FREE_STORAGE_LIMIT_MB} MB media storage. Upgrade to add more.
          </p>
          {/* Seat progress bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', atLimit ? 'bg-amber-400' : 'bg-accent')}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((memberCount / FREE_SEAT_LIMIT) * 100, 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────
interface PlanCardProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  price: string;
  priceSub?: string;
  features: string[];
  cta: string;
  ctaColor?: string;
  highlighted?: boolean;
  bonus?: string;
  countdownLabel?: string;
  disabled?: boolean;
  onSelect: () => void;
}

function PlanCard({
  title, badge, badgeColor, price, priceSub, features, cta, ctaColor,
  highlighted, bonus, countdownLabel, disabled, onSelect,
}: PlanCardProps) {
  return (
    <div className={cn(
      'relative rounded-2xl border p-5 space-y-4 flex flex-col transition-all',
      highlighted
        ? 'border-accent/30 bg-accent/[0.04] shadow-[0_0_30px_rgba(99,102,241,0.08)]'
        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
    )}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-lg">
            <Star className="h-2.5 w-2.5" /> Recommended
          </span>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-black text-foreground">{title}</p>
          {badge && (
            <span className={cn('px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider', badgeColor)}>
              {badge}
            </span>
          )}
        </div>
        <div>
          <p className="text-2xl font-black text-foreground leading-none">{price}</p>
          {priceSub && <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{priceSub}</p>}
        </div>
      </div>

      {bonus && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20">
          <Gift className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[9.5px] text-amber-300 font-bold leading-snug">{bonus}</p>
        </div>
      )}

      {countdownLabel && (
        <div className="flex items-center gap-1.5 text-[9px] text-rose-400 font-bold">
          <Clock className="h-3 w-3" />
          {countdownLabel}
        </div>
      )}

      <ul className="space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[10px] text-muted-foreground font-semibold">
            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={disabled}
        className={cn(
          'w-full py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5',
          ctaColor ?? 'bg-accent text-white hover:bg-accent/90 shadow-md'
        )}
      >
        {cta} <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function BillingSettingsView({ profile }: BillingSettingsViewProps) {
  const orgId = profile.organizationId;
  const currency = detectCurrency();
  const pricing = getPricing(currency);
  const countdown = useCountdown(ANNUAL_OFFER_END);
  const {
    billing, loading, memberCount, isAtFreeLimit,
    transactions, transactionsLoading, creditBalanceDisplay, creditMonthsRemaining,
  } = useBilling(orgId, currency);

  const [activeTab, setActiveTab] = React.useState<'subscription' | 'credits'>('subscription');
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'annual'>('annual');
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const currentPlan = billing?.plan ?? 'free';
  const isOnPaidPlan = currentPlan !== 'free';

  const countdownLabel = countdown.expired
    ? 'Offer expired'
    : `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m left`;

  // ── Payment Handler ──────────────────────────────────────────────────────────
  const handleSubscribe = async (cycle: 'monthly' | 'annual') => {
    if (!orgId) return;
    setProcessing(true);
    setError(null);
    try {
      const seats = Math.max(memberCount, 1);
      const pricePerSeat = cycle === 'annual' ? pricing.annualTotal : pricing.monthly;
      const totalAmount = seats * pricePerSeat;
      const description = cycle === 'annual'
        ? `Guild Pro Annual — ${seats} seat${seats > 1 ? 's' : ''}`
        : `Guild Pro Monthly — ${seats} seat${seats > 1 ? 's' : ''}`;

      const response = await openRazorpayCheckout({
        amountInSmallestUnit: toSmallestUnit(totalAmount, currency),
        currency,
        receipt: `sub_${orgId}_${Date.now()}`,
        description,
        userName: profile.fullName,
        userEmail: profile.email,
      });

      await activateSubscription({
        orgId,
        plan: cycle === 'annual' ? 'pro_annual' : 'pro_monthly',
        seats,
        currency,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
        razorpaySignature: response.razorpay_signature,
      });

      setSuccessMsg(`You're now on Pro ${cycle === 'annual' ? 'Annual' : 'Monthly'}! 🎉`);
    } catch (err: any) {
      if (err?.message !== 'Payment cancelled') {
        setError(err?.message ?? 'Payment failed. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleTopUp = async (packId: 'starter' | 'growth') => {
    if (!orgId) return;
    setProcessing(true);
    setError(null);
    try {
      const paidAmount = packId === 'growth' ? pricing.creditGrowthPrice : pricing.creditStarterPrice;
      const creditedAmount = packId === 'growth' ? pricing.creditGrowthBonus : pricing.creditStarterBonus;
      const description = packId === 'growth'
        ? `Guild Credit Wallet — Growth Pack`
        : `Guild Credit Wallet — Starter Pack`;

      const response = await openRazorpayCheckout({
        amountInSmallestUnit: toSmallestUnit(paidAmount, currency),
        currency,
        receipt: `topup_${orgId}_${Date.now()}`,
        description,
        userName: profile.fullName,
        userEmail: profile.email,
      });

      await activateCreditTopUp({
        orgId,
        packId,
        currency,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
      });

      const bonusPct = packId === 'growth' ? '20%' : '10%';
      setSuccessMsg(`Credits added! You paid ${formatMoney(paidAmount, currency)} and got ${formatMoney(creditedAmount, currency)} in your wallet (+${bonusPct} bonus) 🎉`);
    } catch (err: any) {
      if (err?.message !== 'Payment cancelled') {
        setError(err?.message ?? 'Payment failed. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <p className="text-xs font-bold">Loading billing info…</p>
      </div>
    );
  }

  const annualSeats = Math.max(memberCount, 1);
  const annualTotal = annualSeats * pricing.annualTotal;
  const monthlyTotal = annualSeats * pricing.monthly;

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div>
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-accent" style={{ color: 'var(--accent)' }} />
          Billing & Plans
        </h2>
        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
          Manage your workspace plan, credits, and payment history.
        </p>
      </div>

      {/* Success / Error Toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] rounded-xl flex items-start gap-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-400/60 hover:text-emerald-400 text-xs cursor-pointer">✕</button>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] rounded-xl flex items-start gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400 text-xs cursor-pointer">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Plan Card (shown if on a paid plan or to give context) */}
      {billing && (
        <CurrentPlanPanel
          billing={billing}
          memberCount={memberCount}
          creditBalanceDisplay={creditBalanceDisplay}
          creditMonthsRemaining={creditMonthsRemaining}
          currency={currency}
        />
      )}

      {/* Free limits banner (shown when on free plan) */}
      {currentPlan === 'free' && (
        <FreeLimitsBanner memberCount={memberCount} />
      )}

      {/* Tab Switcher: Subscription vs Credits */}
      <div className="flex rounded-xl bg-white/[0.03] border border-white/[0.06] p-1 gap-1">
        {(['subscription', 'credits'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer',
              activeTab === tab
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'text-muted-foreground hover:text-foreground'
            )}
            style={activeTab === tab ? { color: 'var(--accent)', borderColor: 'oklch(from var(--accent) l c h / 30%)' } : {}}
          >
            {tab === 'subscription' ? (
              <span className="flex items-center justify-center gap-1.5"><Zap className="h-3 w-3" />Subscription</span>
            ) : (
              <span className="flex items-center justify-center gap-1.5"><Wallet className="h-3 w-3" />Credit Wallet</span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── SUBSCRIPTION TAB ─────────────────────────────────────────────── */}
        {activeTab === 'subscription' && (
          <motion.div
            key="subscription"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* Monthly / Annual Toggle */}
            <div className="flex items-center gap-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Billing Cycle</p>
              <div className="flex rounded-lg bg-white/[0.03] border border-white/[0.06] p-0.5 gap-0.5">
                {(['monthly', 'annual'] as const).map((cycle) => (
                  <button
                    key={cycle}
                    onClick={() => setBillingCycle(cycle)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-[10px] font-black transition-all cursor-pointer',
                      billingCycle === cycle ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {cycle === 'annual' ? (
                      <span className="flex items-center gap-1">Annual <span className="text-emerald-400 text-[9px]">50% OFF</span></span>
                    ) : 'Monthly'}
                  </button>
                ))}
              </div>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Free */}
              <PlanCard
                title="Free"
                price={currency === 'INR' ? '₹0' : '$0'}
                priceSub="Forever free"
                features={[
                  `Up to ${FREE_SEAT_LIMIT} members`,
                  `${FREE_STORAGE_LIMIT_MB} MB media storage`,
                  'All core features',
                  'Unlimited tasks & chats',
                ]}
                cta={currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
                ctaColor="bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 cursor-default"
                disabled={currentPlan === 'free' || processing}
                onSelect={() => {}}
              />

              {/* Pro */}
              <PlanCard
                title="Pro"
                highlighted
                badge={billingCycle === 'annual' && !countdown.expired ? '50% OFF' : undefined}
                badgeColor="bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                price={billingCycle === 'annual'
                  ? formatMoney(pricing.annual, currency)
                  : formatMoney(pricing.monthly, currency)}
                priceSub={billingCycle === 'annual'
                  ? `${formatMoney(pricing.annualTotal, currency)}/seat/year · billed as ${formatMoney(annualTotal, currency)}`
                  : `per seat per month · ${annualSeats} seat${annualSeats > 1 ? 's' : ''} = ${formatMoney(monthlyTotal, currency)}/mo`}
                features={[
                  'Unlimited members',
                  'Unlimited storage',
                  'Priority support',
                  'Advanced reports',
                  ...(billingCycle === 'annual' ? ['🎁 1yr HR & Accounting access'] : []),
                ]}
                bonus={billingCycle === 'annual'
                  ? '1 year free access to Guild HR & Accounting (coming soon)'
                  : undefined}
                countdownLabel={billingCycle === 'annual' && !countdown.expired ? `Limited offer — ${countdownLabel}` : undefined}
                cta={processing ? 'Processing…' : `Upgrade to Pro${billingCycle === 'annual' ? ' Annual' : ''}`}
                disabled={processing || (currentPlan === (billingCycle === 'annual' ? 'pro_annual' : 'pro_monthly'))}
                onSelect={() => handleSubscribe(billingCycle)}
              />

              {/* Enterprise */}
              <PlanCard
                title="Enterprise"
                price="Custom"
                priceSub="100+ employees"
                features={[
                  'Volume discounts',
                  'Dedicated support',
                  'Custom onboarding',
                  'SLA guarantee',
                  'Advanced security',
                ]}
                cta="Contact Us"
                ctaColor="bg-sky-500/10 border border-sky-500/20 text-sky-300 hover:bg-sky-500/20"
                onSelect={() => window.open(ENTERPRISE_CONTACT_URL, '_blank')}
              />
            </div>

            {/* Currency note */}
            <div className="flex items-start gap-2 text-[9px] text-muted-foreground/60 font-semibold">
              <Info className="h-3 w-3 shrink-0 mt-0.5" />
              <p>Prices shown in {currency === 'INR' ? 'Indian Rupees (₹ INR)' : 'US Dollars ($ USD)'}. Payments processed via Razorpay. International cards accepted.</p>
            </div>
          </motion.div>
        )}

        {/* ── CREDIT WALLET TAB ─────────────────────────────────────────────── */}
        {activeTab === 'credits' && (
          <motion.div
            key="credits"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* How it works */}
            <SectionCard>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-accent/10 shrink-0">
                  <TrendingUp className="h-4 w-4 text-accent" style={{ color: 'var(--accent)' }} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-foreground">How Credit Wallet works</p>
                  <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed">
                    Top up once. Your balance is automatically deducted every month based on how many members are in your workspace.
                    Add members anytime — no payment friction, just balance deduction on the next cycle.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { icon: Users, text: `${formatMoney(pricing.monthly, currency)}/seat/mo` },
                      { icon: Shield, text: 'No recurring payment' },
                      { icon: Zap, text: 'Add members instantly' },
                    ].map(({ icon: Icon, text }) => (
                      <span key={text} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[9px] font-bold text-muted-foreground">
                        <Icon className="h-2.5 w-2.5" /> {text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Top-up Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Starter Pack */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4 flex flex-col">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Starter Pack</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-foreground">{formatMoney(pricing.creditStarterPrice, currency)}</p>
                    <span className="text-[10px] text-emerald-400 font-black">+10% bonus</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                    Get <span className="text-emerald-400 font-black">{formatMoney(pricing.creditStarterBonus, currency)}</span> in wallet
                  </p>
                </div>
                <ul className="space-y-2 flex-1">
                  {[
                    `~${Math.floor(pricing.creditStarterBonus / pricing.monthly / Math.max(memberCount, 1))} months for ${Math.max(memberCount, 1)} member${Math.max(memberCount, 1) > 1 ? 's' : ''}`,
                    'Instant credit to wallet',
                    'Roll over unused credits',
                    `Pay ${formatMoney(pricing.creditStarterPrice, currency)}, get ${formatMoney(pricing.creditStarterBonus, currency)}`,
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[10px] text-muted-foreground font-semibold">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleTopUp('starter')}
                  disabled={processing}
                  className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-[11px] font-black uppercase tracking-wider hover:bg-white/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Top Up Now <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* Growth Pack */}
              <div className="relative rounded-2xl border border-accent/30 bg-accent/[0.04] p-5 space-y-4 flex flex-col shadow-[0_0_30px_rgba(99,102,241,0.08)]">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-lg">
                    <Gift className="h-2.5 w-2.5" /> Includes Bonus
                  </span>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Growth Pack</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-foreground">{formatMoney(pricing.creditGrowthPrice, currency)}</p>
                    <span className="text-[10px] text-emerald-400 font-black">+20% bonus</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                    Get <span className="text-emerald-400 font-black">{formatMoney(pricing.creditGrowthBonus, currency)}</span> in wallet
                  </p>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20">
                  <Gift className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[9.5px] text-amber-300 font-bold leading-snug">1 year free HR & Accounting access</p>
                </div>
                <ul className="space-y-2 flex-1">
                  {[
                    `~${Math.floor(pricing.creditGrowthBonus / pricing.monthly / Math.max(memberCount, 1))} months for ${Math.max(memberCount, 1)} member${Math.max(memberCount, 1) > 1 ? 's' : ''}`,
                    'Instant credit to wallet',
                    'Roll over unused credits',
                    `Pay ${formatMoney(pricing.creditGrowthPrice, currency)}, get ${formatMoney(pricing.creditGrowthBonus, currency)}`,
                    '🎁 Annual bonus included',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[10px] text-muted-foreground font-semibold">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleTopUp('growth')}
                  disabled={processing}
                  className="w-full py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-white shadow-md hover:opacity-90"
                  style={{ background: 'var(--accent)' }}
                >
                  {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Top Up Now <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Current balance (if on credit plan) */}
            {currentPlan === 'credit' && (
              <SectionCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Current Balance</p>
                    <p className="text-xl font-black text-foreground">{formatMoney(creditBalanceDisplay, currency)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Est. Remaining</p>
                    <p className="text-xl font-black text-foreground">
                      {isFinite(creditMonthsRemaining) ? `${creditMonthsRemaining} months` : '∞'}
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TRANSACTION HISTORY ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
          <History className="h-3 w-3" /> Payment History
        </p>
        {transactionsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-[10px] py-4">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.05] bg-white/[0.01] p-6 text-center">
            <History className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[10px] text-muted-foreground font-semibold">No payments yet</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            {transactions.map((tx, i) => (
              <div
                key={tx.razorpayPaymentId ?? i}
                className={cn(
                  'flex items-center justify-between px-4 py-3 gap-3',
                  i !== 0 && 'border-t border-white/[0.04]'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'p-1.5 rounded-lg shrink-0',
                    tx.type === 'topup' ? 'bg-emerald-500/10' :
                    tx.type === 'deduction' ? 'bg-red-500/10' : 'bg-accent/10'
                  )}>
                    {tx.type === 'topup' ? <TrendingUp className="h-3 w-3 text-emerald-400" /> :
                     tx.type === 'deduction' ? <ChevronRight className="h-3 w-3 text-red-400" /> :
                     <CreditCard className="h-3 w-3 text-accent" style={{ color: 'var(--accent)' }} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-foreground truncate">{tx.description}</p>
                    <p className="text-[9px] text-muted-foreground font-semibold">
                      {tx.createdAt && (tx.createdAt as any).toDate
                        ? new Date((tx.createdAt as any).toDate()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn(
                    'text-[11px] font-black',
                    tx.type === 'deduction' ? 'text-red-400' :
                    tx.status === 'success' ? 'text-emerald-400' : 'text-muted-foreground'
                  )}>
                    {tx.type === 'deduction' ? '-' : '+'}{formatMoney(tx.amount / 100, tx.currency)}
                  </p>
                  <p className={cn(
                    'text-[9px] font-bold',
                    tx.status === 'success' ? 'text-emerald-400/60' :
                    tx.status === 'failed' ? 'text-red-400/60' : 'text-muted-foreground/60'
                  )}>
                    {tx.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processing overlay */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3 text-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-accent" style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-bold">Processing payment…</p>
              <p className="text-xs text-muted-foreground">Please don't close this window</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
