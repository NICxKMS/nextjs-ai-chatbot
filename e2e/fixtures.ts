/**
 * Extended Playwright test fixtures for the AI chatbot.
 *
 * Provides `authenticatedPage` (logged-in user) and `guestPage` (guest session)
 * fixtures that tests can consume via destructuring.
 *
 * The `authenticatedPage` fixture creates test users via the Supabase Admin API,
 * signs in via the Supabase GoTrue API, and injects the session cookies directly
 * into the browser context. This completely bypasses the browser login flow and
 * the app's rate limiter — tests never hit the login form.
 *
 * The first page load with valid Supabase cookies triggers the app's D012
 * reconciliation, which creates the app-level User record automatically.
 *
 * Usage:
 * ```ts
 * import { test, expect } from '../fixtures';
 * test('my test', async ({ authenticatedPage }) => { ... });
 * ```
 */

import { test as base, expect, type Page } from "@playwright/test"
import { generateTestEmail, generateTestPassword } from "./helpers"
import {
	createUserViaAdmin,
	getSupabaseAuthCookies,
	signInAndGetSession,
} from "./helpers/supabase-admin"

// ── Fixture types ──────────────────────────────────────────────

type Fixtures = {
	/** A Page instance with a freshly registered and logged-in test user. */
	authenticatedPage: Page
	/** A Page instance visiting the app root as a guest (no login). */
	guestPage: Page
}

// ── Extended test ──────────────────────────────────────────────

export const test = base.extend<Fixtures>({
	authenticatedPage: async ({ browser }, use) => {
		const context = await browser.newContext()
		const page = await context.newPage()

		const email = generateTestEmail()
		const password = generateTestPassword()

		// 1. Create user via Admin API (bypasses Supabase signup rate limits)
		await createUserViaAdmin(email, password)

		// 2. Sign in via GoTrue API — returns a valid session with tokens.
		//    This bypasses the browser login form entirely, so the app's
		//    rate limiter (5 login/min/IP) is never triggered.
		const session = await signInAndGetSession(email, password)

		// 3. Inject Supabase auth cookies into the browser context
		const cookies = getSupabaseAuthCookies(session)
		await context.addCookies(cookies)

		// 4. Navigate to the app — the session is recognized from cookies
		//    and D012 reconciliation creates the app-level User record.
		await page.goto("/")
		await page.getByTestId("multimodal-input").waitFor({ state: "visible", timeout: 30_000 })

		await use(page)

		await context.close()
	},

	guestPage: async ({ browser }, use) => {
		const context = await browser.newContext()
		const page = await context.newPage()

		// Visit the app root — guest session is auto-created
		await page.goto("/")
		// Wait for the page to be interactive (networkidle can hang
		// when background requests like SWR revalidation stay open)
		await page.getByTestId("multimodal-input").waitFor({ state: "visible", timeout: 30_000 })

		await use(page)

		await context.close()
	},
})

export { expect }
