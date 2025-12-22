/**
 * Event Listener Utilities
 *
 * Provides utilities for safe event listener management with automatic cleanup.
 * Prevents memory leaks from forgotten removeEventListener calls.
 *
 * @module lib/utils/event-listener
 */

// =============================================================================
// TYPES
// =============================================================================

export interface EventListenerEntry {
    /** Target element or object */
    target: EventTarget;
    /** Event type */
    type: string;
    /** Event handler */
    handler: EventListener;
    /** Event options */
    options?: AddEventListenerOptions;
}

export interface EventListenerManager {
    /** Add an event listener and track it for cleanup */
    add: <K extends keyof WindowEventMap>(
        target: Window,
        type: K,
        handler: (event: WindowEventMap[K]) => void,
        options?: AddEventListenerOptions
    ) => void;
    /** Add an event listener for Document */
    addDocument: <K extends keyof DocumentEventMap>(
        type: K,
        handler: (event: DocumentEventMap[K]) => void,
        options?: AddEventListenerOptions
    ) => void;
    /** Add an event listener for Element */
    addElement: <K extends keyof HTMLElementEventMap>(
        target: HTMLElement,
        type: K,
        handler: (event: HTMLElementEventMap[K]) => void,
        options?: AddEventListenerOptions
    ) => void;
    /** Add a generic event listener */
    addGeneric: (
        target: EventTarget,
        type: string,
        handler: EventListener,
        options?: AddEventListenerOptions
    ) => void;
    /** Remove a specific event listener */
    remove: (target: EventTarget, type: string) => void;
    /** Remove all tracked event listeners */
    removeAll: () => void;
    /** Get count of tracked listeners */
    getCount: () => number;
    /** Check if a specific listener exists */
    has: (target: EventTarget, type: string) => boolean;
}

export interface ThrottledListener {
    /** The throttled handler */
    handler: EventListener;
    /** Cancel pending throttled call */
    cancel: () => void;
}

