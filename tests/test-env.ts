export const TEST_SUPABASE_JWT_SECRET = "test-jwt-secret"
export const TEST_GUEST_JWT_SECRET = "test-guest-jwt-secret"

export function ensureTestAuthEnvironment(env: NodeJS.ProcessEnv = process.env) {
	env.SUPABASE_JWT_SECRET ??= TEST_SUPABASE_JWT_SECRET
	env.GUEST_JWT_SECRET ??= TEST_GUEST_JWT_SECRET
}
