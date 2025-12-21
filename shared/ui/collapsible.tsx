"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import {
    type ComponentPropsWithoutRef,
    type ElementRef,
    forwardRef,
} from "react";
import { cn } from "@/lib/utils";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = forwardRef<
    ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
    ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, children, ...props }, ref) => (
    <CollapsiblePrimitive.CollapsibleContent
        className={cn(
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 overflow-hidden transition-all data-[state=closed]:animate-out data-[state=open]:animate-in",
            className
        )}
        ref={ref}
        {...props}
    >
        {children}
    </CollapsiblePrimitive.CollapsibleContent>
));
CollapsibleContent.displayName =
    CollapsiblePrimitive.CollapsibleContent.displayName;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
