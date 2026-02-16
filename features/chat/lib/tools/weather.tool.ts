/**
 * Weather Tool
 *
 * AI tool for fetching current weather data for a location.
 * Uses Open-Meteo API for weather data and geocoding.
 *
 * @module features/chat/lib/tools/weather.tool
 */

import { tool } from "ai"
import { z } from "zod"
import { ToolExecutionError } from "./errors"

// =============================================================================
// Configuration
// =============================================================================

/**
 * Default timeout for weather API requests (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Maximum retry attempts for transient failures
 */
const MAX_RETRIES = 2

/**
 * Delay between retry attempts (exponential backoff base)
 */
const RETRY_DELAY_MS = 1000

// =============================================================================
// Geocoding API
// =============================================================================

/**
 * Geocoding result from Open-Meteo API
 */
interface GeocodingResult {
	latitude: number
	longitude: number
	name: string
}

/**
 * Geocodes a city name to coordinates using Open-Meteo Geocoding API.
 *
 * @param city - City name to geocode
 * @param timeoutMs - Request timeout in milliseconds
 * @returns Coordinates and city name, or null if not found
 */
async function geocodeCity(
	city: string,
	timeoutMs: number,
): Promise<GeocodingResult | null> {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const response = await fetch(
			`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
			{ signal: controller.signal },
		)

		if (!response.ok) {
			return null
		}

		const data = await response.json()

		if (!data.results || data.results.length === 0) {
			return null
		}

		const result = data.results[0]
		return {
			latitude: result.latitude,
			longitude: result.longitude,
			name: result.name,
		}
	} catch {
		return null
	} finally {
		clearTimeout(timeoutId)
	}
}

// =============================================================================
// Weather API
// =============================================================================

/**
 * Weather data from Open-Meteo API
 */
interface WeatherData {
	latitude: number
	longitude: number
	current?: {
		temperature_2m: number
		time: string
	}
	hourly?: {
		temperature_2m: number[]
		time: string[]
	}
	daily?: {
		sunrise: string[]
		sunset: string[]
	}
	cityName?: string
}

/**
 * Fetches weather data from Open-Meteo API with retry logic.
 *
 * @param latitude - Location latitude
 * @param longitude - Location longitude
 * @param timeoutMs - Request timeout in milliseconds
 * @param retries - Number of retries attempted
 * @returns Weather data
 */
async function fetchWeather(
	latitude: number,
	longitude: number,
	timeoutMs: number,
	retries = 0,
): Promise<WeatherData> {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const response = await fetch(
			`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
			{ signal: controller.signal },
		)

		if (!response.ok) {
			throw new Error(`Weather API returned ${response.status}`)
		}

		return await response.json()
	} catch (error) {
		// Retry on transient failures
		if (retries < MAX_RETRIES && isTransientError(error)) {
			await delay(RETRY_DELAY_MS * (retries + 1))
			return fetchWeather(latitude, longitude, timeoutMs, retries + 1)
		}

		throw error
	} finally {
		clearTimeout(timeoutId)
	}
}

/**
 * Checks if an error is transient and worth retrying.
 */
function isTransientError(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message.toLowerCase()
		return (
			message.includes("network") ||
			message.includes("timeout") ||
			message.includes("econnreset") ||
			message.includes("econnrefused")
		)
	}
	return false
}

/**
 * Delays execution for a specified duration.
 */
function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

// =============================================================================
// Tool Definition
// =============================================================================

/**
 * Input schema for weather tool
 */
const weatherInputSchema = z.union([
	z.object({
		latitude: z.number().describe("Location latitude"),
		longitude: z.number().describe("Location longitude"),
	}),
	z.object({
		city: z
			.string()
			.describe(
				"City name (e.g., 'San Francisco', 'New York', 'London')",
			),
	}),
])

/**
 * Weather tool for fetching current weather data.
 *
 * Supports two input modes:
 * 1. Coordinates (latitude/longitude) - Direct lookup
 * 2. City name - Geocoded to coordinates first
 *
 * @example
 * ```typescript
 * // By coordinates
 * const result = await weatherTool.execute({ latitude: 37.7749, longitude: -122.4194 });
 *
 * // By city name
 * const result = await weatherTool.execute({ city: 'San Francisco' });
 * ```
 */
export const weatherTool = tool({
	description:
		"Get the current weather at a location. You can provide either coordinates or a city name.",

	inputSchema: weatherInputSchema,

	execute: async (input) => {
		const timeoutMs = DEFAULT_TIMEOUT_MS

		try {
			let latitude: number
			let longitude: number
			let cityName: string | undefined

			// Handle city name input
			if ("city" in input) {
				const coords = await geocodeCity(input.city, timeoutMs)
				if (!coords) {
					return {
						error: `Could not find coordinates for "${input.city}". Please check the city name.`,
					}
				}
				latitude = coords.latitude
				longitude = coords.longitude
				cityName = coords.name
			} else {
				latitude = input.latitude
				longitude = input.longitude
			}

			// Fetch weather data
			const weatherData = await fetchWeather(
				latitude,
				longitude,
				timeoutMs,
			)

			// Add city name if available
			if (cityName) {
				weatherData.cityName = cityName
			}

			return weatherData
		} catch (error) {
			// Handle timeout
			if (error instanceof Error && error.name === "AbortError") {
				throw ToolExecutionError.timeout("weather", timeoutMs)
			}

			// Handle other errors
			throw ToolExecutionError.executionFailed(
				"weather",
				[error instanceof Error ? error.message : "Unknown error"].join(
					": ",
				),
				error instanceof Error ? { originalError: error } : undefined,
			)
		}
	},
})

/**
 * Tool name for registration
 */
export const WEATHER_TOOL_NAME = "getWeather" as const
