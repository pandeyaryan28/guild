import React from 'react';
import { Check, Star, Gift, Wallet, ArrowRight } from 'lucide-react';
import { APP_URL } from '../config/landingData';

export function Pricing() {
  const [currency, setCurrency] = React.useState<'USD' | 'INR'>('USD');
  const [cycle, setCycle] = React.useState<'monthly' | 'annual'>('annual');

  return (
    <div className="pt-28 pb-16 px-6 max-w-[1100px] mx-auto space-y-28">
      {/* Header */}
      <section className="text-center max-w-[700px] mx-auto space-y-4">
        <h1 className="text-4xl md:text-5xl font-black text-text-primary tracking-tight uppercase">
          Flexible & Transparent Pricing
        </h1>
        <p className="text-sm md:text-base text-text-secondary font-medium leading-relaxed">
          Start completely free with your core team. Upgrade to scale or prepay using our credit wallet.
        </p>
      </section>

      {/* Controls: Billing Cycle & Currency Switchers */}
      <section className="flex flex-col sm:flex-row items-center justify-center gap-6 max-w-[600px] mx-auto p-2.5 aether-glass bg-white/20">
        {/* Cycle Toggle */}
        <div className="flex gap-0.5 rounded-xl bg-black/[0.03] border border-border-default/40 p-0.5">
          <button
            onClick={() => setCycle('monthly')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              cycle === 'monthly'
                ? 'bg-white text-text-primary shadow-sm border border-border-default/60'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle('annual')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              cycle === 'annual'
                ? 'bg-white text-text-primary shadow-sm border border-border-default/60'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Annual
            <span className="px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-600 bg-emerald-50 rounded uppercase">
              -50%
            </span>
          </button>
        </div>

        {/* Currency Selector */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Currency:</span>
          <div className="flex gap-0.5 p-0.5 bg-black/[0.03] rounded-lg border border-border-default/40">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3.5 py-1.5 text-[10px] font-extrabold rounded-md cursor-pointer transition-all ${
                currency === 'USD'
                  ? 'bg-white text-text-primary shadow-sm border border-border-default/40'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('INR')}
              className={`px-3.5 py-1.5 text-[10px] font-extrabold rounded-md cursor-pointer transition-all ${
                currency === 'INR'
                  ? 'bg-white text-text-primary shadow-sm border border-border-default/40'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              INR (₹)
            </button>
          </div>
        </div>
      </section>

      {/* Plan Cards Grid */}
      <section className="grid md:grid-cols-3 gap-8 max-w-[1080px] mx-auto items-stretch">
        
        {/* Free Plan */}
        <div className="aether-glass border border-border-default/80 p-8 flex flex-col rounded-[24px]">
          <div className="mb-4">
            <h3 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">Free</h3>
            <div className="flex items-baseline mt-2">
              <span className="text-4xl font-black text-text-primary">
                {currency === 'INR' ? '₹0' : '$0'}
              </span>
            </div>
            <p className="text-[10px] text-text-muted mt-2 font-medium">Up to 5 members free</p>
          </div>
          <div className="h-[1px] bg-border-default/60 my-6" />
          <ul className="space-y-3 flex-grow mb-8 text-left">
            <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
              <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              <span>5 seat limit</span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
              <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              <span>10 MB storage limit</span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
              <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              <span>Chat channels & DMs</span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
              <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              <span>Kanban task boards</span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
              <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              <span>Leave & expense requests</span>
            </li>
          </ul>
          <a
            href={`${APP_URL}/signup`}
            className="w-full text-center py-3 rounded-xl text-xs font-bold text-text-primary border border-border-default hover:bg-black/[0.02] active:scale-98 transition-all"
          >
            Get Started
          </a>
        </div>

        {/* Pro Plan */}
        <div className="aether-glass border border-indigo-200 bg-indigo-50/5 p-8 flex flex-col rounded-[24px] relative shadow-lg">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-white" />
            Best Value
          </div>
          
          <div className="mb-4 mt-2">
            <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
              Pro
              {cycle === 'annual' && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[9px] font-black">
                  -50% Off
                </span>
              )}
            </h3>
            <div className="flex items-baseline mt-2">
              <span className="text-4xl font-black text-text-primary">
                {currency === 'INR'
                  ? (cycle === 'annual' ? '₹249.50' : '₹499')
                  : (cycle === 'annual' ? '$4.06' : '$8.12')}
              </span>
              <span className="text-xs font-semibold text-text-secondary ml-1">/ seat / month</span>
            </div>
            <p className="text-[10px] text-text-muted mt-2 font-medium">
              {cycle === 'annual'
                ? `Billed annually (${currency === 'INR' ? '₹2,994' : '$48.72'}/seat/year)`
                : `Billed monthly (${currency === 'INR' ? '₹499' : '$8.12'}/seat/month)`}
            </p>
          </div>
          
          <div className="h-[1px] bg-indigo-100 my-6" />
          
          {cycle === 'annual' && (
            <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-700 font-bold">
              <Gift className="h-4.5 w-4.5 shrink-0 text-amber-600" />
              <span>Includes 1 Year Free access to upcoming Guild HR & Accounting module!</span>
            </div>
          )}

          <ul className="space-y-3 flex-grow mb-8 text-left">
            <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
              <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span>Unlimited seats</span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
              <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span>Everything in Free</span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
              <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span>Full Guild Orbit Admin panel access</span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
              <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span>Priority email support</span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
              <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span>Standard SLA uptime</span>
            </li>
          </ul>
          <a
            href={`${APP_URL}/signup`}
            className="w-full text-center py-3.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
          >
            Upgrade to Pro
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {/* Enterprise Plan */}
        <div className="aether-glass border border-border-default/80 p-8 flex flex-col rounded-[24px]">
          <div className="mb-4">
            <h3 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">Enterprise</h3>
            <div className="flex items-baseline mt-2">
              <span className="text-4xl font-black text-text-primary">Custom</span>
            </div>
            <p className="text-[10px] text-text-muted mt-2 font-medium">For teams with 100+ seats</p>
          </div>
          <div className="h-[1px] bg-border-default/60 my-6" />
          <ul className="space-y-3 flex-grow mb-8 text-left">
            <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
              <Check className="h-4.5 w-4.5 text-sky-500 shrink-0" />
              <span>Volume-based discount pricing</span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
              <Check className="h-4.5 w-4.5 text-sky-500 shrink-0" />
              <span>Dedicated success manager</span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
              <Check className="h-4.5 w-4.5 text-sky-500 shrink-0" />
              <span>Custom onboarding support</span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
              <Check className="h-4.5 w-4.5 text-sky-500 shrink-0" />
              <span>Custom SLAs & security docs</span>
            </li>
          </ul>
          <a
            href="mailto:enterprise@guildhq.com"
            className="w-full text-center py-3 rounded-xl text-xs font-bold text-sky-600 bg-sky-500/10 border border-sky-400/20 hover:bg-sky-500/20 active:scale-98 transition-all"
          >
            Contact Sales
          </a>
        </div>
      </section>

      {/* Prepaid Credit Wallet info */}
      <section className="max-w-[800px] mx-auto">
        <div className="aether-glass border border-emerald-200 bg-emerald-50/5 p-8 rounded-[24px]">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 mx-auto sm:mx-0">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="space-y-2 text-center sm:text-left">
              <h3 className="text-sm md:text-base font-extrabold text-text-primary uppercase tracking-wide">Prepaid Credit Wallet Option</h3>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">
                Want to avoid monthly subscription invoices? Top up your wallet once and credits will be deducted dynamically at the rate of{' '}
                <span className="font-extrabold text-text-primary">
                  {currency === 'INR' ? '₹499' : '$8.12'}
                </span>{' '}
                per seat per month. Rollover credits never expire.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
