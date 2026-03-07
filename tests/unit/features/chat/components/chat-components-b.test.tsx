// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { UIMessage } from "ai"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ChatMessage, ThinkingMessage } from "@/features/chat/components/message"
import { MessageActions as ChatMessageActions } from "@/features/chat/components/message-actions"
import { MessageEditor } from "@/features/chat/components/message-editor"
import { MessageReasoning } from "@/features/chat/components/message-reasoning"
import { Messages } from "@/features/chat/components/messages"
import type { ChatSessionValue } from "@/features/chat/types/chat.types"

const {
	mockUseChatSessionContext,
	mockUseScrollToBottom,
	mockUseVoteForMessage,
	mockToastError,
	mockToastSuccess,
	mockDeleteTrailingMessages,
} = vi.hoisted(() => ({
	mockUseChatSessionContext: vi.fn(),
	mockUseScrollToBottom: vi.fn(),
	mockUseVoteForMessage: vi.fn(),
	mockToastError: vi.fn(),
	mockToastSuccess: vi.fn(),
	mockDeleteTrailingMessages: vi.fn(),
}))

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
	usePathname: () => "/",
}))

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) =>
		React.createElement("a", { href }, children),
}))

vi.mock("server-only", () => ({}))

vi.mock("@/features/chat/actions/delete-trailing-messages", () => ({
	deleteTrailingMessages: (...args: unknown[]) => mockDeleteTrailingMessages(...args),
}))

vi.mock("@/features/chat/hooks/use-chat-session-context", () => ({
	useChatSessionContext: () => mockUseChatSessionContext(),
}))

vi.mock("@/features/chat/hooks/use-scroll-to-bottom", () => ({
	useScrollToBottom: () => mockUseScrollToBottom(),
}))

vi.mock("@/features/voting/components/vote-resolver", () => ({
	useVoteForMessage: (messageId: string) => mockUseVoteForMessage(messageId),
}))

vi.mock("@/features/voting/components/vote-buttons", () => ({
	VoteButtons: ({ messageId }: { messageId: string }) =>
		React.createElement("div", { "data-testid": "vote-buttons" }, `vote:${messageId}`),
}))

vi.mock("sonner", () => ({
	toast: {
		error: (...args: unknown[]) => mockToastError(...args),
		success: (...args: unknown[]) => mockToastSuccess(...args),
	},
}))

vi.mock("lucide-react", () => ({
	ArrowDownIcon: ({ className }: { className?: string }) =>
		React.createElement("span", { className, "data-testid": "arrow-down-icon" }, "Down"),
}))

vi.mock("@/components/icons", () => ({
	SparklesIcon: ({ size }: { size?: number }) =>
		React.createElement(
			"span",
			{ "data-testid": "sparkles-icon", "data-size": size },
			"Sparkles",
		),
	CopyIcon: () => React.createElement("span", { "data-testid": "copy-icon" }, "Copy"),
	PencilEditIcon: () =>
		React.createElement("span", { "data-testid": "pencil-edit-icon" }, "Edit"),
}))

vi.mock("@/components/ai-elements/attachments", () => ({
	Attachment: ({ children }: { children?: React.ReactNode }) =>
		React.createElement("div", { "data-testid": "attachment-item" }, children),
	AttachmentPreview: () =>
		React.createElement("div", { "data-testid": "attachment-preview" }, "Attachment preview"),
}))

