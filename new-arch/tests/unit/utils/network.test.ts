import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    buildUrl,
    fetchWithRetry,
    fetchWithTimeout,
    getDomain,
    isAbsoluteUrl,
    joinUrl,
    parseQueryString,
    postJSON,
    safeFetch,
} from "@/lib/utils/network";

describe("Network Utilities", () => {
    // =========================================================================
    // URL Utilities
    // =========================================================================

    describe("buildUrl", () => {
        it("returns base URL when no params provided", () => {
            expect(buildUrl("/api/search")).toBe("/api/search");
        });

        it("adds query parameters", () => {
            const result = buildUrl("/api/search", { q: "hello", page: 1 });
            expect(result).toBe("/api/search?q=hello&page=1");
        });

        it("omits null values", () => {
            const result = buildUrl("/api/search", { q: "hello", page: null });
            expect(result).toBe("/api/search?q=hello");
        });

        it("omits undefined values", () => {
            const result = buildUrl("/api/search", {
                q: "hello",
                page: undefined,
            });
            expect(result).toBe("/api/search?q=hello");
        });

        it("handles boolean values", () => {
            const result = buildUrl("/api/search", { active: true });
            expect(result).toBe("/api/search?active=true");
        });

        it("handles absolute URLs", () => {
            const result = buildUrl("https://api.example.com/search", {
                q: "test",
            });
            expect(result).toBe("https://api.example.com/search?q=test");
        });

        it("handles empty params object", () => {
            expect(buildUrl("/api/search", {})).toBe("/api/search");
        });
    });

    describe("parseQueryString", () => {
        it("parses query string with leading ?", () => {
            const result = parseQueryString("?q=hello&page=1");
            expect(result).toEqual({ q: "hello", page: "1" });
        });

        it("parses query string without leading ?", () => {
            const result = parseQueryString("q=hello&page=1");
            expect(result).toEqual({ q: "hello", page: "1" });
        });

        it("returns empty object for empty string", () => {
            expect(parseQueryString("")).toEqual({});
        });

        it("handles URL-encoded values", () => {
            const result = parseQueryString("?q=hello%20world");
            expect(result.q).toBe("hello world");
        });

        it("handles duplicate keys (last value wins)", () => {
            const result = parseQueryString("?a=1&a=2");
            expect(result.a).toBe("2");
        });
    });

    describe("isAbsoluteUrl", () => {
        it("returns true for https URL", () => {
            expect(isAbsoluteUrl("https://example.com")).toBe(true);
        });

        it("returns true for http URL", () => {
            expect(isAbsoluteUrl("http://example.com")).toBe(true);
        });

        it("returns true for other protocols", () => {
            expect(isAbsoluteUrl("ftp://files.example.com")).toBe(true);
            expect(isAbsoluteUrl("mailto:test@example.com")).toBe(true);
        });

        it("returns false for relative path", () => {
            expect(isAbsoluteUrl("/path/to/page")).toBe(false);
        });

        it("returns false for relative path without leading slash", () => {
            expect(isAbsoluteUrl("path/to/page")).toBe(false);
        });

        it("returns false for protocol-relative URL", () => {
            expect(isAbsoluteUrl("//example.com")).toBe(false);
        });
    });

    describe("joinUrl", () => {
        it("joins simple segments", () => {
            expect(joinUrl("api", "users", "123")).toBe("api/users/123");
        });

        it("handles leading slashes", () => {
            expect(joinUrl("/api", "/users", "/123")).toBe("/api/users/123");
        });

        it("handles trailing slashes", () => {
            expect(joinUrl("/api/", "/users/", "/123")).toBe("/api/users/123");
        });

        it("handles single segment", () => {
            expect(joinUrl("api")).toBe("api");
        });

        it("filters out empty segments", () => {
            expect(joinUrl("api", "", "users")).toBe("api/users");
        });

        it("handles mixed slashes", () => {
            expect(joinUrl("/api//", "//users//", "//123/")).toBe(
                "/api/users/123"
            );
        });
    });

    describe("getDomain", () => {
        it("extracts domain from URL with path", () => {
            const result = getDomain("https://www.example.com/path");
            expect(result).toBe("www.example.com");
        });

        it("extracts domain from URL with port", () => {
            const result = getDomain("https://example.com:8080/path");
            expect(result).toBe("example.com:8080");
        });

        it("returns null for invalid URL", () => {
            expect(getDomain("not a url")).toBeNull();
        });

        it("returns null for relative path", () => {
            expect(getDomain("/path/to/page")).toBeNull();
        });
    });

    // =========================================================================
    // Fetch Utilities
    // =========================================================================

    describe("safeFetch", () => {
        beforeEach(() => {
            vi.stubGlobal("fetch", vi.fn());
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        it("returns data on success", async () => {
            const mockData = { id: 1, name: "Test" };
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockData),
            } as Response);

            const result = await safeFetch<typeof mockData>("/api/test");
            expect(result.data).toEqual(mockData);
            expect(result.error).toBeNull();
        });

        it("returns error on HTTP error", async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: "Not Found",
            } as Response);

            const result = await safeFetch("/api/test");
            expect(result.data).toBeNull();
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error?.message).toContain("404");
        });

        it("returns error on network error", async () => {
            vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

            const result = await safeFetch("/api/test");
            expect(result.data).toBeNull();
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error?.message).toBe("Network error");
        });

        it("passes options to fetch", async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({}),
            } as Response);

            await safeFetch("/api/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            expect(fetch).toHaveBeenCalledWith("/api/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
        });
    });

    describe("fetchWithRetry", () => {
        beforeEach(() => {
            vi.stubGlobal("fetch", vi.fn());
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.unstubAllGlobals();
            vi.useRealTimers();
        });

        it("returns data on first successful attempt", async () => {
            const mockData = { id: 1 };
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockData),
            } as Response);

            const result = await fetchWithRetry("/api/test");
            expect(result).toEqual(mockData);
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it("retries on failure and succeeds", async () => {
            const mockData = { id: 1 };

            vi.mocked(fetch)
                .mockRejectedValueOnce(new Error("Network error"))
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockData),
                } as Response);

            const promise = fetchWithRetry("/api/test", {
                retries: 3,
                delay: 100,
            });

            // Advance timer for first retry
            await vi.advanceTimersByTimeAsync(100);

            const result = await promise;
            expect(result).toEqual(mockData);
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        it("throws after all retries exhausted", async () => {
            vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

            const promise = fetchWithRetry("/api/test", {
                retries: 3,
                delay: 100,
                backoff: false,
            });

            // Advance timers for all retries
            await vi.advanceTimersByTimeAsync(300);

            await expect(promise).rejects.toThrow("Network error");
            expect(fetch).toHaveBeenCalledTimes(3);
        });

        it("uses exponential backoff by default", async () => {
            vi.mocked(fetch)
                .mockRejectedValueOnce(new Error("fail 1"))
                .mockRejectedValueOnce(new Error("fail 2"))
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({}),
                } as Response);

            const promise = fetchWithRetry("/api/test", {
                retries: 3,
                delay: 1000,
            });

            // First retry after 1000ms
            await vi.advanceTimersByTimeAsync(1000);
            // Second retry after 2000ms (exponential)
            await vi.advanceTimersByTimeAsync(2000);

            await promise;
            expect(fetch).toHaveBeenCalledTimes(3);
        });

        it("throws on HTTP error after retries", async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: false,
                status: 500,
                statusText: "Server Error",
            } as Response);

            const promise = fetchWithRetry("/api/test", {
                retries: 2,
                delay: 100,
                backoff: false,
            });

            await vi.advanceTimersByTimeAsync(200);

            await expect(promise).rejects.toThrow("500");
        });
    });

    describe("fetchWithTimeout", () => {
        beforeEach(() => {
            vi.stubGlobal("fetch", vi.fn());
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.unstubAllGlobals();
            vi.useRealTimers();
        });

        it("returns response on success within timeout", async () => {
            const mockResponse = new Response("ok");
            vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

            const result = await fetchWithTimeout("/api/test", {}, 5000);
            expect(result).toBe(mockResponse);
        });

        it("throws timeout error when request exceeds timeout", async () => {
            vi.mocked(fetch).mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(() => resolve(new Response("ok")), 20_000)
                    )
            );

            const promise = fetchWithTimeout("/api/test", {}, 5000);

            await vi.advanceTimersByTimeAsync(5000);

            await expect(promise).rejects.toThrow("timed out after 5000ms");
        });

        it("passes abort signal to fetch", async () => {
            vi.mocked(fetch).mockResolvedValueOnce(new Response("ok"));

            await fetchWithTimeout("/api/test", { method: "POST" }, 5000);

            const fetchCall = vi.mocked(fetch).mock.calls[0];
            expect(fetchCall?.[1]).toHaveProperty("signal");
            expect(fetchCall?.[1]?.signal).toBeInstanceOf(AbortSignal);
        });

        it("uses default timeout of 10000ms", async () => {
            vi.mocked(fetch).mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(() => resolve(new Response("ok")), 15_000)
                    )
            );

            const promise = fetchWithTimeout("/api/test");

            await vi.advanceTimersByTimeAsync(10_000);

            await expect(promise).rejects.toThrow("10000ms");
        });
    });

    describe("postJSON", () => {
        beforeEach(() => {
            vi.stubGlobal("fetch", vi.fn());
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        it("sends POST request with JSON body", async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            } as Response);

            const result = await postJSON("/api/submit", { name: "John" });

            expect(fetch).toHaveBeenCalledWith("/api/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: "John" }),
            });
            expect(result).toEqual({ success: true });
        });

        it("merges additional headers", async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({}),
            } as Response);

            await postJSON(
                "/api/submit",
                { name: "John" },
                {
                    headers: { Authorization: "Bearer token" },
                }
            );

            expect(fetch).toHaveBeenCalledWith(
                "/api/submit",
                expect.objectContaining({
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer token",
                    },
                })
            );
        });

        it("throws on HTTP error", async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: "Bad Request",
            } as Response);

            await expect(postJSON("/api/submit", {})).rejects.toThrow();
        });
    });
});
