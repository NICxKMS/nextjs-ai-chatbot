/**
 * OPT-032: API Error Classes Unit Tests
 *
 * Tests for typed API error classes.
 *
 * @module tests/unit/lib/api-errors.test.ts
 */
import { describe, expect, it } from "vitest";
import {
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    NotFoundError,
    RateLimitError,
    ServiceUnavailableError,
    ValidationError,
} from "@/lib/errors/api";

describe("API Error Classes", () => {
    describe("ValidationError", () => {
        it("should create error with correct status code", () => {
            const error = new ValidationError("Invalid email");
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe("validation:invalid_input");
            expect(error.message).toBe("Invalid email");
            expect(error.name).toBe("ValidationError");
        });

        it("should accept context", () => {
            const error = new ValidationError("Bad data", { field: "email" });
            expect(error.context).toEqual({ field: "email" });
        });
    });

    describe("AuthenticationError", () => {
        it("should create error with default message", () => {
            const error = new AuthenticationError();
            expect(error.statusCode).toBe(401);
            expect(error.message).toBe("Authentication required");
            expect(error.code).toBe("auth:unauthorized");
        });

        it("should accept custom message", () => {
            const error = new AuthenticationError("Token expired");
            expect(error.message).toBe("Token expired");
        });
    });

    describe("AuthorizationError", () => {
        it("should create error with correct status code", () => {
            const error = new AuthorizationError();
            expect(error.statusCode).toBe(403);
            expect(error.message).toBe("Permission denied");
            expect(error.code).toBe("auth:forbidden");
        });
    });

    describe("NotFoundError", () => {
        it("should create error with resource name", () => {
            const error = new NotFoundError("chat");
            expect(error.statusCode).toBe(404);
            expect(error.code).toBe("resource:not_found:chat");
            expect(error.message).toBe("chat not found");
        });

        it("should include resource in context", () => {
            const error = new NotFoundError("document", { id: "123" });
            expect(error.context).toEqual({ resource: "document", id: "123" });
        });
    });

    describe("RateLimitError", () => {
        it("should create error with retryAfter", () => {
            const error = new RateLimitError(60);
            expect(error.statusCode).toBe(429);
            expect(error.code).toBe("rate_limit:exceeded");
            expect(error.context?.retryAfter).toBe(60);
        });

        it("should create error without retryAfter", () => {
            const error = new RateLimitError();
            expect(error.statusCode).toBe(429);
            expect(error.context?.retryAfter).toBeUndefined();
        });
    });

    describe("ServiceUnavailableError", () => {
        it("should create error with service name", () => {
            const error = new ServiceUnavailableError("database");
            expect(error.statusCode).toBe(503);
            expect(error.code).toBe("external:database");
            expect(error.message).toBe("database is temporarily unavailable");
        });
    });

    describe("ConflictError", () => {
        it("should create error with message", () => {
            const error = new ConflictError("Resource already exists");
            expect(error.statusCode).toBe(409);
            expect(error.code).toBe("resource:conflict");
            expect(error.message).toBe("Resource already exists");
        });
    });

    describe("Error inheritance", () => {
        it("all errors should be instances of Error", () => {
            expect(new ValidationError("test")).toBeInstanceOf(Error);
            expect(new AuthenticationError()).toBeInstanceOf(Error);
            expect(new AuthorizationError()).toBeInstanceOf(Error);
            expect(new NotFoundError("test")).toBeInstanceOf(Error);
            expect(new RateLimitError()).toBeInstanceOf(Error);
            expect(new ServiceUnavailableError("test")).toBeInstanceOf(Error);
            expect(new ConflictError("test")).toBeInstanceOf(Error);
        });

        it("all errors should have isOperational flag", () => {
            expect(new ValidationError("test").isOperational).toBe(true);
            expect(new AuthenticationError().isOperational).toBe(true);
            expect(new NotFoundError("test").isOperational).toBe(true);
        });
    });
});
