// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { login } from "@/features/auth/actions/login"
import { register } from "@/features/auth/actions/register"
import { AuthForm } from "@/features/auth/components/auth-form"
import { SessionProvider, useSession } from "@/features/auth/components/session-provider"
import { ModelSelector } from "@/features/models/components/model-selector"
import { SettingsPanel } from "@/features/settings/components/settings-panel"
import type { AppSession } from "@/lib/auth/session"
import { MODEL_COOKIE_NAME, type ModelMetadata } from "@/lib/types/model.types"

const mockRouterPush = vi.fn()
const mockRouterReplace = vi.fn()
const mockRouterRefresh = vi.fn()
const mockRouter = {
	push: mockRouterPush,
	replace: mockRouterReplace,
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

const mockUseSettings = vi.fn()
const mockUpdateSettings = vi.fn()
const mockResetSettings = vi.fn()

type SettingsState = {
	temperature: number
	topP: number
	maxOutputTokens: number
	systemPrompt: string
	enableReasoning: boolean
	contextDisplayMode: "compact" | "detailed"
}

const defaultSettings: SettingsState = {
	temperature: 0.7,
	topP: 1,
	maxOutputTokens: 4096,
	systemPrompt: "",
	enableReasoning: false,
	contextDisplayMode: "compact",
}

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

vi.mock("@/features/models/lib/models", () => ({
	getAvailableModels: vi.fn().mockReturnValue([
		{
			id: "gpt-4o",
			name: "GPT-4o",
			provider: "openai",
		},
	]),
}))

vi.mock("@/components/ai-elements/model-selector", () => {
	const MockModelSelectorInput = React.forwardRef<
		HTMLInputElement,
		React.InputHTMLAttributes<HTMLInputElement>
	>((props, ref) => React.createElement("input", { ...props, ref }))
	MockModelSelectorInput.displayName = "MockModelSelectorInput"

	return {
		ModelSelector: ({ children }: { children?: React.ReactNode }) =>
			React.createElement("div", { "data-testid": "mock-model-selector-root" }, children),
		ModelSelectorTrigger: ({ children }: { children?: React.ReactNode }) =>
			React.createElement(React.Fragment, null, children),
		ModelSelectorContent: ({ children }: { children?: React.ReactNode }) =>
			React.createElement("div", { "data-testid": "mock-model-selector-content" }, children),
		ModelSelectorInput: MockModelSelectorInput,
		ModelSelectorList: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
			React.createElement("div", props, children),
		ModelSelectorEmpty: ({ children }: { children?: React.ReactNode }) =>
			React.createElement("div", null, children),
		ModelSelectorGroup: ({
			children,
			heading,
		}: {
			children?: React.ReactNode
			heading?: React.ReactNode
		}) => React.createElement("section", null, heading, children),
		ModelSelectorItem: ({
			children,
			onSelect,
			...props
		}: {
			children?: React.ReactNode
			onSelect?: () => void
		} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onSelect">) =>
			React.createElement(
				"button",
				{ type: "button", onClick: () => onSelect?.(), ...props },
				children,
			),
		ModelSelectorLogo: ({ provider }: { provider: string }) =>
			React.createElement("span", { "data-testid": `provider-${provider}` }, provider),
		ModelSelectorName: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) =>
			React.createElement("span", props, children),
	}
})

vi.mock("@/components/ui/sheet", () => ({
	Sheet: ({ children }: { children?: React.ReactNode }) =>
		React.createElement("div", null, children),
	SheetContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
		React.createElement("div", props, children),
	SheetHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
		React.createElement("div", props, children),
	SheetFooter: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
		React.createElement("div", props, children),
	SheetTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) =>
		React.createElement("h2", props, children),
	SheetDescription: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) =>
		React.createElement("p", props, children),
}))

vi.mock("@/components/ui/slider", () => ({
	Slider: ({
		value,
		onChange,
		...props
	}: {
		value: number
		onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
	} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) =>
		React.createElement("input", {
			...props,
			type: "range",
			value,
			onChange,
		}),
}))

vi.mock("@/components/ui/switch", () => ({
	Switch: ({
		checked,
		onCheckedChange,
		...props
	}: {
		checked: boolean
		onCheckedChange: (checked: boolean) => void
	} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "checked" | "onChange">) =>
		React.createElement("input", {
			...props,
			type: "checkbox",
			role: "switch",
			checked,
			onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
				onCheckedChange(event.target.checked),
		}),
}))

vi.mock("@/features/settings/hooks/use-settings", () => ({
	useSettings: () => mockUseSettings(),
	useSettingsSetter: () => ({
		updateSettings: mockUpdateSettings,
		resetSettings: mockResetSettings,
	}),
}))

