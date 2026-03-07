// @vitest-environment jsdom
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetAppSession = vi.fn()

const MockThemeProvider = ({
	children,
	...props
}: React.PropsWithChildren<Record<string, unknown>>) =>
	React.createElement("mock-theme-provider", props, children)

const MockTooltipProvider = ({
	children,
	...props
}: React.PropsWithChildren<Record<string, unknown>>) =>
	React.createElement("mock-tooltip-provider", props, children)

const MockToaster = (props: Record<string, unknown>) => React.createElement("mock-toaster", props)

const MockSessionProvider = ({
	children,
	...props
}: React.PropsWithChildren<Record<string, unknown>>) =>
	React.createElement("mock-session-provider", props, children)

const MockPendingChatsProvider = ({ children }: React.PropsWithChildren) =>
	React.createElement("mock-pending-chats-provider", null, children)

vi.mock("@/app/globals.css", () => ({}))
vi.mock("react-data-grid/lib/styles.css", () => ({}))

vi.mock("geist/font/mono", () => ({
	GeistMono: { variable: "geist-mono" },
}))

vi.mock("geist/font/sans", () => ({
	GeistSans: { variable: "geist-sans" },
}))

vi.mock("@/components/theme-provider", () => ({
	ThemeProvider: MockThemeProvider,
}))

vi.mock("@/components/toaster", () => ({
	Toaster: MockToaster,
}))

vi.mock("@/components/ui/tooltip", () => ({
	TooltipProvider: MockTooltipProvider,
}))

vi.mock("@/components/ui/sidebar", () => ({
	SidebarInset: ({ children }: React.PropsWithChildren) =>
		React.createElement("mock-sidebar-inset", null, children),
	SidebarProvider: undefined,
}))

vi.mock("@/components/ui/sidebar-provider", () => ({
	SidebarProvider: ({ children }: React.PropsWithChildren<Record<string, unknown>>) =>
		React.createElement("mock-sidebar-provider", null, children),
}))

vi.mock("@/features/auth/components/session-provider", () => ({
	SessionProvider: MockSessionProvider,
}))

vi.mock("@/features/chat/components/notice-handler", () => ({
	NoticeHandler: () => React.createElement("mock-notice-handler"),
}))

vi.mock("@/features/sidebar/components/sidebar-shell", () => ({
	SidebarShell: () => React.createElement("mock-sidebar-shell"),
}))

vi.mock("@/features/sidebar/components/sidebar-skeleton", () => ({
	SidebarSkeleton: () => React.createElement("mock-sidebar-skeleton"),
}))

vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

vi.mock("@/lib/providers/pending-chats-provider", () => ({
	PendingChatsProvider: MockPendingChatsProvider,
}))

vi.mock("next/headers", () => ({
	cookies: vi.fn().mockResolvedValue({
		get: vi.fn().mockReturnValue(undefined),
	}),
}))

function asElement(node: unknown): React.ReactElement<Record<string, unknown>> {
	if (!React.isValidElement(node)) {
		throw new Error("Expected a valid React element")
	}

	return node as React.ReactElement<Record<string, unknown>>
}

describe("layout shell wiring", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetAppSession.mockReturnValue(
			Promise.resolve({ user: { id: "guest-1", type: "guest" } }),
		)
	})

	it("keeps the root layout static and no longer resolves session", async () => {
		const { default: RootLayout } = await import("@/app/layout")

		const tree = asElement(
			RootLayout({ children: React.createElement("div", null, "root-child") }),
		)

		expect(tree.type).toBe("html")
		expect(tree.props.className).toContain("geist-sans")
		expect(tree.props.className).toContain("geist-mono")
		expect(mockGetAppSession).not.toHaveBeenCalled()

		const body = asElement(tree.props.children)
		expect(body.type).toBe("body")

		const themeProvider = asElement(body.props.children)
		expect(themeProvider.type).toBe(MockThemeProvider)

		const themedChildren = React.Children.toArray(
			themeProvider.props.children as React.ReactNode,
		)
		const tooltipProvider = asElement(themedChildren[0])
		const toaster = asElement(themedChildren[1])

		expect(tooltipProvider.type).toBe(MockTooltipProvider)
		expect(tooltipProvider.props.delayDuration).toBe(0)
		expect(toaster.type).toBe(MockToaster)
	})

	it("starts the chat session promise at the route layout and passes it to SessionProvider", async () => {
		const { default: ChatLayout } = await import("@/app/(chat)/layout")

		const tree = asElement(
			ChatLayout({ children: React.createElement("div", null, "chat-child") }),
		)
		const children = React.Children.toArray(tree.props.children as React.ReactNode)

		expect(children).toHaveLength(2)
		expect(mockGetAppSession).toHaveBeenCalledTimes(1)

		const sessionProvider = asElement(children[1])
		expect(sessionProvider.type).toBe(MockSessionProvider)
		expect(sessionProvider.props.session).toBeInstanceOf(Promise)
		expect(sessionProvider.props.session).toBe(mockGetAppSession.mock.results[0]?.value)

		const pendingChatsProvider = asElement(sessionProvider.props.children)
		expect(pendingChatsProvider.type).toBe(MockPendingChatsProvider)

		const pendingChildren = React.Children.toArray(
			pendingChatsProvider.props.children as React.ReactNode,
		)
		const layoutSuspense = asElement(pendingChildren[0])
		expect(layoutSuspense.type).toBe(React.Suspense)
	})
})
