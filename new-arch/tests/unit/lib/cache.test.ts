import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@upstash/redis", () => ({
    Redis: vi.fn().mockImplementation(() => ({
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue("OK"),
        del: vi.fn().mockResolvedValue(1),
    })),
}));

describe("Cache Layer", () => {
    describe("Circuit Breaker", () => {
        beforeEach(() => {
            // Reset module state between tests
            vi.resetModules();
        });

        it("opens after threshold failures", async () => {
            const { isCircuitOpen, recordFailure, configureCircuitBreaker } =
                await import("@/lib/cache/circuit-breaker");
            configureCircuitBreaker(3, 30_000);
            for (let i = 0; i < 3; i++) {
                recordFailure("test", new Error("test error"));
            }
            expect(isCircuitOpen()).toBe(true);
        });
    });
});
