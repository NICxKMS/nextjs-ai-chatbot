/**
 * Get Weather Tool
 * Ref: 05-ai-integration-optimal-design.md
 *
 * AI tool for fetching weather data using Open-Meteo API.
 * Supports both coordinates and city name inputs.
 *
 * @module lib/ai/tools/get-weather
 */

import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// TYPES
// =============================================================================

export type WeatherAtLocation = {
    latitude: number;
    longitude: number;
    generationtime_ms: number;
    utc_offset_seconds: number;
    timezone: string;
    timezone_abbreviation: string;
    elevation: number;
    cityName?: string;
    current_units: {
        time: string;
        interval: string;
        temperature_2m: string;
    };
    current: {
        time: string;
        interval: number;
        temperature_2m: number;
    };
    hourly_units: {
        time: string;
        temperature_2m: string;
    };
    hourly: {
        time: string[];
        temperature_2m: number[];
    };
    daily_units: {
        time: string;
        sunrise: string;
        sunset: string;
    };
    daily: {
        time: string[];
        sunrise: string[];
        sunset: string[];
    };
};

// =============================================================================
// HELPERS
// =============================================================================

async function geocodeCity(
    city: string
): Promise<{ latitude: number; longitude: number } | null> {
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

// =============================================================================
// TOOL DEFINITION
// =============================================================================

/**
 * AI tool for fetching current weather data.
 *
 * Uses the Open-Meteo API which is free and requires no API key.
 * Supports both coordinate-based and city name-based lookups.
 *
 * @example
 * ```ts
 * // In streamText tools configuration
 * tools: {
 *   getWeather: getWeather,
 * }
 * ```
 */
export const getWeather = tool({
    description:
        "Get the current weather at a location. You can provide either coordinates or a city name.",
    inputSchema: z.union([
        z.object({
            latitude: z.number(),
            longitude: z.number(),
        }),
        z.object({
            city: z
                .string()
                .describe(
                    "City name (e.g., 'San Francisco', 'New York', 'London')"
                ),
        }),
    ]),
    execute: async (input) => {
        let latitude: number;
        let longitude: number;

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

        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
        );

        const weatherData = await response.json();

        if ("city" in input) {
            weatherData.cityName = input.city;
        }

        return weatherData;
    },
});
