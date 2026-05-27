/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useTheme } from '../hooks/useTheme';
import { cn } from '@/lib/utils';

export function ThemeSlider() {
  const { themeProgress, setThemeProgress } = useTheme();
  
  const trackRef = React.useRef<HTMLDivElement>(null);
  const knobRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef<{ mouseX: number; startProgress: number }>({ mouseX: 0, startProgress: 0 });

  // Track & Knob Dimensions
  const trackWidth = 96;  // px
  const knobSize = 20;    // px
  const padding = 4;      // px (Balanced 4px padding on all sides)
  const maxSlide = trackWidth - knobSize - 2 * padding; // 96 - 20 - 8 = 68px

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
    /* 1. Track Container: Luxurious, wide frosted glass channel (No more thin disjointed lines!) */
    <div
      ref={trackRef}
      onClick={handleTrackClick}
      className={cn(
        "relative h-7 rounded-full border cursor-pointer select-none overflow-hidden transition-all duration-300 p-1",
        "border-border-default/45 bg-bg-tertiary/60 backdrop-blur-md shadow-inner",
        isDragging && "scale-[1.01] border-primary/20"
      )}
      style={{ width: `${trackWidth}px` }}
      title={`Workspace Ambiance Dimmer: ${Math.round(themeProgress * 100)}% Dark`}
    >
      {/* 2. Soft Dynamic Progress Background Tint: Represents level without heavy lines */}
      <div
        className="absolute left-0 top-0 bottom-0 border-r border-primary/20 bg-primary/10 dark:bg-primary/5 transition-all"
        style={{
          width: `${themeProgress * 100}%`,
          transition: isDragging ? 'none' : 'width 320ms cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      />

      {/* 3. Cocooned Frosted Glass bead: Slides perfectly inside the channel with balanced 4px margins */}
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full cursor-grab",
          "bg-gradient-to-br from-white to-white/80 dark:from-white dark:to-white/90",
          "border border-white/60 dark:border-white/35",
          isDragging 
            ? "cursor-grabbing shadow-[0_4px_14px_rgba(0,0,0,0.22),0_0_12px_var(--accent)] scale-98" 
            : "shadow-[0_2px_8px_rgba(0,0,0,0.15),0_0_8px_var(--accent)] hover:scale-105 active:scale-90 transition-transform"
        )}
        style={{
          width: `${knobSize}px`,
          height: `${knobSize}px`,
          left: 0,
          transform: `translateY(-50%) translateX(${knobLeft}px)`,
          transition: isDragging ? 'none' : 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
