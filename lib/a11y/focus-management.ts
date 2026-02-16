/**
 * Focus Management Utilities
 *
 * WCAG 2.1 AA compliant focus management utilities for:
 * - Focus trapping (modals, dialogs)
 * - Focus restoration
 * - Roving tabindex pattern
 * - Focus visible detection
 *
 * @module lib/a11y/focus-management
 */

"use client"

import { useCallback, useEffect, useRef } from "react"

// ============================================================================
// Types
// ============================================================================

/**
 * Options for focus trap behavior
 */
export interface FocusTrapOptions {
	/** Whether the trap is active */
	enabled: boolean
	/** Element to receive initial focus */
	initialFocus?: HTMLElement | string | null
	/** Element to receive focus on escape (restoration) */
	restoreFocus?: HTMLElement | string | null
	/** Whether to allow escape key to deactivate */
	escapeDeactivates?: boolean
	/** Callback when trap is deactivated */
	onDeactivate?: () => void
	/** Whether to prevent scrolling on focus */
	preventScroll?: boolean
}

/**
 * Options for roving tabindex
 */
export interface RovingTabindexOptions {
	/** Whether the group is oriented horizontally, vertically, or both */
	orientation?: "horizontal" | "vertical" | "both"
	/** Whether to wrap around at boundaries */
	wrap?: boolean
	/** Whether the group is currently active */
	enabled?: boolean
}

/**
 * Focusable element selector
 * Matches elements that can receive keyboard focus
 */
export const FOCUSABLE_SELECTOR =
	'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

// ============================================================================
// Focus Trap Hook
// ============================================================================

/**
 * Hook to trap focus within a container element.
 * Essential for modals, dialogs, and other overlay components.
 *
 * @param options - Focus trap configuration options
 * @returns Ref to attach to the container element
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose }) {
 *   const trapRef = useFocusTrap({ enabled: isOpen, onDeactivate: onClose })
 *   return isOpen ? <div ref={trapRef}>...</div> : null
 * }
 * ```
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
	options: FocusTrapOptions,
): React.RefObject<T | null> {
	const containerRef = useRef<T>(null)
	const previousFocusRef = useRef<HTMLElement | null>(null)
	const {
		enabled,
		initialFocus,
		restoreFocus,
		escapeDeactivates = true,
		onDeactivate,
		preventScroll = false,
	} = options

	// Store the previously focused element when trap activates
	useEffect(() => {
		if (enabled) {
			previousFocusRef.current = document.activeElement as HTMLElement
		}
	}, [enabled])

	// Handle focus trapping
	useEffect(() => {
		if (!enabled || !containerRef.current) return

		const container = containerRef.current

		// Get all focusable elements within container
		const getFocusableElements = (): HTMLElement[] => {
			const elements =
				container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
			return Array.from(elements).filter(
				(el) => !el.hasAttribute("hidden") && el.offsetParent !== null,
			)
		}

		// Move focus to first focusable element or specified initial focus
		const setInitialFocus = () => {
			let targetElement: HTMLElement | null = null

			if (initialFocus) {
				targetElement =
					typeof initialFocus === "string"
						? container.querySelector(initialFocus)
						: initialFocus
			}

			if (!targetElement) {
				const focusableElements = getFocusableElements()
				targetElement = focusableElements[0] ?? null
			}

			if (targetElement) {
				targetElement.focus({ preventScroll })
			}
		}

		// Handle Tab key to trap focus
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Tab") return

			const focusableElements = getFocusableElements()
			if (focusableElements.length === 0) return

			const firstElement = focusableElements[0]
			const lastElement = focusableElements[focusableElements.length - 1]

			if (event.shiftKey) {
				// Shift+Tab: moving backwards
				if (document.activeElement === firstElement && lastElement) {
					event.preventDefault()
					lastElement.focus({ preventScroll })
				}
			} else {
				// Tab: moving forwards
				if (document.activeElement === lastElement && firstElement) {
					event.preventDefault()
					firstElement.focus({ preventScroll })
				}
			}
		}

		// Handle Escape key to deactivate
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape" && escapeDeactivates) {
				event.preventDefault()
				onDeactivate?.()
			}
		}

		// Handle focus leaving the container (fallback)
		const handleFocusIn = (event: FocusEvent) => {
			if (!container.contains(event.target as Node)) {
				setInitialFocus()
			}
		}

		// Set up event listeners
		container.addEventListener("keydown", handleKeyDown)
		container.addEventListener("keydown", handleEscape)
		document.addEventListener("focusin", handleFocusIn)

		// Set initial focus
		setInitialFocus()

		return () => {
			container.removeEventListener("keydown", handleKeyDown)
			container.removeEventListener("keydown", handleEscape)
			document.removeEventListener("focusin", handleFocusIn)
		}
	}, [enabled, initialFocus, escapeDeactivates, onDeactivate, preventScroll])

	// Restore focus when trap deactivates
	useEffect(() => {
		if (!enabled && previousFocusRef.current) {
			let targetElement: HTMLElement | null = null

			if (restoreFocus) {
				targetElement =
					typeof restoreFocus === "string"
						? document.querySelector(restoreFocus)
						: restoreFocus
			}

			if (!targetElement) {
				targetElement = previousFocusRef.current
			}

			// Restore focus after a microtask to ensure DOM is ready
			queueMicrotask(() => {
				targetElement?.focus({ preventScroll })
			})
		}
	}, [enabled, restoreFocus, preventScroll])

	return containerRef
}

// ============================================================================
// Focus Restoration Hook
// ============================================================================

/**
 * Hook to restore focus when a component unmounts.
 * Useful for components that temporarily take focus.
 *
 * @param enabled - Whether focus restoration is active
 * @returns Ref to attach to the element that will trigger restoration
 *
 * @example
 * ```tsx
 * function Popover({ isOpen }) {
 *   const restoreRef = useFocusRestore(isOpen)
 *   return <button ref={restoreRef}>Toggle</button>
 * }
 * ```
 */
