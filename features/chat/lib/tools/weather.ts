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

/**
 * Geocode a city name to coordinates via the Open-Meteo geocoding API.
 */
async function geocodeCity(city: string): Promise<{ latitude: number; longitude: number } | null> {
	try {
		const response = await fetch(
			`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
		)

		if (!response.ok) return null

		const data = await response.json()
		if (!data.results || data.results.length === 0) return null

		const result = data.results[0]
		return { latitude: result.latitude, longitude: result.longitude }
	} catch {
		return null
	}
}

export const getWeather = tool({
	description:
		"Get the current weather at a location. You can provide either coordinates (latitude/longitude) or a city name.",
	inputSchema: weatherInputSchema,
	execute: async (input) => {
		let latitude: number
		let longitude: number

		if ("city" in input) {
			const coords = await geocodeCity(input.city)
			if (!coords) {
				return {
					error: `Could not find coordinates for "${input.city}". Please check the city name.`,
				}
			}
			latitude = coords.latitude
			longitude = coords.longitude
		} else {
			latitude = input.latitude
			longitude = input.longitude
		}

		const response = await fetch(
			`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
		)

		if (!response.ok) {
			return { error: "Failed to fetch weather data from Open-Meteo API." }
		}

		const weatherData = await response.json()

		if ("city" in input) {
			weatherData.cityName = input.city
		}

		return weatherData
	},
})
