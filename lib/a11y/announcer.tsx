/**
 * Screen Reader Announcer Component
 *
 * WCAG 2.1 AA compliant live region announcements for screen readers.
 * Provides utilities for announcing dynamic content changes.
 *
 * @module lib/a11y/announcer
 */

"use client"

import { createContext, useCallback, useContext, useRef, useState } from "react"

// ============================================================================
// Types
// ============================================================================

/**
 * Announcement politeness levels
 * - polite: Announces when user is idle (default, non-interrupting)
 * - assertive: Announces immediately (interrupts current announcement)
 */
export type AriaLive = "polite" | "assertive"

/**
 * Announcement options
 */
export interface AnnounceOptions {
	/** Politeness level for the announcement */
	ariaLive?: AriaLive
	/** Whether to clear previous announcements before announcing */
	clear?: boolean
	/** Delay in milliseconds before announcing */
	delay?: number
}

/**
 * Announcer context value
 */
export interface AnnouncerContextValue {
	/** Announce a message to screen readers */
	announce: (message: string, options?: AnnounceOptions) => void
	/** Clear all announcements */
	clearAnnouncements: () => void
}

// ============================================================================
// Context
// ============================================================================

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null)

/**
 * Hook to access the announcer context.
 * Must be used within an AnnouncerProvider.
 *
 * @returns Announcer context value
 * @throws Error if used outside of AnnouncerProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { announce } = useAnnouncer()
 *   return <button onClick={() => announce('Action completed')}>Do Action</button>
 * }
 * ```
 */
export function useAnnouncer(): AnnouncerContextValue {
	const context = useContext(AnnouncerContext)
	if (!context) {
		throw new Error("useAnnouncer must be used within an AnnouncerProvider")
	}
	return context
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Props for AnnouncerProvider
 */
export interface AnnouncerProviderProps {
	/** Child components */
	children: React.ReactNode
}

/**
 * Provider component for screen reader announcements.
 * Place at the root of your app to enable announcements throughout.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <AnnouncerProvider>
 *       <Router>...</Router>
 *     </AnnouncerProvider>
 *   )
 * }
 * ```
 */
export function AnnouncerProvider({ children }: AnnouncerProviderProps) {
	const [politeMessage, setPoliteMessage] = useState("")
	const [assertiveMessage, setAssertiveMessage] = useState("")
	const timeoutRef = useRef<NodeJS.Timeout | null>(null)

	const clearAnnouncements = useCallback(() => {
		setPoliteMessage("")
		setAssertiveMessage("")
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null
		}
	}, [])

	const announce = useCallback(
		(message: string, options: AnnounceOptions = {}) => {
			const { ariaLive = "polite", clear = false, delay = 0 } = options

			// Clear existing timeout
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}

			// Clear previous announcements if requested
			if (clear) {
				clearAnnouncements()
			}

			const doAnnounce = () => {
				if (ariaLive === "assertive") {
					setAssertiveMessage(message)
					// Clear after announcement to allow re-announcing same message
					setTimeout(() => setAssertiveMessage(""), 1000)
				} else {
					setPoliteMessage(message)
					// Clear after announcement to allow re-announcing same message
					setTimeout(() => setPoliteMessage(""), 1000)
				}
			}

			if (delay > 0) {
				timeoutRef.current = setTimeout(doAnnounce, delay)
			} else {
				doAnnounce()
			}
		},
		[clearAnnouncements],
	)

	return (
		<AnnouncerContext.Provider value={{ announce, clearAnnouncements }}>
			{children}
			{/* Live regions for announcements */}
			{/* biome-ignore lint/a11y/useSemanticElements: aria-live requires div for screen reader compatibility */}
			<div
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
				role="status"
			>
				{politeMessage}
			</div>
			<div
				aria-live="assertive"
				aria-atomic="true"
				className="sr-only"
				role="alert"
			>
				{assertiveMessage}
			</div>
		</AnnouncerContext.Provider>
	)
}

// ============================================================================
// Standalone Announcer Component
// ============================================================================

/**
 * Props for Announcer component
 */
export interface AnnouncerProps {
	/** Message to announce */
	message: string
	/** Politeness level */
	ariaLive?: AriaLive
}

