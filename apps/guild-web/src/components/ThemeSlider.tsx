/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeSlider() {
  const { mode, toggleMode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={cn(
        "relative flex h-8 w-16 items-center rounded-full p-1 cursor-pointer select-none",
        "bg-secondary/80 dark:bg-secondary/60 border border-border/80 dark:border-border",
        "backdrop-blur-md shadow-inner transition-colors duration-200",
        "hover:border-primary/40 focus:outline-hidden active:scale-95"
      )}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {/* Background Icons */}
      <div className="flex w-full items-center justify-between px-1 text-muted-foreground pointer-events-none">
        <Sun className={cn("h-3 w-3 transition-opacity duration-200", !isDark ? "opacity-0" : "opacity-70")} />
        <Moon className={cn("h-3 w-3 transition-opacity duration-200", isDark ? "opacity-0" : "opacity-70")} />
      </div>

      {/* Sliding Apple Thumb */}
      <div
        className={cn(
          "absolute flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-all duration-300",
          "bg-surface text-foreground border border-border/50",
          isDark ? "translate-x-7" : "translate-x-0"
        )}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-amber-500" />
        )}
      </div>
    </button>
  );
}
