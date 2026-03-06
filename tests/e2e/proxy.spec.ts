import { expect, test } from "@playwright/test"

test.describe("Proxy", () => {
	test.describe("Guest Auto-Bootstrap", () => {
		test("should auto-bootstrap guest session on first visit", async ({ page }) => {
			await page.goto("/")

			await expect(page.getByTestId("multimodal-input")).toBeVisible()
		})

		test("should show guest user in sidebar", async ({ page }) => {
			await page.goto("/")

			await page.getByTestId("sidebar-toggle").click()
			await expect(page.getByTestId("user-nav-button")).toBeVisible({ timeout: 10000 })

			const userEmail = page.getByTestId("user-email")
			await expect(userEmail).toContainText("Guest")
		})
	})
})
