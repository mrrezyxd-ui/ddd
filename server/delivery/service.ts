import { db } from '../../lib/database/index.ts';
import { Order, StockItem, Product } from '../../lib/database/types.ts';
import { invoiceService } from '../invoices/service.ts';
import { webhookDispatcher } from '../webhooks/dispatcher.ts';

export interface DeliveryResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  deliveredItems: string[];
  instructions: string;
  downloadUrl?: string;
  productTitle: string;
  invoiceId?: string;
}

export class DeliveryService {
  /**
   * Executes digital delivery for a confirmed order.
   * Enforces strict idempotency: if already completed, returns existing delivery without duplication.
   */
  public executeDelivery(orderId: string): DeliveryResult {
    const order = db.getOrderByIdOrNumber(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const product = db.getProductByIdOrSlug(order.productId);
    if (!product) {
      throw new Error(`Product ${order.productId} not found`);
    }

    // Idempotency check
    if (order.status === 'completed' && order.deliveredItems && order.deliveredItems.length > 0) {
      const invoice = db.getInvoiceByIdOrNumber(order.id);
      return {
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        deliveredItems: order.deliveredItems,
        instructions: product.instructions,
        downloadUrl: product.downloadUrl,
        productTitle: product.title,
        invoiceId: invoice?.id,
      };
    }

    let deliveredSerials: string[] = [];

    if (product.deliveryType === 'automatic') {
      // Commit reserved stock items
      const stock = db.commitStockDelivery(order.id);
      if (stock.length > 0) {
        deliveredSerials = stock.map((s) => s.content);
      } else {
        // If no pre-reserved stock, try to grab available stock directly
        const available = db.getStockItems(product.id).filter((s) => s.status === 'available');
        const countToGrab = Math.min(order.quantity, available.length);
        const grabbed = available.slice(0, countToGrab);
        const nowIso = new Date().toISOString();

        grabbed.forEach((item) => {
          item.status = 'delivered';
          item.orderId = order.id;
          item.deliveredAt = nowIso;
          deliveredSerials.push(item.content);
        });
        db.save();
      }

      // If still missing items, generate fallback activation token
      while (deliveredSerials.length < order.quantity) {
        const genKey = `RCH-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-DIGITAL`;
        deliveredSerials.push(genKey);
      }
    } else if (product.deliveryType === 'downloadable') {
      deliveredSerials = [product.downloadUrl || 'https://reachmarket.local/downloads/access-token'];
    } else {
      // Manual delivery
      deliveredSerials = ['Our support staff will deliver your custom credentials via Discord/Email shortly.'];
    }

    // Update order status
    const completedAt = new Date().toISOString();
    db.updateOrder(order.id, {
      status: 'completed',
      deliveredItems: deliveredSerials,
      completedAt,
    });

    // Create Invoice automatically
    const invoice = invoiceService.generateInvoiceForOrder(order.id);

    // Record in ledger
    db.addLedgerEntry({
      type: 'sale',
      amountUsd: order.totalUsd,
      amountLtc: order.totalLtc,
      referenceId: order.id,
      description: `Sale Order #${order.orderNumber} - ${product.title} (x${order.quantity})`,
    });

    // Dispatch webhook
    webhookDispatcher.dispatch('order.completed', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
      productId: product.id,
      productTitle: product.title,
      quantity: order.quantity,
      totalUsd: order.totalUsd,
      totalLtc: order.totalLtc,
      deliveredItems: deliveredSerials,
      invoiceNumber: invoice.invoiceNumber,
      completedAt,
    });

    // Audit log
    db.addAuditLog({
      actorType: 'system',
      actorId: 'delivery-service',
      actorName: 'Automated Delivery Service',
      action: 'ORDER_DELIVERED',
      entityType: 'Order',
      entityId: order.id,
      details: {
        orderNumber: order.orderNumber,
        deliveredCount: deliveredSerials.length,
      },
    });

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      deliveredItems: deliveredSerials,
      instructions: product.instructions,
      downloadUrl: product.downloadUrl,
      productTitle: product.title,
      invoiceId: invoice.id,
    };
  }
}

export const deliveryService = new DeliveryService();
