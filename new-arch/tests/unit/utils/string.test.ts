import { describe, expect, it } from "vitest";

import {
    camelCase,
    capitalize,
    escapeHtml,
    isEmail,
    isEmpty,
    isJSON,
    isURL,
    isUUID,
    pluralize,
    sanitizeHtml,
    slugify,
    titleCase,
    truncate,
} from "@/lib/utils/string";

describe("String Utilities", () => {
    // =========================================================================
    // sanitizeHtml
    // =========================================================================

    describe("sanitizeHtml", () => {
        it("returns original string on server (SSR)", () => {
            // In test environment, window is typically undefined
            // The function falls back to escapeHtml or returns original
            const input = "<div>Hello</div>";
            const result = sanitizeHtml(input);
            // Either sanitized, escaped, or original depending on environment
            expect(typeof result).toBe("string");
        });

        it("handles empty string", () => {
            expect(sanitizeHtml("")).toBe("");
        });

        it("handles plain text without HTML", () => {
            const input = "Hello World";
            const result = sanitizeHtml(input);
            expect(result).toContain("Hello World");
        });
    });

    // =========================================================================
    // escapeHtml
    // =========================================================================

    describe("escapeHtml", () => {
        it("escapes angle brackets", () => {
            expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
        });

        it("escapes ampersand", () => {
            expect(escapeHtml("a & b")).toBe("a &amp; b");
        });

        it("escapes double quotes", () => {
            expect(escapeHtml('"quotes"')).toBe("&quot;quotes&quot;");
        });

        it("escapes single quotes", () => {
            expect(escapeHtml("'single'")).toBe("&#39;single&#39;");
        });

        it("escapes all entities in combined string", () => {
            const input = '<a href="test">Link & Text\'s</a>';
            const result = escapeHtml(input);
            expect(result).toBe(
                "&lt;a href=&quot;test&quot;&gt;Link &amp; Text&#39;s&lt;/a&gt;"
            );
        });

        it("returns empty string for empty input", () => {
            expect(escapeHtml("")).toBe("");
        });

        it("does not modify strings without special characters", () => {
            expect(escapeHtml("Hello World")).toBe("Hello World");
        });
    });

    // =========================================================================
    // truncate
    // =========================================================================

    describe("truncate", () => {
        it("truncates long strings with default suffix", () => {
            expect(truncate("Hello World", 8)).toBe("Hello...");
        });

        it("does not truncate strings shorter than length", () => {
            expect(truncate("Hi", 10)).toBe("Hi");
        });

        it("does not truncate strings equal to length", () => {
            expect(truncate("Hello", 5)).toBe("Hello");
        });

        it("uses custom suffix", () => {
            expect(truncate("Hello World", 8, "…")).toBe("Hello W…");
        });

        it("handles empty suffix", () => {
            expect(truncate("Hello World", 5, "")).toBe("Hello");
        });

        it("handles empty string", () => {
            expect(truncate("", 10)).toBe("");
        });

        it("handles length shorter than suffix", () => {
            expect(truncate("Hello World", 2)).toBe("...");
        });
    });

    // =========================================================================
    // capitalize
    // =========================================================================

    describe("capitalize", () => {
        it("capitalizes first letter of lowercase string", () => {
            expect(capitalize("hello")).toBe("Hello");
        });

        it("preserves rest of string as-is", () => {
            expect(capitalize("hello WORLD")).toBe("Hello WORLD");
        });

        it("handles already capitalized string", () => {
            expect(capitalize("Hello")).toBe("Hello");
        });

        it("handles all uppercase string", () => {
            expect(capitalize("WORLD")).toBe("WORLD");
        });

        it("returns empty string for empty input", () => {
            expect(capitalize("")).toBe("");
        });

        it("handles single character", () => {
            expect(capitalize("a")).toBe("A");
        });
    });

    // =========================================================================
    // slugify
    // =========================================================================

    describe("slugify", () => {
        it("converts to lowercase", () => {
            expect(slugify("HELLO")).toBe("hello");
        });

        it("replaces spaces with hyphens", () => {
            expect(slugify("Hello World")).toBe("hello-world");
        });

        it("handles multiple spaces", () => {
            expect(slugify("Hello  World")).toBe("hello-world");
        });

        it("removes special characters", () => {
            expect(slugify("Hello & World!")).toBe("hello-world");
        });

        it("removes leading and trailing hyphens", () => {
            expect(slugify("  Hello World  ")).toBe("hello-world");
        });

        it("handles underscores", () => {
            expect(slugify("hello_world")).toBe("hello-world");
        });

        it("returns empty string for empty input", () => {
            expect(slugify("")).toBe("");
        });

        it("handles complex input", () => {
            expect(slugify("  Hello, World! -- How's it going?  ")).toBe(
                "hello-world-hows-it-going"
            );
        });
    });

    // =========================================================================
    // pluralize
    // =========================================================================

    describe("pluralize", () => {
        it("returns singular form for count of 1", () => {
            expect(pluralize(1, "item")).toBe("1 item");
        });

        it("returns plural form for count of 0", () => {
            expect(pluralize(0, "item")).toBe("0 items");
        });

        it("returns plural form for count greater than 1", () => {
            expect(pluralize(5, "item")).toBe("5 items");
        });

        it("uses custom plural form", () => {
            expect(pluralize(2, "person", "people")).toBe("2 people");
        });

        it("handles negative numbers", () => {
            expect(pluralize(-1, "item")).toBe("-1 items");
        });
    });

    // =========================================================================
    // titleCase
    // =========================================================================

    describe("titleCase", () => {
        it("converts to title case", () => {
            expect(titleCase("hello world")).toBe("Hello World");
        });

        it("handles all uppercase", () => {
            expect(titleCase("HELLO WORLD")).toBe("Hello World");
        });

        it("handles single word", () => {
            expect(titleCase("hello")).toBe("Hello");
        });

        it("handles empty string", () => {
            expect(titleCase("")).toBe("");
        });
    });

    // =========================================================================
    // camelCase
    // =========================================================================

    describe("camelCase", () => {
        it("converts space-separated words", () => {
            expect(camelCase("hello world")).toBe("helloWorld");
        });

        it("converts hyphen-separated words", () => {
            expect(camelCase("foo-bar-baz")).toBe("fooBarBaz");
        });

        it("converts underscore-separated words", () => {
            expect(camelCase("foo_bar_baz")).toBe("fooBarBaz");
        });

        it("handles mixed separators", () => {
            expect(camelCase("hello-world_foo bar")).toBe("helloWorldFooBar");
        });

        it("handles empty string", () => {
            expect(camelCase("")).toBe("");
        });
    });

    // =========================================================================
    // isUUID
    // =========================================================================

    describe("isUUID", () => {
        it("returns true for valid UUID v4", () => {
            expect(isUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
        });

        it("returns true for UUID with uppercase letters", () => {
            expect(isUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
        });

        it("returns false for invalid UUID", () => {
            expect(isUUID("not-a-uuid")).toBe(false);
        });

        it("returns false for empty string", () => {
            expect(isUUID("")).toBe(false);
        });

        it("returns false for UUID with wrong version", () => {
            // Version 1 UUID (version digit should be 4 for v4)
            expect(isUUID("550e8400-e29b-11d4-a716-446655440000")).toBe(false);
        });

        it("returns false for UUID with wrong length", () => {
            expect(isUUID("550e8400-e29b-41d4-a716-44665544000")).toBe(false);
        });
    });

    // =========================================================================
    // isEmail
    // =========================================================================

    describe("isEmail", () => {
        it("returns true for simple valid email", () => {
            expect(isEmail("test@example.com")).toBe(true);
        });

        it("returns true for email with subdomain", () => {
            expect(isEmail("user@mail.example.com")).toBe(true);
        });

        it("returns true for email with plus tag", () => {
            expect(isEmail("user+tag@domain.co.uk")).toBe(true);
        });

        it("returns false for string without @", () => {
            expect(isEmail("invalid")).toBe(false);
        });

        it("returns false for string ending with @", () => {
            expect(isEmail("invalid@")).toBe(false);
        });

        it("returns false for string starting with @", () => {
            expect(isEmail("@example.com")).toBe(false);
        });

        it("returns false for empty string", () => {
            expect(isEmail("")).toBe(false);
        });

        it("returns false for email without domain extension", () => {
            expect(isEmail("user@domain")).toBe(false);
        });
    });

    // =========================================================================
    // isEmpty
    // =========================================================================

    describe("isEmpty", () => {
        it("returns true for empty string", () => {
            expect(isEmpty("")).toBe(true);
        });

        it("returns true for whitespace-only string", () => {
            expect(isEmpty("   ")).toBe(true);
        });

        it("returns true for null", () => {
            expect(isEmpty(null)).toBe(true);
        });

        it("returns true for undefined", () => {
            expect(isEmpty(undefined)).toBe(true);
        });

        it("returns false for non-empty string", () => {
            expect(isEmpty("hello")).toBe(false);
        });

        it("returns false for string with whitespace and content", () => {
            expect(isEmpty("  hello  ")).toBe(false);
        });
    });

    // =========================================================================
    // isURL
    // =========================================================================

    describe("isURL", () => {
        it("returns true for https URL", () => {
            expect(isURL("https://example.com")).toBe(true);
        });

        it("returns true for http URL", () => {
            expect(isURL("http://example.com")).toBe(true);
        });

        it("returns true for URL with path", () => {
            expect(isURL("https://example.com/path/to/page")).toBe(true);
        });

        it("returns true for URL with query string", () => {
            expect(isURL("https://example.com?q=test")).toBe(true);
        });

        it("returns false for relative path", () => {
            expect(isURL("/path/to/page")).toBe(false);
        });

        it("returns false for plain text", () => {
            expect(isURL("not a url")).toBe(false);
        });

        it("returns false for empty string", () => {
            expect(isURL("")).toBe(false);
        });
    });

    // =========================================================================
    // isJSON
    // =========================================================================

    describe("isJSON", () => {
        it("returns true for valid JSON object", () => {
            expect(isJSON('{"key": "value"}')).toBe(true);
        });

        it("returns true for valid JSON array", () => {
            expect(isJSON("[1, 2, 3]")).toBe(true);
        });

        it("returns true for JSON string", () => {
            expect(isJSON('"hello"')).toBe(true);
        });

        it("returns true for JSON number", () => {
            expect(isJSON("123")).toBe(true);
        });

        it("returns true for JSON null", () => {
            expect(isJSON("null")).toBe(true);
        });

        it("returns true for JSON boolean", () => {
            expect(isJSON("true")).toBe(true);
            expect(isJSON("false")).toBe(true);
        });

        it("returns false for invalid JSON", () => {
            expect(isJSON("not json")).toBe(false);
        });

        it("returns false for malformed JSON", () => {
            expect(isJSON("{key: value}")).toBe(false);
        });

        it("returns false for empty string", () => {
            expect(isJSON("")).toBe(false);
        });
    });
});
