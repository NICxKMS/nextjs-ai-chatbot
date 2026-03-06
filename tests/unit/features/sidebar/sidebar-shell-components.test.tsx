// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SidebarHeaderActions } from "@/features/sidebar/components/sidebar-header-actions"
import { SidebarHistoryClient } from "@/features/sidebar/components/sidebar-history-client"
import { SidebarHistoryItem } from "@/features/sidebar/components/sidebar-history-item"
import { SidebarShell } from "@/features/sidebar/components/sidebar-shell"
import { SidebarSkeleton } from "@/features/sidebar/components/sidebar-skeleton"
import type { PendingChat } from "@/lib/types/pending-chats.types"
import { createMockChat } from "@/tests/fixtures/chat"

const {
	mockRouterPush,
	mockSetOpenMobile,
	mockRemovePending,
	mockMarkPendingConfirmed,
	mockDeleteAllChats,
	mockDeleteChat,
	mockRenameChat,
	mockUpdateChatVisibility,
	mockGetAppSession,
	mockGetChatsByUserId,
	mockCacheTag,
	mockCacheLife,
} = vi.hoisted(() => ({
	mockRouterPush: vi.fn(),
	mockSetOpenMobile: vi.fn(),
	mockRemovePending: vi.fn(),
	mockMarkPendingConfirmed: vi.fn(),
	mockDeleteAllChats: vi.fn(),
	mockDeleteChat: vi.fn(),
	mockRenameChat: vi.fn(),
	mockUpdateChatVisibility: vi.fn(),
	mockGetAppSession: vi.fn(),
	mockGetChatsByUserId: vi.fn(),
	mockCacheTag: vi.fn(),
	mockCacheLife: vi.fn(),
}))

let mockPathname = "/"

let sidebarHistoryState: {
	chats: ReturnType<typeof createMockChat>[]
	hasMore: boolean
	loadMore: () => void
	isLoading: boolean
}

let pendingEntries: PendingChat[]

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
	usePathname: () => mockPathname,
}))

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) =>
		React.createElement("a", { href }, children),
}))

vi.mock("server-only", () => ({}))

vi.mock("next/cache", () => ({
	cacheTag: (...args: unknown[]) => mockCacheTag(...args),
	cacheLife: (...args: unknown[]) => mockCacheLife(...args),
}))

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
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
		...props
	}: {
		children?: React.ReactNode
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

vi.mock("@/features/sidebar/components/sidebar-user-nav", () => ({
	SidebarUserNav: ({ user }: { user: { email?: string | null } }) =>
		React.createElement("div", { "data-testid": "user-email" }, user.email ?? "Guest"),
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

	mockDeleteAllChats.mockResolvedValue({ success: true, data: undefined })
	mockDeleteChat.mockResolvedValue({ success: true, data: undefined })
	mockRenameChat.mockResolvedValue({ success: true, data: undefined })
	mockUpdateChatVisibility.mockResolvedValue({ success: true, data: undefined })
	mockGetAppSession.mockResolvedValue({
		user: {
			id: "user-1",
			email: "user@example.com",
		},
	})
	mockGetChatsByUserId.mockResolvedValue({ chats: [], hasMore: false })
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
			expect(screen.getByText("user@example.com")).toBeInTheDocument()
		})
	})

	it("skips chat fetch and renders guest nav when no session exists", async () => {
		mockGetAppSession.mockResolvedValue(null)

		const shell = await SidebarShell()
		render(shell)

		expect(mockGetChatsByUserId).not.toHaveBeenCalled()
		expect(screen.queryByLabelText("Delete all chats")).not.toBeInTheDocument()
		await waitFor(() => {
			expect(screen.getByText("Guest")).toBeInTheDocument()
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
