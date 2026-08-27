import React, { useState } from 'react';
import { X, Zap, ShieldCheck, Mail, Loader2, AlertCircle } from 'lucide-react';
import { Product, UserSession, ShopSettings } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { orderStorage } from '../../lib/orderStorage.ts';

interface CheckoutModalProps {
  product: Product;
  quantity?: number;
  customFields?: Record<string, string>;
  user?: UserSession | null;
  shop: ShopSettings;
  onClose: () => void;
  onOrderCreated?: (orderId: string) => void;
  onCheckoutSuccess?: (order: any) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  product,
  quantity = 1,
  customFields,
  user,
  shop,
  onClose,
  onOrderCreated,
  onCheckoutSuccess,
}) => {
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeQuantity = Math.max(1, quantity || 1);
  const totalUsd = (product.priceUsd * safeQuantity).toFixed(2);
  const totalLtc = (product.priceLtc * safeQuantity).toFixed(4);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email to receive your digital receipt.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createCheckout({
        productId: product.id,
        quantity: safeQuantity,
        customerEmail: email.trim(),
        customFieldValues: customFields,
      });

      // Safely persist to local storage for power-outage/disconnect recovery
      if (res && res.orderId) {
        orderStorage.saveOrder({
          id: res.orderId,
          orderNumber: res.orderNumber || `RM-${res.orderId.substring(4, 9)}`,
          productId: product.id,
          productTitle: product.title,
          amountUsd: Number(totalUsd),
          amountLtc: Number(totalLtc),
          paymentAddress: res.paymentAddress,
          status: 'pending',
          customerEmail: email.trim(),
        });
      }

      if (typeof onOrderCreated === 'function') {
        onOrderCreated(res.orderId);
      }
      if (typeof onCheckoutSuccess === 'function') {
        onCheckoutSuccess(res.order || { id: res.orderId, orderNumber: res.orderNumber });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Litecoin checkout.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-7 shadow-2xl space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">
            <Zap className="h-3.5 w-3.5" />
            <span>Litecoin Checkout</span>
          </div>
          <h2 className="text-xl font-bold text-white">Complete Your Order</h2>
        </div>

        {/* Order Summary Box */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2.5 text-xs">
          <div className="flex justify-between items-start">
            <span className="font-semibold text-zinc-200">{product.title}</span>
            <span className="font-bold text-white font-mono">${totalUsd}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Quantity:</span>
            <span className="font-mono text-zinc-200">{quantity}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Crypto Equivalent:</span>
            <span className="font-mono text-red-400 font-bold">&asymp; {totalLtc} LTC</span>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Delivery Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Your license keys and invoice link will be sent to this email.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/25 transition-all disabled:opacity-50 cursor-pointer"
            id="btn-confirm-checkout"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating LTC Payment...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Generate Litecoin Address &rarr;</span>
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Encrypted via Apirone Decentralized Gateway</span>
        </div>
      </div>
    </div>
  );
};
