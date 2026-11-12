/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { type ThemeId, THEMES, getTheme, type PremiumTheme, DEFAULT_THEME_ID } from '../lib/themes';

const STORAGE_KEY = 'guild-theme-v2';
const MODE_STORAGE_KEY = 'guild-mode';

export interface ThemeContextType {
  mode: 'light' | 'dark';
  setMode: (mode: 'light' | 'dark') => void;
  toggleMode: () => void;
  // Compatibility properties
  themeId: ThemeId;
  setTheme: (id: ThemeId | string) => void;
  currentTheme: PremiumTheme;
  themes: PremiumTheme[];
  themeProgress: number;
  setThemeProgress: (progress: number) => void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<'light' | 'dark'>(() => {
    const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
    if (storedMode === 'dark' || storedMode === 'light') return storedMode;
    const storedTheme = localStorage.getItem(STORAGE_KEY);
    if (storedTheme === 'light') return 'light';
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'dark';
  });

  const setMode = React.useCallback((next: 'light' | 'dark') => {
    setModeState(next);
    localStorage.setItem(MODE_STORAGE_KEY, next);
    localStorage.setItem(STORAGE_KEY, next);
    localStorage.setItem('guild-theme-progress', next === 'dark' ? '1' : '0');
  }, []);

  const toggleMode = React.useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(MODE_STORAGE_KEY, next);
      localStorage.setItem(STORAGE_KEY, next);
      localStorage.setItem('guild-theme-progress', next === 'dark' ? '1' : '0');
      return next;
    });
  }, []);

  const setTheme = React.useCallback((id: ThemeId | string) => {
    if (id === 'light') {
      setMode('light');
    } else {
      setMode('dark');
    }
  }, [setMode]);

  const setThemeProgress = React.useCallback((progress: number) => {
    setMode(progress >= 0.5 ? 'dark' : 'light');
  }, [setMode]);

  // Synchronize CSS class & CSS custom properties on documentElement
  React.useEffect(() => {
    const html = document.documentElement;
    const theme = getTheme(mode);

    if (mode === 'dark') {
      html.classList.add('dark');
      html.classList.remove('theme-light');
      html.classList.add('theme-dark');
    } else {
      html.classList.remove('dark');
      html.classList.remove('theme-dark');
      html.classList.add('theme-light');
    }

    // Apply color variables to inline styles for CSS var overrides
    Object.entries(theme.variables).forEach(([prop, val]) => {
      html.style.setProperty(prop, val);
    });

    // Map semantic aliases
    if (theme.variables['--bg-primary']) {
      html.style.setProperty('--background', theme.variables['--bg-primary']);
    }
    if (theme.variables['--text-primary']) {
      html.style.setProperty('--foreground', theme.variables['--text-primary']);
    }
    if (theme.variables['--surface']) {
      html.style.setProperty('--card', theme.variables['--surface']);
      html.style.setProperty('--popover', theme.variables['--surface-elevated'] || theme.variables['--surface']);
    }
    if (theme.variables['--border-default']) {
      html.style.setProperty('--border', theme.variables['--border-default']);
      html.style.setProperty('--input', theme.variables['--border-default']);
    }
    if (theme.variables['--accent']) {
      html.style.setProperty('--primary', theme.variables['--accent']);
      html.style.setProperty('--ring', theme.variables['--accent']);
    }
    if (theme.variables['--accent-foreground']) {
      html.style.setProperty('--primary-foreground', theme.variables['--accent-foreground']);
    }
  }, [mode]);

  const themeId: ThemeId = mode === 'dark' ? ('dark' as ThemeId) : ('light' as ThemeId);
  const currentTheme = React.useMemo(() => getTheme(mode), [mode]);
  const themeProgress = mode === 'dark' ? 1 : 0;

  const contextValue = React.useMemo(() => ({
    mode,
    setMode,
    toggleMode,
    themeId,
    setTheme,
    currentTheme,
    themes: THEMES,
    themeProgress,
    setThemeProgress,
  }), [mode, setMode, toggleMode, themeId, setTheme, currentTheme, themeProgress, setThemeProgress]);

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
