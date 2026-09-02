/**
 * BillingSettingsView — owner-only billing tab inside Settings.
 * Theme-aware (light + dark). Minimal, premium design.
 */
import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard, CheckCircle2, AlertCircle, Loader2, ArrowRight,
  Gift, Clock, TrendingUp, Wallet, History, Star, Users, Zap,
  Tag, Sparkles, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBilling } from '../../hooks/useBilling';
import {
  detectCurrency, getPricing, formatMoney, toSmallestUnit,
  openRazorpayCheckout, activateSubscription, activateCreditTopUp,
  activateTrial, applyPromoCoupon, validatePromoCoupon, PROMO_COUPONS,
  ANNUAL_OFFER_END, ENTERPRISE_CONTACT_URL, FREE_SEAT_LIMIT,
  type GracePeriodInfo,
} from '../../lib/billing';
import type { UserProfile, BillingCurrency } from '@guild/types';

interface BillingSettingsViewProps { profile: UserProfile }

// ─── Countdown ────────────────────────────────────────────────────────────────
function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, expired: true };
    return {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor((diff % 86_400_000) / 3_600_000),
      expired: false,
    };
  };
  const [t, setT] = React.useState(calc);
  React.useEffect(() => { const id = setInterval(() => setT(calc()), 60_000); return () => clearInterval(id); }, []);
  return t;
}

// ─── Reusable primitives ──────────────────────────────────────────────────────

/** Theme-aware card — uses CSS vars so it works in both light and dark */
function Card({ children, className, highlighted }: {
  children: React.ReactNode; className?: string; highlighted?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-2xl border p-5 relative',
      highlighted
        ? 'border-accent/25 bg-accent/[0.03]'
        : 'border-border bg-card',
      className
    )}>
      {children}
    </div>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border', className)}>
      {children}
    </span>
  );
}

