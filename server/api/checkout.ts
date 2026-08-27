import { Router } from 'express';
import { db } from '../../lib/database/index.ts';
import { paymentService } from '../payments/service.ts';
import { invoiceService } from '../invoices/service.ts';
import { optionalCustomer, requireAdmin, AuthenticatedRequest } from '../auth/permissions.ts';

const router = Router();

/**
 * Initiate Checkout & generate Litecoin payment address + QR code.
 */
router.post('/create', optionalCustomer, async (req: AuthenticatedRequest, res) => {
  try {
    const { productId, quantity, customerEmail, customFieldValues } = req.body;

    const email = customerEmail || req.customer?.email;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required for receipt and license delivery.' });
    }

    const result = await paymentService.createCheckout({
      productId,
      quantity: Number(quantity) || 1,
      customerEmail: email,
      customerUserId: req.customer?.id,
      customFieldValues,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      paymentAddress: result.payment.address,
      amountLtc: result.payment.amountExpectedLtc,
      amountUsd: result.payment.amountExpectedUsd,
      qrCodeDataUrl: result.qrCodeDataUrl,
      expiresAt: result.payment.expiresAt,
      expiresInSeconds: result.expiresInSeconds,
      order: result.order,
      payment: result.payment,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create checkout order.' });
  }
});

/**
 * Live polling of payment & delivery status.
 */
router.get('/order/:orderId', async (req, res) => {
  try {
    const status = await paymentService.getOrderStatus(req.params.orderId);
    res.json(status);
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Order not found.' });
  }
});

/**
 * Payment simulation for administrative testing only:
 * Requires authenticated admin session to test transition from Unpaid -> Unconfirmed -> Confirmed.
 */
router.post('/simulate-payment', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, confirmations, txid } = req.body;
    const payment = db.getPaymentByOrderId(orderId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found for this order.' });
    }

    const confCount = confirmations !== undefined ? Number(confirmations) : 1;
    const generatedTxid = txid || `ltc-sim-${Date.now()}-${Math.random().toString(16).substring(2, 8)}`;

    const result = await paymentService.handlePaymentUpdate(
      orderId,
      payment.amountExpectedLtc,
      confCount,
      generatedTxid
    );

    res.json({
      success: true,
      message: confCount >= 1 ? 'Payment confirmed! Digital delivery executed.' : 'Unconfirmed payment registered on mempool.',
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Simulation failed.' });
  }
});

/**
 * Public/Customer Invoice Viewer
 */
router.get('/invoices/:id', (req, res) => {
  const invoice = invoiceService.getInvoice(req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found.' });
  }

  const shop = db.getShopSettings();
  res.json({
    invoice,
    shop: {
      shopName: shop.shopName,
      shopDescription: shop.shopDescription,
      logoUrl: shop.logoUrl,
      supportDiscord: shop.supportDiscordUsername || '4gfi',
    },
  });
});

/**
 * Customer Orders List (by email or auth session)
 */
router.get('/my-orders', optionalCustomer, (req: AuthenticatedRequest, res) => {
  const email = (req.query.email as string) || req.customer?.email;
  if (!email) {
    return res.status(400).json({ error: 'Email parameter or login required.' });
  }

  const orders = db.getOrdersByCustomer(email);
  res.json(orders);
});

export default router;
