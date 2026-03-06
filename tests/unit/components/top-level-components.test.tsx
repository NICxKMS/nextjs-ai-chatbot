// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FileIcon, LoaderIcon, SidebarLeftIcon } from "@/components/icons"
import { MotionProvider } from "@/components/motion-provider"
import { SidebarToggle } from "@/components/sidebar-toggle"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/toaster"
import { Weather, type WeatherAtLocation } from "@/components/weather"

const { mockToggleSidebar, mockUseIsMobile } = vi.hoisted(() => ({
	mockToggleSidebar: vi.fn(),
	mockUseIsMobile: vi.fn(),
}))

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
}))

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

vi.mock("@/lib/hooks/use-mobile", () => ({
	useIsMobile: (...args: unknown[]) => mockUseIsMobile(...args),
}))

function createWeatherData(overrides: Partial<WeatherAtLocation> = {}): WeatherAtLocation {
	const base: WeatherAtLocation = {
		latitude: 10.12,
		longitude: 20.23,
		generationtime_ms: 0.1,
		utc_offset_seconds: 0,
		timezone: "UTC",
		timezone_abbreviation: "UTC",
		elevation: 2,
		cityName: "Tokyo",
		current_units: {
			time: "iso8601",
			interval: "seconds",
			temperature_2m: "C",
		},
		current: {
			time: "2026-03-05T09:00:00.000Z",
			interval: 900,
			temperature_2m: 21.2,
		},
		hourly_units: {
			time: "iso8601",
			temperature_2m: "C",
		},
		hourly: {
			time: [
				"2026-03-05T09:00:00.000Z",
				"2026-03-05T10:00:00.000Z",
				"2026-03-05T11:00:00.000Z",
				"2026-03-05T12:00:00.000Z",
				"2026-03-05T13:00:00.000Z",
				"2026-03-05T14:00:00.000Z",
				"2026-03-05T15:00:00.000Z",
				"2026-03-05T16:00:00.000Z",
			],
			temperature_2m: [21, 22, 23, 24, 25, 24, 23, 22],
		},
		daily_units: {
			time: "iso8601",
			sunrise: "iso8601",
			sunset: "iso8601",
		},
		daily: {
			time: ["2026-03-05"],
			sunrise: ["2026-03-05T06:00:00.000Z"],
			sunset: ["2026-03-05T18:00:00.000Z"],
		},
	}

	return {
		...base,
		...overrides,
		current_units: { ...base.current_units, ...overrides.current_units },
		current: { ...base.current, ...overrides.current },
		hourly_units: { ...base.hourly_units, ...overrides.hourly_units },
		hourly: { ...base.hourly, ...overrides.hourly },
		daily_units: { ...base.daily_units, ...overrides.daily_units },
		daily: { ...base.daily, ...overrides.daily },
	}
}

const iconComponents: Array<[string, React.ComponentType<{ size?: number }>]> = [
	["FileIcon", FileIcon],
	["LoaderIcon", LoaderIcon],
	["SidebarLeftIcon", SidebarLeftIcon],
]

beforeEach(() => {
	vi.clearAllMocks()
	mockUseIsMobile.mockReturnValue(false)
})

describe("icons", () => {
	it.each(iconComponents)("renders %s without crashing", (_iconName, IconComponent) => {
		const { container } = render(<IconComponent size={20} />)
		const svg = container.querySelector("svg")

		expect(svg).toBeTruthy()
		expect(svg).toHaveAttribute("width", "20")
	})
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

describe("SidebarToggle", () => {
	it("renders toggle button and tooltip content", () => {
		render(<SidebarToggle />)

		expect(screen.getByTestId("sidebar-toggle")).toBeInTheDocument()
		expect(screen.getByText("Toggle Sidebar")).toBeInTheDocument()
	})

	it("calls toggleSidebar when clicked", () => {
		const { getByTestId } = render(<SidebarToggle className="custom-class" />)
		const toggleButton = getByTestId("sidebar-toggle")

		fireEvent.click(toggleButton)

		expect(toggleButton).toHaveClass("custom-class")
		expect(mockToggleSidebar).toHaveBeenCalledTimes(1)
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

describe("Weather", () => {
	it("renders day weather and desktop hourly forecast", () => {
		const weatherData = createWeatherData()
		const { container } = render(<Weather weatherAtLocation={weatherData} />)

		const weatherRegion = screen.getByRole("region", { name: /weather for tokyo/i })
		expect(weatherRegion).toBeInTheDocument()
		expect(weatherRegion).toHaveClass("from-sky-400")
		expect(screen.getByText("Hourly Forecast")).toBeInTheDocument()
		expect(container.querySelectorAll('path[d^="M18 10h-1.26"]').length).toBe(6)
	})

	it("uses 5 hourly entries on mobile", () => {
		mockUseIsMobile.mockReturnValue(true)

		const weatherData = createWeatherData()
		const { container } = render(<Weather weatherAtLocation={weatherData} />)

		expect(container.querySelectorAll('path[d^="M18 10h-1.26"]').length).toBe(5)
	})

	it("defaults to 6 hourly entries while hydration state is undefined", () => {
		mockUseIsMobile.mockReturnValue(undefined)

		const weatherData = createWeatherData()
		const { container } = render(<Weather weatherAtLocation={weatherData} />)

		expect(container.querySelectorAll('path[d^="M18 10h-1.26"]').length).toBe(6)
	})

	it("falls back to coordinates and night theme outside sunrise/sunset", () => {
		const weatherData = createWeatherData({
			cityName: undefined,
			daily: {
				time: ["2026-03-05"],
				sunrise: ["2026-03-05T00:00:00.000Z"],
				sunset: ["2026-03-05T08:00:00.000Z"],
			},
		})

		render(<Weather weatherAtLocation={weatherData} />)

		expect(
			screen.getByRole("region", { name: /weather for 10\.1\u00b0, 20\.2\u00b0/i }),
		).toHaveClass("from-indigo-900")
	})
})
