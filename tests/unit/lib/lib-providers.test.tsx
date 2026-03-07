// @vitest-environment jsdom
import { act, render, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PendingChatsProvider, usePendingChats } from "@/lib/providers/pending-chats-provider"

const {
	mockCustomProvider,
	mockExtractReasoningMiddleware,
	mockWrapLanguageModel,
	mockRegistryLanguageModel,
	mockRegistryEmbeddingModel,
	mockRegistryImageModel,
} = vi.hoisted(() => ({
	mockCustomProvider: vi.fn(),
	mockExtractReasoningMiddleware: vi.fn(),
	mockWrapLanguageModel: vi.fn(),
	mockRegistryLanguageModel: vi.fn(),
	mockRegistryEmbeddingModel: vi.fn(),
	mockRegistryImageModel: vi.fn(),
}))

vi.mock("server-only", () => ({}))

vi.mock("ai", () => ({
	customProvider: (...args: unknown[]) => mockCustomProvider(...args),
	extractReasoningMiddleware: (...args: unknown[]) => mockExtractReasoningMiddleware(...args),
	wrapLanguageModel: (...args: unknown[]) => mockWrapLanguageModel(...args),
}))

vi.mock("@/lib/ai/registry", () => ({
	registry: {
		languageModel: (...args: unknown[]) => mockRegistryLanguageModel(...args),
		embeddingModel: (...args: unknown[]) => mockRegistryEmbeddingModel(...args),
		imageModel: (...args: unknown[]) => mockRegistryImageModel(...args),
	},
}))

type MockProviderConfig = {
	fallbackProvider: {
		specificationVersion: string
		languageModel(modelId: string): unknown
		embeddingModel(modelId: string): unknown
		imageModel(modelId: string): unknown
	}
}

async function loadAiProviderModule() {
	vi.resetModules()
	return import("@/lib/ai/provider")
}

function ContextProbe() {
	const pendingChats = usePendingChats()
	return <output data-testid="entry-count">{pendingChats.entries.length}</output>
}

describe("lib/providers/pending-chats-provider", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders children and provides context state", () => {
		const { getByTestId, getByText } = render(
			<PendingChatsProvider>
				<span>provider-child</span>
				<ContextProbe />
			</PendingChatsProvider>,
		)

		expect(getByText("provider-child")).toBeInTheDocument()
		expect(getByTestId("entry-count").textContent).toBe("0")
	})

	it("supports add, update, confirmation cleanup, and removal operations", () => {
		const wrapper = ({ children }: { children: ReactNode }) => (
			<PendingChatsProvider>{children}</PendingChatsProvider>
		)
		const { result } = renderHook(() => usePendingChats(), { wrapper })
		const createdAt = new Date("2026-03-01T00:00:00.000Z")

		act(() => {
			result.current.add({
				id: "chat-1",
				title: "Draft title",
				visibility: "private",
				createdAt,
			})
		})

		expect(result.current.entries).toHaveLength(1)
		expect(result.current.entries[0]).toMatchObject({
			id: "chat-1",
			title: "Draft title",
			visibility: "private",
			createdAt,
			isOptimistic: true,
		})

		act(() => {
			result.current.patch("chat-1", { title: "Updated title", visibility: "public" })
		})

		expect(result.current.entries[0]).toMatchObject({
			id: "chat-1",
			title: "Updated title",
			visibility: "public",
			isOptimistic: true,
		})

		act(() => {
			result.current.markConfirmed("chat-1")
		})

		expect(result.current.entries).toEqual([
			expect.objectContaining({
				id: "chat-1",
				title: "Updated title",
				visibility: "public",
				isOptimistic: false,
			}),
		])

		act(() => {
			result.current.add({
				id: "chat-1",
				title: "Should stay reserved",
				visibility: "private",
				createdAt,
			})
		})

		expect(result.current.entries).toHaveLength(1)

		act(() => {
			result.current.remove("chat-1")
		})

		expect(result.current.entries).toEqual([])

		act(() => {
			result.current.add({
				id: "chat-1",
				title: "Can be reserved again",
				visibility: "private",
				createdAt,
			})
		})

		expect(result.current.entries).toEqual([
			expect.objectContaining({
				id: "chat-1",
				title: "Can be reserved again",
				isOptimistic: true,
			}),
		])

		act(() => {
			result.current.add({
				id: "chat-2",
				title: "Another draft",
				visibility: "private",
				createdAt,
			})
			result.current.remove("chat-2")
		})

		expect(result.current.entries).toEqual([
			expect.objectContaining({
				id: "chat-1",
				title: "Can be reserved again",
				isOptimistic: true,
			}),
		])
	})

	it("throws when usePendingChats is called outside the provider", () => {
		expect(() => renderHook(() => usePendingChats())).toThrowError(
			"usePendingChats must be used within PendingChatsProvider",
		)
	})
})

