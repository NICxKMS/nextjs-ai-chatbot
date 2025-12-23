/**
 * Debug Utilities
 * Development debugging helpers
 *
 * @module lib/utils/debug
 */

// Only enable debug utilities in development
const IS_DEV = process.env.NODE_ENV === "development";
const IS_BROWSER = typeof window !== "undefined";

export interface PerformanceMark {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
}

export interface DebugState {
    enabled: boolean;
    marks: Map<string, PerformanceMark>;
    logs: Array<{ timestamp: number; type: string; data: unknown }>;
}

// Internal debug state
const state: DebugState = {
    enabled: IS_DEV,
    marks: new Map(),
    logs: [],
};

// Max logs to retain
const MAX_LOGS = 1000;

/**
 * Debug utilities for development
 *
 * @example
 * ```typescript
 * import { debug } from "@/lib/utils/debug";
 *
 * // Performance timing
 * debug.time("fetchData");
 * await fetchData();
 * debug.timeEnd("fetchData"); // Logs: fetchData: 123.45ms
 *
 * // Conditional logging
 * debug.log("User data", { id: 123 });
 *
 * // Inspect object
 * debug.inspect(complexObject, "API Response");
 *
 * // Assert conditions
 * debug.assert(user.id, "User ID is required");
 *
 * // Group logs
 * debug.group("Processing items");
 * items.forEach(item => debug.log(item));
 * debug.groupEnd();
 * ```
 */
export const debug = {
    /**
     * Check if debug mode is enabled
     */
    get isEnabled(): boolean {
        return state.enabled;
    },

    /**
     * Enable debug mode
     */
    enable(): void {
        state.enabled = true;
    },

    /**
     * Disable debug mode
     */
    disable(): void {
        state.enabled = false;
    },

    /**
     * Log a debug message (only in development)
     */
    log(...args: unknown[]): void {
        if (!state.enabled) {
            return;
        }
        console.log("[DEBUG]", ...args);
        this.addLog("log", args);
    },

    /**
     * Log a warning (only in development)
     */
    warn(...args: unknown[]): void {
        if (!state.enabled) {
            return;
        }
        console.warn("[DEBUG WARN]", ...args);
        this.addLog("warn", args);
    },

    /**
     * Log an error (only in development)
     */
    error(...args: unknown[]): void {
        if (!state.enabled) {
            return;
        }
        console.error("[DEBUG ERROR]", ...args);
        this.addLog("error", args);
    },

    /**
     * Start a performance timer
     */
    time(label: string): void {
        if (!state.enabled) {
            return;
        }

        state.marks.set(label, {
            name: label,
            startTime: performance.now(),
        });

        if (IS_BROWSER && performance.mark) {
            performance.mark(`${label}-start`);
        }
    },

    /**
     * End a performance timer and log the duration
     */
    timeEnd(label: string): number | undefined {
        if (!state.enabled) {
            return;
        }

        const mark = state.marks.get(label);
        if (!mark) {
            console.warn(`[DEBUG] Timer "${label}" does not exist`);
            return;
        }

        const endTime = performance.now();
        const duration = endTime - mark.startTime;

        mark.endTime = endTime;
        mark.duration = duration;

        console.log(`[DEBUG] ${label}: ${duration.toFixed(2)}ms`);

        if (IS_BROWSER && performance.mark && performance.measure) {
            performance.mark(`${label}-end`);
            performance.measure(label, `${label}-start`, `${label}-end`);
        }

        return duration;
    },

    /**
     * Get all performance marks
     */
    getMarks(): PerformanceMark[] {
        return Array.from(state.marks.values());
    },

    /**
     * Clear performance marks
     */
    clearMarks(): void {
        state.marks.clear();
        if (IS_BROWSER && performance.clearMarks) {
            performance.clearMarks();
        }
    },

    /**
     * Inspect an object with pretty formatting
     */
    inspect(obj: unknown, label?: string): void {
        if (!state.enabled) {
            return;
        }

        if (label) {
            console.log(`[DEBUG] ${label}:`);
        }
        console.dir(obj, { depth: null, colors: true });
        this.addLog("inspect", { label, obj });
    },

    /**
     * Assert a condition (throws in development if false)
     */
    assert(condition: unknown, message: string): asserts condition {
        if (!state.enabled) {
            return;
        }

        if (!condition) {
            const error = new Error(`[DEBUG ASSERT] ${message}`);
            console.error(error);
            this.addLog("assert", { message, condition });
            throw error;
        }
    },

    /**
     * Create a console group
     */
    group(label: string): void {
        if (!state.enabled) {
            return;
        }
        console.group(`[DEBUG] ${label}`);
    },

    /**
     * Create a collapsed console group
     */
    groupCollapsed(label: string): void {
        if (!state.enabled) {
            return;
        }
        console.groupCollapsed(`[DEBUG] ${label}`);
    },

    /**
     * End a console group
     */
    groupEnd(): void {
        if (!state.enabled) {
            return;
        }
        console.groupEnd();
    },

    /**
     * Log a table
     */
    table(data: unknown[], columns?: string[]): void {
        if (!state.enabled) {
            return;
        }
        console.table(data, columns);
        this.addLog("table", { data, columns });
    },

    /**
     * Trace execution
     */
    trace(label?: string): void {
        if (!state.enabled) {
            return;
        }
        if (label) {
            console.log(`[DEBUG TRACE] ${label}`);
        }
        console.trace();
    },

    /**
     * Count occurrences
     */
    count(label: string): void {
        if (!state.enabled) {
            return;
        }
        console.count(`[DEBUG] ${label}`);
    },

    /**
     * Reset count
     */
    countReset(label: string): void {
        if (!state.enabled) {
            return;
        }
        console.countReset(`[DEBUG] ${label}`);
    },

    /**
     * Add entry to internal log buffer
     */
    addLog(type: string, data: unknown): void {
        state.logs.push({
            timestamp: Date.now(),
            type,
            data,
        });

        // Trim logs if exceeding max
        if (state.logs.length > MAX_LOGS) {
            state.logs = state.logs.slice(-MAX_LOGS);
        }
    },

    /**
     * Get all buffered logs
     */
    getLogs(): typeof state.logs {
        return [...state.logs];
    },

    /**
     * Clear all buffered logs
     */
    clearLogs(): void {
        state.logs = [];
    },

    /**
     * Export debug state for diagnostics
     */
    exportState(): DebugState {
        return {
            enabled: state.enabled,
            marks: new Map(state.marks),
            logs: [...state.logs],
        };
    },

    /**
     * Create a debug namespace
     */
    namespace(name: string): {
        log: (...args: unknown[]) => void;
        warn: (...args: unknown[]) => void;
        error: (...args: unknown[]) => void;
        time: (label: string) => void;
        timeEnd: (label: string) => number | undefined;
    } {
        const prefix = `[${name}]`;
        return {
            log: (...args: unknown[]) => {
                if (!state.enabled) {
                    return;
                }
                console.log(prefix, ...args);
            },
            warn: (...args: unknown[]) => {
                if (!state.enabled) {
                    return;
                }
                console.warn(prefix, ...args);
            },
            error: (...args: unknown[]) => {
                if (!state.enabled) {
                    return;
                }
                console.error(prefix, ...args);
            },
            time: (label: string) => this.time(`${name}:${label}`),
            timeEnd: (label: string) => this.timeEnd(`${name}:${label}`),
        };
    },

    /**
     * Measure async function execution time
     */
    async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
        this.time(label);
        try {
            return await fn();
        } finally {
            this.timeEnd(label);
        }
    },

    /**
     * Measure sync function execution time
     */
    measureSync<T>(label: string, fn: () => T): T {
        this.time(label);
        try {
            return fn();
        } finally {
            this.timeEnd(label);
        }
    },

    /**
     * Conditional execution only in debug mode
     */
    run(fn: () => void): void {
        if (!state.enabled) {
            return;
        }
        fn();
    },

    /**
     * Breakpoint helper (only works when DevTools is open)
     */
    breakpoint(): void {
        if (!state.enabled) {
            return;
        }
    },
};

