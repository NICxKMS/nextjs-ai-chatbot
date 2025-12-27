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
// CONSTANTS
// =============================================================================

/** Default timeout for external API calls (10 seconds) */
const API_TIMEOUT_MS = 10_000;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Create an AbortSignal that times out after specified milliseconds.
 */
function createTimeoutSignal(timeoutMs: number): AbortSignal {
    return AbortSignal.timeout(timeoutMs);
}

async function geocodeCity(
    city: string,
    signal?: AbortSignal
): Promise<{ latitude: number; longitude: number } | null> {
    // Combine user signal with timeout signal
    const timeoutSignal = createTimeoutSignal(API_TIMEOUT_MS);
    const combinedSignal = signal
        ? AbortSignal.any([signal, timeoutSignal])
        : timeoutSignal;

    try {
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
            { signal: combinedSignal }
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
    } catch (error) {
        // Handle abort explicitly
        if (error instanceof DOMException && error.name === "AbortError") {
            return null;
        }
        // Handle timeout
        if (error instanceof DOMException && error.name === "TimeoutError") {
            return null;
        }
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
    execute: async (input, options) => {
        const abortSignal = options?.abortSignal;
        const timeoutSignal = createTimeoutSignal(API_TIMEOUT_MS);
        const combinedSignal = abortSignal
            ? AbortSignal.any([abortSignal, timeoutSignal])
            : timeoutSignal;

        let latitude: number;
        let longitude: number;

        if ("city" in input) {
            const coords = await geocodeCity(input.city, combinedSignal);
            if (!coords) {
                return {
                    error: `Could not find coordinates for "${input.city}". Please check the city name or try again.`,
                };
            }
            latitude = coords.latitude;
            longitude = coords.longitude;
        } else {
            latitude = input.latitude;
            longitude = input.longitude;
        }

        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
                { signal: combinedSignal }
            );

            if (!response.ok) {
                return {
                    error: "Unable to fetch weather data. Please try again later.",
                };
            }

            const weatherData = await response.json();

            if ("city" in input) {
                weatherData.cityName = input.city;
            }

            return weatherData;
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                return { error: "Weather request was cancelled." };
            }
            if (
                error instanceof DOMException &&
                error.name === "TimeoutError"
            ) {
                return {
                    error: "Weather request timed out. Please try again.",
                };
            }
            return {
                error: "Unable to fetch weather data. Please try again later.",
            };
        }
    },
});
