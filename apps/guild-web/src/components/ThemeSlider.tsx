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

  // Track Dimensions
  const trackWidth = 96; // px
  const knobSize = 20;  // px
  const padding = 2;    // px
  const maxSlide = trackWidth - knobSize - 2 * padding; // 96 - 20 - 4 = 72px

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
        "relative flex h-3 items-center rounded-full border cursor-pointer select-none overflow-hidden transition-all duration-300",
        "border-border-default bg-bg-tertiary/60 backdrop-blur-md shadow-inner",
        isDragging && "scale-[1.01] border-primary/20"
      )}
      style={{ width: `${trackWidth}px` }}
      title={`Workspace Ambiance Dimmer: ${Math.round(themeProgress * 100)}% Dark`}
    >
      {/* Glowing Neon Accent Trail inside the track */}
      <div
        className="absolute left-0 top-0 bottom-0 rounded-full opacity-70"
        style={{
          width: `${themeProgress * 100}%`,
          background: 'var(--accent)',
          boxShadow: '0 0 10px var(--accent)',
          transition: isDragging ? 'none' : 'width 320ms cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      />

      {/* Pure, Blank Floating Glassmorphic Orb Knob (Centered on rail with vertical overlap) */}
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full cursor-grab",
          "bg-white dark:bg-white/95 border border-white/50 dark:border-white/20",
          isDragging 
            ? "cursor-grabbing shadow-[0_4px_16px_rgba(0,0,0,0.2),0_0_16px_var(--accent)] scale-95" 
            : "shadow-[0_2px_8px_rgba(0,0,0,0.15),0_0_8px_var(--accent)] active:scale-90"
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
