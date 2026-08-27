import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Zap,
  Loader2,
  X,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { Product, StockItem } from '../../types/index.ts';
import { Badge } from '../../components/ui/Badge.tsx';
import { ConfirmModal } from '../../components/ui/ConfirmModal.tsx';

export const StockManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [summary, setSummary] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Bulk import state
  const [bulkProductId, setBulkProductId] = useState<string>('');
  const [rawStockText, setRawStockText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number; duplicatesIgnored: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Deletion modal states
  const [clearTarget, setClearTarget] = useState<{ productId: string; productTitle: string } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [prods, stockData] = await Promise.all([
        api.getAdminProducts(),
        api.getAdminStock(selectedProductId !== 'all' ? selectedProductId : undefined),
      ]);
      setProducts(prods);
      setSummary(stockData.summary || []);
      setStockItems(stockData.stockItems || []);
      if (!bulkProductId && prods.length > 0) {
        setBulkProductId(prods[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProductId]);

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkProductId || !rawStockText.trim()) {
      setError('Please select a product and enter license key lines.');
      return;
    }

    setImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const res = await api.addBulkStock(bulkProductId, rawStockText);
      setImportResult({ count: res.addedCount, duplicatesIgnored: res.duplicatesIgnored });
      setRawStockText('');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to import stock lines.');
    } finally {
      setImporting(false);
    }
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteStockItem(itemToDelete.id);
      setActionNotice('Stock key removed successfully.');
      setItemToDelete(null);
      await fetchData();
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to delete stock item.');
    } finally {
      setDeleting(false);
    }
  };

  const confirmClearAvailable = async () => {
    if (!clearTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await api.clearStock(clearTarget.productId);
      setActionNotice(`Cleared available stock for "${clearTarget.productTitle}".`);
      setClearTarget(null);
      await fetchData();
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to clear stock.');
    } finally {
      setDeleting(false);
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Digital Stock &amp; Inventory Engine</h1>
          <p className="text-xs text-zinc-400">
            Bulk-import license keys, credentials, or accounts. Automated zero-leak atomic delivery assigns keys upon 1 LTC block.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchData()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer w-fit"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary.map((s) => (
          <div
            key={s.productId}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold text-white line-clamp-1">{s.productTitle}</h4>
                <p className="text-[11px] text-zinc-500">{(s.deliveryType || 'SERIAL').toUpperCase()} MODE</p>
              </div>
              <button
                type="button"
                onClick={() => setClearTarget({ productId: s.productId, productTitle: s.productTitle })}
                className="text-[10px] font-bold text-red-400 hover:text-red-300 hover:underline cursor-pointer px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20"
                title="Clear available keys"
              >
                Clear Stock
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-xl font-bold text-emerald-400">{s.available}</span>
                <span className="text-zinc-500 block text-[10px]">Available</span>
              </div>
              <div>
                <span className="text-xl font-bold text-zinc-400">{s.delivered}</span>
                <span className="text-zinc-500 block text-[10px]">Delivered</span>
              </div>
              <div>
                <span className="text-xl font-bold text-zinc-200">{s.total}</span>
                <span className="text-zinc-500 block text-[10px]">Total Logged</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk Import Box */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-7 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="h-4 w-4 text-red-400" />
            <span>Bulk License Key Importer</span>
          </h3>
          <p className="text-xs text-zinc-400">
            Paste raw license keys, tokens, or credentials line-by-line. Empty lines and duplicate keys are automatically filtered.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {importResult && (
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>
              Successfully added <strong>{importResult.count}</strong> keys to inventory. (
              {importResult.duplicatesIgnored} duplicates skipped)
            </span>
          </div>
        )}

        <form onSubmit={handleBulkImport} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Target Product *</label>
            <select
              value={bulkProductId}
              onChange={(e) => setBulkProductId(e.target.value)}
              className="w-full sm:w-80 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} (${p.priceUsd})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              License Keys / Accounts (One per line) *
            </label>
            <textarea
              rows={5}
              value={rawStockText}
              onChange={(e) => setRawStockText(e.target.value)}
              placeholder={`KEY-XXXX-YYYY-ZZZZ-0001\nKEY-XXXX-YYYY-ZZZZ-0002\nuser:pass:token_here`}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-100 font-mono focus:border-red-500 focus:outline-none text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={importing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            <span>Import Lines to Stock</span>
          </button>
        </form>
      </div>

      {/* Stock Items Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-white">Stock Items Inspector</h3>
            <p className="text-xs text-zinc-400">View individual assigned and unassigned license keys</p>
          </div>

          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 focus:border-red-500 focus:outline-none"
          >
            <option value="all">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
                <th className="py-3 px-4 font-semibold">Key / Credential Content</th>
                <th className="py-3 px-4 font-semibold">Product ID</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Created</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {stockItems.slice(0, 100).map((item) => (
                <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-zinc-200">
                    <span className="font-semibold text-red-300">{item.content}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-500">{item.productId}</td>
                  <td className="py-3 px-4">
                    <Badge variant={item.status === 'available' ? 'emerald' : item.status === 'delivered' ? 'zinc' : 'amber'}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => copyText(item.id, item.content)}
                        className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
                        title="Copy Key"
                      >
                        {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemToDelete(item)}
                        className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Delete Key"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Item Modal */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Stock Key"
        message={`Are you sure you want to permanently remove this stock key item (${itemToDelete?.content})?`}
        confirmText="Delete Key"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDeleteItem}
        onClose={() => setItemToDelete(null)}
      />

      {/* Clear Available Stock Modal */}
      <ConfirmModal
        isOpen={!!clearTarget}
        title="Clear Available Stock"
        message={`Are you sure you want to remove all unassigned available keys for "${clearTarget?.productTitle}"? Delivered keys will not be affected.`}
        confirmText="Clear All Available"
        variant="danger"
        loading={deleting}
        onConfirm={confirmClearAvailable}
        onClose={() => setClearTarget(null)}
      />
    </div>
  );
};
