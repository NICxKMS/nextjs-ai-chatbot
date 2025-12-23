"use client";

/**
 * Performance Monitoring Hooks
 *
 * Provides hooks for tracking render performance, measuring operations,
 * and detecting slow components.
 *
 * @module shared/hooks/use-performance
 */

import { useCallback, useEffect, useRef, useState } from "react";

// =============================================================================
// TYPES
// =============================================================================

export interface PerformanceMetrics {
    /** Render count since mount */
    renderCount: number;
    /** Last render duration in milliseconds */
    lastRenderDuration: number;
    /** Average render duration in milliseconds */
    averageRenderDuration: number;
    /** Maximum render duration in milliseconds */
    maxRenderDuration: number;
    /** Total render time in milliseconds */
    totalRenderTime: number;
    /** Time since component mounted in milliseconds */
    mountTime: number;
    /** Whether component is considered slow (render > threshold) */
    isSlow: boolean;
}

export interface UsePerformanceOptions {
    /** Threshold in ms to consider a render "slow" (default: 16ms = 60fps) */
    slowThreshold?: number;
    /** Enable console warnings for slow renders (default: false in prod) */
    warnOnSlow?: boolean;
    /** Component name for logging (default: "Component") */
    componentName?: string;
    /** Enable performance tracking (default: true) */
    enabled?: boolean;
}

export interface UsePerformanceReturn {
    /** Current performance metrics */
    metrics: PerformanceMetrics;
    /** Manually mark start of an operation */
    markStart: (label: string) => void;
    /** Manually mark end of an operation and get duration */
    markEnd: (label: string) => number;
    /** Measure an async operation */
    measureAsync: <T>(label: string, operation: () => Promise<T>) => Promise<T>;
    /** Measure a sync operation */
    measureSync: <T>(label: string, operation: () => T) => T;
    /** Reset all metrics */
    reset: () => void;
}

export interface MeasurementResult {
    /** Label of the measurement */
    label: string;
    /** Duration in milliseconds */
    duration: number;
    /** Start timestamp */
    startTime: number;
    /** End timestamp */
    endTime: number;
}

