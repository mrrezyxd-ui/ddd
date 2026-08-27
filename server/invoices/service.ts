import { db } from '../../lib/database/index.ts';
import { Invoice, Order, Payment } from '../../lib/database/types.ts';

export class InvoiceService {
  /**
   * Generates or retrieves an existing invoice for an order.
   */
  public generateInvoiceForOrder(orderId: string): Invoice {
    const existing = db.getInvoiceByIdOrNumber(orderId);
    if (existing) {
      return existing;
    }

    const order = db.getOrderByIdOrNumber(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const payment = db.getPaymentByOrderId(order.id);
    const existingInvoices = db.getInvoices();
    const nextSeq = (existingInvoices.length + 1).toString().padStart(4, '0');
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${nextSeq}`;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      invoiceNumber,
      orderId: order.id,
      customerEmail: order.customerEmail,
      items: [
        {
          title: order.productTitle,
          quantity: order.quantity,
          unitPriceUsd: order.unitPriceUsd,
          totalUsd: order.totalUsd,
        },
      ],
      subtotalUsd: order.totalUsd,
      discountUsd: 0,
      taxUsd: 0,
      totalUsd: order.totalUsd,
      totalLtc: order.totalLtc,
      paymentMethod: 'Litecoin (LTC)',
      paymentAddress: order.paymentAddress || payment?.address || '',
      txid: payment?.txid,
      status: order.status === 'completed' ? 'paid' : 'pending',
      paidAt: order.completedAt || (order.status === 'completed' ? new Date().toISOString() : undefined),
      createdAt: new Date().toISOString(),
    };

    db.createInvoice(newInvoice);
    return newInvoice;
  }

  /**
   * Gets invoice with full details, auto-generating if needed.
   */
  public getInvoice(idOrOrder: string): Invoice | undefined {
    let inv = db.getInvoiceByIdOrNumber(idOrOrder);
    if (!inv) {
      const order = db.getOrderByIdOrNumber(idOrOrder);
      if (order) {
        return this.generateInvoiceForOrder(order.id);
      }
      return undefined;
    }

    // Sync status with order if order is completed
    const order = db.getOrderByIdOrNumber(inv.orderId);
    if (order && order.status === 'completed' && inv.status !== 'paid') {
      inv.status = 'paid';
      inv.paidAt = order.completedAt || new Date().toISOString();
      const payment = db.getPaymentByOrderId(order.id);
      if (payment?.txid) inv.txid = payment.txid;
      db.save();
    }
    return inv;
  }
}

export const invoiceService = new InvoiceService();
