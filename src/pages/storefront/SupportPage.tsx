import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  MessageSquare,
  Send,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { FAQItem, ShopSettings, SupportTicket } from '../../types/index.ts';

interface SupportPageProps {
  shop: ShopSettings;
}

export const SupportPage: React.FC<SupportPageProps> = ({ shop }) => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // Ticket Form
  const [customerEmail, setCustomerEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<SupportTicket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getFaqs().then(setFaqs).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail.trim() || !subject.trim() || !message.trim()) {
      setError('Please fill in your email, subject, and ticket message.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submitSupportTicket({
        customerEmail: customerEmail.trim(),
        orderNumber: orderNumber.trim() || undefined,
        subject: subject.trim(),
        message: message.trim(),
      });
      setTicketResult(res.ticket);
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-400">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Support &amp; Knowledge Base</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            How Can We Help You?
          </h1>
          <p className="text-sm text-zinc-400">
            Fast assistance for orders, cryptocurrency payment verification, or software activation.
          </p>
        </div>

        {/* Discord Priority Card */}
        <div className="rounded-2xl border border-[#5865F2]/40 bg-gradient-to-r from-[#5865F2]/15 via-zinc-900 to-zinc-900 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#8e97f5]">
                Fastest Direct Channel
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-white">
              Official Discord Support: @{shop.supportDiscordUsername || '4gfi'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-xl">
              Get 1-on-1 assistance with our verified store staff directly inside our Discord server. Instant replies for warranty claims and manual deliveries.
            </p>
          </div>

          <a
            href={shop.discordInviteUrl || 'https://discord.gg/reachmarket'}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-xs font-bold text-white shadow-lg shadow-[#5865F2]/25 transition-all cursor-pointer"
          >
            <span>Join Discord Server</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Submit Ticket */}
          <div className="lg:col-span-6 space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-7 space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white">Open a Support Ticket</h3>
                <p className="text-xs text-zinc-400">Our administrators will review your inquiry.</p>
              </div>

              {ticketResult && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Ticket Submitted Successfully!</span>
                  </div>
                  <p className="text-xs text-emerald-300">
                    Reference ID: <strong className="font-mono">{ticketResult.ticketNumber}</strong>
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    A response will be sent to your email and visible to staff.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Your Email Address *
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Order Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="e.g. 84920"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    placeholder="Issue with license key redemption"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Message Details *
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    placeholder="Describe your issue with as much detail as possible..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Submit Ticket</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: FAQs Accordion */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-red-400" />
              <span>Frequently Asked Questions</span>
            </h3>

            <div className="space-y-3">
              {faqs.map((faq) => {
                const isOpen = openFaq === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                      className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs text-zinc-200 hover:text-white cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-red-400 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-4 pt-0 text-xs text-zinc-400 border-t border-zinc-800/60 leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
