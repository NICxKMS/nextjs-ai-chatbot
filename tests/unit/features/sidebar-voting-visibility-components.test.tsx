// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React, { Suspense } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SidebarHeaderActions } from "@/features/sidebar/components/sidebar-header-actions"
import { SidebarHistoryClient } from "@/features/sidebar/components/sidebar-history-client"
import { SidebarHistoryItem } from "@/features/sidebar/components/sidebar-history-item"
import { SidebarShell } from "@/features/sidebar/components/sidebar-shell"
import { SidebarSkeleton } from "@/features/sidebar/components/sidebar-skeleton"
import { SidebarUserNav } from "@/features/sidebar/components/sidebar-user-nav"
import { VisibilitySelector } from "@/features/visibility/components/visibility-selector"
import type { VisibilityType } from "@/features/visibility/types/visibility.types"
import { VoteButtons } from "@/features/voting/components/vote-buttons"
import {
	useVoteForMessage,
	VoteResolver,
	VotesProvider,
} from "@/features/voting/components/vote-resolver"
import type { Vote } from "@/lib/types/models.types"
import type { PendingChat } from "@/lib/types/pending-chats.types"
import { createMockChat } from "@/tests/fixtures/chat"
import { createMockVote } from "@/tests/fixtures/vote"

const {
	mockRouterPush,
	mockUnstableRethrow,
	mockSetOpenMobile,
	mockRemovePending,
	mockMarkPendingConfirmed,
	mockDeleteAllChats,
	mockDeleteChat,
	mockRenameChat,
	mockUpdateChatVisibility,
	mockLogout,
	mockGetAppSession,
	mockGetChatsByUserId,
	mockCacheTag,
	mockCacheLife,
	mockToastSuccess,
	mockToastError,
	mockSetTheme,
	mockSetVisibility,
	mockSubmitVote,
	mockUseVotes,
} = vi.hoisted(() => ({
	mockRouterPush: vi.fn(),
	mockUnstableRethrow: vi.fn(),
	mockSetOpenMobile: vi.fn(),
	mockRemovePending: vi.fn(),
	mockMarkPendingConfirmed: vi.fn(),
	mockDeleteAllChats: vi.fn(),
	mockDeleteChat: vi.fn(),
	mockRenameChat: vi.fn(),
	mockUpdateChatVisibility: vi.fn(),
	mockLogout: vi.fn(),
	mockGetAppSession: vi.fn(),
	mockGetChatsByUserId: vi.fn(),
	mockCacheTag: vi.fn(),
	mockCacheLife: vi.fn(),
	mockToastSuccess: vi.fn(),
	mockToastError: vi.fn(),
	mockSetTheme: vi.fn(),
	mockSetVisibility: vi.fn(),
	mockSubmitVote: vi.fn(),
	mockUseVotes: vi.fn(),
}))

let mockPathname = "/"

let sidebarHistoryState: {
	chats: ReturnType<typeof createMockChat>[]
	hasMore: boolean
	loadMore: () => void
	isLoading: boolean
}

let pendingEntries: PendingChat[]

let sessionState: {
	session: { user: { id: string; type: "authenticated" | "guest" } } | null
	isLoading: boolean
	isGuest: boolean
}

let themeState: {
	resolvedTheme: "light" | "dark"
	setTheme: (theme: string) => void
}

let chatSessionState: {
	chatId: string
	visibility: VisibilityType
	setVisibility: (visibility: VisibilityType) => void
	isReadonly: boolean
}

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
	usePathname: () => mockPathname,
	unstable_rethrow: (...args: unknown[]) => mockUnstableRethrow(...args),
}))

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) =>
		React.createElement("a", { href }, children),
}))

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) =>
		React.createElement("img", { src, alt }),
}))

vi.mock("next-themes", () => ({
	useTheme: () => ({
		resolvedTheme: themeState.resolvedTheme,
		setTheme: themeState.setTheme,
	}),
}))

vi.mock("server-only", () => ({}))

vi.mock("next/cache", () => ({
	cacheTag: (...args: unknown[]) => mockCacheTag(...args),
	cacheLife: (...args: unknown[]) => mockCacheLife(...args),
}))

vi.mock("sonner", () => ({
	toast: {
		success: (...args: unknown[]) => mockToastSuccess(...args),
		error: (...args: unknown[]) => mockToastError(...args),
	},
}))