vi.mock("@/components/ai-elements/message", () => ({
	MessageContent: ({
		children,
		...props
	}: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
		React.createElement("div", props, children),
	MessageResponse: ({ children }: { children?: React.ReactNode }) =>
		React.createElement("span", null, children),
	MessageAction: ({
		children,
		onClick,
		tooltip,
		type: _type,
		...props
	}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
		children?: React.ReactNode
		tooltip?: string
	}) =>
		React.createElement(
			"button",
			{
				...props,
				type: "button",
				"aria-label": tooltip ?? "Message action",
				onClick,
			},
			children,
		),
	MessageActions: ({
		children,
		...props
	}: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
		React.createElement("div", props, children),
}))

vi.mock("@/components/ai-elements/tool", () => ({
	Tool: ({ children }: { children?: React.ReactNode }) =>
		React.createElement("section", { "data-testid": "tool-wrapper" }, children),
	ToolHeader: ({ title, state }: { title: string; state: string }) =>
		React.createElement("div", { "data-testid": "tool-header" }, `${title}:${state}`),
	ToolContent: ({ children }: { children?: React.ReactNode }) =>
		React.createElement("div", { "data-testid": "tool-content" }, children),
	ToolInput: ({ input }: { input: unknown }) =>
		React.createElement("pre", { "data-testid": "tool-input" }, JSON.stringify(input)),
	ToolOutput: ({ output, errorText }: { output?: unknown; errorText?: string }) =>
		React.createElement(
			"pre",
			{ "data-testid": "tool-output" },
			errorText ?? JSON.stringify(output),
		),
}))

vi.mock("@/components/ai-elements/reasoning", () => ({
	Reasoning: ({
		children,
		defaultOpen,
		isStreaming,
		...props
	}: React.HTMLAttributes<HTMLDivElement> & {
		children?: React.ReactNode
		defaultOpen?: boolean
		isStreaming?: boolean
	}) =>
		React.createElement(
			"div",
			{
				...props,
				"data-default-open": String(Boolean(defaultOpen)),
				"data-is-streaming": String(Boolean(isStreaming)),
			},
			children,
		),
	ReasoningTrigger: () => React.createElement("button", { type: "button" }, "Reasoning trigger"),
	ReasoningContent: ({ children }: { children?: React.ReactNode }) =>
		React.createElement("div", null, children),
}))

vi.mock("@/features/artifacts/components/artifact-preview", () => ({
	ArtifactPreview: ({
		args,
		result,
	}: {
		args?: { title?: string }
		result?: { title?: string }
	}) =>
		React.createElement(
			"div",
			{ "data-testid": "artifact-preview" },
			`${args?.title ?? "no-args"}|${result?.title ?? "no-result"}`,
		),
}))

let mockClipboardWriteText = vi.fn()

function createMockMessage(
	overrides: Partial<UIMessage> & {
		parts?: unknown[]
	} = {},
): UIMessage {
	const { parts, ...rest } = overrides

	return {
		id: "msg-1",
		role: "user",
		parts: (parts ?? [{ type: "text", text: "Hello world" }]) as UIMessage["parts"],
		...rest,
	} as UIMessage
}

function createChatSessionValue(overrides: Partial<ChatSessionValue> = {}): ChatSessionValue {
	return {
		chatId: "chat-1",
		chatModel: "test-model",
		setChatModel: vi.fn(),
		isReadonly: false,
		messages: [],
		status: "ready",
		input: "",
		setInput: vi.fn(),
		sendMessage: vi.fn(),
		stop: vi.fn(),
		appendMessage: vi.fn(),
		editMessage: vi.fn().mockResolvedValue(undefined),
		error: undefined,
		clearError: vi.fn(),
		visibility: "private",
		setVisibility: vi.fn(),
		availableModels: [],
		usage: undefined,
		...overrides,
	}
}

function setChatSessionContext(overrides: Partial<ChatSessionValue> = {}): ChatSessionValue {
	const value = createChatSessionValue(overrides)
	mockUseChatSessionContext.mockReturnValue(value)
	return value
}

function setScrollState(
	overrides: Partial<{ isAtBottom: boolean; scrollToBottom: () => void }> = {},
) {
	const value = {
		containerRef: { current: null as HTMLDivElement | null },
		endRef: { current: null as HTMLDivElement | null },
		isAtBottom: true,
		scrollToBottom: vi.fn(),
		...overrides,
	}
	mockUseScrollToBottom.mockReturnValue(value)
	return value
}

beforeEach(() => {
	vi.clearAllMocks()

	mockDeleteTrailingMessages.mockResolvedValue({ success: true })
	mockUseVoteForMessage.mockReturnValue({
		vote: undefined,
		submitVote: vi.fn(),
	})

	setChatSessionContext()
	setScrollState()

	mockClipboardWriteText = vi.fn().mockResolvedValue(undefined)
	Object.defineProperty(window.navigator, "clipboard", {
		value: { writeText: mockClipboardWriteText },
		configurable: true,
	})
})

describe("message.tsx", () => {
	it("renders a user message with sanitized text and file attachment preview", () => {
		const message = createMockMessage({
			id: "user-msg-1",
			role: "user",
			parts: [
				{ type: "text", text: "<has_function_call>Hello world" },
				{
					type: "file",
					url: "https://example.com/file.txt",
					mediaType: "text/plain",
					name: "file.txt",
				},
			],
		})

		render(<ChatMessage isLoading={false} message={message} />)

		expect(screen.getByTestId("message-user")).toBeInTheDocument()
		expect(screen.getByTestId("message-attachments")).toBeInTheDocument()
		expect(screen.getByText("Hello world")).toBeInTheDocument()
		expect(screen.queryByText("<has_function_call>Hello world")).not.toBeInTheDocument()
	})

	it("renders assistant reasoning, generic tool states, artifact preview, and artifact error", () => {
		const message = createMockMessage({
			id: "assistant-msg-1",
			role: "assistant",
			parts: [
				{ type: "reasoning", text: "Reasoning in progress" },
				{ type: "text", text: "Assistant response" },
				{
					type: "tool-getWeather",
					toolCallId: "tool-1",
					state: "input-available",
					input: { city: "Tokyo" },
				},
				{
					type: "tool-getWeather",
					toolCallId: "tool-2",
					state: "output-available",
					input: { city: "Tokyo" },
					output: { temperature: 22 },
				},
				{
					type: "tool-getWeather",
					toolCallId: "tool-3",
					state: "output-error",
					input: { city: "Tokyo" },
					errorText: "tool failed",
				},
				{
					type: "tool-createArtifact",
					toolCallId: "tool-4",
					state: "output-available",
					input: { title: "Plan" },
					output: { title: "Plan result" },
				},
				{
					type: "tool-updateArtifact",
					toolCallId: "tool-5",
					state: "output-error",
					input: { title: "Plan" },
					errorText: "artifact failed",
				},
			],
		})

		render(<ChatMessage isLoading={true} message={message} />)

		expect(screen.getByTestId("message-assistant")).toBeInTheDocument()
		expect(screen.getByTestId("sparkles-icon")).toBeInTheDocument()
		expect(screen.getByText("Reasoning in progress")).toBeInTheDocument()
		expect(screen.getByText("getWeather:input-available")).toBeInTheDocument()
		expect(screen.getByText("getWeather:output-available")).toBeInTheDocument()
		expect(screen.getByText("getWeather:output-error")).toBeInTheDocument()
		expect(screen.getByText('{"city":"Tokyo"}')).toBeInTheDocument()
		expect(screen.getByText('{"temperature":22}')).toBeInTheDocument()
		expect(screen.getByText("tool failed")).toBeInTheDocument()
		expect(screen.getByTestId("artifact-preview")).toHaveTextContent("Plan|Plan result")
		expect(screen.getByText("Error: artifact failed")).toBeInTheDocument()
	})

	it("renders the thinking indicator component", () => {
		render(<ThinkingMessage />)

		expect(screen.getByTestId("message-assistant-loading")).toBeInTheDocument()
		expect(screen.getByText("Thinking...")).toBeInTheDocument()
	})

	it("renders artifact tool errors from output payload and unknown fallback", () => {
		const artifactFallbackParts = [
			{
				type: "tool-updateArtifact",
				toolCallId: "artifact-output-error",
				state: "output-error",
				output: { error: "artifact payload failure" },
			},
			{
				type: "tool-createArtifact",
				toolCallId: "artifact-unknown-error",
				state: "output-error",
			},
		] as unknown as UIMessage["parts"]

		const message = createMockMessage({
			id: "assistant-artifact-fallback-errors",
			role: "assistant",
			parts: artifactFallbackParts,
		})

		render(<ChatMessage isLoading={false} message={message} />)

		expect(screen.getByText("Error: artifact payload failure")).toBeInTheDocument()
		expect(screen.getByText("Error: Unknown error")).toBeInTheDocument()
	})

	it("exercises chat message memo comparator across stable and changed rerenders", () => {
		const initialMessage = createMockMessage({
			id: "assistant-memo-1",
			role: "assistant",
			parts: [{ type: "text", text: "Memo baseline" }],
		})

		const { rerender } = render(<ChatMessage isLoading={false} message={initialMessage} />)

		const stableClone = createMockMessage({
			id: "assistant-memo-1",
			role: "assistant",
			parts: [{ type: "text", text: "Memo baseline" }],
		})
		rerender(<ChatMessage isLoading={false} message={stableClone} />)

		const differentIdMessage = createMockMessage({
			id: "assistant-memo-2",
			role: "assistant",
			parts: [{ type: "text", text: "Memo baseline" }],
		})
		rerender(<ChatMessage isLoading={false} message={differentIdMessage} />)

		const differentPartsMessage = createMockMessage({
			id: "assistant-memo-2",
			role: "assistant",
			parts: [{ type: "text", text: "Memo changed" }],
		})
		rerender(<ChatMessage isLoading={false} message={differentPartsMessage} />)
		rerender(<ChatMessage isLoading={true} message={differentPartsMessage} />)

		expect(screen.getByText("Memo changed")).toBeInTheDocument()
	})
})

describe("messages.tsx", () => {
	it("renders empty state with greeting and suggested actions", () => {
		setChatSessionContext({
			messages: [],
			status: "ready",
			chatId: "chat-empty",
		})

		render(<Messages />)

		expect(screen.getByTestId("messages-empty")).toBeInTheDocument()
		expect(screen.getByText("Hello there!")).toBeInTheDocument()
		expect(screen.getByTestId("suggested-actions")).toBeInTheDocument()
	})

	it("renders message list and submitted thinking state", () => {
		setChatSessionContext({
			messages: [
				createMockMessage({
					id: "user-1",
					role: "user",
					parts: [{ type: "text", text: "Hi" }],
				}),
				createMockMessage({
					id: "assistant-1",
					role: "assistant",
					parts: [{ type: "text", text: "Hello" }],
				}),
			],
			status: "submitted",
		})

		render(<Messages />)

		expect(screen.getByTestId("messages-list")).toBeInTheDocument()
		expect(screen.getByTestId("message-user")).toBeInTheDocument()
		expect(screen.getByTestId("message-assistant")).toBeInTheDocument()
		expect(screen.getByTestId("message-assistant-loading")).toBeInTheDocument()
	})

	it("shows scroll button when not at bottom and calls scroll handler on click", () => {
		const scrollToBottom = vi.fn()
		setChatSessionContext({
			messages: [createMockMessage({ id: "user-2", role: "user" })],
			status: "ready",
		})
		setScrollState({
			isAtBottom: false,
			scrollToBottom,
		})

		render(<Messages />)

		fireEvent.click(screen.getByRole("button", { name: "Scroll to bottom" }))
		expect(scrollToBottom).toHaveBeenCalledTimes(1)
	})

	it("switches a user message into edit mode when edit action is clicked", () => {
		setChatSessionContext({
			messages: [
				createMockMessage({
					id: "user-edit-1",
					role: "user",
					parts: [{ type: "text", text: "Editable message" }],
				}),
			],
			status: "ready",
			isReadonly: false,
		})

		render(<Messages />)

		fireEvent.click(screen.getByRole("button", { name: "Edit" }))
		expect(screen.getByTestId("message-editor")).toBeInTheDocument()
	})

	it("re-renders message items with stable props to exercise memo comparator", () => {
		const stableMessage = createMockMessage({
			id: "assistant-message-item-memo",
			role: "assistant",
			parts: [{ type: "text", text: "Stable memo message" }],
		})
		const TestableMessages = Messages as unknown as React.ComponentType<{
			coverageTick: number
		}>

		setChatSessionContext({
			messages: [stableMessage],
			status: "ready",
			isReadonly: false,
		})

		const { rerender } = render(<TestableMessages coverageTick={1} />)

		setChatSessionContext({
			messages: [stableMessage],
			status: "ready",
			isReadonly: false,
		})

		rerender(<TestableMessages coverageTick={2} />)

		expect(screen.getByText("Stable memo message")).toBeInTheDocument()
	})
})

describe("message-actions.tsx", () => {
	it("returns null while chat is loading", () => {
		setChatSessionContext({ status: "streaming" })

		const { container } = render(
			<ChatMessageActions message={createMockMessage({ role: "user" })} setMode={vi.fn()} />,
		)

		expect(container).toBeEmptyDOMElement()
	})

	it("renders user actions, supports edit, and copies text successfully", async () => {
		const setMode = vi.fn()
		setChatSessionContext({ status: "ready", isReadonly: false })
		const message = createMockMessage({
			id: "user-copy-1",
			role: "user",
			parts: [{ type: "text", text: "Copy this text" }],
		})

		render(<ChatMessageActions message={message} setMode={setMode} />)

		fireEvent.click(screen.getByRole("button", { name: "Edit" }))
		expect(setMode).toHaveBeenCalledWith("edit")

		fireEvent.click(screen.getByRole("button", { name: "Copy" }))

		await waitFor(() => {
			expect(mockClipboardWriteText).toHaveBeenCalledWith("Copy this text")
		})
		expect(mockToastSuccess).toHaveBeenCalledWith("Copied to clipboard!")
	})

	it("shows an error toast when user message has no copyable text", () => {
		setChatSessionContext({ status: "ready", isReadonly: false })
		const message = createMockMessage({
			id: "user-no-text",
			role: "user",
			parts: [{ type: "file", url: "https://example.com/a.png", mediaType: "image/png" }],
		})

		render(<ChatMessageActions message={message} setMode={vi.fn()} />)

		fireEvent.click(screen.getByRole("button", { name: "Copy" }))

		expect(mockClipboardWriteText).not.toHaveBeenCalled()
		expect(mockToastError).toHaveBeenCalledWith("There's no text to copy!")
	})

	it("renders assistant vote controls when writable and handles copy failure", async () => {
		setChatSessionContext({ status: "ready", isReadonly: false })
		mockClipboardWriteText.mockRejectedValueOnce(new Error("clipboard denied"))
		const message = createMockMessage({
			id: "assistant-copy-1",
			role: "assistant",
			parts: [{ type: "text", text: "Assistant output" }],
		})

		render(<ChatMessageActions message={message} />)

		expect(screen.getByTestId("vote-buttons")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Copy" }))

		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalledWith("Failed to copy to clipboard")
		})
	})

	it("hides assistant vote controls in readonly mode", () => {
		setChatSessionContext({ status: "ready", isReadonly: true })
		const message = createMockMessage({
			id: "assistant-readonly-1",
			role: "assistant",
			parts: [{ type: "text", text: "Assistant output" }],
		})

		render(<ChatMessageActions message={message} />)

		expect(screen.queryByTestId("vote-buttons")).not.toBeInTheDocument()
	})

	it("re-renders with stable props to exercise memo comparator", () => {
		setChatSessionContext({ status: "ready", isReadonly: false })
		const message = createMockMessage({
			id: "assistant-actions-memo",
			role: "assistant",
			parts: [{ type: "text", text: "Comparator text" }],
		})
		const setMode = vi.fn()

		const { rerender } = render(<ChatMessageActions message={message} setMode={setMode} />)

		rerender(<ChatMessageActions message={message} setMode={setMode} />)

		expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument()
	})
})

