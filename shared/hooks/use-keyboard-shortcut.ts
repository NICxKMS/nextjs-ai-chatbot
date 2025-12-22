"use client";

/**
 * Keyboard Shortcut Hook
 *
 * React hook for registering global keyboard shortcuts.
 * Handles modifier keys (Ctrl, Shift, Alt, Meta) and prevents
 * conflicts with text input fields.
 *
 * @module shared/hooks/use-keyboard-shortcut
 */

import { useCallback, useEffect, useRef } from "react";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Modifier keys that can be combined with the main key.
 */
export interface KeyModifiers {
    /** Ctrl key (Cmd on macOS) */
    ctrl?: boolean;
    /** Shift key */
    shift?: boolean;
    /** Alt key (Option on macOS) */
    alt?: boolean;
    /** Meta key (Cmd on macOS, Win on Windows) */
    meta?: boolean;
}

/**
 * Options for keyboard shortcut configuration.
 */
export interface KeyboardShortcutOptions extends KeyModifiers {
    /**
     * Whether to prevent default browser behavior.
     * @default true
     */
    preventDefault?: boolean;
    /**
     * Whether to stop event propagation.
     * @default false
     */
    stopPropagation?: boolean;
    /**
     * Whether the shortcut is enabled.
     * @default true
     */
    enabled?: boolean;
    /**
     * Whether to allow the shortcut in input fields.
     * @default false
     */
    allowInInputs?: boolean;
    /**
     * Whether to use Cmd on macOS instead of Ctrl.
     * When true, ctrl modifier uses metaKey on macOS.
     * @default true
     */
    useMetaOnMac?: boolean;
}

/**
 * Shortcut definition for registering multiple shortcuts.
 */
export interface ShortcutDefinition extends KeyboardShortcutOptions {
    /** The key to listen for (e.g., "k", "Enter", "Escape") */
    key: string;
    /** Callback to execute when shortcut is triggered */
    callback: (event: KeyboardEvent) => void;
    /** Optional description for accessibility */
    description?: string;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Check if the current platform is macOS.
 */
function isMacOS(): boolean {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
}

/**
 * Check if an element is an input field where shortcuts should be ignored.
 */
function isInputElement(element: EventTarget | null): boolean {
    if (!element || !(element instanceof HTMLElement)) return false;

    const tagName = element.tagName.toLowerCase();
    const isContentEditable = element.isContentEditable;
    const isInput =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        isContentEditable;

    return isInput;
}

/**
 * Check if modifiers match the event.
 */
function modifiersMatch(
    event: KeyboardEvent,
    modifiers: KeyModifiers,
    useMetaOnMac: boolean
): boolean {
    const isMac = isMacOS();

    // Handle ctrl/meta swap for macOS
    const wantsCtrl = modifiers.ctrl ?? false;
    const expectedCtrlOrMeta =
        useMetaOnMac && isMac ? event.metaKey : event.ctrlKey;

    if (wantsCtrl !== expectedCtrlOrMeta) return false;
    if ((modifiers.shift ?? false) !== event.shiftKey) return false;
    if ((modifiers.alt ?? false) !== event.altKey) return false;

    // Meta check (only if explicitly requested and not swapped)
    if (modifiers.meta !== undefined) {
        if (useMetaOnMac && isMac && wantsCtrl) {
            // Meta was already checked above
        } else if (modifiers.meta !== event.metaKey) {
            return false;
        }
    }

    return true;
}

// =============================================================================
// HOOK - SINGLE SHORTCUT
// =============================================================================

/**
 * Hook to register a single keyboard shortcut.
 *
 * @param key - The key to listen for (e.g., "k", "Enter", "Escape")
 * @param callback - Function to call when the shortcut is triggered
 * @param options - Configuration options for the shortcut
 *
 * @example
 * ```tsx
 * // Simple escape key handler
 * useKeyboardShortcut("Escape", () => closeModal());
 *
 * // Ctrl/Cmd + K for search
 * useKeyboardShortcut("k", () => openSearch(), { ctrl: true });
 *
 * // Ctrl/Cmd + Shift + P for command palette
 * useKeyboardShortcut("p", () => openCommandPalette(), {
 *   ctrl: true,
 *   shift: true,
 * });
 * ```
 */
export function useKeyboardShortcut(
    key: string,
    callback: (event: KeyboardEvent) => void,
    options: KeyboardShortcutOptions = {}
): void {
    const {
        ctrl = false,
        shift = false,
        alt = false,
        meta,
        preventDefault = true,
        stopPropagation = false,
        enabled = true,
        allowInInputs = false,
        useMetaOnMac = true,
    } = options;

    // Use ref for callback to avoid re-registering on callback changes
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // Check if we should ignore input fields
            if (!allowInInputs && isInputElement(event.target)) return;

            // Check if the key matches (case-insensitive)
            if (event.key.toLowerCase() !== key.toLowerCase()) return;

            // Check modifiers
            const modifiers: KeyModifiers = { ctrl, shift, alt, meta };
            if (!modifiersMatch(event, modifiers, useMetaOnMac)) return;

            // Shortcut matched!
            if (preventDefault) {
                event.preventDefault();
            }
            if (stopPropagation) {
                event.stopPropagation();
            }

            callbackRef.current(event);
        },
        [
            key,
            ctrl,
            shift,
            alt,
            meta,
            preventDefault,
            stopPropagation,
            enabled,
            allowInInputs,
            useMetaOnMac,
        ]
    );

    useEffect(() => {
        if (!enabled) return;

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleKeyDown, enabled]);
}

