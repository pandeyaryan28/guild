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
  themeProgress: number;
  setThemeProgress: (progress: number) => void;
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

  // Theme progress is a first-class float state (0 = pure light, 1 = pure dark)
  const [themeProgress, setThemeProgressState] = React.useState<number>(() => {
    const storedProgress = localStorage.getItem('guild-theme-progress');
    if (storedProgress !== null) {
      const parsed = parseFloat(storedProgress);
      return isNaN(parsed) ? 0 : parsed;
    }
    const storedMode = localStorage.getItem('guild-mode');
    if (storedMode === 'dark') return 1;
    if (storedMode === 'light') return 0;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 1;
    }
    return 0;
  });

  // Mode is dynamically derived from themeProgress to maintain full compatibility
  const mode: 'light' | 'dark' = themeProgress >= 0.5 ? 'dark' : 'light';

  const setThemeProgress = React.useCallback((progress: number) => {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    setThemeProgressState(clampedProgress);
    localStorage.setItem('guild-theme-progress', clampedProgress.toString());
    const nextMode = clampedProgress >= 0.5 ? 'dark' : 'light';
    localStorage.setItem('guild-mode', nextMode);
  }, []);

  const setMode = React.useCallback((next: 'light' | 'dark') => {
    setThemeProgress(next === 'dark' ? 1 : 0);
  }, [setThemeProgress]);

  // Apply theme colors dynamically when selection changes
  React.useEffect(() => {
    const effectiveThemeId = themeId === 'light' ? 'midnight' : themeId;
    const theme = getTheme(effectiveThemeId);
    const html = document.documentElement;

    // 1. Toggle dark class based on progress threshold
    if (themeProgress >= 0.5) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    // 2. Setup core light theme variables
    const baseLightVariables: Record<string, string> = {
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
      lightAccent = '#db2777';
    } else if (effectiveThemeId === 'forest') {
      lightAccent = '#059669';
    } else if (effectiveThemeId === 'cobalt') {
      lightAccent = '#2563eb';
    } else if (effectiveThemeId === 'purple-haze') {
      lightAccent = '#db2777';
    } else if (effectiveThemeId === 'midnight') {
      lightAccent = '#6d28d9';
    }

    baseLightVariables['--accent'] = lightAccent;
    baseLightVariables['--accent-foreground'] = lightAccentForeground;

    // Merge base light variables with theme custom light variables (if defined)
    const lightVariables = {
      ...baseLightVariables,
      ...(theme.lightVariables ?? {})
    };

    // Get dark theme variables
    const darkVariables = { ...theme.variables };

    // 3. Clear legacy inline properties
    html.removeAttribute('style');

    const interpolatedVariables: Record<string, string> = {};

    // Interpolate every custom variable between light and dark
    Object.keys(darkVariables).forEach((key) => {
      const darkColor = darkVariables[key];
      const lightColor = lightVariables[key] ?? '#ffffff';
      
      // For foreground colors (text, border, icons), use a snapped transition
      // to avoid low contrast "dissolving" in the middle of light/dark mode
      const isForeground = key.includes('text') || key.includes('border') || key.includes('foreground');
      
      const progress = isForeground 
        ? (themeProgress >= 0.5 ? 1 : 0) // Snaps to prevent any contrast loss
        : themeProgress;                  // Smooth linear interpolation for background/surface
      
      // Linearly interpolate color based on custom progress
      interpolatedVariables[key] = interpolateColor(lightColor, darkColor, progress);
    });

    // Apply color tokens directly to CSS custom properties
    Object.entries(interpolatedVariables).forEach(([property, color]) => {
      html.style.setProperty(property, color);
    });

    // Keep standard semantic aliases synchronized with active theme variables
    if (interpolatedVariables['--bg-primary']) {
      html.style.setProperty('--background', interpolatedVariables['--bg-primary']);
    }
    if (interpolatedVariables['--text-primary']) {
      html.style.setProperty('--foreground', interpolatedVariables['--text-primary']);
    }
    if (interpolatedVariables['--surface']) {
      html.style.setProperty('--card', interpolatedVariables['--surface']);
      html.style.setProperty('--popover', interpolatedVariables['--surface']);
    }
    if (interpolatedVariables['--border-default']) {
      html.style.setProperty('--border', interpolatedVariables['--border-default']);
      html.style.setProperty('--input', interpolatedVariables['--border-default']);
    }
    if (interpolatedVariables['--accent']) {
      html.style.setProperty('--primary', interpolatedVariables['--accent']);
      html.style.setProperty('--ring', interpolatedVariables['--accent']);
    }
    if (interpolatedVariables['--accent-foreground']) {
      html.style.setProperty('--primary-foreground', interpolatedVariables['--accent-foreground']);
    }

    // 4. Keep theme className sync
    html.className = html.className
      .replace(/\btheme-\S+\b/g, '')
      .trim();
    
    html.classList.add(`theme-${effectiveThemeId}`);
  }, [themeId, themeProgress]);

  const setTheme = React.useCallback((id: ThemeId) => {
    if (id === 'light') {
      setThemeId('midnight');
      setThemeProgress(0);
      localStorage.setItem(STORAGE_KEY, 'midnight');
    } else {
      setThemeId(id);
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, [setThemeProgress]);

  const toggleMode = React.useCallback(() => {
    setThemeProgress(themeProgress >= 0.5 ? 0 : 1);
  }, [themeProgress, setThemeProgress]);

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
