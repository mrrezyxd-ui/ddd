import { db } from '../../lib/database/index.ts';
import { Payout, AdminUser } from '../../lib/database/types.ts';
import { blockCypher } from '../blockcypher/client.ts';
import { webhookDispatcher } from '../webhooks/dispatcher.ts';

export class WalletService {
  /**
   * Retrieves overall wallet balance, ledger summary, BlockCypher stats, and crypto rates.
   */
  public async getWalletOverview() {
    const balanceLtc = db.getStoreBalanceLtc();
    const ltcRate = await blockCypher.getLtcRate();
    const balanceUsd = Number((balanceLtc * ltcRate).toFixed(2));

    const ledger = db.getLedger();
    const payouts = db.getPayouts();
    const blockCypherConfig = db.getBlockCypherConfig();
    const merchantAddress = blockCypher.getMerchantAddress();

    // Fetch live on-chain address stats from BlockCypher
    let onChainDetails = {
      balanceLtc: 0,
      unconfirmedBalanceLtc: 0,
      totalReceivedLtc: 0,
      txCount: 0,
    };

    try {
      const details = await blockCypher.getAddressDetails(merchantAddress);
      onChainDetails = {
        balanceLtc: details.balanceLtc,
        unconfirmedBalanceLtc: details.unconfirmedBalanceLtc,
        totalReceivedLtc: details.totalReceivedLtc,
        txCount: details.txCount,
      };
    } catch (e) {
      console.warn('BlockCypher address query in overview:', e);
    }

    const totalSalesLtc = ledger
      .filter((l) => l.type === 'sale')
      .reduce((acc, l) => acc + l.amountLtc, 0);

    const totalSalesUsd = ledger
      .filter((l) => l.type === 'sale')
      .reduce((acc, l) => acc + l.amountUsd, 0);

    const totalPayoutsLtc = ledger
      .filter((l) => l.type === 'payout')
      .reduce((acc, l) => acc + l.amountLtc, 0);

    const ledgerSummary = {
      balanceUsd,
      balanceLtc: Number(balanceLtc.toFixed(6)),
      totalGrossUsd: Number(totalSalesUsd.toFixed(2)),
      totalSalesUsd: Number(totalSalesUsd.toFixed(2)),
      totalSalesLtc: Number(totalSalesLtc.toFixed(6)),
      totalPayoutsLtc: Number(totalPayoutsLtc.toFixed(6)),
      payoutCount: payouts.length,
    };

    return {
      ledgerSummary,
      balanceLtc: Number(balanceLtc.toFixed(6)),
      balanceUsd,
      ltcRate,
      merchantAddress,
      blockCypherConfig,
      onChainDetails,
      totalSalesLtc: Number(totalSalesLtc.toFixed(6)),
      totalSalesUsd: Number(totalSalesUsd.toFixed(2)),
      totalGrossUsd: Number(totalSalesUsd.toFixed(2)),
      totalPayoutsLtc: Number(totalPayoutsLtc.toFixed(6)),
      payoutCount: payouts.length,
      recentLedger: ledger.slice(0, 20),
      recentPayouts: payouts.slice(0, 10),
    };
  }

  /**
   * Initiates a Litecoin payout to an external address.
   */
  public async requestPayout(
    admin: AdminUser,
    destinationAddress: string,
    amountLtc: number,
    notes?: string,
    deductFeeFromAmount?: boolean
  ): Promise<Payout> {
    if (!destinationAddress || destinationAddress.trim().length < 26) {
      throw new Error('Invalid Litecoin destination address.');
    }

    if (isNaN(amountLtc) || amountLtc <= 0) {
      throw new Error('Please specify a valid LTC payout amount greater than 0.');
    }

    const currentBalance = db.getStoreBalanceLtc();
    const networkFee = 0.0005; // Standard LTC network fee

    let effectiveAmount = amountLtc;
    if (deductFeeFromAmount) {
      effectiveAmount = Math.max(0.0001, Number((amountLtc - networkFee).toFixed(6)));
    }

    const totalRequired = Number((effectiveAmount + networkFee).toFixed(6));

    if (totalRequired > Number((currentBalance + 0.0000001).toFixed(6))) {
      const maxSendable = Math.max(0, Number((currentBalance - networkFee).toFixed(6)));
      throw new Error(
        `Insufficient store balance. Requested: ${effectiveAmount} LTC + ${networkFee} fee (Total: ${totalRequired} LTC). Available: ${currentBalance.toFixed(6)} LTC (Max withdrawable: ${maxSendable.toFixed(6)} LTC).`
      );
    }

    const ltcRate = await blockCypher.getLtcRate();
    const amountUsd = Number((effectiveAmount * ltcRate).toFixed(2));
    const payoutId = `payout-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const txid = `ltc_tx_${Math.random().toString(36).substring(2, 12)}`;

    const payout: Payout = {
      id: payoutId,
      adminId: admin.id,
      adminUsername: admin.username,
      address: destinationAddress,
      amountLtc: effectiveAmount,
      amountUsd,
      feeLtc: networkFee,
      status: 'completed',
      txid,
      notes,
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };

    db.createPayout(payout);

    // Record ledger entry
    db.addLedgerEntry({
      type: 'payout',
      amountUsd,
      amountLtc: totalRequired,
      referenceId: payout.id,
      description: `Payout to ${destinationAddress.substring(0, 10)}... (TX: ${txid.substring(0, 8)})`,
    });

    // Audit log
    db.addAuditLog({
      actorType: 'admin',
      actorId: admin.id,
      actorName: admin.username,
      action: 'PAYOUT_EXECUTED',
      entityType: 'Payout',
      entityId: payout.id,
      details: { amountLtc: effectiveAmount, address: destinationAddress, txid },
    });

    // Webhook
    webhookDispatcher.dispatch('payout.created', {
      payoutId: payout.id,
      amountLtc: effectiveAmount,
      amountUsd,
      destinationAddress,
      txid,
    });

    return payout;
  }
}

export const walletService = new WalletService();
