/**
 * OPT-031: Cache Tags Unit Tests
 *
 * Tests for cache tag generators ensuring consistent naming.
 *
 * @module tests/unit/lib/cache-tags.test.ts
 */
import { describe, expect, it } from "vitest";
import { CacheTags } from "@/lib/cache/tags";

describe("CacheTags", () => {
    describe("chat", () => {
        it("should generate correct chat tag", () => {
            expect(CacheTags.chat("123")).toBe("chat-123");
        });

        it("should handle UUID format", () => {
            const uuid = "550e8400-e29b-41d4-a716-446655440000";
            expect(CacheTags.chat(uuid)).toBe(`chat-${uuid}`);
        });
    });

    describe("chatMessages", () => {
        it("should generate correct chat messages tag", () => {
            expect(CacheTags.chatMessages("456")).toBe("chat-messages-456");
        });
    });

    describe("userChats", () => {
        it("should generate correct user chats tag", () => {
            expect(CacheTags.userChats("user-1")).toBe("user-chats-user-1");
        });
    });

    describe("document", () => {
        it("should generate correct document tag", () => {
            expect(CacheTags.document("doc-1")).toBe("document-doc-1");
        });
    });

    describe("userDocuments", () => {
        it("should generate correct user documents tag", () => {
            expect(CacheTags.userDocuments("user-2")).toBe(
                "user-documents-user-2"
            );
        });
    });

    describe("suggestions", () => {
        it("should generate suggestions tag without userId", () => {
            expect(CacheTags.suggestions("doc-1")).toBe("suggestions-doc-1");
        });

        it("should generate suggestions tag with userId", () => {
            expect(CacheTags.suggestions("doc-1", "user-1")).toBe(
                "suggestions-doc-1-user-1"
            );
        });
    });

    describe("votes", () => {
        it("should generate correct votes tag", () => {
            expect(CacheTags.votes("chat-1")).toBe("votes-chat-1");
        });
    });

    describe("session", () => {
        it("should generate correct session tag", () => {
            expect(CacheTags.session("user-3")).toBe("session-user-3");
        });
    });

    describe("consistency", () => {
        it("should return string type for all tags", () => {
            expect(typeof CacheTags.chat("id")).toBe("string");
            expect(typeof CacheTags.chatMessages("id")).toBe("string");
            expect(typeof CacheTags.userChats("id")).toBe("string");
            expect(typeof CacheTags.document("id")).toBe("string");
            expect(typeof CacheTags.userDocuments("id")).toBe("string");
            expect(typeof CacheTags.suggestions("id")).toBe("string");
            expect(typeof CacheTags.suggestions("id", "userId")).toBe("string");
            expect(typeof CacheTags.votes("id")).toBe("string");
            expect(typeof CacheTags.session("id")).toBe("string");
        });

        it("should generate unique tags for different entities", () => {
            const id = "same-id";
            const tags = [
                CacheTags.chat(id),
                CacheTags.chatMessages(id),
                CacheTags.userChats(id),
                CacheTags.document(id),
                CacheTags.userDocuments(id),
                CacheTags.suggestions(id),
                CacheTags.votes(id),
                CacheTags.session(id),
            ];
            const uniqueTags = new Set(tags);
            expect(uniqueTags.size).toBe(tags.length);
        });
    });
});
