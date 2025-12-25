/**
 * P2-014: Cache Metrics Unit Tests
 *
 * Tests for cache hit/miss metrics tracking.
 *
 * @module tests/unit/lib/cache-metrics.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("CacheMetrics", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.resetModules();
    });

    describe("recordCacheHit", () => {
        it("should increment hit count", async () => {
            const { recordCacheHit, getCacheMetrics, resetCacheMetrics } =
                await import("@/lib/cache/metrics");

            resetCacheMetrics();
            recordCacheHit();
            recordCacheHit();

            const metrics = getCacheMetrics();
            expect(metrics.hits).toBe(2);
            expect(metrics.misses).toBe(0);
        });

        it("should track per-operation hits", async () => {
            const { recordCacheHit, getCacheMetrics, resetCacheMetrics } =
                await import("@/lib/cache/metrics");

            resetCacheMetrics();
            recordCacheHit("getChatFromCache");
            recordCacheHit("getChatFromCache");
            recordCacheHit("getMessagesFromCache");

            const metrics = getCacheMetrics();
            expect(metrics.operations.getChatFromCache.hits).toBe(2);
            expect(metrics.operations.getMessagesFromCache.hits).toBe(1);
        });
    });

    describe("recordCacheMiss", () => {
        it("should increment miss count", async () => {
            const { recordCacheMiss, getCacheMetrics, resetCacheMetrics } =
                await import("@/lib/cache/metrics");

            resetCacheMetrics();
            recordCacheMiss();
            recordCacheMiss();
            recordCacheMiss();

            const metrics = getCacheMetrics();
            expect(metrics.hits).toBe(0);
            expect(metrics.misses).toBe(3);
        });

        it("should track per-operation misses", async () => {
            const { recordCacheMiss, getCacheMetrics, resetCacheMetrics } =
                await import("@/lib/cache/metrics");

            resetCacheMetrics();
            recordCacheMiss("getChatFromCache");
            recordCacheMiss("getDocumentFromCache");
            recordCacheMiss("getDocumentFromCache");

            const metrics = getCacheMetrics();
            expect(metrics.operations.getChatFromCache.misses).toBe(1);
            expect(metrics.operations.getDocumentFromCache.misses).toBe(2);
        });
    });

    describe("getCacheMetrics", () => {
        it("should return snapshot with calculated hitRate", async () => {
            const {
                recordCacheHit,
                recordCacheMiss,
                getCacheMetrics,
                resetCacheMetrics,
            } = await import("@/lib/cache/metrics");

            resetCacheMetrics();
            recordCacheHit();
            recordCacheHit();
            recordCacheHit();
            recordCacheMiss();

            const metrics = getCacheMetrics();
            expect(metrics.hits).toBe(3);
            expect(metrics.misses).toBe(1);
            expect(metrics.hitRate).toBe(75); // 3/4 * 100 = 75%
            expect(metrics.timestamp).toBeGreaterThan(0);
        });

        it("should return 0 hitRate when no data", async () => {
            const { getCacheMetrics, resetCacheMetrics } = await import(
                "@/lib/cache/metrics"
            );

            resetCacheMetrics();
            const metrics = getCacheMetrics();

            expect(metrics.hitRate).toBe(0);
        });

        it("should include timestamp in snapshot", async () => {
            const { getCacheMetrics, resetCacheMetrics } = await import(
                "@/lib/cache/metrics"
            );

            resetCacheMetrics();
            const before = Date.now();
            const metrics = getCacheMetrics();
            const after = Date.now();

            expect(metrics.timestamp).toBeGreaterThanOrEqual(before);
            expect(metrics.timestamp).toBeLessThanOrEqual(after);
        });
    });

    describe("resetCacheMetrics", () => {
        it("should reset all counters to zero", async () => {
            const {
                recordCacheHit,
                recordCacheMiss,
                getCacheMetrics,
                resetCacheMetrics,
            } = await import("@/lib/cache/metrics");

            recordCacheHit();
            recordCacheHit();
            recordCacheMiss();

            resetCacheMetrics();

            const metrics = getCacheMetrics();
            expect(metrics.hits).toBe(0);
            expect(metrics.misses).toBe(0);
            expect(metrics.hitRate).toBe(0);
        });

        it("should clear per-operation metrics", async () => {
            const {
                recordCacheHit,
                recordCacheMiss,
                getCacheMetrics,
                resetCacheMetrics,
            } = await import("@/lib/cache/metrics");

            recordCacheHit("op1");
            recordCacheMiss("op2");

            resetCacheMetrics();

            const metrics = getCacheMetrics();
            expect(Object.keys(metrics.operations)).toHaveLength(0);
        });
    });

    describe("getOperationHitRate", () => {
        it("should return hit rate for specific operation", async () => {
            const {
                recordCacheHit,
                recordCacheMiss,
                getOperationHitRate,
                resetCacheMetrics,
            } = await import("@/lib/cache/metrics");

            resetCacheMetrics();
            recordCacheHit("getChat");
            recordCacheHit("getChat");
            recordCacheMiss("getChat");
            recordCacheMiss("getChat");

            const hitRate = getOperationHitRate("getChat");
            expect(hitRate).toBe(50); // 2/4 * 100 = 50%
        });

        it("should return 0 for unknown operation", async () => {
            const { getOperationHitRate, resetCacheMetrics } = await import(
                "@/lib/cache/metrics"
            );

            resetCacheMetrics();
            const hitRate = getOperationHitRate("nonexistent");
            expect(hitRate).toBe(0);
        });

        it("should return 100 for operation with only hits", async () => {
            const { recordCacheHit, getOperationHitRate, resetCacheMetrics } =
                await import("@/lib/cache/metrics");

            resetCacheMetrics();
            recordCacheHit("perfectOp");
            recordCacheHit("perfectOp");

            const hitRate = getOperationHitRate("perfectOp");
            expect(hitRate).toBe(100);
        });

        it("should return 0 for operation with only misses", async () => {
            const { recordCacheMiss, getOperationHitRate, resetCacheMetrics } =
                await import("@/lib/cache/metrics");

            resetCacheMetrics();
            recordCacheMiss("badOp");
            recordCacheMiss("badOp");

            const hitRate = getOperationHitRate("badOp");
            expect(hitRate).toBe(0);
        });
    });

    describe("concurrent tracking", () => {
        it("should correctly aggregate mixed hits and misses", async () => {
            const {
                recordCacheHit,
                recordCacheMiss,
                getCacheMetrics,
                resetCacheMetrics,
            } = await import("@/lib/cache/metrics");

            resetCacheMetrics();

            // Simulate multiple operations
            recordCacheHit("chat");
            recordCacheMiss("chat");
            recordCacheHit("document");
            recordCacheHit("document");
            recordCacheMiss("messages");

            const metrics = getCacheMetrics();

            // Total
            expect(metrics.hits).toBe(3);
            expect(metrics.misses).toBe(2);
            expect(metrics.hitRate).toBe(60); // 3/5 * 100 = 60%

            // Per-operation
            expect(metrics.operations.chat.hits).toBe(1);
            expect(metrics.operations.chat.misses).toBe(1);
            expect(metrics.operations.document.hits).toBe(2);
            expect(metrics.operations.document.misses).toBe(0);
            expect(metrics.operations.messages.hits).toBe(0);
            expect(metrics.operations.messages.misses).toBe(1);
        });
    });

    describe("edge cases", () => {
        it("should handle operations without name (global tracking only)", async () => {
            const {
                recordCacheHit,
                recordCacheMiss,
                getCacheMetrics,
                resetCacheMetrics,
            } = await import("@/lib/cache/metrics");

            resetCacheMetrics();
            recordCacheHit(); // no operation name
            recordCacheMiss(); // no operation name

            const metrics = getCacheMetrics();
            expect(metrics.hits).toBe(1);
            expect(metrics.misses).toBe(1);
            expect(Object.keys(metrics.operations)).toHaveLength(0);
        });

        it("should handle very high numbers", async () => {
            const {
                recordCacheHit,
                recordCacheMiss,
                getCacheMetrics,
                resetCacheMetrics,
            } = await import("@/lib/cache/metrics");

            resetCacheMetrics();

            // Simulate many operations
            for (let i = 0; i < 1000; i++) {
                if (i % 4 === 0) {
                    recordCacheMiss();
                } else {
                    recordCacheHit();
                }
            }

            const metrics = getCacheMetrics();
            expect(metrics.hits).toBe(750);
            expect(metrics.misses).toBe(250);
            expect(metrics.hitRate).toBe(75);
        });
    });
});
