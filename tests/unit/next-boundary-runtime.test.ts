import { createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test, vi } from "vitest"

import AuthError from "@/app/(auth)/error"
import AuthLoading from "@/app/(auth)/loading"
import ChatConversationError from "@/app/(chat)/chat/[id]/error"
import ChatConversationLoading from "@/app/(chat)/chat/[id]/loading"
import ChatError from "@/app/(chat)/error"
import ChatLoading from "@/app/(chat)/loading"
import GlobalError from "@/app/global-error"

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) =>
		createElement("a", { href }, children),
}))

function boundaryError() {
	return Object.assign(new Error("Boundary smoke failure"), {
		digest: "test-digest",
	})
}

function renderBoundary(
	Component: (props: { error: Error & { digest?: string }; reset: () => void }) => ReactNode,
) {
	return renderToStaticMarkup(
		createElement(Component, { error: boundaryError(), reset: vi.fn() }),
	)
}

describe("Next.js app boundaries", () => {
	test("renders the global error boundary with recovery actions", () => {
		const markup = renderBoundary(GlobalError)

		expect(markup).toContain("<html")
		expect(markup).toContain("<body")
		expect(markup).toContain('role="alert"')
		expect(markup).toContain("Something went wrong")
		expect(markup).toContain("test-digest")
		expect(markup).toContain("Go Home")
		expect(markup).toContain("Try Again")
	})

	test("renders the chat route error boundary with recovery actions", () => {
		const markup = renderBoundary(ChatError)

		expect(markup).toContain('role="alert"')
		expect(markup).toContain("An error occurred while loading this chat")
		expect(markup).toContain("test-digest")
		expect(markup).toContain("Go Home")
		expect(markup).toContain("Try Again")
	})

	test("renders the conversation error boundary with recovery actions", () => {
		const markup = renderBoundary(ChatConversationError)

		expect(markup).toContain('role="alert"')
		expect(markup).toContain("Failed to load conversation")
		expect(markup).toContain("test-digest")
		expect(markup).toContain("New Chat")
		expect(markup).toContain("Try Again")
	})

	test("renders the auth route error boundary with recovery actions", () => {
		const markup = renderBoundary(AuthError)

		expect(markup).toContain('role="alert"')
		expect(markup).toContain("An error occurred during authentication")
		expect(markup).toContain("test-digest")
		expect(markup).toContain("Go Home")
		expect(markup).toContain("Try Again")
	})

	test("renders chat loading status text", () => {
		const markup = renderToStaticMarkup(createElement(ChatLoading))

		expect(markup).toContain('role="status"')
		expect(markup).toContain('aria-live="polite"')
		expect(markup).toContain('aria-label="Loading chat"')
		expect(markup).toContain("Loading chat")
	})

	test("renders conversation loading status text", () => {
		const markup = renderToStaticMarkup(createElement(ChatConversationLoading))

		expect(markup).toContain('role="status"')
		expect(markup).toContain('aria-live="polite"')
		expect(markup).toContain('aria-label="Loading conversation"')
		expect(markup).toContain("Loading conversation")
	})

	test("renders auth loading status text", () => {
		const markup = renderToStaticMarkup(createElement(AuthLoading))

		expect(markup).toContain('role="status"')
		expect(markup).toContain('aria-live="polite"')
		expect(markup).toContain('aria-label="Loading authentication"')
		expect(markup).toContain("Loading authentication")
		expect(markup).toContain("Loading authentication form")
	})
})
