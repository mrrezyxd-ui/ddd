import { Router } from 'express';
import { apironeVerification } from '../apirone/verification.ts';
import { paymentService } from '../payments/service.ts';
import { db } from '../../lib/database/index.ts';

const router = Router();

/**
 * Apirone Callback Endpoint:
 * Apirone sends a POST or GET callback when transactions are observed or confirmed.
 */
router.all('/callback', async (req, res) => {
  try {
    const payload = req.method === 'POST' ? req.body : req.query;
    const orderIdQuery = req.query.orderId as string;

    const parsed = apironeVerification.parseCallback(payload);

    let identifier = orderIdQuery || parsed.address;
    if (!identifier) {
      return res.status(400).send('Missing address or orderId parameter');
    }

    const result = await paymentService.handlePaymentUpdate(
      identifier,
      parsed.amount,
      parsed.confirmations,
      parsed.txid
    );

    // Audit log
    db.addAuditLog({
      actorType: 'system',
      actorId: 'apirone-gateway',
      actorName: 'Apirone Webhook Gateway',
      action: 'APIRONE_CALLBACK_PROCESSED',
      entityType: 'Payment',
      entityId: result.payment.id,
      details: {
        address: parsed.address,
        amount: parsed.amount,
        confirmations: parsed.confirmations,
        txid: parsed.txid,
        isConfirmed: result.payment.status === 'confirmed',
      },
    });

    // Apirone expects plain text or JSON 'ok'
    res.status(200).send('OK');
  } catch (err: any) {
    console.error('Apirone webhook handling error:', err);
    res.status(500).send(`Error: ${err.message}`);
  }
});

export default router;
