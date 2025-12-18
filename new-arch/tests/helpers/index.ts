/**
 * Test Helpers
 *
 * Utility functions for common testing operations.
 * These helpers simplify test setup, assertions, and cleanup.
 */

import { type Mock, vi } from "vitest";

// =============================================================================
// Mock Helpers
// =============================================================================

/**
 * Create a typed mock function
 */
export function createMock<
    T extends (...args: unknown[]) => unknown,
>(): Mock<T> {
    return vi.fn() as Mock<T>;
}

/**
 * Create a mock that resolves with a value
 */
export function mockResolvedValue<T>(value: T): Mock<() => Promise<T>> {
    return vi.fn().mockResolvedValue(value) as Mock<() => Promise<T>>;
}

/**
 * Create a mock that rejects with an error
 */
export function mockRejectedValue(error: Error): Mock<() => Promise<never>> {
    return vi.fn().mockRejectedValue(error) as Mock<() => Promise<never>>;
}

// =============================================================================
// Async Helpers
// =============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
    condition: () => boolean | Promise<boolean>,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = 5000, interval = 50 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`waitFor timed out after ${timeout}ms`);
}

/**
 * Wait for a specific number of milliseconds
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function until it succeeds or max attempts reached
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: { maxAttempts?: number; delay?: number } = {}
): Promise<T> {
    const { maxAttempts = 3, delay: delayMs = 100 } = options;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError =
                error instanceof Error ? error : new Error(String(error));
            if (attempt < maxAttempts) {
                await delay(delayMs * attempt);
            }
        }
    }

    throw lastError;
}

// =============================================================================
// Request/Response Helpers
// =============================================================================

/**
 * Create a mock Request object
 */
export function createMockRequest(
    url: string,
    options: RequestInit = {}
): Request {
    return new Request(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
        ...options,
    });
}

/**
 * Create a mock JSON request
 */
export function createJsonRequest<T>(
    url: string,
    body: T,
    options: Omit<RequestInit, "body"> = {}
): Request {
    return new Request(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
        body: JSON.stringify(body),
        ...options,
    });
}

/**
 * Parse response body as JSON
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
    return await (response.json() as Promise<T>);
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Assert that an async function throws a specific error
 */
export async function expectAsyncError(
    fn: () => Promise<unknown>,
    expectedMessage?: string | RegExp
): Promise<Error> {
    try {
        await fn();
        throw new Error("Expected function to throw an error");
    } catch (error) {
        if (!(error instanceof Error)) {
            throw new Error(`Expected Error instance, got ${typeof error}`);
        }

        if (expectedMessage) {
            if (typeof expectedMessage === "string") {
                if (!error.message.includes(expectedMessage)) {
                    throw new Error(
                        `Expected error message to include "${expectedMessage}", got "${error.message}"`
                    );
                }
            } else if (!expectedMessage.test(error.message)) {
                throw new Error(
                    `Expected error message to match ${expectedMessage}, got "${error.message}"`
                );
            }
        }

        return error;
    }
}

/**
 * Assert that a value is defined (not null or undefined)
 */
export function assertDefined<T>(
    value: T | null | undefined,
    message = "Expected value to be defined"
): asserts value is T {
    if (value === null || value === undefined) {
        throw new Error(message);
    }
}

// =============================================================================
// Data Generation Helpers
// =============================================================================

/**
 * Generate a random string of specified length
 */
export function randomString(length = 10): string {
    const chars =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from(
        { length },
        () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
}

/**
 * Generate a random email address
 */
export function randomEmail(): string {
    return `test-${randomString(8)}@example.com`;
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// =============================================================================
// Cleanup Helpers
// =============================================================================

/**
 * Track resources for cleanup after tests
 */
export class ResourceTracker {
    private cleanupFns: Array<() => void | Promise<void>> = [];

    /**
     * Register a cleanup function
     */
    track(cleanup: () => void | Promise<void>): void {
        this.cleanupFns.push(cleanup);
    }

    /**
     * Run all cleanup functions in reverse order
     */
    async cleanup(): Promise<void> {
        const errors: Error[] = [];

        for (const fn of this.cleanupFns.reverse()) {
            try {
                await fn();
            } catch (error) {
                errors.push(
                    error instanceof Error ? error : new Error(String(error))
                );
            }
        }

        this.cleanupFns = [];

        if (errors.length > 0) {
            throw new AggregateError(errors, "Cleanup failed");
        }
    }
}

// =============================================================================
// Snapshot Helpers
// =============================================================================

/**
 * Normalize data for snapshot comparison (remove dynamic fields)
 */
export function normalizeForSnapshot<T extends Record<string, unknown>>(
    data: T,
    fieldsToRemove: string[] = ["id", "createdAt", "updatedAt"]
): Partial<T> {
    const normalized = { ...data };

    for (const field of fieldsToRemove) {
        delete normalized[field];
    }

    return normalized;
}
