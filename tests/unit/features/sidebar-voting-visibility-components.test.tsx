// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React, { Suspense } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { VisibilitySelector } from "@/features/visibility/components/visibility-selector"
import type { VisibilityType } from "@/features/visibility/types/visibility.types"
import { VoteButtons } from "@/features/voting/components/vote-buttons"
import {
	useVoteForMessage,
	VoteResolver,
	VotesProvider,
} from "@/features/voting/components/vote-resolver"
import type { Vote } from "@/lib/types/models.types"
import { createMockVote } from "@/tests/fixtures/vote"

const { mockSetVisibility, mockUpdateChatVisibility, mockSubmitVote, mockUseVotes } = vi.hoisted(
	() => ({
		mockSetVisibility: vi.fn(),
		mockUpdateChatVisibility: vi.fn(),
		mockSubmitVote: vi.fn(),
		mockUseVotes: vi.fn(),
	}),
)

let sessionState: {
	session: { user: { id: string; type: "authenticated" | "guest" } } | null
	isLoading: boolean
	isGuest: boolean
}

let chatSessionState: {
	chatId: string
	visibility: VisibilityType
	setVisibility: (visibility: VisibilityType) => void
	isReadonly: boolean
}

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
	},
}))

vi.mock("@/components/ai-elements/message", () => ({
	MessageAction: ({
		children,
		tooltip,
		type,
		...props
	}: {
		children?: React.ReactNode
		tooltip?: string
		type?: "button" | "submit" | "reset"
		[key: string]: unknown
	}) =>
		React.createElement(
			"button",
			{
				type: type ?? "button",
				"aria-label": tooltip,
				...props,
			},
			children,
		),
}))

vi.mock("@/components/ui/button", () => ({
	Button: ({
		children,
		type,
		...props
	}: {
		children?: React.ReactNode
		type?: "button" | "submit" | "reset"
		[key: string]: unknown
	}) => React.createElement("button", { type: type ?? "button", ...props }, children),
}))

vi.mock("@/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({
		children,
		modal,
		onOpenChange,
		open,
		...props
	}: {
		children?: React.ReactNode
		modal?: boolean
		onOpenChange?: (open: boolean) => void
		open?: boolean
		[key: string]: unknown
	}) => {
		void modal
		void onOpenChange
		void open
		return React.createElement("div", props, children)
	},
	DropdownMenuTrigger: ({
		asChild,
		children,
		...props
	}: {
		asChild?: boolean
		children?: React.ReactNode
		[key: string]: unknown
	}) => {
		if (asChild) {
			return React.createElement("div", props, children)
		}
		return React.createElement("button", { type: "button", ...props }, children)
	},
	DropdownMenuContent: ({
		children,
		...props
	}: {
		children?: React.ReactNode
		[key: string]: unknown
	}) => React.createElement("div", props, children),
	DropdownMenuItem: ({
		children,
		onSelect,
		...props
	}: {
		children?: React.ReactNode
		onSelect?: () => void
		[key: string]: unknown
	}) =>
		React.createElement(
			"button",
			{
				type: "button",
				onClick: () => onSelect?.(),
				...props,
			},
			children,
		),
}))

vi.mock("@/features/auth/components/session-provider", () => ({
	useSession: () => sessionState,
}))

vi.mock("@/features/chat/hooks/use-chat-session-context", () => ({
	useChatSessionContext: () => chatSessionState,
}))

vi.mock("@/features/visibility/actions/update-visibility", () => ({
	updateChatVisibility: (...args: unknown[]) => mockUpdateChatVisibility(...args),
}))

vi.mock("@/features/voting/hooks/use-votes", () => ({
	useVotes: (...args: unknown[]) => mockUseVotes(...args),
}))

beforeEach(() => {
	vi.clearAllMocks()

	sessionState = {
		session: { user: { id: "user-1", type: "authenticated" } },
		isLoading: false,
		isGuest: false,
	}

	chatSessionState = {
		chatId: crypto.randomUUID(),
		visibility: "private",
		setVisibility: mockSetVisibility,
		isReadonly: false,
	}

	mockUpdateChatVisibility.mockResolvedValue({ success: true, data: undefined })
	mockUseVotes.mockImplementation((chatId: string, initialVotes: Vote[]) => {
		const [votes, setVotes] = React.useState(initialVotes)

		React.useEffect(() => {
			setVotes(initialVotes)
		}, [initialVotes])

		const submitVote = React.useCallback(
			(messageId: string, type: "up" | "down") => {
				mockSubmitVote(messageId, type)
				setVotes((currentVotes) => [
					...currentVotes.filter((vote) => vote.messageId !== messageId),
					{
						chatId,
						messageId,
						userId: "user-1",
						isUpvoted: type === "up",
					},
				])
			},
			[chatId],
		)

		return {
			votes,
			submitVote,
		}
	})
})

