import React, { useState, useEffect } from 'react';
import { FileCode, Shield, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { Badge } from '../../components/ui/Badge.tsx';

export const AuditLogsManager: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const data = await api.getAdminAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">System Security &amp; Audit Logs</h1>
          <p className="text-xs text-zinc-400">
            Immutable log of staff actions, payouts, deliveries, and configuration modifications.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-semibold text-zinc-300 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Operator / Actor</th>
                <th className="py-3 px-4 font-semibold">Target Entity</th>
                <th className="py-3 px-4 font-semibold">Metadata</th>
                <th className="py-3 px-4 font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-800/30">
                  <td className="py-3.5 px-4 font-mono font-bold text-red-400">{log.action}</td>
                  <td className="py-3.5 px-4 text-zinc-300">{log.actor}</td>
                  <td className="py-3.5 px-4 text-zinc-400 font-mono">{log.target || '—'}</td>
                  <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px] truncate max-w-xs">
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px] text-right">
                    {new Date(log.createdAt).toLocaleString()}
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
