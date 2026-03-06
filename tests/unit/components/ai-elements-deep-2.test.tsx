// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type MockElementProps = {
	children?: React.ReactNode
	[key: string]: unknown
}

const { stickContext, streamdownRenderSpy } = vi.hoisted(() => ({
	stickContext: {
		isAtBottom: true,
		scrollToBottom: vi.fn(),
	},
	streamdownRenderSpy: vi.fn(),
}))

vi.mock("framer-motion", () => ({
	motion: new Proxy(
		{},
		{
			get:
				(_target, tag) =>
				({ children, ...props }: MockElementProps) =>
					React.createElement(String(tag), props, children),
		},
	),
	AnimatePresence: ({ children }: MockElementProps) => children,
}))

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
	usePathname: () => "/",
}))

vi.mock("@/components/ui/tooltip", () => ({
	TooltipProvider: ({ children, ...props }: MockElementProps) =>
		React.createElement("div", { "data-testid": "tooltip-provider", ...props }, children),
	Tooltip: ({ children, ...props }: MockElementProps) =>
		React.createElement("div", { "data-testid": "tooltip", ...props }, children),
	TooltipTrigger: ({ children }: MockElementProps) => children,
	TooltipContent: ({ children, ...props }: MockElementProps) =>
		React.createElement("div", { "data-testid": "tooltip-content", ...props }, children),
}))

vi.mock("@streamdown/cjk", () => ({ cjk: { plugin: "cjk" } }))
vi.mock("@streamdown/code", () => ({ code: { plugin: "code" } }))
vi.mock("@streamdown/math", () => ({ math: { plugin: "math" } }))
vi.mock("@streamdown/mermaid", () => ({ mermaid: { plugin: "mermaid" } }))

vi.mock("streamdown", () => ({
	Streamdown: ({ children, ...props }: MockElementProps) => {
		streamdownRenderSpy({ children, ...props })
		return React.createElement("div", { "data-testid": "streamdown", ...props }, children)
	},
}))

vi.mock("use-stick-to-bottom", () => {
	const StickToBottom = Object.assign(
		({ children, ...props }: MockElementProps) =>
			React.createElement("div", { "data-testid": "stick-to-bottom", ...props }, children),
		{
			Content: ({ children, ...props }: MockElementProps) =>
				React.createElement(
					"div",
					{ "data-testid": "stick-to-bottom-content", ...props },
					children,
				),
		},
	)

	return {
		StickToBottom,
		useStickToBottomContext: () => stickContext,
	}
})

import {
	Conversation,
	ConversationContent,
	ConversationDownload,
	ConversationEmptyState,
	ConversationScrollButton,
	messagesToMarkdown,
} from "@/components/ai-elements/conversation"
import {
	Message,
	MessageAction,
	MessageActions,
	MessageBranch,
	MessageBranchContent,
	MessageBranchNext,
	MessageBranchPage,
	MessageBranchPrevious,
	MessageBranchSelector,
	MessageContent,
	MessageResponse,
	MessageToolbar,
} from "@/components/ai-elements/message"

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

beforeEach(() => {
	stickContext.isAtBottom = true
	stickContext.scrollToBottom.mockReset()
	streamdownRenderSpy.mockClear()
})

afterEach(() => {
	Object.defineProperty(URL, "createObjectURL", {
		configurable: true,
		value: originalCreateObjectURL,
		writable: true,
	})
	Object.defineProperty(URL, "revokeObjectURL", {
		configurable: true,
		value: originalRevokeObjectURL,
		writable: true,
	})
	vi.restoreAllMocks()
})

