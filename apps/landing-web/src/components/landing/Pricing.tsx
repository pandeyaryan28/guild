import React from 'react';
import { Check, Star, Gift, Wallet, ArrowRight } from 'lucide-react';
import { APP_URL } from '../../config/landingData';

export function Pricing() {
  const [currency, setCurrency] = React.useState<'USD' | 'INR'>('USD');
  const [billingTab, setBillingTab] = React.useState<'plans' | 'credits'>('plans');
  const [cycle, setCycle] = React.useState<'monthly' | 'annual'>('annual');

  return (
    <section id="pricing" className="py-20 px-6 max-w-[1200px] mx-auto scroll-mt-20">
      <div className="text-center max-w-[700px] mx-auto mb-12">
        <h2 className="text-2xl md:text-3.5xl font-black text-text-primary tracking-tight uppercase">
          Flexible & Transparent Pricing
        </h2>
        <p className="text-xs text-text-secondary mt-3 font-medium">
          Start completely free with your core team. Upgrade to scale or prepay using our credit wallet.
        </p>
      </div>

      {/* Pricing Controls: Tab Selector & Currency Toggle */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-[960px] mx-auto mb-10 p-2.5 aether-glass bg-white/20 border-border-default/60">
        
        {/* Billing Tab Switcher */}
        <div className="flex gap-1 w-full md:w-auto p-1 bg-black/[0.03] rounded-xl border border-border-default/40">
          <button
            onClick={() => setBillingTab('plans')}
            className={`flex-1 md:flex-none px-5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              billingTab === 'plans'
                ? 'bg-white text-text-primary shadow-sm border border-border-default/60'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Subscription Plans
          </button>
          <button
            onClick={() => setBillingTab('credits')}
            className={`flex-1 md:flex-none px-5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              billingTab === 'credits'
                ? 'bg-white text-text-primary shadow-sm border border-border-default/60'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Prepaid Credit Wallet
          </button>
        </div>

        {/* Currency Selector */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
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
      </div>

      {/* ── PLANS TAB CONTENT ── */}
      {billingTab === 'plans' && (
        <div className="space-y-8">
          {/* Cycle Toggle */}
          <div className="flex justify-center mb-6">
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
          </div>

          {/* Plan Cards Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-[1080px] mx-auto items-stretch">
            
            {/* Free Plan */}
            <div className="aether-glass border border-border-default/80 p-6 flex flex-col rounded-[24px]">
              <div className="mb-4">
                <h3 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">Free</h3>
                <div className="flex items-baseline mt-2">
                  <span className="text-3xl font-black text-text-primary">
                    {currency === 'INR' ? '₹0' : '$0'}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted mt-1 font-medium">Up to 5 members free</p>
              </div>
              <div className="h-[1px] bg-border-default/60 my-4" />
              <ul className="space-y-3 flex-grow mb-6 text-left">
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
                className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-text-primary border border-border-default hover:bg-black/[0.02] active:scale-98 transition-all"
              >
                Get Started
              </a>
            </div>

            {/* Pro Plan */}
            <div className="aether-glass border border-indigo-200 bg-indigo-50/5 p-6 flex flex-col rounded-[24px] relative shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                <Star className="h-3 w-3 fill-white" />
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
                  <span className="text-3xl font-black text-text-primary">
                    {currency === 'INR'
                      ? (cycle === 'annual' ? '₹249.50' : '₹499')
                      : (cycle === 'annual' ? '$4.06' : '$8.12')}
                  </span>
                  <span className="text-xs font-semibold text-text-secondary ml-1">/ seat / month</span>
                </div>
                <p className="text-[10px] text-text-muted mt-1 font-medium">
                  {cycle === 'annual'
                    ? `Billed annually (${currency === 'INR' ? '₹2,994' : '$48.72'}/seat/year)`
                    : `Billed monthly (${currency === 'INR' ? '₹499' : '$8.12'}/seat/month)`}
                </p>
              </div>
              
              <div className="h-[1px] bg-indigo-100 my-4" />
              
              {cycle === 'annual' && (
                <div className="mb-4 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-[10px] text-amber-700 font-bold">
                  <Gift className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Includes 1 Year Free access to upcoming Guild HR & Accounting module!</span>
                </div>
              )}

              <ul className="space-y-3 flex-grow mb-6 text-left">
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
                className="w-full text-center py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1"
              >
                Upgrade to Pro
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {/* Enterprise Plan */}
            <div className="aether-glass border border-border-default/80 p-6 flex flex-col rounded-[24px]">
              <div className="mb-4">
                <h3 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">Enterprise</h3>
                <div className="flex items-baseline mt-2">
                  <span className="text-3xl font-black text-text-primary">Custom</span>
                </div>
                <p className="text-[10px] text-text-muted mt-1 font-medium">For teams with 100+ seats</p>
              </div>
              <div className="h-[1px] bg-border-default/60 my-4" />
              <ul className="space-y-3 flex-grow mb-6 text-left">
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
                className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-sky-600 bg-sky-500/10 border border-sky-400/20 hover:bg-sky-500/20 active:scale-98 transition-all"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── PREPAID CREDITS TAB CONTENT ── */}
      {billingTab === 'credits' && (
        <div className="space-y-8 max-w-[800px] mx-auto">
          {/* Wallet Explanation Card */}
          <div className="aether-glass border border-emerald-200 bg-emerald-50/5 p-6 rounded-[24px]">
            <div className="flex gap-4 items-center">
              <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">Top up once, use as you grow</h3>
                <p className="text-xs text-text-secondary leading-relaxed font-medium mt-1">
                  Your prepaid credits are deducted dynamically at the active rate of{' '}
                  <span className="font-extrabold text-text-primary">
                    {currency === 'INR' ? '₹499' : '$8.12'}
                  </span>{' '}
                  per seat per month. Add members anytime, credits automatically roll over.
                </p>
              </div>
            </div>
          </div>

          {/* Credit Packs Grid */}
          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            
            {/* Starter Pack */}
            <div className="aether-glass border border-border-default/80 p-6 flex flex-col rounded-[24px]">
              <div className="mb-4">
                <h3 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">Starter Pack</h3>
                <div className="flex items-baseline mt-2">
                  <span className="text-3xl font-black text-text-primary">
                    {currency === 'INR' ? '₹50,000' : '$500'}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-600 ml-2 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
                    +10% Bonus
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1 font-semibold">
                  You get <span className="text-text-primary font-black">{currency === 'INR' ? '₹55,000' : '$550'}</span> credited in your wallet
                </p>
              </div>
              <div className="h-[1px] bg-border-default/60 my-4" />
              <ul className="space-y-3 flex-grow mb-6 text-left">
                <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                  <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  <span>Prepaid credit wallet system</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                  <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  <span>Deducted per active seat</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                  <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  <span>Credits roll over and never expire</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                  <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  <span>Add members or upgrade seats anytime</span>
                </li>
              </ul>
              <a
                href={`${APP_URL}/signup`}
                className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-text-primary border border-border-default hover:bg-black/[0.02] active:scale-98 transition-all"
              >
                Purchase Starter Pack
              </a>
            </div>

            {/* Growth Pack */}
            <div className="aether-glass border border-indigo-200 bg-indigo-50/5 p-6 flex flex-col rounded-[24px] relative shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                <Gift className="h-3 w-3 fill-white" />
                Popular
              </div>
              <div className="mb-4 mt-2">
                <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">Growth Pack</h3>
                <div className="flex items-baseline mt-2">
                  <span className="text-3xl font-black text-text-primary">
                    {currency === 'INR' ? '₹1,00,000' : '$1,000'}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-600 ml-2 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
                    +20% Bonus
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1 font-semibold">
                  You get <span className="text-text-primary font-black">{currency === 'INR' ? '₹1,20,000' : '$1,200'}</span> credited in your wallet
                </p>
              </div>
              <div className="h-[1px] bg-indigo-100 my-4" />
              
              <div className="mb-4 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-[10px] text-amber-700 font-bold">
                <Gift className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Includes 1 Year Free access to upcoming Guild HR & Accounting module!</span>
              </div>

              <ul className="space-y-3 flex-grow mb-6 text-left">
                <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                  <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                  <span>Deducted per active seat</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                  <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                  <span>Credits roll over and never expire</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                  <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                  <span>Add members or upgrade seats anytime</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-text-secondary font-semibold">
                  <Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                  <span>Priority enterprise onboarding setup</span>
                </li>
              </ul>
              <a
                href={`${APP_URL}/signup`}
                className="w-full text-center py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1"
              >
                Purchase Growth Pack
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
