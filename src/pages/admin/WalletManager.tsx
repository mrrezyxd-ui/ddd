import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  RefreshCw,
  Zap,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Key,
  Radio,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { Badge } from '../../components/ui/Badge.tsx';

export const WalletManager: React.FC = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // BlockCypher Config State
  const [blockCypherConfig, setBlockCypherConfig] = useState<{
    merchantAddress: string;
    apiToken: string;
    hasApiToken: boolean;
    isConnected: boolean;
    connectionMessage?: string;
    lastTestedAt?: string;
  } | null>(null);
  const [editingAddress, setEditingAddress] = useState('LfSfvBVJTWeZFzXcNz6GED67k9hBj8jfcF');
  const [editingToken, setEditingToken] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Payout Form
  const [destinationAddress, setDestinationAddress] = useState('');
  const [amountLtc, setAmountLtc] = useState('');
  const [notes, setNotes] = useState('');
  const [deductFee, setDeductFee] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payoutResult, setPayoutResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = async () => {
    try {
      const [walletData, configData] = await Promise.all([
        api.getAdminWallet(),
        api.getBlockCypherConfig().catch(() => null),
      ]);
      setWallet(walletData);
      if (configData) {
        setBlockCypherConfig(configData);
        setEditingAddress(configData.merchantAddress || 'LfSfvBVJTWeZFzXcNz6GED67k9hBj8jfcF');
        setEditingToken(configData.apiToken || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleTestConnection = async () => {
    if (!editingAddress.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter a Litecoin merchant address to test.' });
      return;
    }
    setActionLoading(true);
    setStatusMsg(null);
    try {
      const res = await api.testAdminBlockCypher(editingAddress.trim(), editingToken.trim() || undefined);
      if (res.success) {
        setStatusMsg({ type: 'success', text: res.message });
      } else {
        setStatusMsg({ type: 'error', text: res.message });
      }
      fetchWallet();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Connection test failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddress.trim()) {
      setStatusMsg({ type: 'error', text: 'Merchant Litecoin address is required.' });
      return;
    }
    setActionLoading(true);
    setStatusMsg(null);
    try {
      const res = await api.saveBlockCypherConfig(editingAddress.trim(), editingToken.trim() || undefined);
      setStatusMsg({ type: 'success', text: res.message });
      fetchWallet();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save configuration.' });
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSetMaxAmount = () => {
    const currentBal = wallet?.balanceLtc ?? wallet?.ledgerSummary?.balanceLtc ?? 0;
    const networkFee = 0.0005;
    if (currentBal <= 0) {
      setAmountLtc('0');
      return;
    }
    if (deductFee) {
      setAmountLtc(currentBal.toFixed(6));
    } else {
      const maxSendable = Math.max(0, currentBal - networkFee);
      setAmountLtc(maxSendable.toFixed(6));
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationAddress.trim() || !amountLtc) {
      setError('Destination address and amount are required.');
      return;
    }

    const numAmount = Number(amountLtc);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid payout amount greater than 0.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setPayoutResult(null);

    try {
      const res = await api.requestPayout({
        destinationAddress: destinationAddress.trim(),
        amountLtc: numAmount,
        notes: notes.trim() || undefined,
        deductFeeFromAmount: deductFee,
      });

      setPayoutResult(res.payout);
      setDestinationAddress('');
      setAmountLtc('');
      setNotes('');
      fetchWallet();
    } catch (err: any) {
      setError(err.message || 'Payout failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !wallet) {
    return <div className="p-8 text-center text-xs text-zinc-500">Loading wallet ledger...</div>;
  }

  const ledgerSummary = wallet.ledgerSummary || {
    balanceUsd: wallet.balanceUsd ?? 0,
    balanceLtc: wallet.balanceLtc ?? 0,
    totalGrossUsd: wallet.totalGrossUsd ?? wallet.totalSalesUsd ?? 0,
    totalPayoutsLtc: wallet.totalPayoutsLtc ?? 0,
  };
  const onChainDetails = wallet.onChainDetails || {
    balanceLtc: 0,
    totalReceivedLtc: 0,
    txCount: 0,
  };
  const recentLedger = wallet.recentLedger || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Wallet &amp; BlockCypher Gateway</h1>
          <p className="text-xs text-zinc-400">
            Real Litecoin on-chain address generation, 5-second automatic transaction detection, revenue ledger, and merchant payouts.
          </p>
        </div>

        <button
          onClick={fetchWallet}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 space-y-2">
          <span className="text-xs font-semibold text-zinc-400">Store Sales Ledger (USD)</span>
          <div className="text-3xl font-black text-white font-mono">
            ${(ledgerSummary.balanceUsd || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-zinc-500">Gross: ${(ledgerSummary.totalGrossUsd || 0).toFixed(2)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 space-y-2">
          <span className="text-xs font-semibold text-zinc-400">Merchant Receiving Balance</span>
          <div className="text-3xl font-black text-red-400 font-mono">
            {(onChainDetails.balanceLtc || ledgerSummary.balanceLtc || 0).toFixed(4)} LTC
          </div>
          <p className="text-[11px] text-zinc-500 truncate">
            {editingAddress.substring(0, 14)}... &bull; {onChainDetails.txCount} txs
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 space-y-2">
          <span className="text-xs font-semibold text-zinc-400">Total Payouts Settled</span>
          <div className="text-3xl font-black text-zinc-300 font-mono">
            {(ledgerSummary.totalPayoutsLtc || 0).toFixed(4)} LTC
          </div>
          <p className="text-[11px] text-zinc-500">Direct on-chain transfers</p>
        </div>
      </div>

      {/* BlockCypher Live Gateway Configuration Box */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span>BlockCypher 5-Second Litecoin Listener</span>
              </h3>
              <Badge variant="emerald">Live On-Chain Listener Active</Badge>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Customer checkout payments are scanned on the Litecoin blockchain every 5 seconds. When the exact transaction amount is received, orders are automatically completed with instant digital stock delivery.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400 font-bold">5s Poller Online</span>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
              statusMsg.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            )}
            <div>{statusMsg.text}</div>
          </div>
        )}

        <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-zinc-300">Merchant Litecoin (LTC) Receiving Address *</label>
                {editingAddress && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(editingAddress, 'addr')}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'addr' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedKey === 'addr' ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={editingAddress}
                onChange={(e) => setEditingAddress(e.target.value)}
                placeholder="LfSfvBVJTWeZFzXcNz6GED67k9hBj8jfcF"
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-100 font-mono focus:border-amber-500 focus:outline-none"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                All customer orders will generate payment QR codes directing funds straight to this LTC address.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-zinc-300">BlockCypher API Token (Optional for higher limits)</label>
              </div>
              <input
                type="text"
                value={editingToken}
                onChange={(e) => setEditingToken(e.target.value)}
                placeholder="Optional BlockCypher API token"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-100 font-mono focus:border-amber-500 focus:outline-none"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Public queries work out of the box. Add a token for dedicated rate limit quota.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
              <span>Save Configuration</span>
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={actionLoading || !editingAddress.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-200 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Radio className="h-3.5 w-3.5 text-emerald-400" />
              <span>Test Live On-Chain Query</span>
            </button>

            <a
              href={`https://live.blockcypher.com/ltc/address/${editingAddress}/`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>View Address on BlockCypher Explorer</span>
            </a>
          </div>
        </form>
      </div>

      {/* Payout Request Box */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-7 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-red-400" />
            <span>Withdraw Litecoin (LTC Payout)</span>
          </h3>
          <p className="text-xs text-zinc-400">
            Transfer funds from your store balance to your personal external Litecoin address.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {payoutResult && (
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <strong>Payout Request Created!</strong>
              <p className="text-[11px] text-emerald-400/80 mt-0.5">
                Amount: {payoutResult.amountLtc} LTC &bull; Destination: {payoutResult.address} &bull; TX: {payoutResult.txid}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleRequestPayout} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Destination Litecoin (LTC) Address *
              </label>
              <input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                required
                placeholder="L... or M... or ltc1..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-zinc-300">Amount to Payout (LTC) *</label>
                <button
                  type="button"
                  onClick={handleSetMaxAmount}
                  className="text-[11px] font-bold text-red-400 hover:text-red-300 cursor-pointer"
                >
                  Withdraw Max ({Math.max(0, (ledgerSummary.balanceLtc || 0) - (deductFee ? 0 : 0.0005)).toFixed(6)} LTC)
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.000001"
                  value={amountLtc}
                  onChange={(e) => setAmountLtc(e.target.value)}
                  required
                  placeholder="0.135273"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 pr-16 text-zinc-100 font-mono focus:border-red-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSetMaxAmount}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 cursor-pointer"
                >
                  MAX
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                Available store balance: {(ledgerSummary.balanceLtc || 0).toFixed(6)} LTC
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Memo / Internal Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Monthly revenue withdrawal"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="deductFee"
                checked={deductFee}
                onChange={(e) => setDeductFee(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-red-600 focus:ring-red-500"
              />
              <label htmlFor="deductFee" className="text-zinc-300 text-xs cursor-pointer">
                Deduct 0.0005 LTC miner fee directly from payout amount
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            <span>Execute Payout Request</span>
          </button>
        </form>
      </div>

      {/* Ledger History */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-white">Store Ledger &amp; Transaction Journal</h3>
          <p className="text-xs text-zinc-400">Auditable chronological entries of revenue, sales, and withdrawals</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold">USD Amount</th>
                <th className="py-3 px-4 font-semibold">LTC Amount</th>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {recentLedger.map((entry: any) => {
                const isPositive = entry.type === 'deposit' || entry.type === 'sale' || entry.type === 'adjustment_credit';
                return (
                  <tr key={entry.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <Badge variant={isPositive ? 'emerald' : entry.type === 'refund' ? 'amber' : 'red'}>
                        {(entry.type || 'TX').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-zinc-200">{entry.description}</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span className={isPositive ? 'text-emerald-400' : 'text-zinc-300'}>
                        {isPositive ? '+' : '-'}${entry.amountUsd.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-400">
                      {isPositive ? '+' : '-'}{entry.amountLtc.toFixed(6)} LTC
                    </td>
                    <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
