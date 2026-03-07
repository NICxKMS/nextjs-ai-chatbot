// @vitest-environment jsdom
import { act, render, renderHook } from "@testing-library/react"
import type { UIMessage } from "ai"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { type UseChatSessionParams, useChatSession } from "@/features/chat/hooks/use-chat-session"
import {
	ChatSessionContext,
	useChatSessionContext,
} from "@/features/chat/hooks/use-chat-session-context"
import { useChatSideEffects } from "@/features/chat/hooks/use-chat-side-effects"
import { useScrollToBottom } from "@/features/chat/hooks/use-scroll-to-bottom"
import type { ChatSessionValue } from "@/features/chat/types/chat.types"

type MockUseChatConfig = {
	onData?: (dataPart: { type: string; data: unknown }) => void
	onFinish?: () => void
	onError?: (error: Error) => void
	transport?: unknown
}

const mockUseChat = vi.fn()
const mockDeleteTrailingMessages = vi.fn()
const mockSetChatStream = vi.fn()
const mockUseSettingsSelector = vi.fn()
const mockToastError = vi.fn()
const mockGenerateUUID = vi.fn(() => "generated-id")

vi.mock("@ai-sdk/react", () => ({
	useChat: (...args: unknown[]) => mockUseChat(...args),
}))

vi.mock("@/features/chat/actions/delete-trailing-messages", () => ({
	deleteTrailingMessages: (...args: unknown[]) => mockDeleteTrailingMessages(...args),
}))

vi.mock("@/features/chat/components/chat-stream-provider", () => ({
	useChatStreamDispatch: () => ({ setChatStream: mockSetChatStream }),
}))

vi.mock("@/features/settings/hooks/use-settings", () => ({
	useSettingsSelector: (selector: (settings: typeof settingsValue) => unknown) =>
		mockUseSettingsSelector(selector),
}))

vi.mock("@/lib/utils/generate-uuid", () => ({
	generateUUID: () => mockGenerateUUID(),
}))

vi.mock("sonner", () => ({
	toast: {
		error: (...args: unknown[]) => mockToastError(...args),
	},
}))

const mockSetMessages = vi.fn()
const mockSdkSendMessage = vi.fn()
const mockStop = vi.fn()
const mockClearError = vi.fn()

let mockMessages: UIMessage[] = []
let mockStatus: "submitted" | "streaming" | "ready" | "error" = "ready"
let mockError: Error | undefined
let latestUseChatConfig: MockUseChatConfig | null = null
let settingsValue = {
	temperature: 0.7,
	topP: 1,
	maxOutputTokens: 4096,
	systemPrompt: "",
	enableReasoning: false,
	contextDisplayMode: "compact" as const,
}

function createMessage(id: string, text: string, role: "user" | "assistant" = "user"): UIMessage {
	return {
		id,
		role,
		parts: [{ type: "text", text }],
	}
}

function createParams(overrides: Partial<UseChatSessionParams> = {}): UseChatSessionParams {
	return {
		id: "chat-1",
		initialMessages: [],
		initialChatModel: "model-1",
		isReadonly: false,
		initialVisibility: "private",
		availableModels: [],
		...overrides,
	}
}

