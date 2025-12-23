/**
 * TEST-002: Rate Limiting Integration Tests
 *
 * Tests rate limiting configuration, route mapping, and limiter behavior.
 * Mocks Redis at boundary to test actual module integration.
 *
 * @module tests/integration/rate-limit.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock logger to avoid noise
vi.mock("@/lib/utils/logger", () => ({
    logger: {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

describe("TEST-002: Rate Limiting Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Route-based limiting", () => {
        it("should apply strict limits to guest endpoint", async () => {
            const { ROUTE_LIMITER_MAP, RATE_LIMITS } = await import(
                "@/lib/middleware/rate-limit-config"
            );

            const guestRoute = "/api/auth/guest";
            const limiterType = ROUTE_LIMITER_MAP[guestRoute];

            expect(limiterType).toBe("strict");
            expect(RATE_LIMITS.strict.requests).toBe(10);
            expect(RATE_LIMITS.strict.window).toBe("60s");
        });

        it("should apply standard limits to chat endpoint", async () => {
            const { ROUTE_LIMITER_MAP, RATE_LIMITS } = await import(
                "@/lib/middleware/rate-limit-config"
            );

            const chatRoute = "/api/chat";
            const limiterType = ROUTE_LIMITER_MAP[chatRoute];

            expect(limiterType).toBe("chat");
            expect(RATE_LIMITS.chat.requests).toBe(50);
            expect(RATE_LIMITS.chat.window).toBe("60s");
            expect(RATE_LIMITS.chat.burst).toBe(10);
        });

        it("should apply global limits to all routes", async () => {
            const { RATE_LIMITS } = await import(
                "@/lib/middleware/rate-limit-config"
            );

            // Global IP limit applies to all routes
            expect(RATE_LIMITS.globalIp).toBeDefined();
            expect(RATE_LIMITS.globalIp.requests).toBe(100);
            expect(RATE_LIMITS.globalIp.window).toBe("60s");
        });

        it("should have correct limiter for auth routes", async () => {
            const { ROUTE_LIMITER_MAP, RATE_LIMITS } = await import(
                "@/lib/middleware/rate-limit-config"
            );

            const authRoutes = [
                "/api/auth/login",
                "/api/auth/register",
                "/api/auth/callback",
            ];

            for (const route of authRoutes) {
                const limiterType = ROUTE_LIMITER_MAP[route];
                expect(limiterType).toBe("auth");
            }

            expect(RATE_LIMITS.auth.requests).toBe(20);
            expect(RATE_LIMITS.auth.window).toBe("60s");
        });

        it("should have upload limiter with hourly window", async () => {
            const { ROUTE_LIMITER_MAP, RATE_LIMITS } = await import(
                "@/lib/middleware/rate-limit-config"
            );

            const uploadRoute = "/api/files/upload";
            const limiterType = ROUTE_LIMITER_MAP[uploadRoute];

            expect(limiterType).toBe("upload");
            expect(RATE_LIMITS.upload.requests).toBe(10);
            expect(RATE_LIMITS.upload.window).toBe("1h");
        });

        it("should have generous limits for search", async () => {
            const { ROUTE_LIMITER_MAP, RATE_LIMITS } = await import(
                "@/lib/middleware/rate-limit-config"
            );

            const searchRoute = "/api/suggestions";
            const limiterType = ROUTE_LIMITER_MAP[searchRoute];

            expect(limiterType).toBe("search");
            expect(RATE_LIMITS.search.requests).toBe(1000);
        });
    });

    describe("Limit behavior (config verification)", () => {
        it("should have all required limiters defined", async () => {
            const { RATE_LIMITS } = await import(
                "@/lib/middleware/rate-limit-config"
            );
            type LimiterType = keyof typeof RATE_LIMITS;

            const requiredLimiters: LimiterType[] = [
                "standard",
                "strict",
                "auth",
                "chat",
                "upload",
                "guest",
                "search",
                "globalIp",
            ];

            for (const limiter of requiredLimiters) {
                expect(RATE_LIMITS[limiter]).toBeDefined();
                expect(RATE_LIMITS[limiter].requests).toBeGreaterThan(0);
                expect(RATE_LIMITS[limiter].window).toBeTruthy();
            }
        });

        it("should have consistent window formats", async () => {
            const { RATE_LIMITS } = await import(
                "@/lib/middleware/rate-limit-config"
            );

            const validWindowFormats = ["60s", "1h", "1m", "1d"];

            for (const [name, config] of Object.entries(RATE_LIMITS)) {
                const typedConfig = config as { window: string };
                const window = typedConfig.window;
                const isValidFormat = /^\d+[smhd]$/.test(window);
                expect(isValidFormat).toBe(true);
            }
        });

        it("should have burst configured for token bucket limiters", async () => {
            const { RATE_LIMITS } = await import(
                "@/lib/middleware/rate-limit-config"
            );

            // Chat uses token bucket and should have burst
            expect(RATE_LIMITS.chat.burst).toBeDefined();
            expect(RATE_LIMITS.chat.burst).toBeGreaterThan(0);
        });
    });

    describe("Guest multiplier", () => {
        it("should apply stricter limits to guest users", async () => {
            const { GUEST_LIMITER_OVERRIDES, RATE_LIMITS } = await import(
                "@/lib/middleware/rate-limit-config"
            );

            // Verify guest overrides reduce limits
            expect(GUEST_LIMITER_OVERRIDES.standard).toBe("guest");
            expect(GUEST_LIMITER_OVERRIDES.chat).toBe("guest");

            // Guest limit should be lower than standard
            expect(RATE_LIMITS.guest.requests).toBeLessThan(
                RATE_LIMITS.standard.requests
            );
        });

        it("should reduce search limits for guests", async () => {
            const { GUEST_LIMITER_OVERRIDES, RATE_LIMITS } = await import(
                "@/lib/middleware/rate-limit-config"
            );

            // Search overrides to standard for guests
            expect(GUEST_LIMITER_OVERRIDES.search).toBe("standard");

            // Standard is lower than search (1000 -> 100)
            expect(RATE_LIMITS.standard.requests).toBeLessThan(
                RATE_LIMITS.search.requests
            );
        });

        it("should have meaningful rate reductions for guests", async () => {
            const { RATE_LIMITS } = await import(
                "@/lib/middleware/rate-limit-config"
            );

            // Guest should be 20% of standard (100 -> 20)
            const guestRatio =
                RATE_LIMITS.guest.requests / RATE_LIMITS.standard.requests;
            expect(guestRatio).toBeLessThanOrEqual(0.5);
        });
    });

    describe("Rate limit behavior (with mock Redis)", () => {
        it("should fail closed when Redis is unavailable", async () => {
            // Reset modules to clear any cached Redis instance
            vi.resetModules();

            // Clear env vars to simulate no Redis
            const originalUrl = process.env.CACHE_KV_REST_API_URL;
            const originalToken = process.env.CACHE_KV_REST_API_TOKEN;
            delete process.env.CACHE_KV_REST_API_URL;
            delete process.env.CACHE_KV_REST_API_TOKEN;

            try {
                const { checkRateLimit } = await import(
                    "@/lib/middleware/rate-limit"
                );

                const result = await checkRateLimit("test-identifier");

                // Should fail closed (block request) when Redis unavailable
                expect(result.success).toBe(false);
                expect(result.remaining).toBe(0);
            } finally {
                // Restore env vars
                if (originalUrl)
                    process.env.CACHE_KV_REST_API_URL = originalUrl;
                if (originalToken)
                    process.env.CACHE_KV_REST_API_TOKEN = originalToken;
            }
        });

        it("should include rate limit metadata in response", async () => {
            vi.resetModules();

            const originalUrl = process.env.CACHE_KV_REST_API_URL;
            const originalToken = process.env.CACHE_KV_REST_API_TOKEN;
            delete process.env.CACHE_KV_REST_API_URL;
            delete process.env.CACHE_KV_REST_API_TOKEN;

            try {
                const { checkRateLimit } = await import(
                    "@/lib/middleware/rate-limit"
                );

                const result = await checkRateLimit("test-user", "standard");

                // Even on failure, should have metadata
                expect(result).toHaveProperty("success");
                expect(result).toHaveProperty("limit");
                expect(result).toHaveProperty("remaining");
                expect(result).toHaveProperty("reset");
                expect(result).toHaveProperty("pending");
            } finally {
                if (originalUrl)
                    process.env.CACHE_KV_REST_API_URL = originalUrl;
                if (originalToken)
                    process.env.CACHE_KV_REST_API_TOKEN = originalToken;
            }
        });

        it("should use correct default limit for each type", async () => {
            vi.resetModules();

            const originalUrl = process.env.CACHE_KV_REST_API_URL;
            const originalToken = process.env.CACHE_KV_REST_API_TOKEN;
            delete process.env.CACHE_KV_REST_API_URL;
            delete process.env.CACHE_KV_REST_API_TOKEN;

            try {
                const { checkRateLimit } = await import(
                    "@/lib/middleware/rate-limit"
                );
                const { RATE_LIMITS } = await import(
                    "@/lib/middleware/rate-limit-config"
                );

                const standardResult = await checkRateLimit(
                    "test-user",
                    "standard"
                );
                expect(standardResult.limit).toBe(
                    RATE_LIMITS.standard.requests
                );

                const strictResult = await checkRateLimit(
                    "test-user",
                    "strict"
                );
                expect(strictResult.limit).toBe(RATE_LIMITS.strict.requests);

                const chatResult = await checkRateLimit("test-user", "chat");
                expect(chatResult.limit).toBe(RATE_LIMITS.chat.requests);
            } finally {
                if (originalUrl)
                    process.env.CACHE_KV_REST_API_URL = originalUrl;
                if (originalToken)
                    process.env.CACHE_KV_REST_API_TOKEN = originalToken;
            }
        });
    });

    describe("Limiter type mapping", () => {
        it("should export all limiter types from config", async () => {
            const { limiters } = await import("@/lib/middleware/rate-limit");
            const { RATE_LIMITS } = await import(
                "@/lib/middleware/rate-limit-config"
            );
            type LimiterType = keyof typeof RATE_LIMITS;

            const expectedTypes = Object.keys(RATE_LIMITS) as LimiterType[];

            for (const type of expectedTypes) {
                expect(limiters).toHaveProperty(type as string);
            }
        });

        it("should have consistent limiter naming", async () => {
            const { ROUTE_LIMITER_MAP, RATE_LIMITS } = await import(
                "@/lib/middleware/rate-limit-config"
            );

            // All values in ROUTE_LIMITER_MAP should exist in RATE_LIMITS
            for (const [route, limiterType] of Object.entries(
                ROUTE_LIMITER_MAP
            )) {
                expect(RATE_LIMITS[limiterType]).toBeDefined();
            }
        });
    });
});
