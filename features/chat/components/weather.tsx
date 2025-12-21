/**
 * Weather Component
 *
 * Displays weather data with forecast cards, temperature, and conditions.
 * Uses Open-Meteo API data structure.
 *
 * @module features/chat/components/weather
 */

"use client";

import { format, isWithinInterval } from "date-fns";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/lib/utils";

// =============================================================================
// ICONS
// =============================================================================

const SunIcon = ({ size = 40 }: { size?: number }) => (
    <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
        <circle cx="12" cy="12" fill="currentColor" r="5" />
        <line
            stroke="currentColor"
            strokeWidth="2"
            x1="12"
            x2="12"
            y1="1"
            y2="3"
        />
        <line
            stroke="currentColor"
            strokeWidth="2"
            x1="12"
            x2="12"
            y1="21"
            y2="23"
        />
        <line
            stroke="currentColor"
            strokeWidth="2"
            x1="4.22"
            x2="5.64"
            y1="4.22"
            y2="5.64"
        />
        <line
            stroke="currentColor"
            strokeWidth="2"
            x1="18.36"
            x2="19.78"
            y1="18.36"
            y2="19.78"
        />
        <line
            stroke="currentColor"
            strokeWidth="2"
            x1="1"
            x2="3"
            y1="12"
            y2="12"
        />
        <line
            stroke="currentColor"
            strokeWidth="2"
            x1="21"
            x2="23"
            y1="12"
            y2="12"
        />
        <line
            stroke="currentColor"
            strokeWidth="2"
            x1="4.22"
            x2="5.64"
            y1="19.78"
            y2="18.36"
        />
        <line
            stroke="currentColor"
            strokeWidth="2"
            x1="18.36"
            x2="19.78"
            y1="5.64"
            y2="4.22"
        />
    </svg>
);

const MoonIcon = ({ size = 40 }: { size?: number }) => (
    <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
        <path
            d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z"
            fill="currentColor"
        />
    </svg>
);

const CloudIcon = ({ size = 24 }: { size?: number }) => (
    <svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
        <path
            d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        />
    </svg>
);

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
// SAMPLE DATA
// =============================================================================

const SAMPLE: WeatherAtLocation = {
    latitude: 37.763_283,
    longitude: -122.412_86,
    generationtime_ms: 0.027_894_973_754_882_812,
    utc_offset_seconds: 0,
    timezone: "GMT",
    timezone_abbreviation: "GMT",
    elevation: 18,
    current_units: {
        time: "iso8601",
        interval: "seconds",
        temperature_2m: "°C",
    },
    current: { time: "2024-10-07T19:30", interval: 900, temperature_2m: 29.3 },
    hourly_units: { time: "iso8601", temperature_2m: "°C" },
    hourly: {
        time: [
            "2024-10-07T00:00",
            "2024-10-07T01:00",
            "2024-10-07T02:00",
            "2024-10-07T03:00",
            "2024-10-07T04:00",
            "2024-10-07T05:00",
            "2024-10-07T06:00",
            "2024-10-07T07:00",
            "2024-10-07T08:00",
            "2024-10-07T09:00",
            "2024-10-07T10:00",
            "2024-10-07T11:00",
            "2024-10-07T12:00",
            "2024-10-07T13:00",
            "2024-10-07T14:00",
            "2024-10-07T15:00",
            "2024-10-07T16:00",
            "2024-10-07T17:00",
            "2024-10-07T18:00",
            "2024-10-07T19:00",
            "2024-10-07T20:00",
            "2024-10-07T21:00",
            "2024-10-07T22:00",
            "2024-10-07T23:00",
        ],
        temperature_2m: [
            36.6, 32.8, 29.5, 28.6, 29.2, 28.2, 27.5, 26.6, 26.5, 26, 25, 23.5,
            23.9, 24.2, 22.9, 21, 24, 28.1, 31.4, 33.9, 32.1, 28.9, 26.9, 25.2,
        ],
    },
    daily_units: {
        time: "iso8601",
        sunrise: "iso8601",
        sunset: "iso8601",
    },
    daily: {
        time: [
            "2024-10-07",
            "2024-10-08",
            "2024-10-09",
            "2024-10-10",
            "2024-10-11",
        ],
        sunrise: [
            "2024-10-07T07:15",
            "2024-10-08T07:16",
            "2024-10-09T07:17",
            "2024-10-10T07:18",
            "2024-10-11T07:19",
        ],
        sunset: [
            "2024-10-07T19:00",
            "2024-10-08T18:58",
            "2024-10-09T18:57",
            "2024-10-10T18:55",
            "2024-10-11T18:54",
        ],
    },
};

// =============================================================================
// HELPERS
// =============================================================================

function n(num: number): number {
    return Math.ceil(num);
}

