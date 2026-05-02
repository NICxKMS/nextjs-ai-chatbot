import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ModelMetadata } from "@/lib/types/model.types"
import { DEFAULT_CHAT_MODEL, MODEL_COOKIE_NAME } from "@/lib/types/model.types"

const mocks = vi.hoisted(() => ({
	discoverModels: vi.fn<() => Promise<ModelMetadata[]>>(),
	getAvailableProviderIds: vi.fn<() => Set<string>>(),
	cookies: vi.fn(),
}))

vi.mock("@/lib/ai/models", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/ai/models")>()
	return { ...actual, discoverModels: mocks.discoverModels }
})
vi.mock("@/lib/ai/registry", () => ({
	getAvailableProviderIds: mocks.getAvailableProviderIds,
}))
vi.mock("next/headers", () => ({ cookies: mocks.cookies }))

import { getAvailableModels, getDefaultModel } from "@/features/models/lib/models"
import { STATIC_MODELS } from "@/lib/ai/models"

function model(
	overrides: Partial<ModelMetadata> & Pick<ModelMetadata, "id" | "provider">,
): ModelMetadata {
	const { id, provider, ...rest } = overrides
	return {
		id,
		provider,
		providerModelId: id.split(":").slice(1).join(":"),
		name: id,
		supportsToolCalling: false,
		supportsReasoning: false,
		modalities: { input: ["text"], output: ["text"] },
		contextWindow: 4096,
		maxOutputTokens: 4096,
		source: "dynamic",
		...rest,
	}
}

function cookieStore(value?: string) {
	return {
		get: vi.fn((name: string) => {
			if (name !== MODEL_COOKIE_NAME || value === undefined) return undefined
			return { name, value }
		}),
	}
}

describe("model catalog", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.discoverModels.mockResolvedValue([])
		mocks.getAvailableProviderIds.mockReturnValue(new Set(["google", "openai", "openrouter"]))
		mocks.cookies.mockResolvedValue(cookieStore())
	})

	it("merges static and discovered models while keeping static IDs authoritative", async () => {
		const staticModel =
			STATIC_MODELS[0] ??
			model({ id: DEFAULT_CHAT_MODEL, provider: "google", source: "static" })
		const dynamicDuplicate = model({
			id: staticModel.id,
			provider: staticModel.provider,
			name: "Discovered duplicate",
		})
		const discoveredModel = model({
			id: "openrouter:vendor/new-model",
			provider: "openrouter",
			name: "New Model",
		})
		mocks.discoverModels.mockResolvedValue([dynamicDuplicate, discoveredModel])

		const availableModels = await getAvailableModels()

		expect(availableModels).toContain(staticModel)
		expect(availableModels.filter((candidate) => candidate.id === staticModel.id)).toHaveLength(
			1,
		)
		expect(availableModels).toContain(discoveredModel)
		expect(availableModels.indexOf(staticModel)).toBeLessThan(
			availableModels.indexOf(discoveredModel),
		)
	})

	it("filters the merged catalog to currently available providers", async () => {
		mocks.getAvailableProviderIds.mockReturnValue(new Set(["google"]))
		mocks.discoverModels.mockResolvedValue([
			model({ id: "openrouter:vendor/new-model", provider: "openrouter" }),
			model({ id: "google:discovered-model", provider: "google" }),
		])

		const availableModels = await getAvailableModels()

		expect(availableModels).not.toHaveLength(0)
		expect(availableModels.every((candidate) => candidate.provider === "google")).toBe(true)
		expect(availableModels.map((candidate) => candidate.id)).toContain(
			"google:discovered-model",
		)
		expect(availableModels.map((candidate) => candidate.id)).not.toContain(
			"openrouter:vendor/new-model",
		)
	})

	it("uses a valid model preference cookie before falling back to the configured default", async () => {
		const preferredModel = model({ id: "google:preferred", provider: "google" })
		mocks.cookies.mockResolvedValue(cookieStore(preferredModel.id))

		await expect(
			getDefaultModel(null, [
				model({ id: DEFAULT_CHAT_MODEL, provider: "google" }),
				preferredModel,
			]),
		).resolves.toBe(preferredModel.id)

		mocks.cookies.mockResolvedValue(cookieStore("missing-model"))
		await expect(
			getDefaultModel(null, [
				model({ id: DEFAULT_CHAT_MODEL, provider: "google" }),
				preferredModel,
			]),
		).resolves.toBe(DEFAULT_CHAT_MODEL)
	})

	it("falls back to the first available model, then the configured default when none are available", async () => {
		const firstAvailable = model({ id: "google:first", provider: "google" })

		await expect(getDefaultModel(null, [firstAvailable])).resolves.toBe(firstAvailable.id)
		await expect(getDefaultModel(null, [])).resolves.toBe(DEFAULT_CHAT_MODEL)
	})
})
