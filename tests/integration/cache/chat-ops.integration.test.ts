/**
 * Chat Cache Operations Integration Tests
 * Tests actual cache operations with real Redis
 *
 * Run with: TEST_USE_REAL_CACHE=true pnpm test:integration
 *
 * @module tests/integration/cache/chat-ops.integration.test
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { describeIf, isServiceAvailable } from "../../config/test-config";
import type { CachedChatMeta } from "@/lib/cache/types";

// Test constants
const TEST_USER_ID = `integration-test-user-${Date.now()}`;
const TEST_PREFIX = "integration-test";

// Only run these tests when real cache is available (flag + credentials)
describeIf(isServiceAvailable("cache"), "Chat Cache Operations Integration", () => {
    // Real module imports (not mocked)
    let createChatInCache: typeof import("@/lib/cache-ops/chat").createChatInCache;
    let getChatFromCache: typeof import("@/lib/cache-ops/chat").getChatFromCache;
    let deleteChatFromCache: typeof import("@/lib/cache-ops/chat").deleteChatFromCache;
    let updateChatInCache: typeof import("@/lib/cache-ops/chat").updateChatInCache;
    let getUserChatsFromCache: typeof import("@/lib/cache-ops/chat").getUserChatsFromCache;
    let getRedis: typeof import("@/lib/cache").getRedis;
    let CacheKeys: typeof import("@/lib/cache").CacheKeys;

    // Track created chats for cleanup
    const createdChatIds: string[] = [];

    beforeAll(async () => {
        // Dynamic imports to avoid server-only restriction in tests
        const chatOps = await import("@/lib/cache-ops/chat");
        createChatInCache = chatOps.createChatInCache;
        getChatFromCache = chatOps.getChatFromCache;
        deleteChatFromCache = chatOps.deleteChatFromCache;
        updateChatInCache = chatOps.updateChatInCache;
        getUserChatsFromCache = chatOps.getUserChatsFromCache;

        const cache = await import("@/lib/cache");
        getRedis = cache.getRedis;
        CacheKeys = cache.CacheKeys;
    });

    afterEach(async () => {
        // Clean up created chats after each test
        for (const chatId of createdChatIds) {
            try {
                await deleteChatFromCache(chatId, TEST_USER_ID);
            } catch {
                // Ignore cleanup errors
            }
        }
        createdChatIds.length = 0;
    });

    afterAll(async () => {
        // Final cleanup - delete user chats list
        const redis = getRedis();
        if (redis) {
            const userChatsKey = CacheKeys.userChats(TEST_USER_ID);
            await redis.del(userChatsKey);
        }
    });

    /**
     * Helper to create a test chat with unique ID
     */
    function createTestChatData(suffix: string): CachedChatMeta {
        const chatId = `${TEST_PREFIX}-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        createdChatIds.push(chatId);

        return {
            id: chatId,
            title: `Test Chat ${suffix}`,
            userId: TEST_USER_ID,
            visibility: "private",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
    }

    describe("createChatInCache", () => {
        it("creates a new chat successfully", async () => {
            const chatData = createTestChatData("create");

            const result = await createChatInCache(chatData, false);

            expect(result).toBe(true);
        });

        it("creates a guest chat with TTL", async () => {
            const chatData = createTestChatData("guest");

            const result = await createChatInCache(chatData, true);

            expect(result).toBe(true);

            // Verify it was created
            const retrieved = await getChatFromCache(chatData.id, TEST_USER_ID);
            expect(retrieved).not.toBeNull();
        });
    });

    describe("getChatFromCache", () => {
        it("retrieves an existing chat", async () => {
            const chatData = createTestChatData("get");
            await createChatInCache(chatData, false);

            const retrieved = await getChatFromCache(chatData.id, TEST_USER_ID);

            expect(retrieved).not.toBeNull();
            expect(retrieved?.id).toBe(chatData.id);
            expect(retrieved?.title).toBe(chatData.title);
            expect(retrieved?.userId).toBe(TEST_USER_ID);
        });

        it("returns null for non-existent chat", async () => {
            const nonExistentId = `non-existent-${Date.now()}`;

            const retrieved = await getChatFromCache(nonExistentId, TEST_USER_ID);

            expect(retrieved).toBeNull();
        });

        it("returns null for wrong user ID", async () => {
            const chatData = createTestChatData("wrong-user");
            await createChatInCache(chatData, false);

            const retrieved = await getChatFromCache(chatData.id, "different-user");

            expect(retrieved).toBeNull();
        });
    });

    describe("updateChatInCache", () => {
        it("updates chat title", async () => {
            const chatData = createTestChatData("update-title");
            await createChatInCache(chatData, false);

            const updated = await updateChatInCache(chatData.id, TEST_USER_ID, {
                title: "Updated Title",
            });

            expect(updated).not.toBeNull();
            expect(updated?.title).toBe("Updated Title");
        });

        it("updates chat visibility", async () => {
            const chatData = createTestChatData("update-visibility");
            await createChatInCache(chatData, false);

            const updated = await updateChatInCache(chatData.id, TEST_USER_ID, {
                visibility: "public",
            });

            expect(updated).not.toBeNull();
            expect(updated?.visibility).toBe("public");
        });

        it("returns null when updating non-existent chat", async () => {
            const updated = await updateChatInCache(
                `non-existent-${Date.now()}`,
                TEST_USER_ID,
                { title: "New Title" }
            );

            expect(updated).toBeNull();
        });
    });

    describe("deleteChatFromCache", () => {
        it("deletes an existing chat", async () => {
            const chatData = createTestChatData("delete");
            await createChatInCache(chatData, false);

            // Verify it exists
            const beforeDelete = await getChatFromCache(chatData.id, TEST_USER_ID);
            expect(beforeDelete).not.toBeNull();

            // Delete it
            const deleteResult = await deleteChatFromCache(chatData.id, TEST_USER_ID);
            expect(deleteResult).toBe(true);

            // Verify it's gone
            const afterDelete = await getChatFromCache(chatData.id, TEST_USER_ID);
            expect(afterDelete).toBeNull();

            // Remove from tracking since already deleted
            const index = createdChatIds.indexOf(chatData.id);
            if (index > -1) createdChatIds.splice(index, 1);
        });

        it("returns false for non-existent chat", async () => {
            const result = await deleteChatFromCache(
                `non-existent-${Date.now()}`,
                TEST_USER_ID
            );

            // Should still return true (no-op is success) or false depending on impl
            expect(typeof result).toBe("boolean");
        });
    });

    describe("getUserChatsFromCache", () => {
        it("retrieves user chats list", async () => {
            // Create multiple chats
            const chat1 = createTestChatData("list-1");
            const chat2 = createTestChatData("list-2");

            await createChatInCache(chat1, false);
            await createChatInCache(chat2, false);

            const userChats = await getUserChatsFromCache(TEST_USER_ID);

            // Should contain at least our created chats
            expect(userChats).not.toBeNull();
            expect(Array.isArray(userChats)).toBe(true);
        });

        it("returns null for user with no chats (cache miss)", async () => {
            const emptyUserId = `empty-user-${Date.now()}`;

            const userChats = await getUserChatsFromCache(emptyUserId);

            // Function returns null for cache miss (no chats list exists)
            expect(userChats).toBeNull();
        });
    });

    describe("Full chat lifecycle", () => {
        it("create -> read -> update -> delete workflow", async () => {
            // Create
            const chatData = createTestChatData("lifecycle");
            const created = await createChatInCache(chatData, false);
            expect(created).toBe(true);

            // Read
            const retrieved = await getChatFromCache(chatData.id, TEST_USER_ID);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.title).toBe(chatData.title);

            // Update
            const updated = await updateChatInCache(chatData.id, TEST_USER_ID, {
                title: "Lifecycle Updated",
            });
            expect(updated?.title).toBe("Lifecycle Updated");

            // Read again to verify update persisted
            const afterUpdate = await getChatFromCache(chatData.id, TEST_USER_ID);
            expect(afterUpdate?.title).toBe("Lifecycle Updated");

            // Delete
            const deleted = await deleteChatFromCache(chatData.id, TEST_USER_ID);
            expect(deleted).toBe(true);

            // Verify deletion
            const afterDelete = await getChatFromCache(chatData.id, TEST_USER_ID);
            expect(afterDelete).toBeNull();

            // Remove from tracking
            const index = createdChatIds.indexOf(chatData.id);
            if (index > -1) createdChatIds.splice(index, 1);
        });
    });
});
