/**
 * E2E tests for message voting (upvote / downvote).
 *
 * Uses the REAL chat API (no mock) so that chat and message records are
 * persisted in the database. This is required because the `voteOnMessage`
 * Server Action verifies chat ownership and message existence before
 * allowing a vote. With mocked responses, no DB records exist and votes
 * silently fail (optimistic update reverts).
 *
 * The real Gemini model is invoked — tests may be slightly slower but
 * produce correct server-side state.
 */

import { expect, test } from "./fixtures"
import { ChatPage } from "./pages/chat"

// ── Helpers ────────────────────────────────────────────────────

/** Send a message via the real API and wait for the assistant response.
 *
 * After the chat is created from `/`, the URL changes to `/chat/[id]`
 * via `pushState` — but the page component is still `app/(chat)/page.tsx`
 * which does NOT include `VotesProvider`. Without VotesProvider, the
 * vote submit callback is a no-op.
 *
 * So after getting the chat URL, we do a full page.goto() to render
 * the actual `chat/[id]/page.tsx` component tree with VotesProvider.
 */
async function setupChatWithResponse(page: import("@playwright/test").Page) {
	const chat = new ChatPage(page)

	// No API mock — let the real server handle the request so that
	// chat + message records are persisted in the database.
	await chat.sendMessageAndWaitForResponse("Hello")
	await chat.expectChatIdInUrl()

	// Full navigation to the chat page to render VotesProvider
	const chatUrl = page.url()
	await page.goto(chatUrl)
	await page.getByTestId("multimodal-input").waitFor({ state: "visible", timeout: 30_000 })
}

// ── Tests ────────────────────────────────────────────────────

test.describe("Voting", () => {
	test("vote buttons are visible on assistant messages", async ({ authenticatedPage }) => {
		await setupChatWithResponse(authenticatedPage)

		// Vote buttons should be visible on the assistant message
		const voteUp = authenticatedPage.getByTestId("vote-up")
		const voteDown = authenticatedPage.getByTestId("vote-down")

		await expect(voteUp).toBeVisible()
		await expect(voteDown).toBeVisible()
	})

	test("upvoting a message marks the upvote button as pressed", async ({ authenticatedPage }) => {
		await setupChatWithResponse(authenticatedPage)

		const voteUp = authenticatedPage.getByTestId("vote-up")
		await expect(voteUp).toBeVisible()

		await voteUp.click()

		// After upvoting, the button should show aria-pressed="true" and become disabled
		await expect(voteUp).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 })
		await expect(voteUp).toBeDisabled()
	})

	test("downvoting a message marks the downvote button as pressed", async ({
		authenticatedPage,
	}) => {
		await setupChatWithResponse(authenticatedPage)

		const voteDown = authenticatedPage.getByTestId("vote-down")
		await expect(voteDown).toBeVisible()

		await voteDown.click()

		// After downvoting, the button should show aria-pressed="true" and become disabled
		await expect(voteDown).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 })
		await expect(voteDown).toBeDisabled()
	})

	test("changing vote from upvote to downvote updates button states", async ({
		authenticatedPage,
	}) => {
		await setupChatWithResponse(authenticatedPage)

		const voteUp = authenticatedPage.getByTestId("vote-up")
		const voteDown = authenticatedPage.getByTestId("vote-down")

		// First upvote
		await voteUp.click()
		await expect(voteUp).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 })
		await expect(voteUp).toBeDisabled()

		// Now downvote — this should toggle the vote
		await voteDown.click()
		await expect(voteDown).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 })
		await expect(voteDown).toBeDisabled()

		// Upvote should no longer be pressed
		await expect(voteUp).toHaveAttribute("aria-pressed", "false")
		await expect(voteUp).not.toBeDisabled()
	})
})
