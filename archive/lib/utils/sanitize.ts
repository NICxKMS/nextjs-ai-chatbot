/**
 * Input Sanitization Utilities
 *
 * Provides functions for sanitizing user input to prevent XSS and other injection attacks.
 *
 * @module lib/utils/sanitize
 */

/**
 * Basic text sanitization - removes potential script injections.
 * For use in contexts where HTML will be escaped by React.
 *
 * @param text - Raw user input text
 * @returns Sanitized text safe for display
 */
export function sanitizeText(text: string): string {
    if (typeof text !== "string") {
        return "";
    }

    return (
        text
            // Remove function call markers that could interfere with rendering
            .replace(/<has_function_call>/gi, "")
            // Remove potential script tags
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            // Remove javascript: protocol
            .replace(/javascript:/gi, "")
            // Remove data: protocol (except for safe image types)
            .replace(
                /data:(?!image\/(png|jpeg|gif|webp|svg\+xml))/gi,
                "data-blocked:"
            )
    );
}

/**
 * Sanitize a string for use in a URL parameter.
 * Encodes special characters to prevent injection.
 *
 * @param value - Raw value to encode
 * @returns URL-safe encoded string
 */
export function sanitizeUrlParam(value: string): string {
    if (typeof value !== "string") {
        return "";
    }

    return encodeURIComponent(value);
}

/**
 * Sanitize a filename to prevent path traversal attacks.
 *
 * @param filename - Raw filename from user input
 * @returns Safe filename without path traversal characters
 */
export function sanitizeFilename(filename: string): string {
    if (typeof filename !== "string") {
        return "";
    }

    return (
        filename
            // Remove path traversal attempts
            .replace(/\.\./g, "")
            .replace(/[/\\]/g, "_")
            // Remove null bytes
            .replace(/\0/g, "")
            // Limit length
            .slice(0, 255)
    );
}

/**
 * Validate and sanitize a UUID string.
 *
 * @param id - String that should be a UUID
 * @returns The UUID if valid, null otherwise
 */
export function sanitizeUUID(id: unknown): string | null {
    if (typeof id !== "string") {
        return null;
    }

    const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidPattern.test(id)) {
        return id.toLowerCase();
    }

    return null;
}

/**
 * Type guard to check if a value is a non-empty string.
 *
 * @param value - Value to check
 * @returns True if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

/**
 * Type guard to check if a value is a valid positive integer.
 *
 * @param value - Value to check
 * @returns True if value is a positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
    return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value > 0 &&
        Number.isFinite(value)
    );
}

// =============================================================================
// OUTPUT ENCODING (P3-031)
// =============================================================================

/**
 * HTML entity map for escaping special characters.
 * Prevents XSS by encoding characters that have special meaning in HTML.
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
};

/**
 * Regex pattern matching HTML special characters.
 */
const HTML_ESCAPE_REGEX = /[&<>"'`=/]/g;

/**
 * Escape HTML special characters to prevent XSS attacks.
 * Use this when inserting user content into HTML contexts.
 *
 * Note: React automatically escapes content in JSX, so this is primarily
 * for non-React contexts (e.g., dangerouslySetInnerHTML, server-side rendering,
 * email templates, or raw HTML string manipulation).
 *
 * @param text - Raw text to escape
 * @returns HTML-safe escaped string
 *
 * @example
 * ```ts
 * const userInput = '<script>alert("XSS")</script>';
 * const safe = escapeHtml(userInput);
 * // Returns: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(text: string): string {
    if (typeof text !== "string") {
        return "";
    }

    return text.replace(
        HTML_ESCAPE_REGEX,
        (char) => HTML_ESCAPE_MAP[char] ?? char
    );
}

/**
 * Escape text for use in HTML attributes.
 * More aggressive escaping for attribute contexts.
 *
 * @param value - Raw value to escape
 * @returns Attribute-safe escaped string
 */
export function escapeHtmlAttribute(value: string): string {
    if (typeof value !== "string") {
        return "";
    }

    // Escape HTML entities and remove any control characters
    return escapeHtml(value).replace(/[\x00-\x1f\x7f]/g, "");
}

/**
 * Sanitize user input and escape for safe HTML output.
 * Combines input sanitization with output encoding.
 *
 * @param text - Raw user input
 * @returns Sanitized and HTML-escaped string
 */
export function sanitizeAndEscape(text: string): string {
    return escapeHtml(sanitizeText(text));
}
