/**
 * OPT-035: Middleware Chain Unit Tests
 *
 * Tests for middleware composition and chain execution.
 *
 * @module tests/unit/lib/middleware-chain.test.ts
 */
import { describe, expect, it, vi } from "vitest";
import {
    acceptsContentType,
    createContextChain,
    createMiddlewareChain,
    extractBearerToken,
    parseAccept,
    parseCacheControl,
    parseCookies,
    skipPath,
    whenMethod,
    whenPath,
} from "@/lib/middleware/chain";

describe("createMiddlewareChain", () => {
    describe("basic execution", () => {
        it("should execute all middlewares when none return response", async () => {
            const m1 = vi.fn().mockResolvedValue(null);
            const m2 = vi.fn().mockResolvedValue(null);
            const m3 = vi.fn().mockResolvedValue(null);

            const chain = createMiddlewareChain([m1, m2, m3]);
            const request = new Request("http://test.com");
            const result = await chain(request);

            expect(result).toBeNull();
            expect(m1).toHaveBeenCalledWith(request);
            expect(m2).toHaveBeenCalledWith(request);
            expect(m3).toHaveBeenCalledWith(request);
        });

        it("should short-circuit when middleware returns response", async () => {
            const response = new Response("blocked", { status: 403 });
            const m1 = vi.fn().mockResolvedValue(null);
            const m2 = vi.fn().mockResolvedValue(response);
            const m3 = vi.fn().mockResolvedValue(null);

            const chain = createMiddlewareChain([m1, m2, m3]);
            const result = await chain(new Request("http://test.com"));

            expect(result).toBe(response);
            expect(m1).toHaveBeenCalled();
            expect(m2).toHaveBeenCalled();
            expect(m3).not.toHaveBeenCalled(); // short-circuited
        });
    });

    describe("error handling", () => {
        it("should throw errors by default", async () => {
            const m1 = vi.fn().mockRejectedValue(new Error("middleware error"));

            const chain = createMiddlewareChain([m1]);

            await expect(chain(new Request("http://test.com"))).rejects.toThrow(
                "middleware error"
            );
        });

        it("should continue on error when continueOnError is true", async () => {
            const m1 = vi.fn().mockRejectedValue(new Error("error"));
            const m2 = vi.fn().mockResolvedValue(null);

            const chain = createMiddlewareChain([m1, m2], {
                continueOnError: true,
            });
            const result = await chain(new Request("http://test.com"));

            expect(result).toBeNull();
            expect(m2).toHaveBeenCalled();
        });

        it("should call onError handler when provided", async () => {
            const errorResponse = new Response("error", { status: 500 });
            const onError = vi.fn().mockReturnValue(errorResponse);
            const m1 = vi.fn().mockRejectedValue(new Error("test error"));

            const chain = createMiddlewareChain([m1], { onError });
            const result = await chain(new Request("http://test.com"));

            expect(result).toBe(errorResponse);
            expect(onError).toHaveBeenCalledWith(
                expect.any(Error),
                expect.any(String)
            );
        });
    });

    describe("timing option", () => {
        it("should add timing header when timing is enabled", async () => {
            const response = new Response("ok");
            const m1 = vi.fn().mockResolvedValue(response);
            Object.defineProperty(m1, "name", { value: "testMiddleware" });

            const chain = createMiddlewareChain([m1], { timing: true });
            const result = await chain(new Request("http://test.com"));

            expect(result?.headers.get("X-Middleware-Timing")).toContain(
                "testMiddleware="
            );
        });
    });

    describe("empty chain", () => {
        it("should return null for empty middleware array", async () => {
            const chain = createMiddlewareChain([]);
            const result = await chain(new Request("http://test.com"));
            expect(result).toBeNull();
        });
    });
});

describe("createContextChain", () => {
    it("should pass initial context to middlewares", async () => {
        type Ctx = { userId?: string; requestId: string };
        const m1 = vi.fn().mockResolvedValue({ continue: true });

        const chain = createContextChain<Ctx>([m1], { requestId: "req-123" });
        await chain(new Request("http://test.com"));

        expect(m1).toHaveBeenCalledWith(
            expect.any(Request),
            expect.objectContaining({ requestId: "req-123" })
        );
    });

    it("should accumulate context across middlewares", async () => {
        type Ctx = { step: number };
        const m1 = vi
            .fn()
            .mockResolvedValue({ continue: true, context: { step: 1 } });
        const m2 = vi.fn().mockImplementation((_req, ctx) => ({
            continue: true,
            context: { step: ctx.step + 1 },
        }));
        const m3 = vi.fn().mockResolvedValue({ continue: true });

        const chain = createContextChain<Ctx>([m1, m2, m3], { step: 0 });
        await chain(new Request("http://test.com"));

        expect(m3).toHaveBeenCalledWith(
            expect.any(Request),
            expect.objectContaining({ step: 2 })
        );
    });

    it("should short-circuit when middleware returns Response", async () => {
        type Ctx = Record<string, unknown>;
        const response = new Response("blocked");
        const m1 = vi.fn().mockResolvedValue(response);
        const m2 = vi.fn().mockResolvedValue({ continue: true });

        const chain = createContextChain<Ctx>([m1, m2], {});
        const result = await chain(new Request("http://test.com"));

        expect(result?.response).toBe(response);
        expect(m2).not.toHaveBeenCalled();
    });
});