export interface UseMeasureReturn {
    /** Start a measurement */
    start: (label?: string) => void;
    /** End a measurement and get the result */
    end: (label?: string) => MeasurementResult | null;
    /** Get all measurements */
    getMeasurements: () => MeasurementResult[];
    /** Clear all measurements */
    clear: () => void;
    /** Get last measurement duration */
    lastDuration: number | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_SLOW_THRESHOLD = 16; // 60fps = ~16.67ms per frame
const DEFAULT_COMPONENT_NAME = "Component";
const DEFAULT_LABEL = "__default__";

// =============================================================================
// INITIAL STATE
// =============================================================================

const INITIAL_METRICS: PerformanceMetrics = {
    renderCount: 0,
    lastRenderDuration: 0,
    averageRenderDuration: 0,
    maxRenderDuration: 0,
    totalRenderTime: 0,
    mountTime: 0,
    isSlow: false,
};

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook for monitoring component render performance.
 *
 * Tracks render counts, durations, and detects slow renders.
 * Automatically cleans up on unmount.
 *
 * @param options - Performance monitoring options
 * @returns Performance metrics and measurement utilities
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { metrics, measureAsync } = usePerformance({
 *     componentName: 'MyComponent',
 *     slowThreshold: 50,
 *     warnOnSlow: true,
 *   });
 *
 *   const fetchData = async () => {
 *     const data = await measureAsync('fetchData', () => api.getData());
 *     return data;
 *   };
 *
 *   if (metrics.isSlow) {
 *     console.warn(`Slow render: ${metrics.lastRenderDuration}ms`);
 *   }
 *
 *   return <div>Renders: {metrics.renderCount}</div>;
 * }
 * ```
 */
export function usePerformance(
    options: UsePerformanceOptions = {}
): UsePerformanceReturn {
    const {
        slowThreshold = DEFAULT_SLOW_THRESHOLD,
        warnOnSlow = process.env.NODE_ENV !== "production",
        componentName = DEFAULT_COMPONENT_NAME,
        enabled = true,
    } = options;

    const [metrics, setMetrics] = useState<PerformanceMetrics>(INITIAL_METRICS);
    const mountTimeRef = useRef<number>(0);
    const renderStartRef = useRef<number>(0);
    const marksRef = useRef<Map<string, number>>(new Map());

    // Track mount time
    useEffect(() => {
        if (!enabled) {
            return;
        }

        mountTimeRef.current = performance.now();

        return () => {
            marksRef.current.clear();
        };
    }, [enabled]);

    // Track each render
    useEffect(() => {
        if (!enabled) {
            return;
        }

        const renderEnd = performance.now();
        const renderDuration =
            renderStartRef.current > 0 ? renderEnd - renderStartRef.current : 0;

        setMetrics((prev) => {
            const newRenderCount = prev.renderCount + 1;
            const newTotalTime = prev.totalRenderTime + renderDuration;
            const newMaxDuration = Math.max(
                prev.maxRenderDuration,
                renderDuration
            );
            const newAverage = newTotalTime / newRenderCount;
            const isSlow = renderDuration > slowThreshold;

            if (isSlow && warnOnSlow && renderDuration > 0) {
                console.warn(
                    `[Performance] ${componentName} slow render: ${renderDuration.toFixed(2)}ms (threshold: ${slowThreshold}ms)`
                );
            }

            return {
                renderCount: newRenderCount,
                lastRenderDuration: renderDuration,
                averageRenderDuration: newAverage,
                maxRenderDuration: newMaxDuration,
                totalRenderTime: newTotalTime,
                mountTime:
                    mountTimeRef.current > 0
                        ? renderEnd - mountTimeRef.current
                        : 0,
                isSlow,
            };
        });
    });

    // Mark start of render for next cycle
    renderStartRef.current = performance.now();

    const markStart = useCallback(
        (label: string): void => {
            if (!enabled) {
                return;
            }
            marksRef.current.set(label, performance.now());
        },
        [enabled]
    );

    const markEnd = useCallback(
        (label: string): number => {
            if (!enabled) {
                return 0;
            }

            const startTime = marksRef.current.get(label);
            if (startTime === undefined) {
                console.warn(
                    `[Performance] No start mark found for "${label}"`
                );
                return 0;
            }

            const duration = performance.now() - startTime;
            marksRef.current.delete(label);
            return duration;
        },
        [enabled]
    );

    const measureAsync = useCallback(
        async <T>(label: string, operation: () => Promise<T>): Promise<T> => {
            if (!enabled) {
                return operation();
            }

            markStart(label);
            try {
                const result = await operation();
                const duration = markEnd(label);
                if (process.env.NODE_ENV !== "production") {
                    console.debug(
                        `[Performance] ${componentName}.${label}: ${duration.toFixed(2)}ms`
                    );
                }
                return result;
            } catch (error) {
                markEnd(label);
                throw error;
            }
        },
        [enabled, markStart, markEnd, componentName]
    );

    const measureSync = useCallback(
        <T>(label: string, operation: () => T): T => {
            if (!enabled) {
                return operation();
            }

            markStart(label);
            try {
                const result = operation();
                const duration = markEnd(label);
                if (process.env.NODE_ENV !== "production") {
                    console.debug(
                        `[Performance] ${componentName}.${label}: ${duration.toFixed(2)}ms`
                    );
                }
                return result;
            } catch (error) {
                markEnd(label);
                throw error;
            }
        },
        [enabled, markStart, markEnd, componentName]
    );

    const reset = useCallback((): void => {
        setMetrics(INITIAL_METRICS);
        mountTimeRef.current = performance.now();
        marksRef.current.clear();
    }, []);

    return {
        metrics,
        markStart,
        markEnd,
        measureAsync,
        measureSync,
        reset,
    };
}

/**
 * Hook for measuring operation durations.
 *
 * Simpler alternative to usePerformance for one-off measurements.
 *
 * @returns Measurement utilities
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { start, end, lastDuration } = useMeasure();
 *
 *   const handleClick = async () => {
 *     start('operation');
 *     await someAsyncOperation();
 *     const result = end('operation');
 *     console.log(`Operation took ${result?.duration}ms`);
 *   };
 *
 *   return <button onClick={handleClick}>Run</button>;
 * }
 * ```
 */
