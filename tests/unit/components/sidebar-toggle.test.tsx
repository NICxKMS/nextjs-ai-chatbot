// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SidebarToggle } from "@/components/sidebar-toggle"

const { mockToggleSidebar } = vi.hoisted(() => ({
	mockToggleSidebar: vi.fn(),
}))

vi.mock("@/components/ui/sidebar", () => ({
	useSidebar: () => ({ toggleSidebar: mockToggleSidebar }),
}))

vi.mock("@/components/ui/button", () => ({
	Button: ({ children, ...props }: React.PropsWithChildren<React.ComponentProps<"button">>) =>
		React.createElement("button", { type: "button", ...props }, children),
}))

vi.mock("@/components/ui/tooltip", () => ({
	Tooltip: ({ children }: React.PropsWithChildren) =>
		React.createElement(React.Fragment, null, children),
	TooltipTrigger: ({ children }: React.PropsWithChildren<{ asChild?: boolean }>) =>
		React.createElement(React.Fragment, null, children),
	TooltipContent: ({
		children,
		...props
	}: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) =>
		React.createElement("div", props, children),
}))

beforeEach(() => {
	vi.clearAllMocks()
})

describe("SidebarToggle", () => {
	it("renders toggle button and tooltip content", () => {
		render(<SidebarToggle />)

		expect(screen.getByTestId("sidebar-toggle")).toBeInTheDocument()
		expect(screen.getByText("Toggle Sidebar")).toBeInTheDocument()
	})

	it("calls toggleSidebar when clicked", () => {
		const toggleButton = render(<SidebarToggle className="custom-class" />).getByTestId(
			"sidebar-toggle",
		)

		fireEvent.click(toggleButton)

		expect(toggleButton).toHaveClass("custom-class")
		expect(mockToggleSidebar).toHaveBeenCalledTimes(1)
	})
})