export interface DebouncedListener {
    /** The debounced handler */
    handler: EventListener;
    /** Cancel pending debounced call */
    cancel: () => void;
    /** Flush pending call immediately */
    flush: () => void;
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Creates an event listener manager for tracking and cleaning up event listeners.
 *
 * Automatically handles cleanup to prevent memory leaks.
 *
 * @returns Event listener manager instance
 *
 * @example
 * ```ts
 * // In a React component
 * const listenerManager = useRef(createEventListenerManager());
 *
 * useEffect(() => {
 *   const manager = listenerManager.current;
 *
 *   manager.add(window, 'resize', handleResize);
 *   manager.add(window, 'scroll', handleScroll, { passive: true });
 *   manager.addElement(element, 'click', handleClick);
 *
 *   return () => manager.removeAll();
 * }, []);
 * ```
 */
export function createEventListenerManager(): EventListenerManager {
    const listeners = new Map<string, EventListenerEntry>();

    const getKey = (target: EventTarget, type: string): string => {
        // Use a simple counter-based ID for objects without stable identity
        const targetId =
            target === window
                ? "window"
                : target === document
                  ? "document"
                  : (target as HTMLElement).id || `target_${listeners.size}`;
        return `${targetId}:${type}`;
    };

    const add = <K extends keyof WindowEventMap>(
        target: Window,
        type: K,
        handler: (event: WindowEventMap[K]) => void,
        options?: AddEventListenerOptions
    ): void => {
        const key = getKey(target, type);

        // Remove existing listener if any
        if (listeners.has(key)) {
            remove(target, type);
        }

        target.addEventListener(type, handler as EventListener, options);
        listeners.set(key, {
            target,
            type,
            handler: handler as EventListener,
            options,
        });
    };

    const addDocument = <K extends keyof DocumentEventMap>(
        type: K,
        handler: (event: DocumentEventMap[K]) => void,
        options?: AddEventListenerOptions
    ): void => {
        const key = getKey(document, type);

        if (listeners.has(key)) {
            remove(document, type);
        }

        document.addEventListener(type, handler as EventListener, options);
        listeners.set(key, {
            target: document,
            type,
            handler: handler as EventListener,
            options,
        });
    };

    const addElement = <K extends keyof HTMLElementEventMap>(
        target: HTMLElement,
        type: K,
        handler: (event: HTMLElementEventMap[K]) => void,
        options?: AddEventListenerOptions
    ): void => {
        const key = getKey(target, type);

        if (listeners.has(key)) {
            remove(target, type);
        }

        target.addEventListener(type, handler as EventListener, options);
        listeners.set(key, {
            target,
            type,
            handler: handler as EventListener,
            options,
        });
    };

    const addGeneric = (
        target: EventTarget,
        type: string,
        handler: EventListener,
        options?: AddEventListenerOptions
    ): void => {
        const key = getKey(target, type);

        if (listeners.has(key)) {
            remove(target, type);
        }

        target.addEventListener(type, handler, options);
        listeners.set(key, { target, type, handler, options });
    };

    const remove = (target: EventTarget, type: string): void => {
        const key = getKey(target, type);
        const entry = listeners.get(key);

        if (entry) {
            entry.target.removeEventListener(
                entry.type,
                entry.handler,
                entry.options
            );
            listeners.delete(key);
        }
    };

    const removeAll = (): void => {
        for (const entry of listeners.values()) {
            entry.target.removeEventListener(
                entry.type,
                entry.handler,
                entry.options
            );
        }
        listeners.clear();
    };

    const getCount = (): number => listeners.size;

    const has = (target: EventTarget, type: string): boolean => {
        return listeners.has(getKey(target, type));
    };

    return {
        add,
        addDocument,
        addElement,
        addGeneric,
        remove,
        removeAll,
        getCount,
        has,
    };
}

// =============================================================================
// THROTTLED/DEBOUNCED LISTENERS
// =============================================================================

/**
 * Creates a throttled event listener that fires at most once per interval.
 *
 * @param handler - Original event handler
 * @param intervalMs - Minimum interval between calls
 * @returns Throttled listener with cancel method
 *
 * @example
 * ```ts
 * const { handler, cancel } = createThrottledListener(
 *   (e) => handleResize(e),
 *   100
 * );
 *
 * window.addEventListener('resize', handler);
 *
 * // Cleanup
 * window.removeEventListener('resize', handler);
 * cancel();
 * ```
 */
export function createThrottledListener(
    handler: EventListener,
    intervalMs: number
): ThrottledListener {
    let lastCall = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastEvent: Event | null = null;

    const throttled: EventListener = (event: Event) => {
        const now = Date.now();
        const remaining = intervalMs - (now - lastCall);

        lastEvent = event;

        if (remaining <= 0) {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            lastCall = now;
            handler(event);
        } else if (timeoutId === null) {
            timeoutId = setTimeout(() => {
                lastCall = Date.now();
                timeoutId = null;
                if (lastEvent) {
                    handler(lastEvent);
                }
            }, remaining);
        }
    };

    const cancel = (): void => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        lastEvent = null;
    };

    return { handler: throttled, cancel };
}

/**
 * Creates a debounced event listener that waits for a pause in events.
 *
 * @param handler - Original event handler
 * @param waitMs - Wait time after last event
 * @returns Debounced listener with cancel and flush methods
 *
 * @example
 * ```ts
 * const { handler, cancel, flush } = createDebouncedListener(
 *   (e) => handleInput(e),
 *   300
 * );
 *
 * input.addEventListener('input', handler);
 *
 * // Cleanup
 * input.removeEventListener('input', handler);
 * cancel();
 * ```
 */
export function createDebouncedListener(
    handler: EventListener,
    waitMs: number
): DebouncedListener {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastEvent: Event | null = null;

    const debounced: EventListener = (event: Event) => {
        lastEvent = event;

        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            timeoutId = null;
            if (lastEvent) {
                handler(lastEvent);
                lastEvent = null;
            }
        }, waitMs);
    };

    const cancel = (): void => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        lastEvent = null;
    };

    const flush = (): void => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
            if (lastEvent) {
                handler(lastEvent);
                lastEvent = null;
            }
        }
    };

    return { handler: debounced, cancel, flush };
}

// =============================================================================
// PASSIVE LISTENER UTILITIES
// =============================================================================

/**
 * Detects if the browser supports passive event listeners.
 *
 * @returns true if passive listeners are supported
 */
export function supportsPassiveListeners(): boolean {
    let passive = false;
    try {
        const options = {
            get passive() {
                passive = true;
                return true;
            },
        };
        // Test passive support
        const noop = () => {};
        window.addEventListener(
            "test",
            noop,
            options as AddEventListenerOptions
        );
        window.removeEventListener(
            "test",
            noop,
            options as AddEventListenerOptions
        );
    } catch {
        passive = false;
    }
    return passive;
}

