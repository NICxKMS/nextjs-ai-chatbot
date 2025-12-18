"use server";

/**
 * Weather Tool Definition
 * @module new-arch/lib/ai/tools/definitions/get-weather
 *
 * Tool for fetching current weather information for a location.
 */

import { tool } from "ai";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

type GeocodingResult = {
    latitude: number;
    longitude: number;
};

type WeatherResult = {
    latitude: number;
    longitude: number;
    timezone: string;
    current: {
        temperature_2m: number;
    };
    hourly: {
        temperature_2m: number[];
    };
    daily: {
        sunrise: string[];
        sunset: string[];
    };
    cityName?: string;
};

type WeatherError = {
    error: string;
};

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Geocode a city name to coordinates using Open-Meteo API
 */
async function geocodeCity(city: string): Promise<GeocodingResult | null> {
    try {
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return null;
        }

        const result = data.results[0];
        return {
            latitude: result.latitude,
            longitude: result.longitude,
        };
    } catch {
        return null;
    }
}

// ============================================================================
// Tool Definition
// ============================================================================

const inputSchema = z.union([
    z.object({
        latitude: z.number().describe("Latitude coordinate"),
        longitude: z.number().describe("Longitude coordinate"),
    }),
    z.object({
        city: z
            .string()
            .describe(
                "City name (e.g., 'San Francisco', 'New York', 'London')"
            ),
    }),
]);

type GetWeatherInput = z.infer<typeof inputSchema>;

/**
 * Get Weather Tool
 *
 * Fetches current weather information for a location.
 * Accepts either coordinates or a city name.
 *
 * @example
 * ```ts
 * const weather = getWeather;
 * const result = await weather.execute({ city: 'London' });
 * // or
 * const result = await weather.execute({ latitude: 51.5, longitude: -0.1 });
 * ```
 */
export const getWeather = tool({
    description:
        "Get the current weather at a location. You can provide either coordinates or a city name.",
    parameters: inputSchema,
    execute: async (
        input: GetWeatherInput
    ): Promise<WeatherResult | WeatherError> => {
        let latitude: number;
        let longitude: number;

        // Resolve coordinates from city name if needed
        if ("city" in input) {
            const coords = await geocodeCity(input.city);
            if (!coords) {
                return {
                    error: `Could not find coordinates for "${input.city}". Please check the city name.`,
                };
            }
            latitude = coords.latitude;
            longitude = coords.longitude;
        } else {
            latitude = input.latitude;
            longitude = input.longitude;
        }

        // Fetch weather data from Open-Meteo API
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
        );

        if (!response.ok) {
            return {
                error: `Failed to fetch weather data: ${response.statusText}`,
            };
        }

        const weatherData: WeatherResult = await response.json();

        // Add city name to response if provided
        if ("city" in input) {
            weatherData.cityName = input.city;
        }

        return weatherData;
    },
});

// ============================================================================
// Factory Export (for context injection if needed)
// ============================================================================

/**
 * Create weather tool - factory for consistency with other tools
 *
 * Note: Weather tool doesn't require context, but factory pattern
 * maintains consistency with other tool definitions.
 */
export function createGetWeatherTool() {
    return getWeather;
}
