"use client"

import {
	createContext,
	type ReactNode,
	use,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react"

import { useVotes } from "@/features/voting/hooks/use-votes"
import type { Vote } from "@/lib/types/entity.types"

// ── Internal context (VoteResolver → VotesProvider communication) ─

type VotesSetter = (votes: Vote[]) => void

type SubmitVote = (messageId: string, type: "up" | "down") => void

const VotesSetterContext = createContext<VotesSetter | null>(null)

interface VotesStore {
	subscribe: (listener: () => void) => () => void
	getVote: (messageId: string) => Vote | undefined
	setVotes: (votes: Vote[]) => void
}

const EMPTY_VOTE_MAP = new Map<string, Vote>()

function hasVoteMapChanged(current: ReadonlyMap<string, Vote>, next: ReadonlyMap<string, Vote>) {
	if (current.size !== next.size) {
		return true
	}

	for (const [messageId, vote] of next) {
		if (!Object.is(current.get(messageId), vote)) {
			return true
		}
	}

	return false
}

function createVotesStore(): VotesStore {
	const listeners = new Set<() => void>()
	let voteByMessageId: ReadonlyMap<string, Vote> = EMPTY_VOTE_MAP

	return {
		subscribe(listener) {
			listeners.add(listener)
			return () => listeners.delete(listener)
		},
		getVote(messageId) {
			return voteByMessageId.get(messageId)
		},
		setVotes(votes) {
			const nextVoteMap = new Map(votes.map((vote) => [vote.messageId, vote]))

			if (!hasVoteMapChanged(voteByMessageId, nextVoteMap)) {
				return
			}

			voteByMessageId = nextVoteMap
			for (const listener of listeners) {
				listener()
			}
		},
	}
}

// ── Public context ───────────────────────────────────────────

interface VotesContextValue {
	store: VotesStore
	/** Submit a vote — triggers optimistic update + Server Action persistence */
	submitVote: SubmitVote
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
	const storeRef = useRef<VotesStore | null>(null)

	if (storeRef.current === null) {
		storeRef.current = createVotesStore()
	}

	useLayoutEffect(() => {
		storeRef.current?.setVotes(votes)
	}, [votes])

	const contextValue = useMemo(
		() => ({ store: storeRef.current as VotesStore, submitVote }),
		[submitVote],
	)

	return (
		<VotesSetterContext.Provider value={setServerVotes}>
			<VotesContext.Provider value={contextValue}>{children}</VotesContext.Provider>
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

const EMPTY_VOTES_STORE: VotesStore = {
	subscribe: () => () => undefined,
	getVote: () => undefined,
	setVotes: () => undefined,
}

/** No-op submit for components outside VotesProvider (e.g., new chat page) */
// biome-ignore lint/suspicious/noEmptyBlockStatements: Intentional no-op callback
const NOOP_SUBMIT: SubmitVote = () => {}

/**
 * Read vote data from VotesProvider context for a specific message.
 *
 * Returns the vote (if any) and the submitVote callback.
 * When used outside VotesProvider (e.g., new chat page before navigation),
 * returns safe defaults (no vote, no-op submit).
 */
export function useVoteForMessage(messageId: string): {
	vote: Vote | undefined
	submitVote: SubmitVote
} {
	const context = useContext(VotesContext)
	const store = context?.store ?? EMPTY_VOTES_STORE
	const submitVote = context?.submitVote ?? NOOP_SUBMIT
	const vote = useSyncExternalStore(
		store.subscribe,
		() => store.getVote(messageId),
		() => undefined,
	)

	return { vote, submitVote }
}
