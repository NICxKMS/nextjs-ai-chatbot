// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
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
	mockPatchPendingChat,
	mockDeleteAllChats,
	mockDeleteChat,
	mockPatchSidebarChat,
	mockRetrySidebarHistory,
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
	mockPatchPendingChat: vi.fn(),
	mockDeleteAllChats: vi.fn(),
	mockDeleteChat: vi.fn(),
	mockPatchSidebarChat: vi.fn(),
	mockRetrySidebarHistory: vi.fn(),
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
	error?: Error
	retry: () => void
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
	AlertDialog: ({
		children,
		onOpenChange,
		open,
	}: {
		children?: React.ReactNode
		onOpenChange?: (open: boolean) => void
		open?: boolean
	}) => {
		void onOpenChange
		return open === false
			? null
			: React.createElement("div", { "data-testid": "alert-dialog" }, children)
	},
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
		modal,
		onOpenChange,
		open,
		...props
	}: {
		children?: React.ReactNode
		modal?: boolean
		onOpenChange?: (open: boolean) => void
		open?: boolean
		[key: string]: unknown
	}) => {
		void modal
		void onOpenChange
		void open
		return React.createElement("div", props, children)
	},
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

vi.mock("@/components/ui/sidebar-provider", () => ({
	useSidebar: () => ({ setOpenMobile: mockSetOpenMobile }),
}))

vi.mock("@/lib/providers/pending-chats-provider", () => ({
	usePendingChats: () => ({
		entries: pendingEntries,
		patch: mockPatchPendingChat,
		remove: mockRemovePending,
		markConfirmed: mockMarkPendingConfirmed,
		add: vi.fn(),
	}),
}))

