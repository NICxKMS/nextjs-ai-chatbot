import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

afterEach(() => {
	if (typeof document !== "undefined") {
		cleanup()
	}
})

if (typeof HTMLElement !== "undefined" && !HTMLElement.prototype.scrollIntoView) {
	Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
		value: vi.fn(),
		writable: true,
		configurable: true,
	})
}

if (typeof globalThis.ResizeObserver === "undefined") {
	class ResizeObserverMock {
		observe() {
			return undefined
		}

		unobserve() {
			return undefined
		}

		disconnect() {
			return undefined
		}
	}

	Object.defineProperty(globalThis, "ResizeObserver", {
		value: ResizeObserverMock,
		writable: true,
		configurable: true,
	})
}

// `server-only` throws outside Next.js React Server runtime.
// In Vitest we treat it as a no-op marker.
vi.mock("server-only", () => ({}))

// Mock environment variables for test context
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test"
process.env.CACHE_KV_REST_API_URL = "http://localhost:6379"
process.env.CACHE_KV_REST_API_TOKEN = "test-token"
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
process.env.SUPABASE_JWT_SECRET = "test-jwt-secret"
process.env.GUEST_JWT_SECRET = "test-guest-jwt-secret"
process.env.OPENAI_API_KEY = "test-openai-key"
process.env.BLOB_READ_WRITE_TOKEN = "test-blob-token"
