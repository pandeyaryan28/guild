import { useState } from 'react';
import { Check, Star, ArrowRight } from 'lucide-react';
import { APP_URL } from '../../config/landingData';
import { ScrollReveal } from './ScrollReveal';

const INDIA_TIMEZONES = new Set([
  'Asia/Kolkata',
  'Asia/Calcutta', // legacy alias used by some OS/browsers
  'IST',
]);

function detectCurrency(): 'USD' | 'INR' {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && INDIA_TIMEZONES.has(tz)) return 'INR';
    
    // Secondary signals
    const lang = navigator.language || '';
    if (lang === 'en-IN' || lang.endsWith('-IN')) return 'INR';
  } catch {
    // ignore, default to USD
  }
  return 'USD';
}

const PRICING = {
  INR: {
    monthly: 499,          // ₹ per seat per month
    annual: 249.5,         // ₹ per seat per month billed annually (50% off)
    annualTotal: 2994,     // ₹ per seat per year
    symbol: '₹',
  },
  USD: {
    monthly: 8.12,         // $ per seat per month
    annual: 4.06,          // $ per seat per month billed annually (50% off)
    annualTotal: 48.72,    // $ per seat per year
    symbol: '$',
  },
} as const;

function formatMoney(amount: number, currency: 'USD' | 'INR'): string {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PricingCards() {
  const [currency] = useState<'USD' | 'INR'>(() => detectCurrency());
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('annual');

  return (
    <div className="space-y-12">
      {/* Controls */}
      <ScrollReveal>
        <div className="flex items-center justify-center">
          {/* Billing cycle */}
          <div className="flex gap-1 bg-surface rounded-xl border border-line p-1">
            <button
              onClick={() => setCycle('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                cycle === 'monthly'
                  ? 'bg-page text-ink shadow-sm'
                  : 'text-ink-light hover:text-ink'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setCycle('annual')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                cycle === 'annual'
                  ? 'bg-page text-ink shadow-sm'
                  : 'text-ink-light hover:text-ink'
              }`}
            >
              Annual
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                -50%
              </span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch px-4">
        {/* Free */}
        <ScrollReveal delay={0}>
          <div className="glass rounded-3xl p-8 flex flex-col h-full hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-indigo-100/5 hover:shadow-2xl">
            <p className="text-xs font-bold text-ink-faint uppercase tracking-wider mb-2">Free</p>
            <p className="text-4xl font-extrabold text-ink">
              {currency === 'INR' ? '₹0' : '$0'}
            </p>
            <p className="text-xs font-semibold text-ink-faint mt-1.5 mb-6">
              Up to 5 members
            </p>

            <div className="h-px bg-line mb-6" />

            <ul className="space-y-4 flex-grow mb-8">
              {[
                '5 seats limit',
                'Chat & team channels',
                'Task & project management',
                'Request management',
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-ink-light font-medium"
                >
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={APP_URL}
              className="w-full text-center py-3 rounded-xl text-sm font-semibold text-ink border border-line hover:bg-white/40 transition-all cursor-pointer"
            >
              Get started
            </a>
          </div>
        </ScrollReveal>

        {/* Pro */}
        <ScrollReveal delay={0.08}>
          <div className="glass rounded-3xl p-8 flex flex-col h-full border-accent/25 relative hover:scale-[1.03] hover:-translate-y-1.5 transition-all duration-300 shadow-2xl shadow-indigo-500/10 ring-1 ring-accent/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full flex items-center gap-1 shadow-md shadow-accent/20">
              <Star className="h-3 w-3 fill-white" />
              Best value
            </div>

            <p className="text-xs font-bold text-accent uppercase tracking-wider mt-1 mb-2">Pro</p>
            <div className="flex items-baseline">
              <p className="text-4xl font-extrabold text-ink">
                {formatMoney(
                  cycle === 'annual' ? PRICING[currency].annual : PRICING[currency].monthly,
                  currency
                )}
              </p>
              <span className="text-sm font-semibold text-ink-light ml-1.5">
                / seat / mo
              </span>
            </div>
            <p className="text-xs font-semibold text-ink-faint mt-1.5 mb-6">
              {cycle === 'annual'
                ? `Billed annually (${formatMoney(PRICING[currency].annualTotal, currency)}/seat/year)`
                : 'Billed monthly'}
            </p>

            <div className="h-px bg-accent/10 mb-6" />

            <ul className="space-y-4 flex-grow mb-8">
              {[
                'Scale seats as your team grows',
                'Chat & team channels',
                'Task & project management',
                'Request management',
                'Access to Guild Orbit Admin panel',
                'Priority support',
                ...(cycle === 'annual' ? ['1yr free access to upcoming HR & Accounting'] : []),
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-ink-light font-medium"
                >
                  <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={APP_URL}
              className="w-full text-center py-3 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent-dark transition-all flex items-center justify-center gap-1.5 shadow-md shadow-accent/15 cursor-pointer"
            >
              Upgrade to Pro
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </ScrollReveal>

        {/* Enterprise */}
        <ScrollReveal delay={0.16}>
          <div className="glass rounded-3xl p-8 flex flex-col h-full hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-indigo-100/5 hover:shadow-2xl">
            <p className="text-xs font-bold text-ink-faint uppercase tracking-wider mb-2">
              Enterprise
            </p>
            <p className="text-4xl font-extrabold text-ink">Custom</p>
            <p className="text-xs font-semibold text-ink-faint mt-1.5 mb-6">
              For teams with 100+ seats
            </p>

            <div className="h-px bg-line mb-6" />

            <ul className="space-y-4 flex-grow mb-8">
              {[
                'Volume pricing',
                'Dedicated support',
                'Custom onboarding',
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-ink-light font-medium"
                >
                  <Check className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href="mailto:enterprise@guildhq.com"
              className="w-full text-center py-3 rounded-xl text-sm font-semibold text-sky-700 bg-sky-50 border border-sky-100 hover:bg-sky-100 transition-all cursor-pointer"
            >
              Contact sales
            </a>
          </div>
        </ScrollReveal>
      </div>

      {/* Divider */}
      <ScrollReveal>
        <div className="max-w-5xl mx-auto py-8">
          <div className="h-px bg-slate-200/60 w-full" />
        </div>
      </ScrollReveal>

      {/* Credit Wallet Section */}
      <ScrollReveal>
        <div className="max-w-4xl mx-auto space-y-8 px-4 pb-12">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-full">
              Credit Wallet System
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              Prepay Once, Use as You Grow
            </h2>
            <p className="text-xs md:text-sm font-semibold text-slate-500 max-w-xl mx-auto leading-relaxed">
              Prefer a prepaid model instead of fixed recurring billing? Fund a shared team wallet with Credit Packs and deduct seat consumption automatically.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 items-stretch">
            {/* Starter Credit Pack */}
            <div className="glass rounded-3xl p-6 border border-white/50 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Starter Pack</span>
                <div className="flex items-baseline gap-2 mt-2 mb-4">
                  <p className="text-3xl font-black text-slate-900">
                    {currency === 'INR' ? '₹50,000' : '$500'}
                  </p>
                  <span className="text-xs font-semibold text-slate-400">one time top up</span>
                </div>
                <div className="bg-indigo-50 border border-indigo-100/50 rounded-xl p-3 text-[11px] font-bold text-indigo-700 flex items-center justify-between mb-4">
                  <span>Total Wallet Credit:</span>
                  <span className="text-xs font-black">{currency === 'INR' ? '₹55,000' : '$550'}</span>
                </div>
                <ul className="space-y-2 text-xs font-medium text-slate-500 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>Includes 10% bonus credits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>Dynamic member seat deductions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>Indefinite rollover, credits never expire</span>
                  </li>
                </ul>
              </div>
              <a
                href={APP_URL}
                className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-indigo-650 bg-indigo-50 hover:bg-indigo-100/60 border border-indigo-100/40 transition-colors"
              >
                Purchase Starter Pack
              </a>
            </div>

            {/* Growth Credit Pack */}
            <div className="glass rounded-3xl p-6 border border-indigo-100/30 relative flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md shadow-indigo-600/10">
                Best Value (20% Bonus)
              </div>
              <div className="mt-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">Growth Pack</span>
                <div className="flex items-baseline gap-2 mt-2 mb-4">
                  <p className="text-3xl font-black text-slate-900">
                    {currency === 'INR' ? '₹1,00,000' : '$1,000'}
                  </p>
                  <span className="text-xs font-semibold text-slate-400">one time top up</span>
                </div>
                <div className="bg-indigo-600 text-white rounded-xl p-3 text-[11px] font-bold flex items-center justify-between mb-4 shadow-sm">
                  <span>Total Wallet Credit:</span>
                  <span className="text-xs font-black">{currency === 'INR' ? '₹1,20,000' : '$1,200'}</span>
                </div>
                <ul className="space-y-2 text-xs font-medium text-slate-500 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>Includes 20% bonus credits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>Priority customer support access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>Indefinite rollover, credits never expire</span>
                  </li>
                </ul>
              </div>
              <a
                href={APP_URL}
                className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/10"
              >
                Purchase Growth Pack
              </a>
            </div>
          </div>

          {/* Details list */}
          <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-2xl grid md:grid-cols-3 gap-6 text-xs text-slate-500 font-semibold leading-relaxed">
            <div>
              <p className="font-extrabold text-slate-800 mb-1">Prepaid Consumption</p>
              Seats are charged dynamically on a monthly basis ({currency === 'INR' ? '₹499' : '$8.12'} per active seat). Only active members draw from the wallet.
            </div>
            <div>
              <p className="font-extrabold text-slate-800 mb-1">Dynamic Seat Scale</p>
              Add or remove members anytime. The billing system automatically scales the consumption rate per-second, refunding unused days as credits.
            </div>
            <div>
              <p className="font-extrabold text-slate-800 mb-1">Zero Expiration</p>
              Prepaid credits remain in your organization's wallet forever. There are no monthly minimums or expiration timelines.
            </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
