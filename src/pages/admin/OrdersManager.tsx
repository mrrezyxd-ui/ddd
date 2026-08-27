import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Eye,
  RefreshCw,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  Loader2,
  FileText,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { Order } from '../../types/index.ts';
import { Badge } from '../../components/ui/Badge.tsx';

export const OrdersManager: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const data = await api.getAdminOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = (Array.isArray(orders) ? orders : []).filter((o) => {
    if (!o) return false;
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.customerEmail || '').toLowerCase().includes(q) ||
        (o.productTitle || '').toLowerCase().includes(q) ||
        (o.paymentAddress || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleManualDeliver = async (orderId: string) => {
    setProcessingAction(true);
    try {
      await api.manualDeliverOrder(orderId);
      await fetchOrders();
      if (inspectOrder && inspectOrder.id === orderId) {
        const updated = await api.getAdminOrder(orderId);
        setInspectOrder(updated.order);
      }
    } catch (err: any) {
      alert(err.message || 'Delivery failed');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRefund = async (orderId: string) => {
    if (!confirm('Mark this order as refunded? This will update the store ledger.')) return;
    setProcessingAction(true);
    try {
      await api.refundOrder(orderId);
      await fetchOrders();
      if (inspectOrder && inspectOrder.id === orderId) {
        setInspectOrder(null);
      }
    } catch (err: any) {
      alert(err.message || 'Refund action failed');
    } finally {
      setProcessingAction(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Orders &amp; Fulfillments</h1>
          <p className="text-xs text-zinc-400">
            Monitor customer purchases, inspect delivered keys, or issue manual deliveries/refunds.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
          {['all', 'completed', 'pending', 'processing', 'refunded', 'expired'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer uppercase tracking-wider ${
                filterStatus === st
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders, email..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-red-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
                <th className="py-3.5 px-4 font-semibold">Order</th>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Product</th>
                <th className="py-3.5 px-4 font-semibold">Total (USD/LTC)</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Date</th>
                <th className="py-3.5 px-4 font-semibold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-white">#{o.orderNumber}</td>
                  <td className="py-3.5 px-4 text-zinc-300">{o.customerEmail}</td>
                  <td className="py-3.5 px-4 font-medium text-zinc-200">
                    {o.productTitle} &times; {o.quantity}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <strong className="text-white">${o.totalUsd.toFixed(2)}</strong>
                    <span className="text-[10px] text-red-400 block">{o.totalLtc.toFixed(4)} LTC</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={o.status === 'completed' ? 'emerald' : o.status === 'refunded' ? 'zinc' : 'amber'}>
                      {o.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setInspectOrder(o)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Inspect Order"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Order Drawer / Modal */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Order #{inspectOrder.orderNumber}</h2>
                <p className="text-xs text-zinc-400">{inspectOrder.customerEmail}</p>
              </div>
              <button
                onClick={() => setInspectOrder(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 block mb-1">Product</span>
                <strong className="text-zinc-100">{inspectOrder.productTitle}</strong>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 block mb-1">Status</span>
                <Badge variant={inspectOrder.status === 'completed' ? 'emerald' : 'amber'}>
                  {(inspectOrder.status || 'PENDING').toUpperCase()}
                </Badge>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 block mb-1">Total USD</span>
                <strong className="font-mono text-white">${inspectOrder.totalUsd.toFixed(2)}</strong>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 block mb-1">Total LTC</span>
                <strong className="font-mono text-red-400">{inspectOrder.totalLtc.toFixed(6)} LTC</strong>
              </div>
            </div>

            {/* LTC Payment Address */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
              <span className="text-zinc-500 block mb-1">Apirone Payment Address</span>
              <span className="font-mono text-red-300 break-all">{inspectOrder.paymentAddress}</span>
            </div>

            {/* Delivered Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Delivered Digital License Keys:
              </h4>
              {inspectOrder.deliveredItems && inspectOrder.deliveredItems.length > 0 ? (
                <div className="space-y-1.5">
                  {inspectOrder.deliveredItems.map((k, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs text-red-300"
                    >
                      <span className="break-all font-semibold mr-2">{k}</span>
                      <button
                        onClick={() => copyText(k)}
                        className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                      >
                        {copiedKey === k ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  No keys delivered yet.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <button
                onClick={() => handleRefund(inspectOrder.id)}
                disabled={processingAction || inspectOrder.status === 'refunded'}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold disabled:opacity-30 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Mark Refunded</span>
              </button>

              <div className="flex items-center gap-2">
                {inspectOrder.status !== 'completed' && (
                  <button
                    onClick={() => handleManualDeliver(inspectOrder.id)}
                    disabled={processingAction}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {processingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    <span>Force Deliver Keys</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
