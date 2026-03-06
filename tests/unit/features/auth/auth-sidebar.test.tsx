// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SidebarUserNav } from "@/features/sidebar/components/sidebar-user-nav"

const mockLogout = vi.fn()
const mockSetTheme = vi.fn()
const mockUnstableRethrow = vi.fn()

let sessionState: {
	session: { user: { id: string; type: "authenticated" | "guest" } } | null
	isLoading: boolean
	isGuest: boolean
}

let themeState: {
	resolvedTheme: "light" | "dark"
	setTheme: (theme: string) => void
}

vi.mock("next/navigation", () => ({
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

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
	},
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
}))

vi.mock("@/components/ui/sidebar", () => ({
	SidebarMenu: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
		React.createElement("div", props, children),
	SidebarMenuItem: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	SidebarMenuButton: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("button", { type: "button", ...props }, children),
}))

vi.mock("@/features/auth/actions/logout", () => ({
	logout: (...args: unknown[]) => mockLogout(...args),
}))

vi.mock("@/features/auth/components/session-provider", () => ({
	useSession: () => sessionState,
}))

beforeEach(() => {
	vi.clearAllMocks()
	sessionState = {
		session: { user: { id: "user-1", type: "authenticated" } },
		isLoading: false,
		isGuest: false,
	}
	themeState = {
		resolvedTheme: "light",
		setTheme: mockSetTheme,
	}
	mockLogout.mockResolvedValue(undefined)
})

describe("SidebarUserNav", () => {
	it("renders authenticated nav state and sign-out action", async () => {
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
