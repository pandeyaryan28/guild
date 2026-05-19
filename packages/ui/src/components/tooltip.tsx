"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@guild/utils";

/* ── Re-export base primitives ────────────────────────────────────────────── */

const TooltipProvider = TooltipPrimitive.Provider;

const TooltipRoot = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

/* ── Styled Popup ─────────────────────────────────────────────────────────── */

interface TooltipContentProps extends TooltipPrimitive.Popup.Props {
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  className?: string;
  children?: React.ReactNode;
}

function TooltipContent({
  side = "top",
  sideOffset = 6,
  className,
  children,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          className={cn(
            // base
            "z-50 max-w-[280px] rounded-lg border border-border/50 bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md",
            // animation
            "origin-[var(--transform-origin)] transition-[transform,scale,opacity]",
            "data-[open]:opacity-100 data-[open]:scale-100",
            "data-[closed]:opacity-0 data-[closed]:scale-95",
            className
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

/* ── Named exports matching shadcn/ui convention ─────────────────────────── */

export {
  TooltipProvider,
  TooltipRoot as Tooltip,
  TooltipTrigger,
  TooltipContent,
};
