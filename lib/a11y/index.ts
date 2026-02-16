/**
 * Accessibility (a11y) Utilities
 *
 * WCAG 2.1 AA compliant accessibility utilities for:
 * - Focus management
 * - Screen reader announcements
 * - Keyboard navigation
 *
 * @module lib/a11y
 */

// Screen Reader Announcements
export {
	ANNOUNCEMENTS,
	type AnnounceOptions,
	Announcer,
	type AnnouncerContextValue,
	type AnnouncerProps,
	AnnouncerProvider,
	type AnnouncerProviderProps,
	type AriaLive,
	announceOnce,
	createLiveRegion,
	useAnnouncer,
} from "./announcer"
// Focus Management
export {
	FOCUSABLE_SELECTOR,
	type FocusTrapOptions,
	focusFirst,
	focusLast,
	getFocusableElements,
	isFocusable,
	type RovingTabindexOptions,
	useFocusRestore,
	useFocusTrap,
	useFocusVisible,
	useRovingTabindex,
} from "./focus-management"

// Keyboard Navigation
export {
	ACTIVATION_KEYS,
	type ArrowNavigationOptions,
	getNavigationDirection,
	isActivationKey,
	isNavigationKey,
	KEYS,
	type KeyboardHandler,
	type KeyboardShortcut,
	type KeyType,
	NAVIGATION_KEYS,
	type NavigationDirection,
	preventNavigationScroll,
	type ReactKeyboardHandler,
	type TypeAheadOptions,
	useActivation,
	useArrowNavigation,
	useEscapeKey,
	useKeyboardShortcuts,
	useTypeAhead,
} from "./keyboard-navigation"