// ─── Current Plan Strip ───────────────────────────────────────────────────────
function CurrentPlanStrip({ billing, memberCount, creditBalanceDisplay, currency, graceInfo }: {
  billing: NonNullable<ReturnType<typeof useBilling>['billing']>;
  memberCount: number; creditBalanceDisplay: number;
  currency: BillingCurrency;
  graceInfo?: GracePeriodInfo;
}) {
  const pricing = getPricing(currency);
  const nextBillingDateVal = billing.nextBillingDate
    ? ((billing.nextBillingDate as any).toDate?.() ?? new Date((billing.nextBillingDate as any)))
    : null;
  const isTrialExpired = billing.status === 'trialing' && nextBillingDateVal && nextBillingDateVal.getTime() < Date.now();

  const planLabel: Record<string, string> = {
    free: 'Free',
    pro_monthly: billing.status === 'trialing'
      ? (isTrialExpired ? 'Pro · Trial (Expired)' : 'Pro · Trial')
      : 'Pro · Monthly',
    pro_annual: 'Pro · Annual',
    credit: 'Credit Wallet',
    enterprise: 'Enterprise',
  };
  const planPillClass: Record<string, string> = {
    free: 'text-muted-foreground border-border bg-muted/40',
    pro_monthly: billing.status === 'trialing'
      ? (isTrialExpired
          ? 'text-rose-600 dark:text-rose-300 border-rose-400/30 bg-rose-50 dark:bg-rose-500/10'
          : 'text-amber-600 dark:text-amber-300 border-amber-400/30 bg-amber-50 dark:bg-amber-500/10')
      : 'text-violet-600 dark:text-violet-300 border-violet-400/30 bg-violet-50 dark:bg-violet-500/10',
    pro_annual: 'text-amber-600 dark:text-amber-300 border-amber-400/30 bg-amber-50 dark:bg-amber-500/10',
    credit: 'text-emerald-600 dark:text-emerald-300 border-emerald-400/30 bg-emerald-50 dark:bg-emerald-500/10',
    enterprise: 'text-sky-600 dark:text-sky-300 border-sky-400/30 bg-sky-50 dark:bg-sky-500/10',
  };
  const statusDot: Record<string, string> = {
    active: 'bg-emerald-500',
    past_due: 'bg-red-500',
    cancelled: 'bg-muted-foreground',
    trialing: isTrialExpired ? 'bg-rose-500' : 'bg-amber-500',
  };
  const statusText = billing.status === 'active'
    ? 'Active'
    : billing.status === 'past_due'
    ? 'Past due'
    : billing.status === 'trialing'
    ? (isTrialExpired ? 'Expired' : 'Trial')
    : 'Cancelled';

  const allocatedSeatsDisplay = graceInfo?.allocatedSeats === Infinity
    ? '∞'
    : (graceInfo?.allocatedSeats ?? (billing.plan === 'free' || isTrialExpired ? FREE_SEAT_LIMIT : (billing.seats || FREE_SEAT_LIMIT)));

  return (
    <Card>
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left: plan + status */}
        <div className="flex items-center gap-3">
          <Pill className={planPillClass[billing.plan] ?? planPillClass.free}>
            {planLabel[billing.plan] ?? 'Free'}
          </Pill>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
            <span className={cn('w-1.5 h-1.5 rounded-full', statusDot[billing.status] ?? 'bg-muted-foreground')} />
            {statusText}
          </span>
        </div>

        {/* Right: key stat */}
        <div className="flex items-center gap-5 text-right">
          {billing.plan === 'credit' && (
            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Balance</p>
              <p className="text-sm font-bold text-foreground">{formatMoney(creditBalanceDisplay, currency)}</p>
            </div>
          )}
          {(billing.plan === 'pro_monthly' || billing.plan === 'pro_annual') && (
            <>
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Per seat</p>
                <p className="text-sm font-bold text-foreground">
                  {formatMoney(billing.plan === 'pro_annual' ? pricing.annual : pricing.monthly, currency)}
                  <span className="text-[9px] font-medium text-muted-foreground">/mo</span>
                </p>
              </div>
              {billing.nextBillingDate && (
                <div>
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {billing.status === 'trialing' ? 'Trial ends' : 'Next bill'}
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {new Date((billing.nextBillingDate as any).toDate?.() ?? billing.nextBillingDate)
                      .toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              )}
            </>
          )}
          <div>
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Members</p>
            <p className="text-sm font-bold text-foreground flex items-center justify-end gap-1.5">
              {memberCount}
              <span className="text-[9px] font-medium text-muted-foreground">
                /{allocatedSeatsDisplay}
              </span>
              {graceInfo?.isGracePeriodActive && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                  Grace ({graceInfo.graceDaysRemaining}d)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Annual bonus */}
      {billing.annualBonusActivated && (
        <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
          <Gift className="h-3 w-3 shrink-0" />
          Guild HR & Accounting (Upcoming) — 1 yr free access included
        </div>
      )}
    </Card>
  );
}

