/**
 * TEST-004: Load Test Utilities
 *
 * Provides utilities for running load tests without external tools like k6 or Artillery.
 * Uses native Node.js fetch to simulate concurrent requests and measure performance.
 */

export interface LoadTestResult {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    rateLimited: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestsPerSecond: number;
    totalDuration: number;
    statusCodes: Record<number, number>;
    errors: string[];
}

export interface LoadTestOptions {
    url: string;
    concurrency: number;
    totalRequests: number;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
    delayBetweenBatches?: number;
}

interface RequestResult {
    success: boolean;
    statusCode: number;
    responseTime: number;
    error?: string;
    rateLimited: boolean;
}

/**
 * Calculate a percentile value from a sorted array of numbers
 */
export function calculatePercentile(
    sortedTimes: number[],
    percentile: number
): number {
    if (sortedTimes.length === 0) {
        return 0;
    }
    const index = Math.ceil((percentile / 100) * sortedTimes.length) - 1;
    return sortedTimes[Math.max(0, index)];
}

/**
 * Check if the server is available before running load tests
 */
export async function isServerAvailable(
    baseUrl: string,
    timeout = 5000
): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(baseUrl, {
            method: "HEAD",
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok || response.status < 500;
    } catch {
        return false;
    }
}

/**
 * Execute a single request and measure its performance
 */
async function executeRequest(
    options: LoadTestOptions,
    requestIndex: number
): Promise<RequestResult> {
    const startTime = performance.now();
    const controller = new AbortController();
    const timeout = options.timeout || 30_000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(options.url, {
            method: options.method || "GET",
            headers: options.headers,
            body: options.body,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        const rateLimited = response.status === 429;
        const success = response.ok && !rateLimited;

        return {
            success,
            statusCode: response.status,
            responseTime,
            rateLimited,
        };
    } catch (error) {
        clearTimeout(timeoutId);
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

        return {
            success: false,
            statusCode: 0,
            responseTime,
            error: errorMessage,
            rateLimited: false,
        };
    }
}

/**
 * Run a batch of concurrent requests
 */
async function runBatch(
    options: LoadTestOptions,
    batchSize: number,
    startIndex: number
): Promise<RequestResult[]> {
    const promises: Promise<RequestResult>[] = [];

    for (let i = 0; i < batchSize; i++) {
        promises.push(executeRequest(options, startIndex + i));
    }

    return Promise.all(promises);
}

/**
 * Run a load test with specified concurrency and total requests
 */
export async function runLoadTest(
    options: LoadTestOptions
): Promise<LoadTestResult> {
    const results: RequestResult[] = [];
    const errors: string[] = [];
    const statusCodes: Record<number, number> = {};

    const totalStart = performance.now();
    let processedRequests = 0;

    // Process requests in batches of 'concurrency' size
    while (processedRequests < options.totalRequests) {
        const remainingRequests = options.totalRequests - processedRequests;
        const batchSize = Math.min(options.concurrency, remainingRequests);

        const batchResults = await runBatch(
            options,
            batchSize,
            processedRequests
        );
        results.push(...batchResults);

        processedRequests += batchSize;

        // Optional delay between batches to prevent overwhelming the server
        if (
            options.delayBetweenBatches &&
            processedRequests < options.totalRequests
        ) {
            await new Promise((resolve) =>
                setTimeout(resolve, options.delayBetweenBatches)
            );
        }
    }

    const totalEnd = performance.now();
    const totalDuration = totalEnd - totalStart;

    // Calculate metrics
    let successfulRequests = 0;
    let failedRequests = 0;
    let rateLimited = 0;
    const responseTimes: number[] = [];

    for (const result of results) {
        if (result.success) {
            successfulRequests++;
        } else if (result.rateLimited) {
            rateLimited++;
        } else {
            failedRequests++;
        }

        if (result.error) {
            errors.push(result.error);
        }

        responseTimes.push(result.responseTime);

        const code = result.statusCode;
        statusCodes[code] = (statusCodes[code] || 0) + 1;
    }

    // Sort response times for percentile calculations
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);

    const avgResponseTime =
        responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;

    return {
        totalRequests: results.length,
        successfulRequests,
        failedRequests,
        rateLimited,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        minResponseTime:
            sortedTimes.length > 0 ? Math.round(sortedTimes[0] * 100) / 100 : 0,
        maxResponseTime:
            sortedTimes.length > 0
                ? Math.round((sortedTimes.at(-1) ?? 0) * 100) / 100
                : 0,
        p50ResponseTime:
            Math.round(calculatePercentile(sortedTimes, 50) * 100) / 100,
        p95ResponseTime:
            Math.round(calculatePercentile(sortedTimes, 95) * 100) / 100,
        p99ResponseTime:
            Math.round(calculatePercentile(sortedTimes, 99) * 100) / 100,
        requestsPerSecond:
            totalDuration > 0
                ? Math.round((results.length / (totalDuration / 1000)) * 100) /
                  100
                : 0,
        totalDuration: Math.round(totalDuration * 100) / 100,
        statusCodes,
        errors: [...new Set(errors)], // Unique errors only
    };
}

/**
 * Print a formatted summary of load test results
 */
export function printLoadTestSummary(
    testName: string,
    result: LoadTestResult
): void {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Load Test: ${testName}`);
    console.log("=".repeat(60));
    console.log(`Total Requests:     ${result.totalRequests}`);
    console.log(`Successful:         ${result.successfulRequests}`);
    console.log(`Failed:             ${result.failedRequests}`);
    console.log(`Rate Limited:       ${result.rateLimited}`);
    console.log("-".repeat(60));
    console.log(`Avg Response Time:  ${result.avgResponseTime}ms`);
    console.log(`Min Response Time:  ${result.minResponseTime}ms`);
    console.log(`Max Response Time:  ${result.maxResponseTime}ms`);
    console.log(`P50 Response Time:  ${result.p50ResponseTime}ms`);
    console.log(`P95 Response Time:  ${result.p95ResponseTime}ms`);
    console.log(`P99 Response Time:  ${result.p99ResponseTime}ms`);
    console.log("-".repeat(60));
    console.log(`Requests/Second:    ${result.requestsPerSecond}`);
    console.log(`Total Duration:     ${result.totalDuration}ms`);
    console.log("-".repeat(60));
    console.log("Status Codes:");
    for (const [code, count] of Object.entries(result.statusCodes)) {
        console.log(`  ${code}: ${count}`);
    }
    if (result.errors.length > 0) {
        console.log("-".repeat(60));
        console.log("Errors:");
        for (const error of result.errors.slice(0, 5)) {
            console.log(`  - ${error}`);
        }
        if (result.errors.length > 5) {
            console.log(`  ... and ${result.errors.length - 5} more`);
        }
    }
    console.log(`${"=".repeat(60)}\n`);
}

/**
 * Create a unique session identifier for testing
 */
export function createTestSessionId(): string {
    return `load-test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sleep utility for delays between test phases
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
