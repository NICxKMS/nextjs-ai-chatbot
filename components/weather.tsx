"use client"

import { format, isWithinInterval } from "date-fns"
import { useIsMobile } from "@/lib/hooks/use-mobile"
import { cn } from "@/lib/utils/cn"

// ── Inline SVG icons ─────────────────────────────────────────

function SunIcon({ size = 40 }: { size?: number }) {
	return (
		<svg fill="none" height={size} viewBox="0 0 24 24" width={size} aria-hidden="true">
			<circle cx="12" cy="12" fill="currentColor" r="5" />
			<line stroke="currentColor" strokeWidth="2" x1="12" x2="12" y1="1" y2="3" />
			<line stroke="currentColor" strokeWidth="2" x1="12" x2="12" y1="21" y2="23" />
			<line stroke="currentColor" strokeWidth="2" x1="4.22" x2="5.64" y1="4.22" y2="5.64" />
			<line
				stroke="currentColor"
				strokeWidth="2"
				x1="18.36"
				x2="19.78"
				y1="18.36"
				y2="19.78"
			/>
			<line stroke="currentColor" strokeWidth="2" x1="1" x2="3" y1="12" y2="12" />
			<line stroke="currentColor" strokeWidth="2" x1="21" x2="23" y1="12" y2="12" />
			<line stroke="currentColor" strokeWidth="2" x1="4.22" x2="5.64" y1="19.78" y2="18.36" />
			<line stroke="currentColor" strokeWidth="2" x1="18.36" x2="19.78" y1="5.64" y2="4.22" />
		</svg>
	)
}

function MoonIcon({ size = 40 }: { size?: number }) {
	return (
		<svg fill="none" height={size} viewBox="0 0 24 24" width={size} aria-hidden="true">
			<path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z" fill="currentColor" />
		</svg>
	)
}

function CloudIcon({ size = 24 }: { size?: number }) {
	return (
		<svg fill="none" height={size} viewBox="0 0 24 24" width={size} aria-hidden="true">
			<path
				d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			/>
		</svg>
	)
}

// ── Types ────────────────────────────────────────────────────

/**
 * Shape of weather data returned by the Open-Meteo API via
 * `features/chat/lib/tools/weather.ts`.
 */
export interface WeatherAtLocation {
	latitude: number
	longitude: number
	generationtime_ms: number
	utc_offset_seconds: number
	timezone: string
	timezone_abbreviation: string
	elevation: number
	/** Present when the user searched by city name. */
	cityName?: string
	current_units: {
		time: string
		interval: string
		temperature_2m: string
	}
	current: {
		time: string
		interval: number
		temperature_2m: number
	}
	hourly_units: {
		time: string
		temperature_2m: string
	}
	hourly: {
		time: string[]
		temperature_2m: number[]
	}
	daily_units: {
		time: string
		sunrise: string
		sunset: string
	}
	daily: {
		time: string[]
		sunrise: string[]
		sunset: string[]
	}
}

// ── Helpers ──────────────────────────────────────────────────

/** Ceil a number for display (e.g. 29.3 → 30). */
function roundUp(num: number): number {
	return Math.ceil(num)
}

// ── Component ────────────────────────────────────────────────

interface WeatherProps {
	weatherAtLocation: WeatherAtLocation
}

export function Weather({ weatherAtLocation }: WeatherProps) {
	const currentHigh = Math.max(...weatherAtLocation.hourly.temperature_2m.slice(0, 24))
	const currentLow = Math.min(...weatherAtLocation.hourly.temperature_2m.slice(0, 24))

	const sunrise = weatherAtLocation.daily.sunrise[0]
	const sunset = weatherAtLocation.daily.sunset[0]

	const isDay =
		sunrise && sunset
			? isWithinInterval(new Date(weatherAtLocation.current.time), {
					start: new Date(sunrise),
					end: new Date(sunset),
				})
			: true

	const isMobile = useIsMobile()

	// Default to 6 hours while isMobile is undefined (during hydration)
	const hoursToShow = isMobile === undefined ? 6 : isMobile ? 5 : 6

	const currentTimeIndex = weatherAtLocation.hourly.time.findIndex(
		(time) => new Date(time) >= new Date(weatherAtLocation.current.time),
	)

	const displayTimes = weatherAtLocation.hourly.time.slice(
		currentTimeIndex,
		currentTimeIndex + hoursToShow,
	)
	const displayTemperatures = weatherAtLocation.hourly.temperature_2m.slice(
		currentTimeIndex,
		currentTimeIndex + hoursToShow,
	)

	const location =
		weatherAtLocation.cityName ||
		`${weatherAtLocation.latitude?.toFixed(1)}°, ${weatherAtLocation.longitude?.toFixed(1)}°`

	return (
		<section
			className={cn(
				"relative flex w-full flex-col gap-6 overflow-hidden rounded-3xl p-6 shadow-lg backdrop-blur-sm",
				isDay
					? "bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600"
					: "bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900",
			)}
			aria-label={`Weather for ${location}`}
		>
			{/* Frosted glass overlay */}
			<div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />

			<div className="relative z-10">
				{/* Location & time header */}
				<div className="mb-4 flex items-center justify-between">
					<div className="font-medium text-sm text-white/80">{location}</div>
					<div className="text-white/60 text-xs">
						{format(new Date(weatherAtLocation.current.time), "MMM d, h:mm a")}
					</div>
				</div>

				{/* Current temperature */}
				<div className="mb-6 flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div
							className={cn(
								"text-white/90",
								isDay ? "text-yellow-200" : "text-blue-200",
							)}
						>
							{isDay ? <SunIcon size={48} /> : <MoonIcon size={48} />}
						</div>
						<div className="font-light text-5xl text-white">
							{roundUp(weatherAtLocation.current.temperature_2m)}
							<span className="text-2xl text-white/80">
								{weatherAtLocation.current_units.temperature_2m}
							</span>
						</div>
					</div>

					<div className="text-right">
						<div className="font-medium text-sm text-white/90">
							H: {roundUp(currentHigh)}°
						</div>
						<div className="text-sm text-white/70">L: {roundUp(currentLow)}°</div>
					</div>
				</div>

				{/* Hourly forecast */}
				<div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
					<div className="mb-3 font-medium text-sm text-white/80">Hourly Forecast</div>
					<div className="flex justify-between gap-2">
						{displayTimes.map((time, index) => {
							const hourTime = new Date(time)
							const isCurrentHour = hourTime.getHours() === new Date().getHours()

							return (
								<div
									className={cn(
										"flex min-w-0 flex-1 flex-col items-center gap-2 rounded-lg px-1 py-2",
										isCurrentHour && "bg-white/20",
									)}
									key={time}
								>
									<div className="font-medium text-white/70 text-xs">
										{index === 0 ? "Now" : format(hourTime, "ha")}
									</div>

									<div
										className={cn(
											"text-white/60",
											isDay ? "text-yellow-200" : "text-blue-200",
										)}
									>
										<CloudIcon size={20} />
									</div>

									<div className="font-medium text-sm text-white">
										{displayTemperatures[index] !== undefined
											? roundUp(displayTemperatures[index])
											: "--"}
										°
									</div>
								</div>
							)
						})}
					</div>
				</div>

				{/* Sunrise / Sunset */}
				<div className="mt-4 flex justify-between text-white/60 text-xs">
					<div>Sunrise: {sunrise ? format(new Date(sunrise), "h:mm a") : "--"}</div>
					<div>Sunset: {sunset ? format(new Date(sunset), "h:mm a") : "--"}</div>
				</div>
			</div>
		</section>
	)
}
