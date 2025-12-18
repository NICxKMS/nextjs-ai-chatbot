/**
 * Regex to check if a URL is absolute (has a protocol)
 */
const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

/**
 * Regex patterns for URL segment trimming
 */
const TRAILING_SLASHES_REGEX = /\/+$/;
const LEADING_SLASHES_REGEX = /^\/+/;
const SURROUNDING_SLASHES_REGEX = /^\/+|\/+$/g;
const QUERY_HASH_SPLIT_REGEX = /[?#]/;

/**
 * Builds a URL with query parameters.
 *
 * @param base - The base URL
 * @param params - Object of query parameters (null/undefined values are omitted)
 * @returns The complete URL string
 *
 * @example
 * buildUrl('/api/search', { q: 'hello', page: 1 })
 * // '/api/search?q=hello&page=1'
 */
export function buildUrl(
    base: string,
    params?: Record<string, string | number | boolean | null | undefined>
): string {
    if (!params) {
        return base;
    }

    const url = new URL(base, "http://placeholder");
    for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined) {
            url.searchParams.set(key, String(value));
        }
    }

    // Return just the pathname + search if base was relative
    if (!base.startsWith("http")) {
        return url.pathname + url.search;
    }

    return url.toString();
}

/**
 * Parses a query string into an object.
 *
 * @param queryString - The query string to parse (with or without leading ?)
 * @returns Object of key-value pairs
 *
 * @example
 * parseQueryString('?q=hello&page=1')
 * // { q: 'hello', page: '1' }
 */
export function parseQueryString(queryString: string): Record<string, string> {
    const result: Record<string, string> = {};
    const params = new URLSearchParams(queryString);

    for (const [key, value] of params) {
        result[key] = value;
    }

    return result;
}

/**
 * Checks if a URL is absolute (has a protocol).
 *
 * @param url - The URL to check
 * @returns True if the URL is absolute
 *
 * @example
 * isAbsoluteUrl('https://example.com') // true
 * isAbsoluteUrl('/path/to/page') // false
 */
export function isAbsoluteUrl(url: string): boolean {
    return ABSOLUTE_URL_REGEX.test(url);
}

/**
 * Joins URL path segments, handling slashes correctly.
 *
 * @param segments - URL segments to join
 * @returns Joined URL path
 *
 * @example
 * joinUrl('api', 'users', '123') // 'api/users/123'
 * joinUrl('/api/', '/users/', '/123') // '/api/users/123'
 */
export function joinUrl(...segments: string[]): string {
    return segments
        .map((segment, index) => {
            if (index === 0) {
                return segment.replace(TRAILING_SLASHES_REGEX, "");
            }
            if (index === segments.length - 1) {
                return segment.replace(LEADING_SLASHES_REGEX, "");
            }
            return segment.replace(SURROUNDING_SLASHES_REGEX, "");
        })
        .filter(Boolean)
        .join("/");
}

/**
 * Gets the domain from a URL.
 *
 * @param url - The URL to extract domain from
 * @returns The domain or null if invalid
 *
 * @example
 * getDomain('https://www.example.com/path') // 'www.example.com'
 */
export function getDomain(url: string): string | null {
    try {
        const parsed = new URL(url);
        return parsed.hostname;
    } catch {
        return null;
    }
}

/**
 * Removes query string and hash from a URL.
 *
 * @param url - The URL to clean
 * @returns URL without query string or hash
 *
 * @example
 * stripQueryString('https://example.com/path?q=1#section')
 * // 'https://example.com/path'
 */
export function stripQueryString(url: string): string {
    try {
        const parsed = new URL(url, "http://placeholder");
        const result = parsed.origin + parsed.pathname;
        return url.startsWith("http") ? result : parsed.pathname;
    } catch {
        return url.split(QUERY_HASH_SPLIT_REGEX)[0] ?? url;
    }
}
