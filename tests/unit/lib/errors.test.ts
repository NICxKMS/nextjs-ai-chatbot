import { describe, it, expect } from "vitest";
import { AppError } from "@/lib/errors/app-error";
import {
    authError,
    validationError,
    notFoundError,
    rateLimitError,
    forbiddenError,
    externalError,
} from "@/lib/errors/factories";
import {
    inferStatusCode,
    isAppError,
    ensureAppError,
    serializeError,
} from "@/lib/errors/utils";

describe("AppError", () => {
    it("should create error with required fields", () => {
        const error = new AppError({ code: "auth:unauthorized" });

        expect(error.code).toBe("auth:unauthorized");
        expect(error.name).toBe("AppError");
        expect(error.isOperational).toBe(true);
    });

    it("should infer status code from error code", () => {
        const error = new AppError({ code: "auth:unauthorized" });
        expect(error.statusCode).toBe(401);
    });

    it("should accept custom status code", () => {
        const error = new AppError({
            code: "auth:unauthorized",
            statusCode: 403,
        });
        expect(error.statusCode).toBe(403);
    });

    it("should serialize to Response", () => {
        const error = new AppError({
            code: "validation:invalid_input",
            message: "Bad data",
        });
        const response = error.toResponse();

        expect(response.status).toBe(400);
    });

    it("should serialize to ActionResult", () => {
        const error = new AppError({
            code: "auth:unauthorized",
            message: "Not allowed",
        });
        const result = error.toActionResult();

        expect(result.success).toBe(false);
        expect(result.error.code).toBe("auth:unauthorized");
        expect(result.error.message).toBe("Not allowed");
    });
});

describe("Error Factories", () => {
    it("authError creates auth error", () => {
        const error = authError("invalid_token");
        expect(error.code).toBe("auth:invalid_token");
        expect(error.statusCode).toBe(401);
    });

    it("validationError creates validation error", () => {
        const error = validationError("Email is required");
        expect(error.code).toBe("validation:invalid_input");
        expect(error.message).toBe("Email is required");
        expect(error.statusCode).toBe(400);
    });

    it("notFoundError creates not found error", () => {
        const error = notFoundError("chat");
        expect(error.code).toBe("resource:not_found:chat");
        expect(error.statusCode).toBe(404);
    });

    it("rateLimitError creates rate limit error", () => {
        const error = rateLimitError(60);
        expect(error.code).toBe("rate_limit:exceeded");
        expect(error.statusCode).toBe(429);
        expect(error.context?.retryAfter).toBe(60);
    });

    it("forbiddenError creates forbidden error", () => {
        const error = forbiddenError("document");
        expect(error.code).toBe("resource:access_denied:document");
        expect(error.statusCode).toBe(403);
    });

    it("externalError creates external service error", () => {
        const error = externalError("openai");
        expect(error.code).toBe("external:openai");
        expect(error.statusCode).toBe(503);
    });
});

describe("Error Utilities", () => {
    describe("inferStatusCode", () => {
        it("should infer 401 for auth errors", () => {
            expect(inferStatusCode("auth:unauthorized")).toBe(401);
        });

        it("should infer 403 for forbidden errors", () => {
            expect(inferStatusCode("auth:forbidden")).toBe(403);
        });

        it("should infer 400 for validation errors", () => {
            expect(inferStatusCode("validation:invalid_input")).toBe(400);
        });

        it("should infer 404 for not found errors", () => {
            expect(inferStatusCode("resource:not_found:chat")).toBe(404);
        });

        it("should infer 429 for rate limit errors", () => {
            expect(inferStatusCode("rate_limit:exceeded")).toBe(429);
        });

        it("should infer 503 for external errors", () => {
            expect(inferStatusCode("external:openai")).toBe(503);
        });

        it("should infer 500 for internal errors", () => {
            expect(inferStatusCode("internal:unknown")).toBe(500);
        });
    });

    describe("isAppError", () => {
        it("should return true for AppError", () => {
            const error = new AppError({ code: "auth:unauthorized" });
            expect(isAppError(error)).toBe(true);
        });

        it("should return false for regular Error", () => {
            const error = new Error("test");
            expect(isAppError(error)).toBe(false);
        });

        it("should return false for non-error", () => {
            expect(isAppError("string")).toBe(false);
            expect(isAppError(null)).toBe(false);
        });
    });

    describe("ensureAppError", () => {
        it("should return AppError as-is", () => {
            const original = new AppError({ code: "auth:unauthorized" });
            const result = ensureAppError(original);
            expect(result).toBe(original);
        });

        it("should wrap regular Error", () => {
            const original = new Error("Something went wrong");
            const result = ensureAppError(original);

            expect(result.code).toBe("internal:unknown");
            expect(result.message).toBe("Something went wrong");
            expect(result.isOperational).toBe(false);
        });

        it("should wrap string", () => {
            const result = ensureAppError("error string");
            expect(result.message).toBe("error string");
        });
    });

    describe("serializeError", () => {
        it("should serialize AppError", () => {
            const error = new AppError({
                code: "auth:unauthorized",
                context: { userId: "123" },
            });
            const serialized = serializeError(error);

            expect(serialized.name).toBe("AppError");
            expect(serialized.code).toBe("auth:unauthorized");
            expect(serialized.context).toEqual({ userId: "123" });
        });

        it("should serialize regular Error", () => {
            const error = new Error("test");
            const serialized = serializeError(error);

            expect(serialized.name).toBe("Error");
            expect(serialized.message).toBe("test");
        });

        it("should serialize non-error", () => {
            const serialized = serializeError("string value");
            expect(serialized.value).toBe("string value");
        });
    });
});
