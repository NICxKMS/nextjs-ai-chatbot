/**
 * TEST-001: Session Cache Tests
 *
 * Tests for session validation caching with mocked Redis.
 *
 * @module tests/unit/security/session-cache.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSession } from "@/lib/auth/types";

// Mock the Redis client module
vi.mock("@/lib/cache/client", () => ({
    getRedis: vi.fn(),
}));

// Mock the logger to avoid console noise
vi.mock("@/lib/utils/logger", () => ({
    logger: {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

describe("Session Cache", () => {
    // Mock Redis instance
    const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
    };

    // Sample session for testing
    const mockSession: AppSession = {
        user: {
            id: "user-123",
            type: "regular",
            email: "test@example.com",
        },
    };

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe("getCachedSession", () => {
        it("should return cached session when present", async () => {
            // Setup mock
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.get.mockResolvedValue(mockSession);

            // Import after mocking
            const { getCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            const result = await getCachedSession("user-123");

            expect(result).toEqual(mockSession);
            expect(mockRedis.get).toHaveBeenCalledWith(
                "session:valid:user-123"
            );
        });

        it("should return null when cache is empty", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.get.mockResolvedValue(null);

            const { getCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            const result = await getCachedSession("user-123");

            expect(result).toBeNull();
        });

        it("should return null when Redis is not configured", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(null);

            const { getCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            const result = await getCachedSession("user-123");

            expect(result).toBeNull();
            expect(mockRedis.get).not.toHaveBeenCalled();
        });

        it("should handle Redis errors gracefully", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.get.mockRejectedValue(
                new Error("Redis connection error")
            );

            const { getCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            const result = await getCachedSession("user-123");

            expect(result).toBeNull();
        });
    });

    describe("setCachedSession", () => {
        it("should cache session with correct TTL", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.set.mockResolvedValue("OK");

            const { setCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            await setCachedSession("user-123", mockSession);

            expect(mockRedis.set).toHaveBeenCalledWith(
                "session:valid:user-123",
                mockSession,
                { ex: 30 } // 30 second TTL
            );
        });

        it("should use user ID as cache key", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.set.mockResolvedValue("OK");

            const { setCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            await setCachedSession("custom-user-id-456", mockSession);

            expect(mockRedis.set).toHaveBeenCalledWith(
                "session:valid:custom-user-id-456",
                mockSession,
                expect.any(Object)
            );
        });

        it("should not throw when Redis is not configured", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(null);

            const { setCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            // Should not throw
            await expect(
                setCachedSession("user-123", mockSession)
            ).resolves.toBeUndefined();
        });

        it("should handle Redis errors gracefully", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.set.mockRejectedValue(new Error("Redis write error"));

            const { setCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            // Should not throw
            await expect(
                setCachedSession("user-123", mockSession)
            ).resolves.toBeUndefined();
        });
    });

    describe("invalidateCachedSession", () => {
        it("should remove session from cache", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.del.mockResolvedValue(1);

            const { invalidateCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            await invalidateCachedSession("user-123");

            expect(mockRedis.del).toHaveBeenCalledWith(
                "session:valid:user-123"
            );
        });

        it("should not throw when Redis is not configured", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(null);

            const { invalidateCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            await expect(
                invalidateCachedSession("user-123")
            ).resolves.toBeUndefined();
        });

        it("should handle Redis errors gracefully", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.del.mockRejectedValue(new Error("Redis delete error"));

            const { invalidateCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            // Should not throw
            await expect(
                invalidateCachedSession("user-123")
            ).resolves.toBeUndefined();
        });
    });

    describe("extractUserIdFromToken", () => {
        it("should extract user ID from valid JWT", async () => {
            const { extractUserIdFromToken } = await import(
                "@/lib/auth/session-cache"
            );

            // Create a mock JWT payload
            const payload = { sub: "user-123", iat: 12_345, exp: 99_999 };
            const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
                "base64url"
            );
            const mockToken = `eyJhbGciOiJIUzI1NiJ9.${payloadBase64}.signature`;

            const result = extractUserIdFromToken(mockToken);

            expect(result).toBe("user-123");
        });

        it("should return null for invalid token format", async () => {
            const { extractUserIdFromToken } = await import(
                "@/lib/auth/session-cache"
            );

            expect(extractUserIdFromToken("invalid")).toBeNull();
            expect(extractUserIdFromToken("only.two")).toBeNull();
            expect(extractUserIdFromToken("")).toBeNull();
        });

        it("should return null for token without sub claim", async () => {
            const { extractUserIdFromToken } = await import(
                "@/lib/auth/session-cache"
            );

            const payload = { iat: 12_345, exp: 99_999 };
            const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
                "base64url"
            );
            const mockToken = `eyJhbGciOiJIUzI1NiJ9.${payloadBase64}.signature`;

            const result = extractUserIdFromToken(mockToken);

            expect(result).toBeNull();
        });

        it("should return null for malformed payload", async () => {
            const { extractUserIdFromToken } = await import(
                "@/lib/auth/session-cache"
            );

            const mockToken = "header.notvalidbase64!@#.signature";

            const result = extractUserIdFromToken(mockToken);

            expect(result).toBeNull();
        });
    });
});
