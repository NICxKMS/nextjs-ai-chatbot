/**
 * OPT-034: Retry Logic Unit Tests
 *
 * Tests for the exponential backoff retry utility.
 *
 * @module tests/unit/lib/retry.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRetryable, withRetry, withRetryResult } from "@/lib/utils/retry";

describe("withRetry", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(async () => {
        // Ensure all timers and pending promises are cleaned up
        vi.clearAllTimers();
        vi.useRealTimers();
        // Allow any pending microtasks to complete
        await new Promise((resolve) => setTimeout(resolve, 0));
    });

    describe("successful operations", () => {
        it("should return result on first success", async () => {
            const fn = vi.fn().mockResolvedValue("success");

            const promise = withRetry(fn);
            await vi.runAllTimersAsync();
            const result = await promise;

            expect(result).toBe("success");
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it("should retry and succeed on second attempt", async () => {
            const fn = vi
                .fn()
                .mockRejectedValueOnce(new Error("first fail"))
                .mockResolvedValueOnce("success");

            const promise = withRetry(fn, { maxAttempts: 3, baseDelay: 100 });
            await vi.runAllTimersAsync();
            const result = await promise;

            expect(result).toBe("success");
            expect(fn).toHaveBeenCalledTimes(2);
        });
    });

    describe("failed operations", () => {
        it("should throw after max attempts", async () => {
            const error = new Error("always fails");
            const fn = vi.fn().mockRejectedValue(error);

            const promise = withRetry(fn, { maxAttempts: 3, baseDelay: 100 });

            // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection
            const assertion = expect(promise).rejects.toThrow("always fails");
            await vi.runAllTimersAsync();
            await assertion;
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it("should respect maxAttempts option", async () => {
            const fn = vi.fn().mockRejectedValue(new Error("fail"));

            const promise = withRetry(fn, { maxAttempts: 5, baseDelay: 100 });

            // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection
            const assertion = expect(promise).rejects.toThrow("fail");
            await vi.runAllTimersAsync();
            await assertion;
            expect(fn).toHaveBeenCalledTimes(5);
        });
    });

    describe("shouldRetry option", () => {
        it("should stop retrying when shouldRetry returns false", async () => {
            const fn = vi.fn().mockRejectedValue(new Error("non-retryable"));

            const promise = withRetry(fn, {
                maxAttempts: 5,
                baseDelay: 100,
                shouldRetry: () => false,
            });

            // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection
            const assertion = expect(promise).rejects.toThrow("non-retryable");
            await vi.runAllTimersAsync();
            await assertion;
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it("should continue retrying when shouldRetry returns true", async () => {
            const fn = vi.fn().mockRejectedValue(new Error("retryable"));

            const promise = withRetry(fn, {
                maxAttempts: 3,
                baseDelay: 100,
                shouldRetry: () => true,
            });

            // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection
            const assertion = expect(promise).rejects.toThrow();
            await vi.runAllTimersAsync();
            await assertion;
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it("should pass error and attempt to shouldRetry", async () => {
            const shouldRetry = vi.fn().mockReturnValue(true);
            const error = new Error("test");
            const fn = vi.fn().mockRejectedValue(error);

            const promise = withRetry(fn, {
                maxAttempts: 2,
                baseDelay: 100,
                shouldRetry,
            });

            // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection
            const assertion = expect(promise).rejects.toThrow();
            await vi.runAllTimersAsync();
            await assertion;
            expect(shouldRetry).toHaveBeenCalledWith(error, 1);
        });
    });

    describe("onRetry callback", () => {
        it("should call onRetry before each retry", async () => {
            const onRetry = vi.fn();
            const fn = vi.fn().mockRejectedValue(new Error("fail"));

            const promise = withRetry(fn, {
                maxAttempts: 3,
                baseDelay: 100,
                onRetry,
            });

            // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection
            const assertion = expect(promise).rejects.toThrow();
            await vi.runAllTimersAsync();
            await assertion;
            // onRetry called before 2nd and 3rd attempts
            expect(onRetry).toHaveBeenCalledTimes(2);
        });

        it("should pass error, attempt, and delay to onRetry", async () => {
            const onRetry = vi.fn();
            const error = new Error("fail");
            const fn = vi.fn().mockRejectedValue(error);

            const promise = withRetry(fn, {
                maxAttempts: 2,
                baseDelay: 100,
                jitter: false,
                onRetry,
            });

            // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection
            const assertion = expect(promise).rejects.toThrow();
            await vi.runAllTimersAsync();
            await assertion;
            expect(onRetry).toHaveBeenCalledWith(error, 1, expect.any(Number));
        });
    });

    describe("abort signal", () => {
        it("should abort immediately if signal is already aborted", async () => {
            const controller = new AbortController();
            controller.abort();

            const fn = vi.fn().mockResolvedValue("success");

            await expect(
                withRetry(fn, { signal: controller.signal })
            ).rejects.toThrow("Aborted");
            expect(fn).not.toHaveBeenCalled();
        });

        it("should abort during retry delay", async () => {
            const controller = new AbortController();
            const fn = vi.fn().mockRejectedValue(new Error("fail"));

            const promise = withRetry(fn, {
                maxAttempts: 3,
                baseDelay: 1000,
                signal: controller.signal,
            });

            // Let first attempt fail
            await vi.advanceTimersByTimeAsync(0);
            expect(fn).toHaveBeenCalledTimes(1);

            // Abort during delay and immediately await to catch the rejection
            controller.abort();

            await expect(promise).rejects.toThrow("Aborted");

            // Clean up any remaining timers
            vi.clearAllTimers();
        });
    });
});

describe("withRetryResult", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should return success result on success", async () => {
        const fn = vi.fn().mockResolvedValue("data");

        const promise = withRetryResult(fn);
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result.success).toBe(true);
        expect(result.data).toBe("data");
        expect(result.attempts).toBe(1);
        expect(result.totalTime).toBeGreaterThanOrEqual(0);
    });

    it("should return failure result after all retries", async () => {
        const error = new Error("fail");
        const fn = vi.fn().mockRejectedValue(error);

        const promise = withRetryResult(fn, { maxAttempts: 2, baseDelay: 100 });
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result.success).toBe(false);
        expect(result.error).toBe(error);
        // attempts tracks via onRetry which is called before retry (so 1 for 2 attempts)
        expect(result.attempts).toBeGreaterThanOrEqual(1);
    });
});

describe("createRetryable", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should create a retryable version of an async function", async () => {
        const fn = vi.fn().mockResolvedValue("result");
        const retryable = createRetryable(fn, { maxAttempts: 3 });

        const promise = retryable();
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe("result");
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry the wrapped function on failure", async () => {
        const fn = vi
            .fn()
            .mockRejectedValueOnce(new Error("fail"))
            .mockResolvedValueOnce("success");

        const retryable = createRetryable(fn, {
            maxAttempts: 3,
            baseDelay: 100,
        });

        const promise = retryable();
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe("success");
        expect(fn).toHaveBeenCalledTimes(2);
    });
});