vi.mock("@/components/ai-elements/message", () => ({
	MessageAction: ({
		children,
		tooltip,
		type,
		...props
	}: {
		children?: React.ReactNode
		tooltip?: string
		type?: "button" | "submit" | "reset"
		[key: string]: unknown
	}) =>
		React.createElement(
			"button",
			{
				type: type ?? "button",
				"aria-label": tooltip,
				...props,
			},
			children,
		),
}))

vi.mock("@/components/ui/button", () => ({
	Button: ({
		asChild,
		children,
		type,
		...props
	}: {
		asChild?: boolean
		children?: React.ReactNode
		type?: "button" | "submit" | "reset"
		[key: string]: unknown
	}) => {
		if (asChild) {
			return React.createElement("span", props, children)
		}

		return React.createElement("button", { type: type ?? "button", ...props }, children)
	},
}))

vi.mock("@/components/ui/tooltip", () => ({
	Tooltip: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
		React.createElement("div", props, children),
	TooltipTrigger: ({
		asChild,
		children,
		...props
	}: {
		asChild?: boolean
		children?: React.ReactNode
		[key: string]: unknown
	}) => {
		if (asChild) {
			return React.createElement("div", props, children)
		}
		return React.createElement("button", { type: "button", ...props }, children)
	},
	TooltipContent: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
}))

vi.mock("@/components/ui/alert-dialog", () => ({
	AlertDialog: ({ open, children }: { open?: boolean; children?: React.ReactNode }) =>
		open === false
			? null
			: React.createElement("div", { "data-testid": "alert-dialog" }, children),
	AlertDialogContent: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	AlertDialogHeader: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	AlertDialogTitle: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("h2", props, children),
	AlertDialogDescription: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("p", props, children),
	AlertDialogFooter: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	AlertDialogAction: ({
		children,
		type,
		...props
	}: {
		children?: React.ReactNode
		type?: "button" | "submit" | "reset"
		[key: string]: unknown
	}) => React.createElement("button", { type: type ?? "button", ...props }, children),
	AlertDialogCancel: ({
		children,
		type,
		...props
	}: {
		children?: React.ReactNode
		type?: "button" | "submit" | "reset"
		[key: string]: unknown
	}) => React.createElement("button", { type: type ?? "button", ...props }, children),
}))

vi.mock("@/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({
		children,
		onOpenChange,
		open,
		modal,
		...props
	}: {
		children?: React.ReactNode
		onOpenChange?: (open: boolean) => void
		open?: boolean
		modal?: boolean
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	DropdownMenuTrigger: ({
		asChild,
		children,
		...props
	}: {
		asChild?: boolean
		children?: React.ReactNode
		[key: string]: unknown
	}) => {
		if (asChild) {
			return React.createElement("div", props, children)
		}
		return React.createElement("button", { type: "button", ...props }, children)
	},
	DropdownMenuContent: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	DropdownMenuItem: ({
		asChild,
		children,
		onSelect,
		disabled,
		...props
	}: {
		asChild?: boolean
		children?: React.ReactNode
		onSelect?: () => void
		disabled?: boolean
		[key: string]: unknown
	}) => {
		if (asChild) {
			return React.createElement("div", props, children)
		}

		return React.createElement(
			"button",
			{
				type: "button",
				disabled,
				onClick: () => onSelect?.(),
				...props,
			},
			children,
		)
	},
	DropdownMenuSeparator: (props: { [key: string]: unknown }) => React.createElement("hr", props),
	DropdownMenuPortal: ({ children }: { children?: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
	DropdownMenuSub: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	DropdownMenuSubTrigger: ({
		children,
		onSelect,
		...props
	}: {
		children?: React.ReactNode
		onSelect?: () => void
		[key: string]: unknown
	}) =>
		React.createElement(
			"button",
			{ type: "button", onClick: () => onSelect?.(), ...props },
			children,
		),
	DropdownMenuSubContent: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
}))

