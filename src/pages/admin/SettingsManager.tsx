import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  Key,
  Globe,
  Loader2,
  Lock,
  Zap,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { ShopSettings, AuthConfig } from '../../types/index.ts';

interface SettingsManagerProps {
  onShopUpdate: (shop: ShopSettings) => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ onShopUpdate }) => {
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [shopName, setShopName] = useState('ReachMarket');
  const [logoUrl, setLogoUrl] = useState('/logo/reachmarket.svg');
  const [bannerUrl, setBannerUrl] = useState('');
  const [supportDiscordUsername, setSupportDiscordUsername] = useState('4gfi');
  const [discordInviteUrl, setDiscordInviteUrl] = useState('');
  const [merchantLtcAddress, setMerchantLtcAddress] = useState('LfSfvBVJTWeZFzXcNz6GED67k9hBj8jfcF');
  const [blockcypherToken, setBlockcypherToken] = useState('');
  const [ltcRateUsd, setLtcRateUsd] = useState('110.00');
  const [rateLimitEnabled, setRateLimitEnabled] = useState(true);

  // Discord OAuth fields
  const [discordEnabled, setDiscordEnabled] = useState(true);
  const [discordClientId, setDiscordClientId] = useState('1528299940839821352');
  const [discordClientSecret, setDiscordClientSecret] = useState('HENeH6ggq6-XiJR6un4JaeuEwbmhc1kh');
  const [discordRedirectUri, setDiscordRedirectUri] = useState('http://localhost/callback');

  useEffect(() => {
    Promise.all([
      api.getStorefront(),
      api.getAdminSettings().catch(() => null),
    ])
      .then(([storefrontData, adminSettings]) => {
        const s = storefrontData.shop;
        setShop(s);
        setShopName(s.shopName || 'ReachMarket');
        setLogoUrl(s.logoUrl || '/logo/reachmarket.svg');
        setBannerUrl(s.bannerUrl || '');
        setSupportDiscordUsername(s.supportDiscordUsername || '4gfi');
        setDiscordInviteUrl(s.discordInviteUrl || '');
        setMerchantLtcAddress(
          s.merchantLtcAddress || (s as any).ltcAddress || 'LfSfvBVJTWeZFzXcNz6GED67k9hBj8jfcF'
        );
        setBlockcypherToken(s.blockcypherToken || '');
        setLtcRateUsd((s.ltcRateUsd || 110).toString());
        setRateLimitEnabled(s.rateLimitEnabled ?? true);

        if (adminSettings?.blockCypherConfig) {
          const bc = adminSettings.blockCypherConfig;
          if (bc.merchantAddress) setMerchantLtcAddress(bc.merchantAddress);
        }

        if (adminSettings?.authConfig) {
          const auth = adminSettings.authConfig;
          setDiscordEnabled(auth.discordEnabled ?? true);
          if (auth.discordClientId) setDiscordClientId(auth.discordClientId);
          if (auth.discordClientSecret) setDiscordClientSecret(auth.discordClientSecret);
          if (auth.discordRedirectUri) setDiscordRedirectUri(auth.discordRedirectUri);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const cleanAddress = merchantLtcAddress.trim() || 'LfSfvBVJTWeZFzXcNz6GED67k9hBj8jfcF';
      const payload: Partial<ShopSettings> = {
        shopName: shopName.trim(),
        logoUrl: logoUrl.trim(),
        bannerUrl: bannerUrl.trim() || undefined,
        supportDiscordUsername: supportDiscordUsername.trim(),
        discordInviteUrl: discordInviteUrl.trim(),
        merchantLtcAddress: cleanAddress,
        blockcypherToken: blockcypherToken.trim(),
        ltcRateUsd: Number(ltcRateUsd),
        rateLimitEnabled,
      };

      const [updated] = await Promise.all([
        api.updateStoreSettings(payload),
        api.updateBlockCypherSettings({
          merchantAddress: cleanAddress,
          apiToken: blockcypherToken.trim() || undefined,
        }).catch(() => null),
        api.updateAuthSettings({
          discordEnabled,
          discordClientId: discordClientId.trim(),
          discordClientSecret: discordClientSecret.trim(),
          discordRedirectUri: discordRedirectUri.trim() || 'http://localhost/callback',
        }).catch(() => null),
      ]);

      setShop(updated);
      onShopUpdate(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !shop) {
    return <div className="p-8 text-center text-xs text-zinc-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Storefront &amp; Gateway Settings</h1>
          <p className="text-xs text-zinc-400">
            Configure ReachMarket branding, Discord OAuth credentials, and BlockCypher Litecoin receiver address.
          </p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Store &amp; BlockCypher Litecoin settings successfully updated!</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Brand & Identity */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="h-4 w-4 text-red-400" />
            <span>Store Branding &amp; Discord Support</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Store Name *</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Discord Support Handle *
              </label>
              <input
                type="text"
                value={supportDiscordUsername}
                onChange={(e) => setSupportDiscordUsername(e.target.value)}
                required
                placeholder="4gfi"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Logo URL</label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono text-xs focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Discord Invite URL</label>
              <input
                type="url"
                value={discordInviteUrl}
                onChange={(e) => setDiscordInviteUrl(e.target.value)}
                placeholder="https://discord.gg/reachmarket"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono text-xs focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Discord OAuth Integration */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <svg className="h-4 w-4 fill-[#5865F2]" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span>Discord Authentication &amp; OAuth 2.0</span>
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={discordEnabled}
                onChange={(e) => setDiscordEnabled(e.target.checked)}
                className="h-4 w-4 accent-red-600 rounded"
              />
              <span className="text-zinc-300 font-semibold">Enable Discord Login</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Discord Client ID</label>
              <input
                type="text"
                value={discordClientId}
                onChange={(e) => setDiscordClientId(e.target.value)}
                placeholder="1528299940839821352"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono text-xs focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Discord Client Secret</label>
              <input
                type="password"
                value={discordClientSecret}
                onChange={(e) => setDiscordClientSecret(e.target.value)}
                placeholder="HENeH6ggq6-XiJR6un4JaeuEwbmhc1kh"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono text-xs focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">OAuth Redirect URI</label>
            <input
              type="text"
              value={discordRedirectUri}
              onChange={(e) => setDiscordRedirectUri(e.target.value)}
              placeholder="http://localhost/callback"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono text-xs focus:border-red-500 focus:outline-none"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Ensure this exact Redirect URI is added in your Discord Developer Portal under OAuth2 &gt; Redirects.
            </p>
          </div>
        </div>

        {/* BlockCypher Litecoin Gateway */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>BlockCypher 5-Second Litecoin Gateway</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Merchant Receiving LTC Address *
              </label>
              <input
                type="text"
                value={merchantLtcAddress}
                onChange={(e) => setMerchantLtcAddress(e.target.value)}
                placeholder="LfSfvBVJTWeZFzXcNz6GED67k9hBj8jfcF"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Direct customer checkout funds are forwarded to this address and checked every 5 seconds.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                BlockCypher API Token (Optional)
              </label>
              <input
                type="password"
                value={blockcypherToken}
                onChange={(e) => setBlockcypherToken(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Leave empty for default public BlockCypher node querying.
              </p>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Fallback LTC / USD Rate Override
            </label>
            <input
              type="number"
              step="0.01"
              value={ltcRateUsd}
              onChange={(e) => setLtcRateUsd(e.target.value)}
              className="w-full sm:w-64 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono text-xs focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Security & Rate Limiting */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-400" />
            <span>Marketplace Security &amp; Rate Limiting</span>
          </h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={rateLimitEnabled}
              onChange={(e) => setRateLimitEnabled(e.target.checked)}
              className="h-4 w-4 accent-red-600 rounded"
            />
            <div>
              <span className="font-semibold text-zinc-200 block">
                Enable Anti-Spam &amp; Checkout Rate Limiting
              </span>
              <span className="text-[11px] text-zinc-500">
                Throttles abusive address generation and DDoS attacks
              </span>
            </div>
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save All Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
