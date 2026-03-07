// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

interface MockAuthFormProps {
	mode: "login" | "register"
	action: unknown
}

const mockAuthForm = vi.fn((props: MockAuthFormProps) =>
	React.createElement(
		"div",
		{ "data-testid": `auth-form-${props.mode}` },
		`${props.mode} auth form`,
	),
)
const mockAuthLoadingState = vi.fn(() =>
	React.createElement("div", { "data-testid": "auth-loading-state" }, "auth loading"),
)

const mockLoginAction = vi.fn()
const mockRegisterAction = vi.fn()
const mockGetAppSession = vi.fn()

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		back: vi.fn(),
		prefetch: vi.fn(),
	}),
	redirect: vi.fn(),
	usePathname: () => "/",
	useSearchParams: () => ({ get: vi.fn() }),
	useParams: () => ({}),
}))

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) =>
		React.createElement("a", { href }, children),
}))

vi.mock("server-only", () => ({}))

vi.mock("@/features/auth/actions/login", () => ({
	login: (...args: unknown[]) => mockLoginAction(...args),
}))

vi.mock("@/features/auth/actions/register", () => ({
	register: (...args: unknown[]) => mockRegisterAction(...args),
}))

vi.mock("@/features/auth/components/auth-form", () => ({
	AuthForm: (props: MockAuthFormProps) => mockAuthForm(props),
}))

vi.mock("@/features/auth/components/auth-loading-state", () => ({
	AuthLoadingState: () => mockAuthLoadingState(),
}))

vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

describe("auth pages render tests", () => {
	afterEach(() => {
		cleanup()
	})

	beforeEach(() => {
		vi.clearAllMocks()
		mockGetAppSession.mockResolvedValue(null)
	})

	it("renders the login page without throwing and shows the auth form", async () => {
		const { default: LoginPage } = await import("@/app/(auth)/login/page")

		const page = LoginPage()
		const { container } = render(page as React.ReactElement)

		expect(container).toBeDefined()
		expect(screen.getByTestId("auth-form-login")).toBeInTheDocument()

		const props = mockAuthForm.mock.calls.at(-1)?.[0] as MockAuthFormProps | undefined
		expect(props?.mode).toBe("login")
		expect(typeof props?.action).toBe("function")
	})

	it("renders the register page without throwing and shows the auth form", async () => {
		const { default: RegisterPage } = await import("@/app/(auth)/register/page")

		const page = RegisterPage()
		const { container } = render(page as React.ReactElement)

		expect(container).toBeDefined()
		expect(screen.getByTestId("auth-form-register")).toBeInTheDocument()

		const props = mockAuthForm.mock.calls.at(-1)?.[0] as MockAuthFormProps | undefined
		expect(props?.mode).toBe("register")
		expect(typeof props?.action).toBe("function")
	})

	it("renders the shared auth loading state from the segment loading file", async () => {
		const { default: AuthLoading } = await import("@/app/(auth)/loading")

		render(<AuthLoading />)

		expect(screen.getByTestId("auth-loading-state")).toBeInTheDocument()
	})

	it("uses the shared auth loading state as the auth layout fallback", async () => {
		const { default: AuthLayout } = await import("@/app/(auth)/layout")

		const tree = AuthLayout({
			children: <div data-testid="auth-child">auth child</div>,
		}) as React.ReactElement<{ children: React.ReactElement<{ children: React.ReactElement }> }>

		const inner = tree.props.children
		const suspenseBoundary = inner.props.children as React.ReactElement<{
			fallback: React.ReactElement
		}>

		render(suspenseBoundary.props.fallback)

		expect(screen.getByTestId("auth-loading-state")).toBeInTheDocument()
	})
})
