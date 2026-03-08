/**
 * E2E tests for the settings / user-nav functionality.
 *
 * Tests the sidebar user navigation dropdown menu including
 * theme toggling, persistence, and menu item visibility.
 */

import { expect, test } from "./fixtures"
import { SidebarPage } from "./pages/sidebar"

test.describe("Settings — user navigation", () => {
	test("user nav menu opens and shows expected items", async ({ authenticatedPage: page }) => {
		const sidebar = new SidebarPage(page)

		// The user nav button should be visible after auth
		await expect(sidebar.userNavButton).toBeVisible()

		// Open the user nav dropdown
		await sidebar.userNavButton.click()
		await expect(sidebar.userNavMenu).toBeVisible()

		// Verify expected menu items exist
		const themeItem = page.getByTestId("user-nav-item-theme")
		await expect(themeItem).toBeVisible()

		const authItem = page.getByTestId("user-nav-item-auth")
		await expect(authItem).toBeVisible()

		// Authenticated users should see "Sign out" (not "Login")
		await expect(authItem).toContainText("Sign out")
	})

	test("theme toggle switches between dark and light mode", async ({
		authenticatedPage: page,
	}) => {
		const sidebar = new SidebarPage(page)

		// Determine the current theme from the <html> element class
		const htmlElement = page.locator("html")
		const initialClass = await htmlElement.getAttribute("class")
		const isDarkInitially = initialClass?.includes("dark") ?? false

		// Open the user nav and click the theme toggle
		await sidebar.userNavButton.click()
		await expect(sidebar.userNavMenu).toBeVisible()
		await page.getByTestId("user-nav-item-theme").click()

		// Theme should have toggled
		if (isDarkInitially) {
			await expect(htmlElement).not.toHaveClass(/dark/)
		} else {
			await expect(htmlElement).toHaveClass(/dark/)
		}

		// Wait for the dropdown to fully close before re-opening
		await expect(sidebar.userNavMenu).not.toBeVisible()

		// Toggle again to verify it switches back
		await sidebar.userNavButton.click()
		await expect(sidebar.userNavMenu).toBeVisible()
		await page.getByTestId("user-nav-item-theme").click()

		if (isDarkInitially) {
			await expect(htmlElement).toHaveClass(/dark/)
		} else {
			await expect(htmlElement).not.toHaveClass(/dark/)
		}
	})

	test("theme choice persists across page reload", async ({ authenticatedPage: page }) => {
		const sidebar = new SidebarPage(page)
		const htmlElement = page.locator("html")

		// Determine the current theme
		const initialClass = await htmlElement.getAttribute("class")
		const isDarkInitially = initialClass?.includes("dark") ?? false

		// Toggle the theme
		await sidebar.userNavButton.click()
		await expect(sidebar.userNavMenu).toBeVisible()
		await page.getByTestId("user-nav-item-theme").click()

		// Verify it toggled
		const expectedAfterToggle = isDarkInitially ? "light" : "dark"
		if (expectedAfterToggle === "dark") {
			await expect(htmlElement).toHaveClass(/dark/)
		} else {
			await expect(htmlElement).not.toHaveClass(/dark/)
		}

		// Reload the page
		await page.reload()
		await page.waitForLoadState("domcontentloaded")

		// Theme should persist — next-themes stores in localStorage
		const htmlAfterReload = page.locator("html")
		if (expectedAfterToggle === "dark") {
			await expect(htmlAfterReload).toHaveClass(/dark/)
		} else {
			await expect(htmlAfterReload).not.toHaveClass(/dark/)
		}
	})
})
