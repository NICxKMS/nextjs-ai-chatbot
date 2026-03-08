// Flow: cache-invalidation | Step: revalidation

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({
	revalidateTag: vi.fn(),
	updateTag: vi.fn(),
}))

import { revalidateTag, updateTag } from "next/cache"

import {
	invalidateChat,
	invalidateChatList,
	invalidateVotes,
	refreshChat,
	refreshChatList,
} from "@/lib/cache/revalidate"

beforeEach(() => {
	vi.clearAllMocks()
})

describe("Server Action helpers (updateTag)", () => {
	describe("invalidateChat", () => {
		it("calls updateTag with chat:{chatId}", () => {
			invalidateChat("chat-123")
			expect(updateTag).toHaveBeenCalledOnce()
			expect(updateTag).toHaveBeenCalledWith("chat:chat-123")
		})

		it("handles different chatId values", () => {
			invalidateChat("abc-def-ghi")
			expect(updateTag).toHaveBeenCalledWith("chat:abc-def-ghi")
		})
	})

	describe("invalidateChatList", () => {
		it("calls updateTag with chats:{userId}", () => {
			invalidateChatList("user-456")
			expect(updateTag).toHaveBeenCalledOnce()
			expect(updateTag).toHaveBeenCalledWith("chats:user-456")
		})
	})

	describe("invalidateVotes", () => {
		it("calls updateTag with votes:{chatId}", () => {
			invalidateVotes("chat-789")
			expect(updateTag).toHaveBeenCalledOnce()
			expect(updateTag).toHaveBeenCalledWith("votes:chat-789")
		})
	})
})

describe("Route Handler helpers (revalidateTag)", () => {
	describe("refreshChat", () => {
		it("calls revalidateTag with chat:{chatId} and 'max' option", () => {
			refreshChat("chat-123")
			expect(revalidateTag).toHaveBeenCalledOnce()
			expect(revalidateTag).toHaveBeenCalledWith("chat:chat-123", "max")
		})
	})

	describe("refreshChatList", () => {
		it("calls revalidateTag with chats:{userId} and 'max' option", () => {
			refreshChatList("user-456")
			expect(revalidateTag).toHaveBeenCalledOnce()
			expect(revalidateTag).toHaveBeenCalledWith("chats:user-456", "max")
		})
	})
})
