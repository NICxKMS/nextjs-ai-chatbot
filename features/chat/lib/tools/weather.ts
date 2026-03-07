import { tool } from "ai"
import { z } from "zod"

// ── Weather tool ─────────────────────────────────────────────
// Self-contained tool that fetches current weather from Open-Meteo API.
// Supports both coordinate-based and city-name-based lookups.

const coordinatesSchema = z.object({
	latitude: z.number().describe("Latitude of the location"),
	longitude: z.number().describe("Longitude of the location"),
})

const citySchema = z.object({
	city: z.string().describe("City name (e.g., 'San Francisco', 'New York', 'London')"),
})

const weatherInputSchema = z.union([coordinatesSchema, citySchema])
const WEATHER_REQUEST_TIMEOUT_MS = 10_000
const WEATHER_CITY_CACHE_TTL_MS = 30_000

type WeatherResult = Record<string, unknown>
type WeatherToolResult = WeatherResult | { error: string }

const cityWeatherCache = new Map<string, { expiresAt: number; value: Promise<WeatherToolResult> }>()

async function fetchJson<T>(url: string): Promise<T | null> {
	try {
		const response = await fetch(url, {
			signal: AbortSignal.timeout(WEATHER_REQUEST_TIMEOUT_MS),
		})

		if (!response.ok) {
			return null
		}

		return (await response.json()) as T
	} catch {
		return null
	}
}

/**
 * Geocode a city name to coordinates via the Open-Meteo geocoding API.
 */
async function geocodeCity(city: string): Promise<{ latitude: number; longitude: number } | null> {
	const data = await fetchJson<{
		results?: Array<{ latitude: number; longitude: number }>
	}>(
		`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
	)

	if (!data?.results?.length) {
		return null
	}

	const result = data.results[0]
	if (!result) {
		return null
	}

	return { latitude: result.latitude, longitude: result.longitude }
}

function normalizeCityCacheKey(city: string): string {
	return city.trim().toLocaleLowerCase()
}

async function fetchWeatherByCity(city: string): Promise<WeatherToolResult> {
	const normalizedCity = city.trim()
	const cacheKey = normalizeCityCacheKey(normalizedCity)
	const now = Date.now()
	const cachedEntry = cityWeatherCache.get(cacheKey)

	if (cachedEntry && cachedEntry.expiresAt > now) {
		return cachedEntry.value
	}

	const requestPromise = (async (): Promise<WeatherToolResult> => {
		const coords = await geocodeCity(normalizedCity)
		if (!coords) {
			return {
				error: `Could not find coordinates for "${normalizedCity}". Please check the city name.`,
			}
		}

		const weatherData = await fetchJson<WeatherResult>(
			`https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
		)

		if (!weatherData) {
			return { error: "Failed to fetch weather data from Open-Meteo API." }
		}

		return {
			...weatherData,
			cityName: normalizedCity,
		}
	})()

	cityWeatherCache.set(cacheKey, {
		expiresAt: now + WEATHER_CITY_CACHE_TTL_MS,
		value: requestPromise,
	})

	const result = await requestPromise

	if ("error" in result && cityWeatherCache.get(cacheKey)?.value === requestPromise) {
		cityWeatherCache.delete(cacheKey)
	}

	return result
}

export const getWeather = tool({
	description:
		"Get the current weather at a location. You can provide either coordinates (latitude/longitude) or a city name.",
	inputSchema: weatherInputSchema,
	execute: async (input) => {
		if ("city" in input) {
			return fetchWeatherByCity(input.city)
		}

		const weatherData = await fetchJson<WeatherResult>(
			`https://api.open-meteo.com/v1/forecast?latitude=${input.latitude}&longitude=${input.longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
		)

		if (!weatherData) {
			return { error: "Failed to fetch weather data from Open-Meteo API." }
		}

		return weatherData
	},
})
