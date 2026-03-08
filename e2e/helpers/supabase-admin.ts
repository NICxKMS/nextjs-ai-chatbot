/**
 * Supabase Admin API helpers for E2E test user management.
 *
 * Uses the `service_role` key to bypass all rate limits and
 * auto-confirm email. This avoids Supabase's built-in signup
 * rate limiter that blocks parallel test worker registrations.
 *
 * Also provides `signInAndGetSession` to obtain a valid session
 * without going through the login form — no app-level rate limits.
 */

// ── Types ──────────────────────────────────────────────────────

interface SupabaseSession {
	access_token: string
	refresh_token: string
	expires_in: number
	expires_at: number
	token_type: string
	user: {
		id: string
		email: string
		[key: string]: unknown
	}
}

function getAdminConfig() {
	const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

	if (!supabaseUrl || !serviceRoleKey) {
		throw new Error(
			"Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — required for E2E test user creation",
		)
	}

	return { supabaseUrl, serviceRoleKey }
}

/**
 * Create a test user via the Supabase Admin API.
 *
 * @param email - The email for the test user.
 * @param password - The password for the test user.
 * @returns The created user's ID.
 */
export async function createUserViaAdmin(email: string, password: string): Promise<string> {
	const { supabaseUrl, serviceRoleKey } = getAdminConfig()

	const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${serviceRoleKey}`,
			apikey: serviceRoleKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			email,
			password,
			email_confirm: true,
		}),
	})

	if (!response.ok) {
		const body = await response.text()
		throw new Error(`Supabase Admin API: failed to create user (${response.status}): ${body}`)
	}

	const data = await response.json()
	return data.id
}

/**
 * Delete a test user via the Supabase Admin API.
 *
 * @param userId - The user ID to delete.
 */
export async function deleteUserViaAdmin(userId: string): Promise<void> {
	const { supabaseUrl, serviceRoleKey } = getAdminConfig()

	const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
		method: "DELETE",
		headers: {
			Authorization: `Bearer ${serviceRoleKey}`,
			apikey: serviceRoleKey,
		},
	})

	if (!response.ok) {
		// Non-critical — log but don't throw
		console.warn(`Supabase Admin API: failed to delete user ${userId} (${response.status})`)
	}
}

// ── Session management ─────────────────────────────────────────

function getAnonKey(): string {
	const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
	if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY — required for E2E session")
	return key
}

/**
 * Create the app-level User record directly in the database.
 *
 * When bypassing the login form, the D012 reconciliation never runs.
 * We must manually insert the record so chat creation doesn't fail
 * on the FK constraint (Chat.user_id → User.id).
 *
 * Uses the `postgres` driver directly — PostgREST returns 403 due to
 * RLS policies, but a direct connection with the connection string bypasses that.
 */
async function createAppUserRecord(userId: string, email: string): Promise<void> {
	const databaseUrl = process.env.DATABASE_URL
	if (!databaseUrl) {
		throw new Error("Missing DATABASE_URL — required for E2E app-level user creation")
	}

	// Dynamic import — postgres.js is already a project dependency
	const postgres = (await import("postgres")).default
	const sql = postgres(databaseUrl, { max: 1 })

	try {
		await sql`
			INSERT INTO "User" (id, email)
			VALUES (${userId}, ${email.toLowerCase()})
			ON CONFLICT (id) DO NOTHING
		`
	} finally {
		await sql.end()
	}
}

/**
 * Sign in a user via the Supabase GoTrue API and return the session.
 *
 * This bypasses the browser login form entirely — no app-level rate
 * limits are triggered. The session can be injected as cookies.
 */
export async function signInAndGetSession(
	email: string,
	password: string,
): Promise<SupabaseSession> {
	const { supabaseUrl } = getAdminConfig()
	const anonKey = getAnonKey()

	const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
		method: "POST",
		headers: {
			apikey: anonKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ email, password }),
	})

	if (!response.ok) {
		const body = await response.text()
		throw new Error(`Supabase sign-in failed (${response.status}): ${body}`)
	}

	const session: SupabaseSession = await response.json()

	// Create the app-level User record that D012 reconciliation would
	// normally create during a form-based login.
	await createAppUserRecord(session.user.id, email)

	return session
}

/**
 * Build Supabase auth cookies for injection into a Playwright browser context.
 *
 * @supabase/ssr stores the session as a JSON string in one or more cookies
 * named `sb-<project-ref>-auth-token[.N]`. For sessions that fit in a single
 * cookie (<3180 bytes), a single cookie suffices.
 *
 * @param session - The Supabase session from signInAndGetSession.
 * @returns Array of cookie objects ready for Playwright's `context.addCookies()`.
 */
export function getSupabaseAuthCookies(
	session: SupabaseSession,
): Array<{ name: string; value: string; domain: string; path: string; httpOnly: boolean }> {
	// Extract project ref from the Supabase URL: https://<ref>.supabase.co
	const { supabaseUrl } = getAdminConfig()
	const urlObj = new URL(supabaseUrl)
	const projectRef = urlObj.hostname.split(".")[0] ?? "unknown"

	const cookieName = `sb-${projectRef}-auth-token`
	const sessionJson = JSON.stringify(session)

	// @supabase/ssr chunks cookies at 3180 bytes
	const CHUNK_SIZE = 3180
	const chunks: string[] = []
	for (let i = 0; i < sessionJson.length; i += CHUNK_SIZE) {
		chunks.push(sessionJson.slice(i, i + CHUNK_SIZE))
	}

	if (chunks.length === 1) {
		return [
			{
				name: cookieName,
				value: chunks[0] as string,
				domain: "localhost",
				path: "/",
				httpOnly: false,
			},
		]
	}

	return chunks.map((chunk, index) => ({
		name: `${cookieName}.${index}`,
		value: chunk,
		domain: "localhost",
		path: "/",
		httpOnly: false,
	}))
}

/**
 * Create a chat with messages directly in the database.
 *
 * This bypasses the AI API entirely — no model call, no streaming,
 * no potential for server AbortErrors. The chat + messages are inserted
 * directly so the sidebar loads them from the DB.
 */
export async function createChatInDB(opts: {
	chatId: string
	userId: string
	title: string
	userMessage: string
	assistantMessage?: string
}): Promise<void> {
	const databaseUrl = process.env.DATABASE_URL
	if (!databaseUrl) {
		throw new Error("Missing DATABASE_URL — required for direct DB chat creation")
	}

	const postgres = (await import("postgres")).default
	const sql = postgres(databaseUrl, { max: 1 })

	try {
		await sql`
			INSERT INTO "Chat" (id, title, user_id, visibility, model)
			VALUES (${opts.chatId}, ${opts.title}, ${opts.userId}, 'private', 'google:gemma-3-4b-it')
		`

		const userParts = JSON.stringify([{ type: "text", text: opts.userMessage }])
		await sql`
			INSERT INTO "Message_v2" (chat_id, role, parts, attachments)
			VALUES (${opts.chatId}, 'user', ${userParts}::jsonb, '[]'::jsonb)
		`

		if (opts.assistantMessage) {
			const asstParts = JSON.stringify([{ type: "text", text: opts.assistantMessage }])
			await sql`
				INSERT INTO "Message_v2" (chat_id, role, parts, attachments)
				VALUES (${opts.chatId}, 'assistant', ${asstParts}::jsonb, '[]'::jsonb)
			`
		}
	} finally {
		await sql.end()
	}
}

/**
 * Extract the Supabase user ID from auth cookies in a Playwright browser context.
 *
 * Parses the `sb-<ref>-auth-token` cookie(s), reassembles the session JSON,
 * and returns the `user.id` field. Useful for tests that need to create
 * DB records linked to the authenticated user without exposing fixture internals.
 */
export async function getUserIdFromCookies(
	context: import("@playwright/test").BrowserContext,
): Promise<string> {
	const cookies = await context.cookies()
	const { supabaseUrl } = getAdminConfig()
	const projectRef = new URL(supabaseUrl).hostname.split(".")[0] ?? "unknown"
	const prefix = `sb-${projectRef}-auth-token`

	// Single cookie or chunked — reassemble
	const single = cookies.find((c) => c.name === prefix)
	if (single) {
		const session = JSON.parse(single.value)
		return session.user.id
	}

	// Chunked: sb-<ref>-auth-token.0, .1, .2 …
	const chunks = cookies
		.filter((c) => c.name.startsWith(`${prefix}.`))
		.sort((a, b) => {
			const ai = Number.parseInt(a.name.split(".").pop() ?? "0", 10)
			const bi = Number.parseInt(b.name.split(".").pop() ?? "0", 10)
			return ai - bi
		})
		.map((c) => c.value)

	if (chunks.length === 0) {
		throw new Error(`No Supabase auth cookies found (prefix: ${prefix})`)
	}

	const session = JSON.parse(chunks.join(""))
	return session.user.id
}
