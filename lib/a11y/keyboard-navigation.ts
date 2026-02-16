/**
 * Keyboard Navigation Utilities
 *
 * WCAG 2.1 AA compliant keyboard navigation helpers for:
 * - Arrow key navigation
 * - Enter/Space activation
 * - Escape key handling
 * - Type-ahead navigation
 *
 * @module lib/a11y/keyboard-navigation
 */

"use client"

import { useCallback, useEffect, useRef } from "react"

// ============================================================================
// Types
// ============================================================================

/**
 * Keyboard event handler function type
 */
export type KeyboardHandler = (event: KeyboardEvent) => void

/**
 * React keyboard event handler function type
 */
export type ReactKeyboardHandler = (event: React.KeyboardEvent) => void

/**
 * Navigation direction
 */
export type NavigationDirection =
	| "up"
	| "down"
	| "left"
	| "right"
	| "home"
	| "end"

/**
 * Options for arrow key navigation
 */
export interface ArrowNavigationOptions {
	/** Orientation of the navigation */
	orientation?: "horizontal" | "vertical" | "both"
	/** Whether to wrap around at boundaries */
	wrap?: boolean
	/** Whether navigation is enabled */
	enabled?: boolean
	/** Callback when navigation occurs */
	onNavigate?: (direction: NavigationDirection, index: number) => void
}

/**
 * Options for type-ahead navigation
 */
export interface TypeAheadOptions {
	/** Timeout in milliseconds before clearing the buffer */
	timeout?: number
	/** Whether type-ahead is enabled */
	enabled?: boolean
	/** Callback when a match is found */
	onMatch?: (element: HTMLElement, index: number) => void
}

/**
 * Key codes for keyboard navigation
 */
export const KEYS = {
	ENTER: "Enter",
	SPACE: " ",
	ESCAPE: "Escape",
	TAB: "Tab",
	ARROW_UP: "ArrowUp",
	ARROW_DOWN: "ArrowDown",
	ARROW_LEFT: "ArrowLeft",
	ARROW_RIGHT: "ArrowRight",
	HOME: "Home",
	END: "End",
	PAGE_UP: "PageUp",
	PAGE_DOWN: "PageDown",
} as const

/**
 * Key type
 */
export type KeyType = (typeof KEYS)[keyof typeof KEYS]

/**
 * Set of keys that trigger activation
 */
export const ACTIVATION_KEYS: ReadonlySet<string> = new Set([
	KEYS.ENTER,
	KEYS.SPACE,
])

/**
 * Set of navigation keys
 */
export const NAVIGATION_KEYS: ReadonlySet<string> = new Set([
	KEYS.ARROW_UP,
	KEYS.ARROW_DOWN,
	KEYS.ARROW_LEFT,
	KEYS.ARROW_RIGHT,
	KEYS.HOME,
	KEYS.END,
])

// ============================================================================
// Arrow Key Navigation Hook
// ============================================================================

