/**
 * SidebarPage — Page Object Model for the sidebar navigation.
 *
 * Encapsulates interaction with the sidebar toggle, chat history list,
 * and user navigation using existing `data-testid` attributes.
 */

import { expect, type Page } from "@playwright/test"

export class SidebarPage {
	constructor(private page: Page) {}

	// ── Locators ────────────────────────────────────────────

	/** The sidebar toggle button. */
	get toggleButton() {
		return this.page.getByTestId("sidebar-toggle")
	}

	/** The user navigation trigger button. */
	get userNavButton() {
		return this.page.getByTestId("user-nav-button")
	}

	/** The user nav dropdown menu. */
	get userNavMenu() {
		return this.page.getByTestId("user-nav-menu")
	}

	/** The displayed user email in the sidebar footer. */
	get userEmail() {
		return this.page.getByTestId("user-email")
	}

	// ── Actions ─────────────────────────────────────────────

	/** Toggle the sidebar open/closed. */
	async toggle() {
		await this.toggleButton.click()
	}

	/**
	 * Get all chat history items from the sidebar.
	 * Returns an array of link elements inside the sidebar group content.
	 */
	async getChatItems() {
		// Chat history items are rendered as links inside SidebarMenuButton
		// within the sidebar group content.
		return this.page.locator('[data-sidebar="group-content"] a[href^="/chat/"]').all()
	}

	/**
	 * Navigate to a chat by its index in the sidebar list (0-based).
	 * Opens the sidebar first if needed.
	 */
	async navigateToChat(index: number) {
		const items = await this.getChatItems()
		const item = items[index]
		if (!item) throw new Error(`No chat item at index ${index}`)
		await item.click()
	}

	/**
	 * Delete a chat by triggering the dropdown menu on its sidebar item.
	 * Finds the chat link by its href containing the chatId, then opens
	 * the adjacent action menu and confirms the deletion dialog.
	 */
	async deleteChat(chatId: string) {
		const chatItem = this.page.locator(`a[href="/chat/${chatId}"]`).first()
		await chatItem.hover()

		// The action trigger is a sibling within the same SidebarMenuItem
		const menuItem = chatItem.locator("..").locator('[data-sidebar="menu-action"]')
		await menuItem.click()

		// Click the "Delete" option in the dropdown
		await this.page.getByRole("menuitem", { name: /delete/i }).click()

		// Confirm the deletion in the alert dialog (button text: "Continue")
		const confirmButton = this.page.getByRole("button", { name: /continue/i })
		await expect(confirmButton).toBeVisible()
		await confirmButton.click()
	}

	/**
	 * Rename a chat by triggering the dropdown menu and selecting rename.
	 *
	 * After clicking "Rename," the `<a>` link is replaced by an `<input>`
	 * element (inline rename). We locate the input via its accessible label
	 * rather than relative to the now-removed link.
	 */
	async renameChat(chatId: string, newName: string) {
		const chatItem = this.page.locator(`a[href="/chat/${chatId}"]`).first()
		await chatItem.hover()

		const menuItem = chatItem.locator("..").locator('[data-sidebar="menu-action"]')
		await menuItem.click()

		// Click the "Rename" option in the dropdown
		await this.page.getByRole("menuitem", { name: /rename/i }).click()

		// The inline rename input replaces the link — find it by its label
		const renameInput = this.page.getByLabel("Rename chat")
		await expect(renameInput).toBeVisible({ timeout: 5_000 })
		await renameInput.fill(newName)
		await renameInput.press("Enter")
	}

	// ── Assertions ──────────────────────────────────────────

	/** Assert the sidebar contains a specific number of chat items. */
	async expectChatCount(count: number) {
		const items = await this.getChatItems()
		expect(items).toHaveLength(count)
	}

	/** Assert the user email is displayed in the sidebar. */
	async expectUserEmail(email: string) {
		await expect(this.userEmail).toContainText(email)
	}
}