// =============================================================================
// HOOK - MULTIPLE SHORTCUTS
// =============================================================================

/**
 * Hook to register multiple keyboard shortcuts at once.
 *
 * @param shortcuts - Array of shortcut definitions
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: "Escape", callback: closeModal, description: "Close modal" },
 *   { key: "k", callback: openSearch, ctrl: true, description: "Open search" },
 *   { key: "Enter", callback: submit, ctrl: true, description: "Submit form" },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: ShortcutDefinition[]): void {
    // Store callbacks in refs to avoid re-registration
    const callbacksRef = useRef<Map<string, (event: KeyboardEvent) => void>>(
        new Map()
    );

    // Update refs when shortcuts change
    useEffect(() => {
        callbacksRef.current.clear();
        for (const shortcut of shortcuts) {
            const id = `${shortcut.key}-${shortcut.ctrl ?? false}-${shortcut.shift ?? false}-${shortcut.alt ?? false}-${shortcut.meta ?? false}`;
            callbacksRef.current.set(id, shortcut.callback);
        }
    }, [shortcuts]);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            for (const shortcut of shortcuts) {
                const {
                    key,
                    ctrl = false,
                    shift = false,
                    alt = false,
                    meta,
                    preventDefault = true,
                    stopPropagation = false,
                    enabled = true,
                    allowInInputs = false,
                    useMetaOnMac = true,
                } = shortcut;

                if (!enabled) continue;

                // Check if we should ignore input fields
                if (!allowInInputs && isInputElement(event.target)) continue;

                // Check if the key matches (case-insensitive)
                if (event.key.toLowerCase() !== key.toLowerCase()) continue;

                // Check modifiers
                const modifiers: KeyModifiers = { ctrl, shift, alt, meta };
                if (!modifiersMatch(event, modifiers, useMetaOnMac)) continue;

                // Shortcut matched!
                if (preventDefault) {
                    event.preventDefault();
                }
                if (stopPropagation) {
                    event.stopPropagation();
                }

                // Get callback from ref
                const id = `${key}-${ctrl}-${shift}-${alt}-${meta ?? false}`;
                const callback = callbacksRef.current.get(id);
                if (callback) {
                    callback(event);
                }

                // Only trigger one shortcut per keypress
                break;
            }
        },
        [shortcuts]
    );

    useEffect(() => {
        const hasEnabledShortcuts = shortcuts.some((s) => s.enabled !== false);
        if (!hasEnabledShortcuts) return;

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleKeyDown, shortcuts]);
}

// =============================================================================
// UTILITY HOOK - GET SHORTCUT LABEL
// =============================================================================

/**
 * Get a display label for a keyboard shortcut.
 * Automatically uses ⌘ for Ctrl on macOS.
 *
 * @example
 * ```tsx
 * const label = getShortcutLabel({ key: "k", ctrl: true });
 * // macOS: "⌘K"
 * // Windows: "Ctrl+K"
 * ```
 */
export function getShortcutLabel(
    key: string,
    modifiers: KeyModifiers = {},
    useMetaOnMac = true
): string {
    const isMac = isMacOS();
    const parts: string[] = [];

    if (modifiers.ctrl) {
        if (useMetaOnMac && isMac) {
            parts.push("⌘");
        } else {
            parts.push("Ctrl");
        }
    }
    if (modifiers.alt) {
        parts.push(isMac ? "⌥" : "Alt");
    }
    if (modifiers.shift) {
        parts.push(isMac ? "⇧" : "Shift");
    }
    if (modifiers.meta && !(modifiers.ctrl && useMetaOnMac && isMac)) {
        parts.push(isMac ? "⌘" : "Win");
    }

    // Format key nicely
    const formattedKey = key.length === 1 ? key.toUpperCase() : key;
    parts.push(formattedKey);

    return isMac ? parts.join("") : parts.join("+");
}
