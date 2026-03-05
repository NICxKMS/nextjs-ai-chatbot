// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useSidebarHistory } from "@/features/sidebar/hooks/use-sidebar-history"
import { createMockChat } from "@/tests/fixtures/chat"
import { createMockSession } from "@/tests/fixtures/user"

const mockUseSession = vi.fn()
const mockUseSWRInfinite = vi.fn()

vi.mock("@/features/auth/components/session-provider", () => ({
	useSession: () => mockUseSession(),
}))

vi.mock("swr/infinite", () => ({
	default: (...args: unknown[]) => mockUseSWRInfinite(...args),
}))

describe("useSidebarHistory", () => {
	beforeEach(() => {
		vi.clearAllMocks()

		mockUseSession.mockReturnValue({
			session: createMockSession(),
		})

		mockUseSWRInfinite.mockReturnValue({
			data: undefined,
			setSize: vi.fn(),
			isLoading: false,
			isValidating: false,
		})
	})

	it("passes authenticated key loader and server fallback data to SWR", () => {
		const chats = [createMockChat({ id: "chat-1" }), createMockChat({ id: "chat-2" })]

		renderHook(() =>
			useSidebarHistory({
				initialData: {
					chats,
					hasMore: true,
				},
			}),
		)

		const [keyLoader, _fetcher, options] = mockUseSWRInfinite.mock.calls[0] as [
			(
				pageIndex: number,
				previousPageData: { hasMore: boolean; nextCursor?: string } | null,
			) => string | null,
			unknown,
			{
				fallbackData?: Array<{ nextCursor?: string }>
				revalidateOnMount?: boolean
				revalidateFirstPage?: boolean
			},
		]

		expect(keyLoader(0, null)).toBe("/api/history?limit=20")
		expect(keyLoader(1, { hasMore: true, nextCursor: "chat-2" })).toBe(
			"/api/history?limit=20&cursor=chat-2",
		)
		expect(keyLoader(1, { hasMore: false, nextCursor: "chat-2" })).toBeNull()
		expect(options.fallbackData?.[0]?.nextCursor).toBe("chat-2")
		expect(options.revalidateOnMount).toBe(false)
		expect(options.revalidateFirstPage).toBe(false)
	})

	it("skips fetching when there is no authenticated session", () => {
		mockUseSession.mockReturnValue({
			session: null,
		})

		const { result } = renderHook(() => useSidebarHistory())

		const [keyLoader] = mockUseSWRInfinite.mock.calls[0] as [
			(pageIndex: number, previousPageData: unknown) => string | null,
		]

		expect(keyLoader(0, null)).toBeNull()
		expect(result.current.chats).toEqual([])
		expect(result.current.hasMore).toBe(false)
	})

	it("flattens chats, derives hasMore from the last page, and combines loading states", () => {
		const setSize = vi.fn()

		mockUseSWRInfinite.mockReturnValue({
			data: [
				{
					chats: [createMockChat({ id: "chat-1" })],
					hasMore: true,
					nextCursor: "chat-1",
				},
				{
					chats: [createMockChat({ id: "chat-2" })],
					hasMore: false,
				},
			],
			setSize,
			isLoading: false,
			isValidating: true,
		})

		const { result } = renderHook(() => useSidebarHistory())

		expect(result.current.chats.map((chat) => chat.id)).toEqual(["chat-1", "chat-2"])
		expect(result.current.hasMore).toBe(false)
		expect(result.current.isLoading).toBe(true)
	})

	it("increments page size when loadMore is called and more pages are available", () => {
		const setSize = vi.fn()

		mockUseSWRInfinite.mockReturnValue({
			data: [
				{
					chats: [createMockChat({ id: "chat-1" })],
					hasMore: true,
					nextCursor: "chat-1",
				},
			],
			setSize,
			isLoading: false,
			isValidating: false,
		})

		const { result } = renderHook(() => useSidebarHistory())

		act(() => {
			result.current.loadMore()
		})

		expect(setSize).toHaveBeenCalledTimes(1)
		const updater = setSize.mock.calls[0]?.[0] as (prev: number) => number
		expect(updater(2)).toBe(3)
	})

	it("does not load more while validating or when there are no additional pages", () => {
		const setSize = vi.fn()

		mockUseSWRInfinite.mockReturnValue({
			data: [
				{
					chats: [createMockChat({ id: "chat-1" })],
					hasMore: false,
				},
			],
			setSize,
			isLoading: false,
			isValidating: false,
		})

		const noMore = renderHook(() => useSidebarHistory())
		act(() => {
			noMore.result.current.loadMore()
		})

		mockUseSWRInfinite.mockReturnValue({
			data: [
				{
					chats: [createMockChat({ id: "chat-1" })],
					hasMore: true,
					nextCursor: "chat-1",
				},
			],
			setSize,
			isLoading: false,
			isValidating: true,
		})

		const validating = renderHook(() => useSidebarHistory())
		act(() => {
			validating.result.current.loadMore()
		})

		expect(setSize).not.toHaveBeenCalled()
	})
})
