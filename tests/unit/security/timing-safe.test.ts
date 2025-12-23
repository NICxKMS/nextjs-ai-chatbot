/**
 * TEST-001: Timing-Safe Comparison Tests
 *
 * Tests for SEC-005 constant-time string comparison utilities.
 * These tests verify correctness, not timing properties (true timing-safety
 * is difficult to test programmatically).
 *
 * @module tests/unit/security/timing-safe.test.ts
 */
import { describe, expect, it } from "vitest";
import {
    constantTimeEqual,
    constantTimeEqualOptional,
} from "@/lib/utils/timing-safe";

describe("SEC-005: Timing Safe Comparisons", () => {
    describe("constantTimeEqual", () => {
        it("should return true for equal strings", () => {
            expect(constantTimeEqual("hello", "hello")).toBe(true);
            expect(constantTimeEqual("test123", "test123")).toBe(true);
            expect(constantTimeEqual("a", "a")).toBe(true);
        });

        it("should return false for different strings", () => {
            expect(constantTimeEqual("hello", "world")).toBe(false);
            expect(constantTimeEqual("test123", "test456")).toBe(false);
            expect(constantTimeEqual("abc", "abd")).toBe(false);
        });

        it("should return false for different lengths", () => {
            expect(constantTimeEqual("hello", "hello!")).toBe(false);
            expect(constantTimeEqual("short", "muchlonger")).toBe(false);
            expect(constantTimeEqual("a", "aa")).toBe(false);
        });

        it("should work with empty strings", () => {
            expect(constantTimeEqual("", "")).toBe(true);
            expect(constantTimeEqual("", "a")).toBe(false);
            expect(constantTimeEqual("a", "")).toBe(false);
        });

        it("should work with unicode strings", () => {
            expect(constantTimeEqual("こんにちは", "こんにちは")).toBe(true);
            expect(constantTimeEqual("🎉", "🎉")).toBe(true);
            expect(constantTimeEqual("αβγ", "αβγ")).toBe(true);
            expect(constantTimeEqual("こんにちは", "さようなら")).toBe(false);
            expect(constantTimeEqual("🎉", "🎊")).toBe(false);
        });

        it("should work with mixed ASCII and unicode", () => {
            expect(constantTimeEqual("hello🌍", "hello🌍")).toBe(true);
            expect(constantTimeEqual("test日本語", "test日本語")).toBe(true);
            expect(constantTimeEqual("hello🌍", "hello🌎")).toBe(false);
        });

        it("should handle whitespace correctly", () => {
            expect(constantTimeEqual(" hello ", " hello ")).toBe(true);
            expect(constantTimeEqual("hello", " hello")).toBe(false);
            expect(constantTimeEqual("hello ", "hello")).toBe(false);
            expect(constantTimeEqual("  ", "  ")).toBe(true);
            expect(constantTimeEqual("  ", " ")).toBe(false);
        });

        it("should handle special characters", () => {
            expect(constantTimeEqual("!@#$%^&*()", "!@#$%^&*()")).toBe(true);
            expect(constantTimeEqual("line1\nline2", "line1\nline2")).toBe(
                true
            );
            expect(constantTimeEqual("tab\there", "tab\there")).toBe(true);
            expect(constantTimeEqual("null\0char", "null\0char")).toBe(true);
        });

        it("should handle hash-like strings (16 char hex)", () => {
            // These are typical fingerprint hashes from the codebase
            const hash1 = "a1b2c3d4e5f6a1b2";
            const hash2 = "a1b2c3d4e5f6a1b2";
            const hash3 = "a1b2c3d4e5f6a1b3"; // One char different

            expect(constantTimeEqual(hash1, hash2)).toBe(true);
            expect(constantTimeEqual(hash1, hash3)).toBe(false);
        });

        it("should handle case sensitivity", () => {
            expect(constantTimeEqual("Hello", "hello")).toBe(false);
            expect(constantTimeEqual("ABC", "abc")).toBe(false);
            expect(constantTimeEqual("Test123", "TEST123")).toBe(false);
        });
    });

    describe("constantTimeEqualOptional", () => {
        it("should return true when both are null", () => {
            expect(constantTimeEqualOptional(null, null)).toBe(true);
        });

        it("should return true when both are undefined", () => {
            expect(constantTimeEqualOptional(undefined, undefined)).toBe(true);
        });

        it("should return true when one is null and other is undefined", () => {
            expect(constantTimeEqualOptional(null, undefined)).toBe(true);
            expect(constantTimeEqualOptional(undefined, null)).toBe(true);
        });

        it("should return false when one is null/undefined and other has value", () => {
            expect(constantTimeEqualOptional(null, "test")).toBe(false);
            expect(constantTimeEqualOptional("test", null)).toBe(false);
            expect(constantTimeEqualOptional(undefined, "test")).toBe(false);
            expect(constantTimeEqualOptional("test", undefined)).toBe(false);
        });

        it("should compare equal strings correctly", () => {
            expect(constantTimeEqualOptional("hello", "hello")).toBe(true);
            expect(constantTimeEqualOptional("test123", "test123")).toBe(true);
        });

        it("should compare different strings correctly", () => {
            expect(constantTimeEqualOptional("hello", "world")).toBe(false);
            expect(constantTimeEqualOptional("abc", "def")).toBe(false);
        });

        it("should handle empty strings", () => {
            expect(constantTimeEqualOptional("", "")).toBe(true);
            expect(constantTimeEqualOptional("", null)).toBe(false);
            expect(constantTimeEqualOptional(null, "")).toBe(false);
        });
    });
});
