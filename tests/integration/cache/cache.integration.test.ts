/**
 * Cache Integration Tests
 * Tests Redis operations with real Upstash instance
 *
 * Run with: TEST_USE_REAL_CACHE=true pnpm test:integration
 *
 * @module tests/integration/cache/cache.integration.test
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { describeIf, isServiceAvailable } from "../../config/test-config";

// Test key prefix to avoid polluting production data
const TEST_PREFIX = "test:integration";

// Only run these tests when real cache is available (flag + credentials)
describeIf(isServiceAvailable("cache"), "Cache Integration Tests", () => {
    // Import real modules (not mocked)
    let redis: Awaited<ReturnType<typeof import("@/lib/cache").getRedis>>;
    let testKeys: string[] = [];

    beforeAll(async () => {
        const { getRedis } = await import("@/lib/cache");
        redis = getRedis();
    });

    beforeEach(() => {
        // Track keys created in each test for cleanup
        testKeys = [];
    });

    afterAll(async () => {
        // Clean up any remaining test keys
        if (redis && testKeys.length > 0) {
            await Promise.all(testKeys.map((key) => redis.del(key)));
        }
    });

    /**
     * Helper to create a unique test key and track it for cleanup
     */
    function createTestKey(suffix: string): string {
        const key = `${TEST_PREFIX}:${suffix}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
        testKeys.push(key);
        return key;
    }

    describe("Connection", () => {
        it("can connect and ping", async () => {
            const result = await redis.ping();
            expect(result).toBe("PONG");
        });

        it("redis client is defined", () => {
            expect(redis).toBeDefined();
            expect(typeof redis.get).toBe("function");
            expect(typeof redis.set).toBe("function");
            expect(typeof redis.del).toBe("function");
        });
    });

    describe("String operations", () => {
        it("can set and get a value", async () => {
            const key = createTestKey("string");
            await redis.set(key, "hello");

            const value = await redis.get(key);
            expect(value).toBe("hello");

            // Cleanup
            await redis.del(key);
        });

        it("returns null for non-existent key", async () => {
            const key = `${TEST_PREFIX}:nonexistent:${Date.now()}`;
            const value = await redis.get(key);
            expect(value).toBeNull();
        });

        it("can set with TTL and value expires", async () => {
            const key = createTestKey("ttl");
            await redis.set(key, "expires", { ex: 1 }); // 1 second TTL

            const before = await redis.get(key);
            expect(before).toBe("expires");

            // Wait for expiration
            await new Promise((r) => setTimeout(r, 1500));

            const after = await redis.get(key);
            expect(after).toBeNull();
        });

        it("can overwrite existing value", async () => {
            const key = createTestKey("overwrite");
            await redis.set(key, "first");
            await redis.set(key, "second");

            const value = await redis.get(key);
            expect(value).toBe("second");

            await redis.del(key);
        });

        it("can delete a key", async () => {
            const key = createTestKey("delete");
            await redis.set(key, "to-delete");

            const beforeDelete = await redis.get(key);
            expect(beforeDelete).toBe("to-delete");

            await redis.del(key);

            const afterDelete = await redis.get(key);
            expect(afterDelete).toBeNull();
        });
    });

    describe("JSON serialization", () => {
        it("can store and retrieve simple objects", async () => {
            const key = createTestKey("json-simple");
            const obj = {
                id: "chat-123",
                title: "Test Chat",
                active: true,
                count: 42,
            };

            // Upstash auto-serializes objects, so don't JSON.stringify
            await redis.set(key, obj);
            const result = await redis.get(key);

            // Upstash auto-deserializes, so result is already an object
            expect(result).toEqual(obj);
            await redis.del(key);
        });

        it("can store and retrieve complex nested objects", async () => {
            const key = createTestKey("json-complex");
            const obj = {
                id: "chat-456",
                title: "Complex Test Chat",
                createdAt: new Date().toISOString(),
                messages: [
                    { role: "user", content: "Hello" },
                    { role: "assistant", content: "Hi there!" },
                ],
                metadata: {
                    model: "gpt-4",
                    tokens: { input: 10, output: 20 },
                },
            };

            // Upstash auto-serializes objects, so don't JSON.stringify
            await redis.set(key, obj);
            const result = await redis.get<typeof obj>(key);

            // Upstash auto-deserializes, so result is already an object
            expect(result).toEqual(obj);
            expect(result?.messages).toHaveLength(2);
            expect(result?.metadata.tokens.input).toBe(10);
            await redis.del(key);
        });

        it("can store arrays", async () => {
            const key = createTestKey("json-array");
            const arr = ["item1", "item2", "item3"];

            // Upstash auto-serializes arrays, so don't JSON.stringify
            await redis.set(key, arr);
            const result = await redis.get<string[]>(key);

            // Upstash auto-deserializes, so result is already an array
            expect(result).toEqual(arr);
            expect(result).toHaveLength(3);
            await redis.del(key);
        });
    });

    describe("ZSET operations", () => {
        it("can add and retrieve sorted set members", async () => {
            const key = createTestKey("zset");

            // Add with scores (like timestamps)
            await redis.zadd(key, { score: 100, member: "msg1" });
            await redis.zadd(key, { score: 200, member: "msg2" });
            await redis.zadd(key, { score: 150, member: "msg3" });

            // Get all sorted by score (ascending)
            const members = await redis.zrange(key, 0, -1);
            expect(members).toEqual(["msg1", "msg3", "msg2"]);

            await redis.del(key);
        });

        it("can get members with scores", async () => {
            const key = createTestKey("zset-scores");

            await redis.zadd(key, { score: 1000, member: "chat-a" });
            await redis.zadd(key, { score: 2000, member: "chat-b" });

            // Get with WITHSCORES option
            const membersWithScores = await redis.zrange(key, 0, -1, {
                withScores: true,
            });

            expect(membersWithScores).toContain("chat-a");
            expect(membersWithScores).toContain("chat-b");

            await redis.del(key);
        });

        it("can get members in reverse order", async () => {
            const key = createTestKey("zset-rev");

            await redis.zadd(key, { score: 1, member: "first" });
            await redis.zadd(key, { score: 2, member: "second" });
            await redis.zadd(key, { score: 3, member: "third" });

            // Get in reverse order (highest score first)
            const members = await redis.zrange(key, 0, -1, { rev: true });
            expect(members).toEqual(["third", "second", "first"]);

            await redis.del(key);
        });

        it("can remove members from sorted set", async () => {
            const key = createTestKey("zset-rem");

            await redis.zadd(key, { score: 1, member: "keep" });
            await redis.zadd(key, { score: 2, member: "remove" });

            await redis.zrem(key, "remove");

            const members = await redis.zrange(key, 0, -1);
            expect(members).toEqual(["keep"]);
            expect(members).not.toContain("remove");

            await redis.del(key);
        });

        it("can get count of members", async () => {
            const key = createTestKey("zset-count");

            await redis.zadd(key, { score: 1, member: "a" });
            await redis.zadd(key, { score: 2, member: "b" });
            await redis.zadd(key, { score: 3, member: "c" });

            const count = await redis.zcard(key);
            expect(count).toBe(3);

            await redis.del(key);
        });
    });

    describe("Multiple key operations", () => {
        it("can delete multiple keys at once", async () => {
            const key1 = createTestKey("multi-1");
            const key2 = createTestKey("multi-2");
            const key3 = createTestKey("multi-3");

            await redis.set(key1, "value1");
            await redis.set(key2, "value2");
            await redis.set(key3, "value3");

            // Delete all at once
            await redis.del(key1, key2, key3);

            const val1 = await redis.get(key1);
            const val2 = await redis.get(key2);
            const val3 = await redis.get(key3);

            expect(val1).toBeNull();
            expect(val2).toBeNull();
            expect(val3).toBeNull();
        });
    });
});
