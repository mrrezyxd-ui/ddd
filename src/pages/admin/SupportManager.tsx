import React, { useState, useEffect } from 'react';
import { LifeBuoy, Send, CheckCircle2, MessageSquare, Clock, User, X } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { SupportTicket } from '../../types/index.ts';
import { Badge } from '../../components/ui/Badge.tsx';

export const SupportManager: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyStatus, setReplyStatus] = useState<'open' | 'in_progress' | 'resolved' | 'closed'>('resolved');

  const fetchTickets = async () => {
    try {
      const data = await api.getAdminSupportTickets();
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      const res = await api.replySupportTicket(selectedTicket.id, replyMessage.trim(), replyStatus);
      setSelectedTicket(res.ticket);
      setReplyMessage('');
      fetchTickets();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Support Desk &amp; Tickets</h1>
        <p className="text-xs text-zinc-400">
          Handle customer warranty inquiries, Discord escalation links, and order assistance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-5 space-y-3">
          {tickets.map((t) => {
            const isSelected = selectedTicket?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-red-500 bg-zinc-900 shadow-lg shadow-red-500/10'
                    : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[11px] font-bold text-red-400">
                    #{t.ticketNumber}
                  </span>
                  <Badge variant={t.status === 'resolved' ? 'emerald' : t.status === 'open' ? 'red' : 'amber'}>
                    {(t.status || 'OPEN').toUpperCase()}
                  </Badge>
                </div>
                <h4 className="text-xs font-bold text-white line-clamp-1">{t.subject}</h4>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">{t.customerEmail}</p>
                <span className="text-[10px] text-zinc-500 font-mono block mt-2">
                  {new Date(t.createdAt).toLocaleDateString()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Ticket Conversation View */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5 shadow-xl">
              <div className="border-b border-zinc-800 pb-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-red-400">
                    #{selectedTicket.ticketNumber}
                  </span>
                  <Badge variant={selectedTicket.status === 'resolved' ? 'emerald' : 'amber'}>
                    {(selectedTicket.status || 'OPEN').toUpperCase()}
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-white mt-1">{selectedTicket.subject}</h3>
                <p className="text-xs text-zinc-400">From: {selectedTicket.customerEmail}</p>
                {selectedTicket.orderNumber && (
                  <p className="text-xs font-mono text-zinc-500 mt-0.5">
                    Order Ref: #{selectedTicket.orderNumber}
                  </p>
                )}
              </div>

              {/* Messages Feed */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {selectedTicket.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-4 rounded-xl text-xs space-y-1 ${
                      m.senderRole === 'customer'
                        ? 'bg-zinc-950 border border-zinc-800 text-zinc-300'
                        : 'bg-red-500/10 border border-red-500/30 text-red-100 ml-4'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className={m.senderRole === 'customer' ? 'text-zinc-400' : 'text-red-400'}>
                        {m.senderName} ({(m.senderRole || 'USER').toUpperCase()})
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="space-y-3 border-t border-zinc-800 pt-4 text-xs">
                <textarea
                  rows={3}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  required
                  placeholder="Type official staff response..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-100 focus:border-red-500 focus:outline-none"
                />

                <div className="flex items-center justify-between">
                  <select
                    value={replyStatus}
                    onChange={(e: any) => setReplyStatus(e.target.value)}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200"
                  >
                    <option value="in_progress">Mark In Progress</option>
                    <option value="resolved">Mark Resolved</option>
                    <option value="closed">Close Ticket</option>
                  </select>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-md shadow-red-600/20 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Staff Reply</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center text-xs text-zinc-500">
              Select a ticket on the left to view customer conversation and reply.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
