/**
 * API Metrics Tests
 *
 * Tests for P2-031 metrics collection module.
 *
 * @module tests/unit/lib/metrics.test.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    type ApiMetric,
    clearApiMetrics,
    configureMetrics,
    createMetricsRecorder,
    exportJsonMetrics,
    exportPrometheusMetrics,
    getApiMetrics,
    getMetricsBufferSize,
    getRawMetrics,
    recordApiMetric,
    withMetrics,
} from "@/lib/middleware/metrics";

describe("P2-031: API Metrics Collection", () => {
    beforeEach(() => {
        // Reset metrics with default config before each test
        configureMetrics({ bufferSize: 10_000, enabled: true });
        clearApiMetrics();
    });

    afterEach(() => {
        clearApiMetrics();
    });

    describe("recordApiMetric", () => {
        it("should record a single metric", () => {
            const metric: ApiMetric = {
                endpoint: "/api/chat",
                method: "POST",
                statusCode: 200,
                duration: 150,
                timestamp: new Date(),
            };

            recordApiMetric(metric);

            const snapshot = getApiMetrics();
            expect(snapshot.totalRequests).toBe(1);
            expect(snapshot.endpoints["POST /api/chat"]).toBeDefined();
            expect(snapshot.endpoints["POST /api/chat"]?.requestCount).toBe(1);
        });

        it("should record multiple metrics", () => {
            for (let i = 0; i < 5; i++) {
                recordApiMetric({
                    endpoint: "/api/test",
                    method: "GET",
                    statusCode: 200,
                    duration: 100 + i * 10,
                    timestamp: new Date(),
                });
            }

            const snapshot = getApiMetrics();
            expect(snapshot.totalRequests).toBe(5);
            expect(snapshot.endpoints["GET /api/test"]?.requestCount).toBe(5);
        });

        it("should not record when metrics are disabled", () => {
            configureMetrics({ enabled: false });

            recordApiMetric({
                endpoint: "/api/test",
                method: "GET",
                statusCode: 200,
                duration: 100,
                timestamp: new Date(),
            });

            const snapshot = getApiMetrics();
            expect(snapshot.totalRequests).toBe(0);

            // Re-enable for other tests
            configureMetrics({ enabled: true });
        });
    });

    describe("Ring Buffer Behavior", () => {
        it("should use ring buffer with configured capacity", () => {
            configureMetrics({ bufferSize: 100 });

            for (let i = 0; i < 50; i++) {
                recordApiMetric({
                    endpoint: "/api/test",
                    method: "GET",
                    statusCode: 200,
                    duration: 100,
                    timestamp: new Date(),
                });
            }

            const snapshot = getApiMetrics();
            expect(snapshot.buffer.size).toBe(50);
            expect(snapshot.buffer.capacity).toBe(100);
            expect(snapshot.buffer.utilizationPercent).toBe(50);
        });

        it("should overwrite oldest entries when buffer is full", () => {
            configureMetrics({ bufferSize: 10 });

            // Fill buffer with 15 entries
            for (let i = 0; i < 15; i++) {
                recordApiMetric({
                    endpoint: "/api/test",
                    method: "GET",
                    statusCode: i < 5 ? 404 : 200, // First 5 are 404s (will be overwritten)
                    duration: i,
                    timestamp: new Date(),
                });
            }

            const snapshot = getApiMetrics();
            expect(snapshot.buffer.size).toBe(10);

            // Check that oldest entries (404s) were overwritten
            const statusCodes =
                snapshot.endpoints["GET /api/test"]?.statusCodes ?? {};
            // Should only have 200s since 404s were overwritten
            expect(statusCodes[404]).toBeUndefined();
            expect(statusCodes[200]).toBe(10);
        });
    });

    describe("Percentile Calculations", () => {
        it("should calculate correct percentiles", () => {
            // Reset with large buffer for this test
            configureMetrics({ bufferSize: 10_000, enabled: true });

            // Record 100 requests with durations 1-100ms
            for (let i = 1; i <= 100; i++) {
                recordApiMetric({
                    endpoint: "/api/test",
                    method: "GET",
                    statusCode: 200,
                    duration: i,
                    timestamp: new Date(),
                });
            }

            const snapshot = getApiMetrics();
            const metrics = snapshot.endpoints["GET /api/test"];

            expect(metrics).toBeDefined();
            // P50 should be around 50 (ceil(0.5 * 100) = 50th element = 50)
            expect(metrics?.latency.p50).toBeGreaterThanOrEqual(49);
            expect(metrics?.latency.p50).toBeLessThanOrEqual(51);
            // P95 should be around 95 (ceil(0.95 * 100) = 95th element = 95)
            expect(metrics?.latency.p95).toBeGreaterThanOrEqual(94);
            expect(metrics?.latency.p95).toBeLessThanOrEqual(96);
            // P99 should be around 99 (ceil(0.99 * 100) = 99th element = 99)
            expect(metrics?.latency.p99).toBeGreaterThanOrEqual(98);
            expect(metrics?.latency.p99).toBeLessThanOrEqual(100);
            expect(metrics?.latency.avg).toBeCloseTo(50.5, 1);
            expect(metrics?.latency.min).toBe(1);
            expect(metrics?.latency.max).toBe(100);
        });

        it("should handle empty metrics gracefully", () => {
            const snapshot = getApiMetrics();

            expect(snapshot.totalRequests).toBe(0);
            expect(snapshot.globalLatency.p50).toBe(0);
            expect(snapshot.globalLatency.p95).toBe(0);
            expect(snapshot.globalLatency.p99).toBe(0);
            expect(snapshot.globalLatency.avg).toBe(0);
        });
    });

    describe("Error Rate Tracking", () => {
        it("should track error rates correctly", () => {
            // 7 success, 3 errors (30% error rate)
            for (let i = 0; i < 7; i++) {
                recordApiMetric({
                    endpoint: "/api/test",
                    method: "POST",
                    statusCode: 200,
                    duration: 100,
                    timestamp: new Date(),
                });
            }
            for (let i = 0; i < 2; i++) {
                recordApiMetric({
                    endpoint: "/api/test",
                    method: "POST",
                    statusCode: 400,
                    duration: 50,
                    timestamp: new Date(),
                });
            }
            recordApiMetric({
                endpoint: "/api/test",
                method: "POST",
                statusCode: 500,
                duration: 200,
                timestamp: new Date(),
            });

            const snapshot = getApiMetrics();
            const metrics = snapshot.endpoints["POST /api/test"];

            expect(metrics?.errorCount).toBe(3);
            expect(metrics?.errorRate).toBeCloseTo(0.3);
            expect(snapshot.overallErrorRate).toBeCloseTo(0.3);
        });

        it("should count 4xx and 5xx as errors", () => {
            const errorCodes = [400, 401, 403, 404, 422, 429, 500, 502, 503];

            for (const code of errorCodes) {
                recordApiMetric({
                    endpoint: "/api/test",
                    method: "GET",
                    statusCode: code,
                    duration: 100,
                    timestamp: new Date(),
                });
            }

            const snapshot = getApiMetrics();
            expect(snapshot.totalErrors).toBe(9);
            expect(snapshot.overallErrorRate).toBe(1);
        });
    });

    describe("Status Code Distribution", () => {
        it("should track status code distribution", () => {
            const codes = [200, 200, 200, 201, 400, 404, 500];

            for (const code of codes) {
                recordApiMetric({
                    endpoint: "/api/test",
                    method: "GET",
                    statusCode: code,
                    duration: 100,
                    timestamp: new Date(),
                });
            }

            const snapshot = getApiMetrics();
            const statusCodes =
                snapshot.endpoints["GET /api/test"]?.statusCodes ?? {};

            expect(statusCodes[200]).toBe(3);
            expect(statusCodes[201]).toBe(1);
            expect(statusCodes[400]).toBe(1);
            expect(statusCodes[404]).toBe(1);
            expect(statusCodes[500]).toBe(1);
        });
    });

    describe("Multiple Endpoints", () => {
        it("should track metrics per endpoint", () => {
            recordApiMetric({
                endpoint: "/api/chat",
                method: "POST",
                statusCode: 200,
                duration: 500,
                timestamp: new Date(),
            });
            recordApiMetric({
                endpoint: "/api/chat",
                method: "POST",
                statusCode: 200,
                duration: 600,
                timestamp: new Date(),
            });
            recordApiMetric({
                endpoint: "/api/health",
                method: "GET",
                statusCode: 200,
                duration: 10,
                timestamp: new Date(),
            });
            recordApiMetric({
                endpoint: "/api/auth",
                method: "POST",
                statusCode: 401,
                duration: 50,
                timestamp: new Date(),
            });

            const snapshot = getApiMetrics();

            expect(Object.keys(snapshot.endpoints)).toHaveLength(3);
            expect(snapshot.endpoints["POST /api/chat"]?.requestCount).toBe(2);
            expect(snapshot.endpoints["GET /api/health"]?.requestCount).toBe(1);
            expect(snapshot.endpoints["POST /api/auth"]?.errorCount).toBe(1);
        });
    });

    describe("withMetrics wrapper", () => {
        it("should wrap handler and record metrics", async () => {
            const mockHandler = vi
                .fn()
                .mockResolvedValue(new Response("OK", { status: 200 }));

            const wrappedHandler = withMetrics("/api/test", mockHandler);
            const request = new Request("https://example.com/api/test", {
                method: "POST",
            });

            const response = await wrappedHandler(request);

            expect(response.status).toBe(200);
            expect(mockHandler).toHaveBeenCalledWith(request);

            const snapshot = getApiMetrics();
            expect(snapshot.endpoints["POST /api/test"]).toBeDefined();
            expect(snapshot.endpoints["POST /api/test"]?.statusCodes[200]).toBe(
                1
            );
        });

        it("should record error status when handler throws", async () => {
            const mockHandler = vi
                .fn()
                .mockRejectedValue(new Error("Test error"));

            const wrappedHandler = withMetrics("/api/error", mockHandler);
            const request = new Request("https://example.com/api/error", {
                method: "GET",
            });

            await expect(wrappedHandler(request)).rejects.toThrow("Test error");

            const snapshot = getApiMetrics();
            expect(snapshot.endpoints["GET /api/error"]?.statusCodes[500]).toBe(
                1
            );
            expect(snapshot.totalErrors).toBe(1);
        });

        it("should measure duration accurately", async () => {
            const mockHandler = vi.fn().mockImplementation(async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
                return new Response("OK", { status: 200 });
            });

            const wrappedHandler = withMetrics("/api/slow", mockHandler);
            const request = new Request("https://example.com/api/slow");

            await wrappedHandler(request);

            const snapshot = getApiMetrics();
            const duration =
                snapshot.endpoints["GET /api/slow"]?.latency.avg ?? 0;

            // Duration should be at least 50ms (with some tolerance)
            expect(duration).toBeGreaterThanOrEqual(45);
        });
    });

    describe("createMetricsRecorder", () => {
        it("should create a recorder for specific endpoint", () => {
            const recordMetric = createMetricsRecorder("/api/custom");

            recordMetric("POST", 201, 150);
            recordMetric("POST", 400, 50);

            const snapshot = getApiMetrics();
            expect(snapshot.endpoints["POST /api/custom"]?.requestCount).toBe(
                2
            );
            expect(snapshot.endpoints["POST /api/custom"]?.errorCount).toBe(1);
        });
    });

    describe("getRawMetrics", () => {
        it("should return raw metric records", () => {
            recordApiMetric({
                endpoint: "/api/test",
                method: "GET",
                statusCode: 200,
                duration: 100,
                timestamp: new Date("2025-01-01"),
            });

            const raw = getRawMetrics();

            expect(raw).toHaveLength(1);
            expect(raw[0]?.endpoint).toBe("/api/test");
            expect(raw[0]?.method).toBe("GET");
            expect(raw[0]?.statusCode).toBe(200);
            expect(raw[0]?.duration).toBe(100);
        });
    });

    describe("clearApiMetrics", () => {
        it("should clear all metrics", () => {
            for (let i = 0; i < 10; i++) {
                recordApiMetric({
                    endpoint: "/api/test",
                    method: "GET",
                    statusCode: 200,
                    duration: 100,
                    timestamp: new Date(),
                });
            }

            expect(getMetricsBufferSize()).toBe(10);

            clearApiMetrics();

            expect(getMetricsBufferSize()).toBe(0);
            expect(getApiMetrics().totalRequests).toBe(0);
        });
    });

    describe("Prometheus Export", () => {
        it("should export metrics in Prometheus format", () => {
            recordApiMetric({
                endpoint: "/api/chat",
                method: "POST",
                statusCode: 200,
                duration: 100,
                timestamp: new Date(),
            });
            recordApiMetric({
                endpoint: "/api/chat",
                method: "POST",
                statusCode: 500,
                duration: 50,
                timestamp: new Date(),
            });

            const prometheus = exportPrometheusMetrics();

            expect(prometheus).toContain("# HELP http_requests_total");
            expect(prometheus).toContain("# TYPE http_requests_total counter");
            expect(prometheus).toContain(
                'http_requests_total{method="POST",endpoint="/api/chat"}'
            );
            expect(prometheus).toContain(
                'http_errors_total{method="POST",endpoint="/api/chat"}'
            );
            expect(prometheus).toContain('quantile="0.5"');
            expect(prometheus).toContain('quantile="0.95"');
            expect(prometheus).toContain('quantile="0.99"');
        });
    });

    describe("JSON Export", () => {
        it("should export metrics as valid JSON", () => {
            recordApiMetric({
                endpoint: "/api/test",
                method: "GET",
                statusCode: 200,
                duration: 100,
                timestamp: new Date(),
            });

            const jsonStr = exportJsonMetrics();
            const parsed = JSON.parse(jsonStr);

            expect(parsed.totalRequests).toBe(1);
            expect(parsed.endpoints["GET /api/test"]).toBeDefined();
            expect(parsed.buffer).toBeDefined();
        });
    });

    describe("MetricsSnapshot Structure", () => {
        it("should have correct structure", () => {
            recordApiMetric({
                endpoint: "/api/test",
                method: "GET",
                statusCode: 200,
                duration: 100,
                timestamp: new Date(),
            });

            const snapshot = getApiMetrics();

            // Top-level properties
            expect(snapshot.startTime).toBeInstanceOf(Date);
            expect(snapshot.snapshotTime).toBeInstanceOf(Date);
            expect(typeof snapshot.totalRequests).toBe("number");
            expect(typeof snapshot.totalErrors).toBe("number");
            expect(typeof snapshot.overallErrorRate).toBe("number");

            // Global latency
            expect(typeof snapshot.globalLatency.p50).toBe("number");
            expect(typeof snapshot.globalLatency.p95).toBe("number");
            expect(typeof snapshot.globalLatency.p99).toBe("number");
            expect(typeof snapshot.globalLatency.avg).toBe("number");

            // Buffer info
            expect(typeof snapshot.buffer.size).toBe("number");
            expect(typeof snapshot.buffer.capacity).toBe("number");
            expect(typeof snapshot.buffer.utilizationPercent).toBe("number");

            // Endpoint metrics
            const endpoint = snapshot.endpoints["GET /api/test"];
            expect(endpoint).toBeDefined();
            expect(typeof endpoint?.requestCount).toBe("number");
            expect(typeof endpoint?.errorCount).toBe("number");
            expect(typeof endpoint?.errorRate).toBe("number");
            expect(typeof endpoint?.statusCodes).toBe("object");
            expect(typeof endpoint?.latency.p50).toBe("number");
            expect(typeof endpoint?.latency.p95).toBe("number");
            expect(typeof endpoint?.latency.p99).toBe("number");
            expect(typeof endpoint?.latency.avg).toBe("number");
            expect(typeof endpoint?.latency.min).toBe("number");
            expect(typeof endpoint?.latency.max).toBe("number");
        });
    });
});