/**
 * Hook to handle arrow key navigation within a container.
 *
 * @param options - Navigation options
 * @returns Object with ref and event handlers
 *
 * @example
 * ```tsx
 * function Menu() {
 *   const { containerRef, handleKeyDown, currentIndex } useArrowNavigation({ orientation: 'vertical' })
 *   return (
 *     <ul ref={containerRef} onKeyDown={handleKeyDown} role="menu">
 *       {items.map((item, i) => (
 *         <li key={item.id} role="menuitem" tabIndex={i === currentIndex ? 0 : -1}>
 *           {item.label}
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useArrowNavigation<T extends HTMLElement = HTMLDivElement>(
	options: ArrowNavigationOptions = {},
): {
	containerRef: React.RefObject<T | null>
	currentIndex: number
	setCurrentIndex: (index: number) => void
	handleKeyDown: (event: React.KeyboardEvent) => void
	focusElement: (index: number) => void
} {
	const {
		orientation = "vertical",
		wrap = true,
		enabled = true,
		onNavigate,
	} = options

	const containerRef = useRef<T>(null)
	const currentIndexRef = useRef(0)

	const getNavigableElements = useCallback((): HTMLElement[] => {
		if (!containerRef.current) return []
		const elements = containerRef.current.querySelectorAll<HTMLElement>(
			'[role="menuitem"], [role="option"], [role="tab"], [role="listitem"], [role="gridcell"], [role="treeitem"], [tabindex]:not([tabindex="-1"])',
		)
		return Array.from(elements).filter(
			(el) => !el.hasAttribute("hidden") && el.offsetParent !== null,
		)
	}, [])

	const focusElement = useCallback(
		(index: number) => {
			const elements = getNavigableElements()
			if (elements.length === 0) return

			let targetIndex = index
			if (wrap) {
				targetIndex =
					((index % elements.length) + elements.length) %
					elements.length
			} else {
				targetIndex = Math.max(0, Math.min(index, elements.length - 1))
			}

			// Update tabindex
			elements.forEach((el, i) => {
				el.setAttribute("tabindex", i === targetIndex ? "0" : "-1")
			})

			elements[targetIndex]?.focus()
			currentIndexRef.current = targetIndex
		},
		[getNavigableElements, wrap],
	)

	const setCurrentIndex = useCallback((index: number) => {
		currentIndexRef.current = index
	}, [])

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (!enabled) return

			const elements = getNavigableElements()
			if (elements.length === 0) return

			const currentIndex = currentIndexRef.current
			let newIndex = currentIndex
			let direction: NavigationDirection | null = null

			switch (event.key) {
				case KEYS.ARROW_DOWN:
					if (orientation === "horizontal") return
					event.preventDefault()
					newIndex = currentIndex + 1
					direction = "down"
					break
				case KEYS.ARROW_UP:
					if (orientation === "horizontal") return
					event.preventDefault()
					newIndex = currentIndex - 1
					direction = "up"
					break
				case KEYS.ARROW_RIGHT:
					if (orientation === "vertical") return
					event.preventDefault()
					newIndex = currentIndex + 1
					direction = "right"
					break
				case KEYS.ARROW_LEFT:
					if (orientation === "vertical") return
					event.preventDefault()
					newIndex = currentIndex - 1
					direction = "left"
					break
				case KEYS.HOME:
					event.preventDefault()
					newIndex = 0
					direction = "home"
					break
				case KEYS.END:
					event.preventDefault()
					newIndex = elements.length - 1
					direction = "end"
					break
				default:
					return
			}

			focusElement(newIndex)
			if (direction) {
				onNavigate?.(direction, newIndex)
			}
		},
		[enabled, getNavigableElements, orientation, focusElement, onNavigate],
	)

	return {
		containerRef,
		currentIndex: currentIndexRef.current,
		setCurrentIndex,
		handleKeyDown,
		focusElement,
	}
}

// ============================================================================
// Escape Key Handler Hook
// ============================================================================

/**
 * Hook to handle Escape key press.
 * Useful for closing modals, dropdowns, etc.
 *
 * @param onEscape - Callback when Escape is pressed
 * @param enabled - Whether the handler is active
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose }) {
 *   useEscapeKey(onClose, isOpen)
 *   return isOpen ? <div>...</div> : null
 * }
 * ```
 */
export function useEscapeKey(onEscape: () => void, enabled = true): void {
	useEffect(() => {
		if (!enabled) return

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === KEYS.ESCAPE) {
				event.preventDefault()
				onEscape()
			}
		}

		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [onEscape, enabled])
}

// ============================================================================
// Type-Ahead Navigation Hook
// ============================================================================

/**
 * Hook to handle type-ahead navigation (typing to focus matching items).
 *
 * @param options - Type-ahead options
 * @returns Object with ref and current buffer
 *
 * @example
 * ```tsx
 * function ListBox() {
 *   const { containerRef, buffer } = useTypeAhead({
 *     onMatch: (element) => element.focus()
 *   })
 *   return <ul ref={containerRef} role="listbox">...</ul>
 * }
 * ```
 */
export function useTypeAhead<T extends HTMLElement = HTMLDivElement>(
	options: TypeAheadOptions = {},
): {
	containerRef: React.RefObject<T | null>
	buffer: string
	clearBuffer: () => void
} {
	const { timeout = 500, enabled = true, onMatch } = options

	const containerRef = useRef<T>(null)
	const bufferRef = useRef("")
	const timeoutRef = useRef<NodeJS.Timeout | null>(null)

	const clearBuffer = useCallback(() => {
		bufferRef.current = ""
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null
		}
	}, [])

	const getMatchableElements = useCallback((): HTMLElement[] => {
		if (!containerRef.current) return []
		const elements = containerRef.current.querySelectorAll<HTMLElement>(
			'[role="option"], [role="menuitem"], [role="tab"], [role="treeitem"], [role="listitem"]',
		)
		return Array.from(elements).filter(
			(el) => !el.hasAttribute("hidden") && el.offsetParent !== null,
		)
	}, [])

	useEffect(() => {
		if (!enabled) return

		const handleKeyDown = (event: KeyboardEvent) => {
			// Ignore if modifier keys are pressed
			if (event.ctrlKey || event.metaKey || event.altKey) return

			// Only handle printable characters
			if (event.key.length !== 1) return

			// Clear existing timeout
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}

			// Add character to buffer
			bufferRef.current += event.key.toLowerCase()

			// Find matching element
			const elements = getMatchableElements()
			for (let i = 0; i < elements.length; i++) {
				const element = elements[i]
				if (!element) continue
				const text = element.textContent?.trim().toLowerCase() ?? ""
				if (text.startsWith(bufferRef.current)) {
					onMatch?.(element, i)
					break
				}
			}

			// Set timeout to clear buffer
			timeoutRef.current = setTimeout(clearBuffer, timeout)
		}

		const container = containerRef.current
		container?.addEventListener("keydown", handleKeyDown)
		return () => container?.removeEventListener("keydown", handleKeyDown)
	}, [enabled, timeout, clearBuffer, getMatchableElements, onMatch])

	return {
		containerRef,
		buffer: bufferRef.current,
		clearBuffer,
	}
}

