import React, { useState } from 'react';
import {
  Shield,
  Key,
  Lock,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Zap,
  Palette,
  Loader2,
  Wallet,
  Activity,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { THEME_PRESETS } from '../../styles/themes.ts';

interface SetupWizardProps {
  onComplete?: () => void;
  onSetupCompleted?: (data: { token: string; admin: any }) => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onSetupCompleted }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Shop Identity
  const [shopName, setShopName] = useState('Reachmart');
  const [shopDescription, setShopDescription] = useState('Your premium digital marketplace for instant software, keys, and subscriptions.');
  const [logoUrl, setLogoUrl] = useState('/logo/reachmarket.svg');
  const [supportDiscordUsername, setSupportDiscordUsername] = useState('4gfi');
  const [discordInviteUrl, setDiscordInviteUrl] = useState('https://discord.gg/Reachmarket');

  // Step 2: Admin Account
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminEmail, setAdminEmail] = useState('mrrezyxd@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  // Step 3: Auth Config
  const [emailPasswordEnabled, setEmailPasswordEnabled] = useState(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [googleRedirectUri, setGoogleRedirectUri] = useState('http://localhost/callback/google');

  const [discordEnabled, setDiscordEnabled] = useState(true);
  const [discordClientId, setDiscordClientId] = useState('1528299940839821352');
  const [discordClientSecret, setDiscordClientSecret] = useState('HENeH6ggq6-XiJR6un4JaeuEwbmhc1kh');
  const [discordRedirectUri, setDiscordRedirectUri] = useState('http://localhost/callback');

  // Step 4: Payments / BlockCypher
  const [blockCypherMerchantAddress, setBlockCypherMerchantAddress] = useState('LfSfvBVJTWeZFzXcNz6GED67k9hBj8jfcF');
  const [blockCypherApiToken, setBlockCypherApiToken] = useState('');
  const [testingBlockCypher, setTestingBlockCypher] = useState(false);
  const [blockCypherTestResult, setBlockCypherTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Step 5: Appearance
  const [themePreset, setThemePreset] = useState('deep-amber');
  const [primaryColor, setPrimaryColor] = useState('#F59E0B');
  const [accentColor, setAccentColor] = useState('#D97706');
  const [customCursor, setCustomCursor] = useState(true);

  // Final State
  const [completedData, setCompletedData] = useState<{ token: string; admin: any } | null>(null);

  const testBlockCypher = async () => {
    if (!blockCypherMerchantAddress.trim()) {
      setBlockCypherTestResult({
        success: false,
        message: 'Please enter a merchant Litecoin address first.',
      });
      return;
    }

    setTestingBlockCypher(true);
    setBlockCypherTestResult(null);
    try {
      const res = await api.testBlockCypherConnection(blockCypherMerchantAddress.trim(), blockCypherApiToken.trim());
      setBlockCypherTestResult(res);
    } catch (err: any) {
      setBlockCypherTestResult({
        success: false,
        message: err.message || 'Failed to reach BlockCypher Litecoin API',
      });
    } finally {
      setTestingBlockCypher(false);
    }
  };

  const handleNextStep = () => {
    setError(null);

    // Validation per step
    if (currentStep === 1) {
      if (!shopName.trim()) {
        setError('Shop name is required.');
        return;
      }
      if (!supportDiscordUsername.trim()) {
        setError('Support Discord username is required.');
        return;
      }
    }

    if (currentStep === 2) {
      if (!adminUsername.trim() || adminUsername.length < 3) {
        setError('Admin username must be at least 3 characters.');
        return;
      }
      if (!adminEmail.trim() || !adminEmail.includes('@')) {
        setError('Please enter a valid admin email.');
        return;
      }
      if (!adminPassword || adminPassword.length < 6) {
        setError('Admin password must be at least 6 characters.');
        return;
      }
      if (adminPassword !== adminConfirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    if (currentStep === 4) {
      if (!blockCypherMerchantAddress.trim()) {
        setError('Merchant Litecoin receiving address is required.');
        return;
      }
    }

    if (currentStep === 5) {
      handleSubmitSetup();
      return;
    }

    setCurrentStep((prev) => prev + 1);
  };

  const handleSubmitSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        shopName,
        shopDescription,
        supportDiscordUsername,
        discordInviteUrl,
        adminUsername,
        adminEmail,
        adminPassword,
        adminConfirmPassword,
        authConfig: {
          emailPasswordEnabled,
          googleEnabled,
          googleClientId,
          googleClientSecret,
          googleRedirectUri,
          discordEnabled,
          discordClientId,
          discordClientSecret,
          discordRedirectUri,
        },
        blockCypherMerchantAddress: blockCypherMerchantAddress.trim(),
        blockCypherApiToken: blockCypherApiToken.trim(),
        themePreset,
        primaryColor,
        accentColor,
        customCursor,
      };

      const res = await api.completeSetup(payload);
      localStorage.setItem('rm_token', res.token);
      setCompletedData(res);
      setCurrentStep(6);
    } catch (err: any) {
      setError(err.message || 'Setup completion failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = (target: 'store' | 'admin') => {
    if (completedData && onSetupCompleted) {
      onSetupCompleted(completedData);
    }
    if (onComplete) {
      onComplete();
    }
    if (target === 'admin') {
      window.location.hash = 'admin';
    } else {
      window.location.hash = '';
    }
    window.location.reload();
  };

  const steps = [
    { num: 1, label: 'Shop' },
    { num: 2, label: 'Admin' },
    { num: 3, label: 'Auth' },
    { num: 4, label: 'Payments' },
    { num: 5, label: 'Theme' },
    { num: 6, label: 'Done' },
  ];

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-amber-500 selection:text-black">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-amber-500/10 blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center mb-8 text-center">
          <div className="flex items-center gap-3 mb-3">
            <img
              src="/logo/reachmarket.svg"
              alt="Reachmart"
              className="h-10 w-auto drop-shadow-[0_4px_24px_rgba(245,158,11,0.25)]"
            />
            <span className="text-2xl font-black tracking-tight text-white">
              Reachmart <span className="text-amber-500 font-medium text-lg">Setup Wizard</span>
            </span>
          </div>
          <p className="text-sm text-zinc-400">
            Initialize your digital marketplace, configure BlockCypher LTC gateway, and create your super admin account.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-between px-2 sm:px-6">
          {steps.map((step, idx) => {
            const isDone = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            return (
              <React.Fragment key={step.num}>
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isDone
                        ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                        : isCurrent
                        ? 'border-2 border-amber-500 bg-amber-500/20 text-amber-400 ring-4 ring-amber-500/10'
                        : 'border border-zinc-800 bg-zinc-900 text-zinc-500'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.num}
                  </div>
                  <span
                    className={`mt-1.5 text-[11px] font-medium hidden sm:inline ${
                      isCurrent ? 'text-amber-400 font-semibold' : 'text-zinc-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 transition-colors ${
                      currentStep > step.num ? 'bg-amber-500' : 'bg-zinc-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Shop */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Step 1 — Shop Details</h2>
                <p className="text-xs text-zinc-400">Configure your storefront identity and support links.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Shop Name</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                    placeholder="Reachmart"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Shop Description</label>
                  <textarea
                    rows={2}
                    value={shopDescription}
                    onChange={(e) => setShopDescription(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                    placeholder="Your digital marketplace"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Support Discord Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-zinc-500 text-sm">@</span>
                      <input
                        type="text"
                        value={supportDiscordUsername}
                        onChange={(e) => setSupportDiscordUsername(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-8 pr-4 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none font-mono"
                        placeholder="4gfi"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Discord Server Invite URL
                    </label>
                    <input
                      type="url"
                      value={discordInviteUrl}
                      onChange={(e) => setDiscordInviteUrl(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                      placeholder="https://discord.gg/Reachmarket"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Store Logo URL</label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none font-mono text-xs"
                    placeholder="/logo/reachmarket.svg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Create Admin */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Step 2 — Super Admin Account</h2>
                <p className="text-xs text-zinc-400">
                  Create your master administrator credentials. Passwords are securely hashed with bcrypt.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Admin Username</label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                    placeholder="admin"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Admin Email</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                    placeholder="mrrezyxd@gmail.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Admin Password</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Confirm Password</label>
                    <input
                      type="password"
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Authentication */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Step 3 — Customer Authentication</h2>
                <p className="text-xs text-zinc-400">Enable Discord OAuth and Email/Password sign-in options.</p>
              </div>

              <div className="space-y-4">
                {/* Discord OAuth */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-amber-300">Discord OAuth 2.0</h4>
                      <p className="text-xs text-zinc-400">1-click instant login via Discord</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={discordEnabled}
                      onChange={(e) => setDiscordEnabled(e.target.checked)}
                      className="h-4 w-4 accent-amber-500 rounded"
                    />
                  </div>

                  {discordEnabled && (
                    <div className="pt-2 space-y-2 text-xs">
                      <div>
                        <label className="text-zinc-400 block mb-1">Discord Client ID</label>
                        <input
                          type="text"
                          value={discordClientId}
                          onChange={(e) => setDiscordClientId(e.target.value)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
                          placeholder="1528299940839821352"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 block mb-1">Discord Client Secret</label>
                        <input
                          type="password"
                          value={discordClientSecret}
                          onChange={(e) => setDiscordClientSecret(e.target.value)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
                          placeholder="HENeH6ggq6-XiJR6un4JaeuEwbmhc1kh"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 block mb-1">OAuth Redirect URI</label>
                        <input
                          type="text"
                          value={discordRedirectUri}
                          onChange={(e) => setDiscordRedirectUri(e.target.value)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
                          placeholder="http://localhost/callback"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Email / Password */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-950">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-100">Standard Email & Password</h4>
                    <p className="text-xs text-zinc-500">Allow customers to register directly on the website</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailPasswordEnabled}
                    onChange={(e) => setEmailPasswordEnabled(e.target.checked)}
                    className="h-4 w-4 accent-amber-500 rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Payments / BlockCypher */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Step 4 — Litecoin Payment Gateway</h2>
                  <span className="text-xs px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-semibold flex items-center gap-1.5">
                    <Activity className="h-3 w-3 animate-pulse" />
                    <span>BlockCypher (LTC)</span>
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Configure your receiving Litecoin address. The 5-second automatic scanner verifies customer payments on-chain in real time.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Merchant Litecoin Receiving Address
                  </label>
                  <input
                    type="text"
                    value={blockCypherMerchantAddress}
                    onChange={(e) => setBlockCypherMerchantAddress(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 font-mono focus:border-amber-500 focus:outline-none"
                    placeholder="LfSfvBVJTWeZFzXcNz6GED67k9hBj8jfcF"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    All LTC customer checkout payments will be sent directly to this on-chain wallet.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    BlockCypher API Token (Optional)
                  </label>
                  <input
                    type="password"
                    value={blockCypherApiToken}
                    onChange={(e) => setBlockCypherApiToken(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 font-mono focus:border-amber-500 focus:outline-none"
                    placeholder="Optional (public rate-limits suffice for standard volume)"
                  />
                </div>

                {/* Connection Test Action */}
                <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-semibold text-zinc-200">Test On-Chain Connection</h5>
                    <p className="text-[11px] text-zinc-500">Query BlockCypher to verify address balance and transactions</p>
                  </div>
                  <button
                    type="button"
                    onClick={testBlockCypher}
                    disabled={testingBlockCypher}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {testingBlockCypher ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-amber-400" />}
                    <span>Test Connection</span>
                  </button>
                </div>

                {blockCypherTestResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      blockCypherTestResult.success
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    {blockCypherTestResult.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    )}
                    <span>{blockCypherTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Appearance */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Step 5 — Theme & Appearance</h2>
                <p className="text-xs text-zinc-400">Select your visual identity preset and accent colors.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.values(THEME_PRESETS).map((preset) => {
                    const isSelected = themePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setThemePreset(preset.id);
                          setPrimaryColor(preset.primaryColor);
                          setAccentColor(preset.accentColor);
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30'
                            : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-zinc-200">{preset.name}</span>
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: preset.primaryColor }}
                          />
                        </div>
                        <p className="text-[11px] text-zinc-500 line-clamp-2">{preset.description}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-950">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-100">Custom Glowing Cursor</h4>
                    <p className="text-xs text-zinc-500">Enable interactive neon pointer styling</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={customCursor}
                    onChange={(e) => setCustomCursor(e.target.checked)}
                    className="h-4 w-4 accent-amber-500 rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Finished */}
          {currentStep === 6 && (
            <div className="text-center py-6 space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-white">Setup Completed!</h2>
                <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto">
                  Reachmart is now initialized with your super admin account and BlockCypher 5-second Litecoin real-time payments.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 text-left space-y-2 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Shop Name:</span>
                  <strong className="text-zinc-200">{shopName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Admin User:</span>
                  <strong className="text-zinc-200">{adminUsername}</strong>
                </div>
                <div className="flex justify-between">
                  <span>LTC Merchant Wallet:</span>
                  <strong className="text-zinc-200 font-mono text-[11px] truncate max-w-[200px]">{blockCypherMerchantAddress}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Discord Support:</span>
                  <strong className="text-zinc-200">@{supportDiscordUsername || '4gfi'}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleFinish('store')}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition-all cursor-pointer"
                >
                  <span>Go to Storefront</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleFinish('admin')}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-bold text-black shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
                >
                  <Shield className="h-4 w-4" />
                  <span>Open Admin Panel</span>
                </button>
              </div>
            </div>
          )}

          {/* Navigation Controls (Steps 1 to 5) */}
          {currentStep < 6 && (
            <div className="mt-8 flex items-center justify-between border-t border-zinc-800/80 pt-6">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((p) => p - 1)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleNextStep}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>{currentStep === 5 ? 'Complete Installation' : 'Continue'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
