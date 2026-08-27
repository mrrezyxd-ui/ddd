import React, { useState, useEffect } from 'react';
import {
  Palette,
  CheckCircle2,
  Sparkles,
  Code,
  Save,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { useTheme } from '../../components/theme/ThemeProvider.tsx';
import { THEME_PRESETS } from '../../styles/themes.ts';
import { ThemeSettings } from '../../types/index.ts';

export const ThemeEditor: React.FC = () => {
  const { theme, setTheme, applyPreset } = useTheme();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Local state
  const [activePreset, setActivePreset] = useState(theme.activePreset);
  const [primaryColor, setPrimaryColor] = useState(theme.primaryColor);
  const [accentColor, setAccentColor] = useState(theme.accentColor);
  const [surfaceColor, setSurfaceColor] = useState(theme.surfaceColor);
  const [backgroundColor, setBackgroundColor] = useState(theme.backgroundColor);
  const [customCursor, setCustomCursor] = useState(theme.enableCustomCursor);
  const [customCss, setCustomCss] = useState(theme.customCss || '');

  useEffect(() => {
    setActivePreset(theme.activePreset);
    setPrimaryColor(theme.primaryColor);
    setAccentColor(theme.accentColor);
    setSurfaceColor(theme.surfaceColor);
    setBackgroundColor(theme.backgroundColor);
    setCustomCursor(theme.enableCustomCursor);
    setCustomCss(theme.customCss || '');
  }, [theme]);

  const handleSelectPreset = (presetId: string) => {
    const preset = THEME_PRESETS[presetId];
    if (!preset) return;
    setActivePreset(presetId as any);
    setPrimaryColor(preset.primaryColor);
    setAccentColor(preset.accentColor);
    setSurfaceColor(preset.surfaceColor);
    setBackgroundColor(preset.backgroundColor);

    // Update live preview
    setTheme({
      ...theme,
      activePreset: presetId as any,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      surfaceColor: preset.surfaceColor,
      backgroundColor: preset.backgroundColor,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);

    try {
      const payload: ThemeSettings = {
        ...theme,
        activePreset,
        primaryColor,
        accentColor,
        surfaceColor,
        backgroundColor,
        enableCustomCursor: customCursor,
        customCss,
      };

      const updated = await api.updateThemeSettings(payload);
      setTheme(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save theme settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Visual Themes &amp; Styles</h1>
          <p className="text-xs text-zinc-400">
            Customize the storefront color scheme, cyberpunk glowing accents, and custom CSS overrides.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/25 transition-all disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{saving ? 'Saving...' : 'Save Appearance'}</span>
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Theme changes saved and applied across ReachMarket!</span>
        </div>
      )}

      {/* Preset Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white">Curated Theme Presets</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(THEME_PRESETS).map((p) => {
            const isCurrent = activePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-red-500 bg-red-500/10 ring-2 ring-red-500/30'
                    : 'border-zinc-800 bg-zinc-900/90 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">{p.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: p.primaryColor }} />
                    <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: p.backgroundColor }} />
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{p.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Colors & Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Colors Palette */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-4 shadow-xl">
          <h4 className="text-sm font-bold text-white">Fine-tune Color Variables</h4>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">Primary Color (Buttons &amp; Badges)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-12 rounded cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono text-xs focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Accent Highlight</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-9 w-12 rounded cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono text-xs focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Surface Card Background</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={surfaceColor}
                  onChange={(e) => setSurfaceColor(e.target.value)}
                  className="h-9 w-12 rounded cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={surfaceColor}
                  onChange={(e) => setSurfaceColor(e.target.value)}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 font-mono text-xs focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cyber Cursor & Effects */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-4 shadow-xl">
          <h4 className="text-sm font-bold text-white">Interactive Features</h4>

          <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950">
            <div>
              <h5 className="text-xs font-semibold text-zinc-200">Cyber Glowing Cursor</h5>
              <p className="text-[11px] text-zinc-500">Injects interactive particle tracking pointer</p>
            </div>
            <input
              type="checkbox"
              checked={customCursor}
              onChange={(e) => setCustomCursor(e.target.checked)}
              className="h-4 w-4 accent-red-600 rounded cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Custom CSS Overrides
            </label>
            <textarea
              rows={4}
              value={customCss}
              onChange={(e) => setCustomCss(e.target.value)}
              placeholder={`/* Custom CSS injected into document */\n.rm-custom-card { border-radius: 16px; }`}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
