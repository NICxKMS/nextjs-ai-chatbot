"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";

import { cn } from "@/lib/utils";

/** Base label styles - no variants needed, using cn() directly */
const labelBaseStyles =
    "font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70";

const Label = React.forwardRef<
    React.ComponentRef<typeof LabelPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
    <LabelPrimitive.Root
        className={cn(labelBaseStyles, className)}
        ref={ref}
        {...props}
    />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
