// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const NOT_FOUND_ERROR = "NEXT_NOT_FOUND"

interface MockModel {
	id: string
	name: string
}

interface MockChatShellProps {
	id: string
	initialMessages: unknown[]
	initialChatModel: string
	isReadonly: boolean
	initialVisibility: "private" | "public"
	availableModels: MockModel[]
	initialQuery?: string
}

const mockRedirect = vi.fn()
const mockNotFound = vi.fn(() => {
	throw new Error(NOT_FOUND_ERROR)
})
const mockGetAppSession = vi.fn()
const mockGetAvailableModels = vi.fn()
const mockGetDefaultModel = vi.fn()
const mockGenerateUUID = vi.fn()
const mockChatShell = vi.fn((props: MockChatShellProps) =>
	React.createElement("section", { "data-testid": "chat-shell" }, `chat-shell-${props.id}`),
)
const mockChatStreamProvider = vi.fn(({ children }: { children: React.ReactNode }) =>
	React.createElement("div", { "data-testid": "chat-stream-provider" }, children),
)
const mockVotesProvider = vi.fn(({ children }: { children: React.ReactNode; chatId: string }) =>
	React.createElement("div", { "data-testid": "votes-provider" }, children),
)
const mockVoteResolver = vi.fn(() =>
	React.createElement("div", { "data-testid": "vote-resolver" }, "vote-resolver"),
)

const mockGetChatById = vi.fn()
const mockGetMessagesByChatId = vi.fn()
const mockGetVotesByChatId = vi.fn()
const mockConvertToUIMessages = vi.fn()
const mockWithCache = vi.fn(async (_tag: string, fetcher: () => Promise<unknown>) => fetcher())

const mockCacheKeys = {
	chat: vi.fn((chatId: string) => `chat:${chatId}`),
	votes: vi.fn((chatId: string) => `votes:${chatId}`),
}

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		back: vi.fn(),
		prefetch: vi.fn(),
	}),
	usePathname: () => "/",
	useSearchParams: () => ({ get: vi.fn() }),
	useParams: () => ({}),
	redirect: (url: string) => mockRedirect(url),
	notFound: () => mockNotFound(),
}))

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) =>
		React.createElement("a", { href }, children),
}))

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) =>
		React.createElement("img", { src, alt }),
}))

vi.mock("server-only", () => ({}))

vi.mock("@/features/chat/components/chat-shell", () => ({
	ChatShell: (props: MockChatShellProps) => mockChatShell(props),
}))

vi.mock("@/features/chat/components/chat-stream-provider", () => ({
	ChatStreamProvider: ({ children }: { children: React.ReactNode }) =>
		mockChatStreamProvider({ children }),
}))

vi.mock("@/features/voting/components/vote-resolver", () => ({
	VotesProvider: ({ children, chatId }: { children: React.ReactNode; chatId: string }) =>
		mockVotesProvider({ children, chatId }),
	VoteResolver: () => mockVoteResolver(),
}))

vi.mock("@/features/models/lib/models", () => ({
	getAvailableModels: (...args: unknown[]) => mockGetAvailableModels(...args),
	getDefaultModel: (...args: unknown[]) => mockGetDefaultModel(...args),
}))

vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

vi.mock("@/lib/utils/generate-uuid", () => ({
	generateUUID: (...args: unknown[]) => mockGenerateUUID(...args),
}))

vi.mock("@/lib/data/chat", () => ({
	getChatById: (...args: unknown[]) => mockGetChatById(...args),
}))

vi.mock("@/lib/data/message", () => ({
	getMessagesByChatId: (...args: unknown[]) => mockGetMessagesByChatId(...args),
}))

vi.mock("@/lib/data/vote", () => ({
	getVotesByChatId: (...args: unknown[]) => mockGetVotesByChatId(...args),
}))

vi.mock("@/features/chat/lib/message-utils", () => ({
	convertToUIMessages: (...args: unknown[]) => mockConvertToUIMessages(...args),
}))

vi.mock("@/lib/cache/with-cache", () => ({
	withCache: (...args: [string, () => Promise<unknown>]) => mockWithCache(...args),
}))

vi.mock("@/lib/cache/keys", () => ({
	cacheKeys: {
		chat: (...args: [string]) => mockCacheKeys.chat(...args),
		votes: (...args: [string]) => mockCacheKeys.votes(...args),
	},
}))

vi.mock("@/lib/types/model.types", () => ({
	DEFAULT_CHAT_MODEL: "test-default-model",
}))

