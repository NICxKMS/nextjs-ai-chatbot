"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface UseScrollToBottomReturn {
	/** Ref for the scrollable container element */
	containerRef: React.RefObject<HTMLDivElement | null>
	/** Ref for the sentinel element placed at the bottom of content */
	endRef: React.RefObject<HTMLDivElement | null>
	/** Whether the scroll position is at (or near) the bottom */
	isAtBottom: boolean
	/** Programmatically scroll to the bottom with smooth behavior */
	scrollToBottom: () => void
}

/**
 * IntersectionObserver-based scroll-to-bottom detection.
 *
 * Place `endRef` as an empty div at the bottom of scrollable content.
 * The observer watches whether `endRef` is visible within `containerRef`.
 * When visible → isAtBottom is true; when scrolled away → false.
 *
 * Uses IntersectionObserver (NOT scroll events) per architecture spec.
 */
export function useScrollToBottom(): UseScrollToBottomReturn {
	const containerRef = useRef<HTMLDivElement | null>(null)
	const endRef = useRef<HTMLDivElement | null>(null)
	const [isAtBottom, setIsAtBottom] = useState(true)

	// ── IntersectionObserver setup ─────────────────────────────
	useEffect(() => {
		const end = endRef.current
		const container = containerRef.current
		if (!end || !container) return

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0]
				if (entry) {
					setIsAtBottom(entry.isIntersecting)
				}
			},
			{
				root: container,
				// Small margin to detect "near bottom" as well as exact bottom
				rootMargin: "0px 0px 16px 0px",
				threshold: 0,
			},
		)

		observer.observe(end)
		return () => observer.disconnect()
	}, [])

	// ── Smooth scroll to bottom ────────────────────────────────
	const scrollToBottom = useCallback(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
	}, [])

	return { containerRef, endRef, isAtBottom, scrollToBottom }
}
