"use client";

/**
 * Cleanup Hook
 *
 * Provides utilities for managing resource cleanup on unmount.
 * Prevents memory leaks by centralizing cleanup logic.
 *
 * @module shared/hooks/use-cleanup
 */

import { useCallback, useEffect, useRef } from "react";

// =============================================================================
// TYPES
// =============================================================================

export type CleanupFn = () => void;

export interface UseCleanupReturn {
    /** Register a cleanup function to be called on unmount */
    register: (cleanup: CleanupFn, key?: string) => void;
    /** Unregister a cleanup function by key */
    unregister: (key: string) => void;
    /** Run a specific cleanup and remove it */
    runCleanup: (key: string) => void;
    /** Run all cleanups and clear them */
    runAllCleanups: () => void;
    /** Get the count of registered cleanups */
    getCount: () => number;
}

export interface UseResourceReturn<T> {
    /** The managed resource */
    resource: T | null;
    /** Set the resource (replaces any existing resource) */
    setResource: (resource: T) => void;
    /** Clear the resource */
    clearResource: () => void;
    /** Check if resource exists */
    hasResource: boolean;
}

export interface UseIntervalReturn {
    /** Start the interval */
    start: () => void;
    /** Stop the interval */
    stop: () => void;
    /** Check if interval is running */
    isRunning: boolean;
    /** Reset and restart the interval */
    restart: () => void;
}

export interface UseTimeoutReturn {
    /** Set/reset the timeout */
    set: (delayMs?: number) => void;
    /** Clear the timeout */
    clear: () => void;
    /** Check if timeout is pending */
    isPending: boolean;
}