// ============================================================================
// Activation Handler Hook
// ============================================================================

/**
 * Hook to handle Enter/Space activation.
 *
 * @param onActivate - Callback when activation occurs
 * @param enabled - Whether the handler is active
 *
 * @example
 * ```tsx
 * function MenuItem({ onSelect }) {
 *   useActivation(onSelect)
 *   return <li role="menuitem" tabIndex={0}>...</li>
 * }
 * ```
 */
export function useActivation(
	onActivate: () => void,
	enabled = true,
): {
	handleKeyDown: ReactKeyboardHandler
} {
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (!enabled) return

			if (ACTIVATION_KEYS.has(event.key)) {
				event.preventDefault()
				onActivate()
			}
		},
		[enabled, onActivate],
	)

	return { handleKeyDown }
}

// ============================================================================
// Keyboard Shortcut Hook
// ============================================================================

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
	/** Key to listen for */
	key: string
	/** Whether Ctrl key must be pressed */
	ctrl?: boolean
	/** Whether Meta (Cmd) key must be pressed */
	meta?: boolean
	/** Whether Shift key must be pressed */
	shift?: boolean
	/** Whether Alt key must be pressed */
	alt?: boolean
	/** Callback when shortcut is triggered */
	action: () => void
	/** Whether the shortcut is enabled */
	enabled?: boolean
	/** Whether to prevent default behavior */
	preventDefault?: boolean
}

/**
 * Hook to register keyboard shortcuts.
 *
 * @param shortcuts - Array of keyboard shortcuts
 *
 * @example
 * ```tsx
 * function Editor() {
 *   useKeyboardShortcuts([
 *     { key: 's', ctrl: true, action: save, preventDefault: true },
 *     { key: 'z', ctrl: true, action: undo },
 *     { key: 'z', ctrl: true, shift: true, action: redo },
 *   ])
 *   return <textarea />
 * }
 * ```
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			for (const shortcut of shortcuts) {
				if (shortcut.enabled === false) continue

				const keyMatches = event.key === shortcut.key
				const ctrlMatches = shortcut.ctrl
					? event.ctrlKey
					: !event.ctrlKey
				const metaMatches = shortcut.meta
					? event.metaKey
					: !event.metaKey
				const shiftMatches = shortcut.shift
					? event.shiftKey
					: !event.shiftKey
				const altMatches = shortcut.alt ? event.altKey : !event.altKey

				if (
					keyMatches &&
					ctrlMatches &&
					metaMatches &&
					shiftMatches &&
					altMatches
				) {
					if (shortcut.preventDefault !== false) {
						event.preventDefault()
					}
					shortcut.action()
					return
				}
			}
		}

		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [shortcuts])
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a keyboard event is an activation key (Enter or Space).
 *
 * @param event - Keyboard event
 * @returns Whether the event is an activation key
 */
export function isActivationKey(
	event: KeyboardEvent | React.KeyboardEvent,
): boolean {
	return ACTIVATION_KEYS.has(event.key)
}

/**
 * Check if a keyboard event is a navigation key.
 *
 * @param event - Keyboard event
 * @returns Whether the event is a navigation key
 */
export function isNavigationKey(
	event: KeyboardEvent | React.KeyboardEvent,
): boolean {
	return NAVIGATION_KEYS.has(event.key)
}

/**
 * Get the navigation direction from a keyboard event.
 *
 * @param event - Keyboard event
 * @param orientation - Navigation orientation
 * @returns Navigation direction or null
 */
export function getNavigationDirection(
	event: KeyboardEvent | React.KeyboardEvent,
	orientation: "horizontal" | "vertical" | "both" = "both",
): NavigationDirection | null {
	switch (event.key) {
		case KEYS.ARROW_DOWN:
			return orientation !== "horizontal" ? "down" : null
		case KEYS.ARROW_UP:
			return orientation !== "horizontal" ? "up" : null
		case KEYS.ARROW_RIGHT:
			return orientation !== "vertical" ? "right" : null
		case KEYS.ARROW_LEFT:
			return orientation !== "vertical" ? "left" : null
		case KEYS.HOME:
			return "home"
		case KEYS.END:
			return "end"
		default:
			return null
	}
}

/**
 * Prevent default behavior for navigation keys.
 * Useful for preventing page scroll when using arrow keys.
 *
 * @param event - Keyboard event
 */
export function preventNavigationScroll(
	event: KeyboardEvent | React.KeyboardEvent,
): void {
	if (NAVIGATION_KEYS.has(event.key) || event.key === KEYS.SPACE) {
		event.preventDefault()
	}
}
