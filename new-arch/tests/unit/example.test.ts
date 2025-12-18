/**
 * Example Unit Test
 *
 * This file demonstrates testing patterns and best practices
 * for the new-arch testing infrastructure.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    collectStream,
    createMockTextStream,
    createTestChat,
    createTestMessage,
    createTestUser,
    testUsers,
} from "../fixtures";
import {
    assertDefined,
    createJsonRequest,
    createMockRequest,
    delay,
    expectAsyncError,
    normalizeForSnapshot,
    ResourceTracker,
    randomEmail,
    randomString,
    retry,
    waitFor,
} from "../helpers";

// Regex constants for tests
const EMAIL_DOMAIN_REGEX = /@example\.com$/;
const EMAIL_FORMAT_REGEX = /^test-\w+@example\.com$/;
const ERROR_CODE_REGEX = /code: \d+/;

// =============================================================================
// Fixture Tests
// =============================================================================

describe("Test Fixtures", () => {
    describe("createTestUser", () => {
        it("should create a user with default values", () => {
            const user = createTestUser();

            expect(user).toHaveProperty("id");
            expect(user).toHaveProperty("email");
            expect(user).toHaveProperty("name", "Test User");
            expect(user).toHaveProperty("createdAt");
            expect(user.email).toMatch(EMAIL_DOMAIN_REGEX);
        });

        it("should allow overriding default values", () => {
            const user = createTestUser({
                name: "Custom Name",
                email: "custom@test.com",
            });

            expect(user.name).toBe("Custom Name");
            expect(user.email).toBe("custom@test.com");
        });

        it("should generate unique IDs", () => {
            const user1 = createTestUser();
            const user2 = createTestUser();

            expect(user1.id).not.toBe(user2.id);
        });
    });

    describe("createTestChat", () => {
        it("should create a chat with default messages", () => {
            const chat = createTestChat();

            expect(chat).toHaveProperty("id");
            expect(chat).toHaveProperty("title", "Test Chat");
            expect(chat.messages).toHaveLength(2);
            expect(chat.messages[0]?.role).toBe("user");
            expect(chat.messages[1]?.role).toBe("assistant");
        });

        it("should allow custom messages", () => {
            const customMessages = [
                createTestMessage({
                    role: "system",
                    content: "You are a helper",
                }),
                createTestMessage({ role: "user", content: "Help me" }),
            ];

            const chat = createTestChat({ messages: customMessages });

            expect(chat.messages).toHaveLength(2);
            expect(chat.messages[0]?.role).toBe("system");
        });
    });

    describe("testUsers", () => {
        it("should have predefined test users", () => {
            expect(testUsers.ada.name).toBe("Ada Lovelace");
            expect(testUsers.babbage.name).toBe("Charles Babbage");
            expect(testUsers.curie.name).toBe("Marie Curie");
        });
    });

    describe("createMockTextStream", () => {
        it("should create a readable stream from chunks", async () => {
            const chunks = ["Hello", " ", "World", "!"];
            const stream = createMockTextStream(chunks);
            const result = await collectStream(stream);

            expect(result).toBe("Hello World!");
        });

        it("should handle empty chunks array", async () => {
            const stream = createMockTextStream([]);
            const result = await collectStream(stream);

            expect(result).toBe("");
        });
    });
});

// =============================================================================
// Helper Tests
// =============================================================================

describe("Test Helpers", () => {
    describe("waitFor", () => {
        it("should resolve when condition becomes true", async () => {
            let flag = false;
            setTimeout(() => {
                flag = true;
            }, 50);

            await expect(waitFor(() => flag)).resolves.toBeUndefined();
        });

        it("should timeout if condition never becomes true", async () => {
            await expect(
                waitFor(() => false, { timeout: 100 })
            ).rejects.toThrow("waitFor timed out");
        });
    });

    describe("delay", () => {
        it("should wait for specified milliseconds", async () => {
            const start = Date.now();
            await delay(50);
            const elapsed = Date.now() - start;

            expect(elapsed).toBeGreaterThanOrEqual(45);
        });
    });

    describe("retry", () => {
        it("should succeed on first attempt if no error", async () => {
            const fn = vi.fn().mockResolvedValue("success");

            const result = await retry(fn);

            expect(result).toBe("success");
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it("should retry on failure", async () => {
            const fn = vi
                .fn()
                .mockRejectedValueOnce(new Error("fail"))
                .mockResolvedValueOnce("success");

            const result = await retry(fn, { delay: 10 });

            expect(result).toBe("success");
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it("should throw after max attempts", async () => {
            const fn = vi.fn().mockRejectedValue(new Error("always fails"));

            await expect(
                retry(fn, { maxAttempts: 3, delay: 10 })
            ).rejects.toThrow("always fails");

            expect(fn).toHaveBeenCalledTimes(3);
        });
    });

    describe("createMockRequest", () => {
        it("should create a request with default GET method", () => {
            const request = createMockRequest("https://api.test.com/users");

            expect(request.method).toBe("GET");
            expect(request.url).toBe("https://api.test.com/users");
            expect(request.headers.get("Content-Type")).toBe(
                "application/json"
            );
        });

        it("should allow custom options", () => {
            const request = createMockRequest("https://api.test.com/users", {
                method: "DELETE",
                headers: { Authorization: "Bearer token" },
            });

            expect(request.method).toBe("DELETE");
            expect(request.headers.get("Authorization")).toBe("Bearer token");
        });
    });

    describe("createJsonRequest", () => {
        it("should create a POST request with JSON body", async () => {
            const body = { name: "Test", value: 42 };
            const request = createJsonRequest(
                "https://api.test.com/data",
                body
            );

            expect(request.method).toBe("POST");
            expect(request.headers.get("Content-Type")).toBe(
                "application/json"
            );

            const parsedBody = await request.json();
            expect(parsedBody).toEqual(body);
        });
    });

    describe("expectAsyncError", () => {
        it("should catch and return the error", async () => {
            const error = await expectAsyncError(() => {
                throw new Error("Test error");
            });

            expect(error.message).toBe("Test error");
        });

        it("should validate error message with string", async () => {
            await expectAsyncError(() => {
                throw new Error("Something went wrong");
            }, "went wrong");
        });

        it("should validate error message with regex", async () => {
            await expectAsyncError(() => {
                throw new Error("Error code: 404");
            }, ERROR_CODE_REGEX);
        });

        it("should throw if function does not throw", async () => {
            const error = await expectAsyncError(async () => "no error").catch(
                (e) => e
            );

            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe(
                "Expected function to throw an error"
            );
        });
    });

    describe("assertDefined", () => {
        it("should not throw for defined values", () => {
            expect(() => assertDefined("value")).not.toThrow();
            expect(() => assertDefined(0)).not.toThrow();
            expect(() => assertDefined(false)).not.toThrow();
            expect(() => assertDefined({})).not.toThrow();
        });

        it("should throw for null", () => {
            expect(() => assertDefined(null)).toThrow(
                "Expected value to be defined"
            );
        });

        it("should throw for undefined", () => {
            expect(() => assertDefined(undefined)).toThrow(
                "Expected value to be defined"
            );
        });

        it("should use custom message", () => {
            expect(() => assertDefined(null, "User not found")).toThrow(
                "User not found"
            );
        });
    });

    describe("randomString", () => {
        it("should generate string of specified length", () => {
            expect(randomString(5)).toHaveLength(5);
            expect(randomString(20)).toHaveLength(20);
        });

        it("should generate unique strings", () => {
            const strings = new Set(
                Array.from({ length: 100 }, () => randomString())
            );
            expect(strings.size).toBe(100);
        });
    });

    describe("randomEmail", () => {
        it("should generate valid email format", () => {
            const email = randomEmail();
            expect(email).toMatch(EMAIL_FORMAT_REGEX);
        });
    });

    describe("ResourceTracker", () => {
        it("should track and cleanup resources", async () => {
            const tracker = new ResourceTracker();
            const cleanupFn1 = vi.fn();
            const cleanupFn2 = vi.fn();

            tracker.track(cleanupFn1);
            tracker.track(cleanupFn2);

            await tracker.cleanup();

            expect(cleanupFn1).toHaveBeenCalled();
            expect(cleanupFn2).toHaveBeenCalled();
        });

        it("should cleanup in reverse order", async () => {
            const tracker = new ResourceTracker();
            const order: number[] = [];

            tracker.track(() => {
                order.push(1);
            });
            tracker.track(() => {
                order.push(2);
            });
            tracker.track(() => {
                order.push(3);
            });

            await tracker.cleanup();

            expect(order).toEqual([3, 2, 1]);
        });
    });

    describe("normalizeForSnapshot", () => {
        it("should remove specified fields", () => {
            const data = {
                id: "123",
                name: "Test",
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const normalized = normalizeForSnapshot(data);

            expect(normalized).not.toHaveProperty("id");
            expect(normalized).not.toHaveProperty("createdAt");
            expect(normalized).not.toHaveProperty("updatedAt");
            expect(normalized).toHaveProperty("name", "Test");
        });

        it("should allow custom fields to remove", () => {
            const data = {
                id: "123",
                secret: "sensitive",
                name: "Test",
            };

            const normalized = normalizeForSnapshot(data, ["secret"]);

            expect(normalized).toHaveProperty("id");
            expect(normalized).not.toHaveProperty("secret");
            expect(normalized).toHaveProperty("name");
        });
    });
});

// =============================================================================
// Pattern Examples
// =============================================================================

describe("Testing Patterns", () => {
    describe("Mock and Spy Pattern", () => {
        it("should demonstrate mocking", () => {
            const mockFn = vi.fn((x: number) => x * 2);

            expect(mockFn(5)).toBe(10);
            expect(mockFn).toHaveBeenCalledWith(5);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it("should demonstrate spy on object method", () => {
            const obj = {
                getValue: () => 42,
            };

            const spy = vi.spyOn(obj, "getValue").mockReturnValue(100);

            expect(obj.getValue()).toBe(100);
            expect(spy).toHaveBeenCalled();

            spy.mockRestore();
            expect(obj.getValue()).toBe(42);
        });
    });

    describe("Setup and Teardown Pattern", () => {
        let tracker: ResourceTracker;

        beforeEach(() => {
            tracker = new ResourceTracker();
        });

        afterEach(async () => {
            await tracker.cleanup();
        });

        it("should use tracker for cleanup", () => {
            const cleanup = vi.fn();
            tracker.track(cleanup);

            // Test logic here...

            // Cleanup happens automatically in afterEach
        });
    });

    describe("Async Testing Pattern", () => {
        it("should test async functions", async () => {
            const asyncFn = async () => {
                await delay(10);
                return "result";
            };

            const result = await asyncFn();
            expect(result).toBe("result");
        });

        it("should test async errors", () => {
            const asyncFn = () => {
                throw new Error("Async error");
            };

            expect(asyncFn).toThrow("Async error");
        });
    });

    describe("Parameterized Tests Pattern", () => {
        it.each([
            [1, 1, 2],
            [2, 3, 5],
            [10, 20, 30],
        ])("should add %i + %i = %i", (a, b, expected) => {
            expect(a + b).toBe(expected);
        });

        it.each`
            input      | expected
            ${"hello"} | ${5}
            ${""}      | ${0}
            ${"test"}  | ${4}
        `(
            "should return length $expected for '$input'",
            ({ input, expected }) => {
                expect(input.length).toBe(expected);
            }
        );
    });
});
