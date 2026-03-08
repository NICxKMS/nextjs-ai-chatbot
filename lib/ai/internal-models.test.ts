// Flow: ai-model-selection | Step: internal-model-resolution
import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Mocks (hoisted before imports) ──────────────────────────────────────────

const mockLanguageModel = { modelId: "mock-model", specificationVersion: "v3" }

vi.mock("@/lib/ai/provider", () => ({
	myProvider: {
		languageModel: vi.fn(() => mockLanguageModel),
	},
}))

vi.mock("@/lib/ai/registry", () => ({
	isProviderConfigured: vi.fn(),
	getRequiredProviderEnvKey: vi.fn(() => "GEMINI_API_KEY"),
}))

// ── Imports (after mocks) ───────────────────────────────────────────────────

import { getInternalLanguageModel, type InternalLanguageModel } from "@/lib/ai/internal-models"
import { myProvider } from "@/lib/ai/provider"
import { isProviderConfigured } from "@/lib/ai/registry"
import { ARTIFACT_MODEL, TITLE_MODEL } from "@/lib/types/model.types"

// ── Tests ───────────────────────────────────────────────────────────────────

describe("getInternalLanguageModel", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	// ── Happy path ──────────────────────────────────────────────────────

	it('returns the title model for "title" purpose', () => {
		vi.mocked(isProviderConfigured).mockReturnValue(true)

		const model = getInternalLanguageModel("title")

		expect(myProvider.languageModel).toHaveBeenCalledWith(TITLE_MODEL)
		expect(model).toBe(mockLanguageModel)
	})

	it('returns the artifact model for "artifact" purpose', () => {
		vi.mocked(isProviderConfigured).mockReturnValue(true)

		const model = getInternalLanguageModel("artifact")

		expect(myProvider.languageModel).toHaveBeenCalledWith(ARTIFACT_MODEL)
		expect(model).toBe(mockLanguageModel)
	})

	it("checks the google provider for both internal models", () => {
		vi.mocked(isProviderConfigured).mockReturnValue(true)

		getInternalLanguageModel("title")
		expect(isProviderConfigured).toHaveBeenCalledWith("google")

		vi.clearAllMocks()

		getInternalLanguageModel("artifact")
		expect(isProviderConfigured).toHaveBeenCalledWith("google")
	})

	// ── Error state: provider not configured ────────────────────────────

	it("throws AppError when the provider is not configured", () => {
		vi.mocked(isProviderConfigured).mockReturnValue(false)

		expect(() => getInternalLanguageModel("title")).toThrow(/unavailable/)
		expect(() => getInternalLanguageModel("artifact")).toThrow(/unavailable/)
	})

	it("includes the env key name in the error message", () => {
		vi.mocked(isProviderConfigured).mockReturnValue(false)

		expect(() => getInternalLanguageModel("title")).toThrow(/GEMINI_API_KEY/)
	})

	it("does not call myProvider.languageModel when provider is not configured", () => {
		vi.mocked(isProviderConfigured).mockReturnValue(false)

		try {
			getInternalLanguageModel("title")
		} catch {
			// Expected
		}

		expect(myProvider.languageModel).not.toHaveBeenCalled()
	})

	// ── Type safety ─────────────────────────────────────────────────────

	it("InternalLanguageModel type includes title and artifact", () => {
		// Type-level assertion: if this compiles, the type is correct
		const validKinds: InternalLanguageModel[] = ["title", "artifact"]
		expect(validKinds).toHaveLength(2)
	})
})
