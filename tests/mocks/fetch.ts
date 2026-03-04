import { type Mock, vi } from "vitest"

// ── Types ────────────────────────────────────────────────────

/** Configuration for a canned fetch response. */
export interface MockRoute {
	/** HTTP status code. Defaults to 200. */
	status?: number
	/** Response body. Objects are JSON-serialized; strings used as-is. */
	body?: unknown
	/** Response headers. Content-Type is set automatically for objects. */
	headers?: Record<string, string>
}

/** A route matcher: URL string (exact), RegExp, or predicate function. */
export type RouteMatcher = string | RegExp | ((url: string, init?: RequestInit) => boolean)

interface RegisteredRoute {
	matcher: RouteMatcher
	method: string | null
	response: MockRoute
	once: boolean
	called: boolean
}

// ── MockFetch class ──────────────────────────────────────────

/**
 * Interceptor for `globalThis.fetch` that returns canned responses
 * based on registered routes. Uses Vitest's `vi.fn()` under the hood
 * so you can assert on call counts, arguments, etc.
 *
 * @example
 * ```ts
 * const mockFetch = new MockFetch()
 *
 * mockFetch.on("GET", "/api/history", {
 *   body: [{ id: "chat-1", title: "Test Chat" }],
 * })
 *
 * mockFetch.on("POST", "/api/chat", {
 *   status: 200,
 *   body: "streaming response",
 * })
 *
 * // Install the mock
 * mockFetch.install()
 *
 * // Your code calls fetch("/api/history") → receives the canned response
 *
 * // Restore original fetch
 * mockFetch.restore()
 * ```
 */
export class MockFetch {
	private routes: RegisteredRoute[] = []
	private originalFetch: typeof globalThis.fetch | null = null
	private mockFn: Mock<typeof globalThis.fetch>
	private fallthrough: boolean

	/**
	 * @param options.fallthrough - If true, unmatched requests call the
	 *   original fetch. If false (default), unmatched requests throw.
	 */
	constructor(options?: { fallthrough?: boolean }) {
		this.fallthrough = options?.fallthrough ?? false
		this.mockFn = vi.fn<typeof globalThis.fetch>()

		this.mockFn.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.toString()
						: input.url
			const method = init?.method?.toUpperCase() ?? "GET"

			const match = this.findRoute(url, method, init)

			if (match) {
				match.called = true
				return buildResponse(match.response)
			}

			if (this.fallthrough && this.originalFetch) {
				return this.originalFetch(input, init)
			}

			throw new Error(
				`[MockFetch] No route registered for ${method} ${url}. ` +
					"Register a route with mockFetch.on() or enable fallthrough.",
			)
		})
	}

	/**
	 * Register a canned response for a URL pattern and HTTP method.
	 *
	 * @param method - HTTP method to match (e.g., "GET", "POST"), or "*" for any method.
	 * @param matcher - URL string (exact match), RegExp, or predicate function.
	 * @param response - The canned response configuration.
	 */
	on(method: string, matcher: RouteMatcher, response: MockRoute): this {
		this.routes.push({
			matcher,
			method: method === "*" ? null : method.toUpperCase(),
			response,
			once: false,
			called: false,
		})
		return this
	}

	/**
	 * Register a one-shot canned response. After the first match,
	 * the route is removed.
	 */
	once(method: string, matcher: RouteMatcher, response: MockRoute): this {
		this.routes.push({
			matcher,
			method: method === "*" ? null : method.toUpperCase(),
			response,
			once: true,
			called: false,
		})
		return this
	}

	/**
	 * Replace `globalThis.fetch` with the mock implementation.
	 * Call `restore()` to undo in afterEach.
	 */
	install(): void {
		this.originalFetch = globalThis.fetch
		globalThis.fetch = this.mockFn as unknown as typeof globalThis.fetch
	}

	/**
	 * Restore the original `globalThis.fetch`.
	 */
	restore(): void {
		if (this.originalFetch) {
			globalThis.fetch = this.originalFetch
			this.originalFetch = null
		}
	}

	/**
	 * Clear all registered routes and reset the mock function.
	 */
	reset(): void {
		this.routes = []
		this.mockFn.mockClear()
	}

	/**
	 * Access the underlying Vitest mock for assertions.
	 *
	 * @example
	 * ```ts
	 * expect(mockFetch.mock).toHaveBeenCalledTimes(2)
	 * expect(mockFetch.mock).toHaveBeenCalledWith("/api/chat", expect.anything())
	 * ```
	 */
	get mock(): Mock<typeof globalThis.fetch> {
		return this.mockFn
	}

	// ── Private ────────────────────────────────────────────────

	private findRoute(url: string, method: string, init?: RequestInit): RegisteredRoute | null {
		const index = this.routes.findIndex((route) => {
			// Check method
			if (route.method && route.method !== method) return false

			// Check URL matcher
			if (typeof route.matcher === "string")
				return url === route.matcher || url.endsWith(route.matcher)
			if (route.matcher instanceof RegExp) return route.matcher.test(url)
			return route.matcher(url, init)
		})

		if (index === -1) return null

		const route = this.routes[index]
		if (!route) return null

		// Remove one-shot routes after matching
		if (route.once) {
			this.routes.splice(index, 1)
		}

		return route
	}
}

// ── Response builder ─────────────────────────────────────────

function buildResponse(config: MockRoute): Response {
	const status = config.status ?? 200
	const headers = new Headers(config.headers)

	let body: BodyInit | null = null

	if (config.body !== undefined && config.body !== null) {
		if (typeof config.body === "string") {
			body = config.body
			if (!headers.has("Content-Type")) {
				headers.set("Content-Type", "text/plain")
			}
		} else {
			body = JSON.stringify(config.body)
			if (!headers.has("Content-Type")) {
				headers.set("Content-Type", "application/json")
			}
		}
	}

	return new Response(body, { status, headers })
}

// ── Convenience factory ──────────────────────────────────────

/**
 * Create a MockFetch instance, install it, and return it.
 * Shorthand for `const mf = new MockFetch(); mf.install(); return mf`.
 *
 * @example
 * ```ts
 * let mockFetch: MockFetch
 *
 * beforeEach(() => {
 *   mockFetch = installMockFetch()
 *   mockFetch.on("GET", "/api/history", { body: [] })
 * })
 *
 * afterEach(() => {
 *   mockFetch.restore()
 * })
 * ```
 */
export function installMockFetch(options?: { fallthrough?: boolean }): MockFetch {
	const mf = new MockFetch(options)
	mf.install()
	return mf
}
