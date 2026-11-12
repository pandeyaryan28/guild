/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ThemeId, AppTheme } from '@guild/types';

export interface PremiumTheme extends AppTheme {
  dark: boolean;
  variables: Record<string, string>;
  lightVariables?: Record<string, string>;
}

export const THEMES: PremiumTheme[] = [
  {
    id: 'dark',
    name: 'Obsidian Slate',
    description: 'Elite neutral obsidian slate canvas with refined indigo accents',
    swatch: '#6366f1',
    bgSwatch: '#09090b',
    dark: true,
    htmlClass: 'dark theme-dark',
    variables: {
      '--bg-primary': '#09090b',
      '--bg-secondary': '#121214',
      '--bg-tertiary': '#18181b',
      '--surface': '#141416',
      '--surface-elevated': '#1a1a1e',
      '--surface-hover': '#222226',
      '--text-primary': '#f4f4f5',
      '--text-secondary': '#a1a1aa',
      '--text-muted': '#71717a',
      '--text-disabled': '#52525b',
      '--border-default': '#27272a',
      '--border-strong': '#3f3f46',
      '--border-subtle': '#18181b',
      '--accent': '#6366f1',
      '--accent-foreground': '#ffffff',
    },
    lightVariables: {
      '--bg-primary': '#fcfcfd',
      '--bg-secondary': '#f4f4f6',
      '--bg-tertiary': '#eaeaf0',
      '--surface': '#ffffff',
      '--surface-elevated': '#ffffff',
      '--surface-hover': '#f8f8fa',
      '--text-primary': '#09090b',
      '--text-secondary': '#27272a',
      '--text-muted': '#71717a',
      '--text-disabled': '#a1a1aa',
      '--border-default': '#e4e4e7',
      '--border-strong': '#cbd5e1',
      '--border-subtle': '#f4f4f5',
      '--accent': '#6366f1',
      '--accent-foreground': '#ffffff',
    },
  },
  {
    id: 'light',
    name: 'Pristine Canvas',
    description: 'Crisp paper-white workspaces with high-contrast slate details',
    swatch: '#6366f1',
    bgSwatch: '#fcfcfd',
    dark: false,
    htmlClass: 'theme-light',
    variables: {
      '--bg-primary': '#fcfcfd',
      '--bg-secondary': '#f4f4f6',
      '--bg-tertiary': '#eaeaf0',
      '--surface': '#ffffff',
      '--surface-elevated': '#ffffff',
      '--surface-hover': '#f8f8fa',
      '--text-primary': '#09090b',
      '--text-secondary': '#27272a',
      '--text-muted': '#71717a',
      '--text-disabled': '#a1a1aa',
      '--border-default': '#e4e4e7',
      '--border-strong': '#cbd5e1',
      '--border-subtle': '#f4f4f5',
      '--accent': '#6366f1',
      '--accent-foreground': '#ffffff',
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'dark';

export function getTheme(id: ThemeId | string): PremiumTheme {
  if (id === 'light') {
    return THEMES.find((t) => t.id === 'light') ?? THEMES[1];
  }
  return THEMES.find((t) => t.id === 'dark') ?? THEMES[0];
}