describe("vote-buttons", () => {
	it("renders enabled vote controls when no vote exists", () => {
		const onVote = vi.fn()

		render(<VoteButtons messageId="message-1" isAssistant isLoading={false} onVote={onVote} />)

		const upButton = screen.getByTestId("vote-up")
		const downButton = screen.getByTestId("vote-down")

		expect(upButton).toHaveAttribute("aria-pressed", "false")
		expect(downButton).toHaveAttribute("aria-pressed", "false")
		expect(upButton).not.toBeDisabled()
		expect(downButton).not.toBeDisabled()

		fireEvent.click(upButton)
		expect(onVote).toHaveBeenCalledWith("message-1", "up")
	})

	it("renders upvoted state", () => {
		render(
			<VoteButtons
				messageId="message-2"
				isAssistant
				isLoading={false}
				vote={createMockVote({ messageId: "message-2", isUpvoted: true })}
			/>,
		)

		expect(screen.getByTestId("vote-up")).toHaveAttribute("aria-pressed", "true")
		expect(screen.getByTestId("vote-up")).toBeDisabled()
		expect(screen.getByTestId("vote-down")).toHaveAttribute("aria-pressed", "false")
	})

	it("renders downvoted state", () => {
		render(
			<VoteButtons
				messageId="message-3"
				isAssistant
				isLoading={false}
				vote={createMockVote({ messageId: "message-3", isUpvoted: false })}
			/>,
		)

		expect(screen.getByTestId("vote-down")).toHaveAttribute("aria-pressed", "true")
		expect(screen.getByTestId("vote-down")).toBeDisabled()
		expect(screen.getByTestId("vote-up")).toHaveAttribute("aria-pressed", "false")
	})

	it("hides vote controls for guest users", () => {
		sessionState = {
			session: null,
			isLoading: false,
			isGuest: true,
		}

		render(<VoteButtons messageId="message-4" isAssistant isLoading={false} />)

		expect(screen.queryByTestId("vote-up")).not.toBeInTheDocument()
		expect(screen.queryByTestId("vote-down")).not.toBeInTheDocument()
	})
})

function VoteStateProbe({ messageId }: { messageId: string }) {
	const { vote, submitVote } = useVoteForMessage(messageId)

	return (
		<div>
			<output data-testid={`vote-state-${messageId}`}>
				{vote ? (vote.isUpvoted ? "up" : "down") : "none"}
			</output>
			<button
				data-testid={`vote-submit-${messageId}`}
				onClick={() => submitVote(messageId, "up")}
				type="button"
			>
				submit vote
			</button>
		</div>
	)
}

function createFulfilledVotesPromise(votes: Vote[]) {
	const promise = Promise.resolve(votes) as Promise<Vote[]> & {
		status: "fulfilled"
		value: Vote[]
	}
	promise.status = "fulfilled"
	promise.value = votes
	return promise
}

