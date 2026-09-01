import { createHmac } from 'crypto';

/**
 * Razorpay credentials — loaded from environment variables only.
 * Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your Vercel project settings.
 * Never hardcode these values here.
 */
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  throw new Error('[razorpay] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables.');
}

// ─── POST /api/razorpay ────────────────────────────────────────────────────────
// Handles two actions:
//   action: 'create_order'   → creates a Razorpay order, returns { orderId, amount, currency }
//   action: 'verify_payment' → verifies the payment signature, returns { success: boolean }
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action } = req.body;

  // ── Create Order ──────────────────────────────────────────────────────────
  if (action === 'create_order') {
    const { amount, currency, receipt, notes } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({ error: 'amount and currency are required' });
    }

    const payload = {
      amount: Math.round(amount), // Amount in smallest unit (paise / cents)
      currency: currency,         // 'INR' or 'USD'
      receipt: receipt || `guild_${Date.now()}`,
      notes: notes || {},
    };

    const authHeader = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

    try {
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        console.error('[razorpay] Order creation failed:', data);
        return res.status(response.status).json({ error: 'Failed to create Razorpay order', details: data });
      }

      return res.status(200).json({
        orderId: data.id,
        amount: data.amount,
        currency: data.currency,
      });
    } catch (err: any) {
      console.error('[razorpay] Network error creating order:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── Verify Payment Signature ──────────────────────────────────────────────
  if (action === 'verify_payment') {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      console.warn('[razorpay] Signature verification failed for order:', razorpay_order_id);
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    return res.status(200).json({ success: true, paymentId: razorpay_payment_id });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