vi.mock("@/features/sidebar/hooks/use-sidebar-history", () => ({
	useSidebarHistory: (options?: {
		initialData?: {
			chats: ReturnType<typeof createMockChat>[]
			hasMore: boolean
		}
	}) => ({
		chats:
			sidebarHistoryState.chats.length > 0
				? sidebarHistoryState.chats
				: (options?.initialData?.chats ?? []),
		hasMore: sidebarHistoryState.hasMore || (options?.initialData?.hasMore ?? false),
		error: sidebarHistoryState.error,
		loadMore: sidebarHistoryState.loadMore,
		isLoading: sidebarHistoryState.isLoading,
		patchChat: mockPatchSidebarChat,
		retry: sidebarHistoryState.retry,
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
		error: undefined,
		retry: mockRetrySidebarHistory,
	}

	pendingEntries = []

	mockDeleteAllChats.mockResolvedValue({ success: true, data: undefined })
	mockDeleteChat.mockResolvedValue({ success: true, data: undefined })
	mockPatchPendingChat.mockReset()
	mockRenameChat.mockResolvedValue({ success: true, data: undefined })
	mockPatchSidebarChat.mockReset()
	mockRetrySidebarHistory.mockReset()
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

	it("marks matching pending entries confirmed while keeping pending metadata visible until server data catches up", async () => {
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

		expect(screen.getByText("Pending Title")).toBeInTheDocument()
		expect(screen.queryByText("Persisted Title")).not.toBeInTheDocument()
	})

	it("renders loading indicator when paginated history is loading", () => {
		sidebarHistoryState = {
			chats: [],
			hasMore: false,
			loadMore: vi.fn(),
			isLoading: true,
			error: undefined,
			retry: mockRetrySidebarHistory,
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

	it("applies pending overlay metadata onto matching server rows", () => {
		const createdAt = new Date()
		pendingEntries = [
			{
				id: "history-chat-overlay",
				title: "Streamed Title",
				visibility: "public",
				createdAt,
				isOptimistic: false,
			},
		]

		const chat = createMockChat({
			id: "history-chat-overlay",
			title: "New Chat",
			visibility: "private",
			createdAt,
		})

		render(<SidebarHistoryClient initialChats={[chat]} initialHasMore={false} />)

		expect(screen.getByText("Streamed Title")).toBeInTheDocument()
		expect(screen.queryByText("New Chat")).not.toBeInTheDocument()
	})

	it("renders retry affordance when history pagination fails", () => {
		sidebarHistoryState = {
			chats: [createMockChat({ id: "history-chat-1", title: "History Chat" })],
			hasMore: true,
			loadMore: vi.fn(),
			isLoading: false,
			error: new Error("network failed"),
			retry: mockRetrySidebarHistory,
		}

		render(<SidebarHistoryClient initialChats={[]} initialHasMore={false} />)

		fireEvent.click(screen.getByRole("button", { name: "Retry" }))

		expect(screen.getByText("Couldn't load more conversations.")).toBeInTheDocument()
		expect(mockRetrySidebarHistory).toHaveBeenCalledTimes(1)
	})
})

describe("sidebar-history-item", () => {
	it("notifies the local rename callback after a successful rename", async () => {
		const mockChat = createMockChat({
			id: "chat-history-item-rename",
			title: "Old Title",
		})
		const onRename = vi.fn()

		render(
			<SidebarHistoryItem
				chat={mockChat}
				isActive={false}
				onDelete={vi.fn()}
				onRename={onRename}
				onVisibilityChange={vi.fn()}
				setOpenMobile={vi.fn()}
			/>,
		)

		fireEvent.click(screen.getByText("Rename"))

		const input = screen.getByLabelText("Rename chat")
		fireEvent.change(input, { target: { value: "Renamed Title" } })
		fireEvent.keyDown(input, { key: "Enter" })

		await waitFor(() => {
			expect(mockRenameChat).toHaveBeenCalledWith({
				chatId: "chat-history-item-rename",
				title: "Renamed Title",
			})
			expect(onRename).toHaveBeenCalledWith("chat-history-item-rename", "Renamed Title")
		})
	})

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

it("patches local visibility after a successful visibility update", async () => {
	const chat = createMockChat({
		id: "history-chat-visibility",
		title: "Visibility Chat",
		visibility: "private",
		createdAt: new Date(),
	})

	render(<SidebarHistoryClient initialChats={[chat]} initialHasMore={false} />)

	fireEvent.click(screen.getByText("Public"))

	await waitFor(() => {
		expect(mockUpdateChatVisibility).toHaveBeenCalledWith({
			chatId: "history-chat-visibility",
			visibility: "public",
		})
		expect(mockPatchSidebarChat).toHaveBeenCalledWith("history-chat-visibility", {
			visibility: "public",
		})
		expect(mockPatchPendingChat).toHaveBeenCalledWith("history-chat-visibility", {
			visibility: "public",
		})
	})
})

it("ignores stale visibility successes when newer requests resolve first", async () => {
	let resolveFirst: ((value: { success: true; data: undefined }) => void) | undefined
	let resolveSecond: ((value: { success: true; data: undefined }) => void) | undefined

	mockUpdateChatVisibility
		.mockImplementationOnce(
			() =>
				new Promise<{ success: true; data: undefined }>((resolve) => {
					resolveFirst = resolve
				}),
		)
		.mockImplementationOnce(
			() =>
				new Promise<{ success: true; data: undefined }>((resolve) => {
					resolveSecond = resolve
				}),
		)

	const chat = createMockChat({
		id: "history-chat-overlap",
		title: "Visibility Race",
		visibility: "private",
		createdAt: new Date(),
	})

	render(<SidebarHistoryClient initialChats={[chat]} initialHasMore={false} />)

	fireEvent.click(screen.getByText("Public"))
	fireEvent.click(screen.getByText("Private"))

	resolveSecond?.({ success: true, data: undefined })
	await waitFor(() => {
		expect(mockPatchSidebarChat).toHaveBeenCalledWith("history-chat-overlap", {
			visibility: "private",
		})
	})

	resolveFirst?.({ success: true, data: undefined })

	await waitFor(() => {
		expect(mockPatchSidebarChat).toHaveBeenCalledTimes(1)
	})
})

it("retries history sync when the latest visibility request fails", async () => {
	let resolveFirst: ((value: { success: true; data: undefined }) => void) | undefined
	let resolveSecond: ((value: { success: false; error: { message: string } }) => void) | undefined

	mockUpdateChatVisibility
		.mockImplementationOnce(
			() =>
				new Promise<{ success: true; data: undefined }>((resolve) => {
					resolveFirst = resolve
				}),
		)
		.mockImplementationOnce(
			() =>
				new Promise<{ success: false; error: { message: string } }>((resolve) => {
					resolveSecond = resolve
				}),
		)

	const chat = createMockChat({
		id: "history-chat-overlap-failure",
		title: "Visibility Failure",
		visibility: "private",
		createdAt: new Date(),
	})

	render(<SidebarHistoryClient initialChats={[chat]} initialHasMore={false} />)

	fireEvent.click(screen.getByText("Public"))
	fireEvent.click(screen.getByText("Private"))

	resolveFirst?.({ success: true, data: undefined })
	resolveSecond?.({ success: false, error: { message: "failed" } })

	await waitFor(() => {
		expect(mockRetrySidebarHistory).toHaveBeenCalledTimes(1)
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
