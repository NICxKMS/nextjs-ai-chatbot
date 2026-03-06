// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"
import type { FileUIPart, UIMessage } from "ai"
import { type ReactNode, useEffect } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ChatShell } from "@/features/chat/components/chat-shell"
import {
	ChatStreamProvider,
	useChatStream,
	useChatStreamDispatch,
} from "@/features/chat/components/chat-stream-provider"
import { MultimodalInput } from "@/features/chat/components/multimodal-input"
import * as StreamBridgeModule from "@/features/chat/components/stream-bridge"
import type { ChatSessionValue, DataPart, VisibilityType } from "@/features/chat/types/chat.types"
import type { ModelMetadata } from "@/lib/types/model.types"

const {
	mockUseChatSession,
	mockUseChatSideEffects,
	mockUseChatSessionContext,
	mockArtifactSetState,
	mockArtifactReset,
} = vi.hoisted(() => ({
	mockUseChatSession: vi.fn(),
	mockUseChatSideEffects: vi.fn(),
	mockUseChatSessionContext: vi.fn(),
	mockArtifactSetState: vi.fn(),
	mockArtifactReset: vi.fn(),
}))

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => "/",
	useSearchParams: () => ({ get: vi.fn() }),
	useParams: () => ({ id: "test-chat-id" }),
}))

vi.mock("server-only", () => ({}))

vi.mock("next/dynamic", () => ({
	default: () => {
		function DynamicStub() {
			return <div data-testid="artifact-panel" />
		}
		return DynamicStub
	},
}))

vi.mock("@/features/chat/hooks/use-chat-session", () => ({
	useChatSession: (...args: unknown[]) => mockUseChatSession(...args),
}))

vi.mock("@/features/chat/hooks/use-chat-side-effects", () => ({
	useChatSideEffects: (...args: unknown[]) => mockUseChatSideEffects(...args),
}))

vi.mock("@/features/chat/hooks/use-chat-session-context", async () => {
	const { createContext } = await import("react")

	return {
		ChatSessionContext: createContext(undefined),
		useChatSessionContext: () => mockUseChatSessionContext(),
	}
})

vi.mock("@/features/artifacts/lib/artifact-store", () => ({
	artifactStore: {
		setState: (...args: unknown[]) => mockArtifactSetState(...args),
		reset: (...args: unknown[]) => mockArtifactReset(...args),
	},
}))

vi.mock("@/features/chat/components/chat-header", () => ({
	ChatHeader: () => <div data-testid="chat-header" />,
}))

vi.mock("@/features/chat/components/messages", () => ({
	Messages: () => <div data-testid="messages" />,
}))

vi.mock("@/features/chat/components/context-display", () => ({
	ContextDisplay: ({ usedTokens, maxTokens }: { usedTokens: number; maxTokens: number }) => (
		<div data-testid="context-display">{`${usedTokens}/${maxTokens}`}</div>
	),
}))

vi.mock("@/features/models/components/model-selector", () => ({
	ModelSelector: ({ selectedModelId }: { selectedModelId: string }) => (
		<div data-testid="model-selector">{selectedModelId}</div>
	),
}))

