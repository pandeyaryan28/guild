import * as React from 'react';
import { type ThemeId, DEFAULT_THEME_ID, getTheme } from '../lib/themes';

const STORAGE_KEY = 'guild-theme';

interface ThemeContextValue {
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  themeId: DEFAULT_THEME_ID,
  setTheme: () => {},
});

function applyTheme(id: ThemeId) {
  const theme = getTheme(id);
  // Remove all theme classes, keep other classes
  const html = document.documentElement;
  html.className = html.className
    .replace(/\btheme-\S+\b/g, '')
    .replace(/\bdark\b/g, '')
    .replace(/\slight\b/g, '')
    .trim();
  // Add new theme classes
  theme.htmlClass.split(' ').forEach((cls) => {
    if (cls) html.classList.add(cls);
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = React.useState<ThemeId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    return stored ?? DEFAULT_THEME_ID;
  });

  // Apply on mount and whenever themeId changes
  React.useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  const setTheme = React.useCallback((id: ThemeId) => {
    setThemeId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return (
    <ThemeContext.Provider value={{ themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
