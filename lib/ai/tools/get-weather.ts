import { tool } from "ai";
import { z } from "zod";

async function geocodeCity(
	city: string
): Promise<{ latitude: number; longitude: number } | null> {
	const normalizedCity = city.trim().toLowerCase();

	try {
		const response = await fetch(
			`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
			{
				next: {
					revalidate: 60 * 60 * 24,
					tags: [`geocode:${normalizedCity}`],
				},
			}
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

async function fetchWeather(latitude: number, longitude: number) {
	const latKey = latitude.toFixed(3);
	const lonKey = longitude.toFixed(3);

	const response = await fetch(
		`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
		{
			next: {
				revalidate: 300,
				tags: [`weather:${latKey}:${lonKey}`],
			},
		}
	);

	return response.json();
}

const weatherInputSchema = z
	.object({
		latitude: z.number().optional(),
		longitude: z.number().optional(),
		city: z
			.string()
			.describe("City name (e.g., 'San Francisco', 'New York', 'London')")
			.optional(),
	})
	.refine(
		(input) =>
			(input.city &&
				input.latitude === undefined &&
				input.longitude === undefined) ||
			(!input.city &&
				input.latitude !== undefined &&
				input.longitude !== undefined),
		{
			message: "Provide either a city or both latitude and longitude.",
		}
	);

export const getWeather = tool({
	description:
		"Get the current weather at a location. You can provide either coordinates or a city name.",
	inputSchema: weatherInputSchema,
	execute: async (input) => {
		let latitude: number;
		let longitude: number;

		if (input.city) {
			const coords = await geocodeCity(input.city);
			if (!coords) {
				return {
					error: `Could not find coordinates for "${input.city}". Please check the city name.`,
				};
			}
			latitude = coords.latitude;
			longitude = coords.longitude;
		} else if (
			input.latitude !== undefined &&
			input.longitude !== undefined
		) {
			latitude = input.latitude;
			longitude = input.longitude;
		} else {
			return {
				error: "Please provide a city or both latitude and longitude.",
			};
		}

		const weatherData = await fetchWeather(latitude, longitude);

		if (input.city) {
			weatherData.cityName = input.city;
		}

		return weatherData;
	},
});
