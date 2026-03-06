// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSearchParamsGet = vi.fn<(key: string) => string | null>()
const mockUseChatSessionContext = vi.fn()
const mockUseSettings = vi.fn()
const mockSetChatModel = vi.fn<(modelId: string) => void>()
const mockSendMessage = vi.fn<(content: string) => void>()
const mockToastWarning = vi.fn<(message: string) => void>()
const mockToastError = vi.fn<(message: string) => void>()

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => "/",
	useSearchParams: () => ({ get: mockSearchParamsGet }),
	useParams: () => ({ id: "test-chat-id" }),
}))

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) =>
		React.createElement("a", { href }, children),
}))

vi.mock("server-only", () => ({}))

vi.mock("@/features/chat/hooks/use-chat-session-context", () => ({
	useChatSessionContext: () => mockUseChatSessionContext(),
}))

vi.mock("@/features/settings/hooks/use-settings", () => ({
	useSettings: () => mockUseSettings(),
}))

vi.mock("sonner", () => ({
	toast: {
		warning: (message: string) => mockToastWarning(message),
		error: (message: string) => mockToastError(message),
	},
}))

vi.mock("@/components/sidebar-toggle", () => ({
	SidebarToggle: () => React.createElement("div", { "data-testid": "sidebar-toggle" }, "sidebar"),
}))

vi.mock("@/features/models/components/model-selector", () => ({
	ModelSelector: ({
		selectedModelId,
		models,
	}: {
		selectedModelId: string
		models: Array<{ id: string }>
		onModelChange: (modelId: string) => void
		className?: string
	}) =>
		React.createElement(
			"div",
			{
				"data-testid": "model-selector",
				"data-selected-model-id": selectedModelId,
				"data-model-count": String(models.length),
			},
			"model-selector",
		),
}))

vi.mock("@/features/visibility/components/visibility-selector", () => ({
	VisibilitySelector: () =>
		React.createElement("div", { "data-testid": "visibility-selector" }, "visibility"),
}))

vi.mock("@/features/settings/components/settings-panel", () => ({
	SettingsPanel: ({ open }: { open: boolean; onOpenChange: (open: boolean) => void }) =>
		React.createElement(
			"div",
			{ "data-testid": "settings-panel", "data-open": open ? "true" : "false" },
			"settings-panel",
		),
}))

vi.mock("@/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
	TooltipTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) =>
		React.createElement(React.Fragment, null, children),
	TooltipContent: ({ children }: { children: React.ReactNode }) =>
		React.createElement("span", null, children),
}))

vi.mock("@/components/ai-elements/context", () => ({
	Context: ({
		children,
		usedTokens,
		maxTokens,
		modelId,
	}: {
		children?: React.ReactNode
		usedTokens: number
		maxTokens: number
		usage?: unknown
		modelId?: string
	}) =>
		React.createElement(
			"div",
			{
				"data-testid": "context-root",
				"data-used-tokens": String(usedTokens),
				"data-max-tokens": String(maxTokens),
				"data-model-id": modelId ?? "",
			},
			children,
		),
	ContextTrigger: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
		React.createElement(
			"button",
			{ type: "button", "data-testid": "context-trigger", className },
			children ?? "context-trigger",
		),
	ContextContent: ({ children }: { children?: React.ReactNode }) =>
		React.createElement("div", { "data-testid": "context-content" }, children),
	ContextContentHeader: () => React.createElement("div", { "data-testid": "context-header" }),
	ContextContentBody: ({ children }: { children?: React.ReactNode }) =>
		React.createElement("div", { "data-testid": "context-body" }, children),
	ContextContentFooter: () => React.createElement("div", { "data-testid": "context-footer" }),
	ContextInputUsage: () =>
		React.createElement("span", { "data-testid": "context-input" }, "input"),
	ContextOutputUsage: () =>
		React.createElement("span", { "data-testid": "context-output" }, "output"),
	ContextReasoningUsage: () =>
		React.createElement("span", { "data-testid": "context-reasoning" }, "reasoning"),
	ContextCacheUsage: () =>
		React.createElement("span", { "data-testid": "context-cache" }, "cache"),
}))