export function useFocusRestore<T extends HTMLElement = HTMLElement>(
	enabled: boolean,
): React.RefObject<T | null> {
	const triggerRef = useRef<T>(null)
	const savedFocusRef = useRef<HTMLElement | null>(null)

	useEffect(() => {
		if (enabled) {
			savedFocusRef.current = document.activeElement as HTMLElement
		}
	}, [enabled])

	useEffect(() => {
		return () => {
			if (savedFocusRef.current && !enabled) {
				savedFocusRef.current.focus()
			}
		}
	}, [enabled])

	return triggerRef
}

// ============================================================================
// Roving Tabindex Hook
// ============================================================================

/**
 * Hook to implement roving tabindex pattern for composite widgets.
 * Used for menus, tab lists, grid navigation, etc.
 *
 * @param options - Roving tabindex configuration
 * @returns Object containing ref, current index, and navigation handlers
 *
 * @example
 * ```tsx
 * function Menu({ items }) {
 *   const { containerRef, currentIndex, handleKeyDown } = useRovingTabindex({ orientation: 'vertical' })
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
export function useRovingTabindex<T extends HTMLElement = HTMLDivElement>(
	options: RovingTabindexOptions = {},
): {
	containerRef: React.RefObject<T | null>
	currentIndex: number
	setCurrentIndex: (index: number) => void
	handleKeyDown: (event: React.KeyboardEvent) => void
	focusAt: (index: number) => void
} {
	const { orientation = "both", wrap = true, enabled = true } = options

	const containerRef = useRef<T>(null)
	const currentIndexRef = useRef(0)

	const getFocusableElements = useCallback((): HTMLElement[] => {
		if (!containerRef.current) return []
		const elements = containerRef.current.querySelectorAll<HTMLElement>(
			'[tabindex]:not([tabindex="-1"]), [role="menuitem"], [role="option"], [role="tab"]',
		)
		return Array.from(elements).filter(
			(el) => !el.hasAttribute("hidden") && el.offsetParent !== null,
		)
	}, [])

	const focusAt = useCallback(
		(index: number) => {
			const elements = getFocusableElements()
			if (elements.length === 0) return

			let targetIndex = index
			if (wrap) {
				targetIndex =
					((index % elements.length) + elements.length) %
					elements.length
			} else {
				targetIndex = Math.max(0, Math.min(index, elements.length - 1))
			}

			// Update tabindex attributes
			elements.forEach((el, i) => {
				el.setAttribute("tabindex", i === targetIndex ? "0" : "-1")
			})

			// Focus the target element
			elements[targetIndex]?.focus()
			currentIndexRef.current = targetIndex
		},
		[getFocusableElements, wrap],
	)

	const setCurrentIndex = useCallback((index: number) => {
		currentIndexRef.current = index
	}, [])

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (!enabled) return

			const elements = getFocusableElements()
			if (elements.length === 0) return

			const currentIndex = currentIndexRef.current
			let newIndex = currentIndex

			switch (event.key) {
				case "ArrowDown":
					if (orientation === "horizontal") return
					event.preventDefault()
					newIndex = currentIndex + 1
					break
				case "ArrowUp":
					if (orientation === "horizontal") return
					event.preventDefault()
					newIndex = currentIndex - 1
					break
				case "ArrowRight":
					if (orientation === "vertical") return
					event.preventDefault()
					newIndex = currentIndex + 1
					break
				case "ArrowLeft":
					if (orientation === "vertical") return
					event.preventDefault()
					newIndex = currentIndex - 1
					break
				case "Home":
					event.preventDefault()
					newIndex = 0
					break
				case "End":
					event.preventDefault()
					newIndex = elements.length - 1
					break
				default:
					return
			}

			focusAt(newIndex)
		},
		[enabled, getFocusableElements, orientation, focusAt],
	)

	return {
		containerRef,
		currentIndex: currentIndexRef.current,
		setCurrentIndex,
		handleKeyDown,
		focusAt,
	}
}

// ============================================================================
// Focus Visible Detection
// ============================================================================

/**
 * Hook to detect if the user is navigating with keyboard.
 * Useful for showing focus indicators only for keyboard users.
 *
 * @returns Whether the user is using keyboard navigation
 *
 * @example
 * ```tsx
 * function Button() {
 *   const isKeyboardUser = useFocusVisible()
 *   return <button className={isKeyboardUser ? 'focus-visible' : ''}>Click</button>
 * }
 * ```
 */
