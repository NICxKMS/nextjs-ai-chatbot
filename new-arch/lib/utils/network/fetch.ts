/**
 * Result type for safe fetch operations.
 */
export type SafeFetchResult<T> = {
    data: T | null;
    error: Error | null;
};

/**
 * Performs a fetch that never throws, returning a result object instead.
 *
 * @param url - The URL to fetch
 * @param options - Standard fetch options
 * @returns Object with data or error
 *
 * @example
 * const { data, error } = await safeFetch<User>('/api/user');
 * if (error) console.error(error);
 * else console.log(data);
 */
export async function safeFetch<T>(
    url: string,
    options?: RequestInit
): Promise<SafeFetchResult<T>> {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error as Error };
    }
}

/**
 * Options for fetch with retry.
 */
export type FetchWithRetryOptions = RequestInit & {
    /** Number of retry attempts (default: 3) */
    retries?: number;
    /** Base delay between retries in ms (default: 1000) */
    delay?: number;
    /** Whether to use exponential backoff (default: true) */
    backoff?: boolean;
};

/**
 * Performs a fetch with automatic retry on failure.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options plus retry configuration
 * @returns The parsed JSON response
 * @throws Error after all retries are exhausted
 *
 * @example
 * const data = await fetchWithRetry<User>('/api/user', { retries: 5 });
 */
export async function fetchWithRetry<T>(
    url: string,
    options?: FetchWithRetryOptions
): Promise<T> {
    const {
        retries = 3,
        delay = 1000,
        backoff = true,
        ...fetchOptions
    } = options ?? {};

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await fetch(url, fetchOptions);
            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`
                );
            }
            return response.json();
        } catch (error) {
            lastError = error as Error;
            if (attempt < retries - 1) {
                const waitTime = backoff ? delay * 2 ** attempt : delay;
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
        }
    }

    throw lastError ?? new Error("Fetch failed after retries");
}

/**
 * Performs a fetch with a timeout.
 *
 * @param url - The URL to fetch
 * @param options - Standard fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns The fetch response
 * @throws Error if the request times out
 *
 * @example
 * const response = await fetchWithTimeout('/api/slow', {}, 5000);
 */
export async function fetchWithTimeout(
    url: string,
    options?: RequestInit,
    timeoutMs = 10_000
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new Error(`Request timed out after ${timeoutMs}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Performs a POST request with JSON body.
 *
 * @param url - The URL to post to
 * @param body - The body to send (will be JSON stringified)
 * @param options - Additional fetch options
 * @returns The parsed JSON response
 *
 * @example
 * const result = await postJSON<Response>('/api/submit', { name: 'John' });
 */
export async function postJSON<T>(
    url: string,
    body: unknown,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
        body: JSON.stringify(body),
        ...options,
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}
