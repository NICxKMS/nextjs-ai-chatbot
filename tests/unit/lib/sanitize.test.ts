/**
 * Sanitization Utilities Tests
 *
 * Tests for input sanitization and output encoding functions.
 *
 * @module tests/unit/lib/sanitize.test.ts
 */

import { describe, expect, it } from "vitest";
import {
    escapeHtml,
    escapeHtmlAttribute,
    isNonEmptyString,
    isPositiveInteger,
    sanitizeAndEscape,
    sanitizeFilename,
    sanitizeText,
    sanitizeUrlParam,
    sanitizeUUID,
} from "@/lib/utils/sanitize";

describe("Sanitization Utilities", () => {
    describe("sanitizeText", () => {
        it("should return empty string for non-string input", () => {
            // @ts-expect-error Testing invalid input
            expect(sanitizeText(null)).toBe("");
            // @ts-expect-error Testing invalid input
            expect(sanitizeText(undefined)).toBe("");
            // @ts-expect-error Testing invalid input
            expect(sanitizeText(123)).toBe("");
        });

        it("should remove script tags", () => {
            const input = 'Hello <script>alert("XSS")</script> World';
            expect(sanitizeText(input)).toBe("Hello  World");
        });

        it("should remove javascript: protocol", () => {
            const input = "Click <a href='javascript:alert(1)'>here</a>";
            expect(sanitizeText(input)).toBe(
                "Click <a href='alert(1)'>here</a>"
            );
        });

        it("should block non-image data URIs", () => {
            const input = "data:text/html,<script>alert(1)</script>";
            const result = sanitizeText(input);
            // Script tags are removed by sanitizeText, and data: becomes data-blocked:
            expect(result).toContain("data-blocked:");
            expect(result).not.toContain("<script>");
        });

        it("should allow safe image data URIs", () => {
            const input = "data:image/png,base64data";
            expect(sanitizeText(input)).toBe("data:image/png,base64data");
        });
    });

    describe("escapeHtml (P3-031)", () => {
        it("should return empty string for non-string input", () => {
            // @ts-expect-error Testing invalid input
            expect(escapeHtml(null)).toBe("");
            // @ts-expect-error Testing invalid input
            expect(escapeHtml(undefined)).toBe("");
        });

        it("should escape HTML special characters", () => {
            const input = '<script>alert("XSS")</script>';
            // Forward slashes are also escaped
            const expected =
                "&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;";
            expect(escapeHtml(input)).toBe(expected);
        });

        it("should escape ampersands", () => {
            expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
        });

        it("should escape single quotes", () => {
            expect(escapeHtml("It's a test")).toBe("It&#x27;s a test");
        });

        it("should escape forward slashes", () => {
            expect(escapeHtml("path/to/file")).toBe("path&#x2F;to&#x2F;file");
        });

        it("should escape backticks and equals", () => {
            expect(escapeHtml("`value=test`")).toBe(
                "&#x60;value&#x3D;test&#x60;"
            );
        });

        it("should handle already safe strings", () => {
            const input = "Hello World 123";
            expect(escapeHtml(input)).toBe(input);
        });
    });

    describe("escapeHtmlAttribute", () => {
        it("should escape HTML and remove control characters", () => {
            const input = "value\x00with\x1fcontrol<chars>";
            const result = escapeHtmlAttribute(input);
            expect(result).not.toContain("\x00");
            expect(result).not.toContain("\x1f");
            expect(result).toContain("&lt;");
            expect(result).toContain("&gt;");
        });

        it("should return empty string for non-string input", () => {
            // @ts-expect-error Testing invalid input
            expect(escapeHtmlAttribute(123)).toBe("");
        });
    });

    describe("sanitizeAndEscape", () => {
        it("should sanitize input and then escape for HTML output", () => {
            const input = '<script>alert("XSS")</script>javascript:test';
            const result = sanitizeAndEscape(input);
            // Should not contain script tags (sanitized)
            expect(result).not.toContain("<script>");
            // Should not contain javascript: (sanitized)
            expect(result).not.toContain("javascript:");
        });
    });

    describe("sanitizeFilename", () => {
        it("should remove path traversal attempts", () => {
            expect(sanitizeFilename("../etc/passwd")).toBe("_etc_passwd");
            expect(sanitizeFilename("..\\windows\\system32")).toBe(
                "_windows_system32"
            );
        });

        it("should remove null bytes", () => {
            expect(sanitizeFilename("file\x00name.txt")).toBe("filename.txt");
        });

        it("should limit filename length", () => {
            const longName = `${"a".repeat(300)}.txt`;
            expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(255);
        });
    });

    describe("sanitizeUrlParam", () => {
        it("should encode special characters", () => {
            expect(sanitizeUrlParam("hello world")).toBe("hello%20world");
            expect(sanitizeUrlParam("a&b=c")).toBe("a%26b%3Dc");
        });

        it("should return empty string for non-string input", () => {
            // @ts-expect-error Testing invalid input
            expect(sanitizeUrlParam(123)).toBe("");
        });
    });

    describe("sanitizeUUID", () => {
        it("should return lowercase UUID for valid input", () => {
            const uuid = "550E8400-E29B-41D4-A716-446655440000";
            expect(sanitizeUUID(uuid)).toBe(uuid.toLowerCase());
        });

        it("should return null for invalid UUID", () => {
            expect(sanitizeUUID("not-a-uuid")).toBeNull();
            expect(sanitizeUUID("12345")).toBeNull();
        });

        it("should return null for non-string input", () => {
            expect(sanitizeUUID(123)).toBeNull();
            expect(sanitizeUUID(null)).toBeNull();
        });
    });

    describe("isNonEmptyString", () => {
        it("should return true for non-empty strings", () => {
            expect(isNonEmptyString("hello")).toBe(true);
            expect(isNonEmptyString("  content  ")).toBe(true);
        });

        it("should return false for empty or whitespace strings", () => {
            expect(isNonEmptyString("")).toBe(false);
            expect(isNonEmptyString("   ")).toBe(false);
            expect(isNonEmptyString("\t\n")).toBe(false);
        });

        it("should return false for non-string values", () => {
            expect(isNonEmptyString(null)).toBe(false);
            expect(isNonEmptyString(undefined)).toBe(false);
            expect(isNonEmptyString(123)).toBe(false);
        });
    });

    describe("isPositiveInteger", () => {
        it("should return true for positive integers", () => {
            expect(isPositiveInteger(1)).toBe(true);
            expect(isPositiveInteger(100)).toBe(true);
            expect(isPositiveInteger(999_999)).toBe(true);
        });

        it("should return false for zero and negative numbers", () => {
            expect(isPositiveInteger(0)).toBe(false);
            expect(isPositiveInteger(-1)).toBe(false);
            expect(isPositiveInteger(-100)).toBe(false);
        });

        it("should return false for non-integers", () => {
            expect(isPositiveInteger(1.5)).toBe(false);
            expect(isPositiveInteger(0.1)).toBe(false);
        });

        it("should return false for non-numbers", () => {
            expect(isPositiveInteger("1")).toBe(false);
            expect(isPositiveInteger(null)).toBe(false);
            expect(isPositiveInteger(Number.POSITIVE_INFINITY)).toBe(false);
        });
    });
});
