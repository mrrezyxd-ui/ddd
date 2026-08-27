import { db } from '../../lib/database/index.ts';

export class AnalyticsService {
  public getDashboardStats() {
    const orders = db.getOrders();
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const products = db.getProducts(true);
    const stock = db.getStockItems();
    const ltcRate = db.getShopSettings().ltcToUsdRate || 110.00;

    const totalRevenueUsd = completedOrders.reduce((acc, o) => acc + o.totalUsd, 0);
    const totalRevenueLtc = completedOrders.reduce((acc, o) => acc + o.totalLtc, 0);

    const totalStockAvailable = stock.filter((s) => s.status === 'available').length;
    const lowStockCount = products.filter((p) => (p.stockCount || 0) <= 2).length;

    // Daily Sales for last 7 days
    const days: { [date: string]: { date: string; revenueUsd: number; revenueLtc: number; orderCount: number } } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days[dateStr] = { date: dateStr, revenueUsd: 0, revenueLtc: 0, orderCount: 0 };
    }

    completedOrders.forEach((o) => {
      const dStr = (o.completedAt || o.createdAt).split('T')[0];
      if (days[dStr]) {
        days[dStr].revenueUsd += o.totalUsd;
        days[dStr].revenueLtc += o.totalLtc;
        days[dStr].orderCount += 1;
      }
    });

    const salesTrend = Object.values(days);

    // Top selling products
    const productSalesMap = new Map<string, { title: string; count: number; revenueUsd: number }>();
    completedOrders.forEach((o) => {
      const existing = productSalesMap.get(o.productId) || { title: o.productTitle, count: 0, revenueUsd: 0 };
      existing.count += o.quantity;
      existing.revenueUsd += o.totalUsd;
      productSalesMap.set(o.productId, existing);
    });

    const topProducts = Array.from(productSalesMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenueUsd - a.revenueUsd)
      .slice(0, 5);

    const lowStockProducts = products.filter((p) => (p.stockCount || 0) <= 2);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = completedOrders.filter((o) => (o.completedAt || o.createdAt).startsWith(todayStr));
    const todayRevenueUsd = todayOrders.reduce((acc, o) => acc + o.totalUsd, 0);

    const overview = {
      totalGrossUsd: Number(totalRevenueUsd.toFixed(2)),
      todayRevenueUsd: Number(todayRevenueUsd.toFixed(2)),
      totalLtcVolume: Number(totalRevenueLtc.toFixed(6)),
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      availableStock: totalStockAvailable,
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.active).length,
      lowStockCount: lowStockProducts.length,
    };

    return {
      overview,
      lowStockProducts,
      totalRevenueUsd: Number(totalRevenueUsd.toFixed(2)),
      totalRevenueLtc: Number(totalRevenueLtc.toFixed(6)),
      totalGrossUsd: Number(totalRevenueUsd.toFixed(2)),
      todayRevenueUsd: Number(todayRevenueUsd.toFixed(2)),
      totalLtcVolume: Number(totalRevenueLtc.toFixed(6)),
      totalOrders: orders.length,
      completedOrdersCount: completedOrders.length,
      completedOrders: completedOrders.length,
      conversionRate: orders.length > 0 ? Number(((completedOrders.length / orders.length) * 100).toFixed(1)) : 0,
      totalStockAvailable,
      availableStock: totalStockAvailable,
      totalProducts: products.length,
      lowStockCount: lowStockProducts.length,
      activeProductsCount: products.filter((p) => p.active).length,
      salesTrend,
      topProducts,
      recentOrders: orders.slice(0, 8),
      ltcRate,
    };
  }
}

export const analyticsService = new AnalyticsService();
