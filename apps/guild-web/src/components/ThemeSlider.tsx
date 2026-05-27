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

  // --- Dimension Tokens ---
  const trackWidth = 96;  // px
  const knobSize = 24;    // px
  const padding = 3;      // px (Balanced padding around track content)
  const border = 1;       // px (Track border)
  
  // Maximum horizontal sliding distance for the knob inside the content box
  // Track Width (96) - 2 * Border (2) - 2 * Padding (6) - Knob Size (24) = 64px
  const maxSlide = trackWidth - 2 * border - 2 * padding - knobSize; // 64px

  // Calculate the left offset of the knob (starts at padding, slides up to padding + maxSlide)
  const knobLeft = padding + themeProgress * maxSlide;

  // --- Helper: Simple Color Interpolation for Premium Smoothness ---
  const interpolateHex = (color1: string, color2: string, factor: number) => {
    // Clean inputs
    const c1 = color1.startsWith('#') ? color1.slice(1) : color1;
    const c2 = color2.startsWith('#') ? color2.slice(1) : color2;
    
    const r1 = parseInt(c1.substring(0, 2), 16);
    const g1 = parseInt(c1.substring(2, 4), 16);
    const b1 = parseInt(c1.substring(4, 6), 16);

    const r2 = parseInt(c2.substring(0, 2), 16);
    const g2 = parseInt(c2.substring(2, 4), 16);
    const b2 = parseInt(c2.substring(4, 6), 16);

    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  // --- Dynamic Color Styles ---
  // Interpolated Track Background (from soft warm zinc glass to deep celestial space glass)
  const trackBg = themeProgress >= 0.5
    ? `rgba(15, 15, 26, ${0.45 + themeProgress * 0.25})`
    : `rgba(234, 234, 240, ${0.75 - themeProgress * 0.3})`;
  
  // Interpolated Track Border (smooth blending)
  const trackBorderColor = interpolateHex('#e4e4e7', '#27272a', themeProgress);

  // Dynamic Ambient Shadow for the Celestial Orb
  // Warm golden amber glow in light mode, deep cyan/indigo space glow in dark mode
  const glowAmber = `rgba(245, 158, 11, ${(1 - themeProgress) * 0.5})`;
  const glowCyan = `rgba(6, 182, 212, ${themeProgress * 0.7})`;
  const baseShadow = themeProgress >= 0.5 
    ? '0 4px 10px rgba(0, 0, 0, 0.45)' 
    : '0 2px 6px rgba(0, 0, 0, 0.12)';
  const knobShadow = `${baseShadow}, 0 0 10px ${glowAmber}, 0 0 12px ${glowCyan}`;

  // Interactive Background Icon Fading
  const sunOpacity = 0.35 + (1 - themeProgress) * 0.65;
  const moonOpacity = 0.35 + themeProgress * 0.65;
  const sunColor = interpolateHex('#e2e8f0', '#f59e0b', 1 - themeProgress); // Muted grey to glowing amber
  const moonColor = interpolateHex('#e2e8f0', '#06b6d4', themeProgress);    // Muted grey to glowing cyan

  // --- Drag & Click Interaction Handlers ---
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

  const handleTrackClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    
    // Prevent double triggers if clicking the knob itself
    if (knobRef.current && knobRef.current.contains(e.target as Node)) {
      return;
    }

    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left - border - padding - knobSize / 2;
      const newProgress = Math.max(0, Math.min(1, clickX / maxSlide));
      setThemeProgress(newProgress);
    }
  };

  return (
    /* 1. Track Container: Luxurious glassmorphic channel with dynamic color blends */
    <div
      ref={trackRef}
      onClick={handleTrackClick}
      className={cn(
        "relative h-8 rounded-full border cursor-pointer select-none transition-all duration-300 shadow-inner flex items-center",
        isDragging && "scale-[1.02] duration-150"
      )}
      style={{
        width: `${trackWidth}px`,
        backgroundColor: trackBg,
        borderColor: trackBorderColor,
        backdropFilter: 'blur(12px)',
      }}
      title={`Ambiance Dimmer: ${Math.round(themeProgress * 100)}% Dark Mode`}
    >
      {/* 2. Interactive Background Landmarked Icons (Knob rests beautifully over these) */}
      <div 
        className="absolute left-[3px] top-[3px] w-6 h-6 rounded-full flex items-center justify-center pointer-events-none transition-transform duration-300"
        style={{ opacity: sunOpacity }}
      >
        <Sun className="w-3.5 h-3.5" style={{ color: sunColor }} />
      </div>

      <div 
        className="absolute right-[3px] top-[3px] w-6 h-6 rounded-full flex items-center justify-center pointer-events-none transition-transform duration-300"
        style={{ opacity: moonOpacity }}
      >
        <Moon className="w-3.5 h-3.5" style={{ color: moonColor }} />
      </div>

      {/* 3. Celestial Frosted Glass Bead: Perfect alignment without translation conflicts */}
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={cn(
          "absolute flex items-center justify-center rounded-full cursor-grab active:cursor-grabbing",
          "bg-gradient-to-br from-white to-slate-50",
          "border border-white/80 dark:border-white/50",
          "transition-all duration-300 ease-out",
          isDragging ? "scale-95 duration-75" : "hover:scale-105 active:scale-95"
        )}
        style={{
          width: `${knobSize}px`,
          height: `${knobSize}px`,
          top: `${padding}px`,
          left: `${knobLeft}px`,
          boxShadow: knobShadow,
          // Disable transitions only when actively dragging for seamless real-time responses
          transition: isDragging ? 'none' : 'left 320ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 320ms ease, transform 150ms ease',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
