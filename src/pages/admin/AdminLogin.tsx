import React, { useState, useEffect } from 'react';
import { Shield, Lock, User, ArrowRight, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { UserSession } from '../../types/index.ts';

interface AdminLoginProps {
  onSuccess: (user: UserSession, token: string) => void;
  onBackToStore: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onBackToStore }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for popup OAuth postMessage response
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.token) {
        setDiscordLoading(false);
        localStorage.setItem('rm_token', event.data.token);
        if (event.data.user) {
          onSuccess(event.data.user, event.data.token);
        } else {
          api.getCurrentUser().then((res) => {
            if (res.user) onSuccess(res.user, event.data.token);
          });
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess]);

  const handleDiscordAuth = async () => {
    setDiscordLoading(true);
    setError(null);
    try {
      const redirectUri = window.location.hostname === 'localhost'
        ? 'http://localhost/callback'
        : `${window.location.origin}/callback`;

      const data = await api.getDiscordAuthUrl(redirectUri);
      if (!data.url) {
        throw new Error('Failed to retrieve Discord authorization URL.');
      }

      const width = 580;
      const height = 720;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        data.url,
        'discord_oauth',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`
      );

      if (!authWindow) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || 'Could not initiate Discord authentication.');
      setDiscordLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your admin username/email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.adminLogin(identifier.trim(), password);
      localStorage.setItem('rm_token', res.token);
      onSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-red-600/10 blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Back Button */}
        <button
          onClick={onBackToStore}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Storefront</span>
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img
            src="/logo/reachmarket.svg"
            alt="ReachMarket"
            className="h-10 w-auto mx-auto drop-shadow-[0_4px_20px_rgba(239,68,68,0.3)]"
          />
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            <span>Staff Administration</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Sign in to manage products, stock, Litecoin payouts, and webhooks.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Discord Quick Admin Auth */}
          <button
            type="button"
            onClick={handleDiscordAuth}
            disabled={discordLoading || loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-xs font-bold text-white shadow-lg shadow-[#5865F2]/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {discordLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span>Sign In with Discord</span>
              </>
            )}
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-800 w-full" />
            <span className="bg-zinc-900 px-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider shrink-0">
              Or with password
            </span>
            <div className="border-t border-zinc-800 w-full" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || discordLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/25 transition-all disabled:opacity-50 cursor-pointer"
              id="btn-admin-login-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Access Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

