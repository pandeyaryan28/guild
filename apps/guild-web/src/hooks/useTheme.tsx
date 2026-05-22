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
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = React.useState<ThemeId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    return stored ?? 'midnight';
  });

  // Apply theme colors dynamically when selection changes
  React.useEffect(() => {
    const theme = getTheme(themeId);
    const html = document.documentElement;

    // 1. Toggle dark class
    if (theme.dark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    // 2. Set dynamic theme custom properties from scratch
    // Clear legacy inline properties
    html.removeAttribute('style');

    // Apply color tokens directly to CSS custom properties
    Object.entries(theme.variables).forEach(([property, color]) => {
      html.style.setProperty(property, color);
    });

    // 3. Keep theme className sync
    html.className = html.className
      .replace(/\btheme-\S+\b/g, '')
      .trim();
    
    theme.htmlClass.split(' ').forEach((cls) => {
      if (cls && cls !== 'dark') {
        html.classList.add(cls);
      }
    });
  }, [themeId]);

  const setTheme = React.useCallback((id: ThemeId) => {
    setThemeId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const currentTheme = React.useMemo(() => getTheme(themeId), [themeId]);

  const contextValue = React.useMemo(() => ({
    themeId,
    setTheme,
    currentTheme,
    themes: THEMES
  }), [themeId, setTheme, currentTheme]);

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
