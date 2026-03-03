import { revalidateTag, updateTag } from "next/cache"

import { cacheKeys } from "@/lib/cache/keys"

// ── Server Action helpers (immediate consistency via updateTag) ──────────────
// Use these inside Server Actions for read-your-own-writes semantics.
// The next request waits for fresh data — no stale content served.

/** Invalidate cached data for a specific chat (Server Action). */
export function invalidateChat(chatId: string): void {
	updateTag(cacheKeys.chat(chatId))
}

/** Invalidate the chat list for a user (Server Action). */
export function invalidateChatList(userId: string): void {
	updateTag(cacheKeys.chats(userId))
}

/** Invalidate cached votes for a chat (Server Action). */
export function invalidateVotes(chatId: string): void {
	updateTag(cacheKeys.votes(chatId))
}

/** Invalidate cached data for an artifact (Server Action). */
export function invalidateArtifact(artifactId: string): void {
	updateTag(cacheKeys.artifact(artifactId))
}

/** Invalidate the cached models list (Server Action). */
export function invalidateModels(): void {
	updateTag(cacheKeys.models())
}

// ── Route Handler helpers (stale-while-revalidate via revalidateTag) ────────
// Use these inside Route Handlers where a slight delay is acceptable.
// Stale content is served while fresh data loads in the background.

/** Revalidate cached data for a specific chat (Route Handler). */
export function refreshChat(chatId: string): void {
	revalidateTag(cacheKeys.chat(chatId), "max")
}

/** Revalidate the chat list for a user (Route Handler). */
export function refreshChatList(userId: string): void {
	revalidateTag(cacheKeys.chats(userId), "max")
}

/** Revalidate cached data for an artifact (Route Handler). */
export function refreshArtifact(artifactId: string): void {
	revalidateTag(cacheKeys.artifact(artifactId), "max")
}
