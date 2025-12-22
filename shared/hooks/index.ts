/**
 * Shared Hooks - Public API
 *
 * Exports reusable hooks for common UI patterns.
 *
 * @module shared/hooks
 */

export { useDebounce } from "./use-debounce";

// Cleanup Management
export type {
    CleanupFn,
    UseAnimationFrameReturn,
    UseCleanupReturn,
    UseIntervalReturn,
    UseResourceReturn,
    UseTimeoutReturn,
} from "./use-cleanup";
export {
    useAbortController,
    useAnimationFrame,
    useCleanup,
    useInterval,
    useOnUnmount,
    useResource,
    useTimeout,
} from "./use-cleanup";

// Focus Management
export type { UseFocusTrapOptions, UseFocusTrapReturn } from "./use-focus-trap";
export { useFocusTrap, useFocusRestore } from "./use-focus-trap";

// Keyboard Navigation
export type {
    KeyboardShortcutOptions,
    KeyModifiers,
    ShortcutDefinition,
} from "./use-keyboard-shortcut";
export {
    getShortcutLabel,
    useKeyboardShortcut,
    useKeyboardShortcuts,
} from "./use-keyboard-shortcut";

export type { UseMobileOptions } from "./use-mobile";
export { useIsMobile } from "./use-mobile";
export type {
    NetworkStatus,
    UseNetworkStatusOptions,
    UseNetworkStatusReturn,
} from "./use-network-status";
export { useIsOnline, useNetworkStatus } from "./use-network-status";
export { useRateLimit } from "./use-rate-limit";

// Reduced Motion
export type { MotionPreference, MotionSafeOptions } from "./use-reduced-motion";
export {
    getMotionSafeCSS,
    useMotionCSSVariables,
    useMotionPreference,
    useMotionSafe,
    useMotionSafeProps,
    useMotionSafeTransition,
    useReducedMotion,
} from "./use-reduced-motion";

// Performance Monitoring
export type {
    MeasurementResult,
    PerformanceMetrics,
    UseMeasureReturn,
    UsePerformanceOptions,
    UsePerformanceReturn,
} from "./use-performance";
export {
    useMeasure,
    useMountTiming,
    usePerformance,
    useRenderFrequencyWarning,
} from "./use-performance";

export { useWindowSize } from "./use-window-size";
