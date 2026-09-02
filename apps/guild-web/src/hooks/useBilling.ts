/**
 * useBilling — real-time Firestore listener for the org's billing document.
 * Also provides member count, free-limit check, and recent transaction history.
 */
import * as React from 'react';
import { doc, onSnapshot, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  FREE_SEAT_LIMIT,
  estimateCreditMonthsRemaining,
  fromSmallestUnit,
  getGracePeriodInfo,
  syncOrgGracePeriod,
  type GracePeriodInfo,
} from '../lib/billing';
import type { BillingInfo, BillingTransaction, BillingCurrency } from '@guild/types';

export interface UseBillingResult {
  billing: BillingInfo | null;
  loading: boolean;
  memberCount: number;
  isAtFreeLimit: boolean;
  graceInfo: GracePeriodInfo;
  transactions: BillingTransaction[];
  transactionsLoading: boolean;
  /** Balance in display units (e.g. ₹ or $) */
  creditBalanceDisplay: number;
  /** Estimated months remaining based on current member count */
  creditMonthsRemaining: number;
  currency: BillingCurrency;
}

export function useBilling(
  orgId: string | undefined,
  currency: BillingCurrency = 'INR'
): UseBillingResult {
  const [billing, setBilling] = React.useState<BillingInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [memberCount, setMemberCount] = React.useState(0);
  const [transactions, setTransactions] = React.useState<BillingTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = React.useState(true);

  // Real-time billing doc listener
  React.useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, 'organizations', orgId, 'billing', 'info'),
      (snap) => {
        setBilling(snap.exists() ? (snap.data() as BillingInfo) : null);
        setLoading(false);
      },
      (err) => {
        console.error('[useBilling] Failed to listen to billing doc:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [orgId]);

  // Member count (one-time fetch + refresh when orgId changes)
  React.useEffect(() => {
    if (!orgId) return;
    const q = query(
      collection(db, 'organizationMembers'),
      where('orgId', '==', orgId)
    );
    getDocs(q).then((snap) => setMemberCount(snap.size)).catch(() => {});
  }, [orgId]);

  // Recent transactions (one-time fetch)
  React.useEffect(() => {
    if (!orgId) {
      setTransactionsLoading(false);
      return;
    }
    setTransactionsLoading(true);
    const q = query(
      collection(db, 'organizations', orgId, 'billingTransactions'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    getDocs(q)
      .then((snap) => {
        setTransactions(snap.docs.map((d) => d.data() as BillingTransaction));
      })
      .catch(() => {})
      .finally(() => setTransactionsLoading(false));
  }, [orgId]);

  // Sync grace period in Firestore if overage changes
  React.useEffect(() => {
    if (!orgId || loading) return;
    syncOrgGracePeriod(orgId, memberCount, billing);
  }, [orgId, memberCount, billing?.plan, billing?.seats, billing?.gracePeriodUntil, loading]);

  const isAtFreeLimit = memberCount >= FREE_SEAT_LIMIT;
  const graceInfo = getGracePeriodInfo(billing, memberCount);
  const creditBalanceSmallest = billing?.creditBalance ?? 0;
  const creditBalanceDisplay = fromSmallestUnit(creditBalanceSmallest, currency);
  const creditMonthsRemaining = billing?.plan === 'credit'
    ? estimateCreditMonthsRemaining(creditBalanceSmallest, memberCount, currency)
    : 0;

  return {
    billing,
    loading,
    memberCount,
    isAtFreeLimit,
    graceInfo,
    transactions,
    transactionsLoading,
    creditBalanceDisplay,
    creditMonthsRemaining,
    currency: billing?.currency ?? currency,
  };
}
