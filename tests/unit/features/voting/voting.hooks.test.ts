// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useVotes } from "@/features/voting/hooks/use-votes"
import { createMockVote } from "@/tests/fixtures/vote"

const mockVoteOnMessage = vi.fn()
const mockToastError = vi.fn()

vi.mock("@/features/voting/actions/vote", () => ({
	voteOnMessage: (...args: unknown[]) => mockVoteOnMessage(...args),
}))

vi.mock("sonner", () => ({
	toast: {
		error: (...args: unknown[]) => mockToastError(...args),
	},
}))

function deferred<T>() {
	let resolve: (value: T) => void = (_value) => undefined
	const promise = new Promise<T>((resolver) => {
		resolve = resolver
	})

	return { promise, resolve }
}

describe("useVotes", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("returns the initial votes", () => {
		const initialVotes = [
			createMockVote({ chatId: "chat-1", messageId: "m1", isUpvoted: true }),
		]

		const { result } = renderHook(() => useVotes("chat-1", initialVotes))

		expect(result.current.votes).toEqual(initialVotes)
		expect(result.current).not.toHaveProperty("isPending")
	})

	it("applies optimistic vote updates and calls the server action", async () => {
		const pending = deferred<{
			success: true
			data: {
				messageId: string
				type: "up" | "down"
			}
		}>()
		mockVoteOnMessage.mockReturnValue(pending.promise)

		const initialVotes = [
			createMockVote({ chatId: "chat-1", messageId: "m1", isUpvoted: true }),
			createMockVote({ chatId: "chat-1", messageId: "m2", isUpvoted: true }),
		]

		const { result } = renderHook(() => useVotes("chat-1", initialVotes))

		act(() => {
			result.current.submitVote("m1", "down")
		})

		const optimisticVote = result.current.votes.find((vote) => vote.messageId === "m1")
		expect(optimisticVote).toEqual(
			expect.objectContaining({
				chatId: "chat-1",
				messageId: "m1",
				isUpvoted: false,
			}),
		)
		expect(mockVoteOnMessage).toHaveBeenCalledWith({
			chatId: "chat-1",
			messageId: "m1",
			type: "down",
		})

		await act(async () => {
			pending.resolve({
				success: true,
				data: {
					messageId: "m1",
					type: "down",
				},
			})
			await pending.promise
		})
	})

	it("shows a toast when the vote action fails", async () => {
		mockVoteOnMessage.mockResolvedValue({
			success: false,
			error: {
				code: "internal_error:database:query_failed",
				message: "Unable to save vote",
			},
		})

		const { result } = renderHook(() => useVotes("chat-1", []))

		await act(async () => {
			result.current.submitVote("m9", "up")
			await Promise.resolve()
		})

		expect(mockToastError).toHaveBeenCalledWith("Unable to save vote")
	})
})
