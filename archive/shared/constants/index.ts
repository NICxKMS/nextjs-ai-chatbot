/**
 * Shared Constants
 *
 * Centralized constants for responsive breakpoints, throttle values,
 * and other commonly used magic numbers.
 *
 * @module shared/constants
 */

// =============================================================================
// P3-021: RESPONSIVE BREAKPOINTS
// =============================================================================
// Following Tailwind CSS default breakpoints
// https://tailwindcss.com/docs/responsive-design

export const BREAKPOINTS = {
    /** Small devices (portrait phones, 640px and up) */
    SM: 640,
    /** Medium devices (tablets, 768px and up) */
    MD: 768,
    /** Large devices (desktops, 1024px and up) */
    LG: 1024,
    /** Extra large devices (large desktops, 1280px and up) */
    XL: 1280,
    /** 2XL devices (larger desktops, 1536px and up) */
    "2XL": 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// =============================================================================
// P3-022: THROTTLE/DEBOUNCE VALUES
// =============================================================================

export const TIMING = {
    /** Default debounce delay for input fields (ms) */
    DEBOUNCE_INPUT: 300,
    /** Debounce delay for search operations (ms) */
    DEBOUNCE_SEARCH: 500,
    /** Throttle delay for scroll events (ms) */
    THROTTLE_SCROLL: 100,
    /** Throttle delay for resize events (ms) */
    THROTTLE_RESIZE: 200,
    /** Throttle delay for expensive operations (ms) */
    THROTTLE_HEAVY: 500,
    /** Animation frame throttle (~16ms for 60fps) */
    THROTTLE_RAF: 16,
} as const;

export type TimingKey = keyof typeof TIMING;
