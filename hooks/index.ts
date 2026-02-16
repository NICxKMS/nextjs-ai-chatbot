/**
 * Shared Hooks Module
 *
 * This module provides reusable React hooks for common UI patterns:
 * - Debouncing values and callbacks
 * - LocalStorage persistence
 * - Media queries and responsive design
 * - Mobile detection
 * - Scroll management
 * - Window size tracking
 */

// Debounce hooks
export {
	type UseDebounceOptions,
	useDebounce,
	useDebouncedCallback,
} from "./use-debounce"

// LocalStorage hook
export {
	type UseLocalStorageOptions,
	useLocalStorage,
} from "./use-local-storage"

// Media query hooks
export {
	type UseMediaQueryOptions,
	useHasHover,
	useIs2Xl,
	useIsLg,
	useIsMd,
	useIsPortrait,
	useIsSm,
	useIsXl,
	useIsXs,
	useMediaQuery,
	usePrefersDarkMode,
	usePrefersReducedMotion,
} from "./use-media-query"

// Mobile detection hooks
export {
	type UseMobileOptions,
	useDeviceType,
	useIsMobile,
} from "./use-mobile"

// Scroll management hook
export {
	type UseScrollToBottomReturn,
	useScrollToBottom,
} from "./use-scroll-to-bottom"

// Window size hooks
export {
	type UseWindowSizeReturn,
	useWindowHeight,
	useWindowSize,
	useWindowWidth,
	type WindowSize,
} from "./use-window-size"
