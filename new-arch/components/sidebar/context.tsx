"use client";

/**
 * Sidebar Context
 * Context provider for sidebar state management
 */

import {
    type CSSProperties,
    createContext,
    forwardRef,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatSDKError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import {
    SIDEBAR_CONSTANTS,
    type SidebarContextValue,
    type SidebarProviderProps,
} from "./types";

// ============================================================================
// Context
// ============================================================================

const SidebarContext = createContext<SidebarContextValue | null>(null);

// ============================================================================
// Hook
// ============================================================================

/**
 * useSidebar - Access sidebar context
 * @throws ChatSDKError if used outside SidebarProvider
 */
export function useSidebar(): SidebarContextValue {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new ChatSDKError("bad_request:ui:useSidebar_outside_provider");
    }
    return context;
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * SidebarProvider - Provides sidebar state context
 *
 * Features:
 * - Controlled/uncontrolled state management
 * - Mobile responsiveness
 * - Cookie persistence
 * - Keyboard shortcut (Cmd/Ctrl + B)
 */
export const SidebarProvider = forwardRef<HTMLDivElement, SidebarProviderProps>(
    (
        {
            defaultOpen = true,
            open: openProp,
            onOpenChange: setOpenProp,
            initialIsMobile,
            className,
            style,
            children,
            ...props
        },
        ref
    ) => {
        const isMobile = useIsMobile({ initialIsMobile });
        const [openMobile, setOpenMobile] = useState(false);
        const [_open, _setOpen] = useState(defaultOpen);

        // Persist to cookie
        useEffect(() => {
            // biome-ignore lint/suspicious/noDocumentCookie: Intentional cookie persistence
            document.cookie = `${SIDEBAR_CONSTANTS.COOKIE_NAME}=${_open}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        }, [_open]);

        const open = openProp ?? _open;

        const setOpen = useCallback(
            (newValue: boolean | ((value: boolean) => boolean)) => {
                const openState =
                    typeof newValue === "function" ? newValue(open) : newValue;
                if (setOpenProp) {
                    setOpenProp(openState);
                } else {
                    _setOpen(openState);
                }
            },
            [setOpenProp, open]
        );

        const toggleSidebar = useCallback(() => {
            return isMobile
                ? setOpenMobile((prev) => !prev)
                : setOpen((prev) => !prev);
        }, [isMobile, setOpen]);

        // Keyboard shortcut
        useEffect(() => {
            const handleKeyDown = (event: KeyboardEvent) => {
                if (
                    event.key === SIDEBAR_CONSTANTS.KEYBOARD_SHORTCUT &&
                    (event.metaKey || event.ctrlKey)
                ) {
                    event.preventDefault();
                    toggleSidebar();
                }
            };

            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }, [toggleSidebar]);

        const state = open ? "expanded" : "collapsed";

        const contextValue = useMemo<SidebarContextValue>(
            () => ({
                state,
                open,
                setOpen,
                isMobile,
                openMobile,
                setOpenMobile,
                toggleSidebar,
            }),
            [state, open, setOpen, isMobile, openMobile, toggleSidebar]
        );

        return (
            <SidebarContext.Provider value={contextValue}>
                <div
                    className={cn(
                        "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
                        className
                    )}
                    ref={ref}
                    style={
                        {
                            "--sidebar-width": SIDEBAR_CONSTANTS.WIDTH,
                            "--sidebar-width-icon":
                                SIDEBAR_CONSTANTS.WIDTH_ICON,
                            ...style,
                        } as CSSProperties
                    }
                    {...props}
                >
                    {children}
                </div>
            </SidebarContext.Provider>
        );
    }
);
SidebarProvider.displayName = "SidebarProvider";
