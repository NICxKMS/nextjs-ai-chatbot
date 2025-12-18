// DOMPurify is an optional dependency - sanitization is client-side only
type DOMPurifyLike = { sanitize: (html: string) => string };
let purify: DOMPurifyLike | null = null;

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Uses DOMPurify for thorough sanitization.
 * Returns the original string on the server (SSR).
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 *
 * @example
 * const safe = sanitizeHtml('<script>alert("xss")</script><p>Hello</p>');
 * // Returns: '<p>Hello</p>'
 */
export function sanitizeHtml(html: string): string {
    if (typeof window === "undefined") {
        return html;
    }

    // Lazy load DOMPurify on first use (client-side only)
    if (!purify) {
        try {
            // Dynamic import for optional dependency
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            purify = require("dompurify");
        } catch {
            // DOMPurify not available, return escaped HTML as fallback
            return escapeHtml(html);
        }
    }

    return purify?.sanitize(html) ?? escapeHtml(html);
}

/**
 * Escapes HTML special characters to prevent injection.
 * Use this when you need to display user input as plain text.
 *
 * @param str - The string to escape
 * @returns Escaped string safe for HTML display
 *
 * @example
 * escapeHtml('<script>') // '&lt;script&gt;'
 */
export function escapeHtml(str: string): string {
    const map: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    };
    return str.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

/**
 * Truncates a string to a maximum length, adding a suffix if truncated.
 *
 * @param str - The string to truncate
 * @param length - Maximum length including suffix
 * @param suffix - The suffix to append if truncated (default: '...')
 * @returns Truncated string
 *
 * @example
 * truncate('Hello World', 8) // 'Hello...'
 * truncate('Hi', 10) // 'Hi'
 */
export function truncate(str: string, length: number, suffix = "..."): string {
    if (str.length <= length) {
        return str;
    }
    return str.slice(0, length - suffix.length) + suffix;
}
