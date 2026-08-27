import { db } from '../../lib/database/index.ts';

const BLOCKCYPHER_LTC_BASE = 'https://api.blockcypher.com/v1/ltc/main';
const LITECOINSPACE_API_BASE = 'https://litecoinspace.org/api';

export interface BlockCypherTxRef {
  tx_hash: string;
  block_height: number;
  tx_input_n: number;
  tx_output_n: number;
  value: number; // in satoshis
  ref_balance: number;
  spent: boolean;
  confirmations: number;
  received?: string;
  confirmed?: string;
}

export interface BlockCypherAddressResponse {
  address: string;
  total_received: number;
  total_sent: number;
  balance: number;
  unconfirmed_balance: number;
  final_balance: number;
  n_tx: number;
  unconfirmed_n_tx: number;
  final_n_tx: number;
  txrefs?: BlockCypherTxRef[];
  unconfirmed_txrefs?: BlockCypherTxRef[];
}

export class BlockCypherClient {
  private static cachedRate: { rate: number; timestamp: number } | null = null;

  public getMerchantAddress(): string {
    const shop = db.getShopSettings();
    const config = db.getBlockCypherConfig();
    return (
      config.merchantAddress ||
      (shop as any).ltcAddress ||
      (shop as any).merchantLtcAddress ||
      'LfSfvBVJTWeZFzXcNz6GED67k9hBj8jfcF'
    );
  }

  public getApiToken(): string | undefined {
    const config = db.getBlockCypherConfig();
    return config.apiToken || process.env.BLOCKCYPHER_TOKEN || undefined;
  }

  /**
   * Fetches real-time LTC to USD exchange rate from multiple high-availability price feeds
   */
  public async getLtcRate(): Promise<number> {
    const now = Date.now();
    if (BlockCypherClient.cachedRate && now - BlockCypherClient.cachedRate.timestamp < 60000) {
      return BlockCypherClient.cachedRate.rate;
    }

    // 1. Try Coinbase API
    try {
      const res = await fetch('https://api.coinbase.com/v2/prices/LTC-USD/spot', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const rate = parseFloat(json?.data?.amount);
        if (rate > 0) {
          BlockCypherClient.cachedRate = { rate, timestamp: now };
          db.updateShopSettings({ ltcRateUsd: rate, ltcToUsdRate: rate } as any);
          return rate;
        }
      }
    } catch (err) {
      // Continue to next price provider
    }

    // 2. Try CoinGecko API
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd');
      if (res.ok) {
        const json = await res.json();
        const rate = parseFloat(json?.litecoin?.usd);
        if (rate > 0) {
          BlockCypherClient.cachedRate = { rate, timestamp: now };
          db.updateShopSettings({ ltcRateUsd: rate, ltcToUsdRate: rate } as any);
          return rate;
        }
      }
    } catch (err) {
      // Continue to next
    }

