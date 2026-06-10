import { useState } from 'react';
import { Check, Star, ArrowRight } from 'lucide-react';
import { APP_URL } from '../../config/landingData';
import { ScrollReveal } from './ScrollReveal';

export function PricingCards() {
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('annual');

  return (
    <div className="space-y-12">
      {/* Controls */}
      <ScrollReveal>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
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

          {/* Currency */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-faint font-medium">
              Currency:
            </span>
            <div className="flex gap-1 bg-surface rounded-lg border border-line p-0.5">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-all ${
                  currency === 'USD'
                    ? 'bg-page text-ink shadow-sm'
                    : 'text-ink-light hover:text-ink'
                }`}
              >
                USD
              </button>
              <button
                onClick={() => setCurrency('INR')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-all ${
                  currency === 'INR'
                    ? 'bg-page text-ink shadow-sm'
                    : 'text-ink-light hover:text-ink'
                }`}
              >
                INR
              </button>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
        {/* Free */}
        <ScrollReveal delay={0}>
          <div className="glass rounded-2xl p-7 flex flex-col h-full">
            <p className="text-xs font-semibold text-ink-faint mb-2">Free</p>
            <p className="text-4xl font-bold text-ink">
              {currency === 'INR' ? '₹0' : '$0'}
            </p>
            <p className="text-xs text-ink-faint mt-1 mb-6">
              Up to 5 members
            </p>

            <div className="h-px bg-line mb-6" />

            <ul className="space-y-3 flex-grow mb-8">
              {[
                '5 seat limit',
                '10 MB storage',
                'Chat channels & DMs',
                'Kanban task boards',
                'Leave & expense requests',
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-ink-light"
                >
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={`${APP_URL}/signup`}
              className="w-full text-center py-2.5 rounded-xl text-sm font-medium text-ink border border-line hover:bg-surface transition-all"
            >
              Get started
            </a>
          </div>
        </ScrollReveal>

        {/* Pro */}
        <ScrollReveal delay={0.08}>
          <div className="glass rounded-2xl p-7 flex flex-col h-full border-accent/20 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-semibold px-3 py-1 rounded-full flex items-center gap-1 shadow-md shadow-accent/20">
              <Star className="h-3 w-3 fill-white" />
              Best value
            </div>

            <p className="text-xs font-semibold text-accent mt-1 mb-2">Pro</p>
            <div className="flex items-baseline">
              <p className="text-4xl font-bold text-ink">
                {currency === 'INR'
                  ? cycle === 'annual'
                    ? '₹249'
                    : '₹499'
                  : cycle === 'annual'
                    ? '$4'
                    : '$8'}
              </p>
              <span className="text-sm text-ink-light ml-1.5">
                / seat / mo
              </span>
            </div>
            <p className="text-xs text-ink-faint mt-1 mb-6">
              {cycle === 'annual' ? 'Billed annually' : 'Billed monthly'}
            </p>

            <div className="h-px bg-accent/10 mb-6" />

            <ul className="space-y-3 flex-grow mb-8">
              {[
                'Unlimited seats',
                'Everything in Free',
                'Full admin panel',
                'Priority support',
                'Standard SLA',
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-ink-light"
                >
                  <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={`${APP_URL}/signup`}
              className="w-full text-center py-2.5 rounded-xl text-sm font-medium text-white bg-accent hover:bg-accent-dark transition-all flex items-center justify-center gap-1.5 shadow-md shadow-accent/15"
            >
              Upgrade to Pro
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </ScrollReveal>

        {/* Enterprise */}
        <ScrollReveal delay={0.16}>
          <div className="glass rounded-2xl p-7 flex flex-col h-full">
            <p className="text-xs font-semibold text-ink-faint mb-2">
              Enterprise
            </p>
            <p className="text-4xl font-bold text-ink">Custom</p>
            <p className="text-xs text-ink-faint mt-1 mb-6">
              For teams with 100+ seats
            </p>

            <div className="h-px bg-line mb-6" />

            <ul className="space-y-3 flex-grow mb-8">
              {[
                'Volume discounts',
                'Dedicated success manager',
                'Custom onboarding',
                'Custom SLAs & security',
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-ink-light"
                >
                  <Check className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href="mailto:enterprise@guildhq.com"
              className="w-full text-center py-2.5 rounded-xl text-sm font-medium text-sky-600 bg-sky-50 border border-sky-100 hover:bg-sky-100 transition-all"
            >
              Contact sales
            </a>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
