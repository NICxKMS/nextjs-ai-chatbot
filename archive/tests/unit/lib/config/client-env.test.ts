/**
 * Tests for Client Environment Guard
 *
 * @module tests/unit/lib/config/client-env.test
 *
 * P2-013: Client environment guard
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    ClientEnvServerAccessError,
    ClientEnvValidationError,
    clientEnvSchema,
    getClientEnv,
    isClientEnvAvailable,
    resetClientEnvCache,
} from "@/lib/config/client-env";

describe("lib/config/client-env", () => {
    // Store original window reference
    const originalWindow = globalThis.window;

    beforeEach(() => {
        resetClientEnvCache();
        vi.unstubAllGlobals();
        // Restore window for each test - jsdom provides it
        globalThis.window = originalWindow;
    });

    afterEach(() => {
        // Restore window after each test
        globalThis.window = originalWindow;
    });

    describe("clientEnvSchema", () => {
        it("should validate valid client env", () => {
            const result = clientEnvSchema.safeParse({
                NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
                NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.NEXT_PUBLIC_SUPABASE_URL).toBe(
                    "https://test.supabase.co"
                );
                expect(result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe(
                    "test-anon-key"
                );
            }
        });

        it("should reject missing NEXT_PUBLIC_SUPABASE_URL", () => {
            const result = clientEnvSchema.safeParse({
                NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
            });

            expect(result.success).toBe(false);
        });

        it("should reject invalid URL for NEXT_PUBLIC_SUPABASE_URL", () => {
            const result = clientEnvSchema.safeParse({
                NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
                NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
            });

            expect(result.success).toBe(false);
        });

        it("should reject empty NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
            const result = clientEnvSchema.safeParse({
                NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
                NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
            });

            expect(result.success).toBe(false);
        });
    });

    describe("getClientEnv", () => {
        it("should throw ClientEnvServerAccessError on server", () => {
            // Simulate server: window is undefined
            // @ts-expect-error - Intentionally setting window to undefined for server simulation
            globalThis.window = undefined;

            expect(() => getClientEnv()).toThrow(ClientEnvServerAccessError);
        });

        it("should throw ClientEnvServerAccessError with helpful message", () => {
            // Simulate server: window is undefined
            // @ts-expect-error - Intentionally setting window to undefined for server simulation
            globalThis.window = undefined;

            try {
                getClientEnv();
            } catch (error) {
                expect(error).toBeInstanceOf(ClientEnvServerAccessError);
                expect((error as Error).message).toContain(
                    "use `env` from lib/config/env.ts instead"
                );
            }
        });

        it("should return validated env in browser environment", () => {
            // jsdom provides window - we're already in browser-like environment
            process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

            const env = getClientEnv();

            expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(
                "https://test.supabase.co"
            );
            expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("test-anon-key");
        });

        it("should throw ClientEnvValidationError for invalid env in browser", () => {
            // jsdom provides window - we're already in browser-like environment
            process.env.NEXT_PUBLIC_SUPABASE_URL = "invalid-url";
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

            expect(() => getClientEnv()).toThrow(ClientEnvValidationError);
        });
    });

    describe("isClientEnvAvailable", () => {
        it("should return false on server (no window)", () => {
            // Simulate server: window is undefined
            // @ts-expect-error - Intentionally setting window to undefined for server simulation
            globalThis.window = undefined;

            expect(isClientEnvAvailable()).toBe(false);
        });

        it("should return true in browser (window defined)", () => {
            // jsdom provides window - we're already in browser-like environment
            expect(isClientEnvAvailable()).toBe(true);
        });
    });

    describe("ClientEnvServerAccessError", () => {
        it("should have correct name", () => {
            const error = new ClientEnvServerAccessError();
            expect(error.name).toBe("ClientEnvServerAccessError");
        });

        it("should have helpful message", () => {
            const error = new ClientEnvServerAccessError();
            expect(error.message).toContain("getClientEnv()");
            expect(error.message).toContain("server");
        });
    });

    describe("ClientEnvValidationError", () => {
        it("should have correct name", () => {
            const error = new ClientEnvValidationError("test message");
            expect(error.name).toBe("ClientEnvValidationError");
        });

        it("should include the validation message", () => {
            const error = new ClientEnvValidationError("missing field");
            expect(error.message).toContain("missing field");
        });
    });

    describe("resetClientEnvCache", () => {
        it("should allow re-validation after reset", () => {
            // jsdom provides window - we're already in browser-like environment
            process.env.NEXT_PUBLIC_SUPABASE_URL = "https://first.supabase.co";
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "first-key";

            const env1 = getClientEnv();
            expect(env1.NEXT_PUBLIC_SUPABASE_URL).toBe(
                "https://first.supabase.co"
            );

            // Change env vars
            process.env.NEXT_PUBLIC_SUPABASE_URL = "https://second.supabase.co";
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "second-key";

            // Without reset, should still return cached value
            // Note: getClientEnv creates new validation each time, but clientEnv proxy caches

            // Reset and get new values
            resetClientEnvCache();
            const env2 = getClientEnv();
            expect(env2.NEXT_PUBLIC_SUPABASE_URL).toBe(
                "https://second.supabase.co"
            );
        });
    });
});
