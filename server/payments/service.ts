import QRCode from 'qrcode';
import { db } from '../../lib/database/index.ts';
import { Order, Payment } from '../../lib/database/types.ts';
import { blockCypher } from '../blockcypher/client.ts';
import { deliveryService } from '../delivery/service.ts';
import { webhookDispatcher } from '../webhooks/dispatcher.ts';

export interface CreateOrderParams {
  productId: string;
  quantity: number;
  customerEmail: string;
  customerUserId?: string;
  customFieldValues?: Record<string, string>;
  ipAddress?: string;
  userAgent?: string;
}

export interface CheckoutResult {
  order: Order;
  payment: Payment;
  qrCodeDataUrl: string;
  expiresInSeconds: number;
}

export class PaymentService {
  /**
   * Creates a new order, reserves stock, creates LTC payment address and QR code.
   */
  public async createCheckout(params: CreateOrderParams): Promise<CheckoutResult> {
    const { productId, quantity, customerEmail, customerUserId, customFieldValues, ipAddress, userAgent } = params;

    if (!customerEmail || !customerEmail.includes('@')) {
      throw new Error('Valid email address is required for delivery receipt.');
    }

    const product = db.getProductByIdOrSlug(productId);
    if (!product || !product.active) {
      throw new Error('Product is unavailable or inactive.');
    }

    if (quantity < (product.minQuantity || 1)) {
      throw new Error(`Minimum purchase quantity is ${product.minQuantity || 1}.`);
    }

    if (product.maxQuantity && quantity > product.maxQuantity) {
      throw new Error(`Maximum purchase quantity is ${product.maxQuantity}.`);
    }

    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const orderNumber = `RM-${Math.floor(10000 + Math.random() * 90000)}`;

    // Atomic Stock Reservation
    if (product.deliveryType === 'automatic') {
      const reserved = db.reserveStock(product.id, quantity, orderId, 900);
      if (!reserved) {
        throw new Error('Insufficient available stock for this product quantity.');
      }
    }

    // Live LTC Conversion Calculation via BlockCypher / Price Feeds
    const ltcRate = await blockCypher.getLtcRate();
    const totalUsd = Number((product.priceUsd * quantity).toFixed(2));
    const totalLtc = Number((totalUsd / ltcRate).toFixed(6));

    // Receiving merchant Litecoin address
    const address = blockCypher.getMerchantAddress();

    // Generate URI: litecoin:ADDRESS?amount=AMOUNT
    const ltcUri = `litecoin:${address}?amount=${totalLtc}&label=Reachmart%20Order%20${orderNumber}`;
    const qrCodeDataUrl = await QRCode.toDataURL(ltcUri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000; // 15 minutes window

    // Create Payment Record
    const payment: Payment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: orderId,
      provider: 'blockcypher',
      currency: 'ltc',
      address,
      amountExpectedLtc: totalLtc,
      amountPaidLtc: 0,
      amountExpectedUsd: totalUsd,
      status: 'unpaid',
      confirmations: 0,
      requiredConfirmations: db.getBlockCypherConfig().confirmationThreshold ?? 1,
      qrCodeDataUrl,
      expiresAt,
      createdAt: now,
      rawPayload: {
        provider: 'blockcypher',
        address,
        amountExpectedLtc: totalLtc,
        ltcRate,
      },
    };
    db.createPayment(payment);

    // Create Order Record
    const order: Order = {
      id: orderId,
      orderNumber,
      customerEmail,
      customerUserId,
      productId: product.id,
      productTitle: product.title,
      quantity,
      unitPriceUsd: product.priceUsd,
      totalUsd,
      totalLtc,
      currency: 'LTC',
      status: 'pending',
      paymentId: payment.id,
      paymentAddress: address,
      deliveredItems: [],
      customFieldValues,
      ipAddress,
      userAgent,
      createdAt: new Date().toISOString(),
    };
    db.createOrder(order);

    // Dispatch webhook: order.created
    webhookDispatcher.dispatch('order.created', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
      productId: product.id,
      productTitle: product.title,
      quantity,
      totalUsd,
      totalLtc,
      paymentAddress: address,
      expiresAt: new Date(expiresAt).toISOString(),
    });