vi.mock("@/components/ai-elements/suggestion", () => ({
	Suggestion: ({
		suggestion,
		onClick,
		children,
		...props
	}: {
		suggestion: string
		onClick?: (suggestion: string) => void
		children?: React.ReactNode
	} & React.ButtonHTMLAttributes<HTMLButtonElement>) =>
		React.createElement(
			"button",
			{
				type: "button",
				onClick: () => onClick?.(suggestion),
				...props,
			},
			children ?? suggestion,
		),
}))

import { ChatHeader } from "@/features/chat/components/chat-header"
import { ContextDisplay } from "@/features/chat/components/context-display"
import { Greeting } from "@/features/chat/components/greeting"
import { NoticeHandler } from "@/features/chat/components/notice-handler"
import { SuggestedActions } from "@/features/chat/components/suggested-actions"

beforeEach(() => {
	vi.clearAllMocks()

	mockUseChatSessionContext.mockReturnValue({
		chatModel: "model-a",
		setChatModel: mockSetChatModel,
		availableModels: [{ id: "model-a" }, { id: "model-b" }],
		chatId: "test-chat-id",
		sendMessage: mockSendMessage,
	})

	mockUseSettings.mockReturnValue({
		temperature: 0.7,
		topP: 1,
		maxOutputTokens: 4096,
		enableReasoning: false,
		contextDisplayMode: "compact",
		systemPrompt: "",
	})

	mockSearchParamsGet.mockReturnValue(null)
	window.history.replaceState({}, "", "/")
})

describe("ChatHeader", () => {
	it("renders header controls and default settings state", () => {
		render(<ChatHeader />)

		expect(screen.getByTestId("sidebar-toggle")).toBeInTheDocument()
		expect(screen.getByTestId("model-selector")).toHaveAttribute(
			"data-selected-model-id",
			"model-a",
		)
		expect(screen.getByTestId("model-selector")).toHaveAttribute("data-model-count", "2")
		expect(screen.getByTestId("visibility-selector")).toBeInTheDocument()
		expect(screen.getByRole("link", { name: /new chat/i })).toHaveAttribute("href", "/")
		expect(screen.getByRole("button", { name: /settings/i })).toBeInTheDocument()
		expect(screen.getByTestId("settings-panel")).toHaveAttribute("data-open", "false")
	})

	it("opens settings panel when settings button is clicked", () => {
		render(<ChatHeader />)

		fireEvent.click(screen.getByRole("button", { name: /settings/i }))

		expect(screen.getByTestId("settings-panel")).toHaveAttribute("data-open", "true")
	})
})

describe("Greeting", () => {
	it("renders greeting copy", () => {
		render(<Greeting />)

		expect(screen.getByText("Hello there!")).toBeInTheDocument()
		expect(screen.getByText("How can I help you today?")).toBeInTheDocument()
	})
})

describe("ContextDisplay", () => {
	it("renders compact mode without runtime settings details", () => {
		mockUseSettings.mockReturnValue({
			temperature: 0.7,
			topP: 1,
			maxOutputTokens: 4096,
			enableReasoning: false,
			contextDisplayMode: "compact",
			systemPrompt: "",
		})

		render(<ContextDisplay maxTokens={1000} modelId="model-a" usedTokens={120} />)

		expect(screen.getByTestId("context-root")).toHaveAttribute("data-used-tokens", "120")
		expect(screen.getByTestId("context-root")).toHaveAttribute("data-max-tokens", "1000")
		expect(screen.getByTestId("context-trigger")).toBeInTheDocument()
		expect(screen.getByTestId("context-input")).toBeInTheDocument()
		expect(screen.queryByText("Runtime Settings")).not.toBeInTheDocument()
	})

	it("renders detailed runtime settings when mode is detailed", () => {
		mockUseSettings.mockReturnValue({
			temperature: 0.85,
			topP: 0.95,
			maxOutputTokens: 8192,
			enableReasoning: true,
			contextDisplayMode: "detailed",
			systemPrompt: "",
		})

		render(<ContextDisplay maxTokens={1000} usedTokens={500} />)

		expect(screen.getByText("Runtime Settings")).toBeInTheDocument()
		expect(screen.getByText("Temperature")).toBeInTheDocument()
		expect(screen.getByText("Top P")).toBeInTheDocument()
		expect(screen.getByText("Max tokens")).toBeInTheDocument()
		expect(screen.getByText("Reasoning")).toBeInTheDocument()
		expect(screen.getByText("0.85")).toBeInTheDocument()
		expect(screen.getByText("0.95")).toBeInTheDocument()
		expect(screen.getByText("8,192")).toBeInTheDocument()
		expect(screen.getByText("Enabled")).toBeInTheDocument()
	})

	it("renders disabled reasoning label when detailed mode has reasoning turned off", () => {
		mockUseSettings.mockReturnValue({
			temperature: 0.5,
			topP: 0.8,
			maxOutputTokens: 2048,
			enableReasoning: false,
			contextDisplayMode: "detailed",
			systemPrompt: "",
		})

		render(<ContextDisplay maxTokens={1000} usedTokens={200} />)

		expect(screen.getByText("Runtime Settings")).toBeInTheDocument()
		expect(screen.getByText("Disabled")).toBeInTheDocument()
	})
})

