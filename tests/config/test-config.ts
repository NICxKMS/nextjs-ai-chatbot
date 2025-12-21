/**
 * Test Configuration
 * Controls whether tests use real or mock services.
 * Set via environment variables or .env.test file.
 *
 * @module tests/config/test-config
 */

import { describe, it } from "vitest";

/**
 * Test configuration that controls whether tests use real or mock services.
 */
export const testConfig = {
    // Use real Redis (Upstash) instead of mocks
    // Requires both the flag AND valid credentials
    useRealCache:
        process.env.TEST_USE_REAL_CACHE === "true" &&
        !!process.env.CACHE_KV_REST_API_URL &&
        !!process.env.CACHE_KV_REST_API_TOKEN,

    // Use real database (Drizzle/Postgres) instead of mocks
    useRealDatabase: process.env.TEST_USE_REAL_DB === "true",

    // Use real blob storage instead of mocks
    useRealBlobStorage: process.env.TEST_USE_REAL_BLOB === "true",

    // Redis connection (uses project env vars if useRealCache)
    redis: {
        url: process.env.CACHE_KV_REST_API_URL,
        token: process.env.CACHE_KV_REST_API_TOKEN,
    },

    // Database connection
    database: {
        url: process.env.DATABASE_URL,
    },

    // Test timeout for integration tests (longer than unit)
    integrationTimeout: 30000,
} as const;

export type ServiceType = "cache" | "database" | "blob";

/**
 * Check if a real service is available
 */
export function isServiceAvailable(service: ServiceType): boolean {
    switch (service) {
        case "cache":
            // Check env vars directly since testConfig.useRealCache already includes this check
            return (
                process.env.TEST_USE_REAL_CACHE === "true" &&
                !!process.env.CACHE_KV_REST_API_URL &&
                !!process.env.CACHE_KV_REST_API_TOKEN
            );
        case "database":
            return testConfig.useRealDatabase && !!testConfig.database.url;
        case "blob":
            return testConfig.useRealBlobStorage;
        default:
            return false;
    }
}

/**
 * Skip test if real service is not available
 * @returns true if test should be skipped
 */
export function skipIfNoRealService(service: ServiceType): boolean {
    return !isServiceAvailable(service);
}

/**
 * Helper to conditionally run tests based on service availability
 * Usage: describeIf(isServiceAvailable('cache'), 'Cache tests', () => {...})
 */
export function describeIf(
    condition: boolean,
    name: string,
    fn: () => void
): void {
    if (condition) {
        describe(name, fn);
    } else {
        describe.skip(name, fn);
    }
}

/**
 * Helper to conditionally run a test based on service availability
 * Usage: itIf(isServiceAvailable('cache'), 'should cache data', async () => {...})
 */
export function itIf(
    condition: boolean,
    name: string,
    fn: () => void | Promise<void>
): void {
    if (condition) {
        it(name, fn);
    } else {
        it.skip(name, fn);
    }
}
