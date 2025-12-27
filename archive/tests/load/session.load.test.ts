/**
 * TEST-004: Session Handling Load Tests
 *
 * Tests session creation and management under concurrent load.
 * Verifies session consistency and stability with many simultaneous users.
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

interface SessionInfo {
    valid: boolean;
    sessionId?: string;
    error?: string;
    responseTime: number;
}

/**
 * Create a session and verify it's valid
 */
async function createAndVerifySession(): Promise<SessionInfo> {
    const startTime = performance.now();

    try {
        // Create guest session
        const response = await fetch(`${BASE_URL}/api/auth/guest`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (!response.ok && response.status !== 429) {
            return {
                valid: false,
                error: `HTTP ${response.status}`,
                responseTime,
            };
        }

        if (response.status === 429) {
            return {
                valid: false,
                error: "Rate limited",
                responseTime,
            };
        }

        // Extract session info from response
        const data = await response.json();
        const sessionId = data.sessionId || data.user?.id;

        return {
            valid: !!sessionId,
            sessionId,
            responseTime,
        };
    } catch (error) {
        const endTime = performance.now();
        return {
            valid: false,
            error: error instanceof Error ? error.message : "Unknown error",
            responseTime: endTime - startTime,
        };
    }
}

describe("Session Handling Load Tests", () => {
    let serverAvailable = false;

    beforeAll(async () => {
        serverAvailable = await isServerAvailable(BASE_URL);
        if (!serverAvailable) {
            console.warn(`\n⚠️ ${SKIP_MESSAGE}\n`);
        }
    });

    test("should handle concurrent page loads", async () => {
        if (!serverAvailable) {
            console.log(SKIP_MESSAGE);
            return;
        }

        const result = await runLoadTest({
            url: `${BASE_URL}/`,
            concurrency: 20,
            totalRequests: 50,
            timeout: 15_000,
        });

        printLoadTestSummary("Concurrent Page Loads", result);

        // Most page loads should succeed
        expect(result.successfulRequests).toBeGreaterThan(
            result.totalRequests * 0.8
        );

        // Response times should be reasonable for page loads
        expect(result.p95ResponseTime).toBeLessThan(5000);
    });

    test("should handle concurrent session creations", async () => {
        if (!serverAvailable) {
            console.log(SKIP_MESSAGE);
            return;
        }

        // Create multiple sessions concurrently
        const concurrency = 15;
        const promises: Promise<SessionInfo>[] = [];

        for (let i = 0; i < concurrency; i++) {
            promises.push(createAndVerifySession());
        }

        const sessions = await Promise.all(promises);

        // Calculate metrics
        const validSessions = sessions.filter((s) => s.valid);
        const rateLimited = sessions.filter((s) => s.error === "Rate limited");
        const errors = sessions.filter(
            (s) => !s.valid && s.error !== "Rate limited"
        );
        const responseTimes = sessions.map((s) => s.responseTime);
        const avgResponseTime =
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

        console.log(`\n${"=".repeat(60)}`);
        console.log("Concurrent Session Creation Test");
        console.log("=".repeat(60));
        console.log(`Total Attempts:     ${sessions.length}`);
        console.log(`Valid Sessions:     ${validSessions.length}`);
        console.log(`Rate Limited:       ${rateLimited.length}`);
        console.log(`Errors:             ${errors.length}`);
        console.log(`Avg Response Time:  ${Math.round(avgResponseTime)}ms`);
        console.log(`${"=".repeat(60)}\n`);

        // At least some sessions should be created successfully
        // (rate limiting may block some)
        expect(validSessions.length + rateLimited.length).toBeGreaterThan(0);

        // No catastrophic failures
        expect(errors.length).toBeLessThan(concurrency * 0.5);
    });

    test("should maintain session consistency under load", async () => {
        if (!serverAvailable) {
            console.log(SKIP_MESSAGE);
            return;
        }

        // Create sessions with staggered timing to avoid rate limits
        const sessionCount = 10;
        const sessions: SessionInfo[] = [];

        for (let i = 0; i < sessionCount; i++) {
            const session = await createAndVerifySession();
            sessions.push(session);

            // Small delay between session creations
            if (i < sessionCount - 1) {
                await sleep(100);
            }
        }

        // Calculate results
        const validSessions = sessions.filter((s) => s.valid);
        const uniqueSessionIds = new Set(
            validSessions.map((s) => s.sessionId).filter(Boolean)
        );

        console.log(`\n${"=".repeat(60)}`);
        console.log("Session Consistency Test");
        console.log("=".repeat(60));
        console.log(`Sessions Created:   ${validSessions.length}`);
        console.log(`Unique Session IDs: ${uniqueSessionIds.size}`);
        console.log(`${"=".repeat(60)}\n`);

        // All valid sessions should have unique IDs
        expect(uniqueSessionIds.size).toBe(validSessions.length);
    });

    test("should handle login page under concurrent access", async () => {
        if (!serverAvailable) {
            console.log(SKIP_MESSAGE);
            return;
        }

        const result = await runLoadTest({
            url: `${BASE_URL}/login`,
            concurrency: 15,
            totalRequests: 30,
            timeout: 10_000,
        });

        printLoadTestSummary("Login Page Load Test", result);

        // Login page should be accessible
        expect(result.successfulRequests).toBeGreaterThan(
            result.totalRequests * 0.7
        );
    });

    test("should handle register page under concurrent access", async () => {
        if (!serverAvailable) {
            console.log(SKIP_MESSAGE);
            return;
        }

        const result = await runLoadTest({
            url: `${BASE_URL}/register`,
            concurrency: 15,
            totalRequests: 30,
            timeout: 10_000,
        });

        printLoadTestSummary("Register Page Load Test", result);

        // Register page should be accessible
        expect(result.successfulRequests).toBeGreaterThan(
            result.totalRequests * 0.7
        );
    });

    test("should handle mixed authenticated and unauthenticated traffic", async () => {
        if (!serverAvailable) {
            console.log(SKIP_MESSAGE);
            return;
        }

        // Simulate mixed traffic pattern
        const endpoints = [
            { url: `${BASE_URL}/`, weight: 3 },
            { url: `${BASE_URL}/login`, weight: 2 },
            { url: `${BASE_URL}/api/health`, weight: 2 },
        ];

        const results: LoadTestResult[] = [];

        // Run load tests on each endpoint
        for (const endpoint of endpoints) {
            const result = await runLoadTest({
                url: endpoint.url,
                concurrency: 5,
                totalRequests: 10 * endpoint.weight,
                timeout: 10_000,
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
        const totalRateLimited = results.reduce(
            (sum, r) => sum + r.rateLimited,
            0
        );

        console.log(`\n${"=".repeat(60)}`);
        console.log("Mixed Traffic Test Summary");
        console.log("=".repeat(60));
        console.log(`Total Requests:     ${totalRequests}`);
        console.log(`Successful:         ${totalSuccessful}`);
        console.log(`Rate Limited:       ${totalRateLimited}`);
        console.log(
            `Success Rate:       ${((totalSuccessful / totalRequests) * 100).toFixed(1)}%`
        );
        console.log(`${"=".repeat(60)}\n`);

        // Overall success rate should be reasonable
        expect(totalSuccessful).toBeGreaterThan(totalRequests * 0.6);
    });

    test("should handle rapid session creation attempts", async () => {
        if (!serverAvailable) {
            console.log(SKIP_MESSAGE);
            return;
        }

        // Rapid fire session creation (stress test)
        const result = await runLoadTest({
            url: `${BASE_URL}/api/auth/guest`,
            concurrency: 30,
            totalRequests: 60,
            method: "POST",
            timeout: 15_000,
            delayBetweenBatches: 0,
        });

        printLoadTestSummary("Rapid Session Creation Stress Test", result);

        // System should remain stable
        const totalHandled =
            result.successfulRequests +
            result.rateLimited +
            result.failedRequests;
        expect(totalHandled).toBe(result.totalRequests);

        // Rate limiting should protect the system
        // Either requests succeed or are rate limited, not crash
        expect(result.successfulRequests + result.rateLimited).toBeGreaterThan(
            result.totalRequests * 0.5
        );
    });
});
