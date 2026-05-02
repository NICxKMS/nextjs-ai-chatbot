import { expect, type Page, test } from "@playwright/test"

const GUEST_COOKIE_NAME = "guest_token"

async function expectPasswordValidation(page: Page, path: string, buttonTestId: string) {
	await page.goto(path)
	await page.getByRole("textbox", { name: /email/i }).fill("user@example.com")
	await page.getByLabel(/password/i).fill("short")
	await page.getByTestId(buttonTestId).click()

	await expect(page.getByText(/password must be at least 6 characters/i)).toBeVisible()
	await expect(page).toHaveURL(path)
}

async function mockExternalAvatars(page: Page) {
	await page.route("https://avatar.vercel.sh/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "image/svg+xml",
			body: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" />',
		})
	})
}

test.describe("auth routes", () => {
	test("login and register pages expose accessible forms", async ({ page }) => {
		await page.goto("/login")
		await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible()
		await expect(page.getByLabel(/password/i)).toBeVisible()

		await page.goto("/register")
		await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible()
		await expect(page.getByLabel(/password/i)).toBeVisible()
	})

	test("login and register submissions show client validation without leaving the page", async ({
		page,
	}) => {
		await expectPasswordValidation(page, "/login", "login-button")
		await expectPasswordValidation(page, "/register", "register-button")
	})

	test("protected API routes reject sessionless visitors without redirecting", async ({
		page,
	}) => {
		const response = await page.request.get("/api/history")

		expect(response.status()).toBe(401)
		expect(response.url()).not.toMatch(/\/login$/)
		expect(response.headers()["content-type"]).toMatch(/application\/json/)
		await expect(await response.json()).toMatchObject({
			code: "unauthorized:chat:auth_required",
		})
	})

	test("guest-eligible pages bootstrap a persistent guest cookie", async ({ page }) => {
		await mockExternalAvatars(page)
		await page.goto("/")

		await expect
			.poll(async () => {
				const cookies = await page.context().cookies()
				return cookies.find((cookie) => cookie.name === GUEST_COOKIE_NAME)?.value
			})
			.not.toBeUndefined()

		const guestCookie = (await page.context().cookies()).find(
			(cookie) => cookie.name === GUEST_COOKIE_NAME,
		)

		expect(guestCookie?.value).toBeTruthy()
		expect(guestCookie?.httpOnly).toBe(true)
		expect(guestCookie?.sameSite).toBe("Lax")
		expect((guestCookie?.expires ?? 0) - Date.now() / 1000).toBeGreaterThan(6 * 24 * 60 * 60)
	})

	test("guest sidebar auth action navigates to login", async ({ page }) => {
		await mockExternalAvatars(page)
		await page.goto("/")

		await page.getByTestId("user-nav-button").click()
		await expect(page.getByTestId("user-nav-menu")).toBeVisible()
		await page.getByTestId("user-nav-item-auth").click()

		await expect(page).toHaveURL(/\/login$/)
	})
})
