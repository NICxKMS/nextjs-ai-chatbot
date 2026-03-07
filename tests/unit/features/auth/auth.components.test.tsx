// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { login } from "@/features/auth/actions/login"
import { register } from "@/features/auth/actions/register"
import { AuthForm } from "@/features/auth/components/auth-form"
import { SessionProvider, useSession } from "@/features/auth/components/session-provider"
import type { AppSession } from "@/lib/auth/session"

const mockRouterRefresh = vi.fn()
const mockRouter = {
	push: vi.fn(),
	replace: vi.fn(),
	refresh: mockRouterRefresh,
}

const mockLoginAction = vi.fn().mockResolvedValue({ success: true, data: undefined })
const mockRegisterAction = vi.fn().mockResolvedValue({ success: true, data: undefined })
const mockSubscriptionUnsubscribe = vi.fn()

type AuthEvent = "INITIAL_SESSION" | "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED"
let capturedAuthStateHandler: ((event: AuthEvent) => void) | null = null

type MockSupabaseClient = {
	auth: {
		onAuthStateChange: (callback: (event: AuthEvent) => void) => {
			data: { subscription: { unsubscribe: () => void } }
		}
	}
}

function createMockSupabaseClient(): MockSupabaseClient {
	return {
		auth: {
			onAuthStateChange: (callback) => {
				capturedAuthStateHandler = callback
				return {
					data: {
						subscription: {
							unsubscribe: mockSubscriptionUnsubscribe,
						},
					},
				}
			},
		},
	}
}

const mockCreateBrowserClient = vi.fn((_supabaseUrl: string, _supabaseAnonKey: string) =>
	createMockSupabaseClient(),
)

vi.mock("next/navigation", () => ({
	useRouter: () => mockRouter,
	usePathname: () => "/",
}))

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) =>
		React.createElement("a", { href }, children),
}))

vi.mock("server-only", () => ({}))

vi.mock("@/features/auth/actions/login", () => ({
	login: () => mockLoginAction(),
}))

vi.mock("@/features/auth/actions/register", () => ({
	register: () => mockRegisterAction(),
}))

vi.mock("@supabase/ssr", () => ({
	createBrowserClient: (supabaseUrl: string, supabaseAnonKey: string) =>
		mockCreateBrowserClient(supabaseUrl, supabaseAnonKey),
}))

function SessionContextProbe() {
	const { session, isGuest, isLoading } = useSession()

	return (
		<div>
			<span data-testid="session-id">{session?.user.id ?? "none"}</span>
			<span data-testid="guest-state">{String(isGuest)}</span>
			<span data-testid="loading-state">{String(isLoading)}</span>
		</div>
	)
}

beforeEach(() => {
	vi.clearAllMocks()
	capturedAuthStateHandler = null
	mockCreateBrowserClient.mockImplementation(() => createMockSupabaseClient())
})

describe("AuthForm", () => {
	it("renders login form fields and supports input interactions", () => {
		render(<AuthForm mode="login" action={login} />)

		const emailInput = screen.getByRole("textbox", { name: /email address/i })
		const passwordInput = screen.getByLabelText(/password/i)

		fireEvent.change(emailInput, { target: { value: "user@example.com" } })
		fireEvent.change(passwordInput, { target: { value: "hunter2password" } })

		expect(emailInput).toHaveValue("user@example.com")
		expect(passwordInput).toHaveValue("hunter2password")
		expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument()
		expect(screen.getByTestId("login-button")).toBeInTheDocument()
	})

	it("renders register variant with the credentials-only contract", () => {
		render(<AuthForm mode="register" action={register} />)

		expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument()
		expect(screen.getByRole("textbox", { name: /email address/i })).toBeInTheDocument()
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
		expect(screen.getByTestId("register-button")).toBeInTheDocument()
	})
})

