import React, { useState, useEffect } from 'react';
import { Users, Shield, Plus, Key, Lock, AlertCircle, X } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { Badge } from '../../components/ui/Badge.tsx';

export const StaffManager: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('role_admin');

  const fetchData = async () => {
    try {
      const [u, r] = await Promise.all([api.getAdminUsers(), api.getAdminRoles()]);
      setUsers(u);
      setRoles(r);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAdminUser({ username, email, password, roleId });
      setUsername('');
      setEmail('');
      setPassword('');
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Staff Accounts &amp; Permissions</h1>
          <p className="text-xs text-zinc-400">
            Manage administrative operators, role-based access control, and 2FA policies.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/20 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Staff Member</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-white">Authorized Operators</h3>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400">
              <th className="py-3 px-4 font-semibold">User</th>
              <th className="py-3 px-4 font-semibold">Email</th>
              <th className="py-3 px-4 font-semibold">Role</th>
              <th className="py-3 px-4 font-semibold">2FA</th>
              <th className="py-3 px-4 font-semibold text-right">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-800/30">
                <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-red-500/20 text-red-400 text-xs">
                    {(u.username?.[0] || 'U').toUpperCase()}
                  </div>
                  <span>{u.username || 'Staff'}</span>
                </td>
                <td className="py-3.5 px-4 text-zinc-300">{u.email}</td>
                <td className="py-3.5 px-4">
                  <Badge variant={u.roleId === 'role_owner' ? 'red' : 'zinc'}>
                    {(u.roleId?.replace('role_', '') || 'STAFF').toUpperCase()}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-zinc-400">
                  {u.twoFactorEnabled ? 'Active' : 'Disabled'}
                </td>
                <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px] text-right">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Roles Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white">Defined Access Roles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {roles.map((r) => (
            <div key={r.id} className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">{r.name}</h4>
                <Shield className="h-4 w-4 text-red-400" />
              </div>
              <p className="text-xs text-zinc-400">{r.description}</p>
              <div className="pt-2 flex flex-wrap gap-1">
                {r.permissions.map((perm: string) => (
                  <span
                    key={perm}
                    className="text-[10px] font-mono text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white">Create Staff Account</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Assigned Role</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
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
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
