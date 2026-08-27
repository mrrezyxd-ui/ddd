import { db } from '../../lib/database/index.ts';
import { StockItem, Product } from '../../lib/database/types.ts';
import { webhookDispatcher } from '../webhooks/dispatcher.ts';

export interface BulkStockResult {
  addedCount: number;
  totalAvailable: number;
  productId: string;
  productTitle: string;
  items: StockItem[];
}

export class InventoryService {
  /**
   * Imports bulk stock keys or accounts from a multi-line string.
   */
  public addBulkStock(productId: string, rawText: string): BulkStockResult {
    const product = db.getProductByIdOrSlug(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));

    if (lines.length === 0) {
      throw new Error('No valid stock items found in input text.');
    }

    const now = new Date().toISOString();
    const newItems: StockItem[] = lines.map((line, idx) => ({
      id: `stk-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      content: line,
      status: 'available',
      createdAt: now,
    }));

    db.addStockItems(newItems);

    const availableCount = db
      .getStockItems(product.id)
      .filter((s) => s.status === 'available').length;

    // Trigger Restock Webhook
    webhookDispatcher.dispatch('stock.restocked', {
      productId: product.id,
      productTitle: product.title,
      addedCount: newItems.length,
      newTotalStock: availableCount,
      timestamp: now,
    });

    // Audit log
    db.addAuditLog({
      actorType: 'admin',
      actorId: 'admin',
      actorName: 'Administrator',
      action: 'STOCK_RESTOCKED',
      entityType: 'Product',
      entityId: product.id,
      details: { addedCount: newItems.length, totalStock: availableCount },
    });

    return {
      addedCount: newItems.length,
      totalAvailable: availableCount,
      productId: product.id,
      productTitle: product.title,
      items: newItems,
    };
  }

  /**
   * Checks for low-stock products (< 3 items remaining) and triggers alert if needed.
   */
  public checkLowStock(productId: string): { isLow: boolean; remaining: number } {
    const available = db
      .getStockItems(productId)
      .filter((s) => s.status === 'available').length;

    if (available <= 2) {
      const product = db.getProductByIdOrSlug(productId);
      if (product) {
        webhookDispatcher.dispatch('stock.low', {
          productId: product.id,
          productTitle: product.title,
          remainingStock: available,
          timestamp: new Date().toISOString(),
        });
      }
      return { isLow: true, remaining: available };
    }
    return { isLow: false, remaining: available };
  }

  /**
   * Retrieves stock stats for all products.
   */
  public getInventorySummary() {
    const products = db.getProducts(true);
    const allStock = db.getStockItems();

    return products.map((p) => {
      const pStock = allStock.filter((s) => s.productId === p.id);
      const available = pStock.filter((s) => s.status === 'available').length;
      const reserved = pStock.filter((s) => s.status === 'reserved').length;
      const delivered = pStock.filter((s) => s.status === 'delivered').length;

      return {
        productId: p.id,
        title: p.title,
        priceUsd: p.priceUsd,
        priceLtc: p.priceLtc,
        category: p.categoryName,
        available,
        reserved,
        delivered,
        total: pStock.length,
        isLowStock: available <= 2,
        isOutOfStock: available === 0,
      };
    });
  }
}

export const inventoryService = new InventoryService();