export interface UseAnimationFrameReturn {
    /** Request an animation frame */
    request: (callback: FrameRequestCallback) => void;
    /** Cancel pending animation frame */
    cancel: () => void;
    /** Check if a frame is pending */
    isPending: boolean;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook for managing multiple cleanup functions with automatic execution on unmount.
 *
 * @returns Cleanup registration and management utilities
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { register, runCleanup } = useCleanup();
 *
 *   useEffect(() => {
 *     const socket = new WebSocket(url);
 *     register(() => socket.close(), 'socket');
 *
 *     const interval = setInterval(tick, 1000);
 *     register(() => clearInterval(interval), 'interval');
 *
 *     // Socket reconnect: clean up old, create new
 *     const reconnect = () => {
 *       runCleanup('socket');
 *       const newSocket = new WebSocket(url);
 *       register(() => newSocket.close(), 'socket');
 *     };
 *   }, []);
 *
 *   return <div>Content</div>;
 * }
 * ```
 */
export function useCleanup(): UseCleanupReturn {
    const cleanupsRef = useRef<Map<string, CleanupFn>>(new Map());
    const counterRef = useRef(0);

    // Run all cleanups on unmount
    useEffect(() => {
        return () => {
            for (const cleanup of cleanupsRef.current.values()) {
                try {
                    cleanup();
                } catch (error) {
                    console.error("[useCleanup] Cleanup error:", error);
                }
            }
            cleanupsRef.current.clear();
        };
    }, []);

    const register = useCallback((cleanup: CleanupFn, key?: string): void => {
        const cleanupKey = key ?? `cleanup_${counterRef.current++}`;

        // If key exists, run existing cleanup first
        if (cleanupsRef.current.has(cleanupKey)) {
            try {
                cleanupsRef.current.get(cleanupKey)?.();
            } catch (error) {
                console.error("[useCleanup] Cleanup error on replace:", error);
            }
        }

        cleanupsRef.current.set(cleanupKey, cleanup);
    }, []);

    const unregister = useCallback((key: string): void => {
        cleanupsRef.current.delete(key);
    }, []);

    const runCleanup = useCallback((key: string): void => {
        const cleanup = cleanupsRef.current.get(key);
        if (cleanup) {
            try {
                cleanup();
            } catch (error) {
                console.error("[useCleanup] Cleanup error:", error);
            }
            cleanupsRef.current.delete(key);
        }
    }, []);

    const runAllCleanups = useCallback((): void => {
        for (const cleanup of cleanupsRef.current.values()) {
            try {
                cleanup();
            } catch (error) {
                console.error("[useCleanup] Cleanup error:", error);
            }
        }
        cleanupsRef.current.clear();
    }, []);

    const getCount = useCallback((): number => {
        return cleanupsRef.current.size;
    }, []);

    return {
        register,
        unregister,
        runCleanup,
        runAllCleanups,
        getCount,
    };
}

/**
 * Hook for managing a single resource with automatic cleanup.
 *
 * @param cleanup - Cleanup function called when resource is replaced or component unmounts
 * @returns Resource management utilities
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { resource, setResource, clearResource } = useResource<WebSocket>(
 *     (ws) => ws.close()
 *   );
 *
 *   const connect = () => {
 *     setResource(new WebSocket(url)); // Auto-closes previous if exists
 *   };
 *
 *   return (
 *     <button onClick={connect}>
 *       {resource ? 'Reconnect' : 'Connect'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useResource<T>(
    cleanup: (resource: T) => void
): UseResourceReturn<T> {
    const resourceRef = useRef<T | null>(null);
    const cleanupRef = useRef(cleanup);

    // Keep cleanup ref updated
    useEffect(() => {
        cleanupRef.current = cleanup;
    }, [cleanup]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (resourceRef.current !== null) {
                try {
                    cleanupRef.current(resourceRef.current);
                } catch (error) {
                    console.error("[useResource] Cleanup error:", error);
                }
                resourceRef.current = null;
            }
        };
    }, []);

    const setResource = useCallback((resource: T): void => {
        // Clean up existing resource first
        if (resourceRef.current !== null) {
            try {
                cleanupRef.current(resourceRef.current);
            } catch (error) {
                console.error("[useResource] Cleanup error on replace:", error);
            }
        }
        resourceRef.current = resource;
    }, []);

    const clearResource = useCallback((): void => {
        if (resourceRef.current !== null) {
            try {
                cleanupRef.current(resourceRef.current);
            } catch (error) {
                console.error("[useResource] Cleanup error:", error);
            }
            resourceRef.current = null;
        }
    }, []);

    return {
        resource: resourceRef.current,
        setResource,
        clearResource,
        hasResource: resourceRef.current !== null,
    };
}

/**
 * Hook for managing intervals with automatic cleanup.
 *
 * @param callback - Function to call on each interval
 * @param delayMs - Interval delay in milliseconds
 * @param autoStart - Whether to start immediately (default: true)
 * @returns Interval control utilities
 *
 * @example
 * ```tsx
 * function Timer() {
 *   const [count, setCount] = useState(0);
 *   const { start, stop, isRunning } = useInterval(
 *     () => setCount(c => c + 1),
 *     1000,
 *     false // Don't auto-start
 *   );
 *
 *   return (
 *     <>
 *       <div>Count: {count}</div>
 *       <button onClick={isRunning ? stop : start}>
 *         {isRunning ? 'Stop' : 'Start'}
 *       </button>
 *     </>
 *   );
 * }
 * ```
 */
export function useInterval(
    callback: () => void,
    delayMs: number,
    autoStart = true
): UseIntervalReturn {
    const callbackRef = useRef(callback);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isRunningRef = useRef(false);

    // Keep callback ref updated
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const stop = useCallback((): void => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            isRunningRef.current = false;
        }
    }, []);

    const start = useCallback((): void => {
        stop(); // Clear any existing interval
        intervalRef.current = setInterval(() => {
            callbackRef.current();
        }, delayMs);
        isRunningRef.current = true;
    }, [delayMs, stop]);

    const restart = useCallback((): void => {
        start();
    }, [start]);

    // Auto-start if enabled
    useEffect(() => {
        if (autoStart) {
            start();
        }
        return stop;
    }, [autoStart, start, stop]);

    return {
        start,
        stop,
        isRunning: isRunningRef.current,
        restart,
    };
}

/**
 * Hook for managing timeouts with automatic cleanup.
 *
 * @param callback - Function to call when timeout fires
 * @param delayMs - Default delay in milliseconds
 * @returns Timeout control utilities
 *
 * @example
 * ```tsx
 * function Notification({ message }: { message: string }) {
 *   const [visible, setVisible] = useState(true);
 *   const { set, clear } = useTimeout(() => setVisible(false), 5000);
 *
 *   // Auto-hide after 5 seconds, but can be dismissed early
 *   const dismiss = () => {
 *     clear();
 *     setVisible(false);
 *   };
 *
 *   // Reset timer on hover
 *   const handleMouseEnter = () => clear();
 *   const handleMouseLeave = () => set();
 *
 *   if (!visible) return null;
 *   return (
 *     <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
 *       {message}
 *       <button onClick={dismiss}>×</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTimeout(
    callback: () => void,
    delayMs: number
): UseTimeoutReturn {
    const callbackRef = useRef(callback);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isPendingRef = useRef(false);

    // Keep callback ref updated
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const clear = useCallback((): void => {
        if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
            isPendingRef.current = false;
        }
    }, []);

    const set = useCallback(
        (customDelayMs?: number): void => {
            clear();
            timeoutRef.current = setTimeout(() => {
                timeoutRef.current = null;
                isPendingRef.current = false;
                callbackRef.current();
            }, customDelayMs ?? delayMs);
            isPendingRef.current = true;
        },
        [delayMs, clear]
    );

    // Cleanup on unmount
    useEffect(() => {
        return clear;
    }, [clear]);

    return {
        set,
        clear,
        isPending: isPendingRef.current,
    };
}

/**
 * Hook for managing requestAnimationFrame with automatic cleanup.
 *
 * @returns Animation frame control utilities
 *
 * @example
 * ```tsx
 * function Animation() {
 *   const { request, cancel } = useAnimationFrame();
 *   const elementRef = useRef<HTMLDivElement>(null);
 *
 *   const animate = useCallback((time: number) => {
 *     if (elementRef.current) {
 *       elementRef.current.style.transform = `translateX(${Math.sin(time / 1000) * 100}px)`;
 *     }
 *     request(animate); // Loop
 *   }, [request]);
 *
 *   useEffect(() => {
 *     request(animate);
 *     return cancel;
 *   }, [animate, request, cancel]);
 *
 *   return <div ref={elementRef}>Animated</div>;
 * }
 * ```
 */
export function useAnimationFrame(): UseAnimationFrameReturn {
    const rafIdRef = useRef<number | null>(null);
    const isPendingRef = useRef(false);

    const cancel = useCallback((): void => {
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
            isPendingRef.current = false;
        }
    }, []);

    const request = useCallback(
        (callback: FrameRequestCallback): void => {
            cancel(); // Cancel any pending frame
            rafIdRef.current = requestAnimationFrame((time) => {
                rafIdRef.current = null;
                isPendingRef.current = false;
                callback(time);
            });
            isPendingRef.current = true;
        },
        [cancel]
    );

    // Cleanup on unmount
    useEffect(() => {
        return cancel;
    }, [cancel]);

    return {
        request,
        cancel,
        isPending: isPendingRef.current,
    };
}

