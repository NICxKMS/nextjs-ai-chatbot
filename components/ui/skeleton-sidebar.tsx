/**
 * Sidebar Skeleton Components
 *
 * Loading skeletons for the application sidebar.
 * Matches the sidebar layout for smooth loading transitions.
 *
 * @module components/ui/skeleton-sidebar
 */

"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/shared/ui/skeleton";

// =============================================================================
// SIDEBAR SKELETON
// =============================================================================

export interface SidebarSkeletonProps {
    /** Number of menu items to show */
    itemCount?: number;
    /** Show header section */
    showHeader?: boolean;
    /** Show footer section */
    showFooter?: boolean;
    /** Additional class names */
    className?: string;
}

/**
 * Full sidebar skeleton.
 * Matches the sidebar layout with header, menu items, and footer.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<SidebarSkeleton itemCount={5} />}>
 *   <AppSidebar />
 * </Suspense>
 * ```
 */
export function SidebarSkeleton({
    itemCount = 5,
    showHeader = true,
    showFooter = true,
    className,
}: SidebarSkeletonProps) {
    return (
        <aside
            aria-hidden="true"
            aria-label="Loading sidebar"
            className={cn(
                "flex h-full w-64 flex-col border-r bg-background",
                className
            )}
            role="status"
        >
            {showHeader && <SidebarHeaderSkeleton />}

            <div className="flex-1 space-y-2 overflow-hidden p-2">
                <SidebarMenuSkeleton itemCount={itemCount} />
            </div>

            {showFooter && <SidebarFooterSkeleton />}
        </aside>
    );
}

// =============================================================================
// SIDEBAR HEADER SKELETON
// =============================================================================

export interface SidebarHeaderSkeletonProps {
    /** Additional class names */
    className?: string;
}

/**
 * Sidebar header skeleton.
 * Shows logo/title and action button placeholders.
 */
export function SidebarHeaderSkeleton({
    className,
}: SidebarHeaderSkeletonProps) {
    return (
        <div className={cn("border-b p-2", className)}>
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-8 rounded-md" />
            </div>
        </div>
    );
}

// =============================================================================
// SIDEBAR MENU SKELETON
// =============================================================================

export interface SidebarMenuSkeletonProps {
    /** Number of menu items */
    itemCount?: number;
    /** Show icons */
    showIcons?: boolean;
    /** Additional class names */
    className?: string;
}

// Predefined widths for consistent rendering (no hydration mismatch)
const MENU_ITEM_WIDTHS = ["80%", "65%", "90%", "70%", "85%", "60%", "75%"];

/**
 * Sidebar menu skeleton.
 * Shows placeholder menu items with icons.
 */
export function SidebarMenuSkeleton({
    itemCount = 5,
    showIcons = true,
    className,
}: SidebarMenuSkeletonProps) {
    return (
        <div className={cn("space-y-1", className)}>
            {Array.from({ length: itemCount }).map((_, i) => (
                <SidebarMenuItemSkeleton
                    key={i}
                    showIcon={showIcons}
                    width={MENU_ITEM_WIDTHS[i % MENU_ITEM_WIDTHS.length]}
                />
            ))}
        </div>
    );
}

// =============================================================================
// SIDEBAR MENU ITEM SKELETON
// =============================================================================

interface SidebarMenuItemSkeletonProps {
    showIcon?: boolean;
    width?: string;
}

/**
 * Single sidebar menu item skeleton.
 */
function SidebarMenuItemSkeleton({
    showIcon = true,
    width = "70%",
}: SidebarMenuItemSkeletonProps) {
    return (
        <div className="flex h-10 items-center gap-2 rounded-md px-2">
            {showIcon && <Skeleton className="h-4 w-4 shrink-0" />}
            <Skeleton className="h-4 flex-1" style={{ maxWidth: width }} />
        </div>
    );
}

// =============================================================================
// SIDEBAR FOOTER SKELETON
// =============================================================================

export interface SidebarFooterSkeletonProps {
    /** Additional class names */
    className?: string;
}

/**
 * Sidebar footer skeleton.
 * Shows user profile placeholder.
 */
export function SidebarFooterSkeleton({
    className,
}: SidebarFooterSkeletonProps) {
    return (
        <div className={cn("border-t p-2", className)}>
            <div className="flex items-center gap-2 rounded-md p-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex flex-1 flex-col gap-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-32" />
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// SIDEBAR GROUP SKELETON
// =============================================================================

export interface SidebarGroupSkeletonProps {
    /** Group title */
    title?: boolean;
    /** Number of items in group */
    itemCount?: number;
    /** Additional class names */
    className?: string;
}

/**
 * Sidebar group skeleton.
 * Shows a labeled group of menu items.
 */
export function SidebarGroupSkeleton({
    title = true,
    itemCount = 3,
    className,
}: SidebarGroupSkeletonProps) {
    return (
        <div className={cn("space-y-2", className)}>
            {title && (
                <div className="px-2 py-1">
                    <Skeleton className="h-3 w-20" />
                </div>
            )}
            <SidebarMenuSkeleton itemCount={itemCount} />
        </div>
    );
}
