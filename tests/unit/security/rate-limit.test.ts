/**
 * TEST-001: Rate Limiting Tests
 *
 * Tests for rate limit configuration and route mapping.
 * Tests run without Redis (configuration only).
 *
 * @module tests/unit/security/rate-limit.test.ts
 */
import { describe, expect, it } from "vitest";
import {
    GUEST_LIMITER_OVERRIDES,
    type LimiterType,
    RATE_LIMITS,
    ROUTE_LIMITER_MAP,
} from "@/lib/middleware/rate-limit-config";

describe("Rate Limiting", () => {
    describe("RATE_LIMITS config", () => {
        it("should have globalIp preset", () => {
            expect(RATE_LIMITS.globalIp).toBeDefined();
            expect(RATE_LIMITS.globalIp.requests).toBe(100);
            expect(RATE_LIMITS.globalIp.window).toBe("60s");
        });

        it("should have guestCreation preset (strict)", () => {
            // Guest creation uses strict limiter
            expect(RATE_LIMITS.strict).toBeDefined();
            expect(RATE_LIMITS.strict.requests).toBe(10);
            expect(RATE_LIMITS.strict.window).toBe("60s");
        });

        it("should have chatApi preset", () => {
            expect(RATE_LIMITS.chat).toBeDefined();
            expect(RATE_LIMITS.chat.requests).toBe(50);
            expect(RATE_LIMITS.chat.window).toBe("60s");
            expect(RATE_LIMITS.chat.burst).toBe(10);
        });

        it("should have all required presets", () => {
            const requiredPresets: LimiterType[] = [
                "standard",
                "strict",
                "auth",
                "chat",
                "upload",
                "guest",
                "search",
                "globalIp",
            ];

            for (const preset of requiredPresets) {
                expect(RATE_LIMITS[preset]).toBeDefined();
                expect(RATE_LIMITS[preset].requests).toBeGreaterThan(0);
                expect(RATE_LIMITS[preset].window).toBeTruthy();
            }
        });

        it("should have correct standard preset", () => {
            expect(RATE_LIMITS.standard).toEqual({
                requests: 100,
                window: "60s",
            });
        });

        it("should have correct auth preset", () => {
            expect(RATE_LIMITS.auth).toEqual({
                requests: 20,
                window: "60s",
            });
        });

        it("should have correct upload preset", () => {
            expect(RATE_LIMITS.upload).toEqual({
                requests: 10,
                window: "1h",
            });
        });

        it("should have correct guest preset", () => {
            expect(RATE_LIMITS.guest).toEqual({
                requests: 20,
                window: "60s",
            });
        });

        it("should have correct search preset", () => {
            expect(RATE_LIMITS.search).toEqual({
                requests: 1000,
                window: "60s",
            });
        });
    });

    describe("ROUTE_LIMITER_MAP", () => {
        it("should return strict limiter for /api/auth/guest", () => {
            expect(ROUTE_LIMITER_MAP["/api/auth/guest"]).toBe("strict");
        });

        it("should return standard limiter for /api/chat", () => {
            // Chat uses token bucket limiter
            expect(ROUTE_LIMITER_MAP["/api/chat"]).toBe("chat");
        });

        it("should have auth limiter for login route", () => {
            expect(ROUTE_LIMITER_MAP["/api/auth/login"]).toBe("auth");
        });

        it("should have auth limiter for register route", () => {
            expect(ROUTE_LIMITER_MAP["/api/auth/register"]).toBe("auth");
        });

        it("should have auth limiter for callback route", () => {
            expect(ROUTE_LIMITER_MAP["/api/auth/callback"]).toBe("auth");
        });

        it("should have upload limiter for file upload route", () => {
            expect(ROUTE_LIMITER_MAP["/api/files/upload"]).toBe("upload");
        });

        it("should have search limiter for suggestions route", () => {
            expect(ROUTE_LIMITER_MAP["/api/suggestions"]).toBe("search");
        });

        it("should have standard limiter for document route", () => {
            expect(ROUTE_LIMITER_MAP["/api/document"]).toBe("standard");
        });

        it("should have standard limiter for vote route", () => {
            expect(ROUTE_LIMITER_MAP["/api/vote"]).toBe("standard");
        });

        it("should have standard limiter for history route", () => {
            expect(ROUTE_LIMITER_MAP["/api/history"]).toBe("standard");
        });
    });

    describe("GUEST_LIMITER_OVERRIDES", () => {
        it("should override standard to guest for unauthenticated users", () => {
            expect(GUEST_LIMITER_OVERRIDES.standard).toBe("guest");
        });

        it("should override chat to guest for unauthenticated users", () => {
            expect(GUEST_LIMITER_OVERRIDES.chat).toBe("guest");
        });

        it("should override search to standard for guests (reduced)", () => {
            expect(GUEST_LIMITER_OVERRIDES.search).toBe("standard");
        });

        it("should have meaningful rate reductions for guests", () => {
            // Standard: 100 -> Guest: 20 (80% reduction)
            const standardRate = RATE_LIMITS.standard.requests;
            const guestRate = RATE_LIMITS.guest.requests;
            expect(guestRate).toBeLessThan(standardRate);
        });
    });

    describe("Rate limit hierarchy", () => {
        it("should have strict < auth < standard rates", () => {
            expect(RATE_LIMITS.strict.requests).toBeLessThan(
                RATE_LIMITS.auth.requests
            );
            expect(RATE_LIMITS.auth.requests).toBeLessThan(
                RATE_LIMITS.standard.requests
            );
        });

        it("should have upload as most restrictive (per hour)", () => {
            // Upload is 10 per hour vs others per minute
            expect(RATE_LIMITS.upload.window).toBe("1h");
            expect(RATE_LIMITS.upload.requests).toBe(10);
        });

        it("should have search as most generous", () => {
            expect(RATE_LIMITS.search.requests).toBeGreaterThan(
                RATE_LIMITS.standard.requests
            );
        });
    });
});
