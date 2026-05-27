/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { cn } from '@/lib/utils';

export function ThemeSlider() {
  const { mode, setMode, themeProgress, setThemeProgress } = useTheme();
  
  const trackRef = React.useRef<HTMLDivElement>(null);
  const knobRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef<{ mouseX: number; startProgress: number }>({ mouseX: 0, startProgress: 0 });

  // Use the active theme progress if dragging/snapping, otherwise fallback to standard mode
  const progress = themeProgress !== null ? themeProgress : (mode === 'dark' ? 1 : 0);

  // Track Dimensions
  const trackWidth = 72; // px
  const knobSize = 24;  // px
  const padding = 4;    // px
  const maxSlide = trackWidth - knobSize - 2 * padding; // 72 - 24 - 8 = 40px

  // Calculate the left offset of the knob
  const knobLeft = padding + progress * maxSlide;

  // Handle Drag Start
  const handleStart = (clientX: number) => {
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: clientX,
      startProgress: progress,
    };
    setThemeProgress(progress);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  // Drag and Snap logic inside useEffect for robust window listeners
  React.useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number) => {
      const deltaX = clientX - dragStartRef.current.mouseX;
      // Convert pixel delta to progress delta
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
      
      // Determine snap target
      const targetProgress = progress >= 0.5 ? 1 : 0;
      const startProgress = progress;
      const duration = 240; // ms
      const startTime = performance.now();

      // Smooth Ease-Out-Quad snap animation
      const animateSnap = (now: number) => {
        const elapsed = now - startTime;
        const p = Math.min(elapsed / duration, 1);
        
        // Easing: easeOutQuad
        const ease = p * (2 - p);
        const current = startProgress + (targetProgress - startProgress) * ease;
        
        setThemeProgress(current);

        if (p < 1) {
          requestAnimationFrame(animateSnap);
        } else {
          // Finished snapping
          setThemeProgress(null);
          setMode(targetProgress === 1 ? 'dark' : 'light');
        }
      };

      requestAnimationFrame(animateSnap);
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
  }, [isDragging, progress, maxSlide, setThemeProgress, setMode]);

  // Click on Track directly triggers a snap toggle
  const handleTrackClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    
    // Prevent trigger if clicking the knob directly
    if (knobRef.current && knobRef.current.contains(e.target as Node)) {
      return;
    }

    const nextMode = mode === 'light' ? 'dark' : 'light';
    const targetProgress = nextMode === 'dark' ? 1 : 0;
    const startProgress = progress;
    const duration = 240;
    const startTime = performance.now();

    const animateClick = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(elapsed / duration, 1);
      const ease = p * (2 - p);
      const current = startProgress + (targetProgress - startProgress) * ease;
      
      setThemeProgress(current);

      if (p < 1) {
        requestAnimationFrame(animateClick);
      } else {
        setThemeProgress(null);
        setMode(nextMode);
      }
    };

    requestAnimationFrame(animateClick);
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
      title={mode === 'light' ? 'Slide to Dark Mode' : 'Slide to Light Mode'}
    >
      {/* Background Icons in the track */}
      <div className="absolute inset-0 flex justify-between px-2 items-center text-text-muted/40 pointer-events-none">
        <Sun className="h-3.5 w-3.5 transition-opacity" style={{ opacity: progress > 0.4 ? 0.3 : 1 }} />
        <Moon className="h-3.5 w-3.5 transition-opacity" style={{ opacity: progress < 0.6 ? 0.3 : 1 }} />
      </div>

      {/* Glassmorphic Sliding Orb */}
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={cn(
          "absolute flex items-center justify-center rounded-full transition-transform active:scale-95 cursor-grab",
          "bg-white/80 dark:bg-white/10 backdrop-blur-md border border-white/30 dark:border-white/10",
          isDragging ? "cursor-grabbing shadow-[0_0_16px_var(--accent)]" : "shadow-[0_2px_8px_rgba(0,0,0,0.12),0_0_6px_var(--accent)]"
        )}
        style={{
          width: `${knobSize}px`,
          height: `${knobSize}px`,
          left: 0,
          transform: `translateX(${knobLeft}px)`,
          touchAction: 'none',
        }}
      >
        {/* Sun Icon inside knob (fades out as dark mode approaches) */}
        <Sun
          className="absolute h-3 w-3 text-amber-500 pointer-events-none transition-transform"
          style={{
            opacity: 1 - progress,
            transform: `rotate(${(1 - progress) * 180}deg) scale(${1 - progress})`,
          }}
        />

        {/* Moon Icon inside knob (fades in as dark mode approaches) */}
        <Moon
          className="absolute h-3 w-3 text-indigo-300 pointer-events-none transition-transform"
          style={{
            opacity: progress,
            transform: `rotate(${progress * 360}deg) scale(${progress})`,
          }}
        />
      </div>
    </div>
  );
}
