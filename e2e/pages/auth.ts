/**
 * AuthPage — Page Object Model for login and registration flows.
 *
 * Encapsulates interaction with the auth form using existing `data-testid`
 * attributes and semantic selectors from the AuthForm component.
 */

import { expect, type Page } from "@playwright/test"

export class AuthPage {
	constructor(private page: Page) {}

	// ── Navigation ──────────────────────────────────────────

	/** Navigate to login or register page. */
	async goto(mode: "login" | "register") {
		await this.page.goto(`/${mode}`)
	}

	// ── Form interactions ───────────────────────────────────

	/** Fill the email input field. */
	async fillEmail(email: string) {
		await this.page.getByPlaceholder("user@acme.com").fill(email)
	}

	/** Fill the password input field. */
	async fillPassword(password: string) {
		await this.page.getByLabel("Password").fill(password)
	}

	/** Click the submit button (login or register). */
	async submit() {
		const form = this.page.getByTestId("auth-form")
		await form.locator('button[type="submit"]').click()
	}

	// ── Compound actions ────────────────────────────────────

	/** Register a new user. Navigates to /register, fills form, and submits. */
	async register(email: string, password: string) {
		await this.goto("register")
		await this.fillEmail(email)
		await this.fillPassword(password)
		await this.submit()
	}

	/** Log in as an existing user. Navigates to /login, fills form, and submits. */
	async login(email: string, password: string) {
		await this.goto("login")
		await this.fillEmail(email)
		await this.fillPassword(password)
		await this.submit()
	}

	/** Log out by opening the sidebar user nav and clicking the auth menu item. */
	async logout() {
		const userNavButton = this.page.getByTestId("user-nav-button")
		await expect(userNavButton).toBeVisible()
		await userNavButton.click()

		const authItem = this.page.getByTestId("user-nav-item-auth")
		await expect(authItem).toBeVisible()
		await authItem.click()
	}

	// ── Assertions ──────────────────────────────────────────

	/** Assert the user email displayed in the sidebar matches. */
	async expectUserEmail(email: string) {
		const userEmail = this.page.getByTestId("user-email")
		await expect(userEmail).toContainText(email)
	}

	/** Assert a server error message is visible on the form. */
	async expectError(message: string) {
		await expect(this.page.locator('[role="alert"]')).toContainText(message)
	}
}