describe("ai-elements/message deep coverage", () => {
	it("applies role-specific message classes", () => {
		const { rerender } = render(<Message data-testid="message" from="user" />)

		const element = screen.getByTestId("message")
		expect(element).toHaveClass("is-user")
		expect(element).not.toHaveClass("is-assistant")

		rerender(<Message data-testid="message" from="assistant" />)
		expect(element).toHaveClass("is-assistant")
		expect(element).not.toHaveClass("is-user")
	})

	it("renders MessageAction with tooltip and label fallback variants", () => {
		const { rerender } = render(
			<MessageAction label="Copy message" tooltip="Copy">
				Copy
			</MessageAction>,
		)

		expect(screen.getByTestId("tooltip-provider")).toBeInTheDocument()
		expect(screen.getByTestId("tooltip-content")).toHaveTextContent("Copy")
		expect(screen.getByText("Copy message")).toBeInTheDocument()

		rerender(<MessageAction tooltip="Retry">Retry</MessageAction>)
		expect(screen.getByText("Retry", { selector: "span" })).toBeInTheDocument()

		rerender(<MessageAction label="Approve">Approve</MessageAction>)
		expect(screen.queryByTestId("tooltip-provider")).not.toBeInTheDocument()
		expect(screen.getByText("Approve", { selector: "span" })).toBeInTheDocument()
	})

	it("throws when branch components are used outside MessageBranch", () => {
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
		expect(() => render(<MessageBranchPage />)).toThrow(
			"MessageBranch components must be used within MessageBranch",
		)
		consoleErrorSpy.mockRestore()
	})

	it("hides selector and disables branch controls when only one branch exists", async () => {
		render(
			<MessageBranch>
				<MessageBranchContent>
					<div key="only" data-testid="only-branch">
						Only branch
					</div>
				</MessageBranchContent>
				<MessageBranchSelector data-testid="selector" />
				<MessageBranchPrevious>Prev</MessageBranchPrevious>
				<MessageBranchPage />
				<MessageBranchNext>Next</MessageBranchNext>
			</MessageBranch>,
		)

		await waitFor(() => {
			expect(screen.getByText("1 of 1")).toBeInTheDocument()
		})

		expect(screen.queryByTestId("selector")).not.toBeInTheDocument()
		expect(screen.getByLabelText("Previous branch")).toBeDisabled()
		expect(screen.getByLabelText("Next branch")).toBeDisabled()
		expect(screen.getByText("Prev")).toBeInTheDocument()
		expect(screen.getByText("Next")).toBeInTheDocument()
	})

	it("navigates branches with wrap-around and calls onBranchChange", async () => {
		const onBranchChange = vi.fn()

		render(
			<MessageBranch defaultBranch={0} onBranchChange={onBranchChange}>
				<MessageBranchContent>
					<div key="a" data-testid="branch-a">
						A
					</div>
					<div key="b" data-testid="branch-b">
						B
					</div>
					<div key="c" data-testid="branch-c">
						C
					</div>
				</MessageBranchContent>
				<MessageToolbar>
					<MessageBranchSelector data-testid="selector">
						<MessageBranchPrevious />
						<MessageBranchPage />
						<MessageBranchNext />
					</MessageBranchSelector>
				</MessageToolbar>
			</MessageBranch>,
		)

		await waitFor(() => {
			expect(screen.getByText("1 of 3")).toBeInTheDocument()
		})

		expect(screen.getByTestId("selector")).toBeInTheDocument()
		expect(screen.getByLabelText("Previous branch")).not.toBeDisabled()
		expect(screen.getByLabelText("Next branch")).not.toBeDisabled()
		expect(screen.getByTestId("branch-a").parentElement).toHaveClass("block")

		fireEvent.click(screen.getByLabelText("Previous branch"))
		expect(screen.getByText("3 of 3")).toBeInTheDocument()
		expect(screen.getByTestId("branch-c").parentElement).toHaveClass("block")

		fireEvent.click(screen.getByLabelText("Next branch"))
		expect(screen.getByText("1 of 3")).toBeInTheDocument()

		fireEvent.click(screen.getByLabelText("Next branch"))
		expect(screen.getByText("2 of 3")).toBeInTheDocument()

		expect(onBranchChange.mock.calls.map(([index]) => index)).toEqual([2, 0, 1])
	})

	it("respects defaultBranch and updates branch count when child length changes", async () => {
		const BranchHarness = ({ items }: { items: string[] }) => (
			<MessageBranch defaultBranch={1}>
				<MessageBranchContent>
					{items.map((item, index) => (
						<div key={item} data-testid={`branch-${index}`}>
							{item}
						</div>
					))}
				</MessageBranchContent>
				<MessageBranchPage />
			</MessageBranch>
		)

		const { rerender } = render(<BranchHarness items={["First", "Second"]} />)

		await waitFor(() => {
			expect(screen.getByText("2 of 2")).toBeInTheDocument()
		})

		rerender(<BranchHarness items={["First (updated)", "Second (updated)"]} />)
		await waitFor(() => {
			expect(screen.getByText("2 of 2")).toBeInTheDocument()
		})

		rerender(<BranchHarness items={["Only"]} />)
		await waitFor(() => {
			expect(screen.getByText("2 of 1")).toBeInTheDocument()
		})
	})

	it("memoizes MessageResponse by children and forwards streamdown plugins", () => {
		const { rerender } = render(<MessageResponse className="response-a">alpha</MessageResponse>)

		expect(streamdownRenderSpy).toHaveBeenCalledTimes(1)
		const firstRenderProps = streamdownRenderSpy.mock.calls[0]?.[0] as {
			className: string
			plugins: Record<string, { plugin: string }>
		}
		expect(firstRenderProps.className).toContain("size-full")
		expect(firstRenderProps.className).toContain("response-a")
		expect(firstRenderProps.plugins).toEqual({
			cjk: { plugin: "cjk" },
			code: { plugin: "code" },
			math: { plugin: "math" },
			mermaid: { plugin: "mermaid" },
		})

		rerender(<MessageResponse className="response-b">alpha</MessageResponse>)
		expect(streamdownRenderSpy).toHaveBeenCalledTimes(1)

		rerender(<MessageResponse className="response-c">beta</MessageResponse>)
		expect(streamdownRenderSpy).toHaveBeenCalledTimes(2)
	})

	it("renders message toolbar and action/content wrappers", () => {
		render(
			<MessageToolbar data-testid="toolbar">
				<MessageActions data-testid="actions">
					<MessageContent data-testid="content">Assistant reply</MessageContent>
				</MessageActions>
			</MessageToolbar>,
		)

		expect(screen.getByTestId("toolbar")).toHaveClass("mt-4")
		expect(screen.getByTestId("actions")).toHaveClass("flex", "items-center")
		expect(screen.getByTestId("content")).toHaveTextContent("Assistant reply")
		expect(screen.getByTestId("content")).toHaveClass("text-sm")
	})
})

