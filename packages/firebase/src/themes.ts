import type { ThemeId, AppTheme } from '@guild/types';

export const THEMES: AppTheme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Crisp indigo-violet on pure near-black',
    swatch: '#7B6FF9',
    bgSwatch: '#090810',
    htmlClass: 'dark theme-midnight',
  },
  {
    id: 'purple-haze',
    name: 'Aurora',
    description: 'Electric violet-magenta on deep obsidian',
    swatch: '#C77DFF',
    bgSwatch: '#0C0812',
    htmlClass: 'dark theme-purple-haze',
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    description: 'Punchy azure blue on carbon-navy',
    swatch: '#3D8EF8',
    bgSwatch: '#080C15',
    htmlClass: 'dark theme-cobalt',
  },
  {
    id: 'slate',
    name: 'Graphite',
    description: 'Steel-blue accent on clean cool-gray',
    swatch: '#5B8DB8',
    bgSwatch: '#0A0C10',
    htmlClass: 'dark theme-slate',
  },
  {
    id: 'rose-gold',
    name: 'Rose',
    description: 'Warm coral-rose on deep espresso',
    swatch: '#F4637A',
    bgSwatch: '#0E0809',
    htmlClass: 'dark theme-rose-gold',
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Rich emerald green on deep moss-black',
    swatch: '#22C983',
    bgSwatch: '#080E0B',
    htmlClass: 'dark theme-forest',
  },
];


export const DEFAULT_THEME_ID: ThemeId = 'midnight';

export function getTheme(id: ThemeId): AppTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

// Re-export types so consumers can import from one place
export type { ThemeId, AppTheme };