// =============================================================================
// COMPONENT
// =============================================================================

export interface WeatherProps {
    weatherAtLocation?: WeatherAtLocation;
}

/**
 * Weather display component.
 *
 * Shows current temperature, high/low, hourly forecast, and sunrise/sunset times.
 * Adapts appearance based on day/night time.
 *
 * @example
 * ```tsx
 * <Weather weatherAtLocation={weatherData} />
 * ```
 */
export function Weather({ weatherAtLocation = SAMPLE }: WeatherProps) {
    const currentHigh = Math.max(
        ...weatherAtLocation.hourly.temperature_2m.slice(0, 24)
    );
    const currentLow = Math.min(
        ...weatherAtLocation.hourly.temperature_2m.slice(0, 24)
    );

    const sunrise = weatherAtLocation.daily.sunrise[0];
    const sunset = weatherAtLocation.daily.sunset[0];
    const isDay =
        sunrise && sunset
            ? isWithinInterval(new Date(weatherAtLocation.current.time), {
                  start: new Date(sunrise),
                  end: new Date(sunset),
              })
            : true;

    const isMobile = useIsMobile();

    // Default to 6 hours while isMobile is undefined (during hydration)
    const hoursToShow = isMobile === undefined ? 6 : isMobile ? 5 : 6;

    const currentTimeIndex = weatherAtLocation.hourly.time.findIndex(
        (time) => new Date(time) >= new Date(weatherAtLocation.current.time)
    );

    const displayTimes = weatherAtLocation.hourly.time.slice(
        currentTimeIndex,
        currentTimeIndex + hoursToShow
    );
    const displayTemperatures = weatherAtLocation.hourly.temperature_2m.slice(
        currentTimeIndex,
        currentTimeIndex + hoursToShow
    );

    const location =
        weatherAtLocation.cityName ||
        `${weatherAtLocation.latitude?.toFixed(1)}°, ${weatherAtLocation.longitude?.toFixed(1)}°`;

    return (
        <div
            className={cn(
                "relative flex w-full flex-col gap-6 overflow-hidden rounded-3xl p-6 shadow-lg backdrop-blur-sm",
                {
                    "bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600":
                        isDay,
                },
                {
                    "bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900":
                        !isDay,
                }
            )}
        >
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />

            <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between">
                    <div className="font-medium text-sm text-white/80">
                        {location}
                    </div>
                    <div className="text-white/60 text-xs">
                        {format(
                            new Date(weatherAtLocation.current.time),
                            "MMM d, h:mm a"
                        )}
                    </div>
                </div>

                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            className={cn("text-white/90", {
                                "text-yellow-200": isDay,
                                "text-blue-200": !isDay,
                            })}
                        >
                            {isDay ? (
                                <SunIcon size={48} />
                            ) : (
                                <MoonIcon size={48} />
                            )}
                        </div>
                        <div className="font-light text-5xl text-white">
                            {n(weatherAtLocation.current.temperature_2m)}
                            <span className="text-2xl text-white/80">
                                {weatherAtLocation.current_units.temperature_2m}
                            </span>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="font-medium text-sm text-white/90">
                            H: {n(currentHigh)}°
                        </div>
                        <div className="text-sm text-white/70">
                            L: {n(currentLow)}°
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <div className="mb-3 font-medium text-sm text-white/80">
                        Hourly Forecast
                    </div>
                    <div className="flex justify-between gap-2">
                        {displayTimes.map((time, index) => {
                            const hourTime = new Date(time);
                            const isCurrentHour =
                                hourTime.getHours() === new Date().getHours();

                            return (
                                <div
                                    className={cn(
                                        "flex min-w-0 flex-1 flex-col items-center gap-2 rounded-lg px-1 py-2",
                                        {
                                            "bg-white/20": isCurrentHour,
                                        }
                                    )}
                                    key={time}
                                >
                                    <div className="font-medium text-white/70 text-xs">
                                        {index === 0
                                            ? "Now"
                                            : format(hourTime, "ha")}
                                    </div>

                                    <div
                                        className={cn("text-white/60", {
                                            "text-yellow-200": isDay,
                                            "text-blue-200": !isDay,
                                        })}
                                    >
                                        <CloudIcon size={20} />
                                    </div>

                                    <div className="font-medium text-sm text-white">
                                        {displayTemperatures[index] !==
                                        undefined
                                            ? n(displayTemperatures[index])
                                            : "--"}
                                        °
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-4 flex justify-between text-white/60 text-xs">
                    <div>
                        Sunrise:{" "}
                        {sunrise ? format(new Date(sunrise), "h:mm a") : "--"}
                    </div>
                    <div>
                        Sunset:{" "}
                        {sunset ? format(new Date(sunset), "h:mm a") : "--"}
                    </div>
                </div>
            </div>
        </div>
    );
}
