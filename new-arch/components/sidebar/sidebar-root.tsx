"use client";

/**
 * Sidebar Root
 * Main sidebar container with desktop/mobile variants
 */

import { type CSSProperties, forwardRef } from "react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSidebar } from "./context";
import { SIDEBAR_CONSTANTS, type SidebarRootProps } from "./types";

// ============================================================================
// Main Component
// ============================================================================

/**
 * SidebarRoot - Main sidebar container
 *
 * Renders as:
 * - Sheet (modal) on mobile
 * - Fixed sidebar on desktop
 *
 * @param side - "left" | "right"
 * @param variant - "sidebar" | "floating" | "inset"
 * @param collapsible - "offcanvas" | "icon" | "none"
 */
export const SidebarRoot = forwardRef<HTMLDivElement, SidebarRootProps>(
    (
        {
            side = "left",
            variant = "sidebar",
            collapsible = "offcanvas",
            className,
            children,
            ...props
        },
        ref
    ) => {
        const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

        // Non-collapsible variant
        if (collapsible === "none") {
            return (
                <div
                    className={cn(
                        "flex h-full w-[var(--sidebar-width)] flex-col bg-sidebar text-sidebar-foreground",
                        className
                    )}
                    ref={ref}
                    {...props}
                >
                    {children}
                </div>
            );
        }

        // Wait for mobile detection
        if (isMobile === undefined) {
            return null;
        }

        // Mobile: Sheet variant
        if (isMobile) {
            return (
                <Sheet
                    onOpenChange={setOpenMobile}
                    open={openMobile}
                    {...props}
                >
                    <SheetContent
                        className="w-[var(--sidebar-width)] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
                        data-mobile="true"
                        data-sidebar="sidebar"
                        side={side}
                        style={
                            {
                                "--sidebar-width":
                                    SIDEBAR_CONSTANTS.WIDTH_MOBILE,
                            } as CSSProperties
                        }
                    >
                        <SheetHeader className="sr-only">
                            <SheetTitle>Sidebar</SheetTitle>
                            <SheetDescription>
                                Displays the mobile sidebar.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="flex h-full w-full flex-col">
                            {children}
                        </div>
                    </SheetContent>
                </Sheet>
            );
        }

        // Desktop: Fixed sidebar
        return (
            <div
                className="group peer hidden text-sidebar-foreground md:block"
                data-collapsible={state === "collapsed" ? collapsible : ""}
                data-side={side}
                data-state={state}
                data-variant={variant}
                ref={ref}
            >
                {/* Sidebar gap spacer */}
                <div
                    className={cn(
                        "relative w-[var(--sidebar-width)] bg-transparent transition-[width] duration-200 ease-linear",
                        "group-data-[collapsible=offcanvas]:w-0",
                        "group-data-[side=right]:rotate-180",
                        variant === "floating" || variant === "inset"
                            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
                            : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]"
                    )}
                />
                {/* Sidebar panel */}
                <div
                    className={cn(
                        "fixed inset-y-0 z-10 hidden h-svh w-[var(--sidebar-width)] transition-[left,right,width] duration-200 ease-linear md:flex",
                        side === "left"
                            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
                            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
                        variant === "floating" || variant === "inset"
                            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
                            : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)] group-data-[side=left]:border-r group-data-[side=right]:border-l",
                        className
                    )}
                    {...props}
                >
                    <div
                        className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
                        data-sidebar="sidebar"
                    >
                        {children}
                    </div>
                </div>
            </div>
        );
    }
);
SidebarRoot.displayName = "SidebarRoot";
