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
  setMode: (mode: 'light' | 'dark') => void;
  toggleMode: () => void;
  themeProgress: number | null;
  setThemeProgress: (progress: number | null) => void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

// Helper functions for real-time color interpolation
function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
  color = color.trim().toLowerCase();
  
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b, a: 1 };
    } else if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    } else if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = parseInt(hex.slice(6, 8), 16) / 255;
      return { r, g, b, a };
    }
  }
  
  const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    };
  }
  
  return null;
}

function interpolateColor(color1: string, color2: string, progress: number): string {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);
  
  if (!c1) return color2;
  if (!c2) return color1;
  
  const r = Math.round(c1.r + (c2.r - c1.r) * progress);
  const g = Math.round(c1.g + (c2.g - c1.g) * progress);
  const b = Math.round(c1.b + (c2.b - c1.b) * progress);
  const a = c1.a + (c2.a - c1.a) * progress;
  
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = React.useState<ThemeId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    return stored ?? 'midnight';
  });

  const [mode, setModeState] = React.useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('guild-mode') as 'light' | 'dark' | null;
    return stored ?? 'light';
  });

  // Real-time interpolation progress (0 = fully light, 1 = fully dark)
  const [themeProgress, setThemeProgress] = React.useState<number | null>(null);

  const setMode = React.useCallback((next: 'light' | 'dark') => {
    setModeState(next);
    localStorage.setItem('guild-mode', next);
  }, []);

  // Apply theme colors dynamically when selection changes
  React.useEffect(() => {
    const effectiveThemeId = themeId === 'light' ? 'midnight' : themeId;
    const theme = getTheme(effectiveThemeId);
    const html = document.documentElement;

    // 1. Determine exact active progress value
    const activeProgress = themeProgress !== null ? themeProgress : (mode === 'dark' ? 1 : 0);

    // 2. Toggle dark class based on progress threshold
    if (activeProgress >= 0.5) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    // 3. Setup core light theme variables
    const lightVariables: Record<string, string> = {
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
    };

    // Calculate dynamic light accent based on active theme
    // Highly readable premium accents for Light Mode (eliminates low contrast invisibility)
    let lightAccent = '#4f46e5';
    let lightAccentForeground = '#ffffff';

    if (effectiveThemeId === 'rose-gold') {
      lightAccent = '#db2777'; // rich deep rose pink
    } else if (effectiveThemeId === 'slate') {
      lightAccent = '#18181b'; // dark graphite
    } else if (effectiveThemeId === 'forest') {
      lightAccent = '#059669'; // rich forest green
    } else if (effectiveThemeId === 'cobalt') {
      lightAccent = '#2563eb'; // electric navy blue
    } else if (effectiveThemeId === 'purple-haze') {
      lightAccent = '#db2777'; // highly readable pink-magenta
    } else if (effectiveThemeId === 'midnight') {
      lightAccent = '#6d28d9'; // rich purple-violet
    }

    lightVariables['--accent'] = lightAccent;
    lightVariables['--accent-foreground'] = lightAccentForeground;

    // Get dark theme variables
    const darkVariables = { ...theme.variables };

    // 4. Set dynamic theme custom properties from scratch
    html.removeAttribute('style');

    const interpolatedVariables: Record<string, string> = {};

    // Interpolate every custom variable between light and dark
    Object.keys(darkVariables).forEach((key) => {
      const darkColor = darkVariables[key];
      const lightColor = lightVariables[key] ?? '#ffffff';
      
      // Linearly interpolate color based on current progress
      interpolatedVariables[key] = interpolateColor(lightColor, darkColor, activeProgress);
    });

    // Apply color tokens directly to CSS custom properties
    Object.entries(interpolatedVariables).forEach(([property, color]) => {
      html.style.setProperty(property, color);
    });

    // 5. Keep theme className sync
    html.className = html.className
      .replace(/\btheme-\S+\b/g, '')
      .trim();
    
    html.classList.add(`theme-${effectiveThemeId}`);
  }, [themeId, mode, themeProgress]);

  const setTheme = React.useCallback((id: ThemeId) => {
    if (id === 'light') {
      setThemeId('midnight');
      setMode('light');
      localStorage.setItem(STORAGE_KEY, 'midnight');
    } else {
      setThemeId(id);
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, [setMode]);

  const toggleMode = React.useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  const currentTheme = React.useMemo(() => getTheme(themeId), [themeId]);

  const contextValue = React.useMemo(() => ({
    themeId,
    setTheme,
    currentTheme,
    themes: THEMES,
    mode,
    setMode,
    toggleMode,
    themeProgress,
    setThemeProgress
  }), [themeId, setTheme, currentTheme, mode, setMode, toggleMode, themeProgress, setThemeProgress]);

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
