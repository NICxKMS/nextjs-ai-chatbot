import "@testing-library/jest-dom/vitest"
import { afterEach, vi } from "vitest"

// Restore all mocks after each test to prevent cross-test contamination
afterEach(() => {
	vi.restoreAllMocks()
})

// Common environment variables for test runs
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test"
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
