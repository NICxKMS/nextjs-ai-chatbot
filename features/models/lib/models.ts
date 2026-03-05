import "server-only"

import { cacheLife, cacheTag } from "next/cache"
import { cookies } from "next/headers"

import { discoverModels, STATIC_MODELS } from "@/lib/ai/models"
import { getAvailableProviderIds } from "@/lib/ai/registry"
import type { AppSession } from "@/lib/auth/session"
import { cacheKeys } from "@/lib/cache/keys"
import type { ModelMetadata } from "@/lib/types/model.types"
import { DEFAULT_CHAT_MODEL, MODEL_COOKIE_NAME } from "@/lib/types/model.types"

/**
 * Get all available AI models (static + dynamically discovered).
 *
 * Single public API for obtaining the model catalog. Uses Next.js 16
 * `'use cache'` with hourly revalidation. Invalidate via `updateTag('models')`
 * (Server Actions) or `revalidateTag('models')` (Route Handlers).
 *
 * Merge strategy: static models take priority; discovered models are appended
 * with deduplication by model ID.
 */
export async function getAvailableModels(): Promise<ModelMetadata[]> {
	"use cache"
	cacheTag(cacheKeys.models())
	cacheLife("hours")

	const [discovered, availableProviders] = await Promise.all([
		discoverModels(),
		Promise.resolve(getAvailableProviderIds()),
	])

	// Deduplicate: static models take priority over discovered
	const staticIds = new Set(STATIC_MODELS.map((m) => m.id))
	const uniqueDiscovered = discovered.filter((m) => !staticIds.has(m.id))

	// Filter to only include models whose provider has a configured API key
	return [...STATIC_MODELS, ...uniqueDiscovered].filter((m) => availableProviders.has(m.provider))
}

/**
 * Get the default model ID for the current session.
 *
 * Resolution order:
 * 1. Read `chat-model` cookie for persisted model preference
 * 2. Validate cookie value exists in the model catalog
 * 3. Fall back to `DEFAULT_CHAT_MODEL`
 *
 * The `session` parameter is reserved for future user-level model preferences.
 */
export async function getDefaultModel(_session: AppSession | null): Promise<string> {
	const cookieStore = await cookies()
	const preferred = cookieStore.get(MODEL_COOKIE_NAME)?.value

	if (preferred) {
		const models = await getAvailableModels()
		if (models.some((m) => m.id === preferred)) {
			return preferred
		}
	}

	return DEFAULT_CHAT_MODEL
}
