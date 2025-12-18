/**
 * Test Setup File
 *
 * This file runs before all tests and configures the test environment.
 * It sets up global mocks, environment variables, and test utilities.
 */

import { afterAll, afterEach, beforeAll, vi } from "vitest";

// =============================================================================
// Environment Setup
// =============================================================================

// Set test environment variables
Object.defineProperty(process.env, "NODE_ENV", {
    value: "test",
    writable: true,
});
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.OPENAI_API_KEY = "test-api-key";

// =============================================================================
// Global Mocks
// =============================================================================

// Mock console methods in tests to reduce noise (optional)
const originalConsole = { ...console };

beforeAll(() => {
    // Optionally silence console during tests
    if (process.env.SILENT_TESTS === "true") {
        vi.spyOn(console, "log").mockImplementation(() => {
            // Intentionally empty to silence console
        });
        vi.spyOn(console, "warn").mockImplementation(() => {
            // Intentionally empty to silence console
        });
        vi.spyOn(console, "error").mockImplementation(() => {
            // Intentionally empty to silence console
        });
    }
});

afterAll(() => {
    // Restore console
    Object.assign(console, originalConsole);
});

// =============================================================================
// Cleanup
// =============================================================================

afterEach(() => {
    // Clear all mocks after each test
    vi.clearAllMocks();
});

afterAll(() => {
    // Reset all mocks after all tests
    vi.resetAllMocks();
});

// =============================================================================
// Global Test Utilities
// =============================================================================

/**
 * Wait for a specified duration (use sparingly)
 */
export function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a deferred promise for testing async flows
 */
export function createDeferred<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
} {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

// =============================================================================
// Type Extensions
// =============================================================================

// Extend Vitest's expect with custom matchers if needed
// declare module 'vitest' {
//   interface Assertion<T> {
//     toBeValidUser(): T;
//   }
// }
