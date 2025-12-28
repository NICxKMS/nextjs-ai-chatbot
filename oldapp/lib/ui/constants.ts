/**
 * UI Configuration Constants
 *
 * Centralized configuration for UI behavior, animations, and thresholds.
 * These constants are safe to use in both client and server components.
 */

/**
 * Animation Durations (milliseconds)
 */
export const ANIMATION_DURATION_MS = 200;
export const ANIMATION_DURATION_SLOW_MS = 300;
export const ANIMATION_DURATION_FAST_MS = 150;

/**
 * Scroll Behavior
 */
export const SCROLL_THRESHOLD_PX = 100; // Distance from bottom to auto-scroll
export const SCROLL_TO_BOTTOM_DELAY_MS = 100;
export const SCROLL_DEBOUNCE_MS = 100;

/**
 * Debounce Timings
 */
export const DEBOUNCE_CONTENT_CHANGE_MS = 2000; // Content autosave debounce
export const DEBOUNCE_LOCALSTORAGE_MS = 500; // LocalStorage write debounce
export const DEBOUNCE_SEARCH_MS = 300; // Search input debounce
export const DEBOUNCE_RESIZE_MS = 200; // Window resize debounce

/**
 * Pagination Defaults
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const CHAT_HISTORY_PAGE_SIZE = 50;

/**
 * Input Limits
 */
export const MAX_MESSAGE_LENGTH = 100_000; // Characters
export const MAX_ATTACHMENT_SIZE_MB = 5; // Must match ATTACHMENT_MAX_FILE_SIZE in lib/files.ts
export const MAX_ATTACHMENTS_COUNT = 5;

/**
 * Sidebar Configuration
 */
export const SIDEBAR_WIDTH_COLLAPSED = 0;
export const SIDEBAR_WIDTH_EXPANDED = 260; // pixels
export const MOBILE_BREAKPOINT_PX = 768;

/**
 * Toast/Notification Durations
 */
export const TOAST_DURATION_DEFAULT_MS = 3000;
export const TOAST_DURATION_ERROR_MS = 5000;
export const TOAST_DURATION_SUCCESS_MS = 2000;

/**
 * Artifact Configuration
 */
export const ARTIFACT_PREVIEW_HEIGHT_PX = 400;
export const CODE_EDITOR_MIN_HEIGHT_PX = 300;

/**
 * Throttle Settings
 */
export const THROTTLE_SCROLL_MS = 50;
export const THROTTLE_STREAM_UPDATE_MS = 16; // ~60fps
