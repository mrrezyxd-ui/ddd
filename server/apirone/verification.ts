import { db } from '../../lib/database/index.ts';
import { Payment, Order } from '../../lib/database/types.ts';
import { ApironeCallbackPayload } from './types.ts';

export interface VerificationResult {
  valid: boolean;
  mismatch: boolean;
  message: string;
  confirmations: number;
  isConfirmed: boolean;
  amountPaidLtc: number;
  expectedLtc: number;
  txid?: string;
}

export class ApironeVerification {
  /**
   * Verifies an incoming payment against the stored order and expected amount.
   */
  public verifyPayment(payment: Payment, incomingAmountLtc: number, confirmations: number, txid?: string): VerificationResult {
    const config = db.getApironeConfig();
    const threshold = config.confirmationThreshold || 1;

    // Tolerance for minor crypto fee discrepancies (0.5%)
    const tolerance = payment.amountExpectedLtc * 0.005;
    const isFullAmount = incomingAmountLtc >= (payment.amountExpectedLtc - tolerance);
    const isPartial = incomingAmountLtc > 0 && !isFullAmount;
    const isOverpaid = incomingAmountLtc > (payment.amountExpectedLtc + tolerance);

    const isConfirmed = confirmations >= threshold && isFullAmount;

    let mismatch = false;
    let message = 'Payment pending';

    if (isPartial) {
      mismatch = true;
      message = `Partial payment received (${incomingAmountLtc.toFixed(6)} LTC of ${payment.amountExpectedLtc.toFixed(6)} LTC). Waiting for remainder.`;
    } else if (isOverpaid) {
      message = `Overpayment received (${incomingAmountLtc.toFixed(6)} LTC). Order will be fulfilled.`;
    } else if (isConfirmed) {
      message = `Payment confirmed with ${confirmations} confirmation(s).`;
    } else if (confirmations === 0 && incomingAmountLtc > 0) {
      message = `Unconfirmed transaction detected on the Litecoin network (${txid ? txid.substring(0, 10) + '...' : ''}). Awaiting 1 blockchain confirmation.`;
    }

    return {
      valid: true,
      mismatch,
      message,
      confirmations,
      isConfirmed,
      amountPaidLtc: incomingAmountLtc,
      expectedLtc: payment.amountExpectedLtc,
      txid,
    };
  }

  /**
   * Parses Apirone callback payloads whether sent as Litoshis or standard decimal.
   */
  public parseCallback(body: any): ApironeCallbackPayload {
    let amount = 0;
    if (typeof body.amount === 'number') {
      // If amount > 1000, it's in litoshis (1 LTC = 100,000,000 litoshis)
      amount = body.amount > 1000 ? body.amount / 100000000 : body.amount;
    } else if (typeof body.amount === 'string') {
      const parsed = parseFloat(body.amount);
      amount = parsed > 1000 ? parsed / 100000000 : parsed;
    }

    return {
      address: body.address || '',
      amount: amount,
      currency: body.currency || 'ltc',
      txid: body.txid || body.tx_hash || '',
      confirmations: Number(body.confirmations || 0),
      data: body.data,
      fee: body.fee,
      vout: body.vout,
    };
  }
}

export const apironeVerification = new ApironeVerification();
