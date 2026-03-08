// Flow: tool-execution | Step: weather-tool
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getWeather } from "@/features/chat/lib/tools/weather"

// ── Helpers ──────────────────────────────────────────────────────

const EXECUTE_OPTIONS = {
	toolCallId: "test-call",
	messages: [] as never[],
	abortSignal: undefined as unknown as AbortSignal,
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	})
}

// biome-ignore lint/style/noNonNullAssertion: execute is always defined for this tool — assert once here
const execute = getWeather.execute!

// ── Tool definition shape ────────────────────────────────────────

describe("getWeather tool", () => {
	describe("tool definition", () => {
		it("has a description string", () => {
			expect(typeof getWeather.description).toBe("string")
			expect(getWeather.description?.length).toBeGreaterThan(0)
		})

		it("has an execute function", () => {
			expect(typeof getWeather.execute).toBe("function")
		})

		it("description mentions coordinates and city", () => {
			expect(getWeather.description).toMatch(/coordinat|latitude|longitude/i)
			expect(getWeather.description).toMatch(/city/i)
		})
	})

	// ── Execute (coordinates) ────────────────────────────────────

	describe("execute with coordinates", () => {
		let fetchSpy: ReturnType<typeof vi.spyOn>

		beforeEach(() => {
			fetchSpy = vi.spyOn(globalThis, "fetch") as ReturnType<typeof vi.spyOn>
		})

		afterEach(() => {
			fetchSpy.mockRestore()
		})

		it("returns weather data for valid coordinates", async () => {
			const weatherData = {
				current: { temperature_2m: 18.5 },
				hourly: { temperature_2m: [18, 19, 20] },
				daily: { sunrise: ["06:30"], sunset: ["18:45"] },
			}
			fetchSpy.mockResolvedValueOnce(jsonResponse(weatherData))

			const result = await execute(
				{ latitude: 37.7749, longitude: -122.4194 },
				EXECUTE_OPTIONS,
			)

			expect(result).toEqual(weatherData)
			expect(fetchSpy).toHaveBeenCalledWith(
				expect.stringContaining("api.open-meteo.com"),
				expect.any(Object),
			)
		})

		it("includes latitude and longitude in the API URL", async () => {
			fetchSpy.mockResolvedValueOnce(jsonResponse({ current: {} }))

			await execute({ latitude: 51.5074, longitude: -0.1278 }, EXECUTE_OPTIONS)

			const url = fetchSpy.mock.calls[0]?.[0] as string
			expect(url).toContain("latitude=51.5074")
			expect(url).toContain("longitude=-0.1278")
		})

		it("returns error object when API responds with non-OK status", async () => {
			fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }))

			const result = await execute({ latitude: 0, longitude: 0 }, EXECUTE_OPTIONS)

			expect(result).toHaveProperty("error")
			expect((result as { error: string }).error).toMatch(/failed to fetch weather/i)
		})

		it("returns error object when fetch throws (network error)", async () => {
			fetchSpy.mockRejectedValueOnce(new Error("Network error"))

			const result = await execute({ latitude: 0, longitude: 0 }, EXECUTE_OPTIONS)

			expect(result).toHaveProperty("error")
		})
	})

	// ── Execute (city) ───────────────────────────────────────────

	describe("execute with city", () => {
		let fetchSpy: ReturnType<typeof vi.spyOn>

		beforeEach(() => {
			fetchSpy = vi.spyOn(globalThis, "fetch") as ReturnType<typeof vi.spyOn>
		})

		afterEach(() => {
			fetchSpy.mockRestore()
		})

		it("geocodes city then fetches weather data", async () => {
			const geocodeData = {
				results: [{ latitude: 37.7749, longitude: -122.4194 }],
			}
			const weatherData = {
				current: { temperature_2m: 20 },
				hourly: { temperature_2m: [] },
				daily: { sunrise: [], sunset: [] },
			}

			fetchSpy
				.mockResolvedValueOnce(jsonResponse(geocodeData))
				.mockResolvedValueOnce(jsonResponse(weatherData))

			const result = await execute({ city: "San Francisco" }, EXECUTE_OPTIONS)

			expect(result).toMatchObject({
				current: { temperature_2m: 20 },
				cityName: "San Francisco",
			})
			expect(fetchSpy).toHaveBeenCalledTimes(2)
		})

		it("returns error when city cannot be geocoded (empty results)", async () => {
			fetchSpy.mockResolvedValueOnce(jsonResponse({ results: [] }))

			const result = await execute({ city: "NonexistentCity99999" }, EXECUTE_OPTIONS)

			expect(result).toHaveProperty("error")
			expect((result as { error: string }).error).toMatch(/could not find coordinates/i)
		})

		it("returns error when geocoding API returns no results field", async () => {
			fetchSpy.mockResolvedValueOnce(jsonResponse({}))

			const result = await execute({ city: "Nowhere" }, EXECUTE_OPTIONS)

			expect(result).toHaveProperty("error")
		})

		it("returns error when weather fetch fails after successful geocoding", async () => {
			const geocodeData = {
				results: [{ latitude: 51.5074, longitude: -0.1278 }],
			}

			fetchSpy
				.mockResolvedValueOnce(jsonResponse(geocodeData))
				.mockResolvedValueOnce(new Response(null, { status: 500 }))

			const result = await execute({ city: "London" }, EXECUTE_OPTIONS)

			expect(result).toHaveProperty("error")
			expect((result as { error: string }).error).toMatch(/failed to fetch weather/i)
		})

		it("returns error when geocoding fetch throws", async () => {
			fetchSpy.mockRejectedValueOnce(new Error("DNS failure"))

			const result = await execute({ city: "Tokyo" }, EXECUTE_OPTIONS)

			expect(result).toHaveProperty("error")
		})
	})
})