describe("vote-resolver", () => {
	it("hydrates vote state from resolved votes", async () => {
		const resolvedVote = createMockVote({
			chatId: "chat-1",
			messageId: "message-vote-1",
			isUpvoted: false,
		})
		const votesPromise = createFulfilledVotesPromise([resolvedVote])

		render(
			<VotesProvider chatId="chat-1">
				<Suspense fallback={<div data-testid="votes-fallback">loading votes</div>}>
					<VoteResolver votesPromise={votesPromise} />
				</Suspense>
				<VoteStateProbe messageId="message-vote-1" />
			</VotesProvider>,
		)

		await waitFor(() => {
			expect(screen.getByTestId("vote-state-message-vote-1")).toHaveTextContent("down")
		})

		expect(screen.queryByTestId("votes-fallback")).not.toBeInTheDocument()

		const calls = mockUseVotes.mock.calls as Array<[string, Vote[]]>
		expect(calls.at(-1)?.[0]).toBe("chat-1")
		expect(calls.at(-1)?.[1]).toEqual([resolvedVote])
	})

	it("exposes submitVote from useVotes through context", () => {
		render(
			<VotesProvider chatId="chat-2">
				<VoteStateProbe messageId="message-vote-2" />
			</VotesProvider>,
		)

		fireEvent.click(screen.getByTestId("vote-submit-message-vote-2"))
		expect(mockSubmitVote).toHaveBeenCalledWith("message-vote-2", "up")
	})

	it("only re-renders the message whose vote changed", async () => {
		function RenderCountProbe({ messageId }: { messageId: string }) {
			const renderCount = React.useRef(0)
			renderCount.current += 1

			const { vote, submitVote } = useVoteForMessage(messageId)

			return (
				<div>
					<output data-testid={`vote-state-${messageId}`}>{vote ? "up" : "none"}</output>
					<output data-testid={`render-count-${messageId}`}>{renderCount.current}</output>
					<button onClick={() => submitVote(messageId, "up")} type="button">
						vote
					</button>
				</div>
			)
		}

		render(
			<VotesProvider chatId="chat-rerender-test">
				<RenderCountProbe messageId="message-a" />
				<RenderCountProbe messageId="message-b" />
			</VotesProvider>,
		)

		const initialTargetCount = screen.getByTestId("render-count-message-a").textContent
		const initialOtherCount = screen.getByTestId("render-count-message-b").textContent
		const [targetVoteButton] = screen.getAllByRole("button", { name: "vote" })

		if (!targetVoteButton) {
			throw new Error("Expected a vote button for message-a")
		}

		fireEvent.click(targetVoteButton)

		await waitFor(() => {
			expect(screen.getByTestId("vote-state-message-a")).toHaveTextContent("up")
		})

		expect(screen.getByTestId("render-count-message-a").textContent).not.toBe(
			initialTargetCount,
		)
		expect(screen.getByTestId("render-count-message-b").textContent).toBe(initialOtherCount)
	})
})

describe("visibility-selector", () => {
	it("renders selector and both visibility options", () => {
		render(<VisibilitySelector />)

		expect(screen.getByTestId("visibility-selector")).toBeInTheDocument()
		expect(screen.getByTestId("visibility-selector-item-private")).toBeInTheDocument()
		expect(screen.getByTestId("visibility-selector-item-public")).toBeInTheDocument()
	})

	it("updates visibility when selecting public", async () => {
		chatSessionState = {
			chatId: "visibility-chat-1",
			visibility: "private",
			setVisibility: mockSetVisibility,
			isReadonly: false,
		}

		render(<VisibilitySelector />)

		fireEvent.click(screen.getByTestId("visibility-selector-item-public"))

		expect(mockSetVisibility).toHaveBeenCalledWith("public")
		await waitFor(() => {
			expect(mockUpdateChatVisibility).toHaveBeenCalledWith({
				chatId: "visibility-chat-1",
				visibility: "public",
			})
		})
	})

	it("does not submit a visibility update when selecting the current value", () => {
		render(<VisibilitySelector />)

		fireEvent.click(screen.getByTestId("visibility-selector-item-private"))

		expect(mockSetVisibility).not.toHaveBeenCalled()
		expect(mockUpdateChatVisibility).not.toHaveBeenCalled()
	})

	it("disables the selector while a visibility update is pending", async () => {
		let resolveVisibility: ((value: { success: true; data: undefined }) => void) | undefined

		mockUpdateChatVisibility.mockImplementationOnce(
			() =>
				new Promise<{ success: true; data: undefined }>((resolve) => {
					resolveVisibility = resolve
				}),
		)

		render(<VisibilitySelector />)

		fireEvent.click(screen.getByTestId("visibility-selector-item-public"))

		await waitFor(() => {
			expect(screen.getByTestId("visibility-selector")).toBeDisabled()
			expect(screen.getByTestId("visibility-selector-item-private")).toBeDisabled()
			expect(screen.getByTestId("visibility-selector-item-public")).toBeDisabled()
		})

		resolveVisibility?.({ success: true, data: undefined })

		await waitFor(() => {
			expect(screen.getByTestId("visibility-selector")).not.toBeDisabled()
		})
	})

	it("does not render for readonly chats", () => {
		chatSessionState = {
			chatId: "visibility-chat-2",
			visibility: "private",
			setVisibility: mockSetVisibility,
			isReadonly: true,
		}

		render(<VisibilitySelector />)

		expect(screen.queryByTestId("visibility-selector")).not.toBeInTheDocument()
	})
})
