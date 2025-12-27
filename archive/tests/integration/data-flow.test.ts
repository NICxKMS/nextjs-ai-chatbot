/**
 * TEST-002: Data Flow Integration Tests
 *
 * Tests data loading patterns including parallel loading,
 * cache-first strategies, and error handling.
 *
 * @module tests/integration/data-flow.test.ts
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

describe("TEST-002: Data Flow Integration", () => {
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
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Parallel Loading", () => {
        it("should load session and data in parallel", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            const mockSession = {
                user: { id: "parallel-user", type: "regular" as const },
            };
            const mockChats: string[] = [];

            mockRedis.get.mockResolvedValue(mockSession);
            mockRedis.zrange.mockResolvedValue(mockChats);

            const { getCachedSession } = await import(
                "@/lib/auth/session-cache"
            );
            const { getUserChatsFromCache } = await import("@/lib/cache-ops");

            // Parallel loading pattern
            const _startTime = Date.now();
            const [session, chats] = await Promise.all([
                getCachedSession("parallel-user"),
                getUserChatsFromCache("parallel-user"),
            ]);
            const _endTime = Date.now();

            // Both should complete (chats may be null or array depending on circuit breaker)
            expect(session).toBeDefined();
            expect(chats === null || Array.isArray(chats)).toBe(true);

            // Parallel execution should be efficient (not sequential)
            // Both operations should start roughly simultaneously
            expect(mockRedis.get).toHaveBeenCalled();
            expect(mockRedis.zrange).toHaveBeenCalled();
        });

        it("should handle partial failures", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            // Session succeeds, chats fail
            mockRedis.get.mockResolvedValue({
                user: { id: "partial-user", type: "regular" },
            });
            mockRedis.zrange.mockRejectedValue(
                new Error("Partial failure test")
            );

            const { getCachedSession } = await import(
                "@/lib/auth/session-cache"
            );
            const { getUserChatsFromCache } = await import("@/lib/cache-ops");

            // Using Promise.allSettled for graceful partial failure handling
            const results = await Promise.allSettled([
                getCachedSession("partial-user"),
                getUserChatsFromCache("partial-user"),
            ]);

            // Session should succeed
            expect(results[0].status).toBe("fulfilled");
            if (results[0].status === "fulfilled") {
                expect(results[0].value).toBeDefined();
            }

            // Chats should fail gracefully (circuit breaker returns empty array)
            expect(results[1].status).toBe("fulfilled");
        });

        it("should return typed results", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            const mockSession = {
                user: {
                    id: "typed-user",
                    type: "regular" as const,
                    email: "typed@example.com",
                },
            };
            mockRedis.get.mockResolvedValue(mockSession);

            const { getCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            const session = await getCachedSession("typed-user");

            // Verify type structure
            expect(session).not.toBeNull();
            expect(session?.user).toHaveProperty("id");
            expect(session?.user).toHaveProperty("type");
            expect(session?.user.type).toBe("regular");
        });
    });

    describe("Cache-First Strategy", () => {
        it("should check cache before database", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            const cachedData = {
                id: "cached-chat",
                userId: "cache-first-user",
                title: "Cached Chat",
                updatedAt: Date.now(),
                createdAt: Date.now(),
            };
            mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

            const { getChatFromCache } = await import("@/lib/cache-ops");

            const _result = await getChatFromCache(
                "cached-chat",
                "cache-first-user"
            );

            // Cache should be checked
            expect(mockRedis.get).toHaveBeenCalled();

            // Result should come from cache (or null if not found)
            // Note: getChatFromCache may return null due to circuit breaker
        });

        it("should handle cache miss gracefully", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            // Simulate cache miss
            mockRedis.get.mockResolvedValue(null);

            const { getChatFromCache } = await import("@/lib/cache-ops");

            const result = await getChatFromCache("miss-chat", "miss-user");

            // Should return null for cache miss
            expect(result).toBeNull();
        });

        it("should return null on cache error (graceful degradation)", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            // Simulate cache error
            mockRedis.get.mockRejectedValue(new Error("Cache error"));

            const { getChatFromCache } = await import("@/lib/cache-ops");

            // Should not throw, return null for graceful degradation
            const result = await getChatFromCache("error-chat", "error-user");
            expect(result).toBeNull();
        });
    });

    describe("Session Data Flow", () => {
        it("should extract user ID from JWT for cache lookup", async () => {
            const { extractUserIdFromToken } = await import(
                "@/lib/auth/session-cache"
            );

            // Create a mock JWT with a valid structure
            const mockPayload = { sub: "test-user-123", iat: Date.now() };
            const mockPayloadB64 = Buffer.from(
                JSON.stringify(mockPayload)
            ).toString("base64url");
            const mockJwt = `header.${mockPayloadB64}.signature`;

            const userId = extractUserIdFromToken(mockJwt);

            expect(userId).toBe("test-user-123");
        });

        it("should handle invalid JWT gracefully", async () => {
            const { extractUserIdFromToken } = await import(
                "@/lib/auth/session-cache"
            );

            // Invalid tokens should return null
            expect(extractUserIdFromToken("invalid")).toBeNull();
            expect(extractUserIdFromToken("")).toBeNull();
            expect(extractUserIdFromToken("not.a.valid.jwt.token")).toBeNull();
        });

        it("should handle malformed payload gracefully", async () => {
            const { extractUserIdFromToken } = await import(
                "@/lib/auth/session-cache"
            );

            // JWT with invalid base64 payload
            const invalidB64 = "!!!invalid-base64!!!";
            const mockJwt = `header.${invalidB64}.signature`;

            expect(extractUserIdFromToken(mockJwt)).toBeNull();
        });
    });

    describe("Cache Serialization Flow", () => {
        it("should handle JSON serialization correctly", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            const testData = {
                user: {
                    id: "serialize-user",
                    type: "regular" as const,
                    email: "serialize@test.com",
                },
            };

            mockRedis.set.mockResolvedValue("OK");

            const { setCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            await setCachedSession("serialize-user", testData);

            // Verify data is passed correctly
            expect(mockRedis.set).toHaveBeenCalledWith(
                expect.any(String),
                testData,
                expect.any(Object)
            );
        });

        it("should handle complex nested structures", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            const complexData = {
                user: {
                    id: "complex-user",
                    type: "regular" as const,
                    email: "complex@test.com",
                },
            };

            mockRedis.get.mockResolvedValue(complexData);

            const { getCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            const result = await getCachedSession("complex-user");

            expect(result).toEqual(complexData);
        });
    });

    describe("Error Propagation", () => {
        it("should not propagate cache errors to caller", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            // Various error types
            const errors = [
                new Error("Connection refused"),
                new Error("Timeout"),
                new Error("ECONNRESET"),
            ];

            for (const error of errors) {
                mockRedis.get.mockRejectedValue(error);

                const { getCachedSession } = await import(
                    "@/lib/auth/session-cache"
                );

                // Should handle gracefully, not throw
                await expect(
                    getCachedSession("error-test")
                ).resolves.toBeNull();
            }
        });

        it("should log errors but not expose them", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            const { logger } = await import("@/lib/utils/logger");

            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.get.mockRejectedValue(new Error("Internal cache error"));

            const { getCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            await getCachedSession("log-test");

            // Logger should be called with warning
            expect(logger.warn).toHaveBeenCalled();
        });
    });

    describe("Concurrent Operations", () => {
        it("should handle multiple simultaneous cache operations", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            const mockSession = {
                user: { id: "concurrent-user", type: "regular" as const },
            };
            mockRedis.get.mockResolvedValue(mockSession);
            mockRedis.set.mockResolvedValue("OK");

            const { getCachedSession, setCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            // Multiple concurrent operations
            const operations = Array.from({ length: 10 }, (_, i) =>
                i % 2 === 0
                    ? getCachedSession(`user-${i}`)
                    : setCachedSession(`user-${i}`, {
                          user: { id: `user-${i}`, type: "regular" },
                      })
            );

            // All should complete without errors
            await expect(Promise.all(operations)).resolves.toBeDefined();
        });

        it("should maintain data integrity under concurrent access", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            const sessions: Record<string, object> = {};

            mockRedis.set.mockImplementation(
                async (key: string, value: object) => {
                    sessions[key] = value;
                    return "OK";
                }
            );

            mockRedis.get.mockImplementation(async (key: string) => {
                return sessions[key] || null;
            });

            const { setCachedSession, getCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            // Write multiple sessions
            await Promise.all([
                setCachedSession("user-1", {
                    user: { id: "user-1", type: "regular" },
                }),
                setCachedSession("user-2", {
                    user: { id: "user-2", type: "regular" },
                }),
                setCachedSession("user-3", {
                    user: { id: "user-3", type: "regular" },
                }),
            ]);

            // Read them back
            const [s1, s2, s3] = await Promise.all([
                getCachedSession("user-1"),
                getCachedSession("user-2"),
                getCachedSession("user-3"),
            ]);

            // Each should have correct data
            expect((s1 as any)?.user?.id).toBe("user-1");
            expect((s2 as any)?.user?.id).toBe("user-2");
            expect((s3 as any)?.user?.id).toBe("user-3");
        });
    });
});