describe("message-editor.tsx", () => {
	it("renders initial message text and cancels editing", () => {
		const setMode = vi.fn()
		setChatSessionContext({
			editMessage: vi.fn().mockResolvedValue(undefined),
		})

		render(
			<MessageEditor
				message={createMockMessage({
					id: "editor-1",
					parts: [{ type: "text", text: "Initial editor content" }],
				})}
				setMode={setMode}
			/>,
		)

		const textarea = screen.getByTestId("message-editor") as HTMLTextAreaElement
		expect(textarea.value).toBe("Initial editor content")

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
		expect(setMode).toHaveBeenCalledWith("view")
	})

	it("submits edited content from send button", async () => {
		const editMessage = vi.fn().mockResolvedValue(undefined)
		const setMode = vi.fn()
		setChatSessionContext({ editMessage })

		render(
			<MessageEditor
				message={createMockMessage({
					id: "editor-2",
					parts: [{ type: "text", text: "Before" }],
				})}
				setMode={setMode}
			/>,
		)

		const textarea = screen.getByTestId("message-editor") as HTMLTextAreaElement
		fireEvent.change(textarea, { target: { value: "After" } })
		fireEvent.click(screen.getByRole("button", { name: "Send" }))

		await waitFor(() => {
			expect(editMessage).toHaveBeenCalledWith("editor-2", "After")
		})
		expect(setMode).toHaveBeenCalledWith("view")
	})

	it("submits via Enter key, but not when draft is blank", async () => {
		const editMessage = vi.fn().mockResolvedValue(undefined)
		setChatSessionContext({ editMessage })

		render(
			<MessageEditor
				message={createMockMessage({
					id: "editor-3",
					parts: [{ type: "text", text: "Body" }],
				})}
				setMode={vi.fn()}
			/>,
		)

		const textarea = screen.getByTestId("message-editor") as HTMLTextAreaElement
		fireEvent.change(textarea, { target: { value: "Keyboard submit" } })
		fireEvent.keyDown(textarea, { key: "Enter" })

		await waitFor(() => {
			expect(editMessage).toHaveBeenCalledWith("editor-3", "Keyboard submit")
		})

		editMessage.mockClear()
		fireEvent.change(textarea, { target: { value: "   " } })
		fireEvent.keyDown(textarea, { key: "Enter" })
		expect(editMessage).not.toHaveBeenCalled()
	})

	it("handles escape cancel and submit failure", async () => {
		const setMode = vi.fn()
		const editMessage = vi.fn().mockRejectedValue(new Error("edit failed"))
		setChatSessionContext({ editMessage })

		render(
			<MessageEditor
				message={createMockMessage({
					id: "editor-4",
					parts: [{ type: "text", text: "Draft" }],
				})}
				setMode={setMode}
			/>,
		)

		const textarea = screen.getByTestId("message-editor") as HTMLTextAreaElement
		fireEvent.keyDown(textarea, { key: "Escape" })
		expect(setMode).toHaveBeenCalledWith("view")

		fireEvent.click(screen.getByRole("button", { name: "Send" }))
		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalledWith("Failed to edit message")
		})
	})
})