describe("ai-elements/conversation deep coverage", () => {
	it("renders conversation wrappers with default behavior props", () => {
		render(
			<Conversation className="outer" data-testid="conversation">
				<ConversationContent className="inner" data-testid="conversation-content">
					content
				</ConversationContent>
			</Conversation>,
		)

		const conversation = screen.getByTestId("conversation")
		expect(conversation).toHaveAttribute("initial", "smooth")
		expect(conversation).toHaveAttribute("resize", "smooth")
		expect(conversation).toHaveAttribute("role", "log")
		expect(conversation).toHaveClass("relative", "flex-1", "overflow-y-hidden", "outer")

		const content = screen.getByTestId("conversation-content")
		expect(content).toHaveClass("flex", "flex-col", "gap-8", "p-4", "inner")
	})

	it("renders empty state defaults, conditional icon/description, and custom children", () => {
		const { rerender } = render(<ConversationEmptyState />)
		expect(screen.getByText("No messages yet")).toBeInTheDocument()
		expect(screen.getByText("Start a conversation to see messages here")).toBeInTheDocument()

		rerender(
			<ConversationEmptyState
				description=""
				icon={<span data-testid="empty-icon">icon</span>}
				title="Nothing here"
			/>,
		)
		expect(screen.getByTestId("empty-icon")).toBeInTheDocument()
		expect(screen.getByText("Nothing here")).toBeInTheDocument()
		expect(
			screen.queryByText("Start a conversation to see messages here"),
		).not.toBeInTheDocument()

		rerender(<ConversationEmptyState>Custom empty body</ConversationEmptyState>)
		expect(screen.getByText("Custom empty body")).toBeInTheDocument()
		expect(screen.queryByText("No messages yet")).not.toBeInTheDocument()
	})

	it("renders scroll button only when not at bottom and triggers scroll handler", () => {
		const { rerender } = render(<ConversationScrollButton>Jump</ConversationScrollButton>)
		expect(screen.queryByRole("button")).not.toBeInTheDocument()

		act(() => {
			stickContext.isAtBottom = false
		})

		rerender(<ConversationScrollButton>Jump</ConversationScrollButton>)
		const button = screen.getByRole("button")
		expect(button).toHaveClass("absolute", "bottom-4")

		fireEvent.click(button)
		expect(stickContext.scrollToBottom).toHaveBeenCalledTimes(1)
	})

	it("formats messages to markdown with default and custom formatters", () => {
		const messages = [
			{ content: "Hello", role: "user" as const },
			{ content: "Working on it", role: "assistant" as const },
		]

		expect(messagesToMarkdown(messages)).toBe("**User:** Hello\n\n**Assistant:** Working on it")

		const formatMessage = vi.fn(
			(message: { content: string; role: string }, index: number) =>
				`[${index}] ${message.role.toUpperCase()}: ${message.content}`,
		)
		expect(messagesToMarkdown(messages, formatMessage)).toBe(
			"[0] USER: Hello\n\n[1] ASSISTANT: Working on it",
		)
		expect(messagesToMarkdown([], formatMessage)).toBe("")
		expect(formatMessage).toHaveBeenCalledTimes(2)
		expect(formatMessage).toHaveBeenNthCalledWith(1, messages[0], 0)
		expect(formatMessage).toHaveBeenNthCalledWith(2, messages[1], 1)
	})

	it("downloads markdown with default formatter and filename", async () => {
		const createObjectURLMock = vi.fn((_blob: Blob) => "blob:conversation")
		const revokeObjectURLMock = vi.fn()
		Object.defineProperty(URL, "createObjectURL", {
			configurable: true,
			value: createObjectURLMock,
			writable: true,
		})
		Object.defineProperty(URL, "revokeObjectURL", {
			configurable: true,
			value: revokeObjectURLMock,
			writable: true,
		})
		const clickSpy = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => undefined)

		render(
			<ConversationDownload
				messages={[
					{ content: "First", role: "user" },
					{ content: "Second", role: "assistant" },
				]}
			/>,
		)

		const button = screen.getByRole("button")
		expect(button.querySelector("svg")).not.toBeNull()

		fireEvent.click(button)

		expect(createObjectURLMock).toHaveBeenCalledTimes(1)
		expect(clickSpy).toHaveBeenCalledTimes(1)
		expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:conversation")

		const downloadBlob = createObjectURLMock.mock.calls[0]?.[0]
		if (!(downloadBlob instanceof Blob)) {
			throw new Error("Expected Blob payload for markdown download")
		}
		const markdown = await downloadBlob.text()
		expect(markdown).toBe("**User:** First\n\n**Assistant:** Second")
	})

	it("supports custom formatter, filename, and custom button content for downloads", async () => {
		const createObjectURLMock = vi.fn((_blob: Blob) => "blob:custom")
		const revokeObjectURLMock = vi.fn()
		Object.defineProperty(URL, "createObjectURL", {
			configurable: true,
			value: createObjectURLMock,
			writable: true,
		})
		Object.defineProperty(URL, "revokeObjectURL", {
			configurable: true,
			value: revokeObjectURLMock,
			writable: true,
		})
		const clickSpy = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => undefined)

		const formatMessage = vi.fn(
			(message: { content: string; role: string }, index: number) =>
				`[${index}] ${message.role}: ${message.content}`,
		)

		render(
			<ConversationDownload
				filename="chat-export.md"
				formatMessage={formatMessage}
				messages={[{ content: "Only", role: "tool" }]}
			>
				Download transcript
			</ConversationDownload>,
		)

		const button = screen.getByRole("button", { name: "Download transcript" })
		fireEvent.click(button)

		expect(formatMessage).toHaveBeenCalledWith({ content: "Only", role: "tool" }, 0)
		expect(createObjectURLMock).toHaveBeenCalledTimes(1)
		expect(clickSpy).toHaveBeenCalledTimes(1)
		expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:custom")

		const downloadBlob = createObjectURLMock.mock.calls[0]?.[0]
		if (!(downloadBlob instanceof Blob)) {
			throw new Error("Expected Blob payload for markdown download")
		}
		const markdown = await downloadBlob.text()
		expect(markdown).toBe("[0] tool: Only")

		const appendedLinks = Array.from(document.querySelectorAll("a[download='chat-export.md']"))
		expect(appendedLinks).toHaveLength(0)
	})
})
