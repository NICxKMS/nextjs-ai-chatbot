import "server-only"

import { cacheLife, cacheTag } from "next/cache"
import { cookies } from "next/headers"

import { discoverModels, STATIC_MODELS } from "@/lib/ai/models"
import { getAvailableProviderIds } from "@/lib/ai/registry"
import type { AppSession } from "@/lib/auth/session"
import { cacheKeys } from "@/lib/cache/keys"
import type { ModelMetadata } from "@/lib/types/model.types"
import { DEFAULT_CHAT_MODEL, MODEL_COOKIE_NAME } from "@/lib/types/model.types"

const STATIC_MODEL_IDS = new Set(STATIC_MODELS.map((model) => model.id))

function mergeAvailableModels(
	discoveredModels: ModelMetadata[],
	availableProviders: Set<string>,
): ModelMetadata[] {
	const uniqueDiscoveredModels = discoveredModels.filter(
		(model) => !STATIC_MODEL_IDS.has(model.id),
	)

	return [...STATIC_MODELS, ...uniqueDiscoveredModels].filter((model) =>
		availableProviders.has(model.provider),
	)
}

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

	const availableProviders = getAvailableProviderIds()
	const discoveredModels = await discoverModels()

	return mergeAvailableModels(discoveredModels, availableProviders)
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
export async function getDefaultModel(
	_session: AppSession | null,
	availableModels?: readonly ModelMetadata[] | Promise<readonly ModelMetadata[]>,
): Promise<string> {
	const cookieStore = await cookies()
	const preferred = cookieStore.get(MODEL_COOKIE_NAME)?.value

	if (!preferred) {
		return DEFAULT_CHAT_MODEL
	}

	const models = await (availableModels ?? getAvailableModels())
	return models.some((model) => model.id === preferred) ? preferred : DEFAULT_CHAT_MODEL
}
