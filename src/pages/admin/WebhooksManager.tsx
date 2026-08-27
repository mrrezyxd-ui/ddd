import React, { useState, useEffect } from 'react';
import {
  Webhook,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  X,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { Badge } from '../../components/ui/Badge.tsx';

export const WebhooksManager: React.FC = () => {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // New Hook state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [events, setEvents] = useState<string[]>(['order.completed', 'stock.low']);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [hooks, hookLogs] = await Promise.all([api.getAdminWebhooks(), api.getWebhookLogs()]);
      setWebhooks(hooks);
      setLogs(hookLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createWebhook({ name, url, secret, events });
      setName('');
      setUrl('');
      setSecret('');
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await api.deleteWebhook(id);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTestPing = async (id: string) => {
    setTestingId(id);
    try {
      const res = await api.testWebhook(id);
      alert(res.success ? 'Ping succeeded (HTTP 200)' : `Ping failed: ${res.log.responseStatus}`);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Event Webhooks &amp; Integrations</h1>
          <p className="text-xs text-zinc-400">
            Dispatch HTTP POST webhooks for completed orders, low-stock warnings, and payment events.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/20 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Webhook Endpoint</span>
        </button>
      </div>

      {/* Webhooks List */}
      <div className="grid grid-cols-1 gap-4">
        {webhooks.map((hook) => (
          <div
            key={hook.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-bold text-white">{hook.name}</h4>
                <Badge variant={hook.active ? 'emerald' : 'zinc'}>
                  {hook.active ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <p className="font-mono text-xs text-zinc-400 break-all">{hook.url}</p>
              <div className="flex flex-wrap gap-1 pt-1">
                {hook.events.map((ev: string) => (
                  <span
                    key={ev}
                    className="text-[10px] font-mono text-red-300 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20"
                  >
                    {ev}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleTestPing(hook.id)}
                disabled={testingId === hook.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                {testingId === hook.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 text-red-400" />
                )}
                <span>Test Ping</span>
              </button>

              <button
                onClick={() => handleDelete(hook.id)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Realtime Webhook Logs */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-white">Recent Delivery Logs</h3>
          <p className="text-xs text-zinc-400">Chronological history of HTTP requests dispatched to your endpoints</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
                <th className="py-3 px-4 font-semibold">Event</th>
                <th className="py-3 px-4 font-semibold">Endpoint</th>
                <th className="py-3 px-4 font-semibold">Status Code</th>
                <th className="py-3 px-4 font-semibold">Attempts</th>
                <th className="py-3 px-4 font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-red-300">{log.event}</td>
                  <td className="py-3 px-4 font-mono text-zinc-400 truncate max-w-xs">{log.url}</td>
                  <td className="py-3 px-4">
                    <Badge variant={log.success ? 'emerald' : 'red'}>
                      {log.responseStatus ? `HTTP ${log.responseStatus}` : log.success ? 'OK' : 'FAIL'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-zinc-300">{log.attempts}</td>
                  <td className="py-3 px-4 text-zinc-500 font-mono text-[11px] text-right">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Webhook Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white">Add Webhook Endpoint</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Friendly Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Discord Bot / ERP Endpoint"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Payload URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="https://yourserver.com/api/reachmarket-hook"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Secret (HMAC Signature)</label>
                <input
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
                >
                  Create Endpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
