/**
 * Test Helper Utilities
 *
 * Common utility functions and helpers for use across test suites.
 * @module tests/utils/test-helpers
 */

import { act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { SWRConfig } from "swr";
import { vi } from "vitest";
import { TIMEOUTS } from "./constants";

// =============================================================================
// SWR TEST WRAPPER
// =============================================================================

/**
 * Creates a fresh SWR wrapper for isolated test state.
 * Use this to ensure each test has its own cache.
 */
export function createSWRWrapper() {
    return (
        function SWRTestWrapper({ children }: { children: ReactNode }) {
            return (
            <SWRConfig
                value={{
                    provider: () => new Map(),
                    dedupingInterval: 0,
                    revalidateOnFocus: false,
                    revalidateOnReconnect: false,
                }
        } >
        { children } <
        />CRSWfgino
    );
    )
}
}

/**
 * Creates an SWR wrapper with custom configuration.
 */
export function createCustomSWRWrapper(
    config: Partial<Parameters<typeof SWRConfig>[0]["value"]> = {}
) {
    return (
        function CustomSWRWrapper({ children }: { children: ReactNode }) {
            return (
            <SWRConfig
                value={{
                    provider: () => new Map(),
                    dedupingInterval: 0,
                    ...config,
                }
        } >
        { children } <
        />CRSWfgino
    );
    )
}
}

// =============================================================================
// ASYNC UTILITIES
// =============================================================================

/**
 * Waits for a condition to be true with customizable timeout.
 */
export async function waitForCondition(
    condition: () => boolean | Promise<boolean>,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = TIMEOUTS.async, interval = 50 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            return;
        }
        await delay(interval);
    }

    throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Creates a promise that resolves after a delay.
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps an async operation in act() for React state updates.
 */
export async function actAsync<T>(callback: () => Promise<T>): Promise<T> {
    let result: T;
    await act(async () => {
        result = await callback();
    });
    return result!;
}

/**
 * Flushes all pending promises and timers.
 */
export async function flushPromises(): Promise<void> {
    await act(async () => {
        await delay(0);
    });
}

/**
 * Advances timers and flushes promises in one call.
 */
export async function advanceTimersAndFlush(ms: number): Promise<void> {
    await act(async () => {
        vi.advanceTimersByTime(ms);
        await delay(0);
    });
}

// =============================================================================
// MOCK UTILITIES
// =============================================================================

/**
 * Creates a deferred promise that can be resolved/rejected externally.
 */
export function createDeferred<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
} {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;

    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
}

/**
 * Creates a mock that tracks all calls and can be asserted on.
 */
export function createTrackedMock<TArgs extends unknown[], TReturn>(
    implementation?: (...args: TArgs) => TReturn
) {
    const calls: TArgs[] = [];
    const mock = vi.fn((...args: TArgs) => {
        calls.push(args);
        return implementation?.(...args);
    });

    return {
        mock,
        calls,
        lastCall: () => calls.at(-1),
        callCount: () => calls.length,
        wasCalledWith: (...args: TArgs) =>
            calls.some((call) => JSON.stringify(call) === JSON.stringify(args)),
    };
}

/**
 * Suppresses console output during test execution.
 */
export function suppressConsole(
    methods: Array<"log" | "warn" | "error" | "info"> = ["error", "warn"]
) {
    const originals: Record<string, typeof console.log> = {};

    beforeEach(() => {
        for (const method of methods) {
            originals[method] = console[method];
            console[method] = vi.fn();
        }
    });

    afterEach(() => {
        for (const method of methods) {
            console[method] = originals[method];
        }
    });
}

// =============================================================================
// ASSERTION UTILITIES
// =============================================================================

/**
 * Asserts that a function throws an error with a specific message.
 */
export function expectToThrowWithMessage(
    fn: () => void,
    expectedMessage: string | RegExp
): void {
    try {
        fn();
        throw new Error("Expected function to throw");
    } catch (error) {
        if (error instanceof Error) {
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
        } else {
            throw error;
        }
    }
}

/**
 * Asserts that an async function throws an error.
 */
export async function expectAsyncToThrow(
    fn: () => Promise<unknown>,
    expectedMessage?: string | RegExp
): Promise<void> {
    try {
        await fn();
        throw new Error("Expected function to throw");
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "Expected function to throw"
        ) {
            throw error;
        }
        if (expectedMessage && error instanceof Error) {
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
    }
}

/**
 * Waits for an element to appear and returns it.
 */
export async function waitForElement<T>(
    getter: () => T | null | undefined,
    options: { timeout?: number } = {}
): Promise<T> {
    const { timeout = TIMEOUTS.async } = options;

    return waitFor(
        () => {
            const element = getter();
            if (!element) {
                throw new Error("Element not found");
            }
            return element;
        },
        { timeout }
    );
}

// =============================================================================
// DOM UTILITIES
// =============================================================================

/**
 * Creates a mock IntersectionObserver for testing.
 */
export function setupIntersectionObserverMock(
    options: { isIntersecting?: boolean; intersectionRatio?: number } = {}
) {
    const { isIntersecting = true, intersectionRatio = 1 } = options;

    const mockObserver = vi.fn().mockImplementation((callback) => ({
        observe: vi.fn().mockImplementation((element) => {
            callback([
                {
                    target: element,
                    isIntersecting,
                    intersectionRatio,
                    boundingClientRect:
                        element?.getBoundingClientRect?.() ?? {},
                    intersectionRect: {},
                    rootBounds: null,
                    time: Date.now(),
                },
            ]);
        }),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    }));

    vi.stubGlobal("IntersectionObserver", mockObserver);

    return mockObserver;
}

/**
 * Creates a mock ResizeObserver for testing.
 */
export function setupResizeObserverMock() {
    const mockObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    }));

    vi.stubGlobal("ResizeObserver", mockObserver);

    return mockObserver;
}

/**
 * Creates a mock matchMedia for testing responsive behavior.
 */
export function setupMatchMediaMock(matches = false) {
    const mockMatchMedia = vi.fn().mockImplementation((query) => ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));

    vi.stubGlobal("matchMedia", mockMatchMedia);

    return mockMatchMedia;
}

// =============================================================================
// TYPE UTILITIES
// =============================================================================

/**
 * Type-safe object keys helper.
 */
export function typedKeys<T extends object>(obj: T): Array<keyof T> {
    return Object.keys(obj) as Array<keyof T>;
}

/**
 * Type-safe object entries helper.
 */
export function typedEntries<T extends object>(
    obj: T
): [keyof T, T[keyof T]][] {
    return Object.entries(obj) as [keyof T, T[keyof T]][];
}

/**
 * Creates a partial mock that satisfies a type.
 */
export function createPartialMock<T>(partial: Partial<T>): T {
    return partial as T;
}

// =============================================================================
// CLEANUP UTILITIES
// =============================================================================

/**
 * Cleans up all mocks and restores original implementations.
 */
export function cleanupAllMocks(): void {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.useRealTimers();
}

/**
 * Runs cleanup functions and captures any errors.
 */
export async function safeCleanup(
    ...cleanupFns: Array<() => void | Promise<void>>
): Promise<Error[]> {
    const errors: Error[] = [];

    for (const fn of cleanupFns) {
        try {
            await fn();
        } catch (error) {
            errors.push(
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    return errors;
}
