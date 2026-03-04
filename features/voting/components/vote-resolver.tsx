"use client"

import { createContext, type ReactNode, use, useContext, useEffect, useMemo, useState } from "react"

import { useVotes } from "@/features/voting/hooks/use-votes"
import type { Vote } from "@/lib/types/models.types"

// ── Internal context (VoteResolver → VotesProvider communication) ─

type VotesSetter = (votes: Vote[]) => void

const VotesSetterContext = createContext<VotesSetter | null>(null)

// ── Public context ───────────────────────────────────────────

interface VotesContextValue {
	/** Current votes array (includes optimistic updates) */
	votes: Vote[]
	/** Submit a vote — triggers optimistic update + Server Action persistence */
	submitVote: (messageId: string, type: "up" | "down") => void
}

const VotesContext = createContext<VotesContextValue | null>(null)

// ── VotesProvider ────────────────────────────────────────────

interface VotesProviderProps {
	chatId: string
	children: ReactNode
}

/**
 * VotesProvider — wraps ChatShell at page level.
 *
 * Initially provides empty votes. VoteResolver hydrates via React 19
 * `use()` and sets server-resolved votes, which become the base state
 * for `useOptimistic` in the `useVotes` hook.
 *
 * Uses React Context only — NO external vote store (SWR, Zustand).
 */
export function VotesProvider({ chatId, children }: VotesProviderProps) {
	const [serverVotes, setServerVotes] = useState<Vote[]>([])
	const { votes, submitVote } = useVotes(chatId, serverVotes)

	return (
		<VotesSetterContext.Provider value={setServerVotes}>
			<VotesContext.Provider value={{ votes, submitVote }}>{children}</VotesContext.Provider>
		</VotesSetterContext.Provider>
	)
}

// ── VoteResolver ─────────────────────────────────────────────

interface VoteResolverProps {
	/** Non-blocking votes promise started in the page component */
	votesPromise: Promise<Vote[]>
}

/**
 * VoteResolver — resolves `votesPromise` via React 19 `use()` inside Suspense.
 *
 * When the promise resolves, sets votes in VotesProvider context.
 * Chat renders immediately with empty votes; VoteResolver streams in
 * vote data when the promise resolves; VoteButtons re-render with
 * actual vote state via context.
 *
 * Vote fetch failures should be caught at the promise level (`.catch()`)
 * before passing to VoteResolver to ensure failures don't propagate.
 */
export function VoteResolver({ votesPromise }: VoteResolverProps) {
	const setServerVotes = useContext(VotesSetterContext)
	const resolvedVotes = use(votesPromise)

	useEffect(() => {
		setServerVotes?.(resolvedVotes)
	}, [resolvedVotes, setServerVotes])

	return null
}

// ── useVoteForMessage ────────────────────────────────────────

/** Stable empty array to avoid re-renders when outside VotesProvider */
const EMPTY_VOTES: Vote[] = []

/** No-op submit for components outside VotesProvider (e.g., new chat page) */
// biome-ignore lint/suspicious/noEmptyBlockStatements: Intentional no-op callback
const NOOP_SUBMIT: VotesContextValue["submitVote"] = () => {}

/**
 * Read vote data from VotesProvider context for a specific message.
 *
 * Returns the vote (if any) and the submitVote callback.
 * When used outside VotesProvider (e.g., new chat page before navigation),
 * returns safe defaults (no vote, no-op submit).
 */
export function useVoteForMessage(messageId: string): {
	vote: Vote | undefined
	submitVote: (messageId: string, type: "up" | "down") => void
} {
	const context = useContext(VotesContext)
	const votes = context?.votes ?? EMPTY_VOTES
	const submitVote = context?.submitVote ?? NOOP_SUBMIT

	const vote = useMemo(() => votes.find((v) => v.messageId === messageId), [votes, messageId])

	return { vote, submitVote }
}