    return {
      order,
      payment,
      qrCodeDataUrl,
      expiresInSeconds: Math.floor((expiresAt - now) / 1000),
    };
  }

  /**
   * Retrieves live status of an order and its Litecoin payment with 5-second fast BlockCypher transaction check.
   */
  public async getOrderStatus(orderId: string) {
    const order = db.getOrderByIdOrNumber(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    let payment = db.getPaymentByOrderId(order.id);
    const product = db.getProductByIdOrSlug(order.productId);
    const invoice = db.getInvoiceByIdOrNumber(order.id);

    const now = Date.now();
    const isExpired = payment && payment.status === 'unpaid' && now > payment.expiresAt;

    if (isExpired && order.status === 'pending') {
      db.updateOrder(order.id, { status: 'expired' });
      if (payment) {
        db.updatePayment(payment.id, { status: 'expired' });
      }
      db.releaseStockReservation(order.id);
    }

    // Fast on-chain transaction polling from BlockCypher (and Litecoin mempool) if order is pending/unpaid
    if (
      payment &&
      (payment.status === 'unpaid' || payment.status === 'unconfirmed') &&
      order.status !== 'completed' &&
      !isExpired
    ) {
      try {
        const checkResult = await blockCypher.findPaymentForOrder({
          orderId: order.id,
          expectedLtc: payment.amountExpectedLtc,
          address: payment.address,
          orderCreatedAt: order.createdAt,
        });

        if (checkResult.found && checkResult.amountReceivedLtc) {
          await this.handlePaymentUpdate(
            order.id,
            checkResult.amountReceivedLtc,
            checkResult.confirmations ?? 1,
            checkResult.txid
          );
        }
      } catch (pollErr) {
        console.warn(`BlockCypher fast check error for order ${order.id}:`, pollErr);
      }
    }

    const refreshedOrder = db.getOrderByIdOrNumber(order.id)!;
    const refreshedPayment = db.getPaymentByOrderId(order.id)!;

    return {
      order: refreshedOrder,
      payment: refreshedPayment,
      product: product
        ? {
            id: product.id,
            title: product.title,
            slug: product.slug,
            image: product.images?.[0],
            instructions: product.instructions,
            downloadUrl: product.downloadUrl,
            deliveryType: product.deliveryType,
          }
        : null,
      invoice: invoice ? { id: invoice.id, invoiceNumber: invoice.invoiceNumber } : null,
      timeRemainingSeconds: refreshedPayment
        ? Math.max(0, Math.floor((refreshedPayment.expiresAt - now) / 1000))
        : 0,
    };
  }

  /**
   * Processes a detected payment and instantly marks completed + delivers stock.
   */
  public async handlePaymentUpdate(
    orderIdOrAddress: string,
    amountPaidLtc: number,
    confirmations: number = 1,
    txid?: string
  ): Promise<{ success: boolean; order: Order; payment: Payment; deliveryResult?: any }> {
    let payment = db.getPaymentByOrderId(orderIdOrAddress);
    if (!payment) {
      payment = db.getPaymentByAddress(orderIdOrAddress);
    }

    if (!payment) {
      throw new Error(`No payment found for identifier ${orderIdOrAddress}`);
    }

    const order = db.getOrderByIdOrNumber(payment.orderId);
    if (!order) {
      throw new Error(`Associated order ${payment.orderId} not found`);
    }

    const tolerance = 0.00002;
    const isAmountSatisfied = amountPaidLtc >= payment.amountExpectedLtc - tolerance;

    let newPaymentStatus: Payment['status'] = 'confirmed';
    if (!isAmountSatisfied) {
      newPaymentStatus = 'partially_paid';
    } else if (confirmations === 0) {
      // Even if 0-conf mempool, as requested: complete it immediately or mark confirmed
      newPaymentStatus = 'confirmed';
    }

    const updatedPayment = db.updatePayment(payment.id, {
      amountPaidLtc: amountPaidLtc,
      confirmations: confirmations,
      status: newPaymentStatus,
      txid: txid || payment.txid || `ltc_tx_${Date.now()}`,
      confirmedAt: Date.now(),
      callbackReceivedAt: Date.now(),
    })!;

    let deliveryResult = undefined;

    // If payment satisfied and order not yet completed, execute instant digital delivery
    if (isAmountSatisfied && order.status !== 'completed') {
      deliveryResult = deliveryService.executeDelivery(order.id);
    }

    const updatedOrder = db.getOrderByIdOrNumber(order.id)!;

    return {
      success: true,
      order: updatedOrder,
      payment: updatedPayment,
      deliveryResult,
    };
  }
}

export const paymentService = new PaymentService();
