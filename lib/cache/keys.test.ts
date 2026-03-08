// Flow: cache-key-generation | Step: key-construction

import { describe, expect, it } from "vitest"

import { cacheKeys, rateLimitKeys } from "@/lib/cache/keys"

describe("cacheKeys", () => {
	describe("chat", () => {
		it("returns chat:{chatId} format", () => {
			expect(cacheKeys.chat("abc-123")).toBe("chat:abc-123")
		})

		it("handles empty string", () => {
			expect(cacheKeys.chat("")).toBe("chat:")
		})

		it("handles special characters in chatId", () => {
			expect(cacheKeys.chat("uuid-with-dashes-and_underscores")).toBe(
				"chat:uuid-with-dashes-and_underscores",
			)
		})
	})

	describe("chats", () => {
		it("returns chats:{userId} format", () => {
			expect(cacheKeys.chats("user-456")).toBe("chats:user-456")
		})

		it("handles empty string", () => {
			expect(cacheKeys.chats("")).toBe("chats:")
		})
	})

	describe("votes", () => {
		it("returns votes:{chatId} format", () => {
			expect(cacheKeys.votes("chat-789")).toBe("votes:chat-789")
		})

		it("handles empty string", () => {
			expect(cacheKeys.votes("")).toBe("votes:")
		})
	})

	describe("models", () => {
		it("returns static 'models' string", () => {
			expect(cacheKeys.models()).toBe("models")
		})
	})
})

describe("rateLimitKeys", () => {
	describe("rateLimitArtifact", () => {
		it("returns rate-limit-artifact:{userId}", () => {
			expect(rateLimitKeys.rateLimitArtifact("user-1")).toBe("rate-limit-artifact:user-1")
		})
	})

	describe("rateLimitChat", () => {
		it("returns rate-limit-chat:{userId}", () => {
			expect(rateLimitKeys.rateLimitChat("user-2")).toBe("rate-limit-chat:user-2")
		})
	})

	describe("rateLimitHistory", () => {
		it("returns rate-limit-history:{userId}", () => {
			expect(rateLimitKeys.rateLimitHistory("user-3")).toBe("rate-limit-history:user-3")
		})
	})

	describe("rateLimitSuggestions", () => {
		it("returns rate-limit-suggestions:{userId}", () => {
			expect(rateLimitKeys.rateLimitSuggestions("user-4")).toBe(
				"rate-limit-suggestions:user-4",
			)
		})
	})

	describe("rateLimitUpload", () => {
		it("returns rate-limit-upload:{userId}", () => {
			expect(rateLimitKeys.rateLimitUpload("user-5")).toBe("rate-limit-upload:user-5")
		})
	})

	describe("rateLimitVote", () => {
		it("returns rate-limit-vote:{userId}", () => {
			expect(rateLimitKeys.rateLimitVote("user-6")).toBe("rate-limit-vote:user-6")
		})
	})

	describe("rateLimitLogin", () => {
		it("returns rate-limit-login:{ip}", () => {
			expect(rateLimitKeys.rateLimitLogin("192.168.1.1")).toBe("rate-limit-login:192.168.1.1")
		})

		it("handles IPv6 addresses", () => {
			expect(rateLimitKeys.rateLimitLogin("::1")).toBe("rate-limit-login:::1")
		})
	})

	describe("rateLimitRegister", () => {
		it("returns rate-limit-register:{ip}", () => {
			expect(rateLimitKeys.rateLimitRegister("10.0.0.1")).toBe("rate-limit-register:10.0.0.1")
		})
	})
})
