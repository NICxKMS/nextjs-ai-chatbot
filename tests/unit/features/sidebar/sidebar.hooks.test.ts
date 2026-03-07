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
			error: undefined,
			mutate: vi.fn(),
			setSize: vi.fn(),
			size: 1,
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
				revalidateOnFocus?: boolean
				revalidateOnReconnect?: boolean
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
		expect(options.revalidateOnFocus).toBe(true)
		expect(options.revalidateOnReconnect).toBe(true)
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

	it("flattens chats, derives hasMore from the last page, and treats in-flight pagination as loading", () => {
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
			error: undefined,
			mutate: vi.fn(),
			setSize,
			size: 3,
			isLoading: false,
			isValidating: true,
		})

		const { result } = renderHook(() => useSidebarHistory())

		expect(result.current.chats.map((chat) => chat.id)).toEqual(["chat-1", "chat-2"])
		expect(result.current.hasMore).toBe(false)
		expect(result.current.isLoading).toBe(true)
	})

	it("does not expose background revalidation as pagination loading", () => {
		mockUseSWRInfinite.mockReturnValue({
			data: [
				{
					chats: [createMockChat({ id: "chat-1" })],
					hasMore: true,
					nextCursor: "chat-1",
				},
			],
			error: undefined,
			mutate: vi.fn(),
			setSize: vi.fn(),
			size: 1,
			isLoading: false,
			isValidating: true,
		})

		const { result } = renderHook(() => useSidebarHistory())

		expect(result.current.isLoading).toBe(false)
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
			error: undefined,
			mutate: vi.fn(),
			setSize,
			size: 1,
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
			error: undefined,
			mutate: vi.fn(),
			setSize,
			size: 1,
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
			error: undefined,
			mutate: vi.fn(),
			setSize,
			size: 1,
			isLoading: false,
			isValidating: true,
		})

		const validating = renderHook(() => useSidebarHistory())
		act(() => {
			validating.result.current.loadMore()
		})

		expect(setSize).not.toHaveBeenCalled()
	})

	it("does not load more while a pagination error is present and exposes retry", () => {
		const mutate = vi.fn()
		const setSize = vi.fn()

		mockUseSWRInfinite.mockReturnValue({
			data: [
				{
					chats: [createMockChat({ id: "chat-1" })],
					hasMore: true,
					nextCursor: "chat-1",
				},
			],
			error: new Error("network failed"),
			mutate,
			setSize,
			size: 1,
			isLoading: false,
			isValidating: false,
		})

		const { result } = renderHook(() => useSidebarHistory())

		act(() => {
			result.current.loadMore()
			result.current.retry()
		})

		expect(result.current.error?.message).toBe("network failed")
		expect(setSize).not.toHaveBeenCalled()
		expect(mutate).toHaveBeenCalledTimes(1)
	})

	it("patches a loaded chat locally without revalidation", () => {
		const mutate = vi.fn()

		mockUseSWRInfinite.mockReturnValue({
			data: [
				{
					chats: [
						createMockChat({ id: "chat-1", title: "Old Title", visibility: "private" }),
					],
					hasMore: false,
				},
			],
			error: undefined,
			mutate,
			setSize: vi.fn(),
			size: 1,
			isLoading: false,
			isValidating: false,
		})

		const { result } = renderHook(() => useSidebarHistory())

		act(() => {
			result.current.patchChat("chat-1", { title: "Renamed", visibility: "public" })
		})

		expect(mutate).toHaveBeenCalledTimes(1)
		const [updater, options] = mutate.mock.calls[0] as [
			(
				currentPages: Array<{
					chats: ReturnType<typeof createMockChat>[]
					hasMore: boolean
				}>,
			) => Array<{
				chats: ReturnType<typeof createMockChat>[]
				hasMore: boolean
			}>,
			{ revalidate: boolean },
		]

		const nextPages = updater([
			{
				chats: [
					createMockChat({ id: "chat-1", title: "Old Title", visibility: "private" }),
				],
				hasMore: false,
			},
		])

		expect(nextPages[0]?.chats[0]?.title).toBe("Renamed")
		expect(nextPages[0]?.chats[0]?.visibility).toBe("public")
		expect(options).toEqual({ revalidate: false })
	})
})
