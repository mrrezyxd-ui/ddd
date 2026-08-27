import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeSettings } from '../../types/index.ts';
import { THEME_PRESETS } from '../../styles/themes.ts';

interface ThemeContextType {
  theme: ThemeSettings;
  setTheme: (theme: ThemeSettings) => void;
  applyPreset: (presetId: string) => void;
}

const DEFAULT_THEME: ThemeSettings = {
  activePreset: 'obsidian-red',
  primaryColor: '#EF4444',
  accentColor: '#DC2626',
  surfaceColor: '#18181B',
  backgroundColor: '#09090B',
  textColor: '#F4F4F5',
  mutedColor: '#A1A1AA',
  borderColor: '#27272A',
  radius: 12,
  enableCustomCursor: false,
};

const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  applyPreset: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode; initialTheme?: ThemeSettings }> = ({
  children,
  initialTheme,
}) => {
  const [theme, setThemeState] = useState<ThemeSettings>(initialTheme || DEFAULT_THEME);

  const applyThemeToDOM = (t: ThemeSettings) => {
    const root = document.documentElement;
    root.style.setProperty('--rm-primary', t.primaryColor);
    root.style.setProperty('--rm-accent', t.accentColor);
    root.style.setProperty('--rm-surface', t.surfaceColor);
    root.style.setProperty('--rm-bg', t.backgroundColor);
    root.style.setProperty('--rm-text', t.textColor);
    root.style.setProperty('--rm-muted', t.mutedColor);
    root.style.setProperty('--rm-border', t.borderColor);
    root.style.setProperty('--rm-radius', `${t.radius}px`);

    if (t.customCss) {
      let customStyleEl = document.getElementById('rm-custom-theme-css');
      if (!customStyleEl) {
        customStyleEl = document.createElement('style');
        customStyleEl.id = 'rm-custom-theme-css';
        document.head.appendChild(customStyleEl);
      }
      customStyleEl.innerHTML = t.customCss;
    }
  };

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeSettings) => {
    setThemeState(newTheme);
    applyThemeToDOM(newTheme);
  };

  const applyPreset = (presetId: string) => {
    const preset = THEME_PRESETS[presetId] || THEME_PRESETS['obsidian-red'];
    const updated: ThemeSettings = {
      ...theme,
      activePreset: preset.id as any,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      surfaceColor: preset.surfaceColor,
      backgroundColor: preset.backgroundColor,
      textColor: preset.textColor,
      mutedColor: preset.mutedColor,
      borderColor: preset.borderColor,
      radius: preset.radius,
    };
    setTheme(updated);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, applyPreset }}>
      {children}
      {theme.enableCustomCursor && <CustomCursor color={theme.primaryColor} />}
    </ThemeContext.Provider>
  );
};

const CustomCursor: React.FC<{ color: string }> = ({ color }) => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    const handleDown = () => setClicking(true);
    const handleUp = () => setClicking(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed z-50 transition-transform duration-75"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        transform: `translate(-50%, -50%) scale(${clicking ? 0.8 : 1})`,
      }}
    >
      <div
        className="h-6 w-6 rounded-full border-2 opacity-80 shadow-lg"
        style={{ borderColor: color, boxShadow: `0 0 12px ${color}` }}
      />
      <div
        className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
};
