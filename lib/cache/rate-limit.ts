import "server-only"

import { expire, incr } from "@/lib/cache/client"

/**
 * Check rate limit for the given Redis key.
 *
 * Returns `true` if the request is within the limit.
 * Gracefully degrades to `true` if Redis is unavailable.
 */
export async function checkRateLimit(
	key: string,
	limit: number,
	windowSeconds: number,
): Promise<boolean> {
	const count = await incr(key)

	if (count === null) {
		return true // Redis unavailable — allow (graceful degradation)
	}

	if (count === 1) {
		await expire(key, windowSeconds)
	}

	return count <= limit
}