vi.mock("@/components/ai-elements/prompt-input", () => ({
	PromptInputProvider: ({
		children,
		initialInput,
	}: {
		children: ReactNode
		initialInput?: string
	}) => (
		<div data-testid="prompt-input-provider" data-initial-input={initialInput ?? ""}>
			{children}
		</div>
	),
	usePromptInputController: () => ({
		textInput: {
			value: mockUseChatSessionContext().input,
			setInput: vi.fn(),
			clear: vi.fn(),
		},
	}),
	PromptInput: ({
		children,
		onSubmit,
	}: {
		children: ReactNode
		onSubmit: (message: { text: string; files: FileUIPart[] }) => void
	}) => (
		<div data-testid="prompt-input-root">
			{children}
			<button
				type="button"
				data-testid="prompt-input-trigger-submit"
				onClick={() =>
					onSubmit({
						text: "mock prompt text",
						files: [
							{
								type: "file",
								mediaType: "image/png",
								url: "https://example.com/mock.png",
								filename: "mock.png",
							},
						],
					})
				}
			>
				trigger-submit
			</button>
		</div>
	),
	PromptInputActionAddAttachments: () => <button type="button">add-attachments</button>,
	PromptInputActionMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	PromptInputActionMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	PromptInputActionMenuTrigger: ({ tooltip }: { tooltip?: string }) => (
		<button type="button">{tooltip ?? "menu-trigger"}</button>
	),
	PromptInputFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	PromptInputSubmit: ({
		"data-testid": dataTestId,
		disabled,
		onStop,
	}: {
		"data-testid"?: string
		disabled?: boolean
		onStop?: () => void
	}) => (
		<button
			type="button"
			data-testid={dataTestId ?? "send-button"}
			disabled={disabled}
			onClick={onStop}
		>
			submit
		</button>
	),
	PromptInputTextarea: ({
		"data-testid": dataTestId,
		placeholder,
	}: {
		"data-testid"?: string
		placeholder?: string
	}) => (
		<textarea
			data-testid={dataTestId ?? "prompt-input-textarea"}
			placeholder={placeholder}
			aria-label="prompt-input-textarea"
		/>
	),
	PromptInputTools: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

function createModel(id: string, contextWindow = 0): ModelMetadata {
	return {
		id,
		provider: "openai",
		providerModelId: "gpt-test",
		name: "Test Model",
		supportsToolCalling: true,
		supportsReasoning: false,
		modalities: { input: ["text"], output: ["text"] },
		contextWindow,
		maxOutputTokens: 4096,
		source: "static",
	}
}

function createMessage(id: string, text: string, role: "user" | "assistant" = "user"): UIMessage {
	return {
		id,
		role,
		parts: [{ type: "text", text }],
	}
}

function createSessionValue(overrides: Partial<ChatSessionValue> = {}): ChatSessionValue {
	const baseModel = createModel("model-1", 0)

	return {
		chatId: "chat-1",
		chatModel: "model-1",
		setChatModel: vi.fn(),
		isReadonly: false,
		messages: [],
		status: "ready",
		input: "",
		setInput: vi.fn(),
		attachments: [],
		setAttachments: vi.fn() as ChatSessionValue["setAttachments"],
		sendMessage: vi.fn(),
		stop: vi.fn(),
		appendMessage: vi.fn(),
		editMessage: vi.fn(async () => undefined),
		error: undefined,
		clearError: vi.fn(),
		visibility: "private" as VisibilityType,
		setVisibility: vi.fn(),
		availableModels: [baseModel],
		usage: undefined,
		...overrides,
	}
}

describe("ChatStreamProvider", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it("renders children", () => {
		render(
			<ChatStreamProvider>
				<div>child content</div>
			</ChatStreamProvider>,
		)

		expect(screen.getByText("child content")).toBeInTheDocument()
	})

	it("throws outside provider", () => {
		expect(() => renderHook(() => useChatStream())).toThrowError(
			"useChatStream must be used within a ChatStreamProvider",
		)
		expect(() => renderHook(() => useChatStreamDispatch())).toThrowError(
			"useChatStreamDispatch must be used within a ChatStreamProvider",
		)
	})

	it("batches array updates through requestAnimationFrame", () => {
		const callbacks = new Map<number, FrameRequestCallback>()
		let rafId = 0

		vi.stubGlobal(
			"requestAnimationFrame",
			vi.fn((callback: FrameRequestCallback) => {
				rafId += 1
				callbacks.set(rafId, callback)
				return rafId
			}),
		)
		vi.stubGlobal(
			"cancelAnimationFrame",
			vi.fn((id: number) => {
				callbacks.delete(id)
			}),
		)

		function BatchPushProbe() {
			const { setChatStream } = useChatStreamDispatch()
			const { chatStream } = useChatStream()

			useEffect(() => {
				setChatStream([{ type: "artifact-id", content: "artifact-1" }])
				setChatStream([{ type: "artifact-title", content: "Draft" }])
			}, [setChatStream])

			return <output data-testid="stream-count">{chatStream.length}</output>
		}

		render(
			<ChatStreamProvider>
				<BatchPushProbe />
			</ChatStreamProvider>,
		)

		expect(screen.getByTestId("stream-count").textContent).toBe("0")
		expect(requestAnimationFrame).toHaveBeenCalledTimes(1)

		act(() => {
			for (const [, callback] of callbacks) {
				callback(0)
			}
		})

		expect(screen.getByTestId("stream-count").textContent).toBe("2")
	})

	it("cancels pending animation frame on unmount", () => {
		vi.stubGlobal(
			"requestAnimationFrame",
			vi.fn(() => 42),
		)
		vi.stubGlobal("cancelAnimationFrame", vi.fn())

		function PushOnce() {
			const { setChatStream } = useChatStreamDispatch()

			useEffect(() => {
				setChatStream([{ type: "artifact-id", content: "artifact-1" }])
			}, [setChatStream])

			return null
		}

		const { unmount } = render(
			<ChatStreamProvider>
				<PushOnce />
			</ChatStreamProvider>,
		)

		unmount()

		expect(cancelAnimationFrame).toHaveBeenCalledWith(42)
	})
})

describe("StreamBridge", () => {
	function StreamBridgeHarness({
		chatId,
		parts,
		onArtifactDelta,
	}: {
		chatId: string
		parts: DataPart[]
		onArtifactDelta: (artifact: unknown) => void
	}) {
		const { setChatStream } = useChatStreamDispatch()

		useEffect(() => {
			setChatStream(() => parts)
		}, [parts, setChatStream])

		return <StreamBridgeModule.StreamBridge chatId={chatId} onArtifactDelta={onArtifactDelta} />
	}

	it("renders null output without crashing", () => {
		const onArtifactDelta = vi.fn()
		const { container } = render(
			<ChatStreamProvider>
				<StreamBridgeHarness chatId="chat-1" parts={[]} onArtifactDelta={onArtifactDelta} />
			</ChatStreamProvider>,
		)

		expect(container).toBeDefined()
		expect(onArtifactDelta).not.toHaveBeenCalled()
	})

	it("processes incoming stream deltas and emits resolved artifact state", async () => {
		const onArtifactDelta = vi.fn()
		const parts: DataPart[] = [
			{ type: "artifact-id", content: "artifact-1" },
			{ type: "artifact-title", content: "Draft Artifact" },
			{ type: "artifact-textDelta", content: "Hello" },
		]

		render(
			<ChatStreamProvider>
				<StreamBridgeHarness
					chatId="chat-1"
					parts={parts}
					onArtifactDelta={onArtifactDelta}
				/>
			</ChatStreamProvider>,
		)

		await waitFor(() => {
			expect(onArtifactDelta).toHaveBeenCalledTimes(3)
		})

		expect(onArtifactDelta).toHaveBeenLastCalledWith(
			expect.objectContaining({
				artifactId: "artifact-1",
				title: "Draft Artifact",
				content: "Hello",
				status: "streaming",
				isVisible: true,
			}),
		)
	})

	it("resets artifact accumulation when chatId changes", async () => {
		const onArtifactDelta = vi.fn()

		const { rerender } = render(
			<ChatStreamProvider>
				<StreamBridgeHarness
					chatId="chat-a"
					parts={[{ type: "artifact-id", content: "artifact-a" }]}
					onArtifactDelta={onArtifactDelta}
				/>
			</ChatStreamProvider>,
		)

		await waitFor(() => {
			expect(onArtifactDelta).toHaveBeenCalledTimes(1)
		})

		rerender(
			<ChatStreamProvider>
				<StreamBridgeHarness chatId="chat-a" parts={[]} onArtifactDelta={onArtifactDelta} />
			</ChatStreamProvider>,
		)

		onArtifactDelta.mockClear()

		rerender(
			<ChatStreamProvider>
				<StreamBridgeHarness
					chatId="chat-b"
					parts={[{ type: "artifact-title", content: "Fresh Chat" }]}
					onArtifactDelta={onArtifactDelta}
				/>
			</ChatStreamProvider>,
		)

		await waitFor(() => {
			expect(onArtifactDelta).toHaveBeenCalledTimes(1)
		})

		expect(onArtifactDelta).toHaveBeenLastCalledWith(
			expect.objectContaining({
				artifactId: "",
				title: "Fresh Chat",
			}),
		)
	})
})

describe("MultimodalInput", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock")
		globalThis.URL.revokeObjectURL = vi.fn()
	})

	it("returns null when chat is read-only", () => {
		mockUseChatSessionContext.mockReturnValue(createSessionValue({ isReadonly: true }))

		render(<MultimodalInput />)

		expect(screen.queryByTestId("multimodal-input")).not.toBeInTheDocument()
	})

	it("renders message input and keeps send disabled until text exists", () => {
		mockUseChatSessionContext.mockReturnValue(
			createSessionValue({
				status: "ready",
				input: "",
			}),
		)

		render(<MultimodalInput />)

		expect(screen.getByTestId("multimodal-input")).toBeInTheDocument()
		expect(screen.getByTestId("send-button")).toBeDisabled()
		expect(screen.getByTestId("model-selector")).toHaveTextContent("model-1")
	})

	it("enables send when the controlled prompt input already has text", () => {
		mockUseChatSessionContext.mockReturnValue(
			createSessionValue({
				status: "ready",
				input: "hello",
			}),
		)

		render(<MultimodalInput />)

		expect(screen.getByTestId("send-button")).toBeEnabled()
	})

	it("renders stop button while a response is streaming", () => {
		mockUseChatSessionContext.mockReturnValue(createSessionValue({ status: "streaming" }))

		render(<MultimodalInput />)

		expect(screen.getByTestId("stop-button")).toBeInTheDocument()
	})

	it("forwards prompt submit payload to sendMessage", () => {
		const sendMessage = vi.fn()
		mockUseChatSessionContext.mockReturnValue(createSessionValue({ sendMessage }))

		render(<MultimodalInput />)
		fireEvent.click(screen.getByTestId("prompt-input-trigger-submit"))

		expect(sendMessage).toHaveBeenCalledWith("mock prompt text", [
			{
				type: "file",
				mediaType: "image/png",
				url: "https://example.com/mock.png",
				filename: "mock.png",
			},
		])
	})

	it("shows context usage when selected model has a context window", () => {
		mockUseChatSessionContext.mockReturnValue(
			createSessionValue({
				usage: {
					inputTokens: 10,
					outputTokens: 20,
					inputTokenDetails: {
						noCacheTokens: undefined,
						cacheReadTokens: undefined,
						cacheWriteTokens: undefined,
					},
					outputTokenDetails: {
						textTokens: undefined,
						reasoningTokens: undefined,
					},
					reasoningTokens: 5,
					totalTokens: 35,
				},
				availableModels: [createModel("model-1", 32000)],
			}),
		)

		render(<MultimodalInput />)

		expect(screen.getByTestId("context-display")).toHaveTextContent("35/32000")
	})
})