// ─── Seat bar (free plan) ──────────────────────────────────────────────────────
function SeatBar({ memberCount, graceInfo }: { memberCount: number; graceInfo?: GracePeriodInfo }) {
  const maxSeats = graceInfo?.allocatedSeats && graceInfo.allocatedSeats !== Infinity ? graceInfo.allocatedSeats : FREE_SEAT_LIMIT;
  const pct = Math.min((memberCount / maxSeats) * 100, 100);
  const atLimit = memberCount >= maxSeats;
  const inGrace = graceInfo?.isGracePeriodActive;
  const graceExpired = graceInfo?.isGracePeriodExpired;

  return (
    <Card className={atLimit ? 'border-amber-400/30 bg-amber-50/50 dark:bg-amber-500/[0.04]' : ''}>
      <div className="flex items-center mb-2.5">
        <div className="flex items-center gap-2">
          <Users className={cn('h-3.5 w-3.5', atLimit ? (graceExpired ? 'text-rose-500' : 'text-amber-500') : 'text-muted-foreground')} />
          <span className={cn('text-[11px] font-semibold', atLimit ? (graceExpired ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400') : 'text-foreground')}>
            {inGrace
              ? `${memberCount} / ${maxSeats} members (${graceInfo.overageCount} in grace · ${graceInfo.graceDaysRemaining}d remaining)`
              : graceExpired
              ? `${memberCount} / ${maxSeats} members (Grace period expired)`
              : atLimit
              ? 'Member limit reached'
              : `${memberCount} / ${maxSeats} members`}
          </span>
        </div>
      </div>
      <div className="h-1 w-full rounded-full bg-border overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', atLimit ? (graceExpired ? 'bg-rose-500' : 'bg-amber-500') : 'bg-accent')}
          style={{ background: atLimit ? undefined : 'var(--accent)' }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </Card>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ title, badge, price, priceSub, features, cta, ctaVariant = 'accent',
  highlighted, bonus, countdownLabel, disabled, onSelect }: {
  title: string; badge?: string; price: string; priceSub?: string;
  features: string[]; cta: string;
  ctaVariant?: 'accent' | 'ghost' | 'sky';
  highlighted?: boolean; bonus?: string; countdownLabel?: string;
  disabled?: boolean; onSelect: () => void;
}) {
  const ctaClass = {
    accent: 'bg-accent text-accent-foreground hover:opacity-90',
    ghost: 'bg-muted text-muted-foreground border border-border cursor-default',
    sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-400/30 hover:bg-sky-500/20',
  }[ctaVariant];

  return (
    <div className={cn(
      'relative rounded-2xl border flex flex-col transition-all duration-200',
      highlighted
        ? 'border-accent/25 bg-accent/[0.03] shadow-sm'
        : 'border-border bg-card hover:border-border-strong'
    )}>
      {highlighted && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-accent text-accent-foreground text-[9px] font-bold uppercase tracking-wider rounded-full shadow">
            <Star className="h-2 w-2" /> Best value
          </span>
        </div>
      )}

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
            {badge && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                {badge}
              </span>
            )}
          </div>
          <p className="text-2xl font-black text-foreground leading-none">{price}</p>
          {priceSub && <p className="text-[10px] text-muted-foreground">{priceSub}</p>}
        </div>

        {/* Bonus pill */}
        {bonus && (
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            <Gift className="h-3 w-3 shrink-0" /> {bonus}
          </div>
        )}

        {/* Countdown */}
        {countdownLabel && (
          <div className="flex items-center gap-1.5 text-[9px] font-semibold text-rose-500 dark:text-rose-400">
            <Clock className="h-3 w-3" /> {countdownLabel}
          </div>
        )}

        {/* Features */}
        <ul className="space-y-1.5 flex-1">
          {features.map(f => (
            <li key={f} className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> {f}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <button
          onClick={onSelect} disabled={disabled}
          className={cn(
            'w-full py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            ctaClass
          )}
        >
          {cta} {ctaVariant !== 'ghost' && <ArrowRight className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

// ─── Credit Pack Card ─────────────────────────────────────────────────────────
function CreditPackCard({ title, price, credited, bonusPct, includesBonus,
  highlighted, processing, onTopUp }: {
  title: string; price: string; credited: string; bonusPct: string;
  includesBonus?: boolean; highlighted?: boolean;
  processing: boolean; onTopUp: () => void;
}) {
  return (
    <div className={cn(
      'relative rounded-2xl border flex flex-col',
      highlighted
        ? 'border-accent/25 bg-accent/[0.03] shadow-sm'
        : 'border-border bg-card'
    )}>
      {highlighted && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-accent text-accent-foreground text-[9px] font-bold uppercase tracking-wider rounded-full shadow">
            <Gift className="h-2 w-2" /> Includes bonus
          </span>
        </div>
      )}
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-foreground">{price}</p>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">+{bonusPct}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            You get <span className="font-semibold text-foreground">{credited}</span> in wallet
          </p>
        </div>

        <ul className="space-y-1.5">
          {[
            'Credits deducted per active seat',
            'Credits roll over',
            includesBonus ? '1yr free access to upcoming HR & Accounting' : 'Add members anytime',
          ].map(f => (
            <li key={f} className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={onTopUp} disabled={processing}
          className={cn(
            'w-full py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            highlighted
              ? 'bg-accent text-accent-foreground hover:opacity-90'
              : 'bg-muted border border-border text-foreground hover:bg-muted/80'
          )}
        >
          {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Top up <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function BillingSettingsView({ profile }: BillingSettingsViewProps) {
  const orgId = profile.organizationId;
  const currency = detectCurrency();
  const pricing = getPricing(currency);
  const countdown = useCountdown(ANNUAL_OFFER_END);
  const { billing, loading, memberCount, graceInfo, transactions, transactionsLoading,
    creditBalanceDisplay, creditMonthsRemaining } = useBilling(orgId, currency);

  const [tab, setTab] = React.useState<'plans' | 'credits'>('plans');
  const [cycle, setCycle] = React.useState<'monthly' | 'annual'>('annual');
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [promoCodeInput, setPromoCodeInput] = React.useState('');

  const minSeats = Math.max(memberCount, 1);

  // Seat configuration & coupon modal state
  const [subscribeCycle, setSubscribeCycle] = React.useState<'monthly' | 'annual' | null>(null);
  const [selectedSeats, setSelectedSeats] = React.useState<number>(minSeats);
  const [appliedCoupon, setAppliedCoupon] = React.useState<string>('');
  const [modalCouponInput, setModalCouponInput] = React.useState<string>('');
  const [modalCouponError, setModalCouponError] = React.useState<string | null>(null);

  const nextBillingDateVal = billing?.nextBillingDate
    ? ((billing.nextBillingDate as any).toDate?.() ?? new Date((billing.nextBillingDate as any)))
    : null;
  const isTrialExpired = billing?.status === 'trialing' && nextBillingDateVal && nextBillingDateVal.getTime() < Date.now();

  const plan = isTrialExpired ? 'free' : (billing?.plan ?? 'free');
  const seats = Math.max(memberCount, 1);

  const countdownStr = countdown.expired ? '' : 'Limited time offer';

  const handleOpenSubscribeModal = (c: 'monthly' | 'annual') => {
    setSelectedSeats(Math.max(memberCount, 1));
    setModalCouponError(null);
    setSubscribeCycle(c);
  };

  const handleApplyModalCoupon = () => {
    const raw = modalCouponInput.trim().toUpperCase();
    if (!raw) return;
    const validation = validatePromoCoupon(raw);
    if (validation.valid && validation.coupon) {
      setAppliedCoupon(validation.coupon.code);
      setModalCouponError(null);
      setModalCouponInput('');
    } else {
      setModalCouponError("Invalid promo code. Please check and try again.");
    }
  };

  const handleRemoveModalCoupon = () => {
    setAppliedCoupon('');
    setModalCouponError(null);
  };

  const handleRedeemMainCode = async () => {
    if (!orgId || !promoCodeInput.trim()) return;
    const cleanCode = promoCodeInput.trim().toUpperCase();

    // 1. Check if it's a promotional coupon
    const couponCheck = validatePromoCoupon(cleanCode);
    if (couponCheck.valid && couponCheck.coupon) {
      setAppliedCoupon(couponCheck.coupon.code);
      setSuccess(`🎉 Promo code applied! ${couponCheck.coupon.discountPercent}% discount unlocked on Pro plans.`);
      setPromoCodeInput('');
      setSelectedSeats(Math.max(memberCount, 1));
      setSubscribeCycle('annual');
      return;
    }

    // 2. Check if it's a 7-day Pro trial code
    if (cleanCode === 'GUILD100') {
      setProcessing(true);
      setError(null);
      try {
        await activateTrial({ orgId, currency, trialCode: cleanCode });
        setSuccess('7-day Pro trial successfully activated!');
        setPromoCodeInput('');
      } catch (e: any) {
        setError(e?.message ?? 'Failed to activate trial. Please try again.');
      } finally {
        setProcessing(false);
      }
      return;
    }

    setError("Invalid promo code or trial voucher. Please check and try again.");
  };

  const confirmSubscribe = async () => {
    if (!orgId || !subscribeCycle) return;
    const c = subscribeCycle;
    const seatsToBuy = Math.max(selectedSeats, minSeats);
    setSubscribeCycle(null);
    setProcessing(true);
    setError(null);

    try {
      const baseTotal = seatsToBuy * (c === 'annual' ? pricing.annualTotal : pricing.monthly);
      const couponResult = applyPromoCoupon(appliedCoupon, baseTotal);
      const finalPayable = couponResult.valid ? couponResult.finalAmount : baseTotal;

      const desc = couponResult.valid
        ? `Guild Pro ${c === 'annual' ? 'Annual' : 'Monthly'} (${seatsToBuy} seats) — ${couponResult.coupon?.name} (${couponResult.discountPercent}% OFF)`
        : `Guild Pro ${c === 'annual' ? 'Annual' : 'Monthly'} (${seatsToBuy} seats)`;

      const res = await openRazorpayCheckout({
        amountInSmallestUnit: toSmallestUnit(finalPayable, currency),
        currency,
        receipt: `sub_${orgId}_${Date.now()}`,
        description: desc,
        userName: profile.fullName,
        userEmail: profile.email,
      });

      await activateSubscription({
        orgId,
        plan: c === 'annual' ? 'pro_annual' : 'pro_monthly',
        seats: seatsToBuy,
        currency,
        razorpayPaymentId: res.razorpay_payment_id,
        razorpayOrderId: res.razorpay_order_id,
        razorpaySignature: res.razorpay_signature,
        appliedCoupon: couponResult.valid ? couponResult.coupon?.code : null,
        discountPercent: couponResult.valid ? couponResult.discountPercent : null,
        paidAmount: finalPayable,
      });

      const couponNotice = couponResult.valid ? ` with ${couponResult.discountPercent}% promo discount!` : '!';
      setSuccess(`You're now on Pro ${c === 'annual' ? 'Annual' : 'Monthly'}${couponNotice}`);
    } catch (e: any) {
      if (e?.message !== 'Payment cancelled') setError(e?.message ?? 'Payment failed. Try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleTopUp = async (packId: 'starter' | 'growth') => {
    if (!orgId) return;
    setProcessing(true); setError(null);
    try {
      const paid = packId === 'growth' ? pricing.creditGrowthPrice : pricing.creditStarterPrice;
      const credited = packId === 'growth' ? pricing.creditGrowthBonus : pricing.creditStarterBonus;
      const res = await openRazorpayCheckout({
        amountInSmallestUnit: toSmallestUnit(paid, currency),
        currency, receipt: `topup_${orgId}_${Date.now()}`,
        description: `Guild Credits — ${packId === 'growth' ? 'Growth' : 'Starter'}`,
        userName: profile.fullName, userEmail: profile.email,
      });
      await activateCreditTopUp({
        orgId, packId, currency,
        razorpayPaymentId: res.razorpay_payment_id,
        razorpayOrderId: res.razorpay_order_id,
      });
      setSuccess(`${formatMoney(credited, currency)} added to your wallet`);
    } catch (e: any) {
      if (e?.message !== 'Payment cancelled') setError(e?.message ?? 'Payment failed. Try again.');
    } finally { setProcessing(false); }
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-5 transform-gpu backface-hidden" style={{ transform: 'translate3d(0,0,0)', backfaceVisibility: 'hidden' }}>
      {/* Toast */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-400/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />{success}
            <button onClick={() => setSuccess(null)} className="ml-auto opacity-50 hover:opacity-100 text-xs cursor-pointer">✕</button>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-2.5 p-3 rounded-xl border border-red-400/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-[11px] font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{error}
            <button onClick={() => setError(null)} className="ml-auto opacity-50 hover:opacity-100 text-xs cursor-pointer">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current plan (if active) */}
      {billing && (
        <CurrentPlanStrip billing={billing} memberCount={memberCount}
          creditBalanceDisplay={creditBalanceDisplay}
          currency={currency}
          graceInfo={graceInfo} />
      )}

      {/* Grace Period Alert Banner (Dual-Theme Parity) */}
      {graceInfo.isOverage && (
        <Card className={cn(
          'border transition-all',
          graceInfo.isGracePeriodActive
            ? 'border-amber-500/30 bg-amber-500/10 text-foreground'
            : 'border-rose-500/30 bg-rose-500/10 text-foreground'
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={cn(
                'p-2 rounded-xl mt-0.5 shrink-0',
                graceInfo.isGracePeriodActive
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
              )}>
                <Clock className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={cn(
                    'text-xs font-bold',
                    graceInfo.isGracePeriodActive
                      ? 'text-amber-800 dark:text-amber-300'
                      : 'text-rose-800 dark:text-rose-300'
                  )}>
                    {graceInfo.isGracePeriodActive ? 'Grace Period Active' : 'Grace Period Expired'}
                  </h4>
                  {graceInfo.isGracePeriodActive && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      {graceInfo.graceDaysRemaining} day{graceInfo.graceDaysRemaining !== 1 ? 's' : ''} left
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {graceInfo.isGracePeriodActive
                    ? `Your workspace has ${memberCount} active members on a ${graceInfo.allocatedSeats}-seat plan (${graceInfo.overageCount} newly joined). Upgrade or add seats before the grace period ends to maintain uninterrupted access.`
                    : `Your workspace has ${memberCount} active members, exceeding your ${graceInfo.allocatedSeats}-seat plan limit. Please upgrade your seats to maintain full workspace access.`}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOpenSubscribeModal(cycle)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm',
                graceInfo.isGracePeriodActive
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              )}
            >
              Upgrade Seats <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </Card>
      )}

      {/* Free seat bar */}
      {plan === 'free' && <SeatBar memberCount={memberCount} graceInfo={graceInfo} />}

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-muted border border-border p-1">
        {([['plans', 'Plans', Zap], ['credits', 'Credit Wallet', Wallet]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
              tab === id
                ? 'bg-background text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            )}>
            <Icon className="h-3 w-3" />{label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── PLANS ─── */}
        {tab === 'plans' && (
          <motion.div key="plans" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="space-y-4">

            {/* Cycle toggle */}
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5 rounded-lg bg-muted border border-border p-0.5">
                {(['monthly', 'annual'] as const).map(c => (
                  <button key={c} onClick={() => setCycle(c)}
                    className={cn(
                      'px-3 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer',
                      cycle === c ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
                    )}>
                    {c === 'annual' ? <span>Annual <span className="text-emerald-500 font-bold">−50%</span></span> : 'Monthly'}
                  </button>
                ))}
              </div>
              {cycle === 'annual' && !countdown.expired && (
                <span className="flex items-center gap-1 text-[9px] font-semibold text-rose-500 dark:text-rose-400">
                  <Clock className="h-2.5 w-2.5" />{countdownStr}
                </span>
              )}
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <PlanCard
                title="Free"
                price={currency === 'INR' ? '₹0' : '$0'}
                priceSub="Up to 5 members"
                features={[
                  `${FREE_SEAT_LIMIT} seats`,
                  'Chat & team channels',
                  'Task & project management',
                  'Request management',
                ]}
                cta={plan === 'free' ? 'Current plan' : 'Downgrade'}
                ctaVariant="ghost"
                disabled={plan !== 'free' || processing}
                onSelect={() => {}}
              />
              <PlanCard
                title="Pro"
                highlighted
                badge={cycle === 'annual' && !countdown.expired ? '−50%' : undefined}
                price={cycle === 'annual'
                  ? `${formatMoney(pricing.annual, currency)}/mo`
                  : `${formatMoney(pricing.monthly, currency)}/mo`}
                priceSub={cycle === 'annual'
                  ? `Billed annually (${formatMoney(pricing.annualTotal, currency)}/seat/year)`
                  : `Billed monthly (${formatMoney(pricing.monthly, currency)}/seat/month)`}
                features={[
                  'Scale seats as your team grows',
                  'Chat & team channels',
                  'Task & project management',
                  'Request management',
                  'Access to Guild Orbit Admin panel',
                  'Priority support',
                  ...(cycle === 'annual' ? ['1yr free access to upcoming HR & Accounting'] : []),
                ]}
                bonus={cycle === 'annual' ? '1 yr free access to upcoming HR & Accounting' : undefined}
                countdownLabel={cycle === 'annual' && !countdown.expired ? countdownStr : undefined}
                cta={processing ? 'Processing…' : `Get Pro ${cycle === 'annual' ? 'Annual' : 'Monthly'}`}
                disabled={processing || (plan === (cycle === 'annual' ? 'pro_annual' : 'pro_monthly') && billing?.status !== 'trialing')}
                onSelect={() => handleOpenSubscribeModal(cycle)}
              />
              <PlanCard
                title="Enterprise"
                price="Custom"
                priceSub="100+ members"
                features={['Volume pricing', 'Dedicated support', 'Custom onboarding']}
                cta="Contact us"
                ctaVariant="sky"
                onSelect={() => window.open(ENTERPRISE_CONTACT_URL, '_blank')}
              />
            </div>

            {/* Promotional Code & Voucher Section (Obfuscated) */}
            {plan === 'free' && (
              <Card className="mt-4 border-violet-500/20 bg-violet-500/[0.02]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-violet-500" />
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Have a Promo Code or Voucher?
                      </h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Enter your redemption code or promotional voucher to apply special discounts to your subscription.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      placeholder="Enter code"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value)}
                      disabled={processing}
                      className="w-40 px-3 py-1.5 text-[11px] font-mono font-bold bg-background border border-border rounded-xl focus:outline-none focus:border-violet-500 uppercase text-foreground placeholder:text-muted-foreground/50"
                    />
                    <button
                      onClick={handleRedeemMainCode}
                      disabled={processing || !promoCodeInput.trim()}
                      className="px-4 py-1.5 rounded-xl text-[11px] font-bold bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Apply
                    </button>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* ── CREDITS ─── */}
        {tab === 'credits' && (
          <motion.div key="credits" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="space-y-4">

            {/* How it works — one-liner */}
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-muted">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-foreground">Top up once, use as you grow</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatMoney(pricing.monthly, currency)}/seat/month deducted automatically. Add members anytime.
                  </p>
                </div>
              </div>
              {plan === 'credit' && (
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Wallet balance</span>
                  <span className="text-sm font-bold text-foreground">{formatMoney(creditBalanceDisplay, currency)}</span>
                </div>
              )}
            </Card>

            {/* Packs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CreditPackCard
                title="Starter"
                price={formatMoney(pricing.creditStarterPrice, currency)}
                credited={formatMoney(pricing.creditStarterBonus, currency)}
                bonusPct="10% bonus"
                processing={processing}
                onTopUp={() => handleTopUp('starter')}
              />
              <CreditPackCard
                title="Growth"
                highlighted
                price={formatMoney(pricing.creditGrowthPrice, currency)}
                credited={formatMoney(pricing.creditGrowthBonus, currency)}
                bonusPct="20% bonus"
                includesBonus
                processing={processing}
                onTopUp={() => handleTopUp('growth')}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HISTORY ─── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          <History className="h-3 w-3" /> History
        </div>
        {transactionsLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : transactions.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 py-8 text-center">
            <p className="text-[11px] text-muted-foreground">No payments yet</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {transactions.map((tx, i) => (
              <div key={tx.razorpayPaymentId ?? i}
                className={cn('flex items-center justify-between px-4 py-3 bg-card', i !== 0 && 'border-t border-border')}>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-foreground truncate">{tx.description}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {tx.createdAt && (tx.createdAt as any).toDate
                      ? new Date((tx.createdAt as any).toDate()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className={cn('text-[11px] font-bold',
                    tx.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                    {tx.type === 'deduction' ? '−' : '+'}{formatMoney(tx.amount / 100, tx.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seat Config & Coupon Modal */}
      <AnimatePresence>
        {subscribeCycle && (() => {
          const baseTotal = selectedSeats * (subscribeCycle === 'annual' ? pricing.annualTotal : pricing.monthly);
          const couponResult = applyPromoCoupon(appliedCoupon, baseTotal);
          const isCouponActive = couponResult.valid;
          const finalPayable = isCouponActive ? couponResult.finalAmount : baseTotal;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5"
              >
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-foreground">
                    Configure Pro {subscribeCycle === 'annual' ? 'Annual' : 'Monthly'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Select the number of seats for your organization.
                  </p>
                </div>

                {/* Seat control input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-muted/50 border border-border">
                    <span className="text-[11px] font-semibold text-foreground">Number of seats</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedSeats(s => Math.max(minSeats, s - 1))}
                        disabled={selectedSeats <= minSeats}
                        className="p-1 rounded bg-background border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs w-6 h-6 flex items-center justify-center text-foreground cursor-pointer"
                        title={selectedSeats <= minSeats ? `Minimum ${minSeats} seats required for your current team` : undefined}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={minSeats}
                        value={selectedSeats}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setSelectedSeats(isNaN(val) ? minSeats : Math.max(minSeats, val));
                        }}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (isNaN(val) || val < minSeats) setSelectedSeats(minSeats);
                        }}
                        className="w-12 text-center text-[11px] font-bold bg-background border border-border rounded py-0.5 focus:outline-none focus:border-accent text-foreground"
                      />
                      <button
                        onClick={() => setSelectedSeats(s => s + 1)}
                        className="p-1 rounded bg-background border border-border hover:bg-muted font-bold text-xs w-6 h-6 flex items-center justify-center text-foreground cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-0.5">
                    Minimum {minSeats} seat{minSeats > 1 ? 's' : ''} required to cover your current team ({memberCount} member{memberCount !== 1 ? 's' : ''}).
                  </p>
                </div>

                {/* Coupon Code Section */}
                <div className="space-y-2">
                  {isCouponActive ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold">
                            Coupon Applied!
                          </p>
                          <p className="text-[9px] text-emerald-600 dark:text-emerald-400">
                            {couponResult.discountPercent}% promotional discount active
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveModalCoupon}
                        className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                        title="Remove coupon"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Enter promo code"
                          value={modalCouponInput}
                          onChange={(e) => {
                            setModalCouponInput(e.target.value);
                            if (modalCouponError) setModalCouponError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleApplyModalCoupon();
                          }}
                          className="flex-1 px-3 py-1.5 text-[11px] font-mono font-bold bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-accent uppercase text-foreground placeholder:text-muted-foreground/50"
                        />
                        <button
                          onClick={handleApplyModalCoupon}
                          disabled={!modalCouponInput.trim()}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-muted hover:bg-muted/80 text-foreground border border-border disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                      {modalCouponError && (
                        <p className="text-[10px] text-rose-500 font-medium pl-1">
                          {modalCouponError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Details & Live calculation */}
                <div className="space-y-2 text-[10px] text-muted-foreground border-t border-border pt-4">
                  <div className="flex justify-between">
                    <span>Current organization size:</span>
                    <span className="font-semibold text-foreground">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price per seat:</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(subscribeCycle === 'annual' ? pricing.annualTotal : pricing.monthly, currency)}
                      {subscribeCycle === 'annual' ? '/yr' : '/mo'}
                    </span>
                  </div>

                  {isCouponActive && (
                    <>
                      <div className="flex justify-between">
                        <span>Original total:</span>
                        <span className="line-through text-muted-foreground">
                          {formatMoney(baseTotal, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                        <span>Promo Discount (−{couponResult.discountPercent}%):</span>
                        <span>−{formatMoney(couponResult.discountAmount, currency)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between text-[11px] font-bold text-foreground border-t border-border/50 pt-2 items-baseline">
                    <span>Total amount:</span>
                    <div className="text-right">
                      {isCouponActive && (
                        <span className="text-[9px] line-through text-muted-foreground mr-1.5 font-normal">
                          {formatMoney(baseTotal, currency)}
                        </span>
                      )}
                      <span className={cn('text-sm font-black', isCouponActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-accent')} style={isCouponActive ? undefined : { color: 'var(--accent)' }}>
                        {formatMoney(finalPayable, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSubscribeCycle(null)}
                    className="flex-1 py-2 rounded-xl text-[11px] font-bold border border-border text-foreground hover:bg-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSubscribe}
                    className="flex-1 py-2 rounded-xl text-[11px] font-bold bg-accent text-accent-foreground hover:opacity-90 flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                  >
                    Pay {formatMoney(finalPayable, currency)} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Processing overlay */}
      <AnimatePresence>
        {processing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-accent" style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-semibold text-foreground">Processing payment…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