/**
 * Standalone announcer component for one-off announcements.
 * Announces message when component mounts or message changes.
 *
 * @example
 * ```tsx
 * function LoadingState({ isLoading }) {
 *   return (
 *     <>
 *       {isLoading && <Announcer message="Loading content" />}
 *       {!isLoading && <Announcer message="Content loaded" />}
 *     </>
 *   )
 * }
 * ```
 */
export function Announcer({ message, ariaLive = "polite" }: AnnouncerProps) {
	const [announced, setAnnounced] = useState("")

	// Announce on mount or message change
	useState(() => {
		setAnnounced(message)
	})

	return (
		<div
			aria-live={ariaLive}
			aria-atomic="true"
			className="sr-only"
			role={ariaLive === "assertive" ? "alert" : "status"}
		>
			{announced}
		</div>
	)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a standalone live region element for announcements.
 * Useful for imperative announcements outside of React context.
 *
 * @param ariaLive - Politeness level
 * @returns Object with announce and destroy methods
 *
 * @example
 * ```tsx
 * const liveRegion = createLiveRegion('polite')
 * liveRegion.announce('Item added to cart')
 * liveRegion.destroy()
 * ```
 */
export function createLiveRegion(ariaLive: AriaLive = "polite") {
	const element = document.createElement("div")
	element.setAttribute("aria-live", ariaLive)
	element.setAttribute("aria-atomic", "true")
	element.setAttribute("role", ariaLive === "assertive" ? "alert" : "status")
	element.className = "sr-only"
	element.style.cssText = `
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	`
	document.body.appendChild(element)

	return {
		announce: (message: string) => {
			// Clear and re-set to ensure re-announcement of same message
			element.textContent = ""
			queueMicrotask(() => {
				element.textContent = message
			})
		},
		destroy: () => {
			element.remove()
		},
	}
}

/**
 * Announce a message imperatively without React context.
 * Creates a temporary live region, announces, then cleans up.
 *
 * @param message - Message to announce
 * @param options - Announcement options
 */
export function announceOnce(
	message: string,
	options: AnnounceOptions = {},
): void {
	const { ariaLive = "polite", delay = 0 } = options

	const doAnnounce = () => {
		const liveRegion = createLiveRegion(ariaLive)
		liveRegion.announce(message)
		// Clean up after announcement
		setTimeout(() => liveRegion.destroy(), 1000)
	}

	if (delay > 0) {
		setTimeout(doAnnounce, delay)
	} else {
		doAnnounce()
	}
}

// ============================================================================
// Common Announcement Helpers
// ============================================================================

/**
 * Pre-defined announcement messages for common actions.
 * Use these for consistent messaging across the application.
 */
export const ANNOUNCEMENTS = {
	// Loading states
	loading: "Loading...",
	loaded: "Content loaded",
	loadingFailed: "Failed to load content",

	// Form states
	formSubmitting: "Submitting form...",
	formSubmitted: "Form submitted successfully",
	formError: "Form submission failed. Please check your inputs.",

	// Navigation
	pageChanged: (pageName: string) => `Navigated to ${pageName}`,
	dialogOpened: (dialogName: string) => `${dialogName} dialog opened`,
	dialogClosed: "Dialog closed",

	// Actions
	itemAdded: (itemName: string) => `${itemName} added`,
	itemRemoved: (itemName: string) => `${itemName} removed`,
	itemUpdated: (itemName: string) => `${itemName} updated`,
	itemDeleted: (itemName: string) => `${itemName} deleted`,

	// Selection
	itemSelected: (itemName: string) => `${itemName} selected`,
	itemDeselected: (itemName: string) => `${itemName} deselected`,

	// Search
	searchResults: (count: number) =>
		count === 0
			? "No results found"
			: `${count} result${count === 1 ? "" : "s"} found`,
	searchCleared: "Search cleared",

	// Chat
	messageSent: "Message sent",
	messageReceived: "New message received",
	typing: "Assistant is typing...",

	// Errors
	error: "An error occurred",
	networkError: "Network error. Please check your connection.",
	validationError: "Please correct the highlighted errors.",
} as const