export function useFocusVisible(): boolean {
	const ref = useRef(false)

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Tab") {
				ref.current = true
				document.body.classList.add("keyboard-navigation")
			}
		}

		const handleMouseDown = () => {
			ref.current = false
			document.body.classList.remove("keyboard-navigation")
		}

		document.addEventListener("keydown", handleKeyDown)
		document.addEventListener("mousedown", handleMouseDown)

		return () => {
			document.removeEventListener("keydown", handleKeyDown)
			document.removeEventListener("mousedown", handleMouseDown)
		}
	}, [])

	return ref.current
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Programmatically focus the first focusable element within a container.
 *
 * @param container - The container element to search within
 * @param preventScroll - Whether to prevent scrolling on focus
 * @returns Whether an element was focused
 */
export function focusFirst(
	container: HTMLElement,
	preventScroll = false,
): boolean {
	const focusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
	if (focusable) {
		focusable.focus({ preventScroll })
		return true
	}
	return false
}

/**
 * Programmatically focus the last focusable element within a container.
 *
 * @param container - The container element to search within
 * @param preventScroll - Whether to prevent scrolling on focus
 * @returns Whether an element was focused
 */
export function focusLast(
	container: HTMLElement,
	preventScroll = false,
): boolean {
	const focusable =
		container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
	const lastElement = focusable[focusable.length - 1]
	if (lastElement) {
		lastElement.focus({ preventScroll })
		return true
	}
	return false
}

/**
 * Get all focusable elements within a container.
 *
 * @param container - The container element to search within
 * @returns Array of focusable elements
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
	return Array.from(
		container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
	).filter((el) => !el.hasAttribute("hidden") && el.offsetParent !== null)
}

/**
 * Check if an element is focusable.
 *
 * @param element - The element to check
 * @returns Whether the element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
	if (element.hasAttribute("disabled")) return false
	if (element.getAttribute("tabindex") === "-1") return false
	if (element.hasAttribute("hidden")) return false
	if (element.offsetParent === null) return false

	return element.matches(FOCUSABLE_SELECTOR)
}