export function useMeasure(): UseMeasureReturn {
    const startsRef = useRef<Map<string, number>>(new Map());
    const measurementsRef = useRef<MeasurementResult[]>([]);
    const [lastDuration, setLastDuration] = useState<number | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            startsRef.current.clear();
            measurementsRef.current = [];
        };
    }, []);

    const start = useCallback((label: string = DEFAULT_LABEL): void => {
        startsRef.current.set(label, performance.now());
    }, []);

    const end = useCallback(
        (label: string = DEFAULT_LABEL): MeasurementResult | null => {
            const startTime = startsRef.current.get(label);
            if (startTime === undefined) {
                return null;
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            const result: MeasurementResult = {
                label,
                duration,
                startTime,
                endTime,
            };

            measurementsRef.current.push(result);
            startsRef.current.delete(label);
            setLastDuration(duration);

            return result;
        },
        []
    );

    const getMeasurements = useCallback((): MeasurementResult[] => {
        return [...measurementsRef.current];
    }, []);

    const clear = useCallback((): void => {
        startsRef.current.clear();
        measurementsRef.current = [];
        setLastDuration(null);
    }, []);

    return {
        start,
        end,
        getMeasurements,
        clear,
        lastDuration,
    };
}

/**
 * Hook for tracking component mount/unmount timing.
 *
 * @param componentName - Name for logging
 * @returns Mount duration in milliseconds (null before unmount)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useMountTiming('MyComponent');
 *   return <div>Content</div>;
 * }
 * // Logs mount and unmount timing to console in development
 * ```
 */
export function useMountTiming(
    componentName: string = DEFAULT_COMPONENT_NAME
): void {
    const mountTimeRef = useRef<number>(0);

    useEffect(() => {
        mountTimeRef.current = performance.now();

        if (process.env.NODE_ENV !== "production") {
            console.debug(`[Mount] ${componentName} mounted`);
        }

        return () => {
            const duration = performance.now() - mountTimeRef.current;
            if (process.env.NODE_ENV !== "production") {
                console.debug(
                    `[Unmount] ${componentName} unmounted after ${duration.toFixed(2)}ms`
                );
            }
        };
    }, [componentName]);
}

/**
 * Hook for detecting render frequency issues.
 *
 * Warns when a component re-renders too frequently in a short time window.
 *
 * @param componentName - Name for logging
 * @param options - Detection options
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useRenderFrequencyWarning('MyComponent', {
 *     maxRendersPerSecond: 30,
 *   });
 *   return <div>Content</div>;
 * }
 * ```
 */
export function useRenderFrequencyWarning(
    componentName: string = DEFAULT_COMPONENT_NAME,
    options: {
        /** Max renders per second before warning (default: 60) */
        maxRendersPerSecond?: number;
        /** Enable in production (default: false) */
        enableInProd?: boolean;
    } = {}
): void {
    const { maxRendersPerSecond = 60, enableInProd = false } = options;

    const renderTimesRef = useRef<number[]>([]);
    const windowMs = 1000;

    useEffect(() => {
        if (process.env.NODE_ENV === "production" && !enableInProd) {
            return;
        }

        const now = performance.now();
        const windowStart = now - windowMs;

        // Filter out old render times
        renderTimesRef.current = renderTimesRef.current.filter(
            (time) => time > windowStart
        );
        renderTimesRef.current.push(now);

        const rendersInWindow = renderTimesRef.current.length;

        if (rendersInWindow > maxRendersPerSecond) {
            console.warn(
                `[Performance] ${componentName} rendered ${rendersInWindow} times in the last second (threshold: ${maxRendersPerSecond})`
            );
        }
    });

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            renderTimesRef.current = [];
        };
    }, []);
}
