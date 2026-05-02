import { describe, expect, it, vi } from "vitest"

import { cacheKeys, rateLimitKeys } from "@/lib/cache/keys"
import { invalidateChat, invalidateChatList, refreshChat } from "@/lib/cache/revalidate"
import { AppError } from "@/lib/errors/app-error"
import { cn } from "@/lib/utils/cn"
import { generateUUID } from "@/lib/utils/generate-uuid"
import { validateOrigin } from "@/lib/utils/validate-origin"

describe("utility helper contracts", () => {
	it("generates valid unique UUID values", () => {
		const first = generateUUID()
		const second = generateUUID()

		expect(first).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		)
		expect(second).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		)
		expect(second).not.toBe(first)
	})

	it("merges conditional classes with Tailwind conflict resolution", () => {
		expect(cn("px-2", false && "hidden", ["text-sm", "px-4"])).toBe("text-sm px-4")
	})
})

describe("cache key contracts", () => {
	it("builds stable cache and rate-limit keys", () => {
		expect(cacheKeys.chat("chat-1")).toBe("chat:chat-1")
		expect(cacheKeys.chats("user-1")).toBe("chats:user-1")
		expect(cacheKeys.votes("chat-1")).toBe("votes:chat-1")
		expect(cacheKeys.models()).toBe("models")
		expect(rateLimitKeys.rateLimitUpload("user-1")).toBe("rate-limit-upload:user-1")
	})
})

describe("revalidation helpers", () => {
	it("uses updateTag for server-action invalidation and revalidateTag for route refresh", async () => {
		const cache = await import("next/cache")
		const updateTag = vi.mocked(cache.updateTag)
		const revalidateTag = vi.mocked(cache.revalidateTag)

		invalidateChat("chat-1")
		invalidateChatList("user-1")
		refreshChat("chat-2")

		expect(updateTag).toHaveBeenCalledWith("chat:chat-1")
		expect(updateTag).toHaveBeenCalledWith("chats:user-1")
		expect(revalidateTag).toHaveBeenCalledWith("chat:chat-2", "max")
	})
})

describe("AppError", () => {
	it("serializes typed errors to current route-handler response shape", async () => {
		const response = AppError.rateLimited(
			"rate_limit:chat:too_many_requests",
			"Slow down",
			12,
		).toResponse()

		expect(response.status).toBe(429)
		expect(response.headers.get("Retry-After")).toBe("12")
		expect(await response.json()).toEqual({
			code: "rate_limit:chat:too_many_requests",
			message: "Slow down",
		})
	})
})

describe("validateOrigin", () => {
	it("accepts same-origin requests and rejects missing origins", () => {
		expect(
			validateOrigin(
				new Request("https://app.example.com/api/chat", {
					headers: { origin: "https://app.example.com" },
				}),
			),
		).toBe(true)
		expect(validateOrigin(new Request("https://app.example.com/api/chat"))).toBe(false)
	})
})

describe("metadata route contracts", () => {
	it("keeps robots and sitemap outputs aligned with the public app URL", async () => {
		const [{ default: robots }, { default: sitemap }] = await Promise.all([
			import("@/app/robots"),
			import("@/app/sitemap"),
		])
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

		expect(robots()).toEqual({
			rules: {
				userAgent: "*",
				allow: "/",
				disallow: ["/api/*", "/chat/*", "/login", "/register"],
			},
			sitemap: `${baseUrl}/sitemap.xml`,
		})

		const [entry] = sitemap()
		expect(entry).toMatchObject({
			url: baseUrl,
			changeFrequency: "weekly",
			priority: 1,
		})
		expect(entry?.lastModified).toBeInstanceOf(Date)
	})
})
