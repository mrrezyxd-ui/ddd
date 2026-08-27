import React, { useState, useEffect } from 'react';
import { FileText, Eye, Download, Search, RefreshCw, Printer } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { Invoice } from '../../types/index.ts';
import { Badge } from '../../components/ui/Badge.tsx';

interface InvoicesManagerProps {
  onViewInvoice: (invoiceId: string) => void;
}

export const InvoicesManager: React.FC<InvoicesManagerProps> = ({ onViewInvoice }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchInvoices = async () => {
    try {
      const data = await api.getAdminInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filtered = (Array.isArray(invoices) ? invoices : []).filter(
    (i) =>
      (i.invoiceNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.customerEmail || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Tax &amp; Sales Invoices</h1>
          <p className="text-xs text-zinc-400">
            Exportable receipts generated for every completed digital transaction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number, email..."
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-1.5 text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
          />
          <button
            onClick={fetchInvoices}
            className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
                <th className="py-3 px-4 font-semibold">Invoice #</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Amount (USD)</th>
                <th className="py-3 px-4 font-semibold">Amount (LTC)</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-zinc-800/30">
                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    #{inv.invoiceNumber}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">{inv.customerEmail}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    ${inv.totalUsd.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-red-400">
                    {inv.totalLtc.toFixed(6)} LTC
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={inv.status === 'paid' ? 'emerald' : 'amber'}>
                      {(inv.status || 'UNPAID').toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onViewInvoice(inv.id)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 ml-auto transition-colors cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Receipt</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
