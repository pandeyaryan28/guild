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
    // ignore — default to USD
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
    </div>
  );
}