vi.mock("@/components/ui/sidebar", () => ({
	useSidebar: () => ({ setOpenMobile: mockSetOpenMobile }),
	Sidebar: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
		React.createElement("div", props, children),
	SidebarHeader: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	SidebarContent: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	SidebarFooter: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	SidebarMenu: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
		React.createElement("div", props, children),
	SidebarGroup: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	SidebarGroupContent: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	SidebarGroupLabel: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	SidebarMenuItem: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	SidebarMenuButton: ({
		asChild,
		isActive,
		children,
		...props
	}: {
		asChild?: boolean
		isActive?: boolean
		children?: React.ReactNode
		[key: string]: unknown
	}) =>
		React.createElement(
			"div",
			{
				"data-as-child": asChild ? "true" : "false",
				"data-active": isActive ? "true" : "false",
				...props,
			},
			children,
		),
	SidebarMenuAction: ({
		children,
		showOnHover,
		type,
		...props
	}: {
		children?: React.ReactNode
		showOnHover?: boolean
		type?: "button" | "submit" | "reset"
		[key: string]: unknown
	}) =>
		React.createElement(
			"button",
			{
				type: type ?? "button",
				"data-show-on-hover": showOnHover ? "true" : "false",
				...props,
			},
			children,
		),
}))

vi.mock("@/features/auth/components/session-provider", () => ({
	useSession: () => sessionState,
}))

vi.mock("@/lib/providers/pending-chats-provider", () => ({
	usePendingChats: () => ({
		entries: pendingEntries,
		remove: mockRemovePending,
		markConfirmed: mockMarkPendingConfirmed,
		add: vi.fn(),
		updateTitle: vi.fn(),
	}),
}))

vi.mock("@/features/sidebar/hooks/use-sidebar-history", () => ({
	useSidebarHistory: () => ({
		chats: sidebarHistoryState.chats,
		hasMore: sidebarHistoryState.hasMore,
		loadMore: sidebarHistoryState.loadMore,
		isLoading: sidebarHistoryState.isLoading,
	}),
}))

vi.mock("@/features/chat/actions/delete-all-chats", () => ({
	deleteAllChats: (...args: unknown[]) => mockDeleteAllChats(...args),
}))

vi.mock("@/features/chat/actions/delete-chat", () => ({
	deleteChat: (...args: unknown[]) => mockDeleteChat(...args),
}))

vi.mock("@/features/sidebar/actions/rename-chat", () => ({
	renameChat: (...args: unknown[]) => mockRenameChat(...args),
}))

vi.mock("@/features/visibility/actions/update-visibility", () => ({
	updateChatVisibility: (...args: unknown[]) => mockUpdateChatVisibility(...args),
}))

vi.mock("@/features/auth/actions/logout", () => ({
	logout: (...args: unknown[]) => mockLogout(...args),
}))

vi.mock("@/features/chat/hooks/use-chat-session-context", () => ({
	useChatSessionContext: () => chatSessionState,
}))

vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

vi.mock("@/lib/data/chat", () => ({
	getChatsByUserId: (...args: unknown[]) => mockGetChatsByUserId(...args),
}))

vi.mock("@/lib/cache/keys", () => ({
	cacheKeys: {
		chats: (userId: string) => `chats:${userId}`,
	},
}))

vi.mock("@/features/voting/hooks/use-votes", () => ({
	useVotes: (...args: unknown[]) => mockUseVotes(...args),
}))

beforeEach(() => {
	vi.clearAllMocks()

	mockPathname = "/"

	sidebarHistoryState = {
		chats: [],
		hasMore: false,
		loadMore: vi.fn(),
		isLoading: false,
	}

	pendingEntries = []

	sessionState = {
		session: { user: { id: "user-1", type: "authenticated" } },
		isLoading: false,
		isGuest: false,
	}

	themeState = {
		resolvedTheme: "light",
		setTheme: mockSetTheme,
	}

	chatSessionState = {
		chatId: crypto.randomUUID(),
		visibility: "private",
		setVisibility: mockSetVisibility,
		isReadonly: false,
	}

	mockDeleteAllChats.mockResolvedValue({ success: true, data: undefined })
	mockDeleteChat.mockResolvedValue({ success: true, data: undefined })
	mockRenameChat.mockResolvedValue({ success: true, data: undefined })
	mockUpdateChatVisibility.mockResolvedValue({ success: true, data: undefined })
	mockLogout.mockResolvedValue(undefined)
	mockGetAppSession.mockResolvedValue({
		user: {
			id: "user-1",
			email: "user@example.com",
		},
	})
	mockGetChatsByUserId.mockResolvedValue({ chats: [], hasMore: false })

	mockUseVotes.mockImplementation((_chatId: string, initialVotes: Vote[]) => ({
		votes: initialVotes,
		submitVote: mockSubmitVote,
		isPending: false,
		vote: null,
		voteUp: vi.fn(),
		voteDown: vi.fn(),
	}))
})

