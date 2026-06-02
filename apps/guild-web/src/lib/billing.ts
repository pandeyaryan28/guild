/**
 * Guild Billing Library
 * Client-side billing utilities. Uses Razorpay.js (loaded via CDN script tag)
 * for the checkout modal. Order creation & signature verification go through
 * the server-side /api/razorpay endpoint to keep the secret safe.
 */
import {
  doc, getDoc, setDoc, collection, addDoc,
  serverTimestamp, query, orderBy, limit, getDocs, where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { BillingInfo, BillingPlan, BillingCurrency, BillingTransaction } from '@guild/types';

// ─── Pricing Constants ────────────────────────────────────────────────────────

export const FREE_SEAT_LIMIT = 5;
export const FREE_STORAGE_LIMIT_MB = 10;

export const PRICING = {
  INR: {
    monthly: 499,          // ₹ per seat per month
    annual: 249.5,         // ₹ per seat per month billed annually (50% off)
    annualTotal: 2994,     // ₹ per seat per year
    creditStarter: 50000,  // ₹ 50,000
    creditGrowth: 100000,  // ₹ 1,00,000
    symbol: '₹',
    code: 'INR' as BillingCurrency,
  },
  USD: {
    monthly: 8.12,         // $ per seat per month
    annual: 4.06,          // $ per seat per month billed annually (50% off)
    annualTotal: 48.72,    // $ per seat per year
    creditStarter: 500,    // $500
    creditGrowth: 1000,    // $1,000
    symbol: '$',
    code: 'USD' as BillingCurrency,
  },
} as const;

export const ANNUAL_OFFER_END = new Date(
  import.meta.env.VITE_ANNUAL_OFFER_END_DATE || '2026-09-30'
);

export const ENTERPRISE_CONTACT_URL =
  import.meta.env.VITE_ENTERPRISE_CONTACT_URL || 'mailto:enterprise@guildhq.com';

// ─── Currency Detection ────────────────────────────────────────────────────────

/**
 * Detect whether the user is likely in India based on timezone.
 * Falls back to USD for any non-India locale.
 */
export function detectCurrency(): BillingCurrency {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz.startsWith('Asia/Kolkata')) return 'INR';
    // Also catch navigator.language as a secondary signal
    if (navigator.language === 'en-IN') return 'INR';
  } catch {
    // ignore
  }
  return 'USD';
}

export function getPricing(currency: BillingCurrency = detectCurrency()) {
  return PRICING[currency];
}

/** Format a money value for display */
export function formatMoney(amount: number, currency: BillingCurrency): string {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Convert a display amount to smallest unit (paise / cents) */
export function toSmallestUnit(amount: number, currency: BillingCurrency): number {
  return Math.round(amount * 100);
}

/** Convert smallest unit back to display amount */
export function fromSmallestUnit(amount: number, currency: BillingCurrency): number {
  return amount / 100;
}

// ─── Firestore Helpers ────────────────────────────────────────────────────────

const billingDocRef = (orgId: string) =>
  doc(db, 'organizations', orgId, 'billing', 'info');

const transactionsRef = (orgId: string) =>
  collection(db, 'organizations', orgId, 'billingTransactions');

export async function getOrgBilling(orgId: string): Promise<BillingInfo | null> {
  const snap = await getDoc(billingDocRef(orgId));
  if (!snap.exists()) return null;
  return snap.data() as BillingInfo;
}

export async function getOrgMemberCount(orgId: string): Promise<number> {
  const q = query(
    collection(db, 'organizationMembers'),
    where('orgId', '==', orgId)
  );
  const snap = await getDocs(q);
  return snap.size;
}

export async function isOrgAtFreeLimit(orgId: string): Promise<boolean> {
  const count = await getOrgMemberCount(orgId);
  return count >= FREE_SEAT_LIMIT;
}

export async function getRecentTransactions(
  orgId: string,
  count = 10
): Promise<BillingTransaction[]> {
  const q = query(transactionsRef(orgId), orderBy('createdAt', 'desc'), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as BillingTransaction);
}

// ─── Razorpay Checkout ────────────────────────────────────────────────────────

/** Declare Razorpay global injected by the CDN script */
declare global {
  interface Window {
    Razorpay: new (opts: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/** Ensure the Razorpay.js script is loaded exactly once */
function ensureRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.getElementById('razorpay-js');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/** Create a Razorpay order via the server-side API route */
async function createRazorpayOrder(
  amountInSmallestUnit: number,
  currency: BillingCurrency,
  receipt: string
): Promise<string> {
  const res = await fetch('/api/razorpay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create_order',
      amount: amountInSmallestUnit,
      currency,
      receipt,
    }),
  });
  const data = await res.json() as { orderId?: string; error?: string };
  if (!res.ok || !data.orderId) throw new Error(data.error || 'Failed to create order');
  return data.orderId;
}

/** Verify signature via server-side API route */
async function verifyRazorpayPayment(response: RazorpayResponse): Promise<boolean> {
  const res = await fetch('/api/razorpay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'verify_payment',
      ...response,
    }),
  });
  const data = await res.json() as { success?: boolean };
  return !!data.success;
}

/**
 * Open the Razorpay checkout, verify signature server-side, and return
 * the verified payment response on success.
 */
