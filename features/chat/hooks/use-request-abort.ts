"use client";

/**
 * Request Abort Hook
 *
 * Manages AbortController instances with automatic cleanup on unmount.
 *
 * @module features/chat/hooks/use-request-abort
 */

import { useCallback, useEffect, useRef } from "react";

// =============================================================================
// TYPES
// =============================================================================

export interface UseRequestAbortReturn {
    /** Get or create an AbortController for a given key */
    getController: (key?: string) => AbortController;
    /** Abort a specific request by key */
    abort: (key?: string) => void;
    /** Abort all pending requests */
    abortAll: () => void;
    /** Check if a request is aborted */
    isAborted: (key?: string) => boolean;
    /** Get the abort signal for a key */
    getSignal: (key?: string) => AbortSignal;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_KEY = "__default__";

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing request AbortControllers with automatic cleanup.
 *
 * Features:
 * - Named controllers for multiple concurrent requests
 * - Automatic abort on unmount
 * - Signal reuse prevention
 *
 * @returns Abort controller management utilities
 *
 * @example
 * ```tsx
 * const { getSignal, abort, abortAll } = useRequestAbort();
 *
 * // For a single request
 * const handleFetch = async () => {
 *   const response = await fetch('/api/data', {
 *     signal: getSignal(),
 *   });
 * };
 *
 * // For multiple concurrent requests
 * const handleMultiple = async () => {
 *   const [users, posts] = await Promise.all([
 *     fetch('/api/users', { signal: getSignal('users') }),
 *     fetch('/api/posts', { signal: getSignal('posts') }),
 *   ]);
 * };
 *
 * // Cancel specific request
 * const handleCancelUsers = () => abort('users');
 *
 * // Cancel all on unmount (automatic)
 * ```
 */
export function useRequestAbort(): UseRequestAbortReturn {
    const controllersRef = useRef<Map<string, AbortController>>(new Map());

    // Get or create a controller for a key
    const getController = useCallback(
        (key: string = DEFAULT_KEY): AbortController => {
            const existing = controllersRef.current.get(key);

            // If existing controller is not aborted, return it
            if (existing && !existing.signal.aborted) {
                return existing;
            }

            // Create new controller
            const controller = new AbortController();
            controllersRef.current.set(key, controller);
            return controller;
        },
        []
    );

    // Get the signal for a key (creates controller if needed)
    const getSignal = useCallback(
        (key: string = DEFAULT_KEY): AbortSignal => {
            return getController(key).signal;
        },
        [getController]
    );

    // Abort a specific request
    const abort = useCallback((key: string = DEFAULT_KEY): void => {
        const controller = controllersRef.current.get(key);
        if (controller && !controller.signal.aborted) {
            controller.abort();
        }
        controllersRef.current.delete(key);
    }, []);

    // Abort all pending requests
    const abortAll = useCallback((): void => {
        for (const controller of controllersRef.current.values()) {
            if (!controller.signal.aborted) {
                controller.abort();
            }
        }
        controllersRef.current.clear();
    }, []);

    // Check if a request is aborted
    const isAborted = useCallback((key: string = DEFAULT_KEY): boolean => {
        const controller = controllersRef.current.get(key);
        return controller?.signal.aborted ?? false;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            for (const controller of controllersRef.current.values()) {
                if (!controller.signal.aborted) {
                    controller.abort();
                }
            }
            controllersRef.current.clear();
        };
    }, []);

    return {
        getController,
        getSignal,
        abort,
        abortAll,
        isAborted,
    };
}

/**
 * Creates a timeout-enabled AbortController.
 *
 * @param timeoutMs - Timeout in milliseconds
 * @returns AbortController that auto-aborts after timeout
 *
 * @example
 * ```ts
 * const controller = createTimeoutAbortController(5000);
 * const response = await fetch('/api/data', {
 *   signal: controller.signal,
 * });
 * ```
 */
export function createTimeoutAbortController(
    timeoutMs: number
): AbortController {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Clear timeout if aborted early
    controller.signal.addEventListener("abort", () => {
        clearTimeout(timeoutId);
    });

    return controller;
}

/**
 * Combines multiple AbortSignals into one.
 *
 * The combined signal aborts when ANY of the input signals abort.
 *
 * @param signals - AbortSignals to combine
 * @returns Combined AbortSignal
 *
 * @example
 * ```ts
 * const userSignal = userController.signal;
 * const timeoutSignal = timeoutController.signal;
 *
 * const combinedSignal = combineAbortSignals(userSignal, timeoutSignal);
 *
 * await fetch('/api/data', { signal: combinedSignal });
 * ```
 */
export function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
        if (signal.aborted) {
            controller.abort(signal.reason);
            return controller.signal;
        }

        signal.addEventListener(
            "abort",
            () => controller.abort(signal.reason),
            { once: true }
        );
    }

    return controller.signal;
}
