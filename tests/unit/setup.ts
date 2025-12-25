import "@testing-library/jest-dom/vitest";
import { afterAll, beforeAll } from "vitest";

// Mock environment variables for tests
process.env.AUTH_SECRET = "test-secret-key-for-jwt-signing-32chars";
process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.USE_MOCK_AI = "true";

// Track unhandled rejections that we expect from fake timer + AbortSignal tests
// These are caused by jsdom's AbortSignal implementation interacting with vitest's fake timers
let unhandledRejectionHandler: (event: PromiseRejectionEvent) => void;

beforeAll(() => {
    unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
        const error = event.reason;
        // Suppress expected AbortError from retry tests using fake timers
        if (error?.name === "AbortError" || error?.message === "Aborted") {
            event.preventDefault();
        }
    };

    if (typeof window !== "undefined") {
        window.addEventListener(
            "unhandledrejection",
            unhandledRejectionHandler
        );
    }
});

afterAll(() => {
    if (typeof window !== "undefined" && unhandledRejectionHandler) {
        window.removeEventListener(
            "unhandledrejection",
            unhandledRejectionHandler
        );
    }
});
