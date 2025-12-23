"use client";

/**
 * Focus Trap Hook
 *
 * React hook for trapping focus within a container element.
 * Essential for accessible modals, dialogs, and dropdown menus.
 * Manages focus on mount/unmount and handles Tab key navigation.
 *
 * @module shared/hooks/use-focus-trap
 */

import { useCallback, useEffect, useRef } from "react";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for configuring the focus trap behavior.
 */
export interface UseFocusTrapOptions {
    /**
     * Whether the focus trap is currently active.
     * @default true
     */
    enabled?: boolean;
    /**
     * Whether to auto-focus the first focusable element on mount.
     * @default true
     */
    autoFocus?: boolean;
    /**
     * Whether to restore focus to the previously focused element on unmount.
     * @default true
     */
    restoreFocus?: boolean;
    /**
     * Selector for the initial element to focus.
     * If not provided, focuses the first focusable element.
     */
    initialFocusSelector?: string;
    /**
     * Callback when user attempts to tab out of the trap.
     * Can be used to close the container.
     */
    onEscapeAttempt?: () => void;
    /**
     * Whether to close on Escape key press.
     * @default false
     */
    closeOnEscape?: boolean;
    /**
     * Callback when Escape key is pressed (if closeOnEscape is true).
     */
    onClose?: () => void;
}

/**
 * Return type for the useFocusTrap hook.
 */
export interface UseFocusTrapReturn<T extends HTMLElement = HTMLElement> {
    /** Ref to attach to the container element */
    containerRef: React.RefObject<T | null>;
    /** Manually focus the first focusable element */
    focusFirst: () => void;
    /** Manually focus the last focusable element */
    focusLast: () => void;
    /** Check if an element is within the trap */
    containsFocus: () => boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Selector for all focusable elements.
 * Excludes disabled and hidden elements.
 */
const FOCUSABLE_SELECTOR = [
    'a[href]:not([disabled]):not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])',
    '[contenteditable="true"]:not([disabled])',
].join(",");

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get all focusable elements within a container.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
    const elements =
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    return Array.from(elements).filter((el) => {
        // Additional check: element must be visible
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
    });
}

/**
 * Get the first focusable element in a container.
 */
function getFirstFocusable(container: HTMLElement): HTMLElement | null {
    const focusable = getFocusableElements(container);
    return focusable[0] || null;
}

/**
 * Get the last focusable element in a container.
 */
