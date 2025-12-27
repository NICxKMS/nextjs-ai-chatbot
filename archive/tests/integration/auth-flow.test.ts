/**
 * TEST-002: Authentication Flow Integration Tests
 *
 * Tests the complete authentication flow including:
 * - Guest session creation and verification
 * - Guest to auth migration
 * - Session caching behavior
 *
 * These tests verify actual module integration, mocking only external services.
 *
 * @module tests/integration/auth-flow.test.ts
 */
import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

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

describe("TEST-002: Authentication Flow Integration", () => {
    // Mock Redis instance for caching tests
    const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Guest Session Flow", () => {
        it("should create guest token with valid fingerprint", async () => {
            const { createGuestToken, createDeviceFingerprint } = await import(
                "@/lib/auth/jwt"
            );

            // Create fingerprint
            const fingerprint = await createDeviceFingerprint(
                "192.168.1.1",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
            );

            // Verify fingerprint structure
            expect(fingerprint).toHaveProperty("ipHash");
            expect(fingerprint).toHaveProperty("uaHash");
            expect(fingerprint.ipHash).toHaveLength(16);
            expect(fingerprint.uaHash).toHaveLength(16);

            // Create token with fingerprint
            const token = await createGuestToken("test-guest-123", fingerprint);

            // Token should be a valid JWT (three parts)
            expect(token.split(".")).toHaveLength(3);
        });

        it("should verify guest token and extract session", async () => {
            const { createGuestToken, verifyGuestToken } = await import(
                "@/lib/auth/jwt"
            );

            const guestId = "integration-test-guest";
            const token = await createGuestToken(guestId);

            // Verify the token
            const payload = await verifyGuestToken(token);

            expect(payload).not.toBeNull();
            expect(payload?.sub).toBe(`guest:${guestId}`);
            expect(payload?.type).toBe("guest");
            expect(payload?.iat).toBeDefined();
            expect(payload?.exp).toBeDefined();
        });

        it("should reject modified guest token", async () => {
            const { createGuestToken, verifyGuestToken } = await import(
                "@/lib/auth/jwt"
            );

            const token = await createGuestToken("valid-guest");

            // Tamper with the token (modify payload)
            const parts = token.split(".");
            const tamperedPayload = Buffer.from(
                JSON.stringify({ sub: "guest:hacked", type: "guest" })
            ).toString("base64url");
            const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

            // Should reject tampered token
            const result = await verifyGuestToken(tamperedToken);
            expect(result).toBeNull();
        });

        it("should expire guest token after TTL", async () => {
            const { signJwt, verifyJwt } = await import("@/lib/auth/jwt");

            // Create token with 1 second TTL
            const token = await signJwt(
                { sub: "guest:test", type: "guest" },
                1 // 1 second expiration
            );

            // Should be valid immediately
            const validResult = await verifyJwt(token);
            expect(validResult).not.toBeNull();

            // Wait for expiration
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Should be expired now
            const expiredResult = await verifyJwt(token);
            expect(expiredResult).toBeNull();
        });
    });

    describe("Guest to Auth Migration Flow", () => {
        it("should detect guest ID in token", async () => {
            const { createGuestToken } = await import("@/lib/auth/jwt");
            const { isGuestToken } = await import("@/lib/auth/extract-guest");

            const guestId = "migration-test-guest";
            const token = await createGuestToken(guestId);

            // Should detect as guest token
            expect(isGuestToken(token)).toBe(true);
        });

        it("should extract guest ID from JWT", async () => {
            const { createGuestToken } = await import("@/lib/auth/jwt");
            const { extractGuestIdFromToken } = await import(
                "@/lib/auth/extract-guest"
            );

            const guestId = "extract-test-123";
            const token = await createGuestToken(guestId);

            // Extract guest ID
            const extractedId = extractGuestIdFromToken(token);

            expect(extractedId).toBe(guestId);
        });

        it("should return null for non-guest token", async () => {
            const { signJwt } = await import("@/lib/auth/jwt");
            const { extractGuestIdFromToken, isGuestToken } = await import(
                "@/lib/auth/extract-guest"
            );

            // Create a non-guest token
            const token = await signJwt({
                sub: "user:authenticated-user",
                type: "regular",
            });

            expect(isGuestToken(token)).toBe(false);
            expect(extractGuestIdFromToken(token)).toBeNull();
        });

        it("should handle malformed token gracefully", async () => {
            const { extractGuestIdFromToken, isGuestToken } = await import(
                "@/lib/auth/extract-guest"
            );

            expect(isGuestToken("not-a-valid-jwt")).toBe(false);
            expect(extractGuestIdFromToken("malformed.token")).toBeNull();
            expect(extractGuestIdFromToken("")).toBeNull();
        });
    });

    describe("Session Caching Flow", () => {
        beforeAll(async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
        });

        it("should cache session after first load", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.set.mockResolvedValue("OK");

            const { setCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            const session = {
                user: { id: "user-cache-test", type: "regular" as const },
            };

            await setCachedSession("user-cache-test", session);

            expect(mockRedis.set).toHaveBeenCalledWith(
                "session:valid:user-cache-test",
                session,
                { ex: 30 }
            );
        });

        it("should return cached session on subsequent calls", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);

            const cachedSession = {
                user: { id: "cached-user", type: "regular" as const },
            };
            mockRedis.get.mockResolvedValue(cachedSession);

            const { getCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            const result = await getCachedSession("cached-user");

            expect(result).toEqual(cachedSession);
            expect(mockRedis.get).toHaveBeenCalledWith(
                "session:valid:cached-user"
            );
        });

        it("should invalidate cache on logout", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.del.mockResolvedValue(1);

            const { invalidateCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            await invalidateCachedSession("logout-user");

            expect(mockRedis.del).toHaveBeenCalledWith(
                "session:valid:logout-user"
            );
        });

        it("should handle cache miss gracefully", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(mockRedis as never);
            mockRedis.get.mockResolvedValue(null);

            const { getCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            const result = await getCachedSession("nonexistent-user");

            expect(result).toBeNull();
        });

        it("should handle Redis unavailable gracefully", async () => {
            const { getRedis } = await import("@/lib/cache/client");
            vi.mocked(getRedis).mockReturnValue(null);

            const { getCachedSession, setCachedSession } = await import(
                "@/lib/auth/session-cache"
            );

            // Should not throw, just return null/void
            const result = await getCachedSession("any-user");
            expect(result).toBeNull();

            await expect(
                setCachedSession("any-user", {
                    user: { id: "any-user", type: "regular" },
                })
            ).resolves.toBeUndefined();
        });
    });

    describe("Device Fingerprint Validation Flow", () => {
        it("should validate matching fingerprint", async () => {
            const { createDeviceFingerprint, validateDeviceFingerprint } =
                await import("@/lib/auth/jwt");

            const ip = "10.0.0.1";
            const userAgent = "TestBrowser/1.0";

            const stored = await createDeviceFingerprint(ip, userAgent);
            const result = await validateDeviceFingerprint(
                stored,
                ip,
                userAgent
            );

            expect(result.valid).toBe(true);
            expect(result.ipChanged).toBe(false);
        });

        it("should detect IP change but remain valid", async () => {
            const { createDeviceFingerprint, validateDeviceFingerprint } =
                await import("@/lib/auth/jwt");

            const originalIp = "10.0.0.1";
            const newIp = "10.0.0.2";
            const userAgent = "TestBrowser/1.0";

            const stored = await createDeviceFingerprint(originalIp, userAgent);
            const result = await validateDeviceFingerprint(
                stored,
                newIp,
                userAgent
            );

            expect(result.valid).toBe(true);
            expect(result.ipChanged).toBe(true);
        });

        it("should invalidate on User-Agent mismatch", async () => {
            const { createDeviceFingerprint, validateDeviceFingerprint } =
                await import("@/lib/auth/jwt");

            const ip = "10.0.0.1";
            const originalUA = "Chrome/120.0.0.0";
            const differentUA = "Firefox/121.0";

            const stored = await createDeviceFingerprint(ip, originalUA);
            const result = await validateDeviceFingerprint(
                stored,
                ip,
                differentUA
            );

            expect(result.valid).toBe(false);
        });

        it("should allow legacy tokens without fingerprint", async () => {
            const { validateDeviceFingerprint } = await import(
                "@/lib/auth/jwt"
            );

            // Simulate legacy token with no fingerprint stored
            const result = await validateDeviceFingerprint(
                undefined,
                "10.0.0.1",
                "SomeAgent"
            );

            expect(result.valid).toBe(true);
            expect(result.ipChanged).toBe(false);
        });
    });

    describe("Token Rotation Flow", () => {
        it("should identify token needing rotation", async () => {
            const { needsRotation, signJwt, verifyJwt } = await import(
                "@/lib/auth/jwt"
            );

            // Create token expiring in 20 minutes (under 30 min threshold)
            const token = await signJwt(
                { sub: "guest:rotation-test", type: "guest" },
                1200 // 20 minutes
            );

            const payload = await verifyJwt(token);
            expect(payload).not.toBeNull();
            expect(needsRotation(payload as any)).toBe(true);
        });

        it("should not rotate fresh token", async () => {
            const { needsRotation, signJwt, verifyJwt } = await import(
                "@/lib/auth/jwt"
            );

            // Create token with full 1 hour lifetime
            const token = await signJwt(
                { sub: "guest:fresh-token", type: "guest" },
                3600 // 1 hour
            );

            const payload = await verifyJwt(token);
            expect(payload).not.toBeNull();
            expect(needsRotation(payload as any)).toBe(false);
        });
    });
});