function createModel(overrides: Partial<ModelMetadata>): ModelMetadata {
	return {
		id: "openai:gpt-4o",
		provider: "openai",
		providerModelId: "gpt-4o",
		name: "GPT-4o",
		description: "General purpose model",
		supportsToolCalling: true,
		supportsReasoning: true,
		modalities: { input: ["text"], output: ["text"] },
		contextWindow: 128_000,
		maxOutputTokens: 16_384,
		source: "static",
		...overrides,
	}
}

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
	mockUseSettings.mockReturnValue(defaultSettings)
	// biome-ignore lint/suspicious/noDocumentCookie: test setup needs deterministic cookie reset
	document.cookie = `${MODEL_COOKIE_NAME}=;max-age=0;path=/`
	localStorage.removeItem(MODEL_COOKIE_NAME)
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

	it("renders register variant with optional name field", () => {
		render(<AuthForm mode="register" action={register} />)

		expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
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

		await waitFor(() => {
			expect(screen.getByTestId("loading-state")).toHaveTextContent("false")
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

describe("ModelSelector", () => {
	it("renders trigger and selected model metadata", () => {
		const models = [
			createModel({
				id: "openai:gpt-4o",
				provider: "openai",
				providerModelId: "gpt-4o",
				name: "GPT-4o",
			}),
		]

		render(
			<ModelSelector
				selectedModelId="openai:gpt-4o"
				onModelChange={vi.fn()}
				models={models}
			/>,
		)

		expect(screen.getByTestId("model-selector")).toBeInTheDocument()
		expect(screen.getAllByText("GPT-4o").length).toBeGreaterThan(0)
		expect(screen.getAllByTestId("provider-openai").length).toBeGreaterThan(0)
	})

	it("falls back to placeholder text when selected model is unavailable", () => {
		render(
			<ModelSelector
				selectedModelId="missing:model"
				onModelChange={vi.fn()}
				models={[createModel({ name: "GPT-4o" })]}
			/>,
		)

		expect(screen.getByText(/select model/i)).toBeInTheDocument()
	})

	it("calls onModelChange and persists selection when a model is selected", () => {
		const handleModelChange = vi.fn()
		const targetModelId = "google:gemini-2.5-flash"
		const models = [
			createModel({
				id: "openai:gpt-4o",
				provider: "openai",
				providerModelId: "gpt-4o",
				name: "GPT-4o",
			}),
			createModel({
				id: targetModelId,
				provider: "google",
				providerModelId: "gemini-2.5-flash",
				name: "Gemini 2.5 Flash",
				source: "static",
			}),
		]

		render(
			<ModelSelector
				selectedModelId="openai:gpt-4o"
				onModelChange={handleModelChange}
				models={models}
			/>,
		)

		fireEvent.click(screen.getByRole("button", { name: /gemini 2.5 flash/i }))

		expect(handleModelChange).toHaveBeenCalledWith(targetModelId)
		expect(localStorage.getItem(MODEL_COOKIE_NAME)).toBeNull()
		expect(document.cookie).toContain(`${MODEL_COOKIE_NAME}=${targetModelId}`)
	})
})

describe("SettingsPanel", () => {
	it("renders settings panel sections and controls", () => {
		render(<SettingsPanel open onOpenChange={vi.fn()} />)

		expect(screen.getByText("Chat Settings")).toBeInTheDocument()
		expect(screen.getByRole("slider", { name: /temperature/i })).toBeInTheDocument()
		expect(screen.getByRole("slider", { name: /top p/i })).toBeInTheDocument()
		expect(screen.getByLabelText(/max output tokens/i)).toBeInTheDocument()
		expect(screen.getByRole("textbox", { name: /system prompt/i })).toBeInTheDocument()
		expect(screen.getByRole("switch", { name: /enable reasoning/i })).toBeInTheDocument()
	})

	it("updates settings and handles reset/done actions", () => {
		const onOpenChange = vi.fn()
		render(<SettingsPanel open onOpenChange={onOpenChange} />)

		fireEvent.change(screen.getByRole("slider", { name: /temperature/i }), {
			target: { value: "1.25" },
		})
		fireEvent.change(screen.getByRole("slider", { name: /top p/i }), {
			target: { value: "0.55" },
		})
		fireEvent.change(screen.getByLabelText(/max output tokens/i), {
			target: { value: "128" },
		})
		fireEvent.change(screen.getByRole("textbox", { name: /system prompt/i }), {
			target: { value: "Be concise and direct." },
		})
		fireEvent.click(screen.getByRole("switch", { name: /enable reasoning/i }))
		fireEvent.click(screen.getByRole("switch", { name: /detailed token usage/i }))

		expect(mockUpdateSettings).toHaveBeenCalledWith({ temperature: 1.25 })
		expect(mockUpdateSettings).toHaveBeenCalledWith({ topP: 0.55 })
		expect(mockUpdateSettings).toHaveBeenCalledWith({ maxOutputTokens: 256 })
		expect(mockUpdateSettings).toHaveBeenCalledWith({ systemPrompt: "Be concise and direct." })
		expect(mockUpdateSettings).toHaveBeenCalledWith({ enableReasoning: true })
		expect(mockUpdateSettings).toHaveBeenCalledWith({ contextDisplayMode: "detailed" })

		fireEvent.click(screen.getByRole("button", { name: /reset to defaults/i }))
		expect(mockResetSettings).toHaveBeenCalledTimes(1)

		fireEvent.click(screen.getByRole("button", { name: /done/i }))
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})
