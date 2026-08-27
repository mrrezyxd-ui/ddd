export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  radius: number;
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  'obsidian-red': {
    id: 'obsidian-red',
    name: 'Obsidian Red (Default)',
    description: 'The signature ReachMarket dark cyber aesthetic with vibrant crimson accents.',
    primaryColor: '#EF4444',
    accentColor: '#DC2626',
    surfaceColor: '#18181B',
    backgroundColor: '#09090B',
    textColor: '#F4F4F5',
    mutedColor: '#A1A1AA',
    borderColor: '#27272A',
    radius: 12,
  },
  'midnight-emerald': {
    id: 'midnight-emerald',
    name: 'Midnight Emerald',
    description: 'Deep midnight obsidian paired with electric matrix emerald green.',
    primaryColor: '#10B981',
    accentColor: '#059669',
    surfaceColor: '#0C1C14',
    backgroundColor: '#050D09',
    textColor: '#F0FDF4',
    mutedColor: '#6EE7B7',
    borderColor: '#133E2B',
    radius: 12,
  },
  'cyber-violet': {
    id: 'cyber-violet',
    name: 'Cyber Violet',
    description: 'High-contrast ultraviolet nodes on a pitch dark space background.',
    primaryColor: '#A855F7',
    accentColor: '#9333EA',
    surfaceColor: '#171224',
    backgroundColor: '#0A0612',
    textColor: '#FAF5FF',
    mutedColor: '#C084FC',
    borderColor: '#2E1A47',
    radius: 12,
  },
  'crimson-monochrome': {
    id: 'crimson-monochrome',
    name: 'Crimson Monochrome',
    description: 'Pure stark black with intense blood-red highlights and sharp edges.',
    primaryColor: '#F43F5E',
    accentColor: '#E11D48',
    surfaceColor: '#121212',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    mutedColor: '#888888',
    borderColor: '#222222',
    radius: 6,
  },
  'deep-amber': {
    id: 'deep-amber',
    name: 'Deep Amber',
    description: 'Industrial carbon black with warm glowing amber indicators.',
    primaryColor: '#F59E0B',
    accentColor: '#D97706',
    surfaceColor: '#1C1917',
    backgroundColor: '#0C0A09',
    textColor: '#FAFAF9',
    mutedColor: '#A8A29E',
    borderColor: '#292524',
    radius: 12,
  },
};