/**
 * Gets optimal options for scroll/touch events (passive when supported).
 *
 * @param options - Additional options to merge
 * @returns Options object with passive flag if supported
 *
 * @example
 * ```ts
 * window.addEventListener('scroll', handler, getPassiveOptions());
 * element.addEventListener('touchstart', handler, getPassiveOptions({ capture: true }));
 * ```
 */
export function getPassiveOptions(
    options?: Omit<AddEventListenerOptions, "passive">
): AddEventListenerOptions {
    const passive = supportsPassiveListeners();
    return {
        ...options,
        passive,
    };
}

// =============================================================================
// ONE-TIME LISTENER
// =============================================================================

/**
 * Adds an event listener that automatically removes itself after first trigger.
 *
 * @param target - Event target
 * @param type - Event type
 * @param handler - Event handler
 * @param options - Event options (excluding 'once')
 * @returns Cleanup function to remove listener before it triggers
 *
 * @example
 * ```ts
 * const cleanup = addOnceListener(button, 'click', (e) => {
 *   console.log('Clicked once!');
 * });
 *
 * // If needed before trigger:
 * cleanup();
 * ```
 */
export function addOnceListener(
    target: EventTarget,
    type: string,
    handler: EventListener,
    options?: Omit<AddEventListenerOptions, "once">
): () => void {
    const fullOptions: AddEventListenerOptions = { ...options, once: true };

    const wrappedHandler: EventListener = (event) => {
        target.removeEventListener(type, wrappedHandler, fullOptions);
        handler(event);
    };

    target.addEventListener(type, wrappedHandler, fullOptions);

    return () => {
        target.removeEventListener(type, wrappedHandler, fullOptions);
    };
}

// =============================================================================
// CONDITIONAL LISTENER
// =============================================================================

/**
 * Adds an event listener that only fires when a condition is met.
 *
 * @param target - Event target
 * @param type - Event type
 * @param handler - Event handler
 * @param condition - Condition function that must return true for handler to fire
 * @param options - Event options
 * @returns Cleanup function
 *
 * @example
 * ```ts
 * const cleanup = addConditionalListener(
 *   window,
 *   'keydown',
 *   (e) => handleKeyDown(e),
 *   (e) => (e as KeyboardEvent).key === 'Enter'
 * );
 * ```
 */
export function addConditionalListener(
    target: EventTarget,
    type: string,
    handler: EventListener,
    condition: (event: Event) => boolean,
    options?: AddEventListenerOptions
): () => void {
    const conditionalHandler: EventListener = (event) => {
        if (condition(event)) {
            handler(event);
        }
    };

    target.addEventListener(type, conditionalHandler, options);

    return () => {
        target.removeEventListener(type, conditionalHandler, options);
    };
}

// =============================================================================
// MEDIA QUERY LISTENER
// =============================================================================

/**
 * Adds a listener for media query changes with cleanup.
 *
 * @param query - Media query string
 * @param handler - Handler called on match changes
 * @returns Cleanup function and current match state
 *
 * @example
 * ```ts
 * const { cleanup, matches } = addMediaQueryListener(
 *   '(prefers-color-scheme: dark)',
 *   (matches) => setIsDark(matches)
 * );
 *
 * // Initial state
 * console.log('Dark mode:', matches);
 *
 * // Cleanup on unmount
 * cleanup();
 * ```
 */
export function addMediaQueryListener(
    query: string,
    handler: (matches: boolean) => void
): { cleanup: () => void; matches: boolean } {
    if (typeof window === "undefined") {
        return { cleanup: () => {}, matches: false };
    }

    const mql = window.matchMedia(query);

    const listener = (event: MediaQueryListEvent) => {
        handler(event.matches);
    };

    // Use modern addEventListener if available
    if (mql.addEventListener) {
        mql.addEventListener("change", listener);
    } else {
        // Fallback for older browsers
        mql.addListener(listener);
    }

    const cleanup = () => {
        if (mql.removeEventListener) {
            mql.removeEventListener("change", listener);
        } else {
            mql.removeListener(listener);
        }
    };

    return { cleanup, matches: mql.matches };
}
