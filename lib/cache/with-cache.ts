import { cacheLife, cacheTag } from "next/cache"

/**
 * Preset cache life profiles provided by Next.js.
 *
 * @see {@link https://nextjs.org/docs/app/api-reference/functions/cacheLife}
 */
export type CacheLifePreset = "default" | "seconds" | "minutes" | "hours" | "days" | "weeks" | "max"

/**
 * Custom cache life configuration object.
 * All durations are in seconds.
 */
export interface CacheLifeConfig {
	/** How long clients use cached data without checking the server. */
	stale?: number
	/** After this time, the next request triggers a background refresh. */
	revalidate?: number
	/** After this time with no traffic, the cache entry expires completely. */
	expire?: number
}

/**
 * Cache life parameter — either a preset profile name or a custom config object.
 */
export type CacheLife = CacheLifePreset | CacheLifeConfig

/**
 * Apply `cacheLife` with the correct overload. Next.js `cacheLife` uses distinct
 * overloads for string profiles vs config objects — this dispatcher satisfies both.
 */
function applyCacheLife(life: CacheLife): void {
	if (typeof life === "string") {
		// Assert to a specific literal to satisfy overload resolution.
		// The .next/dev/types/cache-life.d.ts module augmentation removes the generic
		// `cacheLife(string)` overload, leaving only per-preset overloads. Our
		// CacheLifePreset union already constrains values to valid presets at compile time.
		cacheLife(life as CacheLifePreset & "default")
	} else {
		cacheLife(life)
	}
}

/**
 * Apply cache configuration and execute a fetcher.
 *
 * This is a convenience helper for the `'use cache'` pattern. It applies
 * `cacheTag(tag)` and optional `cacheLife(life)` then calls the provided fetcher.
 *
 * **IMPORTANT:** This function does NOT apply `'use cache'` — the calling function
 * MUST declare `'use cache'` at its own scope. The `'use cache'` directive must be
 * the first statement in a function body and cannot be applied dynamically because
 * function arguments are not serializable as cache keys.
 *
 * @example
 * ```ts
 * import { withCache } from '@/lib/cache/with-cache'
 * import { cacheKeys } from '@/lib/cache/keys'
 * import { getChatById } from '@/lib/data/chat'
 *
 * export async function getCachedChat(chatId: string) {
 *   'use cache'
 *   return withCache(cacheKeys.chat(chatId), () => getChatById(chatId), 'seconds')
 * }
 * ```
 *
 * @param tag - Cache tag string from `cacheKeys` for invalidation via `updateTag`/`revalidateTag`.
 * @param fetcher - Async function that returns the data to cache.
 * @param life - Optional cache lifetime preset or custom config.
 * @returns The result of the fetcher function.
 */
export async function withCache<T>(
	tag: string,
	fetcher: () => Promise<T>,
	life?: CacheLife,
): Promise<T> {
	cacheTag(tag)
	if (life !== undefined) {
		applyCacheLife(life)
	}
	return fetcher()
}

/**
 * Apply cache tag and optional lifetime configuration within a `'use cache'` scope.
 *
 * Use this when you want to apply cache configuration without wrapping the data
 * fetch call — for example, when the fetch logic is inline rather than in a separate function.
 *
 * **IMPORTANT:** Must be called inside a function that has the `'use cache'` directive.
 *
 * @example
 * ```ts
 * import { applyCacheConfig } from '@/lib/cache/with-cache'
 * import { cacheKeys } from '@/lib/cache/keys'
 *
 * export async function getCachedModels() {
 *   'use cache'
 *   applyCacheConfig(cacheKeys.models(), 'hours')
 *   const models = await fetchModelsFromProviders()
 *   return models
 * }
 * ```
 *
 * @param tag - Cache tag string for invalidation.
 * @param life - Optional cache lifetime preset or custom config.
 */
export function applyCacheConfig(tag: string, life?: CacheLife): void {
	cacheTag(tag)
	if (life !== undefined) {
		applyCacheLife(life)
	}
}
