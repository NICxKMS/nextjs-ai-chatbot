// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FileIcon, LoaderIcon, SidebarLeftIcon } from "@/components/icons"
import { Weather, type WeatherAtLocation } from "@/components/weather"

const { mockUseIsMobile } = vi.hoisted(() => ({
	mockUseIsMobile: vi.fn(),
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
