/**
 * Unit Test Setup File
 *
 * This file configures the unit test environment with global mocks and utilities.
 * It supplements the main setup.ts with additional mocks specific to unit tests.
 */

import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";

// =============================================================================
// Next.js Module Mocks
// =============================================================================

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        refresh: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        prefetch: vi.fn(),
    }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
    redirect: vi.fn(),
    notFound: vi.fn(),
}));

// =============================================================================
// React Mocks
// =============================================================================

vi.mock("react", async () => {
    const actual = await vi.importActual("react");
    return {
        ...actual,
        useId: () => "test-id",
    };
});

vi.mock("next/headers", () => ({
    cookies: () => ({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        has: vi.fn(),
        getAll: vi.fn(() => []),
    }),
    headers: () => new Headers(),
}));

// =============================================================================
// localStorage Mock
// =============================================================================

const createLocalStorageMock = () => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
        key: (i: number) => Object.keys(store)[i] ?? null,
        get length() {
            return Object.keys(store).length;
        },
    };
};

const localStorageMock = createLocalStorageMock();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// =============================================================================
// sessionStorage Mock
// =============================================================================

const sessionStorageMock = createLocalStorageMock();
Object.defineProperty(globalThis, "sessionStorage", {
    value: sessionStorageMock,
});

// =============================================================================
// Window Mock
// =============================================================================

// Ensure window is defined for client-side tests
if (typeof window === "undefined") {
    Object.defineProperty(globalThis, "window", {
        value: {
            localStorage: localStorageMock,
            sessionStorage: sessionStorageMock,
        },
        writable: true,
    });
}

// =============================================================================
// Cleanup
// =============================================================================

afterEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();
});

// =============================================================================
// Browser API Mocks
// =============================================================================

// Window matchMedia mock
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// ResizeObserver mock
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// IntersectionObserver mock
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: "",
    thresholds: [],
}));

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Creates a mock React ref object
 */
export function createMockRef<T>(value: T | null = null): React.RefObject<T> {
    return { current: value } as React.RefObject<T>;
}

/**
 * Flushes pending promises (useful for testing async state updates)
 */
export async function flushPromises(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Creates a deferred promise for controlled async testing
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