describe("ChatShell", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	function renderChatShell(
		overrides: Partial<Parameters<typeof ChatShell>[0]> = {},
		sessionOverrides: Partial<ChatSessionValue> = {},
	) {
		const session = createSessionValue(sessionOverrides)
		mockUseChatSession.mockReturnValue(session)
		mockUseChatSessionContext.mockReturnValue(session)

		const props = {
			id: "chat-1",
			initialMessages: [] as UIMessage[],
			initialChatModel: "model-1",
			isReadonly: false,
			initialVisibility: "private" as VisibilityType,
			availableModels: [createModel("model-1")],
			...overrides,
		}

		const renderResult = render(
			<ChatStreamProvider>
				<ChatShell {...props} />
			</ChatStreamProvider>,
		)

		return {
			...renderResult,
			session,
		}
	}

	it("renders chat header, messages, and writable input shell", () => {
		renderChatShell()

		expect(screen.getByTestId("chat-header")).toBeInTheDocument()
		expect(screen.getByTestId("messages")).toBeInTheDocument()
		expect(screen.getByTestId("multimodal-input")).toBeInTheDocument()
		expect(screen.getByTestId("artifact-panel")).toBeInTheDocument()
		expect(mockUseChatSideEffects).toHaveBeenCalledTimes(1)
	})

	it("hides multimodal input container when chat is read-only", () => {
		renderChatShell({ isReadonly: true })

		expect(screen.queryByTestId("multimodal-input")).not.toBeInTheDocument()
	})

	it("auto-submits initialQuery on mount when there are no initial messages", async () => {
		const sendMessage = vi.fn()
		renderChatShell(
			{
				initialQuery: "from-query",
				initialMessages: [],
			},
			{ sendMessage },
		)

		await waitFor(() => {
			expect(sendMessage).toHaveBeenCalledWith("from-query")
		})
		expect(sendMessage).toHaveBeenCalledTimes(1)
	})

	it("does not auto-submit initialQuery when initial messages already exist", async () => {
		const sendMessage = vi.fn()
		renderChatShell(
			{
				initialQuery: "from-query",
				initialMessages: [createMessage("m1", "already started")],
			},
			{
				sendMessage,
				messages: [createMessage("m1", "already started")],
			},
		)

		await waitFor(() => {
			expect(mockUseChatSession).toHaveBeenCalledTimes(1)
		})
		expect(sendMessage).not.toHaveBeenCalled()
	})
})
