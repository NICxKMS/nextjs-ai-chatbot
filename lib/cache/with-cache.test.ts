// Flow: data-caching | Step: cache-wrapper

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}))

import { cacheLife, cacheTag } from "next/cache"

import { withCache } from "@/lib/cache/with-cache"

beforeEach(() => {
	vi.clearAllMocks()
})

describe("withCache", () => {
	it("calls cacheTag with the provided tag", async () => {
		const fetcher = vi.fn().mockResolvedValue("data")

		await withCache("chat:123", fetcher)

		expect(cacheTag).toHaveBeenCalledOnce()
		expect(cacheTag).toHaveBeenCalledWith("chat:123")
	})

	it("returns the result of the fetcher function", async () => {
		const fetcher = vi.fn().mockResolvedValue({ id: "123", title: "Test" })

		const result = await withCache("chat:123", fetcher)

		expect(result).toEqual({ id: "123", title: "Test" })
	})

	it("calls fetcher exactly once", async () => {
		const fetcher = vi.fn().mockResolvedValue("data")

		await withCache("tag", fetcher)

		expect(fetcher).toHaveBeenCalledOnce()
	})

	describe("with string life preset", () => {
		it("calls cacheLife with the preset string", async () => {
			const fetcher = vi.fn().mockResolvedValue("data")

			await withCache("tag", fetcher, "seconds")

			expect(cacheLife).toHaveBeenCalledOnce()
			expect(cacheLife).toHaveBeenCalledWith("seconds")
		})

		it("accepts all preset values", async () => {
			const presets = [
				"default",
				"seconds",
				"minutes",
				"hours",
				"days",
				"weeks",
				"max",
			] as const
			const fetcher = vi.fn().mockResolvedValue("data")

			for (const preset of presets) {
				vi.clearAllMocks()
				await withCache("tag", fetcher, preset)
				expect(cacheLife).toHaveBeenCalledWith(preset)
			}
		})
	})

	describe("with custom life config", () => {
		it("calls cacheLife with the config object", async () => {
			const fetcher = vi.fn().mockResolvedValue("data")
			const config = { stale: 60, revalidate: 300, expire: 3600 }

			await withCache("tag", fetcher, config)

			expect(cacheLife).toHaveBeenCalledOnce()
			expect(cacheLife).toHaveBeenCalledWith(config)
		})

		it("accepts partial config", async () => {
			const fetcher = vi.fn().mockResolvedValue("data")

			await withCache("tag", fetcher, { stale: 30 })

			expect(cacheLife).toHaveBeenCalledWith({ stale: 30 })
		})
	})

	describe("without life parameter", () => {
		it("does not call cacheLife when life is undefined", async () => {
			const fetcher = vi.fn().mockResolvedValue("data")

			await withCache("tag", fetcher)

			expect(cacheLife).not.toHaveBeenCalled()
		})
	})

	describe("error handling", () => {
		it("propagates fetcher errors", async () => {
			const error = new Error("fetch failed")
			const fetcher = vi.fn().mockRejectedValue(error)

			await expect(withCache("tag", fetcher)).rejects.toThrow("fetch failed")
		})
	})
})
