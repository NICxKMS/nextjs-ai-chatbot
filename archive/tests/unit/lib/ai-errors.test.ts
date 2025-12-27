/**
 * OPT-032: AI Error Classes Unit Tests
 *
 * Tests for typed AI-specific error classes.
 *
 * @module tests/unit/lib/ai-errors.test.ts
 */
import { describe, expect, it } from "vitest";
import {
    AIProviderError,
    ContentFilterError,
    ModelNotFoundError,
    StreamingError,
    TokenLimitError,
} from "@/lib/errors/ai";

describe("AI Error Classes", () => {
    describe("AIProviderError", () => {
        it("should create error with provider name", () => {
            const error = new AIProviderError("openai", "API rate limited");
            expect(error.statusCode).toBe(502);
            expect(error.code).toBe("external:ai_provider:openai");
            expect(error.message).toBe("API rate limited");
            expect(error.name).toBe("AIProviderError");
        });

        it("should include provider in context", () => {
            const error = new AIProviderError("anthropic", "Timeout", {
                requestId: "req-123",
            });
            expect(error.context).toEqual({
                provider: "anthropic",
                requestId: "req-123",
            });
        });
    });

    describe("ModelNotFoundError", () => {
        it("should create error with model ID", () => {
            const error = new ModelNotFoundError("gpt-5-turbo");
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe("validation:model_not_found");
            expect(error.name).toBe("ModelNotFoundError");
            expect(error.context?.modelId).toBe("gpt-5-turbo");
        });
    });

    describe("TokenLimitError", () => {
        it("should create error with limit and requested values", () => {
            const error = new TokenLimitError(4096, 10_000);
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe("validation:token_limit");
            expect(error.name).toBe("TokenLimitError");
            expect(error.context?.limit).toBe(4096);
            expect(error.context?.requested).toBe(10_000);
        });
    });

    describe("ContentFilterError", () => {
        it("should create error with reason", () => {
            const error = new ContentFilterError("Harmful content detected");
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe("validation:content_filtered");
            expect(error.message).toBe("Harmful content detected");
        });

        it("should use default message when no reason provided", () => {
            const error = new ContentFilterError();
            expect(error.message).toBe("Content blocked by safety filter");
        });
    });

    describe("StreamingError", () => {
        it("should create error with message", () => {
            const error = new StreamingError("Connection lost mid-stream");
            expect(error.statusCode).toBe(500);
            expect(error.code).toBe("internal:streaming_error");
            expect(error.message).toBe("Connection lost mid-stream");
            expect(error.name).toBe("StreamingError");
        });
    });

    describe("Error properties", () => {
        it("all AI errors should be operational", () => {
            expect(new AIProviderError("test", "msg").isOperational).toBe(true);
            expect(new ModelNotFoundError("model").isOperational).toBe(true);
            expect(new TokenLimitError(100, 200).isOperational).toBe(true);
            expect(new ContentFilterError("reason").isOperational).toBe(true);
            expect(new StreamingError("msg").isOperational).toBe(true);
        });

        it("all AI errors should be instances of Error", () => {
            expect(new AIProviderError("test", "msg")).toBeInstanceOf(Error);
            expect(new ModelNotFoundError("model")).toBeInstanceOf(Error);
            expect(new TokenLimitError(100, 200)).toBeInstanceOf(Error);
            expect(new ContentFilterError()).toBeInstanceOf(Error);
            expect(new StreamingError("msg")).toBeInstanceOf(Error);
        });
    });
});