describe("chat hooks", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	beforeEach(() => {
		vi.clearAllMocks()

		mockMessages = []
		mockStatus = "ready"
		mockError = undefined
		latestUseChatConfig = null
		settingsValue = {
			temperature: 0.7,
			topP: 1,
			maxOutputTokens: 4096,
			systemPrompt: "",
			enableReasoning: false,
			contextDisplayMode: "compact",
		}

		mockUseSettingsSelector.mockImplementation(
			(selector: (settings: typeof settingsValue) => unknown) => selector(settingsValue),
		)

		mockUseChat.mockImplementation((config: MockUseChatConfig) => {
			latestUseChatConfig = config
			return {
				messages: mockMessages,
				setMessages: mockSetMessages,
				sendMessage: mockSdkSendMessage,
				status: mockStatus,
				stop: mockStop,
				error: mockError,
				clearError: mockClearError,
			}
		})

		window.history.replaceState({}, "", "/")
	})

	describe("useChatSession", () => {
		it("sends a trimmed message and notifies on new chat", () => {
			const onNewChat = vi.fn()

			const { result } = renderHook(() =>
				useChatSession(
					createParams({
						onNewChat,
					}),
				),
			)

			act(() => {
				result.current.setInput("  hello world  ")
			})

			act(() => {
				result.current.sendMessage()
			})

			expect(mockSdkSendMessage).toHaveBeenCalledWith({ text: "hello world" })
			expect(onNewChat).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "chat-1",
					title: "hello world",
					visibility: "private",
					createdAt: expect.any(Date),
				}),
			)
			expect(result.current.input).toBe("")
			expect(result.current.usage).toBeUndefined()
		})

		it("prevents default form events and supports external files", () => {
			const preventDefault = vi.fn()
			const externalFiles = [
				{
					type: "file" as const,
					mediaType: "image/png",
					url: "https://example.com/image.png",
					filename: "image.png",
				},
			]

			const { result } = renderHook(() => useChatSession(createParams()))

			act(() => {
				result.current.setInput("hello")
			})

			act(() => {
				result.current.sendMessage({ preventDefault }, externalFiles)
			})

			expect(preventDefault).toHaveBeenCalledTimes(1)
			expect(mockSdkSendMessage).toHaveBeenCalledWith({
				text: "hello",
				files: externalFiles,
			})
		})

		it("does not send messages when read-only or when content is empty", () => {
			const readonlyHook = renderHook(() =>
				useChatSession(
					createParams({
						isReadonly: true,
					}),
				),
			)
			act(() => {
				readonlyHook.result.current.sendMessage("hello")
			})

			const emptyHook = renderHook(() => useChatSession(createParams()))
			act(() => {
				emptyHook.result.current.setInput("   ")
			})
			act(() => {
				emptyHook.result.current.sendMessage()
			})

			expect(mockSdkSendMessage).not.toHaveBeenCalled()
		})

		it("forwards stream data parts, handles title updates, and parses usage", () => {
			const onTitleUpdate = vi.fn()
			const { result } = renderHook(() =>
				useChatSession(
					createParams({
						onTitleUpdate,
					}),
				),
			)

			act(() => {
				latestUseChatConfig?.onData?.({
					type: "data-artifact-id",
					data: "artifact-1",
				})
				latestUseChatConfig?.onData?.({
					type: "data-chat-title",
					data: "New Chat Title",
				})
				latestUseChatConfig?.onData?.({
					type: "data-usage",
					data: JSON.stringify({
						promptTokens: 5,
						completionTokens: 10,
						totalTokens: 15,
					}),
				})
			})

			expect(mockSetChatStream).toHaveBeenCalledWith([
				{
					type: "artifact-id",
					content: "artifact-1",
				},
			])
			expect(onTitleUpdate).toHaveBeenCalledWith("chat-1", "New Chat Title")
			expect(result.current.usage).toEqual(
				expect.objectContaining({
					totalTokens: 15,
				}),
			)
		})

		it("shows explicit in-band stream errors as toasts", () => {
			renderHook(() => useChatSession(createParams()))

			act(() => {
				latestUseChatConfig?.onData?.({
					type: "data-error",
					data: "The assistant response was shown, but it could not be saved.",
				})
			})

			expect(mockToastError).toHaveBeenCalledWith(
				"The assistant response was shown, but it could not be saved.",
			)
		})

		it("ignores malformed usage payloads, resets stream on finish, and toasts on errors", () => {
			renderHook(() => useChatSession(createParams()))

			act(() => {
				latestUseChatConfig?.onData?.({
					type: "data-usage",
					data: "{invalid json}",
				})
				latestUseChatConfig?.onFinish?.()
				latestUseChatConfig?.onError?.(new Error("stream failed"))
			})

			expect(mockSetChatStream).toHaveBeenLastCalledWith(expect.any(Function))
			const resetStream = mockSetChatStream.mock.lastCall?.[0] as (
				prev: unknown[],
			) => unknown[]
			expect(resetStream([{ type: "artifact-id", content: "a" }])).toEqual([])
			expect(mockToastError).toHaveBeenCalledWith("stream failed")
		})

		it("appends messages through setMessages updater", () => {
			const { result } = renderHook(() => useChatSession(createParams()))
			const appended = createMessage("m2", "second")

			act(() => {
				result.current.appendMessage(appended)
			})

			const updater = mockSetMessages.mock.lastCall?.[0] as (prev: UIMessage[]) => UIMessage[]
			const next = updater([createMessage("m1", "first")])

			expect(next.map((message) => message.id)).toEqual(["m1", "m2"])
		})

		it("edits a message by deleting trailing messages, trimming local history, and resending text", async () => {
			mockMessages = [
				createMessage("m1", "first"),
				createMessage("m2", "second"),
				createMessage("m3", "third", "assistant"),
			]
			mockDeleteTrailingMessages.mockResolvedValue({ success: true, data: undefined })

			const { result } = renderHook(() => useChatSession(createParams()))

			await act(async () => {
				await result.current.editMessage("m2", "  revised text  ")
			})

			expect(mockDeleteTrailingMessages).toHaveBeenCalledWith({
				chatId: "chat-1",
				messageId: "m2",
			})

			const trimUpdater = mockSetMessages.mock.lastCall?.[0] as (
				prev: UIMessage[],
			) => UIMessage[]
			const trimmed = trimUpdater(mockMessages)
			expect(trimmed.map((message) => message.id)).toEqual(["m1"])

			expect(mockSdkSendMessage).toHaveBeenCalledWith({ text: "revised text" })
		})

		it("throws when editMessage deletion fails", async () => {
			mockDeleteTrailingMessages.mockResolvedValue({
				success: false,
				error: {
					code: "forbidden:chat:owner_mismatch",
					message: "Not allowed",
				},
			})

			const { result } = renderHook(() => useChatSession(createParams()))

			await expect(result.current.editMessage("m1", "retry")).rejects.toThrow("Not allowed")
			expect(mockSdkSendMessage).not.toHaveBeenCalled()
		})
	})

	describe("useChatSessionContext", () => {
		it("throws when used outside provider", () => {
			expect(() => renderHook(() => useChatSessionContext())).toThrowError(
				"useChatSessionContext must be used within a ChatSessionContext.Provider (ChatShell)",
			)
		})

		it("returns the provider value when inside ChatSessionContext", () => {
			const value: ChatSessionValue = {
				chatId: "chat-1",
				chatModel: "model-1",
				setChatModel: vi.fn(),
				isReadonly: false,
				messages: [],
				status: "ready",
				input: "",
				setInput: vi.fn(),
				sendMessage: vi.fn(),
				stop: vi.fn(),
				appendMessage: vi.fn(),
				editMessage: vi.fn(async () => {
					// no-op mock for context shape
				}),
				error: undefined,
				clearError: vi.fn(),
				visibility: "private",
				setVisibility: vi.fn(),
				availableModels: [],
				usage: undefined,
			}

			function wrapper({ children }: { children: ReactNode }) {
				return (
					<ChatSessionContext.Provider value={value}>
						{children}
					</ChatSessionContext.Provider>
				)
			}

			const { result } = renderHook(() => useChatSessionContext(), { wrapper })

			expect(result.current).toBe(value)
		})
	})

	describe("useChatSideEffects", () => {
		it("replaces URL when a new chat receives its first full response", () => {
			window.history.replaceState({}, "", "/")
			const replaceStateSpy = vi.spyOn(window.history, "replaceState")

			renderHook(() =>
				useChatSideEffects({
					id: "chat-42",
					messages: [
						createMessage("m1", "hello"),
						createMessage("m2", "response", "assistant"),
					],
					stop: vi.fn(),
				}),
			)

			expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/chat/chat-42")
		})

		it("does not replace URL when already on the current chat path", () => {
			window.history.replaceState({}, "", "/chat/chat-42")
			const replaceStateSpy = vi.spyOn(window.history, "replaceState")

			renderHook(() =>
				useChatSideEffects({
					id: "chat-42",
					messages: [
						createMessage("m1", "hello"),
						createMessage("m2", "response", "assistant"),
					],
					stop: vi.fn(),
				}),
			)

			expect(replaceStateSpy).not.toHaveBeenCalled()
		})

		it("calls stop and onChatChange when chat id changes", () => {
			const stop = vi.fn()
			const onChatChange = vi.fn()

			const { rerender } = renderHook(
				(props: { id: string }) =>
					useChatSideEffects({
						id: props.id,
						messages: [createMessage("m1", "hello")],
						stop,
						onChatChange,
					}),
				{
					initialProps: {
						id: "chat-a",
					},
				},
			)

			rerender({ id: "chat-b" })

			expect(stop).toHaveBeenCalledTimes(1)
			expect(onChatChange).toHaveBeenCalledTimes(1)
		})
	})

	describe("useScrollToBottom", () => {
		it("tracks intersection state, exposes scrollToBottom, and disconnects observer on unmount", () => {
			let observerCallback: ((entries: Array<{ isIntersecting: boolean }>) => void) | null =
				null
			const observeSpy = vi.fn()
			const disconnectSpy = vi.fn()
			type ScrollHookValue = {
				containerRef: { current: HTMLDivElement | null }
				endRef: { current: HTMLDivElement | null }
				isAtBottom: boolean
				scrollToBottom: () => void
			}

			class MockIntersectionObserverImpl {
				readonly root = null
				readonly rootMargin = "0px"
				readonly thresholds = [0]

				constructor(
					callback: (entries: IntersectionObserverEntry[]) => void,
					_options?: IntersectionObserverInit,
				) {
					observerCallback = callback as (
						entries: Array<{ isIntersecting: boolean }>,
					) => void
				}

				disconnect = disconnectSpy
				observe = observeSpy
				takeRecords = vi.fn(() => [])
				unobserve = vi.fn()
			}

			vi.stubGlobal("IntersectionObserver", MockIntersectionObserverImpl)

			let latest: ScrollHookValue | undefined

			function Harness() {
				latest = useScrollToBottom()
				return (
					<div ref={latest.containerRef}>
						<div data-testid="scroll-end" ref={latest.endRef} />
					</div>
				)
			}

			const { getByTestId, unmount } = render(<Harness />)

			if (!latest) {
				throw new Error("Expected useScrollToBottom to return a value")
			}

			expect(observeSpy).toHaveBeenCalledWith(getByTestId("scroll-end"))
			expect(latest.isAtBottom).toBe(true)

			act(() => {
				observerCallback?.([{ isIntersecting: false }])
			})
			expect(latest.isAtBottom).toBe(false)

			const endElement = getByTestId("scroll-end")
			const scrollIntoView = vi.fn()
			Object.defineProperty(endElement, "scrollIntoView", {
				value: scrollIntoView,
				configurable: true,
			})

			act(() => {
				latest?.scrollToBottom()
			})

			expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "end" })

			unmount()
			expect(disconnectSpy).toHaveBeenCalledTimes(1)
		})
	})
})
