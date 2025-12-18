"use client";

/**
 * Sidebar Toggle
 * Toggle button for sidebar visibility
 */

import { forwardRef } from "react";
import { SidebarLeftIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSidebar } from "./context";
import type { SidebarToggleProps } from "./types";

// ============================================================================
// Main Component
// ============================================================================

/**
 * SidebarToggle - Toggle button with tooltip
 */
export const SidebarToggle = forwardRef<HTMLButtonElement, SidebarToggleProps>(
    ({ className, ...props }, ref) => {
        const { toggleSidebar } = useSidebar();

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        className={cn("h-8 px-2 md:h-fit md:px-2", className)}
                        data-testid="sidebar-toggle-button"
                        onClick={toggleSidebar}
                        ref={ref}
                        variant="outline"
                        {...props}
                    >
                        <SidebarLeftIcon size={16} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent align="start" className="hidden md:block">
                    Toggle Sidebar
                </TooltipContent>
            </Tooltip>
        );
    }
);
SidebarToggle.displayName = "SidebarToggle";