// Environment info helper
export function getEnvironmentInfo(): Record<string, unknown> {
    const info: Record<string, unknown> = {
        nodeEnv: process.env.NODE_ENV,
        isServer: typeof window === "undefined",
        isBrowser: typeof window !== "undefined",
    };

    if (IS_BROWSER) {
        info.userAgent = navigator.userAgent;
        info.language = navigator.language;
        info.platform = navigator.platform;
        info.cookiesEnabled = navigator.cookieEnabled;
        info.onLine = navigator.onLine;
        info.screenSize = {
            width: window.screen.width,
            height: window.screen.height,
        };
        info.viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    }

    return info;
}

// Memory usage helper (Node.js only)
export function getMemoryUsage(): Record<string, string> | null {
    if (IS_BROWSER) {
        return null;
    }

    try {
        const usage = process.memoryUsage();
        const formatBytes = (bytes: number): string => {
            const mb = bytes / 1024 / 1024;
            return `${mb.toFixed(2)} MB`;
        };

        return {
            heapUsed: formatBytes(usage.heapUsed),
            heapTotal: formatBytes(usage.heapTotal),
            external: formatBytes(usage.external),
            rss: formatBytes(usage.rss),
        };
    } catch {
        return null;
    }
}

// Expose debug to window in development for console access
if (IS_DEV && IS_BROWSER) {
    (window as unknown as { __debug: typeof debug }).__debug = debug;
}

export default debug;