describe("message-reasoning.tsx", () => {
	it("starts closed when not loading", () => {
		render(<MessageReasoning isLoading={false} reasoning="Static reasoning" />)

		expect(screen.getByTestId("message-reasoning")).toHaveAttribute(
			"data-default-open",
			"false",
		)
		expect(screen.getByTestId("message-reasoning")).toHaveAttribute(
			"data-is-streaming",
			"false",
		)
	})

	it("tracks reasoning stream state when content changes during loading", async () => {
		const { rerender } = render(<MessageReasoning isLoading={true} reasoning="Step 1" />)

		expect(screen.getByTestId("message-reasoning")).toHaveAttribute("data-default-open", "true")
		expect(screen.getByTestId("message-reasoning")).toHaveAttribute(
			"data-is-streaming",
			"false",
		)

		rerender(<MessageReasoning isLoading={true} reasoning="Step 1 and step 2" />)
		await waitFor(() => {
			expect(screen.getByText("Step 1 and step 2")).toBeInTheDocument()
		})
		expect(screen.getByTestId("message-reasoning")).toHaveAttribute(
			"data-is-streaming",
			"false",
		)

		rerender(<MessageReasoning isLoading={false} reasoning="Step 1 and step 2" />)
		await waitFor(() => {
			expect(screen.getByTestId("message-reasoning")).toHaveAttribute(
				"data-is-streaming",
				"false",
			)
		})
	})
})