/**
 * Hook that runs a cleanup function on unmount only.
 *
 * @param cleanup - Cleanup function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const socketRef = useRef<WebSocket | null>(null);
 *
 *   useOnUnmount(() => {
 *     socketRef.current?.close();
 *   });
 *
 *   // Component logic...
 * }
 * ```
 */
export function useOnUnmount(cleanup: CleanupFn): void {
    const cleanupRef = useRef(cleanup);

    // Keep cleanup ref updated
    useEffect(() => {
        cleanupRef.current = cleanup;
    }, [cleanup]);

    useEffect(() => {
        return () => {
            cleanupRef.current();
        };
    }, []);
}

/**
 * Hook for managing AbortController with automatic cleanup.
 *
 * @returns AbortController utilities
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { getSignal, abort, reset } = useAbortController();
 *
 *   const fetchData = async () => {
 *     const response = await fetch('/api/data', {
 *       signal: getSignal(),
 *     });
 *     return response.json();
 *   };
 *
 *   const cancelFetch = () => {
 *     abort();
 *     reset(); // Ready for next fetch
 *   };
 *
 *   return <button onClick={cancelFetch}>Cancel</button>;
 * }
 * ```
 */
export function useAbortController(): {
    getSignal: () => AbortSignal;
    abort: (reason?: string) => void;
    reset: () => void;
    isAborted: boolean;
} {
    const controllerRef = useRef<AbortController>(new AbortController());

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (!controllerRef.current.signal.aborted) {
                controllerRef.current.abort();
            }
        };
    }, []);

    const getSignal = useCallback((): AbortSignal => {
        return controllerRef.current.signal;
    }, []);

    const abort = useCallback((reason?: string): void => {
        if (!controllerRef.current.signal.aborted) {
            controllerRef.current.abort(reason);
        }
    }, []);

    const reset = useCallback((): void => {
        if (controllerRef.current.signal.aborted) {
            controllerRef.current = new AbortController();
        }
    }, []);

    return {
        getSignal,
        abort,
        reset,
        isAborted: controllerRef.current.signal.aborted,
    };
}