describe("lib/ai/provider", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockCustomProvider.mockImplementation((config: unknown) => config)
	})

	it("exports myProvider from customProvider with a fallback provider", async () => {
		const customProviderResult = { providerId: "custom-provider" }
		mockCustomProvider.mockReturnValue(customProviderResult)

		const { myProvider } = await loadAiProviderModule()

		expect(myProvider).toBe(customProviderResult)
		expect(mockCustomProvider).toHaveBeenCalledTimes(1)

		const [config] = mockCustomProvider.mock.calls[0] as [MockProviderConfig]
		expect(config.fallbackProvider.specificationVersion).toBe("v3")
		expect(typeof config.fallbackProvider.languageModel).toBe("function")
		expect(typeof config.fallbackProvider.embeddingModel).toBe("function")
		expect(typeof config.fallbackProvider.imageModel).toBe("function")
	})

	it("wraps reasoning language models using extractReasoningMiddleware", async () => {
		const baseModel = { modelId: "base" }
		const middleware = { middlewareId: "reasoning" }
		const wrappedModel = { modelId: "wrapped" }
		mockRegistryLanguageModel.mockReturnValue(baseModel)
		mockExtractReasoningMiddleware.mockReturnValue(middleware)
		mockWrapLanguageModel.mockReturnValue(wrappedModel)

		await loadAiProviderModule()
		const [config] = mockCustomProvider.mock.calls[0] as [MockProviderConfig]

		const result = config.fallbackProvider.languageModel("openai:o3-mini")

		expect(mockRegistryLanguageModel).toHaveBeenCalledWith("openai:o3-mini")
		expect(mockExtractReasoningMiddleware).toHaveBeenCalledWith({ tagName: "thinking" })
		expect(mockWrapLanguageModel).toHaveBeenCalledWith({
			model: baseModel,
			middleware,
		})
		expect(result).toBe(wrappedModel)
	})

	it("returns non-reasoning language models directly and forwards embedding/image models", async () => {
		const baseLanguageModel = { modelId: "base-language" }
		const embeddingModel = { modelId: "embedding" }
		const imageModel = { modelId: "image" }
		mockRegistryLanguageModel.mockReturnValue(baseLanguageModel)
		mockRegistryEmbeddingModel.mockReturnValue(embeddingModel)
		mockRegistryImageModel.mockReturnValue(imageModel)

		await loadAiProviderModule()
		const [config] = mockCustomProvider.mock.calls[0] as [MockProviderConfig]

		const languageModel = config.fallbackProvider.languageModel("google:gemini-1.5-flash")
		const resolvedEmbeddingModel = config.fallbackProvider.embeddingModel(
			"google:text-embedding-004",
		)
		const resolvedImageModel = config.fallbackProvider.imageModel("openai:gpt-image-1")

		expect(languageModel).toBe(baseLanguageModel)
		expect(mockExtractReasoningMiddleware).not.toHaveBeenCalled()
		expect(mockWrapLanguageModel).not.toHaveBeenCalled()
		expect(resolvedEmbeddingModel).toBe(embeddingModel)
		expect(mockRegistryEmbeddingModel).toHaveBeenCalledWith("google:text-embedding-004")
		expect(resolvedImageModel).toBe(imageModel)
		expect(mockRegistryImageModel).toHaveBeenCalledWith("openai:gpt-image-1")
	})
})
