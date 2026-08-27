import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  ShoppingBag,
  AlertTriangle,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { Badge } from '../../components/ui/Badge.tsx';

interface DashboardViewProps {
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await api.getAdminAnalytics();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-500 text-xs">
        Loading analytics overview...
      </div>
    );
  }

  const overview = stats.overview || {
    totalGrossUsd: stats.totalGrossUsd ?? stats.totalRevenueUsd ?? 0,
    todayRevenueUsd: stats.todayRevenueUsd ?? 0,
    totalLtcVolume: stats.totalLtcVolume ?? stats.totalRevenueLtc ?? 0,
    completedOrders: stats.completedOrders ?? stats.completedOrdersCount ?? 0,
    totalOrders: stats.totalOrders ?? 0,
    availableStock: stats.availableStock ?? stats.totalStockAvailable ?? 0,
    totalProducts: stats.totalProducts ?? stats.activeProductsCount ?? 0,
  };
  const lowStockProducts = stats.lowStockProducts || [];
  const recentOrders = stats.recentOrders || [];

  return (
    <div className="space-y-8">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Dashboard Overview</h1>
          <p className="text-xs text-zinc-400">
            Real-time marketplace telemetry, Litecoin transactions, and inventory levels.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => onNavigateTab('products')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-md shadow-red-600/20 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* 4 Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Revenue USD */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Total Revenue (USD)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">
              ${(overview.totalGrossUsd || 0).toFixed(2)}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Today: +${(overview.todayRevenueUsd || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Total LTC Settled */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">LTC Volume Settled</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 font-mono text-xs font-black">
              LTC
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-red-400 font-mono">
              {(overview.totalLtcVolume || 0).toFixed(4)} LTC
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Apirone Gateway Verified</p>
          </div>
        </div>

        {/* Completed Orders */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Completed Orders</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {overview.completedOrders} / {overview.totalOrders}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Fulfillment Rate: {overview.totalOrders > 0 ? Math.round((overview.completedOrders / overview.totalOrders) * 100) : 100}%
            </p>
          </div>
        </div>

        {/* Total Stock Available */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Digital Keys in Stock</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {overview.availableStock} items
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Across {overview.totalProducts} catalog products
            </p>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Alert if any */}
      {lowStockProducts && lowStockProducts.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-200">
                Low Inventory Warning ({lowStockProducts.length} Products)
              </h4>
              <p className="text-xs text-amber-300/80">
                Some items have fewer than 3 digital license keys remaining.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('stock')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black transition-all cursor-pointer shrink-0"
          >
            <span>Add Stock Now</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Recent Orders Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 overflow-hidden shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Sales &amp; Checkouts</h3>
            <p className="text-xs text-zinc-400">Latest Litecoin transactions and order fulfillments</p>
          </div>

          <button
            onClick={() => onNavigateTab('orders')}
            className="text-xs font-semibold text-red-400 hover:underline cursor-pointer"
          >
            View All Orders &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
                <th className="py-3 px-4 font-semibold">Order</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">Amount (USD/LTC)</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {recentOrders && recentOrders.length > 0 ? (
                recentOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      #{order.orderNumber}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300">{order.customerEmail}</td>
                    <td className="py-3.5 px-4 font-medium text-zinc-200">
                      {order.productTitle} &times; {order.quantity}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-bold text-white">${order.totalUsd.toFixed(2)}</span>
                      <span className="text-[10px] text-red-400 block">{order.totalLtc.toFixed(4)} LTC</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={order.status === 'completed' ? 'emerald' : 'amber'}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right text-zinc-500 font-mono">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No orders recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