describe("SuggestedActions", () => {
	it("renders all suggested actions", () => {
		render(<SuggestedActions />)

		expect(screen.getByTestId("suggested-actions")).toBeInTheDocument()
		expect(screen.getAllByRole("button")).toHaveLength(4)
		expect(
			screen.getByRole("button", {
				name: "What are the advantages of using Next.js?",
			}),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", {
				name: "Write code to demonstrate Dijkstra's algorithm",
			}),
		).toBeInTheDocument()
	})

	it("updates history and sends the clicked suggestion", () => {
		const replaceStateSpy = vi.spyOn(window.history, "replaceState")
		render(<SuggestedActions />)

		fireEvent.click(
			screen.getByRole("button", {
				name: "Write code to demonstrate Dijkstra's algorithm",
			}),
		)

		expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/chat/test-chat-id")
		expect(mockSendMessage).toHaveBeenCalledWith(
			"Write code to demonstrate Dijkstra's algorithm",
		)
		replaceStateSpy.mockRestore()
	})
})

describe("NoticeHandler", () => {
	it("shows warning notice and removes query param for chat_not_found", async () => {
		window.history.replaceState({}, "", "/chat?notice=chat_not_found&foo=1")
		mockSearchParamsGet.mockImplementation((key: string) =>
			key === "notice" ? "chat_not_found" : null,
		)
		const replaceStateSpy = vi.spyOn(window.history, "replaceState")

		render(<NoticeHandler />)

		await waitFor(() => {
			expect(mockToastWarning).toHaveBeenCalledWith(
				"This chat was not found. Redirected to the homepage.",
			)
		})

		const lastCall = replaceStateSpy.mock.calls.at(-1)
		expect(lastCall?.[0]).toBeNull()
		expect(lastCall?.[1]).toBe("")
		expect(String(lastCall?.[2])).toContain("/chat")
		expect(String(lastCall?.[2])).toContain("foo=1")
		expect(String(lastCall?.[2])).not.toContain("notice=")
		replaceStateSpy.mockRestore()
	})

	it("shows error notice and removes query param for user_not_found", async () => {
		window.history.replaceState({}, "", "/chat?notice=user_not_found")
		mockSearchParamsGet.mockImplementation((key: string) =>
			key === "notice" ? "user_not_found" : null,
		)
		const replaceStateSpy = vi.spyOn(window.history, "replaceState")

		render(<NoticeHandler />)

		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalledWith(
				"Your account could not be found. Switched to a guest session.",
			)
		})

		const lastCall = replaceStateSpy.mock.calls.at(-1)
		expect(lastCall?.[0]).toBeNull()
		expect(lastCall?.[1]).toBe("")
		expect(String(lastCall?.[2])).toContain("/chat")
		expect(String(lastCall?.[2])).not.toContain("notice=")
		replaceStateSpy.mockRestore()
	})

	it("does nothing when no recognized notice exists", async () => {
		window.history.replaceState({}, "", "/chat?foo=1")
		mockSearchParamsGet.mockReturnValue(null)
		const replaceStateSpy = vi.spyOn(window.history, "replaceState")

		render(<NoticeHandler />)

		await waitFor(() => {
			expect(mockToastWarning).not.toHaveBeenCalled()
			expect(mockToastError).not.toHaveBeenCalled()
		})
		expect(replaceStateSpy).not.toHaveBeenCalled()
		replaceStateSpy.mockRestore()
	})
})
