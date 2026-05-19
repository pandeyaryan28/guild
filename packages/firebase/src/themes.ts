import type { ThemeId, AppTheme } from '@guild/types';

export const THEMES: AppTheme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep black with indigo–violet accent',
    swatch: '#7C6EF7',
    bgSwatch: '#0A0A0F',
    htmlClass: 'dark theme-midnight',
  },
  {
    id: 'purple-haze',
    name: 'Purple Haze',
    description: 'Rich purple tones with violet glow',
    swatch: '#A855F7',
    bgSwatch: '#0F0A1A',
    htmlClass: 'dark theme-purple-haze',
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    description: 'Electric blue on a deep navy canvas',
    swatch: '#3B82F6',
    bgSwatch: '#080E1C',
    htmlClass: 'dark theme-cobalt',
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Cool blue-gray, calm and professional',
    swatch: '#64748B',
    bgSwatch: '#0C0F14',
    htmlClass: 'dark theme-slate',
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    description: 'Warm rose and copper on deep charcoal',
    swatch: '#F472B6',
    bgSwatch: '#140A0E',
    htmlClass: 'dark theme-rose-gold',
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Earthy emerald green on dark bark',
    swatch: '#10B981',
    bgSwatch: '#080F0C',
    htmlClass: 'dark theme-forest',
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'midnight';

export function getTheme(id: ThemeId): AppTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

// Re-export types so consumers can import from one place
export type { ThemeId, AppTheme };