    // 3. Try Binance API
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=LTCUSDT');
      if (res.ok) {
        const json = await res.json();
        const rate = parseFloat(json?.price);
        if (rate > 0) {
          BlockCypherClient.cachedRate = { rate, timestamp: now };
          db.updateShopSettings({ ltcRateUsd: rate, ltcToUsdRate: rate } as any);
          return rate;
        }
      }
    } catch (err) {
      // Continue
    }

    const shop = db.getShopSettings();
    return (shop as any).ltcRateUsd || shop.ltcToUsdRate || 110.0;
  }

  /**
   * Fetches address summary and recent unconfirmed & confirmed transactions from BlockCypher (with LitecoinSpace fallback)
   */
  public async getAddressDetails(addressToQuery?: string): Promise<{
    address: string;
    balanceLtc: number;
    unconfirmedBalanceLtc: number;
    totalReceivedLtc: number;
    txCount: number;
    transactions: Array<{
      txid: string;
      valueLtc: number;
      valueSatoshis: number;
      confirmations: number;
      receivedAt: string;
      isSpent?: boolean;
    }>;
  }> {
    const address = (addressToQuery || this.getMerchantAddress()).trim();
    const token = this.getApiToken();

    // 1. Query BlockCypher API
    try {
      const url = new URL(`${BLOCKCYPHER_LTC_BASE}/addrs/${encodeURIComponent(address)}`);
      if (token) {
        url.searchParams.set('token', token);
      }

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const data = (await res.json()) as BlockCypherAddressResponse;
        const allTxRefs = [...(data.unconfirmed_txrefs || []), ...(data.txrefs || [])];

        const transactions = allTxRefs.map((tx) => ({
          txid: tx.tx_hash,
          valueLtc: tx.value / 100000000,
          valueSatoshis: tx.value,
          confirmations: tx.confirmations || 0,
          receivedAt: tx.received || tx.confirmed || new Date().toISOString(),
          isSpent: tx.spent,
        }));

        return {
          address,
          balanceLtc: (data.balance || 0) / 100000000,
          unconfirmedBalanceLtc: (data.unconfirmed_balance || 0) / 100000000,
          totalReceivedLtc: (data.total_received || 0) / 100000000,
          txCount: (data.n_tx || 0) + (data.unconfirmed_n_tx || 0),
          transactions,
        };
      }
    } catch (bcErr) {
      console.warn(`BlockCypher query for ${address} failed, attempting fallback explorer:`, bcErr);
    }

    // 2. Fallback to open Litecoin explorer (litecoinspace.org)
    try {
      const [addrRes, txsRes] = await Promise.all([
        fetch(`${LITECOINSPACE_API_BASE}/address/${encodeURIComponent(address)}`),
        fetch(`${LITECOINSPACE_API_BASE}/address/${encodeURIComponent(address)}/txs`),
      ]);

      if (addrRes.ok) {
        const addrData = await addrRes.json();
        const txsData = txsRes.ok ? await txsRes.json() : [];

        const fundedSat = (addrData.chain_stats?.funded_txo_sum || 0) + (addrData.mempool_stats?.funded_txo_sum || 0);
        const spentSat = (addrData.chain_stats?.spent_txo_sum || 0) + (addrData.mempool_stats?.spent_txo_sum || 0);
        const balanceSat = fundedSat - spentSat;

        const transactions: Array<{
          txid: string;
          valueLtc: number;
          valueSatoshis: number;
          confirmations: number;
          receivedAt: string;
        }> = [];

        if (Array.isArray(txsData)) {
          for (const tx of txsData) {
            let satToAddress = 0;
            if (Array.isArray(tx.vout)) {
              for (const out of tx.vout) {
                if (out.scriptpubkey_address === address) {
                  satToAddress += out.value || 0;
                }
              }
            }

            if (satToAddress > 0) {
              const confs = tx.status?.confirmed ? 1 : 0;
              const timestamp = tx.status?.block_time
                ? new Date(tx.status.block_time * 1000).toISOString()
                : new Date().toISOString();

              transactions.push({
                txid: tx.txid,
                valueLtc: satToAddress / 100000000,
                valueSatoshis: satToAddress,
                confirmations: confs,
                receivedAt: timestamp,
              });
            }
          }
        }

        return {
          address,
          balanceLtc: balanceSat / 100000000,
          unconfirmedBalanceLtc: (addrData.mempool_stats?.funded_txo_sum || 0) / 100000000,
          totalReceivedLtc: fundedSat / 100000000,
          txCount: (addrData.chain_stats?.tx_count || 0) + (addrData.mempool_stats?.tx_count || 0),
          transactions,
        };
      }
    } catch (fallbackErr) {
      console.warn(`Fallback explorer also failed for ${address}:`, fallbackErr);
    }

    return {
      address,
      balanceLtc: 0,
      unconfirmedBalanceLtc: 0,
      totalReceivedLtc: 0,
      txCount: 0,
      transactions: [],
    };
  }

  /**
   * Fast 5-second on-chain verification:
   * Scans BlockCypher (and mempool) for incoming transactions matching this order's exact LTC amount.
   * As soon as seen in mempool (0-conf or confirmed) matching the amount, it returns payment found!
   */
  public async findPaymentForOrder(params: {
    orderId: string;
    expectedLtc: number;
    address: string;
    orderCreatedAt: string;
  }): Promise<{
    found: boolean;
    txid?: string;
    amountReceivedLtc?: number;
    confirmations?: number;
  }> {
    const details = await this.getAddressDetails(params.address);
    if (!details.transactions || details.transactions.length === 0) {
      return { found: false };
    }

    const expectedSatoshis = Math.round(params.expectedLtc * 100000000);
    const orderCreatedMs = new Date(params.orderCreatedAt).getTime() - 120000; // 2 min grace period for clock drift

    // Check transactions in reverse order (newest first)
    for (const tx of details.transactions) {
      const txTimeMs = new Date(tx.receivedAt).getTime();
      
      // Check if transaction occurred after order creation
      if (txTimeMs >= orderCreatedMs) {
        // Check satoshi amount match (allowing 0.00002 LTC tolerance for rounding or exact/greater match)
        const diffSatoshis = Math.abs(tx.valueSatoshis - expectedSatoshis);
        const toleranceSatoshis = 2000; // 0.00002 LTC

        if (diffSatoshis <= toleranceSatoshis || tx.valueSatoshis >= expectedSatoshis) {
          // Check if this txid was already bound to an older completed order to avoid double-spend reuse
          const existingOrder = db.getOrderByTxid(tx.txid);
          if (!existingOrder || existingOrder.id === params.orderId) {
            return {
              found: true,
              txid: tx.txid,
              amountReceivedLtc: tx.valueLtc,
              confirmations: tx.confirmations,
            };
          }
        }
      }
    }

    return { found: false };
  }
}

export const blockCypher = new BlockCypherClient();
