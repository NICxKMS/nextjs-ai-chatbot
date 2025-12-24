/**
 * OPT-035: Response Cache Unit Tests
 *
 * Tests for the client-side response cache with TTL and LRU eviction.
 *
 * @module tests/unit/lib/response-cache.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResponseCache } from "@/lib/api/response-cache";

describe("ResponseCache", () => {
    let cache: ResponseCache;

    beforeEach(() => {
        vi.useFakeTimers();
        cache = new ResponseCache({ maxSize: 10, defaultTtl: 60_000 });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("set and get", () => {
        it("should store and retrieve data", () => {
            cache.set("/api/users", { users: [1, 2, 3] });
            const result = cache.get<{ users: number[] }>("/api/users");
            expect(result).toEqual({ users: [1, 2, 3] });
        });

        it("should return null for missing keys", () => {
            const result = cache.get("/api/unknown");
            expect(result).toBeNull();
        });

        it("should overwrite existing entries", () => {
            cache.set("/api/users", { v: 1 });
            cache.set("/api/users", { v: 2 });
            expect(cache.get("/api/users")).toEqual({ v: 2 });
        });
    });

    describe("TTL expiration", () => {
        it("should return null for expired entries", () => {
            cache.set("/api/data", "value", { ttl: 1000 });

            // Move time forward
            vi.advanceTimersByTime(1001);

            expect(cache.get("/api/data")).toBeNull();
        });

        it("should return data before TTL expires", () => {
            cache.set("/api/data", "value", { ttl: 5000 });

            vi.advanceTimersByTime(4000);

            expect(cache.get("/api/data")).toBe("value");
        });

        it("should use default TTL when not specified", () => {
            const customCache = new ResponseCache({ defaultTtl: 30_000 });
            customCache.set("/api/data", "value");

            vi.advanceTimersByTime(29_000);
            expect(customCache.get("/api/data")).toBe("value");

            vi.advanceTimersByTime(2000);
            expect(customCache.get("/api/data")).toBeNull();
        });
    });

    describe("LRU eviction", () => {
        it("should evict least recently used when maxSize exceeded", () => {
            const smallCache = new ResponseCache({ maxSize: 3 });

            smallCache.set("/api/1", "one");
            smallCache.set("/api/2", "two");
            smallCache.set("/api/3", "three");

            // Access /api/1 to make it recently used
            smallCache.get("/api/1");

            // Add new entry, should evict /api/2
            smallCache.set("/api/4", "four");

            expect(smallCache.get("/api/1")).toBe("one");
            expect(smallCache.get("/api/2")).toBeNull(); // evicted
            expect(smallCache.get("/api/3")).toBe("three");
            expect(smallCache.get("/api/4")).toBe("four");
        });

        it("should update access order on get", () => {
            const smallCache = new ResponseCache({ maxSize: 2 });

            smallCache.set("/api/1", "one");
            smallCache.set("/api/2", "two");

            // Access /api/1
            smallCache.get("/api/1");

            // Add /api/3, should evict /api/2
            smallCache.set("/api/3", "three");

            expect(smallCache.get("/api/1")).toBe("one");
            expect(smallCache.get("/api/2")).toBeNull();
        });
    });

    describe("invalidation", () => {
        it("should invalidate by exact key using delete", () => {
            cache.set("/api/users", "users");
            cache.set("/api/chats", "chats");

            cache.delete("/api/users");

            expect(cache.get("/api/users")).toBeNull();
            expect(cache.get("/api/chats")).toBe("chats");
        });

        it("should invalidate by pattern", () => {
            cache.set("/api/users/1", "user1");
            cache.set("/api/users/2", "user2");
            cache.set("/api/chats/1", "chat1");

            cache.invalidate(/^\/api\/users/);

            expect(cache.get("/api/users/1")).toBeNull();
            expect(cache.get("/api/users/2")).toBeNull();
            expect(cache.get("/api/chats/1")).toBe("chat1");
        });

        it("should invalidate by tag", () => {
            cache.set("/api/users/1", "user1", { tags: ["users", "data"] });
            cache.set("/api/users/2", "user2", { tags: ["users"] });
            cache.set("/api/chats", "chats", { tags: ["chats"] });

            cache.invalidateByTag("users");

            expect(cache.get("/api/users/1")).toBeNull();
            expect(cache.get("/api/users/2")).toBeNull();
            expect(cache.get("/api/chats")).toBe("chats");
        });

        it("should clear all entries", () => {
            cache.set("/api/1", "one");
            cache.set("/api/2", "two");

            cache.clear();

            expect(cache.get("/api/1")).toBeNull();
            expect(cache.get("/api/2")).toBeNull();
        });
    });

    describe("getEntry", () => {
        it("should return entry with metadata", () => {
            cache.set("/api/data", "value", { ttl: 5000, etag: '"abc123"' });

            const entry = cache.getEntry("/api/data");

            expect(entry).not.toBeNull();
            expect(entry?.data).toBe("value");
            expect(entry?.etag).toBe('"abc123"');
            expect(entry?.ttl).toBe(5000);
            expect(entry?.timestamp).toBeDefined();
        });

        it("should return null for expired entries", () => {
            cache.set("/api/data", "value", { ttl: 1000 });
            vi.advanceTimersByTime(1500);

            expect(cache.getEntry("/api/data")).toBeNull();
        });
    });

    describe("getStats", () => {
        it("should track hits and misses", () => {
            cache.set("/api/data", "value");

            cache.get("/api/data"); // hit
            cache.get("/api/data"); // hit
            cache.get("/api/missing"); // miss

            const stats = cache.getStats();
            expect(stats.hits).toBe(2);
            expect(stats.misses).toBe(1);
            expect(stats.hitRate).toBeCloseTo(2 / 3);
        });

        it("should report cache size", () => {
            cache.set("/api/1", "one");
            cache.set("/api/2", "two");

            const stats = cache.getStats();
            expect(stats.size).toBe(2);
        });

        it("should handle zero requests for hit rate", () => {
            const stats = cache.getStats();
            expect(stats.hitRate).toBe(0);
        });
    });

    describe("has", () => {
        it("should return true for existing non-expired entries", () => {
            cache.set("/api/data", "value");
            expect(cache.has("/api/data")).toBe(true);
        });

        it("should return false for missing entries", () => {
            expect(cache.has("/api/missing")).toBe(false);
        });

        it("should return false for expired entries", () => {
            cache.set("/api/data", "value", { ttl: 1000 });
            vi.advanceTimersByTime(1500);
            expect(cache.has("/api/data")).toBe(false);
        });
    });

    describe("onEvict callback", () => {
        it("should call onEvict when entry is evicted", () => {
            const onEvict = vi.fn();
            const customCache = new ResponseCache({ maxSize: 2, onEvict });

            customCache.set("/api/1", "one");
            customCache.set("/api/2", "two");
            customCache.set("/api/3", "three"); // triggers eviction

            expect(onEvict).toHaveBeenCalledWith(
                "/api/1",
                expect.objectContaining({ data: "one" })
            );
        });
    });
});
