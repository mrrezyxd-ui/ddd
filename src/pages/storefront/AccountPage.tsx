import React, { useState, useEffect } from 'react';
import {
  User,
  ShoppingBag,
  Key,
  Copy,
  Check,
  Download,
  FileText,
  LogOut,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { Order, UserSession, ShopSettings } from '../../types/index.ts';
import { Badge } from '../../components/ui/Badge.tsx';

interface AccountPageProps {
  user: UserSession;
  shop: ShopSettings;
  onLogout: () => void;
  onViewInvoice: (invoiceId: string) => void;
  onViewOrder: (orderId: string) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  user,
  shop,
  onLogout,
  onViewInvoice,
  onViewOrder,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCustomerOrders(user.email)
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error(err);
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, [user.email]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Profile Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-xl">
              {(user?.username?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{user?.username || 'Customer'}</h1>
              <p className="text-xs text-zinc-400">{user?.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="zinc">Customer</Badge>
                <span className="text-xs text-zinc-500 font-mono">
                  Wallet Balance: ${(user?.balanceUsd || 0).toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Orders & License Keys History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-red-400" />
              <span>Your Orders &amp; Delivered Licenses</span>
            </h2>
            <span className="text-xs text-zinc-500">{orders.length} Total Orders</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-zinc-500">Loading purchase history...</div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-10 text-center space-y-2">
              <ShoppingBag className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-zinc-200">No orders found</h3>
              <p className="text-xs text-zinc-500">
                Purchases completed using your email will appear here with instant copyable license keys.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isDelivered = order.status === 'completed';
                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-bold text-white">{order.productTitle}</h4>
                          <Badge variant={isDelivered ? 'emerald' : 'amber'}>
                            {order.status?.toUpperCase() || 'PENDING'}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Order #{order.orderNumber} &bull; {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-bold text-white font-mono">
                            ${order.totalUsd.toFixed(2)}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-500 block">
                            {order.totalLtc.toFixed(6)} LTC
                          </span>
                        </div>

                        <button
                          onClick={() => onViewOrder(order.id)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
                        >
                          View Order
                        </button>
                      </div>
                    </div>

                    {/* Delivered Keys if available */}
                    {order.deliveredItems && order.deliveredItems.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                          Delivered Digital Credentials:
                        </span>
                        <div className="space-y-1.5">
                          {order.deliveredItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 font-mono text-xs text-red-300"
                            >
                              <span className="break-all font-semibold mr-2">{item}</span>
                              <button
                                onClick={() => copyText(item)}
                                className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] text-zinc-300 transition-colors cursor-pointer"
                              >
                                {copiedKey === item ? (
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
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