describe("app pages render tests", () => {
	afterEach(() => {
		cleanup()
	})

	beforeEach(() => {
		vi.clearAllMocks()

		mockNotFound.mockImplementation(() => {
			throw new Error(NOT_FOUND_ERROR)
		})

		mockGetAppSession.mockResolvedValue({
			user: { id: "user-1", type: "authenticated" },
		})
		mockGetAvailableModels.mockResolvedValue([{ id: "model-1", name: "Model 1" }])
		mockGetDefaultModel.mockResolvedValue("model-1")
		mockGenerateUUID.mockReturnValue("new-chat-id")

		mockGetChatById.mockResolvedValue({
			id: "chat-1",
			title: "Existing Chat",
			userId: "user-1",
			visibility: "private",
			model: "model-1",
		})
		mockGetMessagesByChatId.mockResolvedValue([
			{
				id: "message-1",
				role: "user",
				parts: [{ type: "text", text: "hello" }],
			},
		])
		mockConvertToUIMessages.mockReturnValue([
			{
				id: "message-1",
				role: "user",
				parts: [{ type: "text", text: "hello" }],
			},
		])
		mockGetVotesByChatId.mockResolvedValue([])

		mockWithCache.mockImplementation(async (_tag: string, fetcher: () => Promise<unknown>) =>
			fetcher(),
		)
	})

	it("renders the new chat page without throwing and shows core chat UI", async () => {
		const { default: NewChatPage } = await import("@/app/(chat)/page")

		const page = await NewChatPage({
			searchParams: Promise.resolve({ q: "hello from query" }),
		})
		const { container } = render(page as React.ReactElement)

		expect(container).toBeDefined()
		expect(screen.getByTestId("chat-stream-provider")).toBeInTheDocument()
		expect(screen.getByTestId("chat-shell")).toBeInTheDocument()
		expect(screen.getByText("chat-shell-new-chat-id")).toBeInTheDocument()

		const props = mockChatShell.mock.calls.at(-1)?.[0] as MockChatShellProps | undefined
		expect(props).toMatchObject({
			id: "new-chat-id",
			initialMessages: [],
			initialChatModel: "model-1",
			isReadonly: false,
			initialVisibility: "private",
			availableModels: [{ id: "model-1", name: "Model 1" }],
			initialQuery: "hello from query",
		})
	})

	it("renders the existing chat page without throwing and shows key chat elements", async () => {
		const { default: ExistingChatPage } = await import("@/app/(chat)/chat/[id]/page")

		const page = await ExistingChatPage({ params: Promise.resolve({ id: "chat-1" }) })
		const { container } = render(page as React.ReactElement)

		expect(container).toBeDefined()
		expect(screen.getByTestId("chat-stream-provider")).toBeInTheDocument()
		expect(screen.getByTestId("votes-provider")).toBeInTheDocument()
		expect(screen.getByTestId("chat-shell")).toBeInTheDocument()
		expect(screen.getByTestId("vote-resolver")).toBeInTheDocument()

		const props = mockChatShell.mock.calls.at(-1)?.[0] as MockChatShellProps | undefined
		expect(props).toMatchObject({
			id: "chat-1",
			initialMessages: [
				{
					id: "message-1",
					role: "user",
					parts: [{ type: "text", text: "hello" }],
				},
			],
			initialChatModel: "model-1",
			isReadonly: false,
			initialVisibility: "private",
			availableModels: [{ id: "model-1", name: "Model 1" }],
		})
		expect(mockConvertToUIMessages).toHaveBeenCalled()
	})

	it("returns the private chat title in metadata when the session can read it", async () => {
		const { generateMetadata } = await import("@/app/(chat)/chat/[id]/page")

		const metadata = await generateMetadata({ params: Promise.resolve({ id: "chat-1" }) })

		expect(metadata.title).toBe("Existing Chat")
	})

	it("returns a generic metadata title for unauthorized private chats", async () => {
		const { generateMetadata } = await import("@/app/(chat)/chat/[id]/page")

		mockGetAppSession.mockResolvedValue({
			user: { id: "different-user", type: "authenticated" },
		})

		const metadata = await generateMetadata({ params: Promise.resolve({ id: "chat-1" }) })

		expect(metadata.title).toBe("Chat")
	})

	it("calls notFound when existing chat does not exist", async () => {
		const { default: ExistingChatPage } = await import("@/app/(chat)/chat/[id]/page")

		mockGetChatById.mockResolvedValue(null)

		await expect(
			ExistingChatPage({
				params: Promise.resolve({ id: "missing-chat" }),
			}),
		).rejects.toThrow(NOT_FOUND_ERROR)
		expect(mockNotFound).toHaveBeenCalledTimes(1)
	})

	it("calls notFound when a private chat is requested by another user", async () => {
		const { default: ExistingChatPage } = await import("@/app/(chat)/chat/[id]/page")

		mockGetAppSession.mockResolvedValue({
			user: { id: "different-user", type: "authenticated" },
		})
		mockGetChatById.mockResolvedValue({
			id: "chat-1",
			title: "Existing Chat",
			userId: "owner-user",
			visibility: "private",
			model: "model-1",
		})

		await expect(
			ExistingChatPage({
				params: Promise.resolve({ id: "chat-1" }),
			}),
		).rejects.toThrow(NOT_FOUND_ERROR)
		expect(mockNotFound).toHaveBeenCalledTimes(1)
	})
})