describe("sidebar-header-actions", () => {
	it("renders assistant link and hides delete-all action for guests", () => {
		render(<SidebarHeaderActions hasUser={false} />)

		expect(screen.getByText("Assistant")).toBeInTheDocument()
		expect(screen.queryByLabelText("Delete all chats")).not.toBeInTheDocument()
	})

	it("renders delete-all action for authenticated users", () => {
		render(<SidebarHeaderActions hasUser />)

		expect(screen.getByLabelText("Delete all chats")).toBeInTheDocument()
		expect(screen.getByText("Assistant")).toBeInTheDocument()
	})
})

describe("sidebar-history-client", () => {
	it("renders empty state when history is empty", () => {
		render(<SidebarHistoryClient initialChats={[]} initialHasMore={false} />)

		expect(
			screen.getByText("Your conversations will appear here once you start chatting!"),
		).toBeInTheDocument()
	})

	it("renders chat history items from initial server data", () => {
		const chat = createMockChat({
			id: "history-chat-1",
			title: "History Chat",
			createdAt: new Date(),
		})

		render(<SidebarHistoryClient initialChats={[chat]} initialHasMore={false} />)

		expect(screen.getByText("History Chat")).toBeInTheDocument()
	})

	it("marks matching pending entries confirmed when server history contains them", async () => {
		pendingEntries = [
			{
				id: "history-chat-pending",
				title: "Pending Title",
				visibility: "private",
				createdAt: new Date(),
				isOptimistic: true,
			},
		]

		const chat = createMockChat({
			id: "history-chat-pending",
			title: "Persisted Title",
			createdAt: new Date(),
		})

		render(<SidebarHistoryClient initialChats={[chat]} initialHasMore={false} />)

		await waitFor(() => {
			expect(mockMarkPendingConfirmed).toHaveBeenCalledWith("history-chat-pending")
		})

		expect(screen.getByText("Persisted Title")).toBeInTheDocument()
		expect(screen.queryByText("Pending Title")).not.toBeInTheDocument()
	})

	it("renders loading indicator when paginated history is loading", () => {
		sidebarHistoryState = {
			chats: [],
			hasMore: false,
			loadMore: vi.fn(),
			isLoading: true,
		}

		render(
			<SidebarHistoryClient
				initialChats={[createMockChat({ createdAt: new Date() })]}
				initialHasMore={false}
			/>,
		)

		expect(screen.getByLabelText("Loading more chats")).toBeInTheDocument()
		expect(screen.getByText("Loading more chats…")).toBeInTheDocument()
	})
})

describe("sidebar-history-item", () => {
	it("renders title and dropdown actions including visibility controls", () => {
		const mockChat = createMockChat({
			id: "chat-history-item-1",
			title: "History Item",
			visibility: "private",
		})

		render(
			<SidebarHistoryItem
				chat={mockChat}
				isActive={false}
				onDelete={vi.fn()}
				onVisibilityChange={vi.fn()}
				setOpenMobile={vi.fn()}
			/>,
		)

		expect(screen.getByRole("link", { name: "History Item" })).toHaveAttribute(
			"href",
			"/chat/chat-history-item-1",
		)
		expect(screen.getByText("Rename")).toBeInTheDocument()
		expect(screen.getByText("Delete")).toBeInTheDocument()
		expect(screen.getByText("Share")).toBeInTheDocument()
		expect(screen.getByText("Private")).toBeInTheDocument()
		expect(screen.getByText("Public")).toBeInTheDocument()
	})

	it("does not render share actions when visibility callback is absent", () => {
		const mockChat = createMockChat({
			id: "chat-history-item-2",
			title: "No Share",
			visibility: "private",
		})

		render(
			<SidebarHistoryItem
				chat={mockChat}
				isActive={false}
				onDelete={vi.fn()}
				setOpenMobile={vi.fn()}
			/>,
		)

		expect(screen.queryByText("Share")).not.toBeInTheDocument()
	})
})

