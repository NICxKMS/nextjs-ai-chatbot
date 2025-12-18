/**
 * Sidebar Types
 * Type definitions for sidebar components
 */

import type { ComponentProps } from "react";

// ============================================================================
// Context Types
// ============================================================================

export type SidebarState = "expanded" | "collapsed";

export type SidebarContextValue = {
    state: SidebarState;
    open: boolean;
    setOpen: (open: boolean) => void;
    openMobile: boolean;
    setOpenMobile: (open: boolean) => void;
    isMobile: boolean | undefined;
    toggleSidebar: () => void;
};

// ============================================================================
// Component Props Types
// ============================================================================

export interface SidebarProviderProps extends ComponentProps<"div"> {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    initialIsMobile?: boolean;
}

export interface SidebarRootProps extends ComponentProps<"div"> {
    side?: "left" | "right";
    variant?: "sidebar" | "floating" | "inset";
    collapsible?: "offcanvas" | "icon" | "none";
}

export interface SidebarHeaderProps extends ComponentProps<"div"> {}

export interface SidebarContentProps extends ComponentProps<"div"> {}

export interface SidebarFooterProps extends ComponentProps<"div"> {}

export interface SidebarToggleProps extends ComponentProps<"button"> {
    className?: string;
}

// ============================================================================
// User Types
// ============================================================================

export type SidebarUser = {
    email?: string | null;
};

// ============================================================================
// Constants
// ============================================================================

export const SIDEBAR_CONSTANTS = {
    COOKIE_NAME: "sidebar_state",
    WIDTH: "16rem",
    WIDTH_MOBILE: "18rem",
    WIDTH_ICON: "3rem",
    KEYBOARD_SHORTCUT: "b",
} as const;
