/**
 * Design Tokens
 *
 * Centralized design system constants for consistent styling across the application.
 * These values correspond to CSS custom properties defined in globals.css.
 *
 * @module lib/utils/design-tokens
 */

/**
 * Animation duration constants in milliseconds
 * Use these for consistent animation timing across the app
 */
export const DURATION = {
    /** Ultra-fast transitions (50ms) - micro-interactions */
    instant: 50,
    /** Fast transitions (150ms) - buttons, toggles */
    fast: 150,
    /** Normal transitions (200ms) - general UI */
    normal: 200,
    /** Medium transitions (300ms) - modals, panels */
    medium: 300,
    /** Slow transitions (500ms) - page transitions */
    slow: 500,
    /** Very slow transitions (700ms) - complex animations */
    slower: 700,
} as const;

/**
 * CSS duration values (for inline styles)
 */
export const DURATION_CSS = {
    instant: "50ms",
    fast: "150ms",
    normal: "200ms",
    medium: "300ms",
    slow: "500ms",
    slower: "700ms",
} as const;

/**
 * Easing function constants
 * Based on common cubic-bezier curves for natural motion
 */
export const EASING = {
    /** Linear - constant speed */
    linear: "linear",
    /** Ease - default browser easing */
    ease: "ease",
    /** Ease-in - slow start */
    easeIn: "ease-in",
    /** Ease-out - slow end (recommended for entrances) */
    easeOut: "ease-out",
    /** Ease-in-out - slow start and end */
    easeInOut: "ease-in-out",
    /** Smooth - custom smooth curve */
    smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
    /** Snappy - quick with slight overshoot feel */
    snappy: "cubic-bezier(0.2, 0, 0, 1)",
    /** Bounce - playful bounce effect */
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    /** Decelerate - strong deceleration */
    decelerate: "cubic-bezier(0, 0, 0.2, 1)",
    /** Accelerate - strong acceleration */
    accelerate: "cubic-bezier(0.4, 0, 1, 1)",
} as const;

/**
 * Spacing scale in pixels
 * Based on 4px base unit for consistent spacing
 */
export const SPACING = {
    /** 0px */
    0: 0,
    /** 1px */
    px: 1,
    /** 2px */
    0.5: 2,
    /** 4px */
    1: 4,
    /** 6px */
    1.5: 6,
    /** 8px */
    2: 8,
    /** 10px */
    2.5: 10,
    /** 12px */
    3: 12,
    /** 14px */
    3.5: 14,
    /** 16px */
    4: 16,
    /** 20px */
    5: 20,
    /** 24px */
    6: 24,
    /** 28px */
    7: 28,
    /** 32px */
    8: 32,
    /** 36px */
    9: 36,
    /** 40px */
    10: 40,
    /** 44px */
    11: 44,
    /** 48px */
    12: 48,
    /** 56px */
    14: 56,
    /** 64px */
    16: 64,
    /** 80px */
    20: 80,
    /** 96px */
    24: 96,
    /** 112px */
    28: 112,
    /** 128px */
    32: 128,
    /** 144px */
    36: 144,
    /** 160px */
    40: 160,
    /** 176px */
    44: 176,
    /** 192px */
    48: 192,
    /** 208px */
    52: 208,
    /** 224px */
    56: 224,
    /** 240px */
    60: 240,
    /** 256px */
    64: 256,
    /** 288px */
    72: 288,
    /** 320px */
    80: 320,
    /** 384px */
    96: 384,
} as const;

/**
 * Z-index scale for layering
 * Use these to maintain consistent stacking context
 */
export const Z_INDEX = {
    /** Behind everything (-1) */
    behind: -1,
    /** Base layer (0) */
    base: 0,
    /** Raised elements (10) - cards, raised surfaces */
    raised: 10,
    /** Dropdown menus (20) */
    dropdown: 20,
    /** Sticky elements (30) - sticky headers */
    sticky: 30,
    /** Fixed elements (40) - fixed headers, FABs */
    fixed: 40,
    /** Drawer/Sidebar overlays (50) */
    drawer: 50,
    /** Modal backdrop (60) */
    modalBackdrop: 60,
    /** Modal content (70) */
    modal: 70,
    /** Popover elements (80) */
    popover: 80,
    /** Tooltip (90) */
    tooltip: 90,
    /** Toast notifications (100) */
    toast: 100,
    /** Maximum z-index (9999) - use sparingly */
    max: 9999,
} as const;

/**
 * Breakpoint values in pixels
 * Matches Tailwind CSS default breakpoints
 */
export const BREAKPOINTS = {
    /** Small devices (640px) */
    sm: 640,
    /** Medium devices (768px) */
    md: 768,
    /** Large devices (1024px) */
    lg: 1024,
    /** Extra large devices (1280px) */
    xl: 1280,
    /** 2XL devices (1536px) */
    "2xl": 1536,
} as const;

/**
 * Media query strings for use in JavaScript
 */
export const MEDIA_QUERIES = {
    sm: `(min-width: ${BREAKPOINTS.sm}px)`,
    md: `(min-width: ${BREAKPOINTS.md}px)`,
    lg: `(min-width: ${BREAKPOINTS.lg}px)`,
    xl: `(min-width: ${BREAKPOINTS.xl}px)`,
    "2xl": `(min-width: ${BREAKPOINTS["2xl"]}px)`,
    /** Prefers reduced motion */
    reducedMotion: "(prefers-reduced-motion: reduce)",
    /** Prefers dark color scheme */
    dark: "(prefers-color-scheme: dark)",
    /** Prefers light color scheme */
    light: "(prefers-color-scheme: light)",
    /** Touch device (coarse pointer) */
    touch: "(pointer: coarse)",
    /** Mouse device (fine pointer) */
    mouse: "(pointer: fine)",
} as const;

/**
 * Border radius values in pixels
 * Corresponds to Tailwind's rounded-* classes
 */
export const BORDER_RADIUS = {
    none: 0,
    sm: 2,
    default: 4,
    md: 6,
    lg: 8,
    xl: 12,
    "2xl": 16,
    "3xl": 24,
    full: 9999,
} as const;

/**
 * Type exports for design tokens
 */
export type Duration = keyof typeof DURATION;
export type Easing = keyof typeof EASING;
export type Spacing = keyof typeof SPACING;
export type ZIndex = keyof typeof Z_INDEX;
export type Breakpoint = keyof typeof BREAKPOINTS;
export type BorderRadius = keyof typeof BORDER_RADIUS;

/**
 * Helper to get CSS variable reference
 * @param name - CSS variable name without -- prefix
 * @returns CSS var() reference
 */
export function cssVar(name: string): string {
    return `var(--${name})`;
}

/**
 * Helper to check if user prefers reduced motion
 * @returns true if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MEDIA_QUERIES.reducedMotion).matches;
}

/**
 * Get animation duration respecting reduced motion preference
 * @param duration - Duration key or milliseconds
 * @returns Duration in milliseconds (0 if reduced motion preferred)
 */
export function getAnimationDuration(
    duration: Duration | number
): number {
    if (prefersReducedMotion()) return 0;
    return typeof duration === "number" ? duration : DURATION[duration];
}

/**
 * Check if viewport matches a breakpoint
 * @param breakpoint - Breakpoint key
 * @returns true if viewport is at or above breakpoint
 */
export function matchesBreakpoint(breakpoint: Breakpoint): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MEDIA_QUERIES[breakpoint]).matches;
}
