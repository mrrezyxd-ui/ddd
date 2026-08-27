export interface StoredOrder {
  id: string;
  orderNumber: string;
  productId?: string;
  productTitle: string;
  amountUsd: number;
  amountLtc: number;
  paymentAddress?: string;
  status: 'pending' | 'completed' | 'expired' | 'refunded';
  createdAt: string;
  expiresAt?: number;
  deliveredItems?: string[];
  customerEmail?: string;
}

const STORAGE_KEY = 'rm_saved_orders';
const ACTIVE_ORDER_KEY = 'rm_active_order_id';

export const orderStorage = {
  getOrders(): StoredOrder[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveOrder(order: Partial<StoredOrder> & { id: string; orderNumber: string }): void {
    try {
      const existing = this.getOrders();
      const now = new Date().toISOString();
      const updatedItem: StoredOrder = {
        id: order.id,
        orderNumber: order.orderNumber,
        productId: order.productId,
        productTitle: order.productTitle || 'Digital Item',
        amountUsd: order.amountUsd || 0,
        amountLtc: order.amountLtc || 0,
        paymentAddress: order.paymentAddress,
        status: order.status || 'pending',
        createdAt: order.createdAt || now,
        expiresAt: order.expiresAt,
        deliveredItems: order.deliveredItems,
        customerEmail: order.customerEmail,
      };

      const filtered = existing.filter((o) => o.id !== order.id && o.orderNumber !== order.orderNumber);
      const combined = [updatedItem, ...filtered].slice(0, 30); // keep last 30 orders
      localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      localStorage.setItem(ACTIVE_ORDER_KEY, order.id);
    } catch (e) {
      console.warn('Failed to save order to localStorage', e);
    }
  },

  updateStatus(orderId: string, status: StoredOrder['status'], deliveredItems?: string[]): void {
    try {
      const existing = this.getOrders();
      const updated = existing.map((o) => {
        if (o.id === orderId || o.orderNumber === orderId) {
          return {
            ...o,
            status,
            deliveredItems: deliveredItems || o.deliveredItems,
          };
        }
        return o;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update order in localStorage', e);
    }
  },

  getActiveOrderId(): string | null {
    return localStorage.getItem(ACTIVE_ORDER_KEY);
  },

  clearActiveOrder(): void {
    localStorage.removeItem(ACTIVE_ORDER_KEY);
  },
};
