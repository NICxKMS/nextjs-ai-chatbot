/**
 * Switch Component
 *
 * Toggle switch for boolean settings.
 *
 * @module shared/ui/switch
 */

"use client";

import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "@/lib/utils";

const Switch = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
    ({ className, ...props }, ref) => (
        <input
            className={cn(
                "relative h-5 w-10 cursor-pointer appearance-none rounded-full border border-input bg-muted transition-colors before:absolute before:h-4 before:w-4 before:translate-x-1 before:rounded-full before:bg-background before:shadow before:transition-transform checked:bg-primary checked:before:translate-x-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            ref={ref}
            type="checkbox"
            {...props}
        />
    )
);
Switch.displayName = "Switch";

export { Switch };
