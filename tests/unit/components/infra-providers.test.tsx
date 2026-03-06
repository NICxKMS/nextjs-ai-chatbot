// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { MotionProvider } from "@/components/motion-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/toaster"

vi.mock("framer-motion", () => ({
	MotionConfig: ({
		children,
		reducedMotion,
	}: React.PropsWithChildren<{ reducedMotion?: string }>) =>
		React.createElement(
			"div",
			{ "data-testid": "motion-config", "data-reduced-motion": reducedMotion ?? "" },
			children,
		),
	AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
	motion: {
		div: ({
			children,
			...props
		}: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) =>
			React.createElement("div", props, children),
		span: ({
			children,
			...props
		}: React.PropsWithChildren<React.HTMLAttributes<HTMLSpanElement>>) =>
			React.createElement("span", props, children),
	},
	LazyMotion: ({ children }: { children: React.ReactNode }) => children,
	domMax: {},
	domAnimation: {},
}))

vi.mock("next-themes", () => ({
	ThemeProvider: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
		React.createElement(
			"div",
			{
				"data-testid": "next-themes-provider",
				"data-theme-attribute": String(props.attribute ?? ""),
			},
			children,
		),
}))

vi.mock("sonner", () => ({
	Toaster: ({ position }: { position?: string }) =>
		React.createElement("div", {
			"data-testid": "sonner-toaster",
			"data-position": position ?? "",
		}),
}))

beforeEach(() => {
	vi.clearAllMocks()
})

describe("MotionProvider", () => {
	it("renders children inside MotionConfig", () => {
		render(
			<MotionProvider>
				<div>motion-child</div>
			</MotionProvider>,
		)

		expect(screen.getByText("motion-child")).toBeInTheDocument()
		expect(screen.getByTestId("motion-config")).toHaveAttribute("data-reduced-motion", "user")
	})
})

describe("ThemeProvider", () => {
	it("renders children", () => {
		render(
			<ThemeProvider attribute="class">
				<div>child</div>
			</ThemeProvider>,
		)

		expect(screen.getByText("child")).toBeInTheDocument()
		expect(screen.getByTestId("next-themes-provider")).toHaveAttribute(
			"data-theme-attribute",
			"class",
		)
	})
})

describe("Toaster", () => {
	it("renders sonner toaster with top-center position", () => {
		render(<Toaster />)

		expect(screen.getByTestId("sonner-toaster")).toHaveAttribute("data-position", "top-center")
	})
})