describe("sidebar-shell", () => {
	it("renders server-fetched chats for authenticated users", async () => {
		const chat = createMockChat({
			id: "shell-chat-1",
			title: "Shell Chat",
			createdAt: new Date(),
		})

		mockGetAppSession.mockResolvedValue({
			user: {
				id: "user-1",
				email: "user@example.com",
			},
		})
		mockGetChatsByUserId.mockResolvedValue({ chats: [chat], hasMore: false })

		const shell = await SidebarShell()
		render(shell)

		expect(mockGetChatsByUserId).toHaveBeenCalledWith("user-1", { limit: 20 })
		expect(screen.getByText("Shell Chat")).toBeInTheDocument()
		await waitFor(() => {
			expect(screen.getByTestId("user-email")).toHaveTextContent("user@example.com")
		})
	})

	it("skips chat fetch and renders guest nav when no session exists", async () => {
		sessionState = {
			session: null,
			isLoading: false,
			isGuest: true,
		}
		mockGetAppSession.mockResolvedValue(null)

		const shell = await SidebarShell()
		render(shell)

		expect(mockGetChatsByUserId).not.toHaveBeenCalled()
		expect(screen.queryByLabelText("Delete all chats")).not.toBeInTheDocument()
		await waitFor(() => {
			expect(screen.getByTestId("user-email")).toHaveTextContent("Guest")
		})
	})
})

describe("sidebar-skeleton", () => {
	it("renders desktop sidebar skeleton structure", () => {
		render(<SidebarSkeleton />)

		expect(screen.getByText("Today")).toBeInTheDocument()
		expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(3)
	})
})

describe("sidebar-user-nav", () => {
	it("renders authenticated nav state and sign-out action", async () => {
		sessionState = {
			session: { user: { id: "user-1", type: "authenticated" } },
			isLoading: false,
			isGuest: false,
		}
		themeState = {
			resolvedTheme: "light",
			setTheme: mockSetTheme,
		}

		render(<SidebarUserNav user={{ email: "signed-in@example.com" }} />)

		await waitFor(() => {
			expect(screen.getByTestId("user-nav-button")).toBeInTheDocument()
		})

		expect(screen.getByTestId("user-email")).toHaveTextContent("signed-in@example.com")
		expect(screen.getByText("Toggle dark mode")).toBeInTheDocument()
		expect(screen.getByText("Sign out")).toBeInTheDocument()

		fireEvent.click(screen.getByText("Sign out"))
		await waitFor(() => {
			expect(mockLogout).toHaveBeenCalledTimes(1)
		})
	})

	it("renders guest nav state with login action", async () => {
		sessionState = {
			session: null,
			isLoading: false,
			isGuest: true,
		}
		themeState = {
			resolvedTheme: "dark",
			setTheme: mockSetTheme,
		}

		render(<SidebarUserNav user={{ email: null }} />)

		await waitFor(() => {
			expect(screen.getByTestId("user-email")).toHaveTextContent("Guest")
		})

		expect(screen.getByText("Toggle light mode")).toBeInTheDocument()
		expect(screen.getByText("Login to your account")).toBeInTheDocument()
	})
})

describe("vote-buttons", () => {
	it("renders enabled vote controls when no vote exists", () => {
		sessionState = {
			session: { user: { id: "user-1", type: "authenticated" } },
			isLoading: false,
			isGuest: false,
		}
		const onVote = vi.fn()

		render(<VoteButtons messageId="message-1" isAssistant isLoading={false} onVote={onVote} />)

		const upButton = screen.getByTestId("vote-up")
		const downButton = screen.getByTestId("vote-down")

		expect(upButton).toHaveAttribute("aria-pressed", "false")
		expect(downButton).toHaveAttribute("aria-pressed", "false")
		expect(upButton).not.toBeDisabled()
		expect(downButton).not.toBeDisabled()

		fireEvent.click(upButton)
		expect(onVote).toHaveBeenCalledWith("message-1", "up")
	})

	it("renders upvoted state", () => {
		render(
			<VoteButtons
				messageId="message-2"
				isAssistant
				isLoading={false}
				vote={createMockVote({ messageId: "message-2", isUpvoted: true })}
			/>,
		)

		expect(screen.getByTestId("vote-up")).toHaveAttribute("aria-pressed", "true")
		expect(screen.getByTestId("vote-up")).toBeDisabled()
		expect(screen.getByTestId("vote-down")).toHaveAttribute("aria-pressed", "false")
	})

	it("renders downvoted state", () => {
		render(
			<VoteButtons
				messageId="message-3"
				isAssistant
				isLoading={false}
				vote={createMockVote({ messageId: "message-3", isUpvoted: false })}
			/>,
		)

		expect(screen.getByTestId("vote-down")).toHaveAttribute("aria-pressed", "true")
		expect(screen.getByTestId("vote-down")).toBeDisabled()
		expect(screen.getByTestId("vote-up")).toHaveAttribute("aria-pressed", "false")
	})

	it("hides vote controls for guest users", () => {
		sessionState = {
			session: null,
			isLoading: false,
			isGuest: true,
		}

		render(<VoteButtons messageId="message-4" isAssistant isLoading={false} />)

		expect(screen.queryByTestId("vote-up")).not.toBeInTheDocument()
		expect(screen.queryByTestId("vote-down")).not.toBeInTheDocument()
	})
})