function getLastFocusable(container: HTMLElement): HTMLElement | null {
    const focusable = getFocusableElements(container);
    return focusable.at(-1) || null;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to trap focus within a container element.
 *
 * @param options - Configuration options for the focus trap
 * @returns Object with containerRef and focus utility functions
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose, children }) {
 *   const { containerRef } = useFocusTrap<HTMLDivElement>({
 *     enabled: isOpen,
 *     closeOnEscape: true,
 *     onClose,
 *   });
 *
 *   if (!isOpen) return null;
 *
 *   return (
 *     <div ref={containerRef} role="dialog" aria-modal="true">
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With initial focus on a specific element
 * const { containerRef } = useFocusTrap({
 *   initialFocusSelector: '[data-autofocus]',
 *   restoreFocus: true,
 * });
 * ```
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
    options: UseFocusTrapOptions = {}
): UseFocusTrapReturn<T> {
    const {
        enabled = true,
        autoFocus = true,
        restoreFocus = true,
        initialFocusSelector,
        onEscapeAttempt,
        closeOnEscape = false,
        onClose,
    } = options;

    const containerRef = useRef<T | null>(null);
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);

    /**
     * Focus the first focusable element.
     */
    const focusFirst = useCallback(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const first = getFirstFocusable(container);
        if (first) {
            first.focus();
        }
    }, []);

    /**
     * Focus the last focusable element.
     */
    const focusLast = useCallback(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const last = getLastFocusable(container);
        if (last) {
            last.focus();
        }
    }, []);

    /**
     * Check if the container currently contains focus.
     */
    const containsFocus = useCallback((): boolean => {
        const container = containerRef.current;
        if (!container) {
            return false;
        }
        return container.contains(document.activeElement);
    }, []);

    // Store the previously focused element when enabled
    useEffect(() => {
        if (enabled) {
            previouslyFocusedRef.current =
                document.activeElement as HTMLElement;
        }
    }, [enabled]);

    // Auto-focus on mount
    useEffect(() => {
        if (!enabled || !autoFocus) {
            return;
        }

        const container = containerRef.current;
        if (!container) {
            return;
        }

        // Small delay to ensure DOM is ready
        const timeoutId = setTimeout(() => {
            // Try initial focus selector first
            if (initialFocusSelector) {
                const initialElement =
                    container.querySelector<HTMLElement>(initialFocusSelector);
                if (initialElement) {
                    initialElement.focus();
                    return;
                }
            }

            // Fall back to first focusable element
            focusFirst();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [enabled, autoFocus, initialFocusSelector, focusFirst]);

    // Restore focus on unmount or disable
    useEffect(() => {
        if (!restoreFocus) {
            return;
        }

        return () => {
            const previousElement = previouslyFocusedRef.current;
            if (
                previousElement &&
                typeof previousElement.focus === "function"
            ) {
                // Small delay to ensure other cleanup has happened
                setTimeout(() => {
                    previousElement.focus();
                }, 0);
            }
        };
    }, [restoreFocus]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!enabled) {
            return;
        }

        const container = containerRef.current;
        if (!container) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            // Handle Escape key
            if (event.key === "Escape") {
                if (closeOnEscape && onClose) {
                    event.preventDefault();
                    onClose();
                }
                return;
            }

            // Handle Tab key for focus trapping
            if (event.key === "Tab") {
                const focusableElements = getFocusableElements(container);
                if (focusableElements.length === 0) {
                    event.preventDefault();
                    onEscapeAttempt?.();
                    return;
                }

                const firstElement = focusableElements[0];
                const lastElement = focusableElements.at(-1);
                const activeElement = document.activeElement;

                // Type guard - should never be undefined after length check
                if (!firstElement || !lastElement) {
                    return;
                }

                // Shift+Tab on first element -> go to last
                if (event.shiftKey && activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                    return;
                }

                // Tab on last element -> go to first
                if (!event.shiftKey && activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                    return;
                }

                // If focus is outside container, bring it back
                if (!container.contains(activeElement)) {
                    event.preventDefault();
                    if (event.shiftKey) {
                        lastElement.focus();
                    } else {
                        firstElement.focus();
                    }
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [enabled, closeOnEscape, onClose, onEscapeAttempt]);

    // Keep focus within container
    useEffect(() => {
        if (!enabled) {
            return;
        }

        const container = containerRef.current;
        if (!container) {
            return;
        }

        const handleFocusOut = (event: FocusEvent) => {
            const relatedTarget = event.relatedTarget as HTMLElement | null;

            // If focus is moving outside the container, bring it back
            if (relatedTarget && !container.contains(relatedTarget)) {
                event.preventDefault();
                focusFirst();
            }
        };

        container.addEventListener("focusout", handleFocusOut);
        return () => {
            container.removeEventListener("focusout", handleFocusOut);
        };
    }, [enabled, focusFirst]);

    return {
        containerRef,
        focusFirst,
        focusLast,
        containsFocus,
    };
}

// =============================================================================
// UTILITY HOOK - FOCUS RESTORE
// =============================================================================

/**
 * Hook to restore focus to a specific element when a condition changes.
 * Simpler alternative to full focus trap when you just need restore behavior.
 *
 * @example
 * ```tsx
 * function Dropdown({ isOpen }) {
 *   const triggerRef = useFocusRestore(isOpen);
 *
 *   return (
 *     <>
 *       <button ref={triggerRef}>Toggle</button>
 *       {isOpen && <DropdownContent />}
 *     </>
 *   );
 * }
 * ```
 */
export function useFocusRestore<T extends HTMLElement = HTMLElement>(
    shouldRestore: boolean
): React.RefObject<T | null> {
    const elementRef = useRef<T | null>(null);
    const wasOpenRef = useRef(false);

    useEffect(() => {
        // When closing (was open, now not), restore focus
        if (wasOpenRef.current && !shouldRestore) {
            const element = elementRef.current;
            if (element && typeof element.focus === "function") {
                element.focus();
            }
        }

        wasOpenRef.current = shouldRestore;
    }, [shouldRestore]);

    return elementRef;
}
