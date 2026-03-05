// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useIsMobile } from "@/lib/hooks/use-mobile"

type ChangeListener = (event: MediaQueryListEvent) => void

function setInnerWidth(width: number) {
	Object.defineProperty(window, "innerWidth", {
		value: width,
		writable: true,
		configurable: true,
	})
}

describe("useIsMobile", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("uses the media query breakpoint and updates when actual viewport differs from initial value", async () => {
		let changeListener: ChangeListener | null = null
		const addEventListener = vi.fn(
			(event: string, listener: EventListenerOrEventListenerObject) => {
				if (event === "change" && typeof listener === "function") {
					changeListener = listener as ChangeListener
				}
			},
		)
		const removeEventListener = vi.fn()

		const matchMedia = vi.fn((query: string): MediaQueryList => {
			return {
				matches: window.innerWidth < 768,
				media: query,
				onchange: null,
				addEventListener,
				removeEventListener,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(() => true),
			}
		})

		Object.defineProperty(window, "matchMedia", {
			value: matchMedia,
			writable: true,
			configurable: true,
		})

		setInnerWidth(500)
		const { result, unmount } = renderHook(() => useIsMobile({ initialIsMobile: false }))

		await waitFor(() => {
			expect(result.current).toBe(true)
		})

		expect(matchMedia).toHaveBeenCalledWith("(max-width: 767px)")

		act(() => {
			setInnerWidth(900)
			changeListener?.(new Event("change") as MediaQueryListEvent)
		})

		expect(result.current).toBe(false)

		unmount()
		expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function))
	})

	it("keeps the initial value when it matches the viewport", async () => {
		const addEventListener = vi.fn()
		const removeEventListener = vi.fn()

		Object.defineProperty(window, "matchMedia", {
			value: vi.fn(
				(query: string): MediaQueryList => ({
					matches: window.innerWidth < 768,
					media: query,
					onchange: null,
					addEventListener,
					removeEventListener,
					addListener: vi.fn(),
					removeListener: vi.fn(),
					dispatchEvent: vi.fn(() => true),
				}),
			),
			writable: true,
			configurable: true,
		})

		setInnerWidth(360)
		const { result } = renderHook(() => useIsMobile({ initialIsMobile: true }))

		await waitFor(() => {
			expect(result.current).toBe(true)
		})
		expect(addEventListener).toHaveBeenCalledTimes(1)
	})
})
