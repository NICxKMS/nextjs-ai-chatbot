// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) =>
		React.createElement("a", { href }, children),
}))

vi.mock("@/components/ui/button", () => ({
	Button: ({
		asChild,
		children,
		...props
	}: React.PropsWithChildren<React.ComponentProps<"button"> & { asChild?: boolean }>) => {
		if (asChild) {
			return React.createElement(React.Fragment, null, children)
		}

		return React.createElement("button", { type: "button", ...props }, children)
	},
}))

describe("route shell surfaces", () => {
	afterEach(() => {
		consoleErrorSpy.mockClear()
	})

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders the not-found screen with a home link", async () => {
		const { default: NotFound } = await import("@/app/not-found")

		render(<NotFound />)

		expect(screen.getByText("Page not found")).toBeInTheDocument()
		expect(screen.getByRole("link", { name: "Go Home" })).toHaveAttribute("href", "/")
	})

	it("renders the chat loading screen", async () => {
		const { default: Loading } = await import("@/app/(chat)/loading")

		render(<Loading />)

		expect(screen.getByText("Loading chat...")).toBeInTheDocument()
	})

	it("renders the chat conversation loading screen", async () => {
		const { default: Loading } = await import("@/app/(chat)/chat/[id]/loading")

		render(<Loading />)

		expect(screen.getByText("Loading conversation...")).toBeInTheDocument()
	})

	it("renders the chat error boundary and resets on demand", async () => {
		const reset = vi.fn()
		const { default: ChatError } = await import("@/app/(chat)/error")

		render(<ChatError error={new Error("chat failed")} reset={reset} />)

		expect(screen.getByText("Something went wrong")).toBeInTheDocument()
		expect(screen.getByRole("link", { name: "Go Home" })).toHaveAttribute("href", "/")

		await waitFor(() => {
			expect(consoleErrorSpy).toHaveBeenCalledWith("Chat error:", "chat failed")
		})

		fireEvent.click(screen.getByRole("button", { name: "Try Again" }))
		expect(reset).toHaveBeenCalledTimes(1)
	})

	it("renders the global error boundary and shows the digest when available", async () => {
		const reset = vi.fn()
		const error = Object.assign(new Error("root failed"), { digest: "digest-123" })
		const { default: GlobalError } = await import("@/app/global-error")

		render(<GlobalError error={error} reset={reset} />)

		expect(screen.getByText("Something went wrong")).toBeInTheDocument()
		expect(screen.getByText("Error ID: digest-123")).toBeInTheDocument()

		await waitFor(() => {
			expect(consoleErrorSpy).toHaveBeenCalledWith("Global error:", "digest-123")
		})

		fireEvent.click(screen.getByRole("button", { name: "Try Again" }))
		expect(reset).toHaveBeenCalledTimes(1)
	})
})
