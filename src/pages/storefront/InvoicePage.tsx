import React, { useState, useEffect } from 'react';
import {
  Printer,
  Download,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { Invoice, ShopSettings } from '../../types/index.ts';

interface InvoicePageProps {
  invoiceId: string;
  onBack: () => void;
}

export const InvoicePage: React.FC<InvoicePageProps> = ({ invoiceId, onBack }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const data = await api.getInvoice(invoiceId);
        setInvoice(data.invoice);
        setShop(data.shop);
      } catch (err: any) {
        setError(err.message || 'Invoice not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-3">
          <h2 className="text-lg font-bold text-white">Invoice Not Found</h2>
          <p className="text-xs text-zinc-400">{error}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-white cursor-pointer"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8 print:bg-white print:text-black print:p-0">
      <div className="mx-auto max-w-3xl">
        {/* Navigation & Print Actions */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Store</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print Invoice</span>
          </button>
        </div>

        {/* Invoice Printable Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-md print:border-none print:bg-white print:shadow-none print:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-zinc-800/80 print:border-zinc-300 pb-8">
            <div>
              <img
                src={shop?.logoUrl || '/logo/reachmarket.svg'}
                alt="ReachMarket"
                className="h-9 w-auto mb-3"
              />
              <p className="text-xs text-zinc-400 print:text-zinc-600">
                Official Digital Receipt &amp; Tax Invoice
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Discord Support: @{shop?.supportDiscord || '4gfi'}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <h1 className="text-2xl font-black text-white print:text-black">
                INVOICE #{invoice.invoiceNumber}
              </h1>
              <div className="mt-2 space-y-1 text-xs text-zinc-400 print:text-zinc-600">
                <p>Date: {new Date(invoice.createdAt).toLocaleDateString()}</p>
                <p>Status: <strong className={isPaid ? 'text-emerald-400 print:text-emerald-700' : 'text-amber-400'}>{invoice.status?.toUpperCase() || 'UNPAID'}</strong></p>
                <p>Payment: {invoice.paymentMethod || 'Litecoin (LTC)'}</p>
              </div>
            </div>
          </div>

          {/* Billed To / Merchant Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-zinc-800/80 print:border-zinc-300 text-xs">
            <div>
              <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold block mb-1">
                Billed To
              </span>
              <strong className="text-sm text-zinc-200 print:text-black">{invoice.customerEmail}</strong>
            </div>

            <div className="sm:text-right">
              <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold block mb-1">
                Blockchain Gateway
              </span>
              <p className="font-mono text-zinc-300 print:text-black">Apirone Litecoin (LTC)</p>
              {invoice.paymentAddress && (
                <p className="font-mono text-[11px] text-zinc-500 break-all">{invoice.paymentAddress}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="py-6 border-b border-zinc-800/80 print:border-zinc-300">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 print:text-zinc-600">
                  <th className="pb-3 font-semibold">Item Description</th>
                  <th className="pb-3 text-center font-semibold">Qty</th>
                  <th className="pb-3 text-right font-semibold">Unit Price</th>
                  <th className="pb-3 text-right font-semibold">Amount (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 print:divide-zinc-200">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="text-zinc-200 print:text-black">
                    <td className="py-3.5 font-medium">{item.title}</td>
                    <td className="py-3.5 text-center font-mono">{item.quantity}</td>
                    <td className="py-3.5 text-right font-mono">${item.unitPriceUsd.toFixed(2)}</td>
                    <td className="py-3.5 text-right font-mono font-bold">${item.totalUsd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="pt-6 flex justify-end">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400 print:text-zinc-600">
                <span>Subtotal:</span>
                <span className="font-mono text-zinc-200 print:text-black">${invoice.subtotalUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400 print:text-zinc-600">
                <span>Tax / Gateway:</span>
                <span className="font-mono text-zinc-200 print:text-black">${invoice.taxUsd.toFixed(2)}</span>
              </div>
              <div className="border-t border-zinc-800 print:border-zinc-300 pt-2 flex justify-between text-sm font-bold text-white print:text-black">
                <span>Total Paid:</span>
                <span className="font-mono text-red-400 print:text-red-700">${invoice.totalUsd.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                <span>LTC Settled:</span>
                <span>{invoice.totalLtc.toFixed(6)} LTC</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-10 border-t border-zinc-800 print:border-zinc-300 pt-6 text-center text-xs text-zinc-500 print:text-zinc-600">
            <p>Thank you for your purchase with {shop?.shopName || 'ReachMarket'}.</p>
            <p className="mt-1 text-[11px]">
              For any licensing or refund inquiries, open a support ticket on Discord with <strong>@{shop?.supportDiscord || '4gfi'}</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