describe("whenPath", () => {
    it("should execute middleware when path matches string pattern", async () => {
        const middleware = vi.fn().mockResolvedValue(null);
        const conditional = whenPath("/api", middleware);

        await conditional(new Request("http://test.com/api/users"));

        expect(middleware).toHaveBeenCalled();
    });

    it("should skip middleware when path does not match", async () => {
        const middleware = vi.fn().mockResolvedValue(null);
        const conditional = whenPath("/api", middleware);

        await conditional(new Request("http://test.com/home"));

        expect(middleware).not.toHaveBeenCalled();
    });

    it("should support regex patterns", async () => {
        const middleware = vi.fn().mockResolvedValue(null);
        const conditional = whenPath(/^\/api\/v\d+/, middleware);

        await conditional(new Request("http://test.com/api/v2/users"));

        expect(middleware).toHaveBeenCalled();
    });
});

describe("whenMethod", () => {
    it("should execute middleware when method matches", async () => {
        const middleware = vi.fn().mockResolvedValue(null);
        const conditional = whenMethod("POST", middleware);

        await conditional(new Request("http://test.com", { method: "POST" }));

        expect(middleware).toHaveBeenCalled();
    });

    it("should skip middleware when method does not match", async () => {
        const middleware = vi.fn().mockResolvedValue(null);
        const conditional = whenMethod("POST", middleware);

        await conditional(new Request("http://test.com", { method: "GET" }));

        expect(middleware).not.toHaveBeenCalled();
    });

    it("should accept array of methods", async () => {
        const middleware = vi.fn().mockResolvedValue(null);
        const conditional = whenMethod(["POST", "PUT"], middleware);

        await conditional(new Request("http://test.com", { method: "PUT" }));

        expect(middleware).toHaveBeenCalled();
    });
});

describe("skipPath", () => {
    it("should skip middleware when path matches", async () => {
        const middleware = vi.fn().mockResolvedValue(null);
        const skipped = skipPath("/health", middleware);

        await skipped(new Request("http://test.com/health"));

        expect(middleware).not.toHaveBeenCalled();
    });

    it("should execute middleware when path does not match", async () => {
        const middleware = vi.fn().mockResolvedValue(null);
        const skipped = skipPath("/health", middleware);

        await skipped(new Request("http://test.com/api/users"));

        expect(middleware).toHaveBeenCalled();
    });
});

describe("parseCacheControl", () => {
    it("should parse max-age directive", () => {
        const result = parseCacheControl("max-age=3600");
        expect(result.maxAge).toBe(3600);
    });

    it("should parse s-maxage directive", () => {
        const result = parseCacheControl("s-maxage=86400");
        expect(result.sMaxAge).toBe(86_400);
    });

    it("should parse boolean directives", () => {
        const result = parseCacheControl(
            "no-cache, no-store, must-revalidate, private"
        );
        expect(result.noCache).toBe(true);
        expect(result.noStore).toBe(true);
        expect(result.mustRevalidate).toBe(true);
        expect(result.private).toBe(true);
    });

    it("should handle null input", () => {
        const result = parseCacheControl(null);
        expect(result).toEqual({});
    });
});

describe("parseAccept", () => {
    it("should parse simple accept header", () => {
        const result = parseAccept("text/html");
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe("text/html");
        expect(result[0].quality).toBe(1);
    });

    it("should parse accept header with quality", () => {
        const result = parseAccept("text/html;q=0.9, application/json;q=0.8");
        expect(result[0].type).toBe("text/html");
        expect(result[0].quality).toBe(0.9);
        expect(result[1].type).toBe("application/json");
        expect(result[1].quality).toBe(0.8);
    });

    it("should sort by quality (highest first)", () => {
        const result = parseAccept("text/plain;q=0.5, application/json;q=0.9");
        expect(result[0].type).toBe("application/json");
        expect(result[1].type).toBe("text/plain");
    });

    it("should handle null input", () => {
        const result = parseAccept(null);
        expect(result).toEqual([]);
    });
});

describe("acceptsContentType", () => {
    it("should return true for exact match", () => {
        expect(acceptsContentType("application/json", "application/json")).toBe(
            true
        );
    });

    it("should return true for wildcard", () => {
        expect(acceptsContentType("*/*", "application/json")).toBe(true);
    });

    it("should return true for type wildcard", () => {
        expect(acceptsContentType("text/*", "text/html")).toBe(true);
    });

    it("should return true for null accept (accept all)", () => {
        expect(acceptsContentType(null, "application/json")).toBe(true);
    });
});

describe("extractBearerToken", () => {
    it("should extract token from valid header", () => {
        expect(extractBearerToken("Bearer abc123")).toBe("abc123");
    });

    it("should return null for missing header", () => {
        expect(extractBearerToken(null)).toBeNull();
    });

    it("should return null for non-bearer header", () => {
        expect(extractBearerToken("Basic abc123")).toBeNull();
    });

    it("should be case-insensitive", () => {
        expect(extractBearerToken("BEARER token123")).toBe("token123");
    });
});

describe("parseCookies", () => {
    it("should parse single cookie", () => {
        const cookies = parseCookies("session=abc123");
        expect(cookies.get("session")).toBe("abc123");
    });

    it("should parse multiple cookies", () => {
        const cookies = parseCookies("a=1; b=2; c=3");
        expect(cookies.get("a")).toBe("1");
        expect(cookies.get("b")).toBe("2");
        expect(cookies.get("c")).toBe("3");
    });

    it("should decode URL-encoded values", () => {
        const cookies = parseCookies("name=John%20Doe");
        expect(cookies.get("name")).toBe("John Doe");
    });

    it("should handle null input", () => {
        const cookies = parseCookies(null);
        expect(cookies.size).toBe(0);
    });
});
