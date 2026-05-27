/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { cn } from '@/lib/utils';

export function ThemeSlider() {
  const { themeProgress, setThemeProgress } = useTheme();
  
  const trackRef = React.useRef<HTMLDivElement>(null);
  const knobRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef<{ mouseX: number; startProgress: number }>({ mouseX: 0, startProgress: 0 });

  // Track Dimensions
  const trackWidth = 96; // px
  const knobSize = 24;  // px
  const padding = 4;    // px
  const maxSlide = trackWidth - knobSize - 2 * padding; // 96 - 24 - 8 = 64px

  // Calculate the left offset of the knob
  const knobLeft = padding + themeProgress * maxSlide;

  // Handle Drag Start
  const handleStart = (clientX: number) => {
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: clientX,
      startProgress: themeProgress,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  // Drag listeners inside useEffect for robust window-level tracking
  React.useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number) => {
      const deltaX = clientX - dragStartRef.current.mouseX;
      const progressDelta = deltaX / maxSlide;
      const newProgress = Math.max(0, Math.min(1, dragStartRef.current.startProgress + progressDelta));
      setThemeProgress(newProgress);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      handleMove(e.touches[0].clientX);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, maxSlide, setThemeProgress]);

  // Click on Track directly updates the slider to that exact percentage (fine-tune jumps)
  const handleTrackClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    
    // Prevent trigger if clicking the knob directly
    if (knobRef.current && knobRef.current.contains(e.target as Node)) {
      return;
    }

    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left - padding - knobSize / 2;
      const newProgress = Math.max(0, Math.min(1, clickX / maxSlide));
      setThemeProgress(newProgress);
    }
  };

  return (
    <div
      ref={trackRef}
      onClick={handleTrackClick}
      className={cn(
        "relative flex h-8 items-center rounded-full border cursor-pointer select-none overflow-hidden transition-all duration-300",
        "border-border-default bg-bg-tertiary/60 backdrop-blur-md shadow-inner",
        isDragging && "scale-[1.02] border-primary/40 shadow-sm"
      )}
      style={{ width: `${trackWidth}px` }}
      title={`Workspace Ambiance Dimmer: ${Math.round(themeProgress * 100)}% Dark`}
    >
      {/* Background Icons in the track */}
      <div className="absolute inset-0 flex justify-between px-2 items-center text-text-muted/40 pointer-events-none">
        <Sun 
          className="h-3.5 w-3.5 transition-all duration-300" 
          style={{ 
            opacity: Math.max(0.25, 1 - themeProgress),
            color: themeProgress < 0.5 ? '#f59e0b' : 'currentColor',
            transform: `scale(${themeProgress < 0.5 ? 1.05 : 0.95})`
          }} 
        />
        <Moon 
          className="h-3.5 w-3.5 transition-all duration-300" 
          style={{ 
            opacity: Math.max(0.25, themeProgress),
            color: themeProgress >= 0.5 ? '#a5b4fc' : 'currentColor',
            transform: `scale(${themeProgress >= 0.5 ? 1.05 : 0.95})`
          }} 
        />
      </div>

      {/* Pure Glassmorphic Sliding Orb (No icons, acts as a frosted magnifying lens) */}
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={cn(
          "absolute flex items-center justify-center rounded-full cursor-grab",
          "bg-white/40 dark:bg-white/10 backdrop-blur-lg border border-white/45 dark:border-white/20",
          isDragging ? "cursor-grabbing shadow-[0_4px_16px_rgba(0,0,0,0.25),0_0_18px_var(--accent)] scale-98" : "shadow-[0_2px_8px_rgba(0,0,0,0.12),0_0_8px_var(--accent)] active:scale-95"
        )}
        style={{
          width: `${knobSize}px`,
          height: `${knobSize}px`,
          left: 0,
          transform: `translateX(${knobLeft}px)`,
          transition: isDragging ? 'none' : 'transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
