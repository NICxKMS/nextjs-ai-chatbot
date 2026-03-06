/**
 * Cache key definitions — two categories:
 *
 * 1. **Cache tag name builders** — produce strings for `cacheTag()` / `updateTag()` /
 *    `revalidateTag()` consistency. Used at the page/feature layer with `'use cache'`.
 *
 * 2. **Rate-limit Redis key builders** — produce strings for rate-limiting counters
 *    stored in Upstash Redis. These are the ONLY keys that touch Redis.
 *
 * NO Redis cache keys for data reads — all data caching uses `'use cache'` + `cacheTag`.
 */

// ── Cache tag name builders (for cacheTag / updateTag / revalidateTag) ──

export const cacheKeys = {
	chat: (chatId: string) => `chat:${chatId}`,
	chats: (userId: string) => `chats:${userId}`,
	votes: (chatId: string) => `votes:${chatId}`,
	models: () => "models",
} as const

// ── Rate-limit Redis key builders ──

export const rateLimitKeys = {
	rateLimit: (userId: string) => `rate-limit:${userId}`,
	rateLimitDaily: (userId: string) => `rate-limit-daily:${userId}`,
	rateLimitChat: (userId: string) => `rate-limit-chat:${userId}`,
	rateLimitVote: (userId: string) => `rate-limit-vote:${userId}`,
	rateLimitUpload: (userId: string) => `rate-limit-upload:${userId}`,
	rateLimitLogin: (ip: string) => `rate-limit-login:${ip}`,
	rateLimitRegister: (ip: string) => `rate-limit-register:${ip}`,
} as const
