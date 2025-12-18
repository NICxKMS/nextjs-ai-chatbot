"use client";

/**
 * Sidebar Footer
 * Footer section with user navigation
 */

import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SidebarFooterProps } from "./types";

// ============================================================================
// Types
// ============================================================================

interface SidebarFooterComponentProps extends SidebarFooterProps {
    children?: ReactNode;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * SidebarFooter - Footer area for user navigation
 */
export const SidebarFooter = forwardRef<
    HTMLDivElement,
    SidebarFooterComponentProps
>(({ className, children, ...props }, ref) => {
    return (
        <div
            className={cn("flex flex-col gap-2 p-2", className)}
            data-sidebar="footer"
            ref={ref}
            {...props}
        >
            {children}
        </div>
    );
});
SidebarFooter.displayName = "SidebarFooter";
