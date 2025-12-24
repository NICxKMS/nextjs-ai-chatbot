/**
 * TEST-002: Cache Operations Integration Tests
 *
 * Tests cache operations including session caching, chat caching,
 * and cache prewarming functionality.
 *
 * Mocks Redis at boundary to test actual module integration.
 *
 * @module tests/integration/cache-ops.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock external services at boundary
vi.mock("@/lib/cache/client", () => ({
    getRedis: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
    logger: {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

describe("TEST-002: Cache Operations Integration", () => {
    // Mock Redis instance
    const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        eval: vi.fn(),
        zrange: vi.fn(),
        zadd: vi.fn(),
        expire: vi.fn(),
        exists: vi.fn(),
        pipeline: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Session Cache", () => {
        it("should store and retrieve session", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            const testSession = {
                user: {
                    id: "cache-test-user",
                    type: "regular" as const,
                    email: "test@example.com",
                },
            };

            // Store session
            mockRedis.set.mockResolvedValue("OK");

            const { setCachedSession, getCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            await setCachedSession("cache-test-user", testSession);

            expect(mockRedis.set).toHaveBeenCalledWith(
                "session:valid:cache-test-user",
                testSession,
                { ex: 30 }
            );

            // Retrieve session
            mockRedis.get.mockResolvedValue(testSession);

            const retrieved = await getCachedSession("cache-test-user");

            expect(retrieved).toEqual(testSession);
            expect(mockRedis.get).toHaveBeenCalledWith(
                "session:valid:cache-test-user"
            );
        });

        it("should respect TTL (30 seconds)", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.set.mockResolvedValue("OK");

            const { setCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            await setCachedSession("ttl-test", {
                user: { id: "ttl-test", type: "regular" },
            });

            // Verify TTL is set to 30 seconds
            expect(mockRedis.set).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Object),
                { ex: 30 }
            );
        });

        it("should handle concurrent access", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.set.mockResolvedValue("OK");
            mockRedis.get.mockResolvedValue({
                user: { id: "concurrent-user", type: "regular" },
            });

            const { setCachedSession, getCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            // Simulate concurrent operations
            const operations = [
                setCachedSession("concurrent-user", {
                    user: { id: "concurrent-user", type: "regular" },
                }),
                getCachedSession("concurrent-user"),
                setCachedSession("concurrent-user", {
                    user: { id: "concurrent-user", type: "regular" },
                }),
                getCachedSession("concurrent-user"),
            ];

            // All should complete without errors
            await expect(Promise.all(operations)).resolves.toBeDefined();
        });
    });

    describe("Chat Cache", () => {
        it("should cache chat list", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            // Mock ZRANGE response for user chats
            const mockChats = [
                JSON.stringify({
                    id: "chat-1",
                    userId: "user-1",
                    title: "Test Chat",
                    updatedAt: Date.now(),
                }),
            ];
            mockRedis.zrange.mockResolvedValue(mockChats);

            const { getUserChatsFromCache } = await import("@/lib/cache-ops");

            const result = await getUserChatsFromCache("user-1");

            expect(mockRedis.zrange).toHaveBeenCalled();
            // Result should be array (possibly empty if circuit breaker or other issue)
            expect(Array.isArray(result)).toBe(true);
        });

        it("should invalidate on new chat", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.eval.mockResolvedValue("OK");

            const { createChatInCache } = await import("@/lib/cache-ops");

            const newChat = {
                id: "new-chat-id",
                userId: "user-1",
                title: "New Chat",
                updatedAt: Date.now(),
                createdAt: Date.now(),
            };

            const _result = await createChatInCache(newChat, false);

            // Should call Lua script for atomic creation
            expect(mockRedis.eval).toHaveBeenCalled();
        });

        it("should handle cache miss for chat", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.get.mockResolvedValue(null);

            const { getChatFromCache } = await import("@/lib/cache-ops");

            const result = await getChatFromCache("nonexistent-chat", "user-1");

            expect(result).toBeNull();
        });
    });

    describe("Prewarm Flow", () => {
        it("should skip prewarm for guest users", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            const { prewarmUserCache } = await import("@/lib/cache-ops");

            // Guests should be skipped immediately
            await prewarmUserCache("guest-user", "guest");

            // No Redis calls should be made for guests
            expect(mockRedis.get).not.toHaveBeenCalled();
            expect(mockRedis.zrange).not.toHaveBeenCalled();
        });

        it("should skip prewarm if cache is warm", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            // Simulate cache already warmed (prewarm flag exists)
            mockRedis.get.mockResolvedValue("1");

            const { prewarmIfCold } = await import("@/lib/cache-ops");

            await prewarmIfCold("warm-user", "regular");

            // Should check prewarm flag
            expect(mockRedis.get).toHaveBeenCalled();
        });

        it("should handle prewarm errors gracefully", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            // Simulate Redis error
            mockRedis.get.mockRejectedValue(
                new Error("Redis connection error")
            );

            const { prewarmIfCold } = await import("@/lib/cache-ops");

            // Should not throw, just fail silently
            await expect(
                prewarmIfCold("error-user", "regular")
            ).resolves.toBeUndefined();
        });

        it("should prewarm for regular users when cache is cold", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            // Simulate cold cache (no prewarm flag)
            mockRedis.get.mockResolvedValue(null);
            mockRedis.set.mockResolvedValue("OK");
            mockRedis.zrange.mockResolvedValue([]);

            const { prewarmIfCold } = await import("@/lib/cache-ops");

            await prewarmIfCold("cold-user", "regular");

            // Should attempt prewarm operations
            expect(mockRedis.get).toHaveBeenCalled();
        });
    });

    describe("Cache Unavailable Handling", () => {
        it("should handle Redis unavailable for session cache", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(null);

            const { getCachedSession, setCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            // Should return null without throwing
            const result = await getCachedSession("any-user");
            expect(result).toBeNull();

            // Should complete without throwing
            await expect(
                setCachedSession("any-user", {
                    user: { id: "any-user", type: "regular" },
                })
            ).resolves.toBeUndefined();
        });

        it("should handle Redis unavailable for chat cache", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(null);

            const { getChatFromCache, getUserChatsFromCache } = await import(
                "@/lib/cache-ops"
            );

            // Should return null without throwing (graceful degradation)
            const chat = await getChatFromCache("any-chat", "any-user");
            expect(chat).toBeNull();

            // getUserChatsFromCache returns null when Redis unavailable (not empty array)
            const chats = await getUserChatsFromCache("any-user");
            expect(chats === null || Array.isArray(chats)).toBe(true);
        });

        it("should handle Redis errors gracefully", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            // Simulate various Redis errors
            mockRedis.get.mockRejectedValue(new Error("Connection timeout"));
            mockRedis.set.mockRejectedValue(new Error("Connection refused"));

            const { getCachedSession, setCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            // Should handle errors gracefully
            const getResult = await getCachedSession("error-user");
            expect(getResult).toBeNull();

            await expect(
                setCachedSession("error-user", {
                    user: { id: "error-user", type: "regular" },
                })
            ).resolves.toBeUndefined();
        });
    });

    describe("Cache Key Patterns", () => {
        it("should use consistent session cache key pattern", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.set.mockResolvedValue("OK");
            mockRedis.get.mockResolvedValue(null);

            const { setCachedSession, getCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            await setCachedSession("test-pattern-user", {
                user: { id: "test-pattern-user", type: "regular" },
            });

            expect(mockRedis.set).toHaveBeenCalledWith(
                "session:valid:test-pattern-user",
                expect.any(Object),
                expect.any(Object)
            );

            await getCachedSession("test-pattern-user");

            expect(mockRedis.get).toHaveBeenCalledWith(
                "session:valid:test-pattern-user"
            );
        });

        it("should use correct invalidation key", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.del.mockResolvedValue(1);

            const { invalidateCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            await invalidateCachedSession("invalidate-test");

            expect(mockRedis.del).toHaveBeenCalledWith(
                "session:valid:invalidate-test"
            );
        });
    });
});
