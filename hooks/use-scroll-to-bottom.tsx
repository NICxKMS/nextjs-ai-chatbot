"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import useSWR from "swr"

type ScrollFlag = ScrollBehavior | false

/** Distance from bottom (in pixels) to consider "at bottom" */
const SCROLL_BOTTOM_THRESHOLD = 100

/**
 * Return type for the useScrollToBottom hook.
 */
export type UseScrollToBottomReturn = {
	/** Ref to attach to the scrollable container */
	containerRef: React.RefObject<HTMLDivElement | null>
	/** Ref to attach to the bottom sentinel element */
	endRef: React.RefObject<HTMLDivElement | null>
	/** Whether the scroll position is at the bottom */
	isAtBottom: boolean
	/** Function to programmatically scroll to bottom */
	scrollToBottom: (behavior?: ScrollBehavior) => void
	/** Callback when viewport enters the bottom area */
	onViewportEnter: () => void
	/** Callback when viewport leaves the bottom area */
	onViewportLeave: () => void
}

/**
 * A hook for managing scroll-to-bottom behavior in chat-like interfaces.
 * Tracks scroll position and provides smooth scrolling to bottom.
 *
 * Uses ResizeObserver and MutationObserver to detect content changes
 * and maintain accurate scroll position tracking.
 *
 * @returns Object with refs and scroll utilities
 *
 * @example
 * ```tsx
 * function ChatMessages({ messages }) {
 *   const {
 *     containerRef,
 *     endRef,
 *     isAtBottom,
 *     scrollToBottom,
 *   } = useScrollToBottom();
 *
 *   return (
 *     <div ref={containerRef} className="overflow-y-auto">
 *       {messages.map(msg => <Message key={msg.id} {...msg} />)}
 *       <div ref={endRef} />
 *       {!isAtBottom && (
 *         <button onClick={() => scrollToBottom()}>
 *           Scroll to bottom
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useScrollToBottom(): UseScrollToBottomReturn {
	const containerRef = useRef<HTMLDivElement>(null)
	const endRef = useRef<HTMLDivElement>(null)
	// Start as true to match SSR, actual value computed in useEffect after mount
	const [isAtBottom, setIsAtBottom] = useState(true)
	const [mounted, setMounted] = useState(false)

	// Mark as mounted after first render to enable client-side scroll tracking
	useEffect(() => {
		setMounted(true)
	}, [])

	const { data: scrollBehavior = false, mutate: setScrollBehavior } =
		useSWR<ScrollFlag>("messages:should-scroll", null, {
			fallbackData: false,
		})

	const handleScroll = useCallback(() => {
		// Only track scroll after mount to prevent hydration mismatch
		if (!mounted || !containerRef.current) {
			return
		}
		const { scrollTop, scrollHeight, clientHeight } = containerRef.current

		// Check if we are within threshold of the bottom
		setIsAtBottom(
			scrollTop + clientHeight >= scrollHeight - SCROLL_BOTTOM_THRESHOLD,
		)
	}, [mounted])

	useEffect(() => {
		if (!containerRef.current) {
			return
		}

		const container = containerRef.current

		const resizeObserver = new ResizeObserver(() => {
			requestAnimationFrame(() => {
				handleScroll()
			})
		})

		const mutationObserver = new MutationObserver(() => {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					handleScroll()
				})
			})
		})

		resizeObserver.observe(container)
		mutationObserver.observe(container, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["style", "class", "data-state"],
		})

		handleScroll()

		return () => {
			resizeObserver.disconnect()
			mutationObserver.disconnect()
		}
	}, [handleScroll])

	useEffect(() => {
		const container = containerRef.current
		if (!container) {
			return
		}

		container.addEventListener("scroll", handleScroll)
		handleScroll() // Check initial state

		return () => {
			container.removeEventListener("scroll", handleScroll)
		}
	}, [handleScroll])

	useEffect(() => {
		if (scrollBehavior && containerRef.current) {
			const container = containerRef.current
			const scrollOptions: ScrollToOptions = {
				top: container.scrollHeight,
				behavior: scrollBehavior,
			}
			container.scrollTo(scrollOptions)
			setScrollBehavior(false)
		}
	}, [scrollBehavior, setScrollBehavior])

	const scrollToBottom = useCallback(
		(currentScrollBehavior: ScrollBehavior = "smooth") => {
			setScrollBehavior(currentScrollBehavior)
		},
		[setScrollBehavior],
	)

	function onViewportEnter() {
		setIsAtBottom(true)
	}

	function onViewportLeave() {
		setIsAtBottom(false)
	}

	return {
		containerRef,
		endRef,
		isAtBottom,
		scrollToBottom,
		onViewportEnter,
		onViewportLeave,
	}
}
