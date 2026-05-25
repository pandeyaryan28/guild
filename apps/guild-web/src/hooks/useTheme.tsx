/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { type ThemeId, THEMES, getTheme, type PremiumTheme } from '../lib/themes';

const STORAGE_KEY = 'guild-theme-v2';

interface ThemeContextType {
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
  currentTheme: PremiumTheme;
  themes: PremiumTheme[];
  mode: 'light' | 'dark';
  toggleMode: () => void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = React.useState<ThemeId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    return stored ?? 'midnight';
  });

  const [mode, setMode] = React.useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('guild-mode') as 'light' | 'dark' | null;
    return stored ?? 'dark';
  });

  // Apply theme colors dynamically when selection changes
  React.useEffect(() => {
    const effectiveThemeId = themeId === 'light' ? 'midnight' : themeId;
    const theme = getTheme(effectiveThemeId);
    const html = document.documentElement;

    // 1. Toggle dark class
    if (mode === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    // 2. Set dynamic theme custom properties from scratch
    // Clear legacy inline properties
    html.removeAttribute('style');

    const variables = { ...theme.variables };

    // Apply clean Light Mode overrides while preserving accent color contrast
    if (mode === 'light') {
      variables['--bg-primary'] = '#fcfcfd';
      variables['--bg-secondary'] = '#f4f4f6';
      variables['--bg-tertiary'] = '#eaeaf0';
      variables['--surface'] = '#ffffff';
      variables['--surface-elevated'] = '#ffffff';
      variables['--surface-hover'] = '#f8f8fa';
      variables['--text-primary'] = '#09090b';
      variables['--text-secondary'] = '#27272a';
      variables['--text-muted'] = '#71717a';
      variables['--text-disabled'] = '#a1a1aa';
      variables['--border-default'] = '#e4e4e7';
      variables['--border-strong'] = '#cbd5e1';
      variables['--border-subtle'] = '#f4f4f5';

      // Accessibility pale accent color color-contrast enhancement
      if (effectiveThemeId === 'rose-gold') {
        variables['--accent'] = '#db2777'; // rich deep rose
      } else if (effectiveThemeId === 'slate') {
        variables['--accent'] = '#18181b'; // dark graphite
      }
    }

    // Apply color tokens directly to CSS custom properties
    Object.entries(variables).forEach(([property, color]) => {
      html.style.setProperty(property, color);
    });

    // 3. Keep theme className sync
    html.className = html.className
      .replace(/\btheme-\S+\b/g, '')
      .trim();
    
    html.classList.add(`theme-${effectiveThemeId}`);
  }, [themeId, mode]);

  const setTheme = React.useCallback((id: ThemeId) => {
    if (id === 'light') {
      setThemeId('midnight');
      setMode('light');
      localStorage.setItem('guild-mode', 'light');
      localStorage.setItem(STORAGE_KEY, 'midnight');
    } else {
      setThemeId(id);
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const toggleMode = React.useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('guild-mode', next);
      return next;
    });
  }, []);

  const currentTheme = React.useMemo(() => getTheme(themeId), [themeId]);

  const contextValue = React.useMemo(() => ({
    themeId,
    setTheme,
    currentTheme,
    themes: THEMES,
    mode,
    toggleMode
  }), [themeId, setTheme, currentTheme, mode, toggleMode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