export async function openRazorpayCheckout(params: {
  amountInSmallestUnit: number;
  currency: BillingCurrency;
  receipt: string;
  description: string;
  userName?: string;
  userEmail?: string;
}): Promise<RazorpayResponse> {
  await ensureRazorpayScript();

  const orderId = await createRazorpayOrder(
    params.amountInSmallestUnit,
    params.currency,
    params.receipt
  );

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: params.amountInSmallestUnit,
      currency: params.currency,
      name: 'Guild',
      description: params.description,
      order_id: orderId,
      prefill: {
        name: params.userName,
        email: params.userEmail,
      },
      theme: { color: '#6366f1' },
      handler: async (response) => {
        const valid = await verifyRazorpayPayment(response);
        if (valid) {
          resolve(response);
        } else {
          reject(new Error('Payment verification failed. Please contact support.'));
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    });
    rzp.open();
  });
}

// ─── Billing Activation (post-payment) ────────────────────────────────────────

/** Called after a successful subscription payment to activate the plan in Firestore */
export async function activateSubscription(params: {
  orgId: string;
  plan: 'pro_monthly' | 'pro_annual';
  seats: number;
  currency: BillingCurrency;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}): Promise<void> {
  const now = serverTimestamp();
  const nextBillingDate = new Date();
  nextBillingDate.setMonth(
    nextBillingDate.getMonth() + (params.plan === 'pro_annual' ? 12 : 1)
  );

  const billingInfo: Omit<BillingInfo, 'updatedAt'> & { updatedAt: ReturnType<typeof serverTimestamp> } = {
    plan: params.plan,
    status: 'active',
    seats: params.seats,
    currency: params.currency,
    nextBillingDate: null, // will be set via Firestore Timestamp
    razorpaySubscriptionId: null,
    annualBonusActivated: params.plan === 'pro_annual',
    updatedAt: now,
  };

  await setDoc(billingDocRef(params.orgId), {
    ...billingInfo,
    nextBillingDate: new Date(nextBillingDate),
  }, { merge: true });

  // Log the transaction
  await addDoc(transactionsRef(params.orgId), {
    id: '',
    orgId: params.orgId,
    description: params.plan === 'pro_annual'
      ? `Annual Plan — ${params.seats} seat${params.seats > 1 ? 's' : ''}`
      : `Monthly Plan — ${params.seats} seat${params.seats > 1 ? 's' : ''}`,
    amount: params.seats * toSmallestUnit(
      params.plan === 'pro_annual'
        ? getPricing(params.currency).annualTotal
        : getPricing(params.currency).monthly,
      params.currency
    ),
    currency: params.currency,
    type: 'subscription',
    status: 'success',
    razorpayPaymentId: params.razorpayPaymentId,
    razorpayOrderId: params.razorpayOrderId,
    createdAt: now,
  });
}

/** Called after a successful credit wallet top-up */
export async function activateCreditTopUp(params: {
  orgId: string;
  packId: 'starter' | 'growth';
  currency: BillingCurrency;
  razorpayPaymentId: string;
  razorpayOrderId: string;
}): Promise<void> {
  const now = serverTimestamp();
  const pricing = getPricing(params.currency);
  const topUpAmount = params.packId === 'growth'
    ? pricing.creditGrowth
    : pricing.creditStarter;
  const topUpInSmallestUnit = toSmallestUnit(topUpAmount, params.currency);

  // Get current balance and add to it
  const existing = await getOrgBilling(params.orgId);
  const currentBalance = existing?.creditBalance ?? 0;

  await setDoc(billingDocRef(params.orgId), {
    plan: 'credit',
    status: 'active',
    seats: 0,
    currency: params.currency,
    creditBalance: currentBalance + topUpInSmallestUnit,
    lastTopUpAt: now,
    // Annual bonus for Growth pack (₹1L / $1k)
    annualBonusActivated: params.packId === 'growth',
    updatedAt: now,
  }, { merge: true });

  await addDoc(transactionsRef(params.orgId), {
    id: '',
    orgId: params.orgId,
    description: params.packId === 'growth'
      ? `Credit Top-up — Growth Pack (${params.currency === 'INR' ? '₹1,00,000' : '$1,000'})`
      : `Credit Top-up — Starter Pack (${params.currency === 'INR' ? '₹50,000' : '$500'})`,
    amount: topUpInSmallestUnit,
    currency: params.currency,
    type: 'topup',
    status: 'success',
    razorpayPaymentId: params.razorpayPaymentId,
    razorpayOrderId: params.razorpayOrderId,
    createdAt: now,
  });
}

/** Estimate months of credit remaining based on member count */
export function estimateCreditMonthsRemaining(
  creditBalanceSmallestUnit: number,
  memberCount: number,
  currency: BillingCurrency
): number {
  if (memberCount <= FREE_SEAT_LIMIT) return Infinity;
  const billableSeats = memberCount - FREE_SEAT_LIMIT; // first 5 are free
  // Actually all seats beyond free tier are billed
  const monthlyCostSmallest = toSmallestUnit(
    getPricing(currency).monthly * memberCount,
    currency
  );
  if (monthlyCostSmallest <= 0) return Infinity;
  return Math.floor(creditBalanceSmallestUnit / monthlyCostSmallest);
}
