"use client";

import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "@/lib/utils";

const Slider = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
    ({ className, ...props }, ref) => (
        <input
            className={cn(
                // Base styles
                "h-1.5 w-full appearance-none rounded-full bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
                // WebKit (Chrome, Safari, Edge) thumb styles
                "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:transition-colors",
                // Firefox thumb styles (equivalent -moz-range-thumb)
                "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:shadow [&::-moz-range-thumb]:transition-colors",
                className
            )}
            ref={ref}
            type="range"
            {...props}
        />
    )
);
Slider.displayName = "Slider";

export { Slider };
