"use client";

/**
 * Sidebar Content
 * Main content area for chat history
 */

import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SidebarContentProps } from "./types";

// ============================================================================
// Types
// ============================================================================

interface SidebarContentComponentProps extends SidebarContentProps {
    children?: ReactNode;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * SidebarContent - Scrollable content area for chat history
 */
export const SidebarContent = forwardRef<
    HTMLDivElement,
    SidebarContentComponentProps
>(({ className, children, ...props }, ref) => {
    return (
        <div
            className={cn(
                "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
                className
            )}
            data-sidebar="content"
            ref={ref}
            {...props}
        >
            {children}
        </div>
    );
});
SidebarContent.displayName = "SidebarContent";
