/**
 * E2E test utility functions.
 *
 * Shared helpers for generating test data and common operations
 * across all Playwright test files and fixtures.
 */

import { expect, type Page } from "@playwright/test"

/**
 * Generate a unique email address for test user registration.
 * Uses timestamp + random suffix to avoid collisions across parallel workers.
 */
export function generateTestEmail(): string {
	return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`
}

/**
 * Generate a strong password for test user registration.
 * Includes uppercase, lowercase, special chars, and a timestamp for uniqueness.
 */
export function generateTestPassword(): string {
	return `TestP@ss${Date.now()}`
}

/**
 * Wait for a page to reach the expected URL after a form submission,
 * retrying the action if it fails (rate-limited, slow server, etc.).
 *
 * All test workers share localhost, which means they share CPU/IP-based
 * rate limit buckets (5 login/min, 3 register/min). This helper detects
 * failures and retries the action with backoff.
 *
 * @param page - Playwright page.
 * @param action - Async function that performs the form submission (login/register).
 * @param expectedUrl - The URL to wait for after successful submission.
 * @param maxAttempts - Maximum retry attempts (default: 3).
 */
export async function submitWithRateLimitRetry(
	page: Page,
	action: () => Promise<void>,
	expectedUrl: string,
	maxAttempts = 3,
): Promise<void> {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		await action()

		try {
			await expect(page).toHaveURL(expectedUrl, { timeout: 30_000 })
			return // Success
		} catch {
			// Gather diagnostic info
			const alert = page.locator("[role='alert']")
			const alertVisible = await alert.isVisible().catch(() => false)
			const alertText = alertVisible ? await alert.textContent() : ""

			if (attempt < maxAttempts) {
				// Retry with exponential backoff — handles rate limiting,
				// slow server, or transient Supabase/Redis issues
				await page.waitForTimeout(12_000 * attempt)
				continue
			}

			throw new Error(
				`Auth action failed after ${attempt} attempt(s). ` +
					`URL: ${page.url()}, alert: ${alertText || "none"}`,
			)
		}
	}
}