function VoteStateProbe({ messageId }: { messageId: string }) {
	const { vote, submitVote } = useVoteForMessage(messageId)

	return (
		<div>
			<output data-testid={`vote-state-${messageId}`}>
				{vote ? (vote.isUpvoted ? "up" : "down") : "none"}
			</output>
			<button
				data-testid={`vote-submit-${messageId}`}
				onClick={() => submitVote(messageId, "up")}
				type="button"
			>
				submit vote
			</button>
		</div>
	)
}

function createFulfilledVotesPromise(votes: Vote[]) {
	const promise = Promise.resolve(votes) as Promise<Vote[]> & {
		status: "fulfilled"
		value: Vote[]
	}
	promise.status = "fulfilled"
	promise.value = votes
	return promise
}

describe("vote-resolver", () => {
	it("hydrates vote state from resolved votes", async () => {
		const resolvedVote = createMockVote({
			chatId: "chat-1",
			messageId: "message-vote-1",
			isUpvoted: false,
		})
		const votesPromise = createFulfilledVotesPromise([resolvedVote])

		render(
			<VotesProvider chatId="chat-1">
				<Suspense fallback={<div data-testid="votes-fallback">loading votes</div>}>
					<VoteResolver votesPromise={votesPromise} />
				</Suspense>
				<VoteStateProbe messageId="message-vote-1" />
			</VotesProvider>,
		)

		await waitFor(() => {
			expect(screen.getByTestId("vote-state-message-vote-1")).toHaveTextContent("down")
		})

		expect(screen.queryByTestId("votes-fallback")).not.toBeInTheDocument()

		const calls = mockUseVotes.mock.calls as Array<[string, Vote[]]>
		expect(calls.at(-1)?.[0]).toBe("chat-1")
		expect(calls.at(-1)?.[1]).toEqual([resolvedVote])
	})

	it("exposes submitVote from useVotes through context", () => {
		render(
			<VotesProvider chatId="chat-2">
				<VoteStateProbe messageId="message-vote-2" />
			</VotesProvider>,
		)

		fireEvent.click(screen.getByTestId("vote-submit-message-vote-2"))
		expect(mockSubmitVote).toHaveBeenCalledWith("message-vote-2", "up")
	})
})

describe("visibility-selector", () => {
	it("renders selector and both visibility options", () => {
		render(<VisibilitySelector />)

		expect(screen.getByTestId("visibility-selector")).toBeInTheDocument()
		expect(screen.getByTestId("visibility-selector-item-private")).toBeInTheDocument()
		expect(screen.getByTestId("visibility-selector-item-public")).toBeInTheDocument()
	})

	it("updates visibility when selecting public", async () => {
		chatSessionState = {
			chatId: "visibility-chat-1",
			visibility: "private",
			setVisibility: mockSetVisibility,
			isReadonly: false,
		}

		render(<VisibilitySelector />)

		fireEvent.click(screen.getByTestId("visibility-selector-item-public"))

		expect(mockSetVisibility).toHaveBeenCalledWith("public")
		await waitFor(() => {
			expect(mockUpdateChatVisibility).toHaveBeenCalledWith({
				chatId: "visibility-chat-1",
				visibility: "public",
			})
		})
	})

	it("does not render for readonly chats", () => {
		chatSessionState = {
			chatId: "visibility-chat-2",
			visibility: "private",
			setVisibility: mockSetVisibility,
			isReadonly: true,
		}

		render(<VisibilitySelector />)

		expect(screen.queryByTestId("visibility-selector")).not.toBeInTheDocument()
	})
})