describe("SessionProvider", () => {
	const authenticatedSession: AppSession = {
		user: {
			id: "user-1",
			type: "authenticated",
			email: "user@example.com",
		},
	}

	it("renders children", () => {
		render(
			<SessionProvider session={authenticatedSession}>
				<div>child</div>
			</SessionProvider>,
		)

		expect(screen.getByText("child")).toBeInTheDocument()
	})

	it("provides session context and refreshes router on auth state changes", async () => {
		render(
			<SessionProvider session={authenticatedSession}>
				<SessionContextProbe />
			</SessionProvider>,
		)

		expect(screen.getByTestId("session-id")).toHaveTextContent("user-1")
		expect(screen.getByTestId("guest-state")).toHaveTextContent("false")
		expect(screen.getByTestId("loading-state")).toHaveTextContent("false")

		await waitFor(() => {
			expect(capturedAuthStateHandler).not.toBeNull()
		})

		capturedAuthStateHandler?.("SIGNED_IN")
		expect(mockRouterRefresh).toHaveBeenCalledTimes(1)

		capturedAuthStateHandler?.("TOKEN_REFRESHED")
		expect(mockRouterRefresh).toHaveBeenCalledTimes(2)
	})

	it("unsubscribes auth listener on unmount", async () => {
		const { unmount } = render(
			<SessionProvider session={authenticatedSession}>
				<div>child</div>
			</SessionProvider>,
		)

		await waitFor(() => {
			expect(capturedAuthStateHandler).not.toBeNull()
		})

		unmount()
		expect(mockSubscriptionUnsubscribe).toHaveBeenCalled()
	})

	it("treats a server-resolved null session as settled", async () => {
		render(
			<SessionProvider session={null}>
				<SessionContextProbe />
			</SessionProvider>,
		)

		expect(screen.getByTestId("session-id")).toHaveTextContent("none")
		expect(screen.getByTestId("guest-state")).toHaveTextContent("false")
		expect(screen.getByTestId("loading-state")).toHaveTextContent("false")

		await waitFor(() => {
			expect(capturedAuthStateHandler).not.toBeNull()
		})
	})

	it("keeps the provider mounted while a server-started session promise resolves", async () => {
		let resolveSession: ((value: AppSession | null) => void) | undefined
		const sessionPromise = new Promise<AppSession | null>((resolve) => {
			resolveSession = resolve
		})

		render(
			<SessionProvider session={sessionPromise}>
				<SessionContextProbe />
			</SessionProvider>,
		)

		expect(screen.getByTestId("session-id")).toHaveTextContent("none")
		expect(screen.getByTestId("loading-state")).toHaveTextContent("true")

		if (!resolveSession) {
			throw new Error("Expected session promise resolver")
		}

		resolveSession(authenticatedSession)

		await waitFor(() => {
			expect(screen.getByTestId("session-id")).toHaveTextContent("user-1")
			expect(screen.getByTestId("guest-state")).toHaveTextContent("false")
			expect(screen.getByTestId("loading-state")).toHaveTextContent("false")
		})
	})

	it("degrades gracefully when browser Supabase config is missing", async () => {
		const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
		const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

		process.env.NEXT_PUBLIC_SUPABASE_URL = ""
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ""

		try {
			render(
				<SessionProvider session={authenticatedSession}>
					<SessionContextProbe />
				</SessionProvider>,
			)

			await waitFor(() => {
				expect(screen.getByTestId("loading-state")).toHaveTextContent("false")
			})

			expect(screen.getByTestId("session-id")).toHaveTextContent("user-1")
			expect(screen.getByTestId("guest-state")).toHaveTextContent("false")
			expect(mockCreateBrowserClient).not.toHaveBeenCalled()
		} finally {
			process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey
		}
	})

	it("throws when useSession is called outside SessionProvider", () => {
		function InvalidConsumer() {
			useSession()
			return <div>invalid</div>
		}

		expect(() => render(<InvalidConsumer />)).toThrow(/useSession must be used within/i)
	})
})

describe("getSupabaseBrowserClient", () => {
	const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

	beforeEach(() => {
		vi.clearAllMocks()
		vi.resetModules()
		process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey
	})

	it("creates and reuses a singleton browser client", async () => {
		const client = createMockSupabaseClient()
		mockCreateBrowserClient.mockReturnValue(client)

		const { getSupabaseBrowserClient } = await import("@/features/auth/lib/supabase-browser")

		const first = getSupabaseBrowserClient()
		const second = getSupabaseBrowserClient()

		expect(first).toBe(client)
		expect(second).toBe(client)
		expect(mockCreateBrowserClient).toHaveBeenCalledTimes(1)
		expect(mockCreateBrowserClient).toHaveBeenCalledWith(
			process.env.NEXT_PUBLIC_SUPABASE_URL,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		)
	})

	it("throws when required Supabase env vars are missing", async () => {
		process.env.NEXT_PUBLIC_SUPABASE_URL = ""

		const { getSupabaseBrowserClient } = await import("@/features/auth/lib/supabase-browser")

		expect(() => getSupabaseBrowserClient()).toThrow(/supabase client is not configured/i)
		expect(mockCreateBrowserClient).not.toHaveBeenCalled()
	})
})
