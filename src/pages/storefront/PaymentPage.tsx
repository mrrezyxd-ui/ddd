import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  Zap,
  Clock,
  ShieldCheck,
  Download,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Loader2,
  Sparkles,
  Bookmark,
  Share2,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { orderStorage } from '../../lib/orderStorage.ts';
import { Order, Payment, Product, ShopSettings } from '../../types/index.ts';
import { Badge } from '../../components/ui/Badge.tsx';

interface PaymentPageProps {
  orderId: string;
  shop: ShopSettings;
  onViewInvoice: (invoiceId: string) => void;
  onGoHome: () => void;
  onPaymentSuccess?: () => void;
  onBack?: () => void;
}

export const PaymentPage: React.FC<PaymentPageProps> = ({
  orderId,
  shop,
  onViewInvoice,
  onGoHome,
  onPaymentSuccess,
  onBack,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [product, setProduct] = useState<Partial<Product> | null>(null);
  const [invoice, setInvoice] = useState<{ id: string; invoiceNumber: string } | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedOrderLink, setCopiedOrderLink] = useState(false);
  const [copiedKeyIndex, setCopiedKeyIndex] = useState<number | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await api.getOrderStatus(orderId);
      setOrder(data.order);
      setPayment(data.payment);
      setProduct(data.product);
      setInvoice(data.invoice);
      setSecondsRemaining(data.timeRemainingSeconds);
      setLoading(false);

      // Save/sync with local storage for instant power outage recovery
      orderStorage.saveOrder({
        id: data.order.id,
        orderNumber: data.order.orderNumber,
        productId: data.order.productId,
        productTitle: data.order.productTitle,
        amountUsd: data.order.totalUsd,
        amountLtc: data.order.totalLtc,
        paymentAddress: data.payment.address,
        status: data.order.status as any,
        deliveredItems: data.order.deliveredItems,
        customerEmail: data.order.customerEmail,
      });

      // If completed or confirmed, invoke callback
      if (data.order.status === 'completed' || data.payment.status === 'confirmed') {
        if (typeof onPaymentSuccess === 'function') {
          onPaymentSuccess();
        }
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh order status.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    pollingRef.current = setInterval(fetchStatus, 4000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [orderId]);

  // Countdown timer decrement
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const t = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [secondsRemaining]);

  const copyToClipboard = (text: string, type: 'address' | 'amount' | 'link' | number) => {
    navigator.clipboard.writeText(text);
    if (type === 'address') {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else if (type === 'amount') {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } else if (type === 'link') {
      setCopiedOrderLink(true);
      setTimeout(() => setCopiedOrderLink(false), 2000);
    } else if (typeof type === 'number') {
      setCopiedKeyIndex(type);
      setTimeout(() => setCopiedKeyIndex(null), 2000);
    }
  };

  const getOrderPermanentUrl = () => {
    const origin = window.location.origin;
    return `${origin}/#payment/${orderId}`;
  };

  const downloadCredentialsFile = () => {
    if (!order?.deliveredItems || order.deliveredItems.length === 0) return;
    const content = `ReachMarket Digital Receipt\nOrder: #${order.orderNumber}\nProduct: ${order.productTitle}\nDate: ${new Date().toISOString()}\nSupport Discord: @${shop.supportDiscordUsername || '4gfi'}\n\nDELIVERED LICENSE KEYS / CREDENTIALS:\n` +
      order.deliveredItems.map((item, idx) => `[${idx + 1}] ${item}`).join('\n') +
      `\n\nThank you for choosing ReachMarket!`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ReachMarket-Order-${order.orderNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-red-500 mb-3" />
        <p className="text-sm font-semibold text-zinc-300">Loading payment gateway...</p>
      </div>
    );
  }

  if (error || !order || !payment) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-zinc-900 p-6 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Order Lookup Failed</h2>
          <p className="text-xs text-zinc-400">{error || 'Order could not be located.'}</p>
          <button
            onClick={onGoHome}
            className="w-full py-2.5 rounded-xl bg-zinc-800 text-xs font-semibold text-white hover:bg-zinc-700 cursor-pointer"
          >
            Return to Store
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = order.status === 'completed' || payment.status === 'confirmed';
  const isUnconfirmed = payment.status === 'unconfirmed' || (payment.confirmations > 0 && !isCompleted);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onGoHome}
            className="cursor-pointer"
          >
            <img
              src={shop.logoUrl || '/logo/reachmarket.svg'}
              alt={shop.shopName || 'ReachMarket'}
              className="h-8 w-auto"
            />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono">Order #{order.orderNumber}</span>
            {isCompleted ? (
              <Badge variant="emerald">Completed &amp; Delivered</Badge>
            ) : isUnconfirmed ? (
              <Badge variant="amber">1 Block Pending</Badge>
            ) : (
              <Badge variant="red">Awaiting LTC</Badge>
            )}
          </div>
        </div>

        {/* Power Outage & Session Protection Notice */}
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg backdrop-blur flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-zinc-200">
                Safe Order Guarantee: <span className="text-zinc-400 font-normal">If your power or internet cuts off, this order is saved on this browser &amp; the blockchain.</span>
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                Order ID: {order.orderNumber} &bull; Stored locally for instant recovery
              </p>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(getOrderPermanentUrl(), 'link')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700/60 transition-all cursor-pointer shrink-0"
          >
            {copiedOrderLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Order Link</span>
              </>
            )}
          </button>
        </div>

        {/* ===================== COMPLETED & DELIVERED STATE ===================== */}
        {isCompleted ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-zinc-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            {/* Header banner */}
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 animate-bounce">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Payment Confirmed!</h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                Your payment of <strong className="text-zinc-200 font-mono">{payment.amountExpectedLtc.toFixed(6)} LTC</strong> was confirmed by the blockchain network.
              </p>
            </div>

            {/* Delivered Credentials Box */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-red-400" />
                    <span>Your Delivered License Keys / Credentials</span>
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Product: {order.productTitle} ({order.quantity} {order.quantity === 1 ? 'unit' : 'units'})
                  </p>
                </div>

                <button
                  onClick={downloadCredentialsFile}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .txt</span>
                </button>
              </div>

              {/* Keys List */}
              <div className="space-y-2">
                {order.deliveredItems && order.deliveredItems.length > 0 ? (
                  order.deliveredItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/90 px-4 py-3 font-mono text-xs text-red-300 selection:bg-red-500 selection:text-white"
                    >
                      <div className="break-all font-semibold mr-3">{item}</div>
                      <button
                        onClick={() => copyToClipboard(item, idx)}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition-colors cursor-pointer"
                      >
                        {copiedKeyIndex === idx ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-lg bg-zinc-900 text-xs text-zinc-400">
                    Delivery fulfilled. Check your confirmation receipt.
                  </div>
                )}
              </div>

              {/* Instructions reminder */}
              {product?.instructions && (
                <div className="pt-3 border-t border-zinc-800/80">
                  <h5 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Redemption Instructions
                  </h5>
                  <p className="text-xs text-zinc-300 font-mono">{product.instructions}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {invoice && (
                <button
                  onClick={() => onViewInvoice(invoice.id)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-all cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  <span>View Official Invoice (#{invoice.invoiceNumber})</span>
                </button>
              )}

              <button
                onClick={onGoHome}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/20 transition-all cursor-pointer"
              >
                <span>Continue Shopping</span>
              </button>
            </div>
          </div>
        ) : (
          /* ===================== AWAITING PAYMENT SCREEN ===================== */
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            {/* Status & Timer Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white">Send Litecoin (LTC)</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Send the exact amount below to receive automated instant license delivery.
                </p>
              </div>

              {/* Expiration Timer */}
              <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-mono text-red-300">
                <Clock className="h-4 w-4 text-red-400 animate-pulse" />
                <span>Expires in: <strong>{formatTime(secondsRemaining)}</strong></span>
              </div>
            </div>

            {/* QR Code & Payment Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* QR Code */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-800 bg-zinc-950">
                {payment.qrCodeDataUrl ? (
                  <img
                    src={payment.qrCodeDataUrl}
                    alt="Litecoin QR Code"
                    className="h-44 w-44 rounded-lg bg-white p-2"
                  />
                ) : (
                  <div className="h-44 w-44 rounded-lg bg-zinc-900 flex items-center justify-center text-xs text-zinc-500">
                    Generating QR...
                  </div>
                )}
                <span className="text-[11px] font-mono text-zinc-500 mt-2">Scan with LTC Wallet</span>
              </div>

              {/* Address and Amount */}
              <div className="md:col-span-8 space-y-4">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Amount to Send (LTC)
                  </label>
                  <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5">
                    <span className="font-mono text-base sm:text-lg font-extrabold text-white">
                      {payment.amountExpectedLtc.toFixed(6)} LTC
                    </span>
                    <button
                      onClick={() => copyToClipboard(payment.amountExpectedLtc.toFixed(6), 'amount')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                    >
                      {copiedAmount ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedAmount ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Equivalent: ${payment.amountExpectedUsd.toFixed(2)} USD
                  </p>
                </div>

                {/* LTC Address */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Litecoin Payment Address
                  </label>
                  <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5">
                    <span className="font-mono text-xs sm:text-sm text-red-400 break-all font-semibold mr-2">
                      {payment.address}
                    </span>
                    <button
                      onClick={() => copyToClipboard(payment.address, 'address')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors cursor-pointer shrink-0"
                    >
                      {copiedAddress ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Blockchain Status Tracker */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">Live BlockCypher Network Listener</span>
                <span className="flex items-center gap-1.5 text-zinc-400 font-mono">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-400 font-medium">Scanning every 5s</span>
                </span>
              </div>

              {isUnconfirmed ? (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 flex items-start gap-2">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-400 mt-0.5" />
                  <div>
                    <strong>Payment detected in Litecoin mempool!</strong>
                    <p className="text-[11px] text-amber-400/80 mt-0.5">
                      Confirming transaction amount and releasing your digital license ({payment.confirmations}/1 confirmations).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-500 shrink-0" />
                  <span>Waiting for Litecoin transaction matching {payment.amountExpectedLtc.toFixed(6)} LTC to appear...</span>
                </div>
              )}
            </div>

            {/* Support Footer Note */}
            <div className="text-center text-xs text-zinc-500">
              Need assistance with this payment? Reach out to Discord support: <strong className="text-zinc-300">@{shop.supportDiscordUsername || '4gfi'}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
