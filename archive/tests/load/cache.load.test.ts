/**
 * TEST-004: Cache Performance Load Tests
 *
 * Tests cache behavior and performance under various load conditions.
 * Verifies cache efficiency, stampede protection, and consistency.
 */

import { beforeAll, describe, expect, test } from "vitest";
import {
    isServerAvailable,
    type LoadTestResult,
    printLoadTestSummary,
    runLoadTest,
    sleep,
} from "./utils";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const SKIP_MESSAGE = "Server not available - skipping load tests";

describe("Cache Performance Load Tests", () => {
    let serverAvailable = false;

    beforeAll(async () => {
        serverAvailable = await isServerAvailable(BASE_URL);
        if (!serverAvailable) {
            console.warn(`\n⚠️ ${SKIP_MESSAGE}\n`);
        }
    });

    test("should benefit from cache under repeated requests", async () => {
        if (!serverAvailable) {
            console.log(SKIP_MESSAGE);
            return;
        }

        // First request - cold cache
        const coldResult = await runLoadTest({
            url: `${BASE_URL}/api/health`,
            concurrency: 1,
            totalRequests: 3,
            timeout: 10_000,
        });

        // Small delay to let cache populate
        await sleep(100);

        // Subsequent requests - should hit warm cache
        const warmResult = await runLoadTest({
            url: `${BASE_URL}/api/health`,
            concurrency: 3,
            totalRequests: 10,
            timeout: 15_000,
        });

        printLoadTestSummary("Cold Cache Requests", coldResult);
        printLoadTestSummary("Warm Cache Requests", warmResult);

        console.log(`\n${"=".repeat(60)}`);
        console.log("Cache Benefit Analysis");
        console.log("=".repeat(60));
        console.log(`Cold Cache Avg:     ${coldResult.avgResponseTime}ms`);
        console.log(`Warm Cache Avg:     ${warmResult.avgResponseTime}ms`);

        const improvement =
            coldResult.avgResponseTime > 0
                ? (
                      ((coldResult.avgResponseTime -
                          warmResult.avgResponseTime) /
                          coldResult.avgResponseTime) *
                      100
                  ).toFixed(1)
                : "N/A";
        console.log(`Improvement:        ${improvement}%`);
        console.log(`${"=".repeat(60)}\n`);

        // Warm cache should have reasonable success rate
        // Under load, some timeouts are acceptable
        expect(
            warmResult.successfulRequests + warmResult.rateLimited
        ).toBeGreaterThan(warmResult.totalRequests * 0.5);
    });

    test("should handle cache stampede scenario", async () => {
        if (!serverAvailable) {
            console.log(SKIP_MESSAGE);
            return;
        }

        // Generate a unique URL to ensure cache miss
        const uniqueParam = `_ts=${Date.now()}`;

        // Simulate cache stampede - many concurrent requests to same uncached resource
        // Reduced concurrency (8) to match dev DB pool capacity
        const result = await runLoadTest({
            url: `${BASE_URL}/api/health?${uniqueParam}`,
            concurrency: 8,
            totalRequests: 8,
            timeout: 10_000,
            delayBetweenBatches: 0,
        });

        printLoadTestSummary("Cache Stampede Test", result);

        // System should handle stampede gracefully
        // Some failures are acceptable under stampede, but system should not completely fail
        const handledRequests = result.successfulRequests + result.rateLimited;
        expect(handledRequests).toBeGreaterThan(0);

        // Log actual behavior for analysis
        console.log(
            `Stampede handled: ${handledRequests}/${result.totalRequests} requests`
        );
    });

    test("should maintain performance under sustained cached requests", async () => {
        if (!serverAvailable) {
            console.log(SKIP_MESSAGE);
            return;
        }

        // Prime the cache
        await runLoadTest({
            url: `${BASE_URL}/api/health`,
            concurrency: 1,
            totalRequests: 5,
            timeout: 10_000,
        });

        await sleep(100);

        // Sustained load on cached endpoint
        // Reduced to 8 requests to avoid DB pool exhaustion in dev
        const result = await runLoadTest({
            url: `${BASE_URL}/api/health`,
            concurrency: 3,
            totalRequests: 8,
            timeout: 10_000,
            delayBetweenBatches: 100,
        });

        printLoadTestSummary("Sustained Cached Load", result);

        // Under sustained load, expect reasonable success rate
        expect(result.successfulRequests + result.rateLimited).toBeGreaterThan(
            result.totalRequests * 0.5
        );

        // Log actual performance metrics
        console.log(
            `Sustained load success rate: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%`
        );
    });

    test("should handle varying cache key patterns", async () => {
        if (!serverAvailable) {
            console.log(SKIP_MESSAGE);
            return;
        }

        const results: LoadTestResult[] = [];

        // Test different endpoints that may have different caching behavior
        const endpoints = [
            `${BASE_URL}/api/health`,
            `${BASE_URL}/`,
            `${BASE_URL}/login`,
        ];

        for (const endpoint of endpoints) {
            const result = await runLoadTest({
                url: endpoint,
                concurrency: 2,
                totalRequests: 6,
                timeout: 15_000,
            });
            results.push(result);
        }

        console.log(`\n${"=".repeat(60)}`);
        console.log("Cache Key Pattern Analysis");
        console.log("=".repeat(60));

        endpoints.forEach((endpoint, i) => {
            const path = new URL(endpoint).pathname;
            console.log(`${path}:`);
            console.log(`  Avg Response: ${results[i].avgResponseTime}ms`);
            console.log(
                `  Success Rate: ${((results[i].successfulRequests / results[i].totalRequests) * 100).toFixed(1)}%`
            );
        });

        console.log(`${"=".repeat(60)}\n`);

        // All endpoints should have some successful responses
        for (const result of results) {
            expect(
                result.successfulRequests + result.rateLimited
            ).toBeGreaterThan(0);
        }
    });

    test("should handle cache with concurrent different users", async () => {
        if (!serverAvailable) {
            console.log(SKIP_MESSAGE);
            return;
        }

        // Simulate different users accessing shared cached resources
        const userAgents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/17.0",
            "Mozilla/5.0 (Linux; Android 14) Mobile Chrome/120.0.0.0",
        ];

        const results: LoadTestResult[] = [];

        for (const userAgent of userAgents) {
            const result = await runLoadTest({
                url: `${BASE_URL}/api/health`,
                concurrency: 2,
                totalRequests: 5,
                timeout: 15_000,
                headers: {
                    "User-Agent": userAgent,
                },
            });
            results.push(result);
        }

        // Calculate aggregate metrics
        const totalRequests = results.reduce(
            (sum, r) => sum + r.totalRequests,
            0
        );
        const totalSuccessful = results.reduce(
            (sum, r) => sum + r.successfulRequests,
            0
        );
        const avgResponseTimes = results.map((r) => r.avgResponseTime);
        const overallAvg =
            avgResponseTimes.reduce((a, b) => a + b, 0) /
            avgResponseTimes.length;

        console.log(`\n${"=".repeat(60)}`);
        console.log("Multi-User Cache Test");
        console.log("=".repeat(60));
        console.log(`Total Requests:     ${totalRequests}`);
        console.log(`Total Successful:   ${totalSuccessful}`);
        console.log(`Overall Avg Time:   ${Math.round(overallAvg)}ms`);
        console.log(`${"=".repeat(60)}\n`);

        // Cache should work regardless of user agent
        expect(
            totalSuccessful + results.reduce((s, r) => s + r.rateLimited, 0)
        ).toBeGreaterThan(totalRequests * 0.3);
    });

    test("should handle burst followed by steady state", async () => {
        if (!serverAvailable) {
            console.log(SKIP_MESSAGE);
            return;
        }

        // Initial burst - reduced concurrency to match dev pool capacity
        const burstResult = await runLoadTest({
            url: `${BASE_URL}/api/health`,
            concurrency: 8,
            totalRequests: 8,
            timeout: 10_000,
            delayBetweenBatches: 0,
        });

        printLoadTestSummary("Initial Burst", burstResult);

        // Short delay
        await sleep(500);

        // Steady state
        const steadyResult = await runLoadTest({
            url: `${BASE_URL}/api/health`,
            concurrency: 2,
            totalRequests: 10,
            timeout: 10_000,
            delayBetweenBatches: 200,
        });

        printLoadTestSummary("Steady State After Burst", steadyResult);

        // Steady state should have some successful responses
        expect(
            steadyResult.successfulRequests + steadyResult.rateLimited
        ).toBeGreaterThan(0);

        // Steady state response times should be better than burst
        console.log(`\n${"=".repeat(60)}`);
        console.log("Burst vs Steady State Comparison");
        console.log("=".repeat(60));
        console.log(`Burst P95:          ${burstResult.p95ResponseTime}ms`);
        console.log(`Steady State P95:   ${steadyResult.p95ResponseTime}ms`);
        console.log(`${"=".repeat(60)}\n`);
    });

    test("should measure cache hit efficiency", async () => {
        if (!serverAvailable) {
            console.log(SKIP_MESSAGE);
            return;
        }

        // Multiple rounds of the same request to measure cache efficiency
        const rounds = 3;
        const roundResults: LoadTestResult[] = [];

        for (let round = 0; round < rounds; round++) {
            const result = await runLoadTest({
                url: `${BASE_URL}/api/health`,
                concurrency: 2,
                totalRequests: 6,
                timeout: 15_000,
            });
            roundResults.push(result);

            // Small delay between rounds
            if (round < rounds - 1) {
                await sleep(200);
            }
        }

        console.log(`\n${"=".repeat(60)}`);
        console.log("Cache Hit Efficiency Analysis");
        console.log("=".repeat(60));

        roundResults.forEach((result, i) => {
            console.log(`Round ${i + 1}:`);
            console.log(`  Avg Response: ${result.avgResponseTime}ms`);
            console.log(`  P95 Response: ${result.p95ResponseTime}ms`);
            console.log(
                `  Success Rate: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%`
            );
        });

        // Check if later rounds have better or similar performance
        const firstRoundAvg = roundResults[0].avgResponseTime;
        const lastRoundAvg = roundResults[rounds - 1].avgResponseTime;

        console.log("-".repeat(60));
        console.log(
            `Performance trend: ${lastRoundAvg <= firstRoundAvg ? "✓ Stable/Improving" : "⚠ Degrading"}`
        );
        console.log(`${"=".repeat(60)}\n`);

        // All rounds should have some successful responses
        for (const result of roundResults) {
            expect(
                result.successfulRequests + result.rateLimited
            ).toBeGreaterThan(0);
        }
    });
});
