import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  PackageCheck,
  ArrowRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { orderStorage, StoredOrder } from '../../lib/orderStorage.ts';
import { api } from '../../lib/api.ts';
import { Badge } from '../ui/Badge.tsx';

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOrder: (orderId: string) => void;
}

export const TrackOrderModal: React.FC<TrackOrderModalProps> = ({
  isOpen,
  onClose,
  onOpenOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savedOrders, setSavedOrders] = useState<StoredOrder[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSavedOrders(orderStorage.getOrders());
      setSearchError(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchTerm.trim();
    if (!query) return;

    setSearching(true);
    setSearchError(null);

    try {
      // Look up status via API
      const res = await api.getOrderStatus(query);
      if (res && res.order) {
        // Save to local storage for quick access later
        orderStorage.saveOrder({
          id: res.order.id,
          orderNumber: res.order.orderNumber,
          productTitle: res.order.productTitle,
          amountUsd: res.order.totalUsd,
          amountLtc: res.order.totalLtc,
          status: res.order.status as any,
          paymentAddress: res.order.paymentAddress,
          createdAt: res.order.createdAt,
          deliveredItems: res.order.deliveredItems,
        });

        onClose();
        onOpenOrder(res.order.id);
      }
    } catch (err: any) {
      setSearchError(err.message || `No active or completed order found matching "${query}". Please check your order ID or number.`);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-7 shadow-2xl space-y-6">
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
            <ShieldCheck className="h-4 w-4" />
            <span>Power Loss &amp; Session Safe</span>
          </div>
          <h2 className="text-xl font-bold text-white">Track &amp; Recover Your Order</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Lost power, closed your tab, or need your license keys? Enter your Order # or resume orders saved on this device.
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter Order ID or # (e.g. RM-12345 or ord-...)"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !searchTerm.trim()}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Lookup</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>

          {searchError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{searchError}</span>
            </div>
          )}
        </form>

        {/* Local Saved Orders */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              <span>Saved On This Device ({savedOrders.length})</span>
            </span>
            {savedOrders.length > 0 && (
              <span className="text-[11px] text-zinc-500">Auto-saved for recovery</span>
            )}
          </div>

          {savedOrders.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-center text-xs text-zinc-500">
              No orders stored on this browser yet. When you place an order, it will automatically appear here.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {savedOrders.map((ord) => {
                const isPaid = ord.status === 'completed';
                return (
                  <div
                    key={ord.id}
                    onClick={() => {
                      onClose();
                      onOpenOrder(ord.id);
                    }}
                    className="group flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-800/60 hover:border-zinc-700 transition-all cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-white group-hover:text-red-400 transition-colors">
                          #{ord.orderNumber}
                        </span>
                        <Badge variant={isPaid ? 'emerald' : ord.status === 'expired' ? 'zinc' : 'amber'}>
                          {(ord.status || 'PENDING').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1">{ord.productTitle}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        ${(ord.amountUsd || 0).toFixed(2)} &bull; {new Date(ord.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 group-hover:text-white">
                      <span>{isPaid ? 'View Keys' : 'Pay / Track'}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-red-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-[11px] text-zinc-400 flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Completed purchases permanently store license keys in your payment link.</span>
        </div>
      </div>
    </div>
  );
};
