"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as React from "react";

import { cn } from "@/lib/utils/index";

interface ProgressProps
    extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
    /**
     * Accessible label describing what the progress represents.
     * @default "Progress"
     */
    "aria-label"?: string;
    /**
     * Human-readable text describing the current value.
     * If not provided, defaults to "{value}% complete".
     */
    "aria-valuetext"?: string;
}

const Progress = React.forwardRef<
    React.ElementRef<typeof ProgressPrimitive.Root>,
    ProgressProps
>(
    (
        {
            className,
            value,
            "aria-label": ariaLabel = "Progress",
            "aria-valuetext": ariaValueText,
            ...props
        },
        ref
    ) => {
        const computedValueText =
            ariaValueText ?? `${Math.round(value ?? 0)}% complete`;

        return (
            <ProgressPrimitive.Root
                aria-label={ariaLabel}
                aria-valuetext={computedValueText}
                className={cn(
                    "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
                    className
                )}
                ref={ref}
                value={value}
                {...props}
            >
                <ProgressPrimitive.Indicator
                    className="h-full w-full flex-1 bg-primary transition-all"
                    style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
                />
            </ProgressPrimitive.Root>
        );
    }
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
